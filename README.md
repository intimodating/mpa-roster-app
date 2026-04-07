VTM Smart Roster Scheduling System
This is a specialised scheduling and simulation platform designed to handle the high-stakes environment of Vessel Traffic Management (VTM). 
Unlike generic calendars, this system treats rosters as a complex optimisation problem, balancing maritime safety and worker welfare.

The Core Challenge:
VTM operations require 24/7 coverage across multiple sectors, taking into account shift rotation and competencies.

Tech Stack:
Frontend/API: Next.js 14
Scheduling Engine: Python 3.10 with Google OR-Tools (CP-SAT).
Data Layer: MongoDB via Mongoose for schema-enforced personnel records.

Quick Start
1. Install Web Dependencies
```
Bash
npm install
```
2. Setup Python Environment
```
Bash
pip install ortools pandas
```
3. Launch Development Mode
```
Bash
cd roster-app
npm run dev
```
4. Open separate terminal
```
Bash
cd scheduler-service
python app.py
```
