// app/pages/roster/ShiftEditorModal.tsx
import React, { useState } from 'react';

interface ShiftData {
    date: string;
    dayShiftEmployees: string[];
    nightShiftEmployees: string[];
    leaves?: string[]; // Optional: user_ids of people on leave
}

interface ModalProps {
    shiftData: ShiftData;
    onClose: () => void;
    onSave: (data: ShiftData) => void;
}

const ShiftEditorModal: React.FC<ModalProps> = ({ shiftData, onClose, onSave }) => {
    // Convert arrays back to strings (one name per line) for editing
    const [dayShiftText, setDayShiftText] = useState(shiftData.dayShiftEmployees.join('\n'));
    const [nightShiftText, setNightShiftText] = useState(shiftData.nightShiftEmployees.join('\n'));
    
    const handleSave = () => {
        // Convert text back to arrays, filtering out empty lines
        const newDayShift = dayShiftText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
        const newNightShift = nightShiftText.split('\n').map(s => s.trim()).filter(s => s.length > 0);

        const updatedData: ShiftData = {
            ...shiftData,
            dayShiftEmployees: newDayShift,
            nightShiftEmployees: newNightShift,
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

                <div style={modalStyles.shiftsContainer}>
                    <div>
                        <h3 style={modalStyles.shiftHeader}>Day Shift (Add one name per line)</h3>
                        <textarea
                            value={dayShiftText}
                            onChange={(e) => setDayShiftText(e.target.value)}
                            style={modalStyles.textarea}
                            rows={6}
                        />
                    </div>
                    <div>
                        <h3 style={modalStyles.shiftHeader}>Night Shift (Add one name per line)</h3>
                        <textarea
                            value={nightShiftText}
                            onChange={(e) => setNightShiftText(e.target.value)}
                            style={modalStyles.textarea}
                            rows={6}
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
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        width: '90%',
        maxWidth: '700px',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
        zIndex: 1001,
    },
    header: {
        borderBottom: '1px solid #eee',
        paddingBottom: '15px',
        marginBottom: '20px',
        color: '#1a73e8',
    },
    leavesContainer: {
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: 'white',
        borderRadius: '5px',
    },
    shiftsContainer: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
    },
    shiftHeader: {
        fontSize: '1.1em',
        marginBottom: '10px',
        color: '#555',
    },
    textarea: {
        width: '100%',
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid #ccc',
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
};

export default ShiftEditorModal;