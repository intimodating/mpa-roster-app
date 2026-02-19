
"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '../../lib/session';
import Link from 'next/link';
import moment from 'moment-timezone';
import ApplyBlockAdvanceLeaveModal from '../roster/ApplyBlockAdvanceLeaveModal';
import LeaveApplicationsModal from '../roster/LeaveApplicationsModal';
import MyApplicationHistoryModal from './MyApplicationHistoryModal';

// Interfaces for data
interface UserData {
    _id: string;
    user_id: string;
    name: string;
    account_type: string;
}

interface ApprovedBlockLeave {
    _id: string;
    user_id: string;
    date: string; // ISO string
    leave_type: "block" | "advance";
    sub_leave_type?: string;
}

interface PendingBlockLeave {
    _id: string;
    user_id: string;
    start_date: string; // ISO string
    end_date: string; // ISO string
    leave_type: "block" | "advance";
    sub_leave_type?: string;
    remarks?: string;
}

interface RejectedBlockLeave {
    _id: string;
    user_id: string;
    start_date: string; // ISO string
    end_date: string; // ISO string
    leave_type: "block" | "advance";
    sub_leave_type?: string;
    remarks?: string;
    rejection_reason: string;
    rejected_at: string; // ISO string
}

// Helper to get days in a month, now in UTC
const getDaysInMonth = (year: number, month: number) => {
    const startDate = moment.utc([year, month]);
    const daysInMonth = startDate.daysInMonth();
    const days = [];
    for (let i = 0; i < daysInMonth; i++) {
        days.push(startDate.clone().add(i, 'days').toDate());
    }
    return days;
};

