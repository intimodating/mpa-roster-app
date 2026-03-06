import json
import sys
import time
from ortools.sat.python import cp_model

# --- Constants ---
MORNING, AFTERNOON, NIGHT, OFF = 0, 1, 2, -1
SHIFT_TYPES = [MORNING, AFTERNOON, NIGHT]
SHIFT_NAMES = {MORNING: "Morning", AFTERNOON: "Afternoon", NIGHT: "Night"}
NAME_TO_SHIFT = {"Morning": MORNING, "Afternoon": AFTERNOON, "Night": NIGHT, "OFF": OFF}

EAST, WEST = 0, 1
LOCATIONS = [EAST, WEST]
LOCATION_NAMES = {EAST: "East", WEST: "West"}
NAME_TO_LOCATION = {"East": EAST, "West": WEST}

# --- Tunable Parameters ---
PATTERN_PENALTY_WEIGHT = 100
UNDERSTAFFING_PENALTY_WEIGHT = 1000
TIME_LIMIT_SECONDS = 60  # Increased slightly
NUM_SEARCH_WORKERS = 4   # Reduced for better stability on some systems

# -----------------------------------------------------------------------------------
# Helper: safe boolean operations
def safe_bool_or(model, bool_vars, target_boolvar):
    if not bool_vars:
        model.Add(target_boolvar == 0)
    else:
        model.AddBoolOr(bool_vars).OnlyEnforceIf(target_boolvar)
        model.AddBoolAnd([v.Not() for v in bool_vars]).OnlyEnforceIf(target_boolvar.Not())

def safe_bool_and(model, bool_vars, target_boolvar):
    if not bool_vars:
        model.Add(target_boolvar == 1)
    else:
        model.AddBoolAnd(bool_vars).OnlyEnforceIf(target_boolvar)
        model.AddBoolOr([v.Not() for v in bool_vars]).OnlyEnforceIf(target_boolvar.Not())
# -----------------------------------------------------------------------------------

