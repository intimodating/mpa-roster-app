// types/roster.ts
interface ShiftDetails {
  Morning: string[];
  Afternoon: string[];
  Night: string[];
}

export interface ShiftData {
    date: string; // YYYY-MM-DD
    East: ShiftDetails;
    West: ShiftDetails;
    leaves?: string[]; // Optional: user_ids of people on leave
}

export type RosterMap = Record<string, ShiftData>;
