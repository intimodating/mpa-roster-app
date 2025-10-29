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
# Helper: safe boolean operations that handle empty lists
def safe_bool_or(model, bool_vars, target_boolvar):
    """Set target_boolvar = OR of bool_vars, handling empty list case."""
    if not bool_vars:
        # if no vars, OR is false
        model.Add(target_boolvar == 0)
    else:
        model.AddBoolOr(bool_vars).OnlyEnforceIf(target_boolvar)
        model.AddBoolAnd([v.Not() for v in bool_vars]).OnlyEnforceIf(target_boolvar.Not())

def safe_bool_and(model, bool_vars, target_boolvar):
    """Set target_boolvar = AND of bool_vars, handling empty list case."""
    if not bool_vars:
        # if no vars, AND is true (vacuous truth)
        model.Add(target_boolvar == 1)
    else:
        model.AddBoolAnd(bool_vars).OnlyEnforceIf(target_boolvar)
        model.AddBoolOr([v.Not() for v in bool_vars]).OnlyEnforceIf(target_boolvar.Not())
# -----------------------------------------------------------------------------------

def main():
    data = json.loads(sys.stdin.read())

    employees_data = data.get("employees", [])
    requests_data = data.get("requests", [])
    leave_data = data.get("leaveData", {})

    # quick input acknowledgement
    sys.stderr.write("Scheduler: received data. Preprocessing...\n")

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
    employee_id_to_index = {emp["id"]: i for i, emp in enumerate(employees_data)}
    date_to_index = {date: i for i, date in enumerate(all_dates)}

    # Each employee has an offset (use stored offset if provided in input; fallback to sequential)
    employee_offsets = {}
    for i, emp in enumerate(employees_data):
        if "offset" in emp:
            employee_offsets[i] = int(emp["offset"]) % PATTERN_LENGTH
        else:
            employee_offsets[i] = i % PATTERN_LENGTH

    # Precompute per-request grade-based eligibility and union eligibility
    eligible_per_grade = {}   # key: (date_idx, shift_idx, loc_idx, grade) -> set(employee_idx)
    eligible_union = {}       # key: (date_idx, shift_idx, loc_idx) -> set(employee_idx)
    total_required = {}       # key: (date_idx, shift_idx, loc_idx) -> int total required

    for req in requests_data:
        date_idx = date_to_index[req["date"]]
        shift_idx = NAME_TO_SHIFT.get(req["shiftType"])
        loc_idx = NAME_TO_LOCATION.get(req["location"])
        if shift_idx is None or loc_idx is None:
            raise ValueError(f"Unknown shift/location in request: {req}")

        union_set = set()
        total = 0
        for grade_str, count_str in req["required_proficiencies"].items():
            grade = int(grade_str)
            count = int(count_str)
            total += count
            key = (date_idx, shift_idx, loc_idx, grade)
            eligible = {i for i, emp in enumerate(employees_data) if emp["proficiency_grade"] >= grade}
            eligible_per_grade[key] = eligible
            union_set |= eligible

        eligible_union[(date_idx, shift_idx, loc_idx)] = union_set
        total_required[(date_idx, shift_idx, loc_idx)] = total

    # --- Create assign variables only for eligible + not-on-leave combos ---
    assign = {} 
    # Also keep a reverse mapping for quick lookup per shift-location
    assign_vars_by_shiftloc = {}  # (date_idx, shift_idx, loc_idx) -> list of BoolVars

    for (date_idx, shift_idx, loc_idx), eligible_set in eligible_union.items():
        assign_vars_by_shiftloc[(date_idx, shift_idx, loc_idx)] = []
        date_str = all_dates[date_idx]
        for e_idx in eligible_set:
            emp_id = employees_data[e_idx]["id"]
            # skip if on leave that day
            if emp_id in leave_data and date_str in leave_data[emp_id]:
                continue
            key = (e_idx, date_idx, shift_idx, loc_idx)
            # create assign var
            v = model.NewBoolVar(f"assign_e{e_idx}_d{date_idx}_s{shift_idx}_l{loc_idx}")
            assign[key] = v
            assign_vars_by_shiftloc[(date_idx, shift_idx, loc_idx)].append(v)

    # --- Sanity logging: show counts to help debug infeasible days ---
    for (date_idx, shift_idx, loc_idx), var_list in assign_vars_by_shiftloc.items():
        total_req = total_required.get((date_idx, shift_idx, loc_idx), 0)
        sys.stderr.write(
            f"Shift {all_dates[date_idx]} {SHIFT_NAMES[shift_idx]} @ {LOCATION_NAMES[loc_idx]}: "
            f"eligible_vars={len(var_list)}, required={total_req}\n"
        )

    # --- Hard constraints ---
    # 1) at most one shift per day per employee (across locations)
    for e_idx in range(num_employees):
        for d_idx in range(num_days):
            row = []
            for s_idx in SHIFT_TYPES:
                for l_idx in LOCATIONS:
                    key = (e_idx, d_idx, s_idx, l_idx)
                    if key in assign:
                        row.append(assign[key])
            if row:
                model.Add(sum(row) <= 1)

    # 2) Leave constraints: already honored by not creating those assign vars for that day,
    # but for safety, if any such var exists (shouldn't) set it to 0
    for e_idx, emp in enumerate(employees_data):
        emp_id = emp["id"]
        if emp_id not in leave_data:
            continue
        for date_str in leave_data[emp_id]:
            if date_str not in date_to_index:
                continue
            d_idx = date_to_index[date_str]
            for s_idx in SHIFT_TYPES:
                for l_idx in LOCATIONS:
                    key = (e_idx, d_idx, s_idx, l_idx)
                    if key in assign:
                        model.Add(assign[key] == 0)

    # --- Soft understaffing constraints per shift-location ---
    understaff_vars = []
    for (date_idx, shift_idx, loc_idx), var_list in assign_vars_by_shiftloc.items():
        required = total_required.get((date_idx, shift_idx, loc_idx), 0)
        if required == 0:
            # ensure no one is assigned if requirement is zero
            if var_list:
                model.Add(sum(var_list) == 0)
            continue

        # create understaffing penalty 0..required
        understaff = model.NewIntVar(0, required, f"understaff_d{date_idx}_s{shift_idx}_l{loc_idx}")
        understaff_vars.append(understaff)

        # sum(assign_vars) + understaff == required
        model.Add(sum(var_list) + understaff == required)

    # --- Pattern deviations (soft) ---
    pattern_deviation_vars = []
    for e_idx in range(num_employees):
        for d_idx in range(num_days):
            date_str = all_dates[d_idx]
            if date_str not in request_dates:
                continue

            offset = employee_offsets.get(e_idx, 0)
            pattern_pos = (d_idx + offset) % PATTERN_LENGTH
            expected = PATTERN_SEQUENCE[pattern_pos]  # may be OFF

            # deviation boolean
            dev = model.NewBoolVar(f"pattern_dev_e{e_idx}_d{d_idx}")
            pattern_deviation_vars.append(dev)

            if expected == OFF:
                # When OFF is expected, deviation = any shift assigned at all
                all_shift_vars = []
                for s_idx in SHIFT_TYPES:
                    for l_idx in LOCATIONS:
                        key = (e_idx, d_idx, s_idx, l_idx)
                        if key in assign:
                            all_shift_vars.append(assign[key])
                
                # Use helper function
                safe_bool_or(model, all_shift_vars, dev)
            else:
                # expected != OFF
                # Collect vars for expected shift
                expected_vars = []
                for l_idx in LOCATIONS:
                    key = (e_idx, d_idx, expected, l_idx)
                    if key in assign:
                        expected_vars.append(assign[key])
                
                # Collect vars for other shifts
                other_vars = []
                for s_idx in SHIFT_TYPES:
                    if s_idx == expected:
                        continue
                    for l_idx in LOCATIONS:
                        key = (e_idx, d_idx, s_idx, l_idx)
                        if key in assign:
                            other_vars.append(assign[key])
                
                # Create intermediate boolean variables
                expected_assigned = model.NewBoolVar(f"expected_assigned_e{e_idx}_d{d_idx}")
                other_assigned = model.NewBoolVar(f"other_assigned_e{e_idx}_d{d_idx}")
                
                # Use helper functions for cleaner logic
                safe_bool_or(model, expected_vars, expected_assigned)
                safe_bool_or(model, other_vars, other_assigned)
                
                # dev <-> (NOT expected_assigned) OR other_assigned
                # Equivalently: dev=1 iff (expected_assigned=0 OR other_assigned=1)
                #               dev=0 iff (expected_assigned=1 AND other_assigned=0)
                model.AddBoolOr([expected_assigned.Not(), other_assigned]).OnlyEnforceIf(dev)
                model.AddBoolAnd([expected_assigned, other_assigned.Not()]).OnlyEnforceIf(dev.Not())

    # --- Objective: minimize understaffing primarily, then pattern deviations ---
    model.Minimize(
        sum(understaff_vars) * UNDERSTAFFING_PENALTY_WEIGHT +
        sum(pattern_deviation_vars) * PATTERN_PENALTY_WEIGHT
    )

    # --- Solver ---
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = TIME_LIMIT_SECONDS
    solver.parameters.num_workers = NUM_SEARCH_WORKERS
    # optional: enable logging if needed
    # solver.parameters.log_search_progress = True

    sys.stderr.write("Starting solver...\n")
    status = solver.Solve(model)
    sys.stderr.write(f"Solver finished with status {solver.StatusName(status)}\n")

    # --- Build roster output (stdout ONLY) ---
    roster = {}
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        sys.stderr.write("Building roster from solution...\n")
        
        # Initialize roster structure for all request dates
        for req in requests_data:
            date_str = req["date"]
            if date_str not in roster:
                roster[date_str] = {
                    LOCATION_NAMES[l]: {SHIFT_NAMES[s]: [] for s in SHIFT_TYPES} 
                    for l in LOCATIONS
                }
        
        # Populate roster with assigned employees
        for (e_idx, d_idx, s_idx, l_idx), var in assign.items():
            if solver.Value(var):
                date_str = all_dates[d_idx]
                if date_str not in request_dates:
                    continue
                loc_name = LOCATION_NAMES[l_idx]
                shift_name = SHIFT_NAMES[s_idx]
                roster[date_str][loc_name][shift_name].append(employees_data[e_idx]["id"])
    else:
        sys.stderr.write(f"No feasible solution. Solver status: {solver.StatusName(status)}\n")

    # --- Detailed solver summary (stderr only) ---
    sys.stderr.write("\n--- Solver Summary ---\n")
    sys.stderr.write(f"Status: {solver.StatusName(status)}\n")
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        sys.stderr.write(f"Objective: {solver.ObjectiveValue()}\n")
        total_under = sum(int(solver.Value(v)) for v in understaff_vars)
        total_dev = sum(int(solver.Value(v)) for v in pattern_deviation_vars)
        sys.stderr.write(f"Total understaffing (raw): {total_under}\n")
        sys.stderr.write(f"Total pattern deviations: {total_dev}\n")
    sys.stderr.write("----------------------\n")

    # stdout: ONLY JSON roster
    print(json.dumps(roster))


if __name__ == "__main__":
    main()