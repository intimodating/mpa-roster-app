import json
import sys
import time
import random
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
PATTERN_PENALTY_WEIGHT = 5000
UNDERSTAFFING_PENALTY_WEIGHT = 10000000 # 10M base penalty
TIME_LIMIT_SECONDS = 120
NUM_SEARCH_WORKERS = 2  # Optimized for Cloud Run memory
MAX_MEMORY_MB = 1024    # 1GB limit for solver safety

# -----------------------------------------------------------------------------------
# Helper: safe boolean operations
def safe_bool_or(model, bool_vars, target_boolvar):
    if not bool_vars:
        model.Add(target_boolvar == 0)
    else:
        model.AddBoolOr(bool_vars).OnlyEnforceIf(target_boolvar)
        model.AddBoolAnd([v.Not() for v in bool_vars]).OnlyEnforceIf(target_boolvar.Not())
# -----------------------------------------------------------------------------------

def main(data):
    start_time = time.time()
    employees_data = data.get("employees", [])
    requests_data = data.get("requests", [])
    leave_data = data.get("leaveData", {})
    pending_leaves = data.get("pendingLeaves", [])
    ojt_data = data.get("ojtData", {}) # { date: { user_id: { shift_type: console, ... } } }

    # --- Preprocess Pending Leaves (Decompose date ranges) ---
    if pending_leaves:
        sys.stderr.write(f"Scheduler5: Processing {len(pending_leaves)} pending leaves...\n")
        from datetime import datetime, timedelta
        for leave in pending_leaves:
            u_id = leave.get("user_id")
            s_date_str = leave.get("start_date").split('T')[0]
            e_date_str = leave.get("end_date").split('T')[0]
            
            try:
                curr_date = datetime.strptime(s_date_str, "%Y-%m-%d")
                end_date = datetime.strptime(e_date_str, "%Y-%m-%d")
                
                if u_id not in leave_data:
                    leave_data[u_id] = {}
                    
                while curr_date <= end_date:
                    d_str = curr_date.strftime("%Y-%m-%d")
                    leave_data[u_id][d_str] = True
                    curr_date += timedelta(days=1)
            except Exception as e:
                sys.stderr.write(f"Scheduler5: Error decomposing leave for {u_id}: {e}\n")

    # Simulation specific parameters
    custom_pattern = data.get("shiftPattern", []) 
    pattern_sequence = [NAME_TO_SHIFT.get(s, OFF) for s in custom_pattern]
    pattern_length = len(pattern_sequence)

    if pattern_length == 0:
        return json.dumps({"error": "Shift pattern cannot be empty."})

    sys.stderr.write(f"Scheduler5 (Simulation with Pending Leaves): employees={len(employees_data)}, requests={len(requests_data)}, pattern={pattern_length}\n")  

    model = cp_model.CpModel()

    # --- Preprocess dates and maps ---
    all_dates = sorted(list(set(req["date"] for req in requests_data)))
    request_dates = set(all_dates)
    num_employees = len(employees_data)
    num_days = len(all_dates)
    date_to_index = {date: i for i, date in enumerate(all_dates)}

    # --- Preprocess competency counts and scarcity ---
    comp_counts = {}
    for emp in employees_data:
        for comp in emp.get("competencies", []):
            comp_counts[comp] = comp_counts.get(comp, 0) + 1

    comp_requirements = {}
    for req in requests_data:
        for comp_name, count in req.get("required_competencies", {}).items():
            comp_requirements[comp_name] = comp_requirements.get(comp_name, 0) + count

    scarcity_scores = {}
    for comp, count in comp_counts.items():
        req_total = comp_requirements.get(comp, 0)
        scarcity_scores[comp] = req_total / (count + 0.1)

    all_ordered_consoles = sorted(scarcity_scores.keys(), key=lambda x: scarcity_scores[x], reverse=True)
    sys.stderr.write(f"Scheduler5: Consoles sorted by scarcity: {all_ordered_consoles}\n")

    # --- Balanced Offset Assignment (if not provided) ---
    employee_offsets = {}
    has_custom_offsets = any("offset" in emp for emp in employees_data)
    
    if has_custom_offsets:
        for i, emp in enumerate(employees_data):
            employee_offsets[i] = int(emp.get("offset", 0)) % pattern_length
    else:
        # Greedily assign offsets to balance competencies across the pattern phases
        offset_counts = [0] * pattern_length
        comp_offset_counts = {c: [0] * pattern_length for c in scarcity_scores.keys()}
        
        # Sort employees by their most constrained competency scarcity
        def get_emp_max_scarcity(idx):
            comps = employees_data[idx].get("competencies", [])
            if not comps: return 0
            return max(scarcity_scores.get(c, 0) for c in comps)
            
        sorted_indices = sorted(range(num_employees), key=get_emp_max_scarcity, reverse=True)
        
        for i in sorted_indices:
            emp = employees_data[i]
            comps = emp.get("competencies", [])
            best_offset = -1
            min_score = float('inf')
            
            for o in range(pattern_length):
                # Score factors: overall offset balance + competency-specific balance
                score = offset_counts[o] * 10
                for c in comps:
                    score += comp_offset_counts[c][o] * 100
                
                if score < min_score:
                    min_score = score
                    best_offset = o
            
            employee_offsets[i] = best_offset
            offset_counts[best_offset] += 1
            for c in comps:
                comp_offset_counts[c][best_offset] += 1

    # --- Process OJT Data ---
    ojt_assignments = [] # To include in final roster
    ojt_blocked = {} # (e_idx, d_idx, s_idx) -> True
    day_has_ojt = {} # (e_idx, d_idx) -> True

    # Pre-map user_id to e_idx
    user_to_idx = {emp["id"]: i for i, emp in enumerate(employees_data)}

    sys.stderr.write(f"Scheduler5: Processing {len(ojt_data)} dates for OJT...\n")
    ojt_count = 0
    for date_str, users in ojt_data.items():
        if date_str not in date_to_index: 
            continue
        d_idx = date_to_index[date_str]
        for user_id, shifts in users.items():
            if user_id not in user_to_idx: 
                continue
            e_idx = user_to_idx[user_id]
            for shift_name, console in shifts.items():
                if shift_name not in NAME_TO_SHIFT: 
                    continue
                s_idx = NAME_TO_SHIFT[shift_name]
                
                # Mark as blocked for regular assignment
                ojt_blocked[(e_idx, d_idx, s_idx)] = True
                day_has_ojt[(e_idx, d_idx)] = True
                ojt_count += 1
                
                ojt_assignments.append({
                    "date": date_str,
                    "user_id": user_id,
                    "assigned_console": console,
                    "shift_name": shift_name,
                    "is_ojt": True
                })
    sys.stderr.write(f"Scheduler5: Successfully blocked {ojt_count} OJT slots.\n")

    # --- Variables ---
    assign = {}
    emp_day_vars = {}
    emp_day_shift_vars = {}
    req_comp_vars = {}

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
                
            # RULE 3: If already on OJT for ANY shift this day, cannot be assigned to another console
            if day_has_ojt.get((e_idx, d_idx)):
                continue

            # --- CUSTOM PATTERN LOGIC (HARD CONSTRAINTS) ---
            offset = employee_offsets.get(e_idx, 0)
            pattern_pos = (d_idx + offset) % pattern_length
            expected_s = pattern_sequence[pattern_pos]

            if expected_s == OFF:
                continue

            # RULE 2: Cannot swap Day (M/A) with Night (N)
            if expected_s in [MORNING, AFTERNOON] and s_idx == NIGHT:
                continue
            if expected_s == NIGHT and s_idx in [MORNING, AFTERNOON]:
                continue
            
            emp_comps = emp.get("competencies", [])
            if comp_name not in emp_comps:
                continue

            v = model.NewBoolVar('')
            assign[(e_idx, d_idx, s_idx, l_idx, comp_name)] = v
            req_comp_vars[(d_idx, s_idx, l_idx, comp_name)].append(v)

            if (e_idx, d_idx) not in emp_day_vars:
                emp_day_vars[(e_idx, d_idx)] = []
            emp_day_vars[(e_idx, d_idx)].append(v)

            shift_key = (e_idx, d_idx, s_idx)
            if shift_key not in emp_day_shift_vars:
                emp_day_shift_vars[shift_key] = []
            emp_day_shift_vars[shift_key].append(v)

    # --- Capacity Check ---
    total_slots_required = sum(comp_requirements.values())
    shift_capacity = {s: 0 for s in SHIFT_TYPES}
    for d_idx in range(num_days):
        date_str = all_dates[d_idx]
        for e_idx in range(num_employees):
            emp_id = employees_data[e_idx]["id"]
            if emp_id in leave_data and date_str in leave_data[emp_id]:
                continue
            
            if day_has_ojt.get((e_idx, d_idx)):
                continue

            offset = employee_offsets.get(e_idx, 0)
            pattern_pos = (d_idx + offset) % pattern_length
            expected_s = pattern_sequence[pattern_pos]
            
            if expected_s != OFF:
                shift_capacity[expected_s] += 1
    
    sys.stderr.write(f"Scheduler5: Total Slots Required: {total_slots_required}\n")
    sys.stderr.write(f"Scheduler5: Capacity by Shift Pattern: {shift_capacity}\n")

    # --- Constraints ---
    for (e_idx, d_idx), vars_list in emp_day_vars.items():
        model.Add(sum(vars_list) <= 1)

    # --- Soft Constraints: Understaffing ---
    total_understaff_penalty = 0
    understaff_vars = []
    understaff_map = {} 
    for (d_idx, s_idx, l_idx, comp_name), vars_list in req_comp_vars.items():
        count_req = req_map.get((d_idx, s_idx, l_idx), {}).get(comp_name, 0)
        if count_req > 0:
            understaff = model.NewIntVar(0, count_req, "")
            understaff_vars.append(understaff)
            if comp_name not in understaff_map:
                understaff_map[comp_name] = []
            understaff_map[comp_name].append(understaff)
            
            scarcity = scarcity_scores.get(comp_name, 0)
            weight_factor = 1.0 + (scarcity * 10.0)
            specific_weight = int(UNDERSTAFFING_PENALTY_WEIGHT * weight_factor)
            
            total_understaff_penalty += understaff * specific_weight
            model.Add(sum(vars_list) + understaff == count_req)

    # --- Soft Constraints: Pattern deviations ---
    pattern_deviation_vars = []
    for e_idx in range(num_employees):
        for d_idx in range(num_days):
            offset = employee_offsets.get(e_idx, 0)
            pattern_pos = (d_idx + offset) % pattern_length
            expected = pattern_sequence[pattern_pos]

            dev = model.NewBoolVar("")
            pattern_deviation_vars.append(dev)

            all_emp_vars = emp_day_vars.get((e_idx, d_idx), [])
            if not all_emp_vars:
                # If they have an OJT assignment on this day, it's not a "deviation" 
                # from the pattern if they are working that OJT shift.
                ojt_on_this_day = day_has_ojt.get((e_idx, d_idx))
                
                if expected != OFF and not ojt_on_this_day:
                    model.Add(dev == 1)
                else:
                    model.Add(dev == 0)
                continue

            if expected == OFF:
                safe_bool_or(model, all_emp_vars, dev)
            else:
                expected_vars = emp_day_shift_vars.get((e_idx, d_idx, expected), [])
                other_vars = [v for v in all_emp_vars if v not in expected_vars]
                
                expected_assigned = model.NewBoolVar("")
                other_assigned = model.NewBoolVar("")
                
                safe_bool_or(model, expected_vars, expected_assigned)
                safe_bool_or(model, other_vars, other_assigned)
                
                model.AddBoolOr([expected_assigned.Not(), other_assigned]).OnlyEnforceIf(dev)
                model.AddBoolAnd([expected_assigned, other_assigned.Not()]).OnlyEnforceIf(dev.Not())

    # --- Search Strategy ---
    rng = random.Random(42)

    all_u_vars = []
    for comp_name in all_ordered_consoles:
        u_vars = understaff_map.get(comp_name, [])
        if u_vars:
            all_u_vars.extend(u_vars)
    if all_u_vars:
        model.AddDecisionStrategy(all_u_vars, cp_model.CHOOSE_FIRST, cp_model.SELECT_MIN_VALUE)
            
    all_c_vars = []
    for comp_name in all_ordered_consoles:
        c_vars = [v for (e_idx, d_idx, s_idx, l_idx, c_name), v in assign.items() if c_name == comp_name]
        if c_vars:
            rng.shuffle(c_vars)
            all_c_vars.extend(c_vars)
    if all_c_vars:
        model.AddDecisionStrategy(all_c_vars, cp_model.CHOOSE_FIRST, cp_model.SELECT_MAX_VALUE)

    remaining_vars = list(assign.values())
    rng.shuffle(remaining_vars)
    model.AddDecisionStrategy(remaining_vars, cp_model.CHOOSE_FIRST, cp_model.SELECT_MAX_VALUE)
    model.AddDecisionStrategy(pattern_deviation_vars, cp_model.CHOOSE_FIRST, cp_model.SELECT_MIN_VALUE)

    # --- Objective ---
    model.Minimize(
        total_understaff_penalty +
        sum(pattern_deviation_vars) * PATTERN_PENALTY_WEIGHT
    )

    # --- Solve ---
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = TIME_LIMIT_SECONDS
    solver.parameters.num_search_workers = NUM_SEARCH_WORKERS
    solver.parameters.max_memory_in_mb = MAX_MEMORY_MB

    status = solver.Solve(model)

    sys.stderr.write(f"Scheduler5: Solver Status: {solver.StatusName(status)}\n")
    sys.stderr.write(f"Scheduler5: Objective Value: {solver.ObjectiveValue()}\n")

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return json.dumps({"error": f"Solver status: {solver.StatusName(status)}"})

    roster = {}
    assigned_count = 0
    # Add regular assignments
    for (e_idx, d_idx, s_idx, l_idx, comp_name), v in assign.items():
        if solver.Value(v):
            assigned_count += 1
            date_str = all_dates[d_idx]
            loc_name = LOCATION_NAMES[l_idx]
            shift_name = SHIFT_NAMES[s_idx]
            if date_str not in roster:
                roster[date_str] = {ln: {sn: [] for sn in SHIFT_NAMES.values()} for ln in LOCATION_NAMES.values()}
            roster[date_str][loc_name][shift_name].append({
                "user_id": employees_data[e_idx]["id"],
                "assigned_console": comp_name,
                "is_ojt": False
            })

    # Add OJT assignments
    for ojt in ojt_assignments:
        assigned_count += 1
        date_str = ojt["date"]
        shift_name = ojt["shift_name"]
        loc_name = "East" 
        if date_str not in roster:
            roster[date_str] = {ln: {sn: [] for sn in SHIFT_NAMES.values()} for ln in LOCATION_NAMES.values()}
        roster[date_str][loc_name][shift_name].append({
            "user_id": ojt["user_id"],
            "assigned_console": ojt["assigned_console"],
            "is_ojt": True
        })

    total_working_slots = sum(shift_capacity.values())
    sys.stderr.write(f"Scheduler5: Total Assignments: {assigned_count}\n")
    sys.stderr.write(f"Scheduler5: Total Reserve Pool Slots: {total_working_slots - assigned_count}\n")

    return json.dumps(roster)
