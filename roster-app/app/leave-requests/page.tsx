// app/leave-requests/page.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ShiftReplacementModal from '../roster/ShiftReplacementModal'; // Import the new modal

interface LeaveRequest {
    _id: string;
    user_id: string;
    date: string;
    leave_type: string;
    status: "Approved" | "Rejected" | "Pending";
    shift?: "Morning" | "Afternoon" | "Night" | "No";
}

export default function LeaveRequestsPage() {
    const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // State for the new modal
    const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);

    useEffect(() => {
        const fetchAndProcessLeaves = async () => {
            try {
                const res = await fetch('/api/leave/fetch-pending');
                const data = await res.json();

                if (!data.success) {
                    setError(data.message);
                    setIsLoading(false);
                    return;
                }

                const leaves: LeaveRequest[] = data.data;

                const leavesWithShifts = await Promise.all(
                    leaves.map(async (leave) => {
                        const datePart = leave.date.split('T')[0];
                        const rosterRes = await fetch(`/api/roster/fetch/${datePart}`);
                        
                        if (!rosterRes.ok) {
                            if (rosterRes.status === 404) {
                                return { ...leave, shift: "No" as const };
                            }
                            console.error(`Failed to fetch roster for ${datePart}: ${rosterRes.statusText}`);
                            return { ...leave, shift: "No" as const };
                        }

                        const rosterData = await rosterRes.json();
                        
                        let shift: LeaveRequest['shift'] = "No";

                        if (rosterData.success && rosterData.data) {
                            const { East, West } = rosterData.data;
                            const userId = leave.user_id;

                            if (East?.Morning?.includes(userId) || West?.Morning?.includes(userId)) {
                                shift = "Morning";
                            } else if (East?.Afternoon?.includes(userId) || West?.Afternoon?.includes(userId)) {
                                shift = "Afternoon";
                            } else if (East?.Night?.includes(userId) || West?.Night?.includes(userId)) {
                                shift = "Night";
                            }
                        }
                        
                        return { ...leave, shift };
                    })
                );

                setPendingLeaves(leavesWithShifts);

            } catch (err) {
                console.error("Error fetching or processing leave data:", err);
                setError("Failed to load leave requests and shift data.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndProcessLeaves();
    }, []);

    const handleAction = async (id: string, action: "approve" | "reject") => {
        try {
            const res = await fetch(`/api/leave/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const data = await res.json();

            if (data.success) {
                alert(data.message);
                setPendingLeaves(prev => prev.filter(leave => leave._id !== id));
            } else {
                alert(`Failed to ${action} leave: ${data.message}`);
            }
        } catch (err) {
            console.error(`Error ${action}ing leave:`, err);
            alert(`An error occurred while ${action}ing the leave request.`);
        }
    };

    const handleApproveClick = (leave: LeaveRequest) => {
        if (leave.shift === "No" || !leave.shift) {
            handleAction(leave._id, 'approve');
        } else {
            setSelectedLeave(leave);
            setIsReplacementModalOpen(true);
        }
    };

    const handleReplacementSuccess = (leaveId: string) => {
        setPendingLeaves(prev => prev.filter(leave => leave._id !== leaveId));
    };

    if (isLoading) {
        return <div style={styles.center}>Loading leave requests...</div>;
    }

    if (error) {
        return <div style={styles.center}>Error: {error}</div>;
    }

    return (
        <>
            <div style={styles.root}>
                <div style={styles.container}>
                    <h1 style={styles.header}>Pending Leave Requests</h1>
                    <button style={styles.backButton} onClick={() => router.push('/roster')}>
                        Back to Roster
                    </button>
                    {pendingLeaves.length === 0 ? (
                        <p style={styles.noRequests}>No pending leave requests.</p>
                    ) : (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>User ID</th>
                                    <th style={styles.th}>Date</th>
                                    <th style={styles.th}>Leave Type</th>
                                    <th style={styles.th}>On Shift?</th>
                                    <th style={styles.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingLeaves.map(leave => (
                                    <tr key={leave._id}>
                                        <td style={styles.td}>{leave.user_id}</td>
                                        <td style={styles.td}>{new Date(leave.date).toLocaleDateString()}</td>
                                        <td style={styles.td}>{leave.leave_type}</td>
                                        <td style={styles.td}>{leave.shift || 'N/A'}</td>
                                        <td style={styles.td}>
                                            <button
                                                style={{ ...styles.actionButton, backgroundColor: '#34a853' }}
                                                onClick={() => handleApproveClick(leave)}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                style={{ ...styles.actionButton, backgroundColor: '#ea4335', marginLeft: '10px' }}
                                                onClick={() => handleAction(leave._id, 'reject')}
                                            >
                                                Reject
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {isReplacementModalOpen && (
                <ShiftReplacementModal
                    leave={selectedLeave}
                    onClose={() => setIsReplacementModalOpen(false)}
                    onReplacementSuccess={handleReplacementSuccess}
                />
            )}
        </>
    );
}

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
        maxWidth: '900px',
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
    backButton: {
        padding: '10px 20px',
        border: '1px solid #555',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        backgroundColor: 'transparent',
        color: '#fff',
        marginBottom: '20px',
    },
    noRequests: {
        textAlign: 'center',
        color: '#ccc',
        marginTop: '20px',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '20px',
    },
    th: {
        backgroundColor: '#3b3b3b',
        padding: '12px',
        textAlign: 'left',
        borderBottom: '1px solid #555',
    },
    td: {
        padding: '12px',
        borderBottom: '1px solid #444',
        verticalAlign: 'middle',
    },
    actionButton: {
        padding: '8px 15px',
        border: 'none',
        borderRadius: '6px',
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
    },
};