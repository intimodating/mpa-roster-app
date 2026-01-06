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
type UserStatusMap = Record<string, string>;
type LeavesMap = Record<string, string[]>;

// --- MAIN COMPONENT ---
export default function RosterPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  
  // Roster state
  const [rosterData, setRosterData] = useState<RosterMap | UserStatusMap>({});
  const [leavesData, setLeavesData] = useState<LeavesMap>({});
  const [isPlanner, setIsPlanner] = useState(false);
  
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
    if (!user) return; 

    setIsLoading(true);

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

    const fetchRosterData = async () => {
      try {
        const res = await fetch(`/api/roster/fetch-month?startDate=${startDateStr}&endDate=${endDateStr}&userId=${user.user_id}`);
        const result = await res.json();

        if (result.success) {
          setIsPlanner(result.isPlanner);
          if (result.isPlanner) {
            setRosterData(result.data.roster);
            setLeavesData(result.data.leaves);
          } else {
            setRosterData(result.data);
            setLeavesData({});
          }
        } else {
          console.error("Month Fetch Failed:", result.message);
        }
      } catch (error) {
        console.error("Error during data fetch:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRosterData();
  }, [currentDate, user]);

  // --- HANDLERS ---
  
  const changeMonth = (delta: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const handleDayClick = (dateKey: string) => {
    if (isPlanner) {
        const rosterMap = rosterData as RosterMap;
        const existingData = rosterMap[dateKey];
        const leavesOnDay = leavesData[dateKey] || [];
        const dataForModal: ShiftData = {
            date: dateKey, 
            East: existingData?.East || { Morning: [], Afternoon: [], Night: [] },
            West: existingData?.West || { Morning: [], Afternoon: [], Night: [] },
            leaves: leavesOnDay
        };
        setSelectedShiftData(dataForModal);
        setIsModalOpen(true);
    }
    // For non-planners, do nothing on click, as the status is already visible on the calendar.
  };

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
      const res = await fetch('/api/roster/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roster }),
      });
      const data = await res.json();
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
        
        <div style={styles.buttonContainer}>
          {isPlanner && (
            <>
              <button style={styles.plannerButton} onClick={() => setIsGenerateRosterModalOpen(true)}>
                Generate Roster
              </button>
              <button style={styles.plannerButton} onClick={() => router.push('/leave-requests')}>
                Leave requests
              </button>
            </>
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

        <CalendarView
          currentDate={currentDate}
          changeMonth={changeMonth}
          rosterData={rosterData}
          leavesData={leavesData}
          onDayClick={handleDayClick}
          user={user}
          isPlanner={isPlanner}
        />
      </div>

      {isModalOpen && selectedShiftData && isPlanner && (
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
// CalendarView Component
// --------------------------------------------------------------------------

interface CalendarProps {
  currentDate: Date;
  changeMonth: (delta: number) => void;
  rosterData: RosterMap | UserStatusMap;
  leavesData: LeavesMap;
  onDayClick: (dateKey: string) => void;
  user: UserData | null;
  isPlanner: boolean;
}

const CalendarView: React.FC<CalendarProps> = React.memo(({ currentDate, changeMonth, rosterData, leavesData, onDayClick, user, isPlanner }) => {
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDateString = new Date().toISOString().split('T')[0];

  const calendarDays: (number | null)[] = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
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

          const date = new Date(year, month, day);
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const isToday = dateKey === todayDateString;

          if (isPlanner) {
            const plannerRoster = rosterData as RosterMap;
            const shiftsEast = plannerRoster[dateKey]?.East || { Morning: [], Afternoon: [], Night: [] };
            const shiftsWest = plannerRoster[dateKey]?.West || { Morning: [], Afternoon: [], Night: [] };
            const totalMorningShift = shiftsEast.Morning.length + shiftsWest.Morning.length;
            const totalAfternoonShift = shiftsEast.Afternoon.length + shiftsWest.Afternoon.length;
            const totalNightShift = shiftsEast.Night.length + shiftsWest.Night.length;
            const hasShift = totalMorningShift > 0 || totalAfternoonShift > 0 || totalNightShift > 0;
            const leavesOnDay = leavesData[dateKey] || [];

            return (
              <div
                key={dateKey}
                style={{
                  ...calStyles.dayCell,
                  cursor: 'pointer',
                  backgroundColor: hasShift ? '#2E4034' : '#3b3b3b',
                  border: isToday ? '2px solid #1a73e8' : '1px solid #555'
                }}
                onClick={() => onDayClick(dateKey)}
              >
                <div style={calStyles.dayNumber}>{day}</div>
                {leavesOnDay.length > 0 && (
                  <div style={{...calStyles.shiftIndicator, backgroundColor: '#FFD700', color: 'black'}}>
                    Leave: {leavesOnDay.length}
                  </div>
                )}
                {totalMorningShift > 0 && <div style={{...calStyles.shiftIndicator, backgroundColor: '#34a853', marginTop: '3px'}}>Morning: {totalMorningShift}</div>}
                {totalAfternoonShift > 0 && <div style={{...calStyles.shiftIndicator, backgroundColor: '#4285F4', marginTop: '3px'}}>Afternoon: {totalAfternoonShift}</div>}
                {totalNightShift > 0 && <div style={{...calStyles.shiftIndicator, backgroundColor: '#8a2be2', marginTop: '3px'}}>Night: {totalNightShift}</div>}
              </div>
            );
          } else { // Non-Planner view
            const userStatusMap = rosterData as UserStatusMap;
            const status = userStatusMap[dateKey];
            const isLeave = status === 'On Leave';

            return (
              <div
                key={dateKey}
                style={{
                  ...calStyles.dayCell,
                  cursor: 'default',
                  backgroundColor: status ? '#2E4034' : '#3b3b3b',
                  border: isToday ? '2px solid #1a73e8' : '1px solid #555'
                }}
              >
                <div style={calStyles.dayNumber}>{day}</div>
                {status && (
                  <div style={{...calStyles.shiftIndicator, backgroundColor: isLeave ? '#FFD700' : '#dc3545', color: isLeave ? 'black' : 'white'}}>
                    {status}
                  </div>
                )}
              </div>
            );
          }
        })}
      </div>
    </div>
  );
});
CalendarView.displayName = 'CalendarView';

// --------------------------------------------------------------------------
// STYLES
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
    fontSize: '0.9em',
    padding: '4px 8px',
    borderRadius: '4px',
    color: 'white',
    lineHeight: 1.2,
    width: '100%',
    textAlign: 'center',
    boxSizing: 'border-box',
  }
};