export default function BlockLeavesCalendarPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // Use moment.utc() to track the current month and year
    const [currentMonth, setCurrentMonth] = useState(moment.utc().month());
    const [currentYear, setCurrentYear] = useState(moment.utc().year());
    const [allUsers, setAllUsers] = useState<UserData[]>([]);
    const [approvedLeaves, setApprovedLeaves] = useState<ApprovedBlockLeave[]>([]);
    const [pendingLeaves, setPendingLeaves] = useState<PendingBlockLeave[]>([]);
    const [rejectedLeaves, setRejectedLeaves] = useState<RejectedBlockLeave[]>([]);
    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [leaveApplicationsModalOpen, setLeaveApplicationsModalOpen] = useState(false);
    const [myHistoryModalOpen, setMyHistoryModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('calendar');

    const fetchAllLeaves = useCallback(async (year: number, month: number, userId: string | null) => {
        try {
            const monthStr = String(month + 1).padStart(2, '0');

            // Fetch approved leaves from the new route
            const approvedRes = await fetch(`/api/leave/fetch-approved-block-advance-month?year=${year}&month=${monthStr}`);
            const approvedData = await approvedRes.json();
            if (approvedData.success) {
                setApprovedLeaves(approvedData.data);
            }

            // Fetch pending leaves
            const pendingRes = await fetch(`/api/block-leave/fetch-pending-month?year=${year}&month=${monthStr}`);
            const pendingData = await pendingRes.json();
            if (pendingData.success) {
                setPendingLeaves(pendingData.data);
            }

            // Fetch rejected leaves for the current user if not a Planner
            if (userId) { // Only fetch rejected for a specific user
                const rejectedRes = await fetch(`/api/block-leave/fetch-rejected-user?user_id=${userId}`);
                const rejectedData = await rejectedRes.json();
                if (rejectedData.success) {
                    // Filter rejected leaves that fall within the current month/year view
                    const startOfMonth = moment.utc([year, month, 1]);
                    const endOfMonth = moment.utc([year, month, 1]).endOf('month');

                    const filteredRejected = rejectedData.data.filter((leave: RejectedBlockLeave) => {
                        const leaveStart = moment.utc(leave.start_date);
                        const leaveEnd = moment.utc(leave.end_date);
                        // Check if leave period overlaps with the current month
                        return (leaveStart.isSameOrBefore(endOfMonth, 'day') && leaveEnd.isSameOrAfter(startOfMonth, 'day'));
                    });
                    setRejectedLeaves(filteredRejected);
                }
            }
        } catch (error) {
            console.error("Failed to fetch leaves:", error);
        }
    }, []);

    useEffect(() => {
        const fetchSessionAndData = async () => {
            setIsLoading(true);
            const sessionUser = getSession();
            if (!sessionUser) {
                router.push('/');
                return;
            }
            setUser(sessionUser);

            if (sessionUser.account_type === 'Planner') {
                try {
                    const usersRes = await fetch('/api/users/all');
                    const usersData = await usersRes.json();
                    if (usersData.success) {
                        setAllUsers(usersData.data.filter((u: UserData) => u.account_type !== 'Planner'));
                    }
                } catch (error) {
                    console.error("Failed to fetch users:", error);
                }
            } else {
                setAllUsers([sessionUser]);
            }
            
            await fetchAllLeaves(currentYear, currentMonth, sessionUser.account_type === 'Planner' ? null : sessionUser.user_id);

            setIsLoading(false);
        };
        fetchSessionAndData();
    }, [router, currentMonth, currentYear, fetchAllLeaves]);

    const handleMonthChange = (direction: 'prev' | 'next') => {
        const currentMoment = moment.utc([currentYear, currentMonth]);
        if (direction === 'prev') {
            currentMoment.subtract(1, 'month');
        } else {
            currentMoment.add(1, 'month');
        }
        setCurrentYear(currentMoment.year());
        setCurrentMonth(currentMoment.month());
    };
    
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);

    const summaryData = useMemo(() => {
        if (user?.account_type !== 'Planner') return null;

        const summary: Record<string, Record<string, number>> = {};
        daysInMonth.forEach(day => {
            const dayStr = moment.utc(day).format('YYYY-MM-DD');
            summary[dayStr] = { approved_block: 0, approved_advance: 0, pending_block: 0, pending_advance: 0, rejected_block: 0, rejected_advance: 0 };
        });

        approvedLeaves.forEach(leave => {
            const dayStr = moment.utc(leave.date).format('YYYY-MM-DD');
            if (summary[dayStr]) {
                if (leave.leave_type === 'block') summary[dayStr].approved_block++;
                else summary[dayStr].approved_advance++;
            }
        });

        pendingLeaves.forEach(leave => {
            for (let d = moment.utc(leave.start_date); d.isSameOrBefore(moment.utc(leave.end_date)); d.add(1, 'days')) {
                const dayStr = d.format('YYYY-MM-DD');
                if (summary[dayStr]) {
                    if (leave.leave_type === 'block') summary[dayStr].pending_block++;
                    else summary[dayStr].pending_advance++;
                }
            }
        });

        rejectedLeaves.forEach(leave => {
            for (let d = moment.utc(leave.start_date); d.isSameOrBefore(moment.utc(leave.end_date)); d.add(1, 'days')) {
                const dayStr = d.format('YYYY-MM-DD');
                if (summary[dayStr]) {
                    if (leave.leave_type === 'block') summary[dayStr].rejected_block++;
                    else summary[dayStr].rejected_advance++;
                }
            }
        });

        return summary;
    }, [approvedLeaves, pendingLeaves, daysInMonth, user]);

    if (isLoading || !user) {
        return <div style={styles.center}>Loading...</div>;
    }
    
    const calendarRowStyle = {
        display: 'grid',
        gridTemplateColumns: `150px repeat(${daysInMonth.length}, minmax(40px, 1fr))`,
        borderBottom: '1px solid #333',
    };
    const calendarHeaderRowStyle = { ...calendarRowStyle, backgroundColor: '#3a3a3a', padding: '10px 0', borderBottom: '1px solid #444' };

    const renderCalendarView = () => (
        <div style={styles.calendarGrid}>
            <div style={calendarHeaderRowStyle}>
                <div style={styles.calendarHeaderCell}>Employee</div>
                {daysInMonth.map(day => (
                    <div key={day.toISOString()} style={styles.calendarHeaderCell}>
                        {moment.utc(day).format('DD')}
                    </div>
                ))}
            </div>
            {allUsers.map(emp => (
                <div key={emp.user_id} style={calendarRowStyle}>
                    <div style={styles.calendarCell}>{emp.name}</div>
                    {daysInMonth.map(day => {
                        let leaveStatus = null;
                        let rejectionReason = '';
                        // Use moment.utc() for all comparisons
                        const approved = approvedLeaves.find(
                            leave => leave.user_id === emp.user_id && moment.utc(leave.date).isSame(moment.utc(day), 'day')
                        );
                        if (approved) {
                            leaveStatus = { status: 'approved', type: approved.leave_type };
                        } else {
                            const pending = pendingLeaves.find(
                                leave => leave.user_id === emp.user_id && moment.utc(day).isBetween(moment.utc(leave.start_date), moment.utc(leave.end_date), undefined, '[]')
                            );
                            if (pending) {
                                leaveStatus = { status: 'pending', type: pending.leave_type };
                            } else {
                                const rejected = rejectedLeaves.find(
                                    leave => leave.user_id === emp.user_id && moment.utc(day).isBetween(moment.utc(leave.start_date), moment.utc(leave.end_date), undefined, '[]')
                                );
                                if (rejected) {
                                    leaveStatus = { status: 'rejected', type: rejected.leave_type };
                                    rejectionReason = rejected.rejection_reason;
                                }
                            }
                        }

                        const backgroundColor = leaveStatus?.status === 'approved' ? '#4CAF50' : leaveStatus?.status === 'pending' ? '#ffc107' : leaveStatus?.status === 'rejected' ? '#f44336' : '#3c3c3c';
                        let cellText = '';
                        if (leaveStatus) {
                            const initial = leave_type_initial(leaveStatus.type);
                            cellText = leaveStatus.status === 'pending' ? `P${initial}` : leaveStatus.status === 'rejected' ? `R${initial}` : initial;
                        }

                        return (
                            <div key={day.toISOString()} style={{ ...styles.calendarCell, backgroundColor }} title={rejectionReason}>
                                {cellText}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );

    const renderSummaryView = () => {
        const summaryRows = [
            { key: 'approved_block', label: 'Approved: Block Leave' },
            { key: 'approved_advance', label: 'Approved: Advance Leave' },
            { key: 'pending_block', label: 'Pending: Block Leave' },
            { key: 'pending_advance', label: 'Pending: Advance Leave' },
            { key: 'rejected_block', label: 'Rejected: Block Leave' },
            { key: 'rejected_advance', label: 'Rejected: Advance Leave' },
        ];
        return (
            <div style={styles.calendarGrid}>
                <div style={calendarHeaderRowStyle}>
                    <div style={styles.calendarHeaderCell}>Leave Type</div>
                    {daysInMonth.map(day => (
                        <div key={day.toISOString()} style={styles.calendarHeaderCell}>
                            {moment.utc(day).format('DD')}
                        </div>
                    ))}
                </div>
                {summaryRows.map(row => (
                    <div key={row.key} style={calendarRowStyle}>
                        <div style={styles.calendarCell}>{row.label}</div>
                        {daysInMonth.map(day => {
                            const dayStr = moment.utc(day).format('YYYY-MM-DD');
                            const count = summaryData?.[dayStr]?.[row.key] ?? 0;
                            return (
                                <div key={day.toISOString()} style={{...styles.calendarCell, backgroundColor: count > 0 ? '#5a5a5a' : '#3c3c3c' }}>
                                    {count > 0 ? count : ''}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={styles.root}>
            <div style={styles.container}>
                <h1 style={styles.header}>Block Leaves - {moment.utc([currentYear, currentMonth]).format('MMMM YYYY')}</h1>

                <div style={styles.monthNavigation}>
                    <button onClick={() => handleMonthChange('prev')} style={styles.navButton}>&lt; Prev</button>
                    <span>{moment.utc([currentYear, currentMonth]).format('MMMM YYYY')}</span>
                    <button onClick={() => handleMonthChange('next')} style={styles.navButton}>Next &gt;</button>
                </div>

                {user.account_type === 'Planner' && (
                    <div style={styles.tabs}>
                        <button onClick={() => setActiveTab('calendar')} style={activeTab === 'calendar' ? styles.activeTab : styles.tab}>Calendar View</button>
                        <button onClick={() => setActiveTab('summary')} style={activeTab === 'summary' ? styles.activeTab : styles.tab}>Summary View</button>
                    </div>
                )}
                
                <div style={styles.actionsContainer}>
                    {user.account_type !== "Planner" && (
                        <>
                            <button style={styles.actionButton} onClick={() => setApplyModalOpen(true)}>
                                Apply Block / Advance Leave
                            </button>
                            <button style={styles.actionButton} onClick={() => setMyHistoryModalOpen(true)}>
                                My Application History
                            </button>
                        </>
                    )}
                    {user.account_type === "Planner" && (
                        <button style={styles.actionButton} onClick={() => setLeaveApplicationsModalOpen(true)}>
                            Leave Applications
                        </button>
                    )}
                    <Link href="/home" passHref>
                        <button style={styles.backButton}>Back to Home</button>
                    </Link>
                </div>

                {user.account_type === 'Planner' ? (activeTab === 'calendar' ? renderCalendarView() : renderSummaryView()) : renderCalendarView()}
                
                {applyModalOpen && user && (
                    <ApplyBlockAdvanceLeaveModal
                        isOpen={applyModalOpen}
                        onClose={() => setApplyModalOpen(false)}
                        onSuccess={() => {
                            fetchAllLeaves(currentYear, currentMonth, user.account_type === 'Planner' ? null : user.user_id);
                            setApplyModalOpen(false);
                        }}
                        userId={user.user_id}
                    />
                )}

                {myHistoryModalOpen && user && (
                    <MyApplicationHistoryModal
                        isOpen={myHistoryModalOpen}
                        onClose={() => setMyHistoryModalOpen(false)}
                        userId={user.user_id}
                    />
                )}

                {leaveApplicationsModalOpen && (
                    <LeaveApplicationsModal
                        isOpen={leaveApplicationsModalOpen}
                        onClose={() => setLeaveApplicationsModalOpen(false)}
                        onLeaveActionSuccess={() => fetchAllLeaves(currentYear, currentMonth, user.account_type === 'Planner' ? null : user.user_id)}
                    />
                )}
            </div>
        </div>
    );
}

const leave_type_initial = (leaveType: "block" | "advance" | undefined) => {
    if (!leaveType) return '';
    return leaveType === 'block' ? 'B' : 'A';
};

const styles: Record<string, React.CSSProperties> = {
    root: {
        minHeight: '100vh',
        backgroundColor: '#121212',
        color: '#fff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
    },
    container: {
        textAlign: 'center',
        padding: '40px',
        maxWidth: '1200px',
        width: '100%',
        backgroundColor: '#2c2c2c',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    },
    header: {
        fontSize: '2em',
        color: '#fff',
        marginBottom: '20px',
    },
    monthNavigation: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '20px',
        gap: '15px',
        fontSize: '1.2em',
    },
    navButton: {
        padding: '8px 15px',
        border: 'none',
        borderRadius: '5px',
        backgroundColor: '#007bff',
        color: 'white',
        cursor: 'pointer',
        fontSize: '1em',
    },
    actionsContainer: {
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
    },
    actionButton: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: '#28a745',
        fontSize: '1em',
    },
    backButton: {
        padding: '10px 20px',
        border: '1px solid #555',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        backgroundColor: 'transparent',
        color: '#fff',
        fontSize: '1em',
    },
    calendarGrid: {
        display: 'grid',
        border: '1px solid #444',
        borderRadius: '8px',
        overflowX: 'auto',
    },
    calendarHeaderCell: {
        fontWeight: 'bold',
        padding: '8px',
        borderRight: '1px solid #444',
        textAlign: 'center',
    },
    calendarCell: {
        padding: '8px',
        borderRight: '1px solid #333',
        minWidth: '40px',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.8em',
    },
    center: {
        textAlign: 'center',
        padding: '100px',
        fontSize: '1.2em',
        color: '#fff',
    },
    tabs: {
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
    },
    tab: {
        padding: '10px 20px',
        fontSize: '1em',
        cursor: 'pointer',
        border: '1px solid #555',
        backgroundColor: 'transparent',
        color: '#fff',
        borderRadius: '8px',
    },
    activeTab: {
        padding: '10px 20px',
        fontSize: '1em',
        cursor: 'pointer',
        border: '1px solid #007bff',
        backgroundColor: '#007bff',
        color: '#fff',
        borderRadius: '8px',
    }
};
