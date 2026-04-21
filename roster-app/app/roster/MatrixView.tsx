"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { RosterMap, ShiftData } from './page'; // Assuming these types are exported from page.tsx
import LeaveDetailsModal from './LeaveDetailsModal';
import ShiftDetailsModal from './ShiftDetailsModal';

// --- CONSTANTS ---
const CONSOLE_MAPPING: Record<string, string> = {
  "East Control": "EC", "West Control": "WC", "Keppel": "KP", "Cruisebay": "CB",
  "VTIS East": "VE", "VTIS West": "VW", "VTIS Central": "VC", "Sembawang Control": "SB",
  "Jurong Control": "JP", "Pasir Panjang Control": "PP", "VTIS MTC": "VM", "Proactive": "PA",
  "Pasir Panjang MTC": "PM", "Sembawang MTC": "SM", "PSU": "PS", "Temasek MTC": "TM",
  "GMDSS": "GD", "STW (PB)": "SPB", "STW (TU)": "STU",
  "Vista DO/ Sensitive Vessels": "VDO", "Changi DO": "CDO", "Watch IC Console": "W"
};

const LEAVE_CODES: Record<string, string> = {
  "Annual leave": "ANN", "Medical leave": "SCK", "Hospitalisation Leave": "HPL",
  "Parental Leave": "SPL", "Advance Leave": "ADL", "Block Leave": "BL",
  "Annual Leave": "ANN", "Birthday Time off": "BDL", "Childcare Leave": "CCL",
  "Compassionate Leave": "COM", "Earned Public Holiday": "EPH", "Family Care Leave": "FCL",
  "Hospitalization Leave": "HPL", "Marriage Leave": "MAR", "Maternity Leave": "MAT",
  "Medical Leave": "SCK", "NMC (No medical certificate)": "NMC", "Paternity Leave": "PAT",
  "Shared Parental Leave": "SPL", "Pilgrimage Leave": "PIL", "Study / Exam Leave": "STY",
  "Reservist leave": "RSL"
};

// --- INTERFACES ---
interface UserData {
  name: string;
  user_id: string;
  account_type: "Planner" | "Non-Planner" | string;
}

interface MatrixViewProps {
  currentDate: Date;
  rosterData: RosterMap; // RosterMap is for planner view, so assuming this is always RosterMap here.
  leavesData: Record<string, { user_id: string; leave_type: string; sub_leave_type?: string }[]>;
  user: UserData | null;
  isPlanner: boolean;
  changeMonth: (delta: number) => void; // Add changeMonth prop
}