def main(data):
    start_time = time.time()
    employees_data = data.get("employees", []) 
    requests_data = data.get("requests", [])   
    leave_data = data.get("leaveData", {})
    
    # Simulation specific parameters
    custom_pattern = data.get("shiftPattern", []) 
    pattern_sequence = [NAME_TO_SHIFT.get(s, OFF) for s in custom_pattern]
    pattern_length = len(pattern_sequence)
    
    if pattern_length == 0:
        return json.dumps({"error": "Shift pattern cannot be empty."})

    sys.stderr.write(f"Scheduler4 (Simulation): employees={len(employees_data)}, requests={len(requests_data)}, pattern={pattern_length}\n")

    model = cp_model.CpModel()

    # --- Preprocess dates and maps ---
    all_dates = sorted(
        list(
            set(req["date"] for req in requests_data)
            | set(date for dates in leave_data.values() for date in dates)
        )
    )
    request_dates = set(req["date"] for req in requests_data)
    num_employees = len(employees_data)
    num_days = len(all_dates)
    date_to_index = {date: i for i, date in enumerate(all_dates)}

    # Offsets
    employee_offsets = {}
    for i, emp in enumerate(employees_data):
        if "offset" in emp:
            employee_offsets[i] = int(emp["offset"]) % pattern_length
        else:
            employee_offsets[i] = i % pattern_length

    # --- Variables ---
    assign = {}
    emp_day_vars = {} 
    emp_day_shift_vars = {}
    req_comp_vars = {} 

    # Fast lookup for requests
    req_map = {}
    for req in requests_data:
        d_idx = date_to_index[req["date"]]
        s_idx = NAME_TO_SHIFT[req["shiftType"]]
        l_idx = NAME_TO_LOCATION[req["location"]]
        req_map[(d_idx, s_idx, l_idx)] = req.get("required_competencies", {})

        for comp_name, count in req_map[(d_idx, s_idx, l_idx)].items():
            if count <= 0: continue
            key_req = (d_idx, s_idx, l_idx, comp_name)
            if key_req not in req_comp_vars:
                req_comp_vars[key_req] = []

    for (d_idx, s_idx, l_idx, comp_name) in req_comp_vars.keys():
        date_str = all_dates[d_idx]
        for e_idx, emp in enumerate(employees_data):
            emp_id = emp["id"]
            if emp_id in leave_data and date_str in leave_data[emp_id]:
                continue
            
            emp_comps = emp.get("competencies", [])
            if comp_name not in emp_comps:
                continue
            
            v = model.NewBoolVar(f"a_e{e_idx}_d{d_idx}_s{s_idx}_l{l_idx}_{comp_name}")
            assign[(e_idx, d_idx, s_idx, l_idx, comp_name)] = v
            req_comp_vars[(d_idx, s_idx, l_idx, comp_name)].append(v)
            
            if (e_idx, d_idx) not in emp_day_vars:
                emp_day_vars[(e_idx, d_idx)] = []
            emp_day_vars[(e_idx, d_idx)].append(v)

            shift_key = (e_idx, d_idx, s_idx)
            if shift_key not in emp_day_shift_vars:
                emp_day_shift_vars[shift_key] = []
            emp_day_shift_vars[shift_key].append(v)

    # --- Hard Constraints ---
    for (e_idx, d_idx), vars_list in emp_day_vars.items():
        model.Add(sum(vars_list) <= 1)

    # --- Soft Constraints: Understaffing ---
    understaff_vars = []
    for (d_idx, s_idx, l_idx, comp_name), vars_list in req_comp_vars.items():
        count_req = req_map.get((d_idx, s_idx, l_idx), {}).get(comp_name, 0)
        if count_req > 0:
            understaff = model.NewIntVar(0, count_req, f"u_{d_idx}_{s_idx}_{l_idx}_{comp_name}")
            understaff_vars.append(understaff)
            model.Add(sum(vars_list) + understaff == count_req)

    # --- Soft Constraints: Pattern deviations ---
    pattern_deviation_vars = []
    for e_idx in range(num_employees):
        for d_idx in range(num_days):
            date_str = all_dates[d_idx]
            if date_str not in request_dates:
                continue

            offset = employee_offsets.get(e_idx, 0)
            pattern_pos = (d_idx + offset) % pattern_length
            expected = pattern_sequence[pattern_pos]

            dev = model.NewBoolVar(f"dev_e{e_idx}_d{d_idx}")
            pattern_deviation_vars.append(dev)

            all_emp_vars = emp_day_vars.get((e_idx, d_idx), [])
            if not all_emp_vars:
                # If no variables created (due to competencies/leave), 
                # we only deviate if expected != OFF
                if expected != OFF:
                    model.Add(dev == 1)
                else:
                    model.Add(dev == 0)
                continue

            if expected == OFF:
                safe_bool_or(model, all_emp_vars, dev)
            else:
                expected_vars = emp_day_shift_vars.get((e_idx, d_idx, expected), [])
                other_vars = [v for v in all_emp_vars if v not in expected_vars]
                
                expected_assigned = model.NewBoolVar(f"exp_e{e_idx}_d{d_idx}")
                other_assigned = model.NewBoolVar(f"oth_e{e_idx}_d{d_idx}")
                
                safe_bool_or(model, expected_vars, expected_assigned)
                safe_bool_or(model, other_vars, other_assigned)
                
                model.AddBoolOr([expected_assigned.Not(), other_assigned]).OnlyEnforceIf(dev)
                model.AddBoolAnd([expected_assigned, other_assigned.Not()]).OnlyEnforceIf(dev.Not())

    # --- Objective ---
    model.Minimize(
        sum(understaff_vars) * UNDERSTAFFING_PENALTY_WEIGHT +
        sum(pattern_deviation_vars) * PATTERN_PENALTY_WEIGHT
    )

    # --- Solve ---
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = TIME_LIMIT_SECONDS
    solver.parameters.num_workers = NUM_SEARCH_WORKERS

    sys.stderr.write(f"Preprocessing took {time.time() - start_time:.2f}s. Model has {len(assign)} assign vars.\n")
    sys.stderr.write("Starting solver...\n")
    solve_start = time.time()
    status = solver.Solve(model)
    sys.stderr.write(f"Solver finished with status {solver.StatusName(status)} in {time.time() - solve_start:.2f}s\n")

    # --- Result ---
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return json.dumps({"error": f"Solver could not find a solution. Status: {solver.StatusName(status)}"})

    roster = {}
    for req in requests_data:
        date_str = req["date"]
        if date_str not in roster:
            roster[date_str] = {
                LOCATION_NAMES[l]: {SHIFT_NAMES[s]: [] for s in SHIFT_TYPES} 
                for l in LOCATIONS
            }
    
    for (e_idx, d_idx, s_idx, l_idx, comp_name), v in assign.items():
        if solver.Value(v):
            date_str = all_dates[d_idx]
            if date_str not in request_dates:
                continue
            loc_name = LOCATION_NAMES[l_idx]
            shift_name = SHIFT_NAMES[s_idx]
            roster[date_str][loc_name][shift_name].append({
                "user_id": employees_data[e_idx]["id"],
                "assigned_console": comp_name
            })

    return json.dumps(roster)
