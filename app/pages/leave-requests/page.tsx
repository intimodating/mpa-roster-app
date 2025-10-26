// app/pages/leave-requests/page.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface LeaveRequest {
    _id: string;
    user_id: string;
    date: string;
    leave_type: string;
    status: "Approved" | "Rejected" | "Pending";
}

export default function LeaveRequestsPage() {
    const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchPendingLeaves = async () => {
            try {
                const res = await fetch('/api/leave/fetch-pending');
                const data = await res.json();

                if (data.success) {
                    setPendingLeaves(data.data);
                } else {
                    setError(data.message);
                }
            } catch (err) {
                console.error("Error fetching pending leaves:", err);
                setError("Failed to load leave requests.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchPendingLeaves();
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
                // Remove the processed leave from the list
                setPendingLeaves(prev => prev.filter(leave => leave._id !== id));
            } else {
                alert(`Failed to ${action} leave: ${data.message}`);
            }
        } catch (err) {
            console.error(`Error ${action}ing leave:`, err);
            alert(`An error occurred while ${action}ing the leave request.`);
        }
    };

    if (isLoading) {
        return <div style={styles.center}>Loading leave requests...</div>;
    }

    if (error) {
        return <div style={styles.center}>Error: {error}</div>;
    }

    return (
        <div style={styles.root}>
            <div style={styles.container}>
                <h1 style={styles.header}>Pending Leave Requests</h1>
                <button style={styles.backButton} onClick={() => router.push('/pages/roster')}>
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
                                <th style={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingLeaves.map(leave => (
                                <tr key={leave._id}>
                                    <td style={styles.td}>{leave.user_id}</td>
                                    <td style={styles.td}>{new Date(leave.date).toLocaleDateString()}</td>
                                    <td style={styles.td}>{leave.leave_type}</td>
                                    <td style={styles.td}>
                                        <button
                                            style={{ ...styles.actionButton, backgroundColor: '#34a853' }}
                                            onClick={() => handleAction(leave._id, 'approve')}
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