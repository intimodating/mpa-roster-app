
import json
import sys
from ortools.sat.python import cp_model

def main():
    data = json.loads(sys.stdin.read())

    employees = data['employees']
    requests = data['requests']
    leave_data = data['leaveData']

    model = cp_model.CpModel()

    all_dates = sorted(list(set(req['date'] for req in requests)))
    num_days = len(all_dates)
    num_employees = len(employees)
    num_shifts = 3  # Morning, Afternoon, Night

    shifts = {}
    for e in range(num_employees):
        for d in range(num_days):
            for s in range(num_shifts):
                shifts[(e, d, s)] = model.NewBoolVar(f'shift_{e}_{d}_{s}')

    # Each employee can only be assigned to one shift per day
    for e in range(num_employees):
        for d in range(num_days):
            model.Add(sum(shifts[(e, d, s)] for s in range(num_shifts)) <= 1)



    # Handle leave
    for employee_id, leave_dates in leave_data.items():
        employee_index = next((i for i, emp in enumerate(employees) if emp['id'] == employee_id), None)
        if employee_index is not None:
            for leave_date in leave_dates:
                date_index = all_dates.index(leave_date)
                for s in range(num_shifts):
                    model.Add(shifts[(employee_index, date_index, s)] == 0)

    # Meet shift requirements
    for req in requests:
        date_index = all_dates.index(req['date'])
        shift_index = ['Morning', 'Afternoon', 'Night'].index(req['shiftType'])
        for grade, required_count_str in req['required_proficiencies'].items():
            required_count = int(required_count_str)
            employees_with_grade = [i for i, emp in enumerate(employees) if emp['proficiency_grade'] == grade]
            model.Add(sum(shifts[(e, date_index, shift_index)] for e in employees_with_grade) == required_count)

    solver = cp_model.CpSolver()
    status = solver.Solve(model)

    roster = {}
    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        for d in range(num_days):
            date = all_dates[d]
            roster[date] = {'East': {'Morning': [], 'Afternoon': [], 'Night': []}, 'West': {'Morning': [], 'Afternoon': [], 'Night': []}}
            for e in range(num_employees):
                for s in range(num_shifts):
                    if solver.Value(shifts[(e, d, s)]):
                        shift_type = ['Morning', 'Afternoon', 'Night'][s]
                        # For now, let's just assign to East. Location assignment needs more logic.
                        roster[date]['East'][shift_type].append(employees[e]['id'])

    print(json.dumps(roster))

if __name__ == '__main__':
    main()
