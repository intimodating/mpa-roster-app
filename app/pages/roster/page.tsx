// app/pages/roster/page.tsx
"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// Ensure this import path is correct for your project structure
import ShiftEditorModal from './ShiftEditorModal'; 
import Link from 'next/link';

// --- INTERFACES ---
interface UserData {
  name: string;
  user_id: string;
  account_type: "Planner" | "Non-Planner" | string;
}

interface ShiftData {
    date: string; // YYYY-MM-DD
    dayShiftEmployees: string[];
    nightShiftEmployees: string[];
}

// RosterMap is a map of dateKey ('YYYY-MM-DD') to ShiftData
type RosterMap = Record<string, ShiftData>;

// --- MAIN COMPONENT ---
export default function RosterPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  
  // Roster state: Stores fetched shifts for the entire visible calendar range
  const [rosterData, setRosterData] = useState<RosterMap>({});
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShiftData, setSelectedShiftData] = useState<ShiftData | null>(null);

  // --- AUTHENTICATION CHECK ---
  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (!storedUser) {
      router.push('/');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
  }, [router]);

  // --- FETCH MONTH DATA EFFECT ---
  // --- DATA FETCH FUNCTION (NEW STANDALONE) ---
  // Use useCallback to memoize the function, preventing infinite loops in useEffect
  const fetchRosterData = useCallback(async () => {
      // Only fetch if user data is loaded
      if (!user) return; 

      // 1. Calculate the start and end of the relevant calendar range
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      // Find the first day of the month and its day of the week (0=Sun)
      const firstOfMonth = new Date(year, month, 1);
      const startDayOfWeek = firstOfMonth.getDay(); 
      
      // Calculate the start date of the visible calendar (may be in the previous month)
      const startDate = new Date(firstOfMonth);
      startDate.setDate(firstOfMonth.getDate() - startDayOfWeek);
      
      // Calculate the end date of the visible calendar (6 weeks from the start)
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 42); // 6 weeks * 7 days

      // Format dates for API query (UTC midnight)
      const startDateStr = startDate.toISOString().split('T')[0] + 'T00:00:00.000Z';
      const endDateStr = endDate.toISOString().split('T')[0] + 'T00:00:00.000Z';

      setIsLoading(true);
      try {
          const res = await fetch(`/api/roster/fetch-month?startDate=${startDateStr}&endDate=${endDateStr}`);
          const result = await res.json();

          if (result.success) {
              // Update the rosterData with the fetched map (the clean data)
              setRosterData(result.data);
          } else {
              console.error("Month Fetch Failed:", result.message);
          }
      } catch (error) {
          console.error("Error during month fetch:", error);
      } finally {
          setIsLoading(false);
      }
  }, [currentDate, user]); // Dependencies ensure the function is only recreated when these values change


  // --- FETCH MONTH DATA EFFECT (Now calls the new function) ---
  useEffect(() => {
      fetchRosterData();
  }, [fetchRosterData]); // Depend on the memoized function
  // --- HANDLERS ---
  
  const changeMonth = (delta: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  /**
   * Prepares shift data for the modal using the data already fetched for the month.
   * @param dateKey The date in 'YYYY-MM-DD' format.
   */
  const handleDayClick = (dateKey: string) => {
    // Only Planners can edit and fetch details
    if (user?.account_type !== "Planner") {
      alert("Only Planners can view/edit shift details.");
      return;
    }
    
    // Get data from local state (already fetched for the month)
    const existingData = rosterData[dateKey];
    
    // Prepare the data structure for the modal (empty arrays if no shifts found)
    const baseData = existingData 
        ? { 
            date: dateKey, // <-- Add the key as the date value
            dayShiftEmployees: existingData.dayShiftEmployees, 
            nightShiftEmployees: existingData.nightShiftEmployees 
          }
        : { 
            date: dateKey, 
            dayShiftEmployees: [], 
            nightShiftEmployees: [] 
          };

    setSelectedShiftData(baseData as ShiftData);
    setIsModalOpen(true);
  };

  /**
   * Saves changes via the API and updates local state upon success.
   */
  const handleSaveShifts = async (updatedData: ShiftData) => {
    // 🛑 DEBUGGING STEP: Check the object right before it is sent!
    console.log("Payload being sent to API:", updatedData); 
    console.log("Date value in payload:", updatedData.date); // Should show YYYY-MM-DD
    setIsLoading(true);
    try {
      // Call the update API route
      const res = await fetch('/api/roster/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData),
      });

      const data = await res.json();

      if (!data.success) {
          alert(`Failed to save: ${data.message}`);
          return;
      }

      // Update the local state (rosterData) with the newly saved data
      // This is crucial for instantly reflecting changes on the calendar grid
      setRosterData(prev => ({ ...prev, [updatedData.date]: updatedData }));
      
      alert(`Roster saved successfully. ${data.count} shifts assigned.`);
      setIsModalOpen(false);
      
    } catch (error) {
        console.error("API Call Error:", error);
        alert("An error occurred while saving the roster.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // --- RENDER ---

  if (isLoading || !user) {
    return <div style={styles.center}>Loading Roster...</div>;
  }
  
  if (!user.name) {
    return <div style={styles.center}>Error: User data is incomplete.</div>;
  }

  return (
    <div style={styles.root}>
      <div style={styles.container}>
        <h1 style={styles.header}>Roster Calendar for {user.name}</h1>
        
        {/* Planner-only button container */}
        <div style={styles.buttonContainer}>
          {user.account_type === "Planner" && (
            <button style={styles.plannerButton} onClick={() => alert('Planner Mode: Click a date to edit shifts.')}>
              Generate Roster
            </button>
          )}
          
          <button style={styles.leaveButton} onClick={() => alert('Applying for Leave...')}>
            Apply Leave
          </button>
          
          <button style={styles.backButton} onClick={() => router.push('/pages/home')}>
            Back to Home
          </button>
        </div>

        {/* CALENDAR VIEW */}
        <CalendarView
          currentDate={currentDate}
          changeMonth={changeMonth}
          rosterData={rosterData}
          onDayClick={handleDayClick} 
        />
      </div>
      
      {/* MODAL */}
      {isModalOpen && selectedShiftData && user.account_type === "Planner" && (
        <ShiftEditorModal
          shiftData={selectedShiftData}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveShifts}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// CalendarView Component (Displays the calendar grid)
// --------------------------------------------------------------------------

interface CalendarProps {
  currentDate: Date;
  changeMonth: (delta: number) => void;
  rosterData: RosterMap;
  onDayClick: (dateKey: string) => void;
}

const CalendarView: React.FC<CalendarProps> = React.memo(({ currentDate, changeMonth, rosterData, onDayClick }) => {
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDateString = new Date().toISOString().split('T')[0];

  const calendarDays: (number | null)[] = useMemo(() => {
    const days: (number | null)[] = [];
    // Fill leading empty cells
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    // Fill days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [firstDayOfMonth, daysInMonth]);

  return (
    <div style={calStyles.calendarContainer}>
      <div style={calStyles.header}>
        <button onClick={() => changeMonth(-1)}>&lt;</button>
        <h2>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
        <button onClick={() => changeMonth(1)}>&gt;</button>
      </div>
      <div style={calStyles.weekdays}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} style={calStyles.weekdayCell}>{day}</div>
        ))}
      </div>
      <div style={calStyles.calendarGrid}>
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <div key={index} style={calStyles.emptyCell}></div>;
          }

          // Format the date key (e.g., '2025-10-20')
          const date = new Date(year, month, day);
          const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
          
          const dayShift = rosterData[dateKey]?.dayShiftEmployees || [];
          const nightShift = rosterData[dateKey]?.nightShiftEmployees || [];
          const hasShift = dayShift.length > 0 || nightShift.length > 0;
          const isToday = dateKey === todayDateString;

          return (
            <div 
              key={day} 
              style={{ 
                ...calStyles.dayCell, 
                cursor: 'pointer', 
                backgroundColor: hasShift ? '#f0fff0' : '#fff',
                border: isToday ? '2px solid #1a73e8' : '1px solid #eee' // Highlight today
              }} 
              onClick={() => onDayClick(dateKey)}
            >
              <div style={calStyles.dayNumber}>{day}</div>
              
              {/* Show shift indicators using fetched data */}
              {dayShift.length > 0 && (
                <div style={{...calStyles.shiftIndicator, backgroundColor: '#34a853'}}>
                  Day: {dayShift.length}
                </div>
              )}
              {nightShift.length > 0 && (
                <div style={{...calStyles.shiftIndicator, backgroundColor: '#8a2be2', marginTop: '3px'}}>
                  Night: {nightShift.length}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

// --------------------------------------------------------------------------
// STYLES (Provided for completeness)
// --------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    backgroundColor: '#f4f7f6',
    padding: '40px',
  },
  center: {
    textAlign: 'center',
    paddingTop: '100px',
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  header: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '20px',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    marginBottom: '30px',
  },
  plannerButton: {
    padding: '10px 20px',
    backgroundColor: '#34a853',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  leaveButton: {
    padding: '10px 20px',
    backgroundColor: '#fbbc05',
    color: '#333',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#eee',
    color: '#333',
    border: '1px solid #ccc',
    borderRadius: '5px',
    cursor: 'pointer',
  },
};

const calStyles: Record<string, React.CSSProperties> = {
  calendarContainer: {
    fontFamily: 'Arial, sans-serif',
    border: '1px solid #ccc',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#1a73e8',
    color: 'white',
  },
  weekdays: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    backgroundColor: '#e6e6e6',
    fontWeight: 'bold',
    textAlign: 'center',
    padding: '10px 0',
  },
  weekdayCell: {
    padding: '5px',
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    borderTop: '1px solid #ccc',
  },
  dayCell: {
    minHeight: '100px',
    padding: '8px',
    border: '1px solid #eee',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    boxSizing: 'border-box',
    transition: 'background-color 0.2s',
  },
  emptyCell: {
    minHeight: '100px',
    border: '1px solid #eee',
    backgroundColor: '#f9f9f9',
  },
  dayNumber: {
    fontSize: '1.2em',
    fontWeight: 'bold',
    marginBottom: '5px',
    color: '#333',
  },
  shiftIndicator: {
    fontSize: '0.7em',
    padding: '3px 6px',
    borderRadius: '4px',
    color: 'white',
    lineHeight: 1,
  }
};