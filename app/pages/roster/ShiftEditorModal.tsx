// app/pages/roster/ShiftEditorModal.tsx
import React, { useState } from 'react';

interface ShiftData {
    date: string;
    dayShiftEmployees: string[];
    nightShiftEmployees: string[];
}

interface ModalProps {
    shiftData: ShiftData;
    onClose: () => void;
    onSave: (data: ShiftData) => void;
}

const ShiftEditorModal: React.FC<ModalProps> = ({ shiftData, onClose, onSave }) => {
    // State: Convert arrays back to strings (one name per line) for editing
    const [dayShiftText, setDayShiftText] = useState(shiftData.dayShiftEmployees.join('\n'));
    const [nightShiftText, setNightShiftText] = useState(shiftData.nightShiftEmployees.join('\n'));

    // The user input handler is now simplified to just update the state
    const handleShiftChange = (currentText: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
        setter(currentText);
    };

    /**
     * Helper function to normalize and clean the textarea content into an array of unique, non-empty IDs.
     * @param text The raw string content from the textarea.
     * @returns An array of trimmed, non-empty, unique employee IDs.
     */
    const cleanAndUnique = (text: string): string[] => {
        const lines = text.split('\n');
        // Trim, convert to uppercase for case-insensitive comparison, and filter out empty strings
        const cleanedIDs = lines.map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
        // Deduplicate the array
        return Array.from(new Set(cleanedIDs));
    };

    /**
     * Client-side validation for duplicates and shift overlaps before calling the save handler.
     */
    const handleSave = () => {
        // --- 1. PREPARE & CLEAN DATA ---
        // Raw lists used for duplicate checking (allows multiple same names)
        const rawDayList = dayShiftText.split('\n').map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
        const rawNightList = nightShiftText.split('\n').map(s => s.trim().toUpperCase()).filter(s => s.length > 0);

        // Final lists to be saved (already deduplicated by the backend, but useful for overlap check)
        const newDayShift = Array.from(new Set(rawDayList));
        const newNightShift = Array.from(new Set(rawNightList));
        
        // --- 2. VALIDATION: DUPLICATES WITHIN A SINGLE SHIFT (e.g., "JOHN" entered twice) ---
        if (rawDayList.length !== newDayShift.length) {
             // Find the duplicate names
            const dayDuplicates = rawDayList.filter((id, index) => rawDayList.indexOf(id) !== index);
            alert(`ERROR: Duplicate employee IDs found in the Day Shift: ${Array.from(new Set(dayDuplicates)).join(', ')}.`);
            return; // 🛑 Stop save
        }
        
        if (rawNightList.length !== newNightShift.length) {
            const nightDuplicates = rawNightList.filter((id, index) => rawNightList.indexOf(id) !== index);
            alert(`ERROR: Duplicate employee IDs found in the Night Shift: ${Array.from(new Set(nightDuplicates)).join(', ')}.`);
            return; // 🛑 Stop save
        }

        // --- 3. VALIDATION: OVERLAP BETWEEN SHIFTS (e.g., "JANE" in Day and Night) ---
        const daySet = new Set(newDayShift);
        const overlap = newNightShift.filter(id => daySet.has(id));

        if (overlap.length > 0) {
            alert(`ERROR: The following employee IDs are assigned to BOTH Day and Night shifts: ${overlap.join(', ')}. Please correct this conflict.`);
            return; // 🛑 Stop save
        }
        
        // --- 4. SUCCESS: Call parent save function with the cleaned, unique arrays ---
        const updatedData: ShiftData = {
            date: shiftData.date,
            dayShiftEmployees: newDayShift, // These arrays are already deduplicated here
            nightShiftEmployees: newNightShift, // and confirmed not to overlap
        };
        
        onSave(updatedData);
    };

    // --- RENDER ---
    return (
        <div style={modalStyles.backdrop}>
            <div style={modalStyles.modal}>
                <h2 style={modalStyles.header}>Edit Roster for {shiftData.date}</h2>
                
                <div style={modalStyles.shiftsContainer}>
                    <div>
                        <h3 style={modalStyles.shiftHeader}>Day Shift (Add one User ID per line)</h3>
                        <textarea
                            value={dayShiftText}
                            onChange={(e) => handleShiftChange(e.target.value, setDayShiftText)}
                            style={modalStyles.textarea}
                            rows={6}
                        />
                    </div>
                    <div>
                        <h3 style={modalStyles.shiftHeader}>Night Shift (Add one User ID per line)</h3>
                        <textarea
                            value={nightShiftText}
                            onChange={(e) => handleShiftChange(e.target.value, setNightShiftText)}
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

// ... (modalStyles object remains unchanged) ...
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