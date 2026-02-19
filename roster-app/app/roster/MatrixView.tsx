"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { RosterMap, ShiftData } from './page'; // Assuming these types are exported from page.tsx
import LeaveDetailsModal from './LeaveDetailsModal';

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
  const [isLeaveDetailsModalOpen, setIsLeaveDetailsModalOpen] = useState(false);
  const [selectedLeaveDetails, setSelectedLeaveDetails] = useState<any>(null);
  const [selectedLeaveUserName, setSelectedLeaveUserName] = useState<string>('');

  // Generate an array of day numbers for the current month
  const daysOfMonth = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const handleCellClick = async (targetUser: UserData, day: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const leaveForUserOnDay = leavesData[dateKey]?.find(leave => leave.user_id === targetUser.user_id);
    const isOnLeave = !!leaveForUserOnDay;

    if (isOnLeave) {
      try {
        // No need to fetch again, as we already have leaveForUserOnDay
        if (leaveForUserOnDay) {
            setSelectedLeaveDetails(leaveForUserOnDay);
            setSelectedLeaveUserName(targetUser.name);
            setIsLeaveDetailsModalOpen(true);
        } else {
            console.warn("Leave details not found for this user and date.");
        }
      } catch (error) {
        console.error("Error fetching leave history:", error);
      }
    }
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

                    let backgroundColor = matrixStyles.td.backgroundColor;
                    if (isOnLeave) {
                      backgroundColor = leaveForUserOnDay?.sub_leave_type ? 'orange' : 'blue';
                    }

                    const shifts: string[] = [];
                    const dayRoster = rosterData[dateKey];

                    if (dayRoster) {
                      // Check East shifts
                      if (dayRoster.East.Morning.includes(user.user_id)) shifts.push('1');
                      if (dayRoster.East.Afternoon.includes(user.user_id)) shifts.push('2');
                      if (dayRoster.East.Night.includes(user.user_id)) shifts.push('3');
                      // Check West shifts
                      if (dayRoster.West.Morning.includes(user.user_id)) shifts.push('1');
                      if (dayRoster.West.Afternoon.includes(user.user_id)) shifts.push('2');
                      if (dayRoster.West.Night.includes(user.user_id)) shifts.push('3');
                    }
                    
                    const cellContent = isOnLeave ? 'L' : [...new Set(shifts)].join(',') || '';

                    return (
                      <td
                        key={dateKey}
                        style={{
                          ...matrixStyles.td,
                          cursor: isOnLeave ? 'pointer' : 'default',
                          backgroundColor: backgroundColor,
                        }}
                        onClick={() => {
                          if (isOnLeave) {
                            handleCellClick(user, day);
                          }
                        }}
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

      {isLeaveDetailsModalOpen && selectedLeaveDetails && (
        <LeaveDetailsModal
          leaveDetails={selectedLeaveDetails}
          userName={selectedLeaveUserName}
          onClose={() => setIsLeaveDetailsModalOpen(false)}
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
