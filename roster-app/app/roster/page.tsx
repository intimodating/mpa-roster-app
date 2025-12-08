"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
// Ensure this import path is correct for your project structure
import ShiftEditorModal from './ShiftEditorModal';
import ShiftViewerModal from './ShiftViewerModal';
import LeaveApplicationModal from './LeaveApplicationModal';
import GenerateRosterModal from './GenerateRosterModal';
import LeaveHistoryModal from './LeaveHistoryModal';


// --- INTERFACES ---
interface UserData {
  name: string;
  user_id: string;
  account_type: "Planner" | "Non-Planner" | string;
}

interface ShiftDetails {
  Morning: string[];
  Afternoon: string[];
  Night: string[];
}

export interface ShiftData { // Added export
    date: string; // YYYY-MM-DD
    East: ShiftDetails;
    West: ShiftDetails;
    leaves?: string[]; // Optional: user_ids of people on leave
}

// RosterMap is a map of dateKey ('YYYY-MM-DD') to ShiftData
export type RosterMap = Record<string, ShiftData>; // Added export

// --- MAIN COMPONENT ---
export default function RosterPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  
  // Roster state: Stores fetched shifts for the entire visible calendar range
  const [rosterData, setRosterData] = useState<RosterMap>({});
  const [approvedLeaveDates, setApprovedLeaveDates] = useState<string[]>([]);
  const [allApprovedLeaves, setAllApprovedLeaves] = useState<Record<string, string[]>>({});
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isGenerateRosterModalOpen, setIsGenerateRosterModalOpen] = useState(false);
  const [isLeaveHistoryModalOpen, setIsLeaveHistoryModalOpen] = useState(false);
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
  useEffect(() => {
    // Only fetch if user data is loaded
    if (!user) return; 

    setIsLoading(true);

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

    const fetchAllData = async () => {
      try {
        const rosterPromise = fetch(`/api/roster/fetch-month?startDate=${startDateStr}&endDate=${endDateStr}`).then(res => res.json());
        
        const approvedLeavesPromise = user?.account_type === "Non-Planner"
          ? fetch(`/api/leave/fetch-approved-user?userId=${user.user_id}&startDate=${startDateStr}&endDate=${endDateStr}`).then(res => res.json())
          : Promise.resolve({ success: true, data: [] }); // Resolve immediately if not Non-Planner

        const allApprovedLeavesPromise = user?.account_type === "Planner"
          ? fetch(`/api/leave/fetch-approved-all?startDate=${startDateStr}&endDate=${endDateStr}`).then(res => res.json())
          : Promise.resolve({ success: true, data: {} }); // Resolve immediately if not Planner

        const [rosterResult, approvedLeavesResult, allApprovedLeavesResult] = await Promise.all([
          rosterPromise,
          approvedLeavesPromise,
          allApprovedLeavesPromise
        ]);

        if (rosterResult.success) {
          setRosterData(rosterResult.data);
        } else {
          console.error("Month Fetch Failed:", rosterResult.message);
        }

        if (approvedLeavesResult.success) {
          setApprovedLeaveDates(approvedLeavesResult.data);
        } else {
          console.error("Fetch Approved Leaves Failed:", approvedLeavesResult.message);
        }

        if (allApprovedLeavesResult.success) {
          setAllApprovedLeaves(allApprovedLeavesResult.data);
        } else {
          console.error("Fetch All Approved Leaves Failed:", allApprovedLeavesResult.message);
        }

      } catch (error) {
        console.error("Error during data fetch:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();

  }, [currentDate, user]); // Re-run when month changes or user loads

  // --- HANDLERS ---
  
  const changeMonth = (delta: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  /**
   * Prepares shift data for the modal using the data already fetched for the month.
   * @param dateKey The date in 'YYYY-MM-DD' format.
   */
  const handleDayClick = (dateKey: string) => {
    const existingData = rosterData[dateKey];
    const leavesOnDay = allApprovedLeaves[dateKey] || [];
    const dataForModal: ShiftData = {
        date: dateKey, 
        East: existingData?.East || { Morning: [], Afternoon: [], Night: [] },
        West: existingData?.West || { Morning: [], Afternoon: [], Night: [] },
        leaves: leavesOnDay // Add leaves information here
    };

    setSelectedShiftData(dataForModal);

    if (user?.account_type === "Planner") {
        setIsModalOpen(true);
    } else {
        setIsViewerModalOpen(true);
    }
  };

  /**
   * Saves changes via the API and updates local state upon success.
   * This function will need to be updated to handle the new roster structure.
   * For now, it's a placeholder.
   */
  const handleSaveShifts = async (updatedData: ShiftData) => {
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

      setRosterData(prev => ({ ...prev, [updatedData.date]: updatedData }));
      setIsModalOpen(false);
      
    } catch (error) {
        console.error("API Call Error:", error);
        alert("An error occurred while saving the roster.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRoster = async (roster: RosterMap) => {
    setIsLoading(true);
    try {
      console.log("Roster object being sent to approve API:", roster);

      const res = await fetch('/api/roster/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roster }),
      });

      const data = await res.json();

      if (data.logs) {
        console.log("Approve API logs:", data.logs);
      }

      if (data.success) {
        alert('Roster approved and saved successfully!');
        
        const newRosterData: RosterMap = {};
        for (const date in roster) {
          newRosterData[date] = {
            East: roster[date].East,
            West: roster[date].West,
            date: date,
          };
        }
        
        console.log("New roster data for local state:", newRosterData);
        setRosterData(prev => ({ ...prev, ...newRosterData }));
      } else {
        alert(`Failed to approve roster: ${data.message}`);
      }
    } catch (error) {
      console.error("Error approving roster:", error);
      alert('Failed to approve roster.');
    } finally {
      setIsGenerateRosterModalOpen(false);
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
            <button style={styles.plannerButton} onClick={() => setIsGenerateRosterModalOpen(true)}>
              Generate Roster
            </button>
          )}

          {user.account_type === "Planner" && (
            <button style={styles.plannerButton} onClick={() => router.push('/leave-requests')}>
              Leave requests
            </button>
          )}
          
          <button style={styles.leaveButton} onClick={() => setIsLeaveModalOpen(true)}>
            Apply Leave
          </button>

          <button style={styles.leaveButton} onClick={() => setIsLeaveHistoryModalOpen(true)}>
            Leave Request History
          </button>

          <button style={styles.backButton} onClick={() => router.push('/home')}>
            Back to Home
          </button>
        </div>

        {/* CALENDAR VIEW */}
        <CalendarView
          currentDate={currentDate}
          changeMonth={changeMonth}
          rosterData={rosterData}
          onDayClick={handleDayClick}
          user={user}
          approvedLeaveDates={approvedLeaveDates}
          allApprovedLeaves={allApprovedLeaves}
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

      {isViewerModalOpen && selectedShiftData && (
        <ShiftViewerModal
          shiftData={selectedShiftData}
          onClose={() => setIsViewerModalOpen(false)}
        />
      )}

      {isLeaveModalOpen && (
        <LeaveApplicationModal
          onClose={() => setIsLeaveModalOpen(false)}
        />
      )}

      {isGenerateRosterModalOpen && (
        <GenerateRosterModal
          onClose={() => setIsGenerateRosterModalOpen(false)}
          onApprove={handleApproveRoster}
        />
      )}

      {isLeaveHistoryModalOpen && (
        <LeaveHistoryModal
          onClose={() => setIsLeaveHistoryModalOpen(false)}
          user={user}
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
  user: UserData | null;
  approvedLeaveDates: string[];
  allApprovedLeaves: Record<string, string[]>;
}

const CalendarView: React.FC<CalendarProps> = React.memo(({ currentDate, changeMonth, rosterData, onDayClick, user, approvedLeaveDates, allApprovedLeaves }) => {
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

          // Format the date key (e.g., 'YYYY-MM-DD')
          const date = new Date(year, month, day);
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          const dateKey = `${yyyy}-${mm}-${dd}`;
          
          const shiftsEast = rosterData[dateKey]?.East || { Morning: [], Afternoon: [], Night: [] };
          const shiftsWest = rosterData[dateKey]?.West || { Morning: [], Afternoon: [], Night: [] };

          const totalMorningShift = shiftsEast.Morning.length + shiftsWest.Morning.length;
          const totalAfternoonShift = shiftsEast.Afternoon.length + shiftsWest.Afternoon.length;
          const totalNightShift = shiftsEast.Night.length + shiftsWest.Night.length;

          const hasShift = totalMorningShift > 0 || totalAfternoonShift > 0 || totalNightShift > 0;
          const isToday = dateKey === todayDateString;

          const isUserOnMorningShift = user?.account_type === 'Non-Planner' && (shiftsEast.Morning.includes(user.user_id) || shiftsWest.Morning.includes(user.user_id));
          const isUserOnAfternoonShift = user?.account_type === 'Non-Planner' && (shiftsEast.Afternoon.includes(user.user_id) || shiftsWest.Afternoon.includes(user.user_id));
          const isUserOnNightShift = user?.account_type === 'Non-Planner' && (shiftsEast.Night.includes(user.user_id) || shiftsWest.Night.includes(user.user_id));
          const _isUserOnShift = isUserOnMorningShift || isUserOnAfternoonShift || isUserOnNightShift;

          const morningText = isUserOnMorningShift ? 'You' : totalMorningShift;
          const afternoonText = isUserOnAfternoonShift ? 'You' : totalAfternoonShift;
          const nightText = isUserOnNightShift ? 'You' : totalNightShift;
          const isUserOnLeave = approvedLeaveDates.includes(dateKey);
          
          return (
            <div
              key={dateKey}
              style={{
                ...calStyles.dayCell,
                cursor: 'pointer',
                backgroundColor: hasShift ? '#2E4034' : '#3b3b3b',
                border: isToday ? '2px solid #1a73e8' : '1px solid #555' // Highlight today
              }}
              onClick={() => onDayClick(dateKey)}
            >
              <div style={calStyles.dayNumber}>{day}</div>
              
              {isUserOnLeave && (
                <div style={{...calStyles.shiftIndicator, backgroundColor: '#FFD700', color: 'black'}}>
                  On Leave
                </div>
              )}                        
              {user?.account_type === "Planner" && (allApprovedLeaves[dateKey]?.length > 0) && (
                <div style={{...calStyles.shiftIndicator, backgroundColor: '#FFD700', color: 'black'}}>
                  Leave: {allApprovedLeaves[dateKey].length}
                </div>
              )}
              
              {/* Show shift indicators using fetched data */}
              {totalMorningShift > 0 && (
                <div style={{...calStyles.shiftIndicator, backgroundColor: isUserOnMorningShift ? 'red' : '#34a853'}}>
                  Morning: {morningText}
                </div>
              )} 
              {totalAfternoonShift > 0 && (
                <div style={{...calStyles.shiftIndicator, backgroundColor: isUserOnAfternoonShift ? 'red' : '#4285F4', marginTop: '3px'}}>
                  Afternoon: {afternoonText}
                </div>
              )}
              {totalNightShift > 0 && (
                <div style={{...calStyles.shiftIndicator, backgroundColor: isUserOnNightShift ? 'red' : '#8a2be2', marginTop: '3px'}}>
                  Night: {nightText}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
CalendarView.displayName = 'CalendarView';

// --------------------------------------------------------------------------
// STYLES (Provided for completeness)
// --------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    backgroundColor: '#121212',
    color: '#fff',
    padding: '40px',
  },
  center: {
    textAlign: 'center',
    paddingTop: '100px',
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    backgroundColor: '#2c2c2c',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  header: {
    textAlign: 'center',
    color: '#fff',
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
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    color: 'white',
    backgroundImage: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
  },
  leaveButton: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#4285F4', // Google Blue
  },
  backButton: {
    padding: '10px 20px',
    border: '1px solid #555',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    backgroundColor: 'transparent',
    color: '#fff',
  },
};

const calStyles: Record<string, React.CSSProperties> = {
  calendarContainer: {
    fontFamily: 'Arial, sans-serif',
    border: '1px solid #555',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#3b3b3b',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#2c2c2c',
    color: 'white',
  },
  weekdays: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    backgroundColor: '#2c2c2c',
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
  },
  dayCell: {
    minHeight: '100px',
    padding: '8px',
    border: '1px solid #555',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    boxSizing: 'border-box',
    transition: 'background-color 0.2s',
  },
  emptyCell: {
    minHeight: '100px',
    border: '1px solid #555',
    backgroundColor: '#2c2c2c',
  },
  dayNumber: {
    fontSize: '1.2em',
    fontWeight: 'bold',
    marginBottom: '5px',
    color: '#fff',
  },
  shiftIndicator: {
    fontSize: '0.7em',
    padding: '3px 6px',
    borderRadius: '4px',
    color: 'white',
    lineHeight: 1,
  }
};