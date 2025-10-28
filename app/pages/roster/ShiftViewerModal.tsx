
// app/pages/roster/ShiftViewerModal.tsx
"use client";
import React, { useState } from 'react';

interface ShiftDetails {
    Morning: string[];
    Afternoon: string[];
    Night: string[];
}

interface ShiftData {
    date: string;
    East: ShiftDetails;
    West: ShiftDetails;
    leaves?: string[]; // Optional: user_ids of people on leave
}

interface Props {
    shiftData: ShiftData;
    onClose: () => void;
}

const ShiftViewerModal: React.FC<Props> = ({ shiftData, onClose }) => {
    const [activeLocation, setActiveLocation] = useState<'East' | 'West'>('East');

    const currentShiftDetails = shiftData[activeLocation];

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

                <div style={styles.tabsContainer}>
                    <button
                        style={{ ...styles.tabButton, ...(activeLocation === 'East' ? styles.activeTab : {}) }}
                        onClick={() => setActiveLocation('East')}
                    >
                        East
                    </button>
                    <button
                        style={{ ...styles.tabButton, ...(activeLocation === 'West' ? styles.activeTab : {}) }}
                        onClick={() => setActiveLocation('West')}
                    >
                        West
                    </button>
                </div>

                <div style={styles.shiftContainer}>
                    <div style={styles.shiftColumn}>
                        <h3 style={styles.shiftTitle}>Morning Shift ({activeLocation})</h3>
                        <ul style={styles.employeeList}>
                            {currentShiftDetails.Morning.length > 0 ?
                                currentShiftDetails.Morning.map(emp => <li key={emp} style={styles.employeeItem}>{emp}</li>) :
                                <li style={styles.employeeItem}>No assignments</li>
                            }
                        </ul>
                    </div>
                    <div style={styles.shiftColumn}>
                        <h3 style={styles.shiftTitle}>Afternoon Shift ({activeLocation})</h3>
                        <ul style={styles.employeeList}>
                            {currentShiftDetails.Afternoon.length > 0 ?
                                currentShiftDetails.Afternoon.map(emp => <li key={emp} style={styles.employeeItem}>{emp}</li>) :
                                <li style={styles.employeeItem}>No assignments</li>
                            }
                        </ul>
                    </div>
                    <div style={styles.shiftColumn}>
                        <h3 style={styles.shiftTitle}>Night Shift ({activeLocation})</h3>
                        <ul style={styles.employeeList}>
                            {currentShiftDetails.Night.length > 0 ?
                                currentShiftDetails.Night.map(emp => <li key={emp} style={styles.employeeItem}>{emp}</li>) :
                                <li style={styles.employeeItem}>No assignments</li>
                            }
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
        width: '700px',
        maxHeight: '90vh',
        overflowY: 'auto',
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
        backgroundColor: '#3b3b3b',
        borderRadius: '5px',
    },
    shiftContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        marginBottom: '30px',
    },
    shiftColumn: {
        // width: '45%',
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
    tabsContainer: {
        display: 'flex',
        marginBottom: '20px',
        borderBottom: '1px solid #555',
    },
    tabButton: {
        padding: '10px 20px',
        border: 'none',
        backgroundColor: '#3b3b3b',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '1em',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
        transition: 'background-color 0.3s ease',
    },
    activeTab: {
        backgroundColor: '#555',
        fontWeight: 'bold',
    },
};

export default ShiftViewerModal;
