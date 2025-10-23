// app/pages/roster/page.tsx
"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ShiftEditorModal from './ShiftEditorModal'; 
import Link from 'next/link';

// --- INTERFACES (UNCHANGED) ---
interface UserData {
    name: string;
    user_id: string; // <-- This is the ID we'll use for checking assignments
    account_type: "Planner" | "Non-Planner" | string;
}

interface ShiftData {
    date: string; // YYYY-MM-DD
    dayShiftEmployees: string[];
    nightShiftEmployees: string[];
}

type RosterMap = Record<string, ShiftData>;

// --- MAIN COMPONENT ---
export default function RosterPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const [rosterData, setRosterData] = useState<RosterMap>({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedShiftData, setSelectedShiftData] = useState<ShiftData | null>(null);

    // ... (AUTHENTICATION CHECK, DATA FETCH FUNCTION, changeMonth handler - UNCHANGED) ...

    useEffect(() => {
        const storedUser = localStorage.getItem('loggedInUser');
        if (!storedUser) {
            router.push('/');
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
    }, [router]);
    
    // Use useCallback to memoize the function, preventing infinite loops in useEffect
    const fetchRosterData = useCallback(async () => {
        // ... (fetch logic UNCHANGED) ...
        if (!user) return; 

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstOfMonth = new Date(year, month, 1);
        const startDayOfWeek = firstOfMonth.getDay(); 
        const startDate = new Date(firstOfMonth);
        startDate.setDate(firstOfMonth.getDate() - startDayOfWeek);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 42); 

        const startDateStr = startDate.toISOString().split('T')[0] + 'T00:00:00.000Z';
        const endDateStr = endDate.toISOString().split('T')[0] + 'T00:00:00.000Z';

        setIsLoading(true);
        try {
            const res = await fetch(`/api/roster/fetch-month?startDate=${startDateStr}&endDate=${endDateStr}`);
            const result = await res.json();

            if (result.success) {
                setRosterData(result.data);
            } else {
                console.error("Month Fetch Failed:", result.message);
            }
        } catch (error) {
            console.error("Error during month fetch:", error);
        } finally {
            setIsLoading(false);
        }
    }, [currentDate, user]); 

    useEffect(() => {
        fetchRosterData();
    }, [fetchRosterData]); 

    const changeMonth = (delta: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    };


    /**
     * Handles a day click. Non-Planners can click to see details, but cannot edit.
     * Planners click to open the editor modal.
     */
    const handleDayClick = (dateKey: string) => {
        // Get data from local state (already fetched for the month)
        const existingData = rosterData[dateKey];
        
        // Prepare the data structure for the modal (empty arrays if no shifts found)
        const baseData: ShiftData = existingData 
            ? { 
                date: dateKey,
                dayShiftEmployees: existingData.dayShiftEmployees, 
                nightShiftEmployees: existingData.nightShiftEmployees 
              }
            : { 
                date: dateKey, 
                dayShiftEmployees: [], 
                nightShiftEmployees: [] 
              };
        
        // 🛑 Non-Planner Logic: Just alert them they can't edit
        if (user?.account_type !== "Planner") {
            alert(`Shift details for ${dateKey}:\n\nDay Shift: ${baseData.dayShiftEmployees.join(', ') || 'None'}\nNight Shift: ${baseData.nightShiftEmployees.join(', ') || 'None'}\n\nOnly Planners can edit the roster.`);
            return;
        }

        // Planner Logic: Open the modal for editing
        setSelectedShiftData(baseData);
        setIsModalOpen(true);
    };

    const handleSaveShifts = async (updatedData: ShiftData) => {
        // ... (handleSaveShifts logic UNCHANGED) ...
        setIsLoading(true);
        try {
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

            await fetchRosterData(); 
            
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
    
    // ... (rest of the return statement UNCHANGED) ...

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
                    // 🛑 PASS USER ID AND ACCOUNT TYPE
                    currentUserId={user.user_id}
                    isPlanner={user.account_type === "Planner"}
                />
            </div>
            
            {/* MODAL (Only opens for Planners) */}
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
    currentUserId: string;
    isPlanner: boolean;
}

const CalendarView: React.FC<CalendarProps> = React.memo(({ currentDate, changeMonth, rosterData, onDayClick, currentUserId, isPlanner }) => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayDateString = new Date().toISOString().split('T')[0];
    
    // Normalize the current user's ID for case-insensitive checking
    const normalizedUserId = currentUserId.toUpperCase();

    // 🛑 FIX 1: Define calendarDays using useMemo
    const calendarDays: (number | null)[] = useMemo(() => {
        const days: (number | null)[] = [];
        const daysBefore = new Date(year, month, 0).getDate(); // Days in the previous month
        
        // Add days from the previous month to fill the first week
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            days.push(daysBefore - i);
        }
        
        // Add days of the current month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }
        
        // Add days from the next month to fill the grid (42 cells total for 6 weeks)
        const totalCells = 42;
        const remainingCells = totalCells - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            days.push(null);
        }
        return days;
    }, [firstDayOfMonth, daysInMonth, year, month]);

    // 🛑 FIX 2: Define getDateKey helper function
    const getDateKey = (day: number | null, index: number): string => {
        if (day === null) return '';
        
        let targetMonth = month;
        let targetYear = year;
        
        const isPreviousMonth = index < firstDayOfMonth;
        const isNextMonth = index >= firstDayOfMonth + daysInMonth;
        
        // Adjust month/year for previous/next month days shown in the grid
        if (isPreviousMonth) {
            targetMonth = month - 1;
            if (targetMonth < 0) { targetMonth = 11; targetYear--; }
        } else if (isNextMonth) {
            targetMonth = month + 1;
            if (targetMonth > 11) { targetMonth = 0; targetYear++; }
        }
        
        // Create date object and format as YYYY-MM-DD
        const date = new Date(targetYear, targetMonth, day);
        return date.toISOString().split('T')[0];
    };

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
                {calendarDays.map((day, index) => { // <-- Now calendarDays is defined
                    if (day === null) {
                        return <div key={index} style={calStyles.emptyCell}></div>;
                    }

                    const dateKey = getDateKey(day, index); // <-- Now getDateKey is defined
                    
                    const shiftData = rosterData[dateKey];
                    // Convert all IDs to uppercase for reliable checking
                    const dayShift = shiftData?.dayShiftEmployees.map(id => id.toUpperCase()) || [];
                    const nightShift = shiftData?.nightShiftEmployees.map(id => id.toUpperCase()) || [];
                    
                    const hasDayShift = dayShift.length > 0;
                    const hasNightShift = nightShift.length > 0;

                    // CHECK ASSIGNMENT STATUS
                    const isAssignedDay = dayShift.includes(normalizedUserId);
                    const isAssignedNight = nightShift.includes(normalizedUserId);
                    const isUserAssigned = isAssignedDay || isAssignedNight;

                    const isToday = dateKey === todayDateString;
                    const isCurrentMonth = index >= firstDayOfMonth && index < firstDayOfMonth + daysInMonth;

                    return (
                        <div 
                            key={index}
                            style={{ 
                                ...calStyles.dayCell, 
                                cursor: 'pointer', 
                                backgroundColor: isUserAssigned ? '#e8f5e9' : (hasDayShift || hasNightShift ? '#f0fff0' : '#fff'),
                                border: isToday ? '2px solid #1a73e8' : '1px solid #eee',
                                opacity: isCurrentMonth ? 1 : 0.5 
                            }} 
                            onClick={() => onDayClick(dateKey)}
                        >
                            <div style={calStyles.dayNumber}>{day}</div>
                            
                            {/* DAY SHIFT INDICATOR */}
                            {(isPlanner || isAssignedDay) && hasDayShift && (
                                <div style={{
                                    ...calStyles.shiftIndicator, 
                                    backgroundColor: isAssignedDay ? '#388e3c' : '#34a853'
                                }}>
                                    Day: {isPlanner ? dayShift.length : 'You'} 
                                </div>
                            )}
                            
                            {/* NIGHT SHIFT INDICATOR */}
                            {(isPlanner || isAssignedNight) && hasNightShift && (
                                <div style={{
                                    ...calStyles.shiftIndicator, 
                                    marginTop: '3px', 
                                    backgroundColor: isAssignedNight ? '#7b1fa2' : '#8a2be2'
                                }}>
                                    Night: {isPlanner ? nightShift.length : 'You'}
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