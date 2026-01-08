import json
import sys
import os
from datetime import datetime, timedelta

# --- Constants ---
MORNING, AFTERNOON, NIGHT, OFF = 0, 1, 2, -1
SHIFT_TYPES = [MORNING, AFTERNOON, NIGHT]
SHIFT_NAMES = {MORNING: "Morning", AFTERNOON: "Afternoon", NIGHT: "Night"}
NAME_TO_SHIFT = {"Morning": MORNING, "Afternoon": AFTERNOON, "Night": NIGHT}

EAST, WEST = 0, 1
LOCATIONS = [EAST, WEST]
LOCATION_NAMES = {EAST: "East", WEST: "West"}
NAME_TO_LOCATION = {"East": EAST, "West": WEST}

# All possible shift and location combinations
ALL_SHIFT_LOCATION_SLOTS = [
    (MORNING, EAST), (MORNING, WEST),
    (AFTERNOON, EAST), (AFTERNOON, WEST),
    (NIGHT, EAST), (NIGHT, WEST)
]

# 9-day repeating pattern
PATTERN_SEQUENCE = [MORNING, MORNING, AFTERNOON, AFTERNOON, OFF, NIGHT, NIGHT, OFF, OFF]
PATTERN_LENGTH = len(PATTERN_SEQUENCE)

# --- Tunable Parameters ---
NUM_TEAMS = 9 # Maximum number of teams

def get_team_for_date(date_str, all_dates, team_start_offset=0):
    first_date_str = all_dates[0]
    first_date = datetime.strptime(first_date_str, '%Y-%m-%d').date()
    current_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    
    day_diff = (current_date - first_date).days
    return ((day_diff + team_start_offset) % NUM_TEAMS) + 1 # Teams are 1-indexed

def get_team_for_shift_location(date_str, shift_type_const, location_const, all_dates, team_offsets):
    """
    Determines the responsible team for a specific (date, shift_type, location) slot,
    based on the 9-day shift pattern and team offsets.
    """
    first_date_str = all_dates[0]
    first_date = datetime.strptime(first_date_str, '%Y-%m-%d').date()
    current_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    
    day_index = (current_date - first_date).days
    day_in_pattern = day_index % PATTERN_LENGTH

    candidate_teams = []
    for team_id, offset in team_offsets.items():
        effective_day_for_team = (day_in_pattern + offset) % PATTERN_LENGTH
        if PATTERN_SEQUENCE[effective_day_for_team] == shift_type_const:
            candidate_teams.append(team_id)

    candidate_teams.sort() # Ensure consistent assignment for East/West

    if not candidate_teams:
        return None # No team scheduled for this shift type on this day

    if location_const == EAST:
        return candidate_teams[0] if len(candidate_teams) > 0 else None
    elif location_const == WEST:
        return candidate_teams[1] if len(candidate_teams) > 1 else None
    
    return None # Should ideally not be reached if logic is sound

