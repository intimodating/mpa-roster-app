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

interface ModalProps {
    shiftData: ShiftData;
    onClose: () => void;
    onSave: (data: ShiftData) => void;
}

const ShiftEditorModal: React.FC<ModalProps> = ({ shiftData, onClose, onSave }) => {
    const [activeLocation, setActiveLocation] = useState<'East' | 'West'>('East');
    const [shiftTexts, setShiftTexts] = useState({
        East: {
            Morning: shiftData.East.Morning.join('\n'),
            Afternoon: shiftData.East.Afternoon.join('\n'),
            Night: shiftData.East.Night.join('\n'),
        },
        West: {
            Morning: shiftData.West.Morning.join('\n'),
            Afternoon: shiftData.West.Afternoon.join('\n'),
            Night: shiftData.West.Night.join('\n'),
        },
    });

    const handleTextChange = (location: 'East' | 'West', shiftType: keyof ShiftDetails, text: string) => {
        setShiftTexts(prev => ({
            ...prev,
            [location]: {
                ...prev[location],
                [shiftType]: text,
            },
        }));
    };
    
    const handleSave = () => {
        const updatedData: ShiftData = {
            ...shiftData,
            East: {
                Morning: shiftTexts.East.Morning.split('\n').map(s => s.trim()).filter(s => s.length > 0),
                Afternoon: shiftTexts.East.Afternoon.split('\n').map(s => s.trim()).filter(s => s.length > 0),
                Night: shiftTexts.East.Night.split('\n').map(s => s.trim()).filter(s => s.length > 0),
            },
            West: {
                Morning: shiftTexts.West.Morning.split('\n').map(s => s.trim()).filter(s => s.length > 0),
                Afternoon: shiftTexts.West.Afternoon.split('\n').map(s => s.trim()).filter(s => s.length > 0),
                Night: shiftTexts.West.Night.split('\n').map(s => s.trim()).filter(s => s.length > 0),
            },
        };
        onSave(updatedData);
    };

    return (
        <div style={modalStyles.backdrop}>
            <div style={modalStyles.modal}>
                <h2 style={modalStyles.header}>Edit Roster for {shiftData.date}</h2>
                
                {shiftData.leaves && shiftData.leaves.length > 0 && (
                    <div style={modalStyles.leavesContainer}>
                        <h3 style={modalStyles.shiftHeader}>On Leave:</h3>
                        <p>{shiftData.leaves.join(', ')}</p>
                    </div>
                )}

                <div style={modalStyles.tabsContainer}>
                    <button
                        style={{ ...modalStyles.tabButton, ...(activeLocation === 'East' ? modalStyles.activeTab : {}) }}
                        onClick={() => setActiveLocation('East')}
                    >
                        East
                    </button>
                    <button
                        style={{ ...modalStyles.tabButton, ...(activeLocation === 'West' ? modalStyles.activeTab : {}) }}
                        onClick={() => setActiveLocation('West')}
                    >
                        West
                    </button>
                </div>

                <div style={modalStyles.shiftsContainer}>
                    <div>
                        <h3 style={modalStyles.shiftHeader}>Morning Shift ({activeLocation})</h3>
                        <textarea
                            value={shiftTexts[activeLocation].Morning}
                            onChange={(e) => handleTextChange(activeLocation, 'Morning', e.target.value)}
                            style={modalStyles.textarea}
                            rows={4}
                        />
                    </div>
                    <div>
                        <h3 style={modalStyles.shiftHeader}>Afternoon Shift ({activeLocation})</h3>
                        <textarea
                            value={shiftTexts[activeLocation].Afternoon}
                            onChange={(e) => handleTextChange(activeLocation, 'Afternoon', e.target.value)}
                            style={modalStyles.textarea}
                            rows={4}
                        />
                    </div>
                    <div>
                        <h3 style={modalStyles.shiftHeader}>Night Shift ({activeLocation})</h3>
                        <textarea
                            value={shiftTexts[activeLocation].Night}
                            onChange={(e) => handleTextChange(activeLocation, 'Night', e.target.value)}
                            style={modalStyles.textarea}
                            rows={4}
                        />
                    </div>
                </div>

                <div style={modalStyles.actions}>
                    <button onClick={onClose} style={modalStyles.cancelButton}>Cancel</button>
                    <button onClick={handleSave} style={modalStyles.saveButton}>Save Changes</button>
                </div>
            </div>
        </div>
    );
};

const modalStyles: Record<string, React.CSSProperties> = {
    backdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modal: {
        backgroundColor: '#2c2c2c',
        color: '#fff',
        padding: '30px',
        borderRadius: '10px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
        zIndex: 1001,
    },
    header: {
        borderBottom: '1px solid #555',
        paddingBottom: '15px',
        marginBottom: '20px',
        color: '#1a73e8',
    },
    leavesContainer: {
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: '#3b3b3b',
        borderRadius: '5px',
    },
    shiftsContainer: {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '20px',
        marginTop: '20px',
    },
    shiftHeader: {
        fontSize: '1.1em',
        marginBottom: '10px',
        color: '#fff',
    },
    textarea: {
        width: '100%',
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid #555',
        backgroundColor: '#3b3b3b',
        color: '#fff',
        resize: 'vertical',
        boxSizing: 'border-box',
    },
    actions: {
        marginTop: '30px',
        textAlign: 'right',
    },
    saveButton: {
        padding: '10px 20px',
        backgroundColor: '#34a853',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        marginLeft: '10px',
    },
    cancelButton: {
        padding: '10px 20px',
        backgroundColor: '#f4f4f4',
        color: '#333',
        border: '1px solid #ccc',
        borderRadius: '5px',
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

export default ShiftEditorModal;