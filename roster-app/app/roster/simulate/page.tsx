"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ShiftViewerModal from '../ShiftViewerModal';

const DEFAULT_PATTERN = ["Morning", "Morning", "Afternoon", "Afternoon", "OFF", "Night", "Night", "OFF", "OFF"];

export default function SimulatePage() {
    const router = useRouter();
    const [rosterData, setRosterData] = useState<any>(null);
    const [meta, setMeta] = useState<any>(null);
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
    const [selectedShiftData, setSelectedShiftData] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'calendar' | 'matrix'>('calendar');
    const [users, setUsers] = useState<any[]>([]);
    const [activeStatInfo, setActiveStatInfo] = useState<{ title: string, definition: string, derivation: string } | null>(null);

    // 1. Initial Load of Simulation Data
    useEffect(() => {
        const storedRoster = sessionStorage.getItem('simulatedRoster');
        const storedMeta = sessionStorage.getItem('simulationMeta');

        if (!storedRoster || !storedMeta) {
            router.push('/roster');
            return;
        }

        const parsedMeta = JSON.parse(storedMeta);
        const parsedRoster = JSON.parse(storedRoster);
        
        setRosterData(parsedRoster);
        setMeta(parsedMeta);
        
        if (parsedMeta.startDate) {
            // Set current calendar view to start of the simulation month
            const date = new Date(`${parsedMeta.startDate}T00:00:00Z`);
            setCurrentDate(new Date(date.getUTCFullYear(), date.getUTCMonth(), 1));
        }
    }, [router]);

    // 2. Fetch Users (Centralized Source of Truth)
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/users/all');
                const data = await res.json();
                if (data.success) {
                    // Stable case-insensitive sort to match Python and guarantee consistent offsets
                    const sortedNonPlanners = data.data
                        .filter((u: any) => u.account_type === 'Non-Planner')
                        .sort((a: any, b: any) => a.user_id.toLowerCase().localeCompare(b.user_id.toLowerCase()));
                    setUsers(sortedNonPlanners);
                }
            } catch (err) {
                console.error("Failed to fetch users:", err);
            }
        };
        fetchUsers();
    }, []);

    const shiftPattern = useMemo(() => (meta?.shiftPattern?.length > 0 ? meta.shiftPattern : DEFAULT_PATTERN), [meta]);

    // 3. Centralized Pattern Logic (Shared by Stats and Table)
    const getExpectedShift = useCallback((userIndex: number, dateKey: string) => {
        if (!meta?.startDate) return 'OFF';
        const d1 = new Date(`${meta.startDate}T00:00:00Z`);
        const d2 = new Date(`${dateKey}T00:00:00Z`);
        
        // Exact day diff using UTC timestamps
        const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'OFF';

        const pattern_length = shiftPattern.length;
        const offset = userIndex % pattern_length;
        const pattern_pos = (diffDays + offset) % pattern_length;
        return shiftPattern[pattern_pos];
    }, [shiftPattern, meta]);

    // 4. Integrated Daily Calculation (Guarantees Tallying)
    const dailyStatsMap = useMemo(() => {
        if (!rosterData || users.length === 0 || !meta?.startDate || !meta?.endDate) return {};

        const result: Record<string, { assigned: number, expected: number, reserves: number, reserveIds: Set<string>, expectedIds: Record<string, string> }> = {};
        const start = new Date(`${meta.startDate}T00:00:00Z`);
        const end = new Date(`${meta.endDate}T00:00:00Z`);
        
        let curr = new Date(start);
        while (curr <= end) {
            const dateKey = curr.toISOString().split('T')[0];
            const dayData = rosterData[dateKey] || { East: { Morning: [], Afternoon: [], Night: [] }, West: { Morning: [], Afternoon: [], Night: [] } };
            
            let assignedCount = 0;
            let expectedOnDutyCount = 0;
            let reserves = 0;
            const reserveIds = new Set<string>();
            const expectedIds: Record<string, string> = {};
            
            users.forEach((u, uIdx) => {
                const expected = getExpectedShift(uIdx, dateKey);
                expectedIds[u.user_id] = expected;

                if (expected === 'OFF') return; // Not expected to work
                
                expectedOnDutyCount++;
                
                let isAssigned = false;
                ['Morning', 'Afternoon', 'Night'].forEach(st => {
                    ['East', 'West'].forEach(loc => {
                        if (dayData[loc][st]?.some((w: any) => w.user_id === u.user_id)) {
                            isAssigned = true;
                        }
                    });
                });
                
                if (isAssigned) {
                    assignedCount++;
                } else {
                    reserves++;
                    reserveIds.add(u.user_id);
                }
            });
            
            result[dateKey] = { assigned: assignedCount, expected: expectedOnDutyCount, reserves, reserveIds, expectedIds };
            curr.setUTCDate(curr.getUTCDate() + 1);
        }
        return result;
    }, [rosterData, users, getExpectedShift, meta]);

    // 5. Analytics derived from the integrated map
    const analytics = useMemo(() => {
        const statsArray = Object.values(dailyStatsMap);
        if (statsArray.length === 0) return null;

        const totalReserves = statsArray.reduce((acc, s) => acc + s.reserves, 0);
        const totalAssigned = statsArray.reduce((acc, s) => acc + s.assigned, 0);
        const totalExpected = statsArray.reduce((acc, s) => acc + s.expected, 0);
        const avgReserve = totalReserves / statsArray.length;

        return {
            avgReserve: avgReserve.toFixed(1),
            leaveCapacity: Math.max(0, Math.floor(avgReserve - 1)),
            efficiency: totalExpected > 0 ? ((totalAssigned / totalExpected) * 100).toFixed(1) : "0"
        };
    }, [dailyStatsMap]);

    const handleBack = () => {
        sessionStorage.removeItem('simulatedRoster');
        sessionStorage.removeItem('simulationMeta');
        router.push('/roster');
    };

    const handleDayClick = (dateKey: string) => {
        const dayData = rosterData[dateKey];
        if (dayData) {
            setSelectedShiftData({
                date: dateKey,
                East: dayData.East,
                West: dayData.West,
                leaves: [] 
            });
            setIsViewerModalOpen(true);
        }
    };

    const STAT_EXPLANATIONS = {
        avgReserve: {
            title: "Avg. Reserve Pool",
            definition: "The average number of staff members available on shift but not assigned to a specific console.",
            derivation: "Calculated by mapping every staff member to your shift pattern. If they are 'On Duty' but have no console assignment, they are counted as Reserve. Average = (Sum of Reserves / Total Simulation Days)."
        },
        leaveCapacity: {
            title: "Daily Leave Headroom",
            definition: "The number of additional people who can safely be granted leave without impacting console coverage.",
            derivation: "Calculated as (Avg. Reserves - 1). The '-1' ensures a minimum safety buffer of one person remains available."
        },
        utilization: {
            title: "Manpower Utilization",
            definition: "The percentage of on-duty staff actually deployed to active operational consoles.",
            derivation: "Total Console Assignments / Total Staff expected to be On-Duty (based on the pattern)."
        }
    };

    if (!rosterData) return <div style={styles.center}>Loading Simulation...</div>;

    return (
        <div style={styles.root}>
            <div style={styles.container}>
                <div style={styles.headerContainer}>
                    <h1 style={styles.header}>Simulation Results</h1>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            onClick={() => setViewMode('calendar')} 
                            style={{...styles.toggleBtn, backgroundColor: viewMode === 'calendar' ? '#007bff' : '#444'}}
                        >
                            Calendar View
                        </button>
                        <button 
                            onClick={() => setViewMode('matrix')} 
                            style={{...styles.toggleBtn, backgroundColor: viewMode === 'matrix' ? '#007bff' : '#444'}}
                        >
                            Matrix View
                        </button>
                        <button onClick={handleBack} style={styles.backButton}>Back to Roster (Exit Simulation)</button>
                    </div>
                </div>
                
                <p style={styles.warning}>
                    Note: This is a temporary simulation. Data is NOT saved to the database.
                </p>

                <div style={styles.statsRow}>
                    <div style={styles.statCard} onClick={() => setActiveStatInfo(STAT_EXPLANATIONS.avgReserve)}>
                        <div style={styles.statLabel}>Avg. Reserve Pool ℹ️</div>
                        <div style={styles.statValue}>{analytics ? analytics.avgReserve : "..."}</div>
                        <div style={styles.statSub}>Staff free for OJT/Support per day</div>
                    </div>
                    <div style={styles.statCard} onClick={() => setActiveStatInfo(STAT_EXPLANATIONS.leaveCapacity)}>
                        <div style={styles.statLabel}>Daily Leave Headroom ℹ️</div>
                        <div style={styles.statValue}>{analytics ? `~${analytics.leaveCapacity}` : "..."}</div>
                        <div style={styles.statSub}>Safe extra leave capacity</div>
                    </div>
                    <div style={styles.statCard} onClick={() => setActiveStatInfo(STAT_EXPLANATIONS.utilization)}>
                        <div style={styles.statLabel}>Manpower Utilization ℹ️</div>
                        <div style={styles.statValue}>{analytics ? `${analytics.efficiency}%` : "..."}</div>
                        <div style={styles.statSub}>Deployment vs. Capacity</div>
                    </div>
                </div>

                {viewMode === 'calendar' ? (
                    <CalendarView 
                        currentDate={currentDate} 
                        rosterData={rosterData} 
                        onDayClick={handleDayClick}
                        changeMonth={(d: number) => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + d, 1))}
                    />
                ) : (
                    <SimulationMatrixView 
                        currentDate={currentDate} 
                        rosterData={rosterData}
                        shiftPattern={shiftPattern}
                        users={users}
                        dailyStatsMap={dailyStatsMap}
                        changeMonth={(d: number) => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + d, 1))}
                    />
                )}

                {isViewerModalOpen && selectedShiftData && (
                    <ShiftViewerModal 
                        shiftData={selectedShiftData} 
                        onClose={() => setIsViewerModalOpen(false)} 
                    />
                )}

                {activeStatInfo && (
                    <div style={styles.overlay} onClick={() => setActiveStatInfo(null)}>
                        <div style={styles.modal} onClick={e => e.stopPropagation()}>
                            <h2 style={{color: '#82ca9d'}}>{activeStatInfo.title}</h2>
                            <div style={{marginTop: '20px'}}>
                                <h4 style={{color: '#aaa', marginBottom: '5px'}}>Definition</h4>
                                <p>{activeStatInfo.definition}</p>
                            </div>
                            <div style={{marginTop: '20px'}}>
                                <h4 style={{color: '#aaa', marginBottom: '5px'}}>How it's calculated</h4>
                                <p style={{fontStyle: 'italic'}}>{activeStatInfo.derivation}</p>
                            </div>
                            <button 
                                onClick={() => setActiveStatInfo(null)}
                                style={{...styles.backButton, width: '100%', marginTop: '30px', backgroundColor: '#555'}}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const CalendarView: React.FC<any> = ({ currentDate, rosterData, changeMonth, onDayClick }) => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const calendarDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(i);
        return days;
    }, [firstDayOfMonth, daysInMonth]);

    return (
        <div style={calStyles.container}>
            <div style={calStyles.header}>
                <button style={calStyles.navBtn} onClick={() => changeMonth(-1)}>&lt;</button>
                <h2>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                <button style={calStyles.navBtn} onClick={() => changeMonth(1)}>&gt;</button>
            </div>
            <div style={calStyles.grid}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} style={calStyles.weekday}>{d}</div>
                ))}
                {calendarDays.map((day, i) => {
                    if (day === null) return <div key={i} style={calStyles.empty}></div>;
                    
                    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayData = rosterData[dateKey];
                    const hasShift = !!dayData;

                    return (
                        <div 
                            key={dateKey} 
                            style={{...calStyles.day, backgroundColor: hasShift ? '#2e4034' : '#333', cursor: hasShift ? 'pointer' : 'default'}}
                            onClick={() => hasShift && onDayClick(dateKey)}
                        >
                            <div style={calStyles.dayNum}>{day}</div>
                            {dayData && (
                                <div style={calStyles.shifts}>
                                    {['Morning', 'Afternoon', 'Night'].map(st => {
                                        const count = (dayData.East[st]?.length || 0) + (dayData.West[st]?.length || 0);
                                        return count > 0 ? (
                                            <div key={st} style={{...calStyles.indicator, backgroundColor: st==='Morning'?'#34a853':st==='Afternoon'?'#4285F4':'#8a2be2'}}>
                                                {st[0]}: {count}
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const SimulationMatrixView: React.FC<any> = ({ currentDate, rosterData, changeMonth, shiftPattern, users, dailyStatsMap }) => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysOfMonth = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
        <div style={calStyles.container}>
            <div style={calStyles.header}>
                <button style={calStyles.navBtn} onClick={() => changeMonth(-1)}>&lt;</button>
                <div style={{textAlign: 'center'}}>
                    <h2 style={{margin: 0}}>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                    {shiftPattern && shiftPattern.length > 0 && (
                        <div style={matStyles.patternLabel}>
                            Pattern: {shiftPattern.map((p: any) => p[0]).join(' → ')}
                        </div>
                    )}
                </div>
                <button style={calStyles.navBtn} onClick={() => changeMonth(1)}>&gt;</button>
            </div>
            
            <div style={matStyles.legend}>
                <div style={{display: 'flex', gap: '20px', justifyContent: 'center', padding: '10px', fontSize: '0.8em'}}>
                    <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <span style={{width: '12px', height: '12px', border: '1px solid #444'}}></span> Assigned (1, 2, 3)
                    </span>
                    <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <span style={{width: '12px', height: '12px', color: '#666', border: '1px solid #444', textAlign: 'center'}}>0</span> Pattern OFF
                    </span>
                    <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <span style={{width: '12px', height: '12px', backgroundColor: '#ffd700', border: '1px solid #000'}}></span> Reserve (On Duty, Unassigned)
                    </span>
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={matStyles.table}>
                    <thead>
                        <tr>
                            <th style={matStyles.th}>Staff</th>
                            {daysOfMonth.map(d => <th key={d} style={matStyles.th}>{d}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u: any) => (
                            <tr key={u.user_id}>
                                <td style={matStyles.tdName}>{u.name}</td>
                                {daysOfMonth.map(d => {
                                    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                    const dayRoster = rosterData[dateKey];
                                    const stats = dailyStatsMap[dateKey];
                                    
                                    let actualShift = '';
                                    if (dayRoster) {
                                        ['Morning', 'Afternoon', 'Night'].forEach((st, idx) => {
                                            const locations = ['East', 'West'];
                                            locations.forEach(loc => {
                                                if (dayRoster[loc][st]?.some((w: any) => w.user_id === u.user_id)) {
                                                    actualShift = (idx + 1).toString();
                                                }
                                            });
                                        });
                                    }

                                    const isReserve = stats?.reserveIds.has(u.user_id);
                                    const isOff = stats?.expectedIds[u.user_id] === 'OFF';
                                    
                                    const cellStyle = {
                                        ...matStyles.td,
                                        backgroundColor: isReserve ? '#ffd700' : 'transparent',
                                        color: isReserve ? '#000' : isOff ? '#666' : '#ccc',
                                        fontWeight: isReserve ? 'bold' : 'normal',
                                        border: isReserve ? '1px solid #000' : '1px solid #444',
                                    };

                                    return (
                                        <td key={d} style={cellStyle}>
                                            {actualShift || (isOff ? '0' : isReserve ? 'R' : '')}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        <tr style={{backgroundColor: '#1a1a1a'}}>
                            <td style={{...matStyles.tdName, backgroundColor: '#1a1a1a', color: '#ffd700'}}>Total Reserve</td>
                            {daysOfMonth.map(d => {
                                const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                return (
                                    <td key={d} style={{...matStyles.td, color: '#ffd700', fontWeight: 'bold'}}>
                                        {dailyStatsMap[dateKey]?.reserves ?? '-'}
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const matStyles: Record<string, React.CSSProperties> = {
    table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#222' },
    th: { border: '1px solid #444', padding: '8px', fontSize: '0.8em', backgroundColor: '#333', color: '#fff' },
    td: { border: '1px solid #444', padding: '8px', textAlign: 'center', fontSize: '0.85em', color: '#ccc' },
    tdName: { border: '1px solid #444', padding: '8px', whiteSpace: 'nowrap', fontWeight: 'bold', backgroundColor: '#2a2a2a', color: '#fff', position: 'sticky', left: 0 },
    patternLabel: { fontSize: '0.7em', color: '#82ca9d', marginTop: '5px', letterSpacing: '1px', fontWeight: 'bold' },
    legend: { backgroundColor: '#1a1a1a', borderBottom: '1px solid #444' }
};

const styles: Record<string, React.CSSProperties> = {
    root: { minHeight: '100vh', backgroundColor: '#121212', color: '#fff', padding: '40px' },
    center: { textAlign: 'center', paddingTop: '100px' },
    container: { maxWidth: '1000px', margin: '0 auto', backgroundColor: '#2c2c2c', padding: '30px', borderRadius: '12px' },
    headerContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    header: { margin: 0 },
    backButton: { padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    toggleBtn: { padding: '10px 15px', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s' },
    warning: { padding: '10px', backgroundColor: 'rgba(255,193,7,0.1)', color: '#ffc107', borderRadius: '5px', marginBottom: '20px', textAlign: 'center' },
    statsRow: { display: 'flex', gap: '20px', marginBottom: '30px' },
    statCard: { flex: 1, backgroundColor: '#333', padding: '20px', borderRadius: '10px', border: '1px solid #444', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' },
    statLabel: { fontSize: '0.9em', color: '#aaa', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' },
    statValue: { fontSize: '2em', fontWeight: 'bold', color: '#82ca9d', marginBottom: '5px' },
    statSub: { fontSize: '0.75em', color: '#888' },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
    modal: { backgroundColor: '#2c2c2c', color: '#fff', padding: '30px', borderRadius: '12px', width: '500px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' },
};

const calStyles: Record<string, React.CSSProperties> = {
    container: { border: '1px solid #555', borderRadius: '8px', overflow: 'hidden' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: '#333' },
    navBtn: { padding: '5px 15px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' },
    weekday: { textAlign: 'center', padding: '10px', backgroundColor: '#222', fontWeight: 'bold', border: '1px solid #444' },
    day: { minHeight: '100px', padding: '5px', border: '1px solid #444', display: 'flex', flexDirection: 'column' },
    empty: { backgroundColor: '#222', border: '1px solid #444' },
    dayNum: { fontWeight: 'bold', marginBottom: '5px' },
    shifts: { display: 'flex', flexDirection: 'column', gap: '3px' },
    indicator: { fontSize: '0.75em', padding: '2px 4px', borderRadius: '3px', textAlign: 'center' }
};
