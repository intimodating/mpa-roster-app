
"use client";
import React, { useState } from 'react';
import moment from 'moment-timezone';

interface ApplyBlockAdvanceLeaveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userId: string;
}

export default function ApplyBlockAdvanceLeaveModal({ isOpen, onClose, onSuccess, userId }: ApplyBlockAdvanceLeaveModalProps) {
    const [leaveType, setLeaveType] = useState<"block" | "advance">("block");
    const [subLeaveType, setSubLeaveType] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [remarks, setRemarks] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const subLeaveTypes = [
        "Annual Leave",
        "Birthday Time off",
        "Childcare Leave",
        "Compassionate Leave",
        "Earned Public Holiday",
        "Family Care Leave",
        "Hospitalization Leave",
        "Marriage Leave",
        "Maternity Leave",
        "Medical Leave",
        "NMC (No medical certificate)",
        "Paternity Leave",
        "Shared Parental Leave",
        "Pilgrimage Leave",
        "Study / Exam Leave",
        "Reservist leave",
    ];

    if (!isOpen) return null;

    const calculateLeaveDays = () => {
        if (!startDate || !endDate) return 0;
        const start = moment(startDate);
        const end = moment(endDate);
        if (start.isAfter(end)) return 0;
        return end.diff(start, 'days') + 1;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setWarning(null);
        setIsSubmitting(true);

        if (!startDate || !endDate) {
            setError("Start date and end date are required.");
            setIsSubmitting(false);
            return;
        }

        const start = moment(startDate);
        const end = moment(endDate);

        if (start.isAfter(end)) {
            setError("Start date cannot be after end date.");
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch('/api/block-leave/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    start_date: startDate,
                    end_date: endDate,
                    leave_type: leaveType,
                    remarks,
                    ...(leaveType === 'advance' && { sub_leave_type: subLeaveType }),
                }),
            });

            const result = await response.json();

            if (result.success) {
                if (result.warning) {
                    setWarning(result.warning);
                }
                onSuccess();
                onClose();
            } else {
                setError(result.message || "Failed to submit leave application.");
            }
        } catch (err) {
            console.error("Error submitting block leave:", err);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={modalStyles.overlay}>
            <div style={modalStyles.modal}>
                <h2 style={modalStyles.header}>Apply Block / Advance Leave</h2>
                <form onSubmit={handleSubmit} style={modalStyles.form}>
                    <div style={modalStyles.formGroup}>
                        <label htmlFor="leaveType" style={modalStyles.label}>Leave Type:</label>
                        <select
                            id="leaveType"
                            value={leaveType}
                            onChange={(e) => setLeaveType(e.target.value as "block" | "advance")}
                            style={modalStyles.input}
                        >
                            <option value="block">Block Leave</option>
                            <option value="advance">Advance Leave</option>
                        </select>
                    </div>

                    {leaveType === 'advance' && (
                        <div style={modalStyles.formGroup}>
                            <label htmlFor="subLeaveType" style={modalStyles.label}>Sub Leave Type:</label>
                            <select
                                id="subLeaveType"
                                value={subLeaveType}
                                onChange={(e) => setSubLeaveType(e.target.value)}
                                style={modalStyles.input}
                            >
                                <option value="">Select a type...</option>
                                {subLeaveTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div style={modalStyles.formGroup}>
                        <label htmlFor="startDate" style={modalStyles.label}>Start Date:</label>
                        <input
                            type="date"
                            id="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={modalStyles.input}
                        />
                    </div>

                    <div style={modalStyles.formGroup}>
                        <label htmlFor="endDate" style={modalStyles.label}>End Date:</label>
                        <input
                            type="date"
                            id="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={modalStyles.input}
                        />
                    </div>

                    <div style={modalStyles.formGroup}>
                        <label style={modalStyles.label}>Total Days: {calculateLeaveDays()}</label>
                    </div>

                    <div style={modalStyles.formGroup}>
                        <label htmlFor="remarks" style={modalStyles.label}>Remarks (Optional):</label>
                        <textarea
                            id="remarks"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            style={{ ...modalStyles.input, height: '80px' }}
                        />
                    </div>

                    {error && <p style={modalStyles.errorMessage}>{error}</p>}
                    {warning && <p style={modalStyles.warningMessage}>{warning}</p>}

                    <div style={modalStyles.buttonGroup}>
                        <button type="submit" style={modalStyles.submitButton} disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Apply Leave'}
                        </button>
                        <button type="button" onClick={onClose} style={modalStyles.cancelButton} disabled={isSubmitting}>
                            Cancel
                        </button>
                    </div>
                </form>
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
        maxWidth: '500px',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
        color: '#fff',
    },
    header: {
        textAlign: 'center',
        marginBottom: '20px',
        color: '#fff',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
    },
    formGroup: {
        marginBottom: '15px',
    },
    label: {
        marginBottom: '5px',
        display: 'block',
        color: '#eee',
    },
    input: {
        width: '100%',
        padding: '10px',
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
    submitButton: {
        padding: '10px 20px',
        borderRadius: '5px',
        border: 'none',
        backgroundColor: '#007bff',
        color: 'white',
        cursor: 'pointer',
        fontSize: '1em',
        flexGrow: 1,
    },
    cancelButton: {
        padding: '10px 20px',
        borderRadius: '5px',
        border: '1px solid #555',
        backgroundColor: '#4a4a4a',
        color: 'white',
        cursor: 'pointer',
        fontSize: '1em',
        flexGrow: 1,
    },
};
