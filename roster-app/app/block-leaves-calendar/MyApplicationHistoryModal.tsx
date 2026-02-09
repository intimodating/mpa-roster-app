"use client";
import React, { useState, useEffect } from 'react';
import moment from 'moment-timezone';

interface MyApplicationHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

interface ApprovedBlockLeave {
    _id: string;
    user_id: string;
    date: string; // ISO string
    leave_type: "block" | "advance";
    sub_leave_type?: string;
    status: "approved";
}

interface PendingBlockLeave {
    _id: string;
    user_id: string;
    start_date: string; // ISO string
    end_date: string; // ISO string
    leave_type: "block" | "advance";
    sub_leave_type?: string;
    remarks?: string;
    applied_at: string; // ISO string
    status: "pending";
}

interface RejectedBlockLeave {
    _id: string;
    user_id: string;
    start_date: string; // ISO string
    end_date: string; // ISO string
    leave_type: "block" | "advance";
    sub_leave_type?: string;
    remarks?: string;
    applied_at: string; // ISO string // Should be original applied_at
    rejection_reason: string;
    rejected_at: string; // ISO string
    status: "rejected";
}

type LeaveEntry = ApprovedBlockLeave | PendingBlockLeave | RejectedBlockLeave;

export default function MyApplicationHistoryModal({ isOpen, onClose, userId }: MyApplicationHistoryModalProps) {
    const [history, setHistory] = useState<LeaveEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && userId) {
            fetchMyLeaveHistory();
        }
    }, [isOpen, userId]);

    const fetchMyLeaveHistory = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [approvedRes, pendingRes, rejectedRes] = await Promise.all([
                fetch(`/api/block-leave/fetch-approved-user?user_id=${userId}`), // Need to create this API
                fetch(`/api/block-leave/fetch-pending-user?user_id=${userId}`), // Need to create this API
                fetch(`/api/block-leave/fetch-rejected-user?user_id=${userId}`)
            ]);

            const approvedData = await approvedRes.json();
            const pendingData = await pendingRes.json();
            const rejectedData = await rejectedRes.json();

            let combinedHistory: LeaveEntry[] = [];

            if (approvedData.success) {
                // Approved leaves are stored per day, group them into periods
                const groupedApproved = groupApprovedLeavesByPeriod(approvedData.data);
                combinedHistory = combinedHistory.concat(groupedApproved.map(leave => ({ ...leave, status: "approved" as const })));
            }
            if (pendingData.success) {
                combinedHistory = combinedHistory.concat(pendingData.data.map((leave: any) => ({ ...leave, status: "pending" as const })));
            }
            if (rejectedData.success) {
                combinedHistory = combinedHistory.concat(rejectedData.data.map((leave: any) => ({ ...leave, status: "rejected" as const })));
            }

            // Sort by applied_at or start_date
            combinedHistory.sort((a, b) => {
                const dateA = ('applied_at' in a && a.applied_at) ? moment(a.applied_at) : moment(a.start_date);
                const dateB = ('applied_at' in b && b.applied_at) ? moment(b.applied_at) : moment(b.start_date);
                return dateB.diff(dateA); // Newest first
            });

            setHistory(combinedHistory);

        } catch (err) {
            console.error("Error fetching leave history:", err);
            setError("An unexpected error occurred while fetching your leave history.");
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to group approved leaves into periods
    const groupApprovedLeavesByPeriod = (leaves: ApprovedBlockLeave[]) => {
        const grouped: { [key: string]: { start_date: string, end_date: string, leave_type: "block" | "advance", sub_leave_type?: string, applied_at: string, _id: string } } = {};

        leaves.forEach(leaf => {
            const key = `${leaf.user_id}-${leaf.leave_type}-${leaf.sub_leave_type || 'no-sub'}-${leaf.applied_at}`; // Group by these
            if (!grouped[key]) {
                grouped[key] = {
                    _id: leaf._id, // Take first ID, or generate a new one if needed
                    start_date: leaf.date,
                    end_date: leaf.date,
                    leave_type: leaf.leave_type,
                    sub_leave_type: leaf.sub_leave_type,
                    applied_at: leaf.applied_at, // Assuming applied_at is consistent for grouped leaves
                };
            } else {
                if (moment(leaf.date).isBefore(grouped[key].start_date)) {
                    grouped[key].start_date = leaf.date;
                }
                if (moment(leaf.date).isAfter(grouped[key].end_date)) {
                    grouped[key].end_date = leaf.date;
                }
            }
        });

        return Object.values(grouped).map((group: any) => {
            // Ensure proper applied_at for approved leaves (as it's in daily entries)
            // For now, let's assume if it exists in any, it's fine.
            // In a real system, approved leaves would likely track original applied_at from pending.
            return {
                ...group,
                applied_at: leaves.find(l => l._id === group._id)?.applied_at || moment(group.start_date).toISOString(), // Fallback
            };
        });
    };


    if (!isOpen) return null;

    return (
        <div style={modalStyles.overlay}>
            <div style={modalStyles.modal}>
                <h2 style={modalStyles.header}>My Leave Application History</h2>
                <button onClick={onClose} style={modalStyles.closeButton}>X</button>

                {isLoading ? (
                    <p style={modalStyles.centerText}>Loading history...</p>
                ) : error ? (
                    <p style={modalStyles.errorMessage}>{error}</p>
                ) : history.length === 0 ? (
                    <p style={modalStyles.centerText}>No leave applications found.</p>
                ) : (
                    <div style={modalStyles.applicationsList}>
                        {history.map((leave) => (
                            <div key={leave._id} style={{ ...modalStyles.applicationItem, borderLeftColor: leave.status === 'approved' ? '#4CAF50' : leave.status === 'pending' ? '#ffc107' : '#f44336' }}>
                                <p><strong>Status:</strong> {leave.status.toUpperCase()}</p>
                                <p><strong>Type:</strong> {leave.leave_type.toUpperCase()}</p>
                                {'sub_leave_type' in leave && leave.sub_leave_type && <p><strong>Sub Type:</strong> {leave.sub_leave_type}</p>}
                                <p><strong>Period:</strong> {moment('start_date' in leave ? leave.start_date : leave.date).format('DD/MM/YYYY')} - {moment('end_date' in leave ? leave.end_date : leave.date).format('DD/MM/YYYY')}</p>
                                {'remarks' in leave && leave.remarks && <p><strong>Remarks:</strong> {leave.remarks}</p>}
                                {'rejection_reason' in leave && leave.rejection_reason && <p><strong>Rejection Reason:</strong> {leave.rejection_reason}</p>}
                                <p><strong>Applied At:</strong> {moment(leave.applied_at).format('DD/MM/YYYY HH:mm')}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const modalStyles: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    modal: {
        backgroundColor: '#2c2c2c',
        padding: '30px',
        borderRadius: '10px',
        width: '90%',
        maxWidth: '800px',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
        color: '#fff',
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'none',
        border: 'none',
        fontSize: '1.2em',
        color: '#fff',
        cursor: 'pointer',
    },
    header: {
        textAlign: 'center',
        marginBottom: '20px',
        color: '#fff',
    },
    applicationsList: {
        maxHeight: '70vh',
        overflowY: 'auto',
        paddingRight: '10px',
    },
    applicationItem: {
        backgroundColor: '#3b3b3b',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '15px',
        borderLeft: '5px solid #007bff',
    },
    errorMessage: {
        color: '#ff4d4d',
        textAlign: 'center',
    },
    centerText: {
        textAlign: 'center',
        color: '#eee',
    }
};
