# Use an official lightweight Python image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port Gunicorn will run on
# Cloud Run automatically uses port 8080 by default
EXPOSE 8080

# Command to run the application using Gunicorn
# The --bind 0.0.0.0:8080 flag is important for Cloud Run
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--threads", "8", "--timeout", "0", "app:app"]
