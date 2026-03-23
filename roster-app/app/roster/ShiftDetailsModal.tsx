"use client";
import React from 'react';

interface WorkerAssignment {
    user_id: string;
    assigned_console?: string;
    is_ojt?: boolean;
}

interface ShiftDetailsModalProps {
    date: string;
    userName: string;
    shifts: {
        location: string;
        type: string;
        console?: string;
        isOjt: boolean;
    }[];
    onClose: () => void;
}

const ShiftDetailsModal: React.FC<ShiftDetailsModalProps> = ({ date, userName, shifts, onClose }) => {
    return (
        <div style={styles.backdrop}>
            <div style={styles.modal}>
                <h2 style={styles.header}>Shift Details</h2>
                <div style={styles.infoRow}>
                    <strong>Staff:</strong> {userName}
                </div>
                <div style={styles.infoRow}>
                    <strong>Date:</strong> {date}
                </div>
                
                <div style={styles.shiftList}>
                    {shifts.length === 0 ? (
                        <p style={styles.noShift}>No shifts assigned (Off Day).</p>
                    ) : (
                        shifts.map((shift, idx) => (
                            <div key={idx} style={{
                                ...styles.shiftItem,
                                borderLeft: shift.isOjt ? '4px solid #FFD700' : '4px solid #34a853'
                            }}>
                                <div style={styles.shiftType}>
                                    {shift.type} Shift ({shift.location})
                                    {shift.isOjt && <span style={styles.ojtTag}>OJT</span>}
                                </div>
                                <div style={styles.consoleInfo}>
                                    <strong>Console:</strong> {shift.console || 'Not assigned'}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <button onClick={onClose} style={styles.closeButton}>Close</button>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    backdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1100,
    },
    modal: {
        backgroundColor: '#2c2c2c',
        color: '#fff',
        padding: '25px',
        borderRadius: '10px',
        width: '400px',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
    },
    header: {
        marginTop: 0,
        color: '#1a73e8',
        borderBottom: '1px solid #444',
        paddingBottom: '10px',
        marginBottom: '15px',
    },
    infoRow: {
        marginBottom: '10px',
        fontSize: '1.1em',
    },
    shiftList: {
        marginTop: '20px',
        maxHeight: '300px',
        overflowY: 'auto',
    },
    shiftItem: {
        backgroundColor: '#3b3b3b',
        padding: '12px',
        borderRadius: '4px',
        marginBottom: '12px',
    },
    shiftType: {
        fontWeight: 'bold',
        fontSize: '1.1em',
        marginBottom: '5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    ojtTag: {
        backgroundColor: '#FFD700',
        color: '#000',
        fontSize: '0.7em',
        padding: '2px 6px',
        borderRadius: '4px',
        fontWeight: 'bold',
    },
    consoleInfo: {
        color: '#ccc',
    },
    noShift: {
        textAlign: 'center',
        fontStyle: 'italic',
        color: '#888',
        padding: '20px 0',
    },
    closeButton: {
        marginTop: '20px',
        width: '100%',
        padding: '10px',
        backgroundColor: '#555',
        color: '#fff',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold',
    }
};

export default ShiftDetailsModal;
