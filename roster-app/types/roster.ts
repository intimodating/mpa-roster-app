// types/roster.ts

export interface WorkerAssignment {
  user_id: string;
  assigned_console?: string;
}

export interface ShiftDetails {
  Morning: (string | WorkerAssignment)[];
  Afternoon: (string | WorkerAssignment)[];
  Night: (string | WorkerAssignment)[];
}

export interface ShiftData {
    date: string; // YYYY-MM-DD
    East: ShiftDetails;
    West: ShiftDetails;
    leaves?: string[]; // Optional: user_ids of people on leave
}

export type RosterMap = Record<string, ShiftData>;
