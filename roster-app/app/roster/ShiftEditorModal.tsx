import React, { useState, useEffect, useMemo } from 'react';
import ExportDayShiftButton from './ExportDayShiftButton';

// --- INTERFACES ---
interface UserDetails {
    user_id: string;
    name: string;
    team: number;
    proficiency_grade: number;
}

interface WorkerAssignment {
    user_id: string;
    assigned_console?: string;
    is_ojt?: boolean;
}

interface ShiftDetails {
    Morning: WorkerAssignment[];
    Afternoon: WorkerAssignment[];
    Night: WorkerAssignment[];
}

interface LeaveDetail {
    user_id: string;
    leave_type: string;
    sub_leave_type?: string;
}

interface ShiftData {
    date: string;
    East: ShiftDetails;
    West: ShiftDetails;
    leaves?: LeaveDetail[];
}

interface ModalProps {
    shiftData: ShiftData;
    onClose: () => void;
    onSave: (data: ShiftData) => void;
}

// --- CONSTANTS ---
const COMPETENCIES = [
    "East Control", "West Control", "Keppel", "Cruisebay",
    "VTIS East", "VTIS West", "VTIS Central", "Sembawang Control",
    "Jurong Control", "Pasir Panjang Control", "Sembawang MTC",
    "Pasir Panjang MTC", "VTIS MTC", "PSU", "Temasek MTC",
    "GMDSS", "STW (PB)", "Vista DO/ Sensitive Vessels",
    "STW (TU)", "Changi DO", "Watch IC Console"
];

