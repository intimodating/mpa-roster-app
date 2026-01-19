import json
import sys
import os

# Add the scheduler-service directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'scheduler-service'))

from scheduler2 import main as generate_roster_main

# Path to the temporary input file
temp_input_path = "temp_input.json"

try:
    with open(temp_input_path, 'r') as f:
        input_data = json.load(f)
except FileNotFoundError:
    print(json.dumps({"error": f"temp_input.json not found at {temp_input_path}"}))
    sys.exit(1)
except json.JSONDecodeError as e:
    print(json.dumps({"error": f"Invalid JSON in temp_input.json: {e}"}))
    sys.exit(1)

try:
    result = generate_roster_main(input_data)
    # The result from main is already a JSON string or a dict for errors
    if isinstance(result, dict):
        print(json.dumps(result)) # Ensure error dicts are also JSON strings
    else:
        print(result) # Already a JSON string
except Exception as e:
    print(json.dumps({"error": f"Error during scheduler execution: {e}"}))
    sys.exit(1)
