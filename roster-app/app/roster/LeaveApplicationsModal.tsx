
"use client";
import React, { useState, useEffect } from 'react';
import moment from 'moment-timezone';

interface LeaveApplicationsModalProps {
    isOpen: boolean;
    onClose: () => void;
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
}

export default function LeaveApplicationsModal({ isOpen, onClose }: LeaveApplicationsModalProps) {
    const [pendingLeaves, setPendingLeaves] = useState<PendingBlockLeave[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedLeaveIdToReject, setSelectedLeaveIdToReject] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");

    useEffect(() => {
        if (isOpen) {
            fetchPendingLeaves();
        }
    }, [isOpen]);

    const fetchPendingLeaves = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/block-leave/fetch-pending');
            const result = await response.json();
            if (result.success) {
                setPendingLeaves(result.data);
            } else {
                setError(result.message || "Failed to fetch pending leave applications.");
            }
        } catch (err) {
            console.error("Error fetching pending leaves:", err);
            setError("An unexpected error occurred while fetching pending leaves.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            const response = await fetch('/api/block-leave/approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id }),
            });
            const result = await response.json();
            if (result.success) {
                alert("Leave approved successfully!");
                fetchPendingLeaves(); // Refresh the list
            } else {
                alert(result.message || "Failed to approve leave.");
            }
        } catch (err) {
            console.error("Error approving leave:", err);
            alert("An error occurred while approving leave.");
        }
    };

    const handleReject = (id: string) => {
        setSelectedLeaveIdToReject(id);
        setShowRejectModal(true);
    };

    const confirmReject = async () => {
        if (!selectedLeaveIdToReject || !rejectionReason.trim()) {
            alert("Rejection reason is required.");
            return;
        }
        try {
            const response = await fetch('/api/block-leave/reject', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: selectedLeaveIdToReject, rejection_reason: rejectionReason }),
            });
            const result = await response.json();
            if (result.success) {
                alert("Leave rejected successfully!");
                setShowRejectModal(false);
                setRejectionReason("");
                setSelectedLeaveIdToReject(null);
                fetchPendingLeaves(); // Refresh the list
            } else {
                alert(result.message || "Failed to reject leave.");
            }
        } catch (err) {
            console.error("Error rejecting leave:", err);
            alert("An error occurred while rejecting leave.");
        }
    };

    if (!isOpen) return null;

    return (
        <div style={modalStyles.overlay}>
            <div style={modalStyles.modal}>
                <h2 style={modalStyles.header}>Pending Block/Advance Leave Applications</h2>
                <button onClick={onClose} style={modalStyles.closeButton}>X</button>

                {isLoading ? (
                    <p style={modalStyles.centerText}>Loading applications...</p>
                ) : error ? (
                    <p style={modalStyles.errorMessage}>{error}</p>
                ) : pendingLeaves.length === 0 ? (
                    <p style={modalStyles.centerText}>No pending leave applications.</p>
                ) : (
                    <div style={modalStyles.applicationsList}>
                        {pendingLeaves.map((leave) => (
                            <div key={leave._id} style={modalStyles.applicationItem}>
                                <p><strong>User ID:</strong> {leave.user_id}</p>
                                <p><strong>Type:</strong> {leave.leave_type.toUpperCase()}</p>
                                {leave.sub_leave_type && <p><strong>Sub Type:</strong> {leave.sub_leave_type}</p>}
                                <p><strong>Period:</strong> {moment(leave.start_date).format('DD/MM/YYYY')} - {moment(leave.end_date).format('DD/MM/YYYY')}</p>
                                {leave.remarks && <p><strong>Remarks:</strong> {leave.remarks}</p>}
                                <p><strong>Applied At:</strong> {moment(leave.applied_at).format('DD/MM/YYYY HH:mm')}</p>
                                <div style={modalStyles.actions}>
                                    <button onClick={() => handleApprove(leave._id)} style={modalStyles.approveButton}>Approve</button>
                                    <button onClick={() => handleReject(leave._id)} style={modalStyles.rejectButton}>Reject</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showRejectModal && (
                <div style={modalStyles.overlay}>
                    <div style={modalStyles.modal}>
                        <h2 style={modalStyles.header}>Reject Leave Application</h2>
                        <div style={modalStyles.formGroup}>
                            <label htmlFor="rejectionReason" style={modalStyles.label}>Reason for Rejection:</label>
                            <textarea
                                id="rejectionReason"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                style={{ ...modalStyles.input, height: '150px' }}
                                placeholder="Enter reason for rejection..."
                            />
                        </div>
                        <div style={modalStyles.buttonGroup}>
                            <button onClick={confirmReject} style={modalStyles.approveButton}>Confirm Reject</button>
                            <button onClick={() => { setShowRejectModal(false); setRejectionReason(""); setSelectedLeaveIdToReject(null); }} style={modalStyles.cancelButton}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
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
        padding: '40px',
        borderRadius: '10px',
        width: '90%',
        maxWidth: '800px',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
        color: '#fff',
        position: 'relative',
    },
    formGroup: {
        marginBottom: '20px', // Increased margin
    },
    label: {
        marginBottom: '8px', // Increased margin
        display: 'block',
        color: '#eee',
    },
    input: {
        width: '100%',
        padding: '12px',
        borderRadius: '5px',
        border: '1px solid #555',
        backgroundColor: '#3b3b3b',
        color: '#fff',
        boxSizing: 'border-box',
    },
    errorMessage: {
        color: '#ff4d4d',
        marginTop: '10px',
        textAlign: 'center',
    },
    warningMessage: {
        color: '#ffc107',
        marginTop: '10px',
        textAlign: 'center',
    },
    buttonGroup: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '20px',
        gap: '10px',
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
        marginBottom: '25px', // Adjusted to 25px
        color: '#fff',
    },
    applicationsList: {
        maxHeight: '70vh',
        overflowY: 'auto',
        paddingRight: '10px',
    },
    applicationItem: {
        backgroundColor: '#3b3b3b',
        padding: '18px', // Adjusted to 18px
        borderRadius: '8px',
        marginBottom: '18px', // Adjusted to 18px
        borderLeft: '5px solid #007bff',
    },
    actions: {
        marginTop: '15px',
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
    },
    approveButton: {
        padding: '10px 20px', // Adjusted to 10px 20px
        borderRadius: '5px',
        border: 'none',
        backgroundColor: '#28a745',
        color: 'white',
        cursor: 'pointer',
        fontSize: '1em',
    },
    rejectButton: {
        padding: '10px 20px', // Adjusted to 10px 20px
        borderRadius: '5px',
        border: 'none',
        backgroundColor: '#dc3545',
        color: 'white',
        cursor: 'pointer',
        fontSize: '1em',
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
