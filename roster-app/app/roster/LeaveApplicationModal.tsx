
// app/roster/LeaveApplicationModal.tsx
"use client";
import React, { useState, useMemo } from 'react';

interface Props {
    onClose: () => void;
}

const LeaveApplicationModal: React.FC<Props> = ({ onClose }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [leaveType, setLeaveType] = useState('Annual leave');

    const leaveTypes = ["Annual leave", "Medical leave", "Hospitalisation Leave", "Parental Leave"];

    const numberOfDays = useMemo(() => {
        if (!startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start > end) return 0;
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    }, [startDate, endDate]);

    const handleSubmit = async () => {
        const storedUser = localStorage.getItem('loggedInUser');
        if (!storedUser) {
            alert("You must be logged in to apply for leave.");
            return;
        }
        const user = JSON.parse(storedUser);

        if (!startDate || !endDate || !leaveType) {
            alert("Please fill in all fields.");
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert("Start date cannot be after end date.");
            return;
        }

        try {
            const res = await fetch('/api/leave/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.user_id,
                    startDate,
                    endDate,
                    leave_type: leaveType,
                }),
            });

            const data = await res.json();

            if (data.success) {
                alert(data.message);
                onClose();
            } else {
                alert(`Failed to apply for leave: ${data.message}`);
            }
        } catch (error) {
            console.error("Leave application error:", error);
            alert("An error occurred while submitting your leave application.");
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h2 style={styles.header}>Apply for Leave</h2>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>End Date</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Leave Type</label>
                    <select value={leaveType} onChange={e => setLeaveType(e.target.value)} style={styles.input}>
                        {leaveTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
                {numberOfDays > 0 && (
                    <p style={styles.daysText}>Number of days: {numberOfDays}</p>
                )}
                <div style={styles.buttonContainer}>
                    <button onClick={handleSubmit} style={styles.applyButton}>Apply</button>
                    <button onClick={onClose} style={styles.cancelButton}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
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
        width: '500px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    },
    header: {
        textAlign: 'center',
        color: '#fff',
        marginBottom: '20px',
    },
    formGroup: {
        marginBottom: '15px',
    },
    label: {
        display: 'block',
        color: '#ccc',
        marginBottom: '5px',
    },
    input: {
        width: '100%',
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #555',
        backgroundColor: '#3b3b3b',
        color: '#fff',
    },
    daysText: {
        color: '#ccc',
        textAlign: 'center',
        margin: '20px 0',
    },
    buttonContainer: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '15px',
        marginTop: '30px',
    },
    applyButton: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: '#34a853',
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
    },
    cancelButton: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: '#555',
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
    },
};

export default LeaveApplicationModal;