def _run_greedy_team_based_scheduler(data):
    employees_data = data.get("employees", [])
    requests_data = data.get("requests", [])
    leave_data = data.get("leaveData", {})

    sys.stderr.write("Scheduler: received data for team-based scheduling (greedy). Preprocessing...\n")

    # --- Preprocess dates and maps ---
    all_dates = sorted(
        list(
            set(req["date"] for req in requests_data)
            | set(date for dates in leave_data.values() for date in dates)
        )
    )
    
    # --- Employee and Team Preprocessing ---
    # Initialize team_offsets based on NUM_TEAMS. team_id 1 has offset 0, team_id 2 has offset 1, etc.
    # This assumes teams are 1-indexed.
    team_offsets = {team_id: (team_id - 1) for team_id in range(1, NUM_TEAMS + 1)}

    employee_teams = {} # key: employee_index -> team_id
    for i, emp in enumerate(employees_data):
        # Rely on 'team' field from employee data as it is assumed to be present
        if "team" in emp and emp["team"] is not None:
            employee_teams[i] = int(emp["team"])
        else:
            raise ValueError(f"Employee {emp.get('id', 'unknown')} is missing the 'team' field, which is required for team-based scheduling.")

    # --- Roster Generation ---
    roster = {}
    validation_errors = []

    # Group requests by date for daily processing
    requests_by_date = {}
    for req in requests_data:
        date = req["date"]
        if date not in requests_by_date:
            requests_by_date[date] = []
        requests_by_date[date].append(req)

    # Iterate through each date to perform team and shift allocation
    for date, day_requests in sorted(requests_by_date.items()):
        # Pre-compute available team members for all teams for this date
        # This includes handling leave data
        team_member_indices_by_team_id = {team_id: set() for team_id in range(1, NUM_TEAMS + 1)}
        for e_idx, emp in enumerate(employees_data):
            emp_id = emp["id"]
            team_id = employee_teams.get(e_idx) 
            
            if team_id is not None:
                if emp_id not in leave_data or date not in leave_data[emp_id]:
                    team_member_indices_by_team_id[team_id].add(e_idx)

        # Process each shift for the day
        for req in day_requests:
            shift_type_name = req["shiftType"]
            location_name = req["location"]
            
            # Convert names to constants for internal logic
            shift_type_const = NAME_TO_SHIFT[shift_type_name]
            location_const = NAME_TO_LOCATION[location_name]

            # Determine the team responsible for this specific (date, shift_type, location) slot
            responsible_team_id = get_team_for_shift_location(date, shift_type_const, location_const, all_dates, team_offsets)
            
            if responsible_team_id is None:
                 error_detail = (
                    f"No team scheduled for {date} {shift_type_name} @ {location_name} based on pattern and offsets. "
                    f"Team offsets: {team_offsets}, Day in pattern: {day_in_pattern}."
                )
                 validation_errors.append(error_detail)
                 continue # Skip allocation for this request if no team is assigned

            sys.stderr.write(f"INFO: Allocating {date} {shift_type_name} @ {location_name} to Team {responsible_team_id}.\n")

            # Get available members for THIS responsible_team_id, sorted by proficiency
            available_team_members_for_slot = [
                (e_idx, employees_data[e_idx]) for e_idx in team_member_indices_by_team_id[responsible_team_id]
            ]
            available_team_members_for_slot.sort(key=lambda x: x[1]['proficiency_grade'], reverse=True)
            
            # Track which employees have been assigned a shift for this specific slot
            used_employees_for_slot = set() 

            # Initialize roster structure if not present
            if date not in roster:
                roster[date] = {loc: {shift: [] for shift in SHIFT_NAMES.values()} for loc in LOCATION_NAMES.values()}
            
            # Get requirements for this shift
            required_proficiencies = {int(g): int(c) for g, c in req["required_proficiencies"].items()}
            
            # Top-down allocation: iterate from highest required grade to lowest
            for grade in sorted(required_proficiencies.keys(), reverse=True):
                needed_count = required_proficiencies[grade]
                
                for _ in range(needed_count):
                    assigned = False
                    # Find an available employee of at least this grade for this slot
                    for i, (e_idx, emp) in enumerate(available_team_members_for_slot):
                        if e_idx not in used_employees_for_slot and emp["proficiency_grade"] >= grade:
                            # Assign them
                            roster[date][location_name][shift_type_name].append(emp["id"])
                            used_employees_for_slot.add(e_idx)
                            
                            # Remove from available list for this slot's allocation logic
                            available_team_members_for_slot.pop(i) 
                            assigned = True
                            break # Move to the next needed worker
                    
                    if not assigned:
                        # Construct detailed error message
                        team_members_in_responsible_team = [
                            employees_data[idx] for idx, team_id_val in employee_teams.items() 
                            if team_id_val == responsible_team_id
                        ]
                        proficiency_counts = {}
                        for member in team_members_in_responsible_team:
                            proficiency_counts[member['proficiency_grade']] = proficiency_counts.get(member['proficiency_grade'], 0) + 1
                        
                        error_detail = (
                            f"Team {responsible_team_id} is understaffed for shift {date} {shift_type_name} @ {location_name}. "
                            f"Could not find an available worker for grade {grade}. "
                            f"Team composition: {proficiency_counts}"
                        )
                        validation_errors.append(error_detail)

    if validation_errors:
        sys.stderr.write("Validation errors found during greedy team-based scheduling.\n")
        return json.dumps({"error": "Failed to generate roster due to understaffing", "details": validation_errors})

    sys.stderr.write("Greedy team-based scheduling successful.\n")
    return json.dumps(roster)


def _run_cp_sat_team_based_scheduler(data):
    # Placeholder for the CP-SAT team-based scheduler logic if needed in the future
    # This is where the more complex logic with hard constraints would go.
    raise NotImplementedError("CP-SAT team-based scheduler is not implemented in this version.")


def _run_individual_scheduler(data):
    # In this service, the individual scheduler is handled by `scheduler.py`.
    # This function is a placeholder to prevent errors if called.
    raise NotImplementedError("Individual scheduler is not implemented in this service (scheduler2.py).")




# This is the main dispatcher function
def main(data):
    scheduling_mode_from_input = data.get("schedulingMode", "individual") # Default to individual
    sys.stderr.write(f"Scheduler: Scheduling mode received: {scheduling_mode_from_input}\n")

    if scheduling_mode_from_input == "team":
        sys.stderr.write("Scheduler: Calling team-based scheduler...\n")
        return _run_greedy_team_based_scheduler(data)
    else: # Default or explicit "individual"
        sys.stderr.write("Scheduler: Calling individual-based scheduler...\n")
        return _run_individual_scheduler(data)

if __name__ == '__main__':
    # For local testing, data can be passed as a command-line argument
    # In production, this would likely come from an HTTP request body
    if len(sys.argv) > 1:
        input_arg = sys.argv[1]
        if os.path.exists(input_arg):
            with open(input_arg, 'r') as f:
                input_data = json.load(f)
        else:
            input_data = json.loads(input_arg)
        result = main(input_data)
        print(result)
    else:
        # If no command-line arg, read from stdin (e.g., piped JSON)
        input_data = json.load(sys.stdin)
        result = main(input_data)
        print(result)