const MatrixView: React.FC<MatrixViewProps> = React.memo(({ currentDate, rosterData, leavesData, user, isPlanner, changeMonth }) => {
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const [nonPlannerUsers, setNonPlannerUsers] = useState<UserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  
  // Modals state
  const [isLeaveDetailsModalOpen, setIsLeaveDetailsModalOpen] = useState(false);
  const [selectedLeaveDetails, setSelectedLeaveDetails] = useState<any>(null);
  const [selectedLeaveUserName, setSelectedLeaveUserName] = useState<string>('');

  const [isShiftDetailsModalOpen, setIsShiftDetailsModalOpen] = useState(false);
  const [selectedShiftDetails, setSelectedShiftDetails] = useState<any[]>([]);
  const [selectedShiftUserName, setSelectedShiftUserName] = useState<string>('');
  const [selectedShiftDate, setSelectedShiftDate] = useState<string>('');

  // Generate an array of day numbers for the current month
  const daysOfMonth = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const handleCellClick = async (targetUser: UserData, day: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Check for leaves first
    const leaveForUserOnDay = leavesData[dateKey]?.find(leave => leave.user_id === targetUser.user_id);
    if (leaveForUserOnDay) {
        setSelectedLeaveDetails(leaveForUserOnDay);
        setSelectedLeaveUserName(targetUser.name);
        setIsLeaveDetailsModalOpen(true);
        return;
    }

    // Otherwise show shift details
    const dayRoster = rosterData[dateKey];
    const details: any[] = [];

    if (dayRoster) {
        const checkShifts = (location: 'East' | 'West') => {
            const locData = dayRoster[location];
            ['Morning', 'Afternoon', 'Night'].forEach(type => {
                const workers = locData[type as keyof typeof locData];
                const found = workers.find(w => w.user_id === targetUser.user_id);
                if (found) {
                    details.push({
                        location,
                        type,
                        console: found.assigned_console,
                        isOjt: !!found.is_ojt
                    });
                }
            });
        };
        checkShifts('East');
        checkShifts('West');
    }

    setSelectedShiftDetails(details);
    setSelectedShiftUserName(targetUser.name);
    setSelectedShiftDate(dateKey);
    setIsShiftDetailsModalOpen(true);
  };

  // Fetch all users and filter for non-planners
  useEffect(() => {
            const fetchUsers = async () => {
              try {
                const response = await fetch('/api/users/all');
                const result = await response.json();
                console.log("API response for /api/users/all:", result); // Log the raw API response
    
                if (result.success) {
                  const nonPlanners = result.data.filter((u: UserData) => u.account_type === 'Non-Planner'); // result.data contains the users
                  console.log("Filtered non-planner users:", nonPlanners); // Log filtered users
                  setNonPlannerUsers(nonPlanners);
                } else {
                  console.error("Failed to fetch users:", result.message);
                }
              } catch (error) {
                console.error("Error fetching users:", error);
              } finally {
                setIsLoadingUsers(false);
              }
            };
    fetchUsers();
  }, [currentDate]); // Rerun effect when currentDate changes

  if (isLoadingUsers) {
    return <div style={matrixStyles.center}>Loading users for matrix view...</div>;
  }

  if (!isPlanner) {
    return <div style={matrixStyles.center}>This view is only available for Planners.</div>;
  }

  return (
    <div style={matrixStyles.matrixContainer}>
      <div style={matrixStyles.calendarHeader}>
        <button style={matrixStyles.monthNavigationButton} onClick={() => changeMonth(-1)}>&lt;</button>
        <h2 style={matrixStyles.matrixHeader}>Roster for {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
        <button style={matrixStyles.monthNavigationButton} onClick={() => changeMonth(1)}>&gt;</button>
      </div>
      <div style={matrixStyles.tableWrapper}>
        <table style={matrixStyles.table}>
          <thead>
            <tr>
              <th style={matrixStyles.th}>Non-Planner</th>
              {daysOfMonth.map(day => (
                <th key={day} style={matrixStyles.th}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nonPlannerUsers.length > 0 ? (
              nonPlannerUsers.map(user => (
                <tr key={user.user_id}>
                  <td style={matrixStyles.td}>{user.name}</td>
                  {daysOfMonth.map(day => {
                    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const leaveForUserOnDay = leavesData[dateKey]?.find(leave => leave.user_id === user.user_id);
                    const isOnLeave = !!leaveForUserOnDay;

                    const shifts: string[] = [];
                    const dayRoster = rosterData[dateKey];

                    if (dayRoster) {
                      const getUserShift = (assignments: any[], userId: string, label: string) => {
                        const found = assignments.find(w => w.user_id === userId);
                        if (!found) return null;
                        if (found.assigned_console === 'OFF') return '0';
                        if (found.assigned_console === 'Reserve') return `R${label}`;
                        
                        const consoleCode = found.assigned_console ? CONSOLE_MAPPING[found.assigned_console] : null;
                        let code = consoleCode ? `${consoleCode}${label}` : label;
                        if (found.is_ojt) {
                          code = `O${code}`;
                        }
                        return code;
                      };

                      // Check all possible assignments
                      const possibleShifts = [
                        getUserShift(dayRoster.East.Morning, user.user_id, '1'),
                        getUserShift(dayRoster.West.Morning, user.user_id, '1'),
                        getUserShift(dayRoster.East.Afternoon, user.user_id, '2'),
                        getUserShift(dayRoster.West.Afternoon, user.user_id, '2'),
                        getUserShift(dayRoster.East.Night, user.user_id, '3'),
                        getUserShift(dayRoster.West.Night, user.user_id, '3'),
                      ];

                      possibleShifts.forEach(s => { if (s) shifts.push(s); });
                    }

                    let backgroundColor = matrixStyles.td.backgroundColor;
                    const uniqueShifts = [...new Set(shifts)];
                    const isOjt = uniqueShifts.some(s => s.startsWith('O'));
                    const isReserve = uniqueShifts.some(s => s.startsWith('R'));
                    const isOff = !isOnLeave && (uniqueShifts.length === 0 || (uniqueShifts.length === 1 && uniqueShifts[0] === '0'));

                    if (isOnLeave) {
                      backgroundColor = 'blue';
                    } else if (isOjt) {
                      backgroundColor = '#4b0082'; // Indigo/Purple for OJT
                    } else if (isReserve) {
                      backgroundColor = '#B8860B'; // Darker Gold for Reserve
                    } else if (isOff) {
                      backgroundColor = '#8B0000'; // Dark Red for Off
                    }
                    
                    const cellContent = isOnLeave 
                      ? (LEAVE_CODES[leaveForUserOnDay?.sub_leave_type || leaveForUserOnDay?.leave_type || ''] || 'L') 
                      : (uniqueShifts.length > 0 ? uniqueShifts.filter(s => s !== '0' || uniqueShifts.length === 1).join(',') : '0');

                    return (
                      <td
                        key={dateKey}
                        style={{
                          ...matrixStyles.td,
                          cursor: 'pointer',
                          backgroundColor: backgroundColor,
                        }}
                        onClick={() => handleCellClick(user, day)}
                      >
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={daysInMonth + 1} style={matrixStyles.td}>No Non-Planner users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={matrixStyles.legend}>
        <h4 style={{ margin: '0 0 10px 0' }}>Legend:</h4>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={matrixStyles.legendItem}><span style={{ ...matrixStyles.legendBox, backgroundColor: '#1e1e1e' }}></span> Normal Shift (e.g., EC1, WC2 or 1, 2, 3)</div>
          <div style={matrixStyles.legendItem}><span style={{ ...matrixStyles.legendBox, backgroundColor: '#4b0082' }}></span> OJT Shift (e.g., OEC1, OWC2 or O1, O2, O3)</div>
          <div style={matrixStyles.legendItem}><span style={{ ...matrixStyles.legendBox, backgroundColor: '#B8860B' }}></span> Reserve (e.g., R1, R2, R3)</div>
          <div style={matrixStyles.legendItem}><span style={{ ...matrixStyles.legendBox, backgroundColor: 'blue' }}></span> Leave (e.g., ANN, SCK, HPL)</div>
          <div style={matrixStyles.legendItem}><span style={{ ...matrixStyles.legendBox, backgroundColor: '#8B0000' }}></span> Off Day (0)</div>
        </div>
      </div>

      {isLeaveDetailsModalOpen && selectedLeaveDetails && (
        <LeaveDetailsModal
          leaveDetails={selectedLeaveDetails}
          userName={selectedLeaveUserName}
          onClose={() => setIsLeaveDetailsModalOpen(false)}
        />
      )}

      {isShiftDetailsModalOpen && (
        <ShiftDetailsModal
            date={selectedShiftDate}
            userName={selectedShiftUserName}
            shifts={selectedShiftDetails}
            onClose={() => setIsShiftDetailsModalOpen(false)}
        />
      )}
    </div>
  );
});

MatrixView.displayName = 'MatrixView';

// --- STYLES ---
const matrixStyles: Record<string, React.CSSProperties> = {
  matrixContainer: {
    fontFamily: 'Arial, sans-serif',
    border: '1px solid #555',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#3b3b3b',
    color: '#fff',
    padding: '20px',
  },
  center: {
    textAlign: 'center',
    padding: '20px',
  },
  calendarHeader: { // Changed from 'header'
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#2c2c2c',
    color: 'white',
    marginBottom: '20px',
    borderRadius: '8px',
  },
  matrixHeader: { // New style for the H2
    margin: 0,
    color: '#fff',
  },
  monthNavigationButton: { // New style for buttons
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '8px 15px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '1em',
    transition: 'background-color 0.2s',
  },
  tableWrapper: {
    overflowX: 'auto', // Enable horizontal scrolling for the table
    maxHeight: '600px', // Limit height for vertical scrolling
    overflowY: 'auto',
  },
  legend: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#2c2c2c',
    borderRadius: '8px',
    border: '1px solid #555',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.9em',
    color: '#eee',
  },
  legendBox: {
    width: '16px',
    height: '16px',
    marginRight: '8px',
    border: '1px solid #555',
    borderRadius: '3px',
    display: 'inline-block',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '800px', // Ensure table doesn't get too small on narrow screens
  },
  th: {
    border: '1px solid #555',
    padding: '10px',
    backgroundColor: '#2c2c2c',
    textAlign: 'left',
    position: 'sticky', // Make header row sticky
    top: 0,
    zIndex: 10,
  },
  td: {
    border: '1px solid #555',
    padding: '10px',
    backgroundColor: '#1e1e1e',
    textAlign: 'left',
  },
};

export default MatrixView;
