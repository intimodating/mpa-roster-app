import json
import sys
from ortools.sat.python import cp_model

# --- Constants ---
MORNING, AFTERNOON, NIGHT, OFF = 0, 1, 2, -1
SHIFT_TYPES = [MORNING, AFTERNOON, NIGHT]
SHIFT_NAMES = {MORNING: "Morning", AFTERNOON: "Afternoon", NIGHT: "Night"}
NAME_TO_SHIFT = {"Morning": MORNING, "Afternoon": AFTERNOON, "Night": NIGHT}

EAST, WEST = 0, 1
LOCATIONS = [EAST, WEST]
LOCATION_NAMES = {EAST: "East", WEST: "West"}
NAME_TO_LOCATION = {"East": EAST, "West": WEST}

# 9-day repeating pattern
PATTERN_SEQUENCE = [MORNING, MORNING, AFTERNOON, AFTERNOON, OFF, NIGHT, NIGHT, OFF, OFF]
PATTERN_LENGTH = len(PATTERN_SEQUENCE)

# --- Tunable Parameters ---
PATTERN_PENALTY_WEIGHT = 100
UNDERSTAFFING_PENALTY_WEIGHT = 1000
TIME_LIMIT_SECONDS = 30
NUM_SEARCH_WORKERS = 8

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
    employees_data = data.get("employees", []) # Each emp should have a 'competencies' list
    requests_data = data.get("requests", [])   # Each req has 'required_competencies'
    leave_data = data.get("leaveData", {})

    sys.stderr.write("Scheduler3 (Competency): received data. Preprocessing...\n")

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
            employee_offsets[i] = int(emp["offset"]) % PATTERN_LENGTH
        else:
            employee_offsets[i] = i % PATTERN_LENGTH

    # --- Variables ---
    # assign[(e_idx, d_idx, s_idx, l_idx, comp_name)]
    assign = {}
    # Track assignments per employee per day
    emp_day_vars = {} # (e_idx, d_idx) -> list of vars
    # Track assignments per requirement
    req_comp_vars = {} # (date_idx, shift_idx, loc_idx, comp_name) -> list of vars

    for req in requests_data:
        d_idx = date_to_index[req["date"]]
        s_idx = NAME_TO_SHIFT[req["shiftType"]]
        l_idx = NAME_TO_LOCATION[req["location"]]
        req_comp_dict = req.get("required_competencies", {})

        for comp_name, count in req_comp_dict.items():
            if count <= 0: continue
            key_req = (d_idx, s_idx, l_idx, comp_name)
            req_comp_vars[key_req] = []

            for e_idx, emp in enumerate(employees_data):
                emp_id = emp["id"]
                # Check leave
                if emp_id in leave_data and req["date"] in leave_data[emp_id]:
                    continue
                
                # Check if employee has competency
                emp_comps = emp.get("competencies", [])
                if comp_name not in emp_comps:
                    continue
                
                # Create variable
                v = model.NewBoolVar(f"assign_e{e_idx}_d{d_idx}_s{s_idx}_l{l_idx}_{comp_name}")
                assign[(e_idx, d_idx, s_idx, l_idx, comp_name)] = v
                req_comp_vars[key_req].append(v)
                
                if (e_idx, d_idx) not in emp_day_vars:
                    emp_day_vars[(e_idx, d_idx)] = []
                emp_day_vars[(e_idx, d_idx)].append(v)

    # --- Hard Constraints ---
    # 1) At most one shift/competency per day per employee
    for (e_idx, d_idx), vars_list in emp_day_vars.items():
        model.Add(sum(vars_list) <= 1)

    # 2) Understaffing (Soft)
    understaff_vars = []
    for (d_idx, s_idx, l_idx, comp_name), vars_list in req_comp_vars.items():
        # Find the original request to get the count
        count_req = 0
        for req in requests_data:
            if (date_to_index[req["date"]] == d_idx and 
                NAME_TO_SHIFT[req["shiftType"]] == s_idx and 
                NAME_TO_LOCATION[req["location"]] == l_idx):
                count_req = req["required_competencies"].get(comp_name, 0)
                break
        
        if count_req > 0:
            understaff = model.NewIntVar(0, count_req, f"understaff_{d_idx}_{s_idx}_{l_idx}_{comp_name}")
            understaff_vars.append(understaff)
            # Use '==' to prevent overstaffing. 
            # assigned + understaff must exactly equal requirement.
            model.Add(sum(vars_list) + understaff == count_req)

    # --- Pattern deviations (soft) ---
    pattern_deviation_vars = []
    for e_idx in range(num_employees):
        for d_idx in range(num_days):
            date_str = all_dates[d_idx]
            if date_str not in request_dates:
                continue

            offset = employee_offsets.get(e_idx, 0)
            pattern_pos = (d_idx + offset) % PATTERN_LENGTH
            expected = PATTERN_SEQUENCE[pattern_pos]

            dev = model.NewBoolVar(f"pattern_dev_e{e_idx}_d{d_idx}")
            pattern_deviation_vars.append(dev)

            # Get all assignment vars for this employee on this day
            all_emp_vars = emp_day_vars.get((e_idx, d_idx), [])

            if expected == OFF:
                # dev = 1 if any shift assigned
                safe_bool_or(model, all_emp_vars, dev)
            else:
                # expected shift vars (any location, any competency)
                expected_vars = []
                other_vars = []
                for (ei, di, si, li, cn), v in assign.items():
                    if ei == e_idx and di == d_idx:
                        if si == expected:
                            expected_vars.append(v)
                        else:
                            other_vars.append(v)
                
                expected_assigned = model.NewBoolVar(f"expected_assigned_e{e_idx}_d{d_idx}")
                other_assigned = model.NewBoolVar(f"other_assigned_e{e_idx}_d{d_idx}")
                
                safe_bool_or(model, expected_vars, expected_assigned)
                safe_bool_or(model, other_vars, other_assigned)
                
                # dev = 1 iff (NOT expected_assigned) OR other_assigned
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

    sys.stderr.write("Starting solver (Competency)...\n")
    status = solver.Solve(model)
    sys.stderr.write(f"Solver finished with status {solver.StatusName(status)}\n")

    # --- Result ---
    roster = {}
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
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
