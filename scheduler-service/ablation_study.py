import json
import time
import pandas as pd
import sys
import os
import random
from datetime import datetime, timedelta
from ortools.sat.python import cp_model

# Add current directory to path so we can import scheduler4
sys.path.append(os.path.dirname(__file__))
import scheduler4

# Monkey-patching to handle "No Search Strategy" case
original_add_decision_strategy = cp_model.CpModel.AddDecisionStrategy
def dummy_add_decision_strategy(self, *args, **kwargs):
    pass

def set_search_strategy(enabled):
    if enabled:
        cp_model.CpModel.AddDecisionStrategy = original_add_decision_strategy
    else:
        cp_model.CpModel.AddDecisionStrategy = dummy_add_decision_strategy

def create_test_data():
    # Load real data
    try:
        with open(os.path.join(os.path.dirname(__file__), 'real_data.json'), 'r') as f:
            employees = json.load(f)
        # Remove "offset" to let the scheduler distribute them, matching the Simulation API behavior.
        for emp in employees:
            if "offset" in emp:
                del emp["offset"]
        sys.stderr.write(f"Ablation: Loaded {len(employees)} employees from real_data.json (distributed offsets)\n")
    except Exception as e:
        sys.stderr.write(f"Ablation: Failed to load real_data.json: {e}. Falling back to synthetic.\n")
        employees = []
        for i in range(110):
            employees.append({
                "id": f"emp{i+1}",
                "competencies": []
            })

    # 30 days of requests
    start_date = datetime(2026, 4, 1)
    all_dates = [(start_date + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(30)]
    
    east_reqs = {
        "VTIS East": 2, "VTIS West": 2, "VTIS Central": 1, "Jurong Control": 1,
        "Pasir Panjang Control": 1, "Pasir Panjang MTC": 1, "VTIS MTC": 1, "PSU": 1,
        "GMDSS": 1, "Vista DO/ Sensitive Vessels": 1, "STW (TU)": 0, "Watch IC Console": 0 
    }
    west_reqs = {
        "East Control": 2, "West Control": 1, "Keppel": 1, "Sembawang Control": 1,
        "Sembawang MTC": 1, "STW (PB)": 1, "STW (TU)": 0, "Changi DO": 0
    }
    
    shift_pattern = ["Morning", "Morning", "Afternoon", "Afternoon", "OFF", "Night", "Night", "OFF", "OFF"]
    shifts_in_pattern = set(shift_pattern)
    
    requests = []
    for d in all_dates:
        for s in ["Morning", "Afternoon", "Night"]:
            if s in shifts_in_pattern:
                # East Location
                requests.append({
                    "date": d,
                    "shiftType": s,
                    "location": "East",
                    "required_competencies": east_reqs
                })
                # West Location
                requests.append({
                    "date": d,
                    "shiftType": s,
                    "location": "West",
                    "required_competencies": west_reqs
                })

    return {
        "employees": employees,
        "requests": requests,
        "leaveData": {},
        "ojtData": {},
        "shiftPattern": shift_pattern
    }

def count_unfilled_slots(input_data, roster):
    total_required = 0
    for req in input_data["requests"]:
        for count in req["required_competencies"].values():
            total_required += count
            
    total_assigned = 0
    for date_roster in roster.values():
        for loc_roster in date_roster.values():
            for shift_roster in loc_roster.values():
                total_assigned += len(shift_roster)
                
    return total_required - total_assigned

def count_pattern_violations(input_data, roster, offsets):
    pattern = input_data["shiftPattern"]
    pattern_len = len(pattern)
    all_dates = sorted(list(set(req["date"] for req in input_data["requests"])))
    date_to_idx = {d: i for i, d in enumerate(all_dates)}
    
    emp_map = {e["id"]: e for e in input_data["employees"]}
    # Map from index to id for offsets
    idx_to_id = {i: emp["id"] for i, emp in enumerate(input_data["employees"])}
    
    violations = 0
    
    # Track what each employee actually did
    # emp_id -> date -> shift_name
    actual_work = {}
    for date_str, date_roster in roster.items():
        for loc_roster in date_roster.values():
            for shift_name, assignments in loc_roster.items():
                for assign in assignments:
                    emp_id = assign["user_id"]
                    if emp_id not in actual_work:
                        actual_work[emp_id] = {}
                    actual_work[emp_id][date_str] = shift_name

    for e_idx_str, offset in offsets.items():
        e_idx = int(e_idx_str)
        emp_id = idx_to_id[e_idx]
        for date_str in all_dates:
            d_idx = date_to_idx[date_str]
            pattern_pos = (d_idx + offset) % pattern_len
            expected_shift = pattern[pattern_pos]
            actual_shift = actual_work.get(emp_id, {}).get(date_str, "OFF")
            
            # ONLY consider when a person is supposed to be working morning shift 
            # but allocated afternoon shift.
            if expected_shift == "Morning" and actual_shift == "Afternoon":
                violations += 1
                
    return violations

def run_ablation_study(base_data):
    results = []

    # Define the test cases
    test_cases = [
        {"name": "Full Model (Baseline)", "pattern_weight": 5000, "understaff_weight": 10000000, "use_strategy": True},
        {"name": "No Search Strategy", "pattern_weight": 5000, "understaff_weight": 10000000, "use_strategy": False},
        {"name": "No Scarcity Weighting", "pattern_weight": 5000, "understaff_weight": 1000, "use_strategy": True},
        {"name": "No Pattern Penalty", "pattern_weight": 0, "understaff_weight": 10000000, "use_strategy": True},
    ]

    for case in test_cases:
        sys.stderr.write(f"Running: {case['name']}...\n")
        
        # 1. Update Global Parameters in scheduler4
        scheduler4.PATTERN_PENALTY_WEIGHT = case['pattern_weight']
        scheduler4.UNDERSTAFFING_PENALTY_WEIGHT = case['understaff_weight']
        set_search_strategy(case['use_strategy'])
        
        # 2. Execute Solver and Measure Time
        base_data["return_offsets"] = True
        start = time.time()
        output_json = scheduler4.main(base_data) 
        end = time.time()
        
        # 3. Calculate Metrics
        result_data = json.loads(output_json)
        if "error" in result_data:
            solve_time = round(end - start, 2)
            unfilled = 999
            violations = 999
        else:
            roster = result_data["roster"]
            offsets = result_data["offsets"]
            solve_time = round(end - start, 2)
            unfilled = count_unfilled_slots(base_data, roster) 
            violations = count_pattern_violations(base_data, roster, offsets)

        results.append({
            "Configuration": case['name'],
            "Solve Time (s)": solve_time,
            "Unfilled Slots": unfilled,
            "Pattern Violations": violations
        })

    # Restore original strategy just in case
    set_search_strategy(True)

    # Display as a clean table
    df = pd.DataFrame(results)
    print("\n--- Ablation Study Results ---")
    print(df.to_string(index=False))

if __name__ == "__main__":
    test_data = create_test_data()
    run_ablation_study(test_data)
