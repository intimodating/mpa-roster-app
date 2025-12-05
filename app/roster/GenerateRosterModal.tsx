
// app/roster/GenerateRosterModal.tsx
"use client";
import React, { useState } from 'react';
import { RosterMap, ShiftData } from '../../types/roster'; // Import RosterMap and ShiftData

interface GenerateRosterModalProps {
  onClose: () => void;
  onApprove: (roster: RosterMap) => Promise<void>; // Changed to RosterMap and Promise<void>
}

type WorkerRequirements = {
  [location: string]: { // "East" or "West"
    [proficiencyGrade: string]: number; // "1", "2", ..., "9" : count
  };
};

const initialWorkerRequirements: WorkerRequirements = {
  East: { '1': 1, '2': 1, '3': 1, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 },
  West: { '1': 1, '2': 1, '3': 1, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 },
};

const GenerateRosterModal: React.FC<GenerateRosterModalProps> = ({ onClose, onApprove }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [workerRequirements, setWorkerRequirements] = useState<WorkerRequirements>(initialWorkerRequirements);
  const [rosterPreview, setRosterPreview] = useState<RosterPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeLocation, setActiveLocation] = useState<'East' | 'West'>('East');

  const handleGradeChange = (location: string, grade: string, value: number) => {
    setWorkerRequirements(prev => ({
      ...prev,
      [location]: {
        ...prev[location],
        [grade]: value,
      },
    }));
  };

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      setError('Please select a start and end date.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/roster/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, workerRequirements }),
      });
      const data = await res.json();
      if (data.logs) {
        console.log("Backend logs:", data.logs);
      }
      if (data.success) {
        setRosterPreview(data.roster);
      } else {
        setError(data.message || 'Failed to generate roster.');
      }
    } catch (_err: unknown) {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    setRosterPreview(null);
    handleGenerate();
  };
  
  const handleApprove = () => {
    if (rosterPreview) {
      onApprove(rosterPreview);
    }
  };

  const renderLocationRequirements = (location: 'East' | 'West') => {
    const grades = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

    return (
      <div style={styles.gradesContainer}>
        {grades.map(grade => (
          <div key={grade} style={styles.gradeInput}>
            <label>Grade {grade}:</label>
            <input
              type="number"
              min="0"
              value={workerRequirements[location][grade]}
              onChange={(e) => handleGradeChange(location, grade, parseInt(e.target.value, 10) || 0)}
              style={styles.gradeInputField}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2>Generate Roster</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        
        {isLoading && <p>Loading...</p>}

        {!rosterPreview && !isLoading && (
          <>
            <div style={styles.inputGroup}>
              <label>Start Date:</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.inputGroup}>
              <label>End Date:</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={styles.input} />
            </div>

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

            <div style={styles.locationContent}>
              <h3>Required Workers for {activeLocation} Location</h3>
              {renderLocationRequirements(activeLocation)}
            </div>

            <div style={styles.buttonContainer}>
              <button onClick={handleGenerate} style={styles.generateButton}>Generate</button>
              <button onClick={onClose} style={styles.closeButton}>Close</button>
            </div>
          </>
        )}

        {rosterPreview && !isLoading && (
          <div style={styles.previewContainer}>
            <h3>Roster Preview</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>East - Morning</th>
                  <th style={styles.th}>East - Afternoon</th>
                  <th style={styles.th}>East - Night</th>
                  <th style={styles.th}>West - Morning</th>
                  <th style={styles.th}>West - Afternoon</th>
                  <th style={styles.th}>West - Night</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(rosterPreview).map(([date, shifts]: [string, ShiftData]) => (
                  <tr key={date}>
                    <td style={styles.td}>{date}</td>
                    <td style={styles.td}>{shifts.East.Morning.join(', ')}</td>
                    <td style={styles.td}>{shifts.East.Afternoon.join(', ')}</td>
                    <td style={styles.td}>{shifts.East.Night.join(', ')}</td>
                    <td style={styles.td}>{shifts.West.Morning.join(', ')}</td>
                    <td style={styles.td}>{shifts.West.Afternoon.join(', ')}</td>
                    <td style={styles.td}>{shifts.West.Night.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={styles.buttonContainer}>
              <button onClick={handleApprove} style={styles.approveButton}>Approve</button>
              <button onClick={handleRegenerate} style={styles.generateButton}>Regenerate</button>
              <button onClick={onClose} style={styles.closeButton}>Reject</button>
            </div>
          </div>
        )}
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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      },
      modal: {
        backgroundColor: '#2c2c2c',
        color: '#fff',
        padding: '30px',
        borderRadius: '12px',
        width: '800px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      },
      inputGroup: {
        marginBottom: '20px',
      },
      input: {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #555',
        backgroundColor: '#3b3b3b',
        color: '#fff',
        fontSize: '1em',
      },
      gradesContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '10px',
        marginTop: '15px',
        padding: '10px',
        border: '1px solid #444',
        borderRadius: '8px',
      },
      gradeInput: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '5px',
      },
      gradeInputField: {
        width: '60px',
        padding: '6px',
        borderRadius: '6px',
        border: '1px solid #666',
        backgroundColor: '#444',
        color: '#fff',
        textAlign: 'center',
        marginTop: '5px',
      },
      buttonContainer: {
        marginTop: '30px',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '15px',
      },
      generateButton: {
        padding: '12px 24px',
        border: 'none',
                borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        color: 'white',
        backgroundImage: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
      },
      approveButton: {
        padding: '12px 24px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        color: 'white',
        backgroundImage: 'linear-gradient(45deg, #405de6, #5851db, #833ab4, #c13584, #e1306c, #fd1d1d)',
      },
      closeButton: {
        padding: '12px 24px',
        border: '1px solid #555',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        backgroundColor: 'transparent',
        color: '#fff',
      },
      previewContainer: {
        marginTop: '20px',
      },
      table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '20px',
      },
      th: {
        border: '1px solid #555',
        padding: '12px',
        textAlign: 'left',
        backgroundColor: '#3b3b3b',
      },
      td: {
        border: '1px solid #555',
        padding: '12px',
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
      locationContent: {
        padding: '15px 0',
      },
      shiftContainer: {
        marginBottom: '20px',
        padding: '15px',
        border: '1px solid #555',
        borderRadius: '8px',
        backgroundColor: '#333',
      }
};

export default GenerateRosterModal;
