"use client";
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
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

export default function DashboardPage() {
  const [leaveData, setLeaveData] = useState<LeaveAnalyticsData[]>([]);
  const [deploymentData, setDeploymentData] = useState<DeploymentAnalyticsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [leaveRes, deploymentRes] = await Promise.all([
          fetch('/api/analytics/leaves'),
          fetch('/api/analytics/deployment-rate'),
        ]);

        const leaveJson = await leaveRes.json();
        const deploymentJson = await deploymentRes.json();

        if (leaveJson.success) {
          setLeaveData(leaveJson.data);
        } else {
          throw new Error(leaveJson.message || 'Failed to fetch leave analytics');
        }

        if (deploymentJson.success) {
          setDeploymentData(deploymentJson.data);
        } else {
          throw new Error(deploymentJson.message || 'Failed to fetch deployment analytics');
        }

      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        setError(err.message || 'An unexpected error occurred while fetching data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <div style={styles.container}>Loading Analytics Dashboard...</div>;
  }

  if (error) {
    return <div style={styles.container}><p style={{ color: 'red' }}>Error: {error}</p></div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Analytics Dashboard</h1>

      <div style={styles.chartSection}>
        <h2 style={styles.chartTitle}>Monthly Leave Applications by Type</h2>
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
            <Bar dataKey="annual" stackId="a" fill="#8884d8" />
            <Bar dataKey="medical" stackId="a" fill="#82ca9d" />
            <Bar dataKey="hospitalisation" stackId="a" fill="#ffc658" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.chartSection}>
        <h2 style={styles.chartTitle}>Deployment Rate by Proficiency Grade (%)</h2>
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
            {/* Dynamically render lines for grades 1-9 */}
            {(() => {
              const gradeColors = [
                "#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088fe",
                "#00c49f", "#ffbb28", "#a4de6c", "#d0ed57" // 9 distinct colors
              ];
              return [...Array(9)].map((_, i) => {
                const grade = i + 1;
                return (
                  <Line
                    key={`grade_${grade}`}
                    type="monotone"
                    dataKey={`grade_${grade}`}
                    stroke={gradeColors[i]} // Use a distinct color for each grade
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
};