// --- SUB-COMPONENT: ShiftLane ---
const ShiftLane: React.FC<any> = ({ location, shiftType, workers, userLookup, onRemove, onAdd, availableUsers }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedConsole, setSelectedConsole] = useState(COMPETENCIES[0]);
    const [isOjtMode, setIsOjtMode] = useState(false);

    const filteredUsers = searchTerm
        ? availableUsers.filter((user: any) => 
            (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (user.user_id?.toLowerCase() || '').includes(searchTerm.toLowerCase())
          ).slice(0, 5) // Limit to 5 results
        : [];

    const handleAdd = (user: UserDetails) => {
        onAdd(location, shiftType, user.user_id, selectedConsole, isOjtMode);
        setSearchTerm('');
    };

    // Split workers into categories
    const assignedWorkers = useMemo(() => workers.filter((w: any) => !w.is_ojt && w.assigned_console !== 'Reserve' && w.assigned_console !== 'OFF'), [workers]);
    const reserveWorkers = useMemo(() => workers.filter((w: any) => !w.is_ojt && w.assigned_console === 'Reserve'), [workers]);
    const offWorkers = useMemo(() => workers.filter((w: any) => !w.is_ojt && w.assigned_console === 'OFF'), [workers]);
    const ojtWorkers = useMemo(() => workers.filter((w: any) => w.is_ojt), [workers]);

    // Sort workers by proficiency_grade
    const sortWorkers = (list: WorkerAssignment[]) => {
        return [...list].sort((a, b) => {
            const userA = userLookup[a.user_id];
            const userB = userLookup[b.user_id];
            return (userA?.proficiency_grade ?? -1) - (userB?.proficiency_grade ?? -1);
        });
    };

    return (
        <div style={{ marginBottom: '20px', border: '1px solid #444', padding: '15px', borderRadius: '8px', backgroundColor: '#333' }}>
            <h3 style={modalStyles.shiftHeader}>{shiftType} Shift ({location})</h3>
            
            <div style={{ marginBottom: '10px' }}>
                <h4 style={{ fontSize: '0.9em', color: '#82ca9d', marginBottom: '5px' }}>Assigned Workers:</h4>
                <div style={userListStyles.container}>
                    {assignedWorkers.length === 0 ? (
                        <p style={userListStyles.emptyText}>No users assigned.</p>
                    ) : sortWorkers(assignedWorkers).map(worker => (
                        <div key={worker.user_id} style={userListStyles.userItem}>
                            <span>
                                <strong style={{color: '#82ca9d'}}>{userLookup[worker.user_id]?.name || 'Unknown User'}</strong>
                                {` (${worker.user_id}) - T${userLookup[worker.user_id]?.team || 'N/A'}, P${userLookup[worker.user_id]?.proficiency_grade || 'N/A'}`}
                                {worker.assigned_console && <span style={{ color: '#aaa', fontStyle: 'italic' }}> ({worker.assigned_console})</span>}
                            </span>
                            <button onClick={() => onRemove(location, shiftType, worker.user_id)} style={userListStyles.removeButton}>&times;</button>
                        </div>
                    ))}
                </div>
            </div>

            {reserveWorkers.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                    <h4 style={{ fontSize: '0.9em', color: '#B8860B', marginBottom: '5px' }}>Reserve Workers:</h4>
                    <div style={{ ...userListStyles.container, border: '1px solid #B8860B' }}>
                        {sortWorkers(reserveWorkers).map(worker => (
                            <div key={worker.user_id} style={{ ...userListStyles.userItem, borderLeft: '4px solid #B8860B' }}>
                                <span>
                                    <strong style={{color: '#B8860B'}}>{userLookup[worker.user_id]?.name || 'Unknown User'}</strong>
                                    {` (${worker.user_id}) - T${userLookup[worker.user_id]?.team || 'N/A'}, P${userLookup[worker.user_id]?.proficiency_grade || 'N/A'}`}
                                </span>
                                <button onClick={() => onRemove(location, shiftType, worker.user_id)} style={userListStyles.removeButton}>&times;</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ marginBottom: '10px' }}>
                <h4 style={{ fontSize: '0.9em', color: '#B8860B', marginBottom: '5px' }}>OJT Workers:</h4>
                <div style={{ ...userListStyles.container, border: '1px dashed #B8860B' }}>
                    {ojtWorkers.length === 0 ? (
                        <p style={userListStyles.emptyText}>No OJT assigned.</p>
                    ) : sortWorkers(ojtWorkers).map(worker => (
                        <div key={worker.user_id} style={{ ...userListStyles.userItem, borderLeft: '4px solid #B8860B' }}>
                            <span>
                                <strong style={{color: '#B8860B'}}>{userLookup[worker.user_id]?.name || 'Unknown User'}</strong>
                                {` (${worker.user_id}) - T${userLookup[worker.user_id]?.team || 'N/A'}, P${userLookup[worker.user_id]?.proficiency_grade || 'N/A'}`}
                                {worker.assigned_console && <span style={{ color: '#aaa', fontStyle: 'italic' }}> ({worker.assigned_console})</span>}
                            </span>
                            <button onClick={() => onRemove(location, shiftType, worker.user_id)} style={userListStyles.removeButton}>&times;</button>
                        </div>
                    ))}
                </div>
            </div>

            {offWorkers.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                    <h4 style={{ fontSize: '0.9em', color: '#6c757d', marginBottom: '5px' }}>OFF (Pattern):</h4>
                    <div style={{ ...userListStyles.container, border: '1px solid #6c757d' }}>
                        {sortWorkers(offWorkers).map(worker => (
                            <div key={worker.user_id} style={{ ...userListStyles.userItem, borderLeft: '4px solid #6c757d' }}>
                                <span>
                                    <strong style={{color: '#6c757d'}}>{userLookup[worker.user_id]?.name || 'Unknown User'}</strong>
                                    {` (${worker.user_id}) - T${userLookup[worker.user_id]?.team || 'N/A'}, P${userLookup[worker.user_id]?.proficiency_grade || 'N/A'}`}
                                </span>
                                <button onClick={() => onRemove(location, shiftType, worker.user_id)} style={userListStyles.removeButton}>&times;</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 2, position: 'relative', minWidth: '200px' }}>
                    <input
                        type="text"
                        placeholder="Search user..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={modalStyles.inputField} 
                    />
                    {searchTerm && (
                        <div style={dropdownStyles.container}>
                            {filteredUsers.length > 0 ? filteredUsers.map((user: any) => (
                                <div key={user.user_id} style={dropdownStyles.item} onClick={() => handleAdd(user)}>
                                    {user.name} ({user.user_id}) - T{user.team}, P{user.proficiency_grade}
                                </div>
                            )) : <div style={{...dropdownStyles.item, cursor: 'default'}}>No available users found.</div>}
                        </div>
                    )}
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                    <select 
                        value={selectedConsole} 
                        onChange={(e) => setSelectedConsole(e.target.value)}
                        style={modalStyles.inputField}
                    >
                        {COMPETENCIES.map(comp => (
                            <option key={comp} value={comp}>{comp}</option>
                        ))}
                    </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ffc658' }}>
                    <input 
                        type="checkbox" 
                        id={`ojt-checkbox-${location}-${shiftType}`}
                        checked={isOjtMode}
                        onChange={(e) => setIsOjtMode(e.target.checked)}
                        style={{ width: '18px', height: '18px' }}
                    />
                    <label htmlFor={`ojt-checkbox-${location}-${shiftType}`} style={{ fontWeight: 'bold' }}>OJT</label>
                </div>
            </div>
        </div>
    );
};

interface ReplacementContext {
    location: 'East' | 'West';
    shiftType: keyof ShiftDetails;
    userId: string;
    console?: string;
    proficiency: number;
}

interface ReplacementCandidate {
    user_id: string;
    proficiency_grade: number;
    reserve_deploy_count: number;
    name?: string;
}

interface CategorizedCandidates {
    [category: string]: ReplacementCandidate[];
}

// --- SUB-COMPONENT: ReplacementSelector ---
const ReplacementSelector: React.FC<{
    context: ReplacementContext;
    userLookup: Record<string, UserDetails>;
    onSelect: (replacementId: string | null) => void;
    onCancel: () => void;
    date: string;
}> = ({ context, userLookup, onSelect, onCancel, date }) => {
    const [categorized, setCategorized] = useState<CategorizedCandidates | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReplacements = async () => {
            try {
                const res = await fetch('/api/users/find-replacements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        date: date,
                        min_proficiency_grade: context.proficiency,
                        required_console: context.console
                    }),
                });
                const result = await res.json();
                if (result.success) {
                    setCategorized(result.data);
                }
            } catch (error) {
                console.error("Error fetching replacements:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchReplacements();
    }, [context, date]);

    return (
        <div style={{ ...modalStyles.backdrop, zIndex: 2000 }}>
            <div style={{ ...modalStyles.modal, maxWidth: '600px', zIndex: 2001 }}>
                <h3 style={modalStyles.header}>Select Replacement for {userLookup[context.userId]?.name || context.userId}</h3>
                <p style={{ marginBottom: '20px', color: '#ccc' }}>
                    Role: {context.console || 'Reserve'} | Shift: {context.shiftType} ({context.location})
                </p>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <button 
                        onClick={() => onSelect(null)} 
                        style={{ ...modalStyles.saveButton, backgroundColor: '#dc3545', flex: 1 }}
                    >
                        Proceed Without Replacement
                    </button>
                    <button onClick={onCancel} style={{ ...modalStyles.cancelButton, flex: 1 }}>Cancel</button>
                </div>

                {isLoading ? <p>Loading candidates...</p> : (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {categorized && Object.entries(categorized).map(([category, list]) => (
                            list.length > 0 && (
                                <div key={category} style={{ marginBottom: '15px', backgroundColor: '#333', padding: '10px', borderRadius: '6px' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#B8860B', borderBottom: '1px solid #444', paddingBottom: '5px' }}>{category}</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        {list.map(c => (
                                            <div key={c.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px', borderBottom: '1px solid #444' }}>
                                                <span>
                                                    <strong>{userLookup[c.user_id]?.name || c.user_id}</strong> (P{c.proficiency_grade}, D{c.reserve_deploy_count || 0})
                                                </span>
                                                <button 
                                                    onClick={() => onSelect(c.user_id)} 
                                                    style={{ ...modalStyles.saveButton, padding: '5px 10px', fontSize: '0.8em' }}
                                                >
                                                    Select
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        ))}
                        {(!categorized || Object.values(categorized).every(l => l.length === 0)) && <p>No suitable replacements found.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT: ShiftEditorModal ---
const ShiftEditorModal: React.FC<ModalProps> = ({ shiftData, onClose, onSave }) => {
    const [activeLocation, setActiveLocation] = useState<'East' | 'West'>('East');
    const [shifts, setShifts] = useState<ShiftData>(shiftData);
    const [allUsers, setAllUsers] = useState<UserDetails[]>([]);
    const [userLookup, setUserLookup] = useState<Record<string, UserDetails>>({});
    const [replacementContext, setReplacementContext] = useState<ReplacementContext | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/users/all');
                const result = await res.json();
                if (result.success) {
                    setAllUsers(result.data);
                    const lookup = result.data.reduce((acc, user) => {
                        acc[user.user_id] = user;
                        return acc;
                    }, {});
                    setUserLookup(lookup);
                } else {
                    console.error("Failed to fetch users:", result.message);
                }
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        };
        fetchUsers();
    }, []);

    const busyUsers = useMemo(() => {
        const busy = new Set<string>();
        Object.values(shifts.East).forEach(arr => arr.forEach(w => busy.add(w.user_id)));
        Object.values(shifts.West).forEach(arr => arr.forEach(w => busy.add(w.user_id)));
        shifts.leaves?.forEach(leave => busy.add(leave.user_id));
        return busy;
    }, [shifts]);

    const availableUsers = useMemo(() => {
        return allUsers.filter(user => !busyUsers.has(user.user_id));
    }, [allUsers, busyUsers]);

    const handleRemoveUserRequest = (location: 'East' | 'West', shiftType: keyof ShiftDetails, userId: string) => {
        const worker = shifts[location][shiftType].find(w => w.user_id === userId);
        if (worker) {
            setReplacementContext({
                location,
                shiftType,
                userId,
                console: worker.assigned_console,
                proficiency: userLookup[userId]?.proficiency_grade || 1
            });
        }
    };

    const handleReplacementDecision = (replacementId: string | null) => {
        if (!replacementContext) return;

        const { location, shiftType, userId, console } = replacementContext;

        setShifts(prev => {
            // 1. Create a deep clone or map-based update to remove the replacement from ANY existing role on that day
            const newEast = { ...prev.East };
            const newWest = { ...prev.West };

            const removeIdFromDetails = (details: ShiftDetails) => {
                return {
                    Morning: details.Morning.filter(w => w.user_id !== userId && w.user_id !== replacementId),
                    Afternoon: details.Afternoon.filter(w => w.user_id !== userId && w.user_id !== replacementId),
                    Night: details.Night.filter(w => w.user_id !== userId && w.user_id !== replacementId),
                };
            };

            newEast.Morning = removeIdFromDetails(newEast).Morning;
            newEast.Afternoon = removeIdFromDetails(newEast).Afternoon;
            newEast.Night = removeIdFromDetails(newEast).Night;
            newWest.Morning = removeIdFromDetails(newWest).Morning;
            newWest.Afternoon = removeIdFromDetails(newWest).Afternoon;
            newWest.Night = removeIdFromDetails(newWest).Night;

            // 2. If we have a replacement, add them to the target shift
            if (replacementId) {
                const targetLocation = location === 'East' ? newEast : newWest;
                targetLocation[shiftType].push({
                    user_id: replacementId,
                    assigned_console: console,
                    is_ojt: false
                });
            }

            return {
                ...prev,
                East: newEast,
                West: newWest
            };
        });

        setReplacementContext(null);
    };

    const handleRemoveUser = (location: 'East' | 'West', shiftType: keyof ShiftDetails, userId: string) => {
        setShifts(prev => ({
            ...prev,
            [location]: {
                ...prev[location],
                [shiftType]: prev[location][shiftType].filter(w => w.user_id !== userId),
            }
        }));
    };

    const handleAddUser = (location: 'East' | 'West', shiftType: keyof ShiftDetails, userId: string, console: string, isOjt: boolean) => {
        setShifts(prev => ({
            ...prev,
            [location]: {
                ...prev[location],
                [shiftType]: [...prev[location][shiftType], { user_id: userId, assigned_console: console, is_ojt: isOjt }],
            }
        }));
    };
    
    return (
        <div style={modalStyles.backdrop}>
            {replacementContext && (
                <ReplacementSelector 
                    context={replacementContext}
                    userLookup={userLookup}
                    date={shifts.date}
                    onSelect={handleReplacementDecision}
                    onCancel={() => setReplacementContext(null)}
                />
            )}
            <div style={modalStyles.modal}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #555', marginBottom: '20px', paddingBottom: '10px' }}>
                    <h2 style={{ ...modalStyles.header, borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>Edit Roster for {shiftData.date}</h2>
                    <ExportDayShiftButton shiftData={shifts} userLookup={userLookup} />
                </div>
                
                {shiftData.leaves && shiftData.leaves.length > 0 && (
                    <div style={modalStyles.leavesContainer}>
                        <h3 style={modalStyles.shiftHeader}>On Leave:</h3>
                        <p>{shiftData.leaves.map(leave => userLookup[leave.user_id]?.name || leave.user_id).join(', ')}</p>
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
                    {['Morning', 'Afternoon', 'Night'].map(shiftType => (
                        <ShiftLane
                            key={`${activeLocation}-${shiftType}`}
                            location={activeLocation}
                            shiftType={shiftType}
                            workers={shifts[activeLocation][shiftType as keyof ShiftDetails]}
                            userLookup={userLookup}
                            onRemove={handleRemoveUserRequest}
                            onAdd={handleAddUser}
                            availableUsers={availableUsers}
                        />
                    ))}
                </div>

                <div style={modalStyles.actions}>
                    <button onClick={onClose} style={modalStyles.cancelButton}>Cancel</button>
                    <button onClick={() => onSave(shifts)} style={modalStyles.saveButton}>Save Changes</button>
                </div>
            </div>
        </div>
    );
};

// --- STYLES ---

const modalStyles: Record<string, React.CSSProperties> = {
    backdrop: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: '#2c2c2c', color: '#fff', padding: '30px', borderRadius: '10px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)', zIndex: 1001 },
    header: { borderBottom: '1px solid #555', paddingBottom: '15px', marginBottom: '20px', color: '#1a73e8' },
    leavesContainer: { marginBottom: '20px', padding: '10px', backgroundColor: '#3b3b3b', borderRadius: '5px' },
    shiftsContainer: { display: 'grid', gridTemplateColumns: '1fr', gap: '25px', marginTop: '20px' },
    shiftHeader: { fontSize: '1.1em', marginBottom: '10px', color: '#fff', borderBottom: '1px solid #444', paddingBottom: '8px' },
    inputField: { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #555', backgroundColor: '#3b3b3b', color: '#fff', boxSizing: 'border-box' },
    actions: { marginTop: '30px', textAlign: 'right' },
    saveButton: { padding: '10px 20px', backgroundColor: '#34a853', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginLeft: '10px' },
    cancelButton: { padding: '10px 20px', backgroundColor: '#f4f4f4', color: '#333', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer' },
    tabsContainer: { display: 'flex', marginBottom: '20px', borderBottom: '1px solid #555' },
    tabButton: { padding: '10px 20px', border: 'none', backgroundColor: '#3b3b3b', color: '#fff', cursor: 'pointer', fontSize: '1em', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', transition: 'background-color 0.3s ease' },
    activeTab: { backgroundColor: '#555', fontWeight: 'bold' },
};

const userListStyles: Record<string, React.CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '5px' },
    userItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#4a4a4a', padding: '8px 12px', borderRadius: '4px' },
    removeButton: { backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' },
    emptyText: { fontStyle: 'italic', color: '#888', textAlign: 'center', padding: '10px 0' },
};

const dropdownStyles: Record<string, React.CSSProperties> = {
    container: { position: 'absolute', width: '100%', backgroundColor: '#4a4a4a', border: '1px solid #555', borderRadius: '5px', zIndex: 1002, maxHeight: '150px', overflowY: 'auto' },
    item: { padding: '10px', cursor: 'pointer', borderBottom: '1px solid #555' },
};

export default ShiftEditorModal;