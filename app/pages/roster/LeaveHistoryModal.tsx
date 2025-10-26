// app/pages/roster/LeaveHistoryModal.tsx
"use client";
import React, { useState, useEffect } from 'react';

interface LeaveRequest {
    _id: string;
    user_id: string;
    date: string;
    leave_type: string;
    status: "Approved" | "Rejected" | "Pending";
}

interface Props {
    onClose: () => void;
    user: { user_id: string } | null;
}

const LeaveHistoryModal: React.FC<Props> = ({ onClose, user }) => {
    const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.user_id) {
            setError("User not logged in.");
            setIsLoading(false);
            return;
        }

        const fetchLeaveHistory = async () => {
            try {
                const res = await fetch(`/api/leave/fetch-user-history?userId=${user.user_id}`);
                const data = await res.json();

                if (data.success) {
                    setLeaveHistory(data.data);
                } else {
                    setError(data.message);
                }
            } catch (err) {
                console.error("Error fetching leave history:", err);
                setError("Failed to load leave history.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchLeaveHistory();
    }, [user]);

    if (isLoading) {
        return (
            <div style={modalStyles.overlay}>
                <div style={modalStyles.modal}>
                    <p>Loading leave history...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={modalStyles.overlay}>
                <div style={modalStyles.modal}>
                    <p>Error: {error}</p>
                    <button onClick={onClose} style={modalStyles.closeButton}>Close</button>
                </div>
            </div>
        );
    }

    return (
        <div style={modalStyles.overlay}>
            <div style={modalStyles.modal}>
                <h2 style={modalStyles.header}>Your Leave Request History</h2>
                {leaveHistory.length === 0 ? (
                    <p style={modalStyles.noHistory}>No leave requests found.</p>
                ) : (
                    <table style={modalStyles.table}>
                        <thead>
                            <tr>
                                <th style={modalStyles.th}>Date</th>
                                <th style={modalStyles.th}>Leave Type</th>
                                <th style={modalStyles.th}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaveHistory.map(leave => (
                                <tr key={leave._id}>
                                    <td style={modalStyles.td}>{new Date(leave.date).toLocaleDateString()}</td>
                                    <td style={modalStyles.td}>{leave.leave_type}</td>
                                    <td style={modalStyles.td}>{leave.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <button onClick={onClose} style={modalStyles.closeButton}>Close</button>
            </div>
        </div>
    );
};

const modalStyles: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modal: {
        backgroundColor: '#2c2c2c',
        padding: '30px',
        borderRadius: '12px',
        width: '600px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        color: '#fff',
    },
    header: {
        textAlign: 'center',
        marginBottom: '20px',
        color: '#fff',
    },
    noHistory: {
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
    closeButton: {
        display: 'block',
        width: '100%',
        padding: '10px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: '#555',
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '20px',
    },
};

export default LeaveHistoryModal;