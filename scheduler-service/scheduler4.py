import json
import sys
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
UNDERSTAFFING_PENALTY_WEIGHT = 1000
TIME_LIMIT_SECONDS = 30
NUM_SEARCH_WORKERS = 8

def main(data):
    employees_data = data.get("employees", []) 
    requests_data = data.get("requests", [])   
    leave_data = data.get("leaveData", {})
    
    # Simulation specific parameters
    custom_pattern = data.get("shiftPattern", []) # List of strings like ["Morning", "OFF", ...]
    pattern_sequence = [NAME_TO_SHIFT.get(s, OFF) for s in custom_pattern]
    pattern_length = len(pattern_sequence)
    
    if pattern_length == 0:
        return json.dumps({"error": "Shift pattern cannot be empty."})

    sys.stderr.write(f"Scheduler4 (Simulation): pattern length {pattern_length}\n")

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

    # Offsets for employees - in simulation we assume they follow the pattern starting from their offset
    employee_offsets = {}
    for i, emp in enumerate(employees_data):
        if "offset" in emp:
            employee_offsets[i] = int(emp["offset"]) % pattern_length
        else:
            employee_offsets[i] = i % pattern_length

    # --- Variables ---
    assign = {}
    emp_day_vars = {} 
    req_comp_vars = {} 

    for req in requests_data:
        d_idx = date_to_index[req["date"]]
        s_idx = NAME_TO_SHIFT[req["shiftType"]]
        l_idx = NAME_TO_LOCATION[req["location"]]
        req_comp_dict = req.get("required_competencies", {})

        for comp_name, count in req_comp_dict.items():
            if count <= 0: continue
            key_req = (d_idx, s_idx, l_idx, comp_name)
            if key_req not in req_comp_vars:
                req_comp_vars[key_req] = []

            for e_idx, emp in enumerate(employees_data):
                emp_id = emp["id"]
                
                # HARD CONSTRAINT: Pattern enforcement
                offset = employee_offsets.get(e_idx, 0)
                pattern_pos = (d_idx + offset) % pattern_length
                expected_shift = pattern_sequence[pattern_pos]
                
                # If the expected shift for this employee on this day doesn't match the request's shift, skip
                if expected_shift != s_idx:
                    continue
                
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

    # 2) Staffing Requirements (Strict for Simulation if possible, or very high penalty)
    # The user asked for "infeasible if no solution found". 
    # To truly output "infeasible" for staffing, we make them HARD constraints.
    for (d_idx, s_idx, l_idx, comp_name), vars_list in req_comp_vars.items():
        count_req = 0
        for req in requests_data:
            if (date_to_index[req["date"]] == d_idx and 
                NAME_TO_SHIFT[req["shiftType"]] == s_idx and 
                NAME_TO_LOCATION[req["location"]] == l_idx):
                count_req = req["required_competencies"].get(comp_name, 0)
                break
        
        if count_req > 0:
            model.Add(sum(vars_list) == count_req)

    # --- Solve ---
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = TIME_LIMIT_SECONDS
    solver.parameters.num_workers = NUM_SEARCH_WORKERS

    sys.stderr.write("Starting solver (Simulation Hard Constraints)...\n")
    status = solver.Solve(model)
    sys.stderr.write(f"Solver finished with status {solver.StatusName(status)}\n")

    # --- Result ---
    if status == cp_model.INFEASIBLE:
        return json.dumps({"error": "Infeasible: No solution found that satisfies the shift pattern and staffing requirements."})
    
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
