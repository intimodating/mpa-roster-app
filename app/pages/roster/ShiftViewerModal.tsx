
// app/pages/roster/ShiftViewerModal.tsx
"use client";
import React from 'react';

interface ShiftData {
    date: string;
    dayShiftEmployees: string[];
    nightShiftEmployees: string[];
    leaves?: string[]; // Optional: user_ids of people on leave
}

interface Props {
    shiftData: ShiftData;
    onClose: () => void;
}

const ShiftViewerModal: React.FC<Props> = ({ shiftData, onClose }) => {
    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h2 style={styles.header}>Shift Details for {shiftData.date}</h2>
                
                {shiftData.leaves && shiftData.leaves.length > 0 && (
                    <div style={styles.leavesContainer}>
                        <h3 style={styles.shiftTitle}>On Leave</h3>
                        <ul style={styles.employeeList}>
                            {shiftData.leaves.map(emp => <li key={emp} style={styles.employeeItem}>{emp}</li>)}
                        </ul>
                    </div>
                )}

                <div style={styles.shiftContainer}>
                    <div style={styles.shiftColumn}>
                        <h3 style={styles.shiftTitle}>Day Shift</h3>
                        <ul style={styles.employeeList}>
                            {shiftData.dayShiftEmployees.map(emp => <li key={emp} style={styles.employeeItem}>{emp}</li>)}
                        </ul>
                    </div>
                    <div style={styles.shiftColumn}>
                        <h3 style={styles.shiftTitle}>Night Shift</h3>
                        <ul style={styles.employeeList}>
                            {shiftData.nightShiftEmployees.map(emp => <li key={emp} style={styles.employeeItem}>{emp}</li>)}
                        </ul>
                    </div>
                </div>
                <button onClick={onClose} style={styles.closeButton}>Close</button>
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
    leavesContainer: {
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: 'red',
        borderRadius: '5px',
    },
    shiftContainer: {
        display: 'flex',
        justifyContent: 'space-around',
        marginBottom: '30px',
    },
    shiftColumn: {
        width: '45%',
    },
    shiftTitle: {
        color: '#fff',
        borderBottom: '1px solid #555',
        paddingBottom: '10px',
        marginBottom: '15px',
    },
    employeeList: {
        listStyle: 'none',
        padding: 0,
        color: '#ccc',
    },
    employeeItem: {
        padding: '5px 0',
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
    },
};

export default ShiftViewerModal;
