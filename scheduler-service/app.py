import sys
from flask import Flask, request, jsonify

# Import your scheduler's main function
from scheduler import main as generate_roster_main

app = Flask(__name__)

@app.route('/generate-roster', methods=['POST'])
def handle_generate_roster():
    # Check if the request has JSON data
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    # Get the data from the POST request
    input_data = request.get_json()

    try:
        # Call your original main function with the input data
        roster_json_string = generate_roster_main(input_data)
        
        # The result is already a JSON string, so we can return it directly
        # with the correct content type.
        return app.response_class(
            response=roster_json_string,
            status=200,
            mimetype='application/json'
        )

    except Exception as e:
        # Log the error for debugging
        print(f"Error during roster generation: {e}", file=sys.stderr)
        return jsonify({"error": "An internal error occurred during roster generation."}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
