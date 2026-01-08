import sys
import traceback
import json
from flask import Flask, request, jsonify

# Import the main function from each scheduler
from scheduler import main as individual_scheduler_main
from scheduler2 import main as team_scheduler_main

app = Flask(__name__)

@app.route('/generate-roster', methods=['POST'])
def handle_generate_roster():
    # Check if the request has JSON data
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    # Get the data from the POST request
    input_data = request.get_json()
    scheduling_mode = input_data.get("schedulingMode", "individual")
    
    sys.stderr.write(f"Dispatcher: Received schedulingMode: {scheduling_mode}\n")

    try:
        # Call the appropriate scheduler based on the mode
        if scheduling_mode == "team":
            sys.stderr.write("Dispatcher: Calling team-based scheduler...\n")
            result = team_scheduler_main(input_data)
        else:
            sys.stderr.write("Dispatcher: Calling individual-based scheduler...\n")
            result = individual_scheduler_main(input_data)
        
        # The result from either scheduler is a JSON string. Parse it.
        parsed_result = json.loads(result)
        
        # Check if the parsed result contains an error
        if isinstance(parsed_result, dict) and "error" in parsed_result:
            return jsonify(parsed_result), 400
        
        # Return the successful roster JSON
        return app.response_class(
            response=result,
            status=200,
            mimetype='application/json'
        )

    except Exception as e:
        # Log the error for debugging, including full traceback
        print(f"Error during roster generation: {e}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        return jsonify({"error": "An internal error occurred during roster generation."} ), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)