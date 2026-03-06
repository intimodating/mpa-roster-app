"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SimulationModalProps {
  onClose: () => void;
}

type WorkerRequirements = {
  [location: string]: { 
    [key: string]: number; 
  };
};

const COMPETENCIES = [
    "East Control", "West Control", "Keppel", "Cruisebay",
    "VTIS East", "VTIS West", "VTIS Central", "Sembawang Control",
    "Jurong Control", "Pasir Panjang Control", "Sembawang MTC",
    "Pasir Panjang MTC", "VTIS MTC", "PSU", "Temasek MTC",
    "GMDSS", "STW (PB)", "Vista DO/ Sensitive Vessels",
    "STW (TU)", "Changi DO", "Watch IC Console"
];

const SHIFT_TYPES = ["Morning", "Afternoon", "Night", "OFF"];

const initialCompetencyRequirements: WorkerRequirements = {
    East: COMPETENCIES.reduce((acc, comp) => ({ ...acc, [comp]: 1 }), {}),
    West: COMPETENCIES.reduce((acc, comp) => ({ ...acc, [comp]: 1 }), {}),
};

const SimulationModal: React.FC<SimulationModalProps> = ({ onClose }) => {
  const router = useRouter();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [competencyRequirements, setCompetencyRequirements] = useState<WorkerRequirements>(initialCompetencyRequirements);
  const [shiftPattern, setShiftPattern] = useState<string[]>(["Morning", "Morning", "Afternoon", "Afternoon", "OFF", "Night", "Night", "OFF", "OFF"]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeLocation, setActiveLocation] = useState<'East' | 'West'>('East');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      const timer = setInterval(() => {
        setProgress(oldProgress => {
          if (oldProgress >= 95) {
            clearInterval(timer);
            return oldProgress;
          }
          return oldProgress + 1;
        });
      }, 300);
      return () => clearInterval(timer);
    }
  }, [isLoading]);

  const handleCompetencyChange = (location: string, competency: string, value: number) => {
    setCompetencyRequirements(prev => ({
      ...prev,
      [location]: {
        ...prev[location],
        [competency]: value,
      },
    }));
  };

  const addToPattern = (type: string) => {
    setShiftPattern([...shiftPattern, type]);
  };

  const removeFromPattern = (index: number) => {
    setShiftPattern(shiftPattern.filter((_, i) => i !== index));
  };

  const handleSimulate = async () => {
    if (!startDate || !endDate) {
      setError('Please select a start and end date.');
      return;
    }
    if (shiftPattern.length === 0) {
        setError('Please define a shift pattern.');
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/roster/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            startDate, 
            endDate, 
            workerRequirements: competencyRequirements, 
            shiftPattern 
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Store in sessionStorage to pass to the simulation page
        sessionStorage.setItem('simulatedRoster', JSON.stringify(data.roster));
        sessionStorage.setItem('simulationMeta', JSON.stringify({ startDate, endDate, shiftPattern }));
        router.push('/roster/simulate');
      } else {
        setError(data.message || 'Simulation failed.');
      }
    } catch (err) {
      setError('An unexpected error occurred during simulation.');
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2>Roster Simulator</h2>
        {error && <p style={{ color: '#ff4d4d', whiteSpace: 'pre-wrap', backgroundColor: 'rgba(255,0,0,0.1)', padding: '10px', borderRadius: '5px' }}>{error}</p>}
        
        {isLoading && (
          <div style={styles.progressContainer}>
            <p>Simulating Scenarios... {Math.round(progress)}%</p>
            <div style={styles.progressBarBackground}>
              <div style={{...styles.progressBarFill, width: `${progress}%`}}></div>
            </div>
          </div>
        )}

        {!isLoading && (
          <>
            <div style={styles.inputGroup}>
              <label>Shift Pattern (Click to remove, buttons to add):</label>
              <div style={styles.patternDisplay}>
                {shiftPattern.map((p, i) => (
                  <span key={i} style={styles.patternItem} onClick={() => removeFromPattern(i)}>
                    {p}
                  </span>
                ))}
                {shiftPattern.length === 0 && <span style={{color: '#888'}}>Empty - Please add shifts below</span>}
              </div>
              <div style={styles.patternButtons}>
                {SHIFT_TYPES.map(type => (
                  <button key={type} onClick={() => addToPattern(type)} style={styles.smallButton}>
                    + {type}
                  </button>
                ))}
                <button onClick={() => setShiftPattern([])} style={{...styles.smallButton, backgroundColor: '#dc3545'}}>Clear All</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                    <label>Start Date:</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={styles.input} />
                </div>
                <div style={{ flex: 1 }}>
                    <label>End Date:</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={styles.input} />
                </div>
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
              <h3>Required People per Console ({activeLocation})</h3>
              <div style={styles.competenciesContainer}>
                {COMPETENCIES.map(comp => (
                  <div key={comp} style={styles.competencyInput}>
                    <label style={styles.competencyLabel}>{comp}:</label>
                    <input
                      type="number"
                      min="0"
                      value={competencyRequirements[activeLocation][comp]}
                      onChange={(e) => handleCompetencyChange(activeLocation, comp, parseInt(e.target.value, 10) || 0)}
                      style={styles.gradeInputField}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.buttonContainer}>
              <button onClick={handleSimulate} style={styles.generateButton}>Simulate</button>
              <button onClick={onClose} style={styles.closeButton}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: '#2c2c2c', color: '#fff', padding: '30px', borderRadius: '12px', width: '850px', maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' },
    inputGroup: { marginBottom: '20px' },
    input: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #555', backgroundColor: '#3b3b3b', color: '#fff', marginTop: '5px' },
    patternDisplay: { display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #444', minHeight: '50px', marginBottom: '10px' },
    patternItem: { backgroundColor: '#007bff', color: 'white', padding: '4px 10px', borderRadius: '15px', fontSize: '0.85em', cursor: 'pointer', transition: 'transform 0.1s' },
    patternButtons: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    smallButton: { padding: '5px 12px', border: 'none', borderRadius: '5px', backgroundColor: '#444', color: 'white', cursor: 'pointer', fontSize: '0.85em' },
    competenciesContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '10px', padding: '15px', backgroundColor: '#333', borderRadius: '8px' },
    competencyInput: { display: 'flex', flexDirection: 'column', marginBottom: '5px' },
    competencyLabel: { fontSize: '0.8em', color: '#ccc' },
    gradeInputField: { width: '60px', padding: '6px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#222', color: '#fff', textAlign: 'center' },
    tabsContainer: { display: 'flex', marginTop: '20px', borderBottom: '1px solid #555' },
    tabButton: { padding: '10px 20px', border: 'none', backgroundColor: '#3b3b3b', color: '#fff', cursor: 'pointer' },
    activeTab: { backgroundColor: '#555', fontWeight: 'bold' },
    locationContent: { padding: '15px 0' },
    buttonContainer: { marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '15px' },
    generateButton: { padding: '12px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: 'white', backgroundColor: '#28a745' },
    closeButton: { padding: '12px 24px', border: '1px solid #555', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: 'transparent', color: '#fff' },
    progressContainer: { textAlign: 'center', margin: '40px 0' },
    progressBarBackground: { height: '10px', width: '100%', backgroundColor: '#444', borderRadius: '5px', marginTop: '15px' },
    progressBarFill: { height: '100%', backgroundColor: '#28a745', borderRadius: '5px', transition: 'width 0.3s ease' }
};

export default SimulationModal;
