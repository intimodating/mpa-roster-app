"use client";
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, LabelList
} from 'recharts';
import { useRouter } from 'next/navigation';

interface LeaveAnalyticsData {
  month: string;
  annual: number;
  medical: number;
  hospitalisation: number;
}

interface DeploymentAnalyticsData {
  month: string;
  grade_1: number;
  grade_2: number;
  grade_3: number;
}

interface WorkforceData {
    grade: string;
    count: number;
}

interface TeamProficiencyData {
    team: number;
    [key: number]: number; // Proficiency grades
}

export default function DashboardPage() {
  const [leaveData, setLeaveData] = useState<LeaveAnalyticsData[]>([]);
  const [deploymentData, setDeploymentData] = useState<DeploymentAnalyticsData[]>([]);
  const [workforceData, setWorkforceData] = useState<WorkforceData[]>([]);
  const [teamProficiencyData, setTeamProficiencyData] = useState<TeamProficiencyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeploymentChartLoading, setIsDeploymentChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  // State for filters
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears] = useState([currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4]);
  const allGrades = Array.from({ length: 9 }, (_, i) => i + 1);
  const [selectedGrades, setSelectedGrades] = useState<number[]>(allGrades);
  const [activeGrades, setActiveGrades] = useState<number[]>(allGrades); // For fetching

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setProgress(0);
      setError(null);

      const timer = setInterval(() => {
        setProgress(oldProgress => {
          if (oldProgress >= 90) {
            clearInterval(timer);
            return oldProgress;
          }
          return oldProgress + 5;
        });
      }, 100);

      try {
        const gradesQuery = activeGrades.join(','); // Use activeGrades for query
        const leaveUrl = `/api/analytics/leaves?year=${selectedYear}`;
        const deploymentUrl = `/api/analytics/deployment-rate?year=${selectedYear}&grades=${gradesQuery}`;
        const workforceUrl = `/api/analytics/workforce-structure`;
        const teamProficiencyUrl = `/api/analytics/team-proficiency`;

        const [leaveRes, deploymentRes, workforceRes, teamProficiencyRes] = await Promise.all([
          fetch(leaveUrl),
          fetch(deploymentUrl),
          fetch(workforceUrl),
          fetch(teamProficiencyUrl),
        ]);

        const leaveJson = await leaveRes.json();
        const deploymentJson = await deploymentRes.json();
        const workforceJson = await workforceRes.json();
        const teamProficiencyJson = await teamProficiencyRes.json();

        if (leaveJson.success) setLeaveData(leaveJson.data);
        else throw new Error(leaveJson.message || 'Failed to fetch leave analytics');

        if (deploymentJson.success) setDeploymentData(deploymentJson.data);
        else throw new Error(deploymentJson.message || 'Failed to fetch deployment analytics');

        if (workforceJson.success) setWorkforceData(workforceJson.data);
        else throw new Error(workforceJson.message || 'Failed to fetch workforce data');
        
        if (teamProficiencyJson.success) setTeamProficiencyData(teamProficiencyJson.data);
        else throw new Error(teamProficiencyJson.message || 'Failed to fetch team proficiency data');

      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        setError(err.message || 'An unexpected error occurred while fetching data.');
      } finally {
        clearInterval(timer);
        setProgress(100);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedYear]);

  const handleGradeChange = (grade: number) => {
    setSelectedGrades(prev =>
      prev.includes(grade)
        ? prev.filter(g => g !== grade)
        : [...prev, grade]
    );
  };
  
  const handleApplyGradeFilter = async () => {
    setIsDeploymentChartLoading(true);
    try {
      const gradesQuery = selectedGrades.join(',');
      const deploymentUrl = `/api/analytics/deployment-rate?year=${selectedYear}&grades=${gradesQuery}`;
      const deploymentRes = await fetch(deploymentUrl);
      const deploymentJson = await deploymentRes.json();

      if (deploymentJson.success) {
        setDeploymentData(deploymentJson.data);
        setActiveGrades(selectedGrades); // Update active grades after successful fetch
      } else {
        throw new Error(deploymentJson.message || 'Failed to fetch deployment analytics');
      }
    } catch (err: any) {
      console.error("Dashboard fetch error (deployment):", err);
      setError(err.message || 'An unexpected error occurred while fetching deployment data.');
    } finally {
      setIsDeploymentChartLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.progressContainer}>
          <h1 style={styles.header}>Loading Analytics Dashboard...</h1>
          <p style={{textAlign: 'center'}}>{Math.round(progress)}% for {selectedYear}</p>
          <div style={styles.progressBarBackground}>
            <div style={{...styles.progressBarFill, width: `${progress}%`}}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div style={styles.container}><p style={{ color: 'red' }}>Error: {error}</p></div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Analytics Dashboard</h1>

      <div style={styles.filtersContainer}>
        {/* Year Filter */}
        <div style={styles.filterGroup}>
          <label htmlFor="year-select" style={styles.filterLabel}>Year:</label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            style={styles.select}
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.chartSection}>
        <h2 style={styles.chartTitle}>Monthly Leave Applications by Type ({selectedYear})</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={leaveData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="month" stroke="#ccc" />
            <YAxis stroke="#ccc" />
            <Tooltip
              contentStyle={{ backgroundColor: '#333', border: '1px solid #555', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar dataKey="annual" stackId="a" fill="#8884d8" name="Annual" />
            <Bar dataKey="medical" stackId="a" fill="#82ca9d" name="Medical" />
            <Bar dataKey="hospitalisation" stackId="a" fill="#ffc658" name="Hospitalisation" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.chartSection}>
        <h2 style={styles.chartTitle}>Workforce Structure by Proficiency Grade</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={workforceData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis type="number" stroke="#ccc" />
            <YAxis type="category" dataKey="grade" stroke="#ccc" width={80} />
            <Tooltip
              contentStyle={{ backgroundColor: '#333', border: '1px solid #555' }}
              itemStyle={{ color: '#fff' }}
              cursor={{ fill: 'rgba(255, 255, 255, 0.1)'}}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar dataKey="count" name="Number of Employees" fill="#ff7300">
              <LabelList dataKey="count" position="right" fill="#fff" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.chartSection}>
        <h2 style={styles.chartTitle}>Team Proficiency Matrix</h2>
        <div style={{ overflowX: 'auto' }}>
            <table style={styles.matrixTable}>
                <thead>
                    <tr>
                        <th style={styles.matrixHeader}>Team</th>
                        {allGrades.map(grade => (
                            <th key={grade} style={styles.matrixHeader}>{`Grade ${grade}`}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {teamProficiencyData.sort((a, b) => a.team - b.team).map(row => (
                        <tr key={row.team}>
                            <td style={styles.matrixCell}>{row.team}</td>
                            {allGrades.map(grade => (
                                <td key={grade} style={styles.matrixCell}>{row[grade] || 0}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      <div style={styles.chartSection}>
        <h2 style={styles.chartTitle}>Deployment Rate by Proficiency Grade (%) ({selectedYear})</h2>
        {/* Grade Filter */}
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Show Grades:</label>
          <div style={styles.checkboxContainer}>
            <div style={styles.checkboxGroup}>
              {allGrades.map(grade => (
                <label key={grade} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedGrades.includes(grade)}
                    onChange={() => handleGradeChange(grade)}
                  />
                  {grade}
                </label>
              ))}
            </div>
            <button onClick={handleApplyGradeFilter} style={styles.button} disabled={isDeploymentChartLoading}>
              {isDeploymentChartLoading ? 'Reloading...' : 'Reload Chart'}
            </button>
          </div>
        </div>
        {isDeploymentChartLoading && <p style={{textAlign: 'center', color: '#ccc'}}>Loading chart data...</p>}
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={deploymentData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="month" stroke="#ccc" />
            <YAxis domain={[0, 100]} stroke="#ccc" />
            <Tooltip
              contentStyle={{ backgroundColor: '#333', border: '1px solid #555', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            {(() => {
              const gradeColors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088fe", "#00c49f", "#ffbb28", "#a4de6c", "#d0ed57"];
              return activeGrades.sort((a,b) => a-b).map(grade => {
                return (
                  <Line
                    key={`grade_${grade}`}
                    type="monotone"
                    dataKey={`grade_${grade}`}
                    name={`Grade ${grade}`}
                    stroke={gradeColors[grade - 1]}
                    activeDot={{ r: 8 }}
                  />
                );
              });
            })()}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <button style={styles.backButton} onClick={() => router.push('/home')}>
        Back to Home
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '40px auto',
    padding: '30px',
    backgroundColor: '#1e1e1e',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    color: '#fff',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    textAlign: 'center',
    fontSize: '2.5em',
    marginBottom: '30px',
    color: '#fff',
  },
  chartSection: {
    marginBottom: '40px',
    padding: '20px',
    backgroundColor: '#2c2c2c',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  },
  chartTitle: {
    textAlign: 'center',
    fontSize: '1.5em',
    marginBottom: '20px',
    color: '#eee',
  },
  backButton: {
    display: 'block',
    width: 'fit-content',
    margin: '30px auto 0',
    padding: '12px 24px',
    border: '1px solid #555',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    backgroundColor: 'transparent',
    color: '#fff',
    fontSize: '1em',
    transition: 'background-color 0.3s ease, color 0.3s ease',
  },
  progressContainer: {
    width: '100%',
    padding: '50px 0',
  },
  progressBarBackground: {
    height: '20px',
    width: '80%',
    backgroundColor: '#444',
    borderRadius: '10px',
    margin: '20px auto',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#405de6',
    borderRadius: '10px',
    transition: 'width 0.1s ease-in-out',
  },
  filtersContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '40px',
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#2c2c2c',
    borderRadius: '8px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  filterLabel: {
    fontWeight: 'bold',
    fontSize: '1.1em',
    color: '#eee',
  },
  select: {
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #555',
    backgroundColor: '#3b3b3b',
    color: '#fff',
    fontSize: '1em',
  },
  checkboxGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    cursor: 'pointer',
    padding: '5px 10px',
    borderRadius: '6px',
    backgroundColor: '#3b3b3b',
    transition: 'background-color 0.2s',
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  button: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#405de6',
    transition: 'background-color 0.2s',
  },
  matrixTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
  },
  matrixHeader: {
    backgroundColor: '#3b3b3b',
    color: '#fff',
    padding: '12px 15px',
    border: '1px solid #555',
  },
  matrixCell: {
    padding: '12px 15px',
    border: '1px solid #555',
    textAlign: 'center',
  },
};
