"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface CompetencyDetail {
    grade: number;
    date_achieved: string;
}

interface CompetencyData {
    user_id: string;
    name?: string;
    proficiency_grade: number;
    team: number;
    [competencyName: string]: string | number | CompetencyDetail | undefined | null;
}

interface CompetencyInfoPopupProps {
    name: string;
    info: CompetencyDetail;
    position: { top: number; left: number };
    onClose: () => void;
}

const CompetencyInfoPopup: React.FC<CompetencyInfoPopupProps> = ({ name, info, position, onClose }) => {
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    return (
        <div ref={popupRef} style={{ ...styles.popup, top: position.top, left: position.left }}>
            <h4>{name}</h4>
            <p><strong>Grade:</strong> {info.grade}</p>
            <p><strong>Date Achieved:</strong> {new Date(info.date_achieved).getFullYear()}/{new Date(info.date_achieved).getMonth() + 1}/{new Date(info.date_achieved).getDate()}</p>
            <button onClick={onClose} style={styles.popupCloseButton}>Close</button>
        </div>
    );
};


// Fixed list of competency columns (must match the API's COMPETENCY_COLUMNS)
const COMPETENCY_COLUMNS_LIST = [
    "East Control", "West Control", "VTIS East", "VTIS West", "Keppel Control",
    "Sembawang Control", "Pasir Panjang Control", "Jurong Control", "VTIS Central",
    "Sembawang Control MTC", "Pasir Panjang Control MTC", "VTIC MTC", "PSU",
    "STW(PB)", "GMDSS", "Vista DO"
];


const user_id_col_width = 120; // px
const proficiency_grade_col_width = 80; // px
const team_col_width = 80; // px
const default_competency_col_width = 150; // px

interface ModifyCompetencyModalProps {
    onClose: () => void;
    onSave: () => void;
    users: { user_id: string; name?: string }[]; // List of users for dropdown
}

const ModifyCompetencyModal: React.FC<ModifyCompetencyModalProps> = ({ onClose, onSave, users }) => {
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [selectedConsole, setSelectedConsole] = useState<string>('');
    const [grade, setGrade] = useState<number | ''>('');
    const [dateAchieved, setDateAchieved] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState<string>(''); // For searchable dropdown

    const filteredUsers = users.filter(user =>
        user.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        if (filteredUsers.length > 0) {
            setSelectedUserId(filteredUsers[0].user_id);
        } else {
            setSelectedUserId('');
        }
    }, [filteredUsers]);

    useEffect(() => {
        if (COMPETENCY_COLUMNS_LIST.length > 0 && !selectedConsole) {
            setSelectedConsole(COMPETENCY_COLUMNS_LIST[0]);
        }
    }, [selectedConsole]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSaving(true);

        if (!selectedUserId || !selectedConsole || grade === '' || !dateAchieved) {
            setError('All fields are required.');
            setIsSaving(false);
            return;
        }

        try {
            const response = await fetch('/api/competencies/modify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: selectedUserId,
                    console: selectedConsole,
                    grade: Number(grade),
                    date_achieved: dateAchieved,
                }),
            });

            const result = await response.json();
            if (result.success) {
                onSave(); // Refresh parent table
                onClose(); // Close modal
            } else {
                setError(result.message || 'Failed to save competency.');
            }
        } catch (err: any) {
            console.error("Failed to save competency:", err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={modalStyles.overlay}>
            <div style={modalStyles.modal}>
                <h2>Modify Competency</h2>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div style={modalStyles.inputGroup}>
                        <label>Search User:</label>
                        <input
                            type="text"
                            placeholder="Type to search user_id or name"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={modalStyles.input}
                        />
                    </div>
                    <div style={modalStyles.inputGroup}>
                        <label>User ID:</label>
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            style={modalStyles.input}
                            disabled={isSaving || filteredUsers.length === 0}
                        >
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(user => (
                                    <option key={user.user_id} value={user.user_id}>{user.user_id} ({user.name || 'No Name'})</option>
                                ))
                            ) : (
                                <option value="">No users found</option>
                            )}
                        </select>
                    </div>
                    <div style={modalStyles.inputGroup}>
                        <label>Console:</label>
                        <select
                            value={selectedConsole}
                            onChange={(e) => setSelectedConsole(e.target.value)}
                            style={modalStyles.input}
                            disabled={isSaving}
                        >
                            {COMPETENCY_COLUMNS_LIST.map(consoleName => (
                                <option key={consoleName} value={consoleName}>{consoleName}</option>
                            ))}
                        </select>
                    </div>
                    <div style={modalStyles.inputGroup}>
                        <label>Grade:</label>
                        <input
                            type="number"
                            value={grade}
                            onChange={(e) => setGrade(Number(e.target.value))}
                            style={modalStyles.input}
                            min="1" max="9"
                            required
                            disabled={isSaving}
                        />
                    </div>
                    <div style={modalStyles.inputGroup}>
                        <label>Date Achieved:</label>
                        <input
                            type="date"
                            value={dateAchieved}
                            onChange={(e) => setDateAchieved(e.target.value)}
                            style={modalStyles.input}
                            required
                            disabled={isSaving}
                        />
                    </div>
                    <div style={modalStyles.buttonGroup}>
                        <button type="submit" style={modalStyles.saveButton} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Competency'}
                        </button>
                        <button type="button" onClick={onClose} style={modalStyles.cancelButton} disabled={isSaving}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


interface DeleteCompetencyModalProps {
    onClose: () => void;
    onDelete: () => void;
    users: { user_id: string; name?: string }[];
}

const DeleteCompetencyModal: React.FC<DeleteCompetencyModalProps> = ({ onClose, onDelete, users }) => {
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [userCompetencies, setUserCompetencies] = useState<Array<{ console: string; grade: number; date_achieved: string }>>([]);
    const [selectedCompetenciesToDelete, setSelectedCompetenciesToDelete] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [isLoadingCompetencies, setIsLoadingCompetencies] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredUsers = users.filter(user =>
        user.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        if (filteredUsers.length > 0) {
            setSelectedUserId(filteredUsers[0].user_id);
        } else if (filteredUsers.length === 0) {
            setSelectedUserId('');
        }
    }, [filteredUsers]);

    useEffect(() => {
        const loadCompetencies = async () => {
            if (selectedUserId) {
                setIsLoadingCompetencies(true);
                setError(null);
                try {
                    // Call the new dedicated API endpoint
                    const response = await fetch(`/api/competencies/user/${selectedUserId}`);
                    const result = await response.json();
                    if (result.success) {
                        setUserCompetencies(result.competencies);
                        setSelectedCompetenciesToDelete(new Set()); // Reset selections
                    } else {
                        throw new Error(result.message || 'Failed to load user competencies.');
                    }
                } catch (err: any) {
                    setError(err.message || 'Failed to load user competencies.');
                    setUserCompetencies([]);
                } finally {
                    setIsLoadingCompetencies(false);
                }
            } else {
                setUserCompetencies([]); // Clear competencies if no user is selected
            }
        };
        loadCompetencies();
    }, [selectedUserId]);

    const handleSelectCompetency = (consoleName: string) => {
        setSelectedCompetenciesToDelete(prev => {
            const newSet = new Set(prev);
            if (newSet.has(consoleName)) {
                newSet.delete(consoleName);
            } else {
                newSet.add(consoleName);
            }
            return newSet;
        });
    };

    const handleDelete = async () => {
        setError(null);
        setIsDeleting(true);

        if (selectedCompetenciesToDelete.size === 0) {
            setError('Please select at least one competency to delete.');
            setIsDeleting(false);
            return;
        }

        try {
            const response = await fetch('/api/competencies/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: selectedUserId,
                    consoles: Array.from(selectedCompetenciesToDelete),
                }),
            });

            const result = await response.json();
            if (result.success) {
                onDelete(); // Refresh parent table
                onClose(); // Close modal
            } else {
                setError(result.message || 'Failed to delete competencies.');
            }
        } catch (err: any) {
            console.error("Failed to delete competencies:", err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div style={modalStyles.overlay}>
            <div style={modalStyles.modal}>
                <h2>Delete Competency</h2>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <div style={modalStyles.inputGroup}>
                    <label>Search User:</label>
                    <input
                        type="text"
                        placeholder="Type to search user_id or name"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={modalStyles.input}
                    />
                </div>
                <div style={modalStyles.inputGroup}>
                    <label>User ID:</label>
                    <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        style={modalStyles.input}
                        disabled={isDeleting || filteredUsers.length === 0}
                    >
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map(user => (
                                <option key={user.user_id} value={user.user_id}>{user.user_id} ({user.name || 'No Name'})</option>
                            ))
                        ) : (
                            <option value="">No users found</option>
                        )}
                    </select>
                </div>

                <h3>Competencies for {selectedUserId || 'selected user'}:</h3>
                {isLoadingCompetencies ? (
                    <p>Loading competencies...</p>
                ) : userCompetencies.length > 0 ? (
                    <div style={modalStyles.competencyList}>
                        {userCompetencies.map(comp => (
                            <label key={comp.console} style={modalStyles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={selectedCompetenciesToDelete.has(comp.console)}
                                    onChange={() => handleSelectCompetency(comp.console)}
                                    disabled={isDeleting}
                                />
                                {comp.console} (Grade: {comp.grade}, Achieved: {new Date(comp.date_achieved).toLocaleDateString()})
                            </label>
                        ))}
                    </div>
                ) : (
                    <p>No competencies found for this user.</p>
                )}

                <div style={modalStyles.buttonGroup}>
                    <button type="button" onClick={handleDelete} style={modalStyles.deleteButton} disabled={isDeleting || selectedCompetenciesToDelete.size === 0}>
                        {isDeleting ? 'Deleting...' : 'Delete Selected'}
                    </button>
                    <button type="button" onClick={onClose} style={modalStyles.cancelButton} disabled={isDeleting}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

const getGradientStyle = (value: number, min: number, max: number): React.CSSProperties => {
    if (max === min) {
        return { backgroundColor: value > 0 ? 'hsl(120, 40%, 80%)' : 'hsl(0, 40%, 80%)', color: 'black', fontWeight: 'bold' };
    }

    const percentage = max > min ? (value - min) / (max - min) : 0;
    const hue = percentage * 120; // 0 is red, 120 is green

    return { 
        backgroundColor: `hsl(${hue}, 40%, 80%)`, 
        color: 'black', // Black text for better contrast on pastel colors
        fontWeight: 'bold',
    };
};


const TeamComparisonView: React.FC<{
    groupedByTeam: Record<number, CompetencyData[]>;
    columns: string[];
    sortedTeamIds: number[];
    calculateTeamTally: (teamData: CompetencyData[]) => Record<string, string | number>;
}> = ({ groupedByTeam, columns, sortedTeamIds, calculateTeamTally }) => {
    
    const competencyColumns = columns.filter(c => !['user_id', 'proficiency_grade', 'team'].includes(c));

    const comparisonData = competencyColumns.map(competency => {
        const rowData: { [key: string]: string | number } = { competency };
        let total = 0;
        const teamTallies: number[] = [];

        sortedTeamIds.forEach(teamId => {
            const teamTally = calculateTeamTally(groupedByTeam[teamId]);
            const tallyValue = teamTally[competency] as number;
            rowData[`team${teamId}`] = tallyValue;
            teamTallies.push(tallyValue);
            total += tallyValue;
        });

        (rowData as any).min = Math.min(...teamTallies);
        (rowData as any).max = Math.max(...teamTallies);
        rowData['total'] = total;
        return rowData;
    });

    return (
        <div style={styles.tableContainer}>
            <table style={{ ...styles.table, minWidth: '100%' }}>
                <thead>
                    <tr>
                        <th style={{ ...styles.tableHeader, ...styles.stickyColumn, left: 0, minWidth: default_competency_col_width }}>Competency</th>
                        {sortedTeamIds.map(teamId => (
                            <th key={teamId} style={{...styles.tableHeader, textAlign: 'center' }}>Team {teamId}</th>
                        ))}
                        <th style={{...styles.tableHeader, textAlign: 'center' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {comparisonData.map(row => (
                        <tr key={row.competency}>
                            <td style={{ ...styles.tableCell, ...styles.stickyColumn, left: 0, minWidth: default_competency_col_width, fontWeight: 'bold' }}>{row.competency}</td>
                            {sortedTeamIds.map(teamId => {
                                const tallyValue = row[`team${teamId}`] as number;
                                const { min, max } = row as any;
                                const cellStyle = {
                                    ...styles.tableCell,
                                    textAlign: 'center',
                                    ...getGradientStyle(tallyValue, min, max),
                                };
                                return (
                                    <td key={`${row.competency}-team${teamId}`} style={cellStyle}>
                                        {tallyValue}
                                    </td>
                                );
                            })}
                            <td style={{...styles.tableCell, textAlign: 'center', fontWeight: 'bold' }}>{row.total}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const CompetenciesPage: React.FC = () => {
    const [tableData, setTableData] = useState<CompetencyData[]>([]);
    const [usersForDropdown, setUsersForDropdown] = useState<{ user_id: string; name?: string }[]>([]);
    const [allUsers, setAllUsers] = useState<{ user_id: string; name?: string }[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [popupInfo, setPopupInfo] = useState<{ name: string; info: CompetencyDetail; position: { top: number, left: number } } | null>(null);
    const [activeTab, setActiveTab] = useState('breakdown');
    const router = useRouter();
    const tableRef = useRef<HTMLTableElement>(null);

    const handleCellClick = (event: React.MouseEvent<HTMLTableCellElement>, competency: CompetencyData[string], userName?: string) => {
        if (competency && typeof competency === 'object' && userName) {
            const rect = event.currentTarget.getBoundingClientRect();
            setPopupInfo({
                name: userName,
                info: competency as CompetencyDetail,
                position: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX },
            });
        }
    };

    const handleClosePopup = () => {
        setPopupInfo(null);
    };

    const fetchAllUsers = async () => {
        try {
            const response = await fetch('/api/users/all');
            const result = await response.json();
            if (result.success) {
                setAllUsers(result.data);
            } else {
                setError(result.message || 'Failed to fetch users.');
            }
        } catch (err: any) {
            console.error("Failed to fetch all users:", err);
            setError(err.message || 'An unexpected error occurred while fetching users.');
        }
    };

    const fetchCompetencies = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/competencies');
            const result = await response.json();

            if (result.success) {
                setTableData(result.data);
                const uniqueUsers = Array.from(new Map(result.data.map((user: CompetencyData) =>
                    [user.user_id, { user_id: user.user_id, name: user.name }]
                )).values());
                setUsersForDropdown(uniqueUsers as { user_id: string; name?: string }[]);
                setColumns(result.columns.filter((col: string) => col !== 'name'));
            } else {
                setError(result.message || 'Failed to fetch competencies data.');
            }
        } catch (err: any) {
            console.error("Failed to fetch competencies:", err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCompetencies();
        fetchAllUsers();
    }, []);

    useEffect(() => {
        const closeOnEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClosePopup();
            }
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, []);

    if (isLoading) {
        return (
            <div style={styles.container}>
                <h1 style={styles.header}>Loading Staff Competencies...</h1>
                <p style={styles.loadingText}>Please wait while we fetch the data.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <h1 style={styles.header}>Error</h1>
                <p style={{ color: 'red' }}>{error}</p>
            </div>
        );
    }

    // Grouping by team
    const groupedByTeam: Record<number, CompetencyData[]> = tableData.reduce((acc, row) => {
        const teamId = row.team || 0;
        if (!acc[teamId]) {
            acc[teamId] = [];
        }
        acc[teamId].push(row);
        return acc;
    }, {} as Record<number, CompetencyData[]>);

    const sortedTeamIds = Object.keys(groupedByTeam).map(Number).sort((a, b) => a - b);

    // Calculate tally for each team
    const calculateTeamTally = (teamData: CompetencyData[]) => {
        const tally: Record<string, string | number> = {};
        columns.forEach(col => {
            if (col === 'user_id') {
                tally[col] = 'Tally';
            } else if (col === 'proficiency_grade' || col === 'team') {
                tally[col] = ''; // No grade/team for tally row
            } else {
                tally[col] = teamData.filter(row => row[col] && typeof row[col] === 'object').length;
            }
        });
        return tally;
    };

    // Calculate minWidth for the table dynamically
    const calculateMinTableWidth = () => {
        let totalWidth = user_id_col_width + proficiency_grade_col_width + team_col_width; // Fixed columns
        totalWidth += (columns.length - 3) * default_competency_col_width; // Dynamic competency columns (assuming 3 fixed cols)
        return `${Math.max(800, totalWidth)}px`; // Minimum 800px or calculated width
    };

    return (
        <div style={styles.container}>
            {popupInfo && (
                <CompetencyInfoPopup
                    name={popupInfo.name}
                    info={popupInfo.info}
                    position={popupInfo.position}
                    onClose={handleClosePopup}
                />
            )}
            <h1 style={styles.header}>Staff Competencies Matrix</h1>
            <div style={styles.actionButtons}>
                <button style={styles.topBackButton} onClick={() => router.push('/home')}>
                    Back to Home
                </button>
                <div>
                    <button style={styles.modifyButton} onClick={() => setIsModifyModalOpen(true)}>
                        Modify Competency
                    </button>
                    <button style={styles.deleteButton} onClick={() => setIsDeleteModalOpen(true)}>
                        Delete Competency
                    </button>
                </div>
            </div>

            <div style={styles.tabsContainer}>
                <button
                    style={activeTab === 'breakdown' ? styles.activeTab : styles.tab}
                    onClick={() => setActiveTab('breakdown')}
                >
                    Team Breakdown
                </button>
                <button
                    style={activeTab === 'comparison' ? styles.activeTab : styles.tab}
                    onClick={() => setActiveTab('comparison')}
                >
                    Team Comparison
                </button>
            </div>

            {activeTab === 'breakdown' && (
                <div style={styles.tableContainer}>
                    <table ref={tableRef} style={{ ...styles.table, minWidth: calculateMinTableWidth() }}>
                        <thead>
                            <tr>
                                {columns.map((col, index) => {
                                    let colStyle: React.CSSProperties = { ...styles.tableHeader };
                                    if (col === 'user_id') {
                                        colStyle = { ...colStyle, ...styles.stickyColumn, left: 0, minWidth: user_id_col_width, width: user_id_col_width };
                                    } else if (col === 'proficiency_grade') {
                                        colStyle = { ...colStyle, ...styles.stickyColumn, left: user_id_col_width, minWidth: proficiency_grade_col_width, width: proficiency_grade_col_width, textAlign: 'center' };
                                    } else if (col === 'team') {
                                        colStyle = { ...colStyle, ...styles.stickyColumn, left: user_id_col_width + proficiency_grade_col_width, minWidth: team_col_width, width: team_col_width, textAlign: 'center' };
                                    } else {
                                        colStyle = { ...colStyle, minWidth: default_competency_col_width };
                                    }
                                    return (
                                        <th key={col} style={colStyle}>
                                            {col.replace(/_/g, ' ')}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTeamIds.map(teamId => (
                                <React.Fragment key={teamId}>
                                    <tr style={styles.teamHeaderRow}>
                                        <td colSpan={columns.length} style={styles.teamHeaderCell}>
                                            Team {teamId}
                                        </td>
                                    </tr>
                                    {groupedByTeam[teamId].map(row => (
                                        <tr key={row.user_id}>
                                            {columns.map((col, index) => {
                                                const isCompetencyColumn = !['user_id', 'proficiency_grade', 'team'].includes(col);
                                                let cellStyle: React.CSSProperties = { ...styles.tableCell };
                                                if (col === 'user_id') {
                                                    cellStyle = { ...cellStyle, ...styles.stickyColumn, left: 0, minWidth: user_id_col_width, width: user_id_col_width, fontWeight: 'bold' };
                                                } else if (col === 'proficiency_grade') {
                                                    cellStyle = { ...cellStyle, ...styles.stickyColumn, left: user_id_col_width, minWidth: proficiency_grade_col_width, width: proficiency_grade_col_width, textAlign: 'center' };
                                                } else if (col === 'team') {
                                                    cellStyle = { ...cellStyle, ...styles.stickyColumn, left: user_id_col_width + proficiency_grade_col_width, minWidth: team_col_width, width: team_col_width, textAlign: 'center' };
                                                } else {
                                                    cellStyle = { ...cellStyle, minWidth: default_competency_col_width, cursor: row[col] ? 'pointer' : 'default', textAlign: 'center' };
                                                }
                                                
                                                const cellContent = isCompetencyColumn
                                                    ? (row[col] ? '✓' : '')
                                                    : row[col];

                                                return (
                                                    <td 
                                                        key={`${row.user_id}-${col}`} 
                                                        style={cellStyle} 
                                                        onClick={(e) => isCompetencyColumn && handleCellClick(e, row[col], row.name)}
                                                    >
                                                        {cellContent}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                    <tr style={styles.tallyRow}>
                                        {columns.map((col, index) => {
                                            let tallyCellStyle: React.CSSProperties = { ...styles.tallyCell };
                                            if (col === 'user_id') {
                                                tallyCellStyle = { ...tallyCellStyle, ...styles.stickyColumn, left: 0, minWidth: user_id_col_width, width: user_id_col_width };
                                            } else if (col === 'proficiency_grade') {
                                                tallyCellStyle = { ...tallyCellStyle, ...styles.stickyColumn, left: user_id_col_width, minWidth: proficiency_grade_col_width, width: proficiency_grade_col_width, textAlign: 'center' };
                                            } else if (col === 'team') {
                                                tallyCellStyle = { ...tallyCellStyle, ...styles.stickyColumn, left: user_id_col_width + proficiency_grade_col_width, minWidth: team_col_width, width: team_col_width, textAlign: 'center' };
                                            } else {
                                                tallyCellStyle = { ...tallyCellStyle, minWidth: default_competency_col_width, textAlign: 'center' };
                                            }
                                            return (
                                                <td key={`tally-${teamId}-${col}`} style={tallyCellStyle}>
                                                    {calculateTeamTally(groupedByTeam[teamId])[col]}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'comparison' && (
                <TeamComparisonView
                    groupedByTeam={groupedByTeam}
                    columns={columns}
                    sortedTeamIds={sortedTeamIds}
                    calculateTeamTally={calculateTeamTally}
                />
            )}

            <button style={styles.backButton} onClick={() => router.push('/home')}>
                Back to Home
            </button>
            {isModifyModalOpen && (
                <ModifyCompetencyModal
                    onClose={() => setIsModifyModalOpen(false)}
                    onSave={fetchCompetencies}
                    users={allUsers}
                />
            )}
            {isDeleteModalOpen && (
                <DeleteCompetencyModal
                    onClose={() => setIsDeleteModalOpen(false)}
                    onDelete={fetchCompetencies}
                    users={allUsers}
                />
            )}
        </div>
    );
};

const modalStyles: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modal: {
        backgroundColor: '#2c2c2c',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        width: '400px',
        maxWidth: '90%',
        color: '#fff',
        position: 'relative',
    },
    inputGroup: {
        marginBottom: '15px',
    },
    input: {
        width: '100%',
        padding: '10px',
        marginTop: '5px',
        borderRadius: '5px',
        border: '1px solid #555',
        backgroundColor: '#3b3b3b',
        color: '#fff',
    },
    buttonGroup: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        marginTop: '20px',
    },
    saveButton: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: '#405de6',
    },
    cancelButton: {
        padding: '10px 20px',
        border: '1px solid #555',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        backgroundColor: 'transparent',
        color: '#fff',
    },
    competencyList: {
        marginTop: '15px',
        maxHeight: '200px',
        overflowY: 'auto',
        border: '1px solid #555',
        borderRadius: '5px',
        padding: '10px',
        backgroundColor: '#3b3b3b',
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '8px',
        cursor: 'pointer',
    },
    deleteButton: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: '#e64040', // Red color for delete
    },
};


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
    loadingText: {
        textAlign: 'center',
        fontSize: '1.2em',
        color: '#ccc',
    },
    actionButtons: {
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    topBackButton: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: '#405de6', // A distinct color
        transition: 'background-color 0.3s ease',
    },
    modifyButton: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: '#5851db', // A distinct color
        transition: 'background-color 0.3s ease',
        marginLeft: '10px', // Spacing between modify and delete
    },
    deleteButton: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: '#e64040', // Red color for delete
        marginLeft: '10px',
    },
    tableContainer: {
        overflowX: 'auto',
        marginBottom: '20px',
        backgroundColor: '#2c2c2c',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        // minWidth handled dynamically
    },
    tableHeader: {
        backgroundColor: '#3b3b3b',
        color: '#fff',
        padding: '12px 15px',
        border: '1px solid #555',
        textAlign: 'left',
        whiteSpace: 'nowrap',
        zIndex: 20, // Ensure header is above scrolling content
    },
    tableCell: {
        padding: '10px 15px',
        border: '1px solid #555',
        textAlign: 'left',
        whiteSpace: 'nowrap',
    },
    stickyColumn: {
        position: 'sticky',
        backgroundColor: '#2c2c2c', // Ensure it has a background
        zIndex: 15, // Higher than regular cells but lower than header
    },
    narrowColumn: {
        width: '80px', // Adjust as needed
        textAlign: 'center',
    },
    teamHeaderRow: {
        backgroundColor: '#4a4a4a',
    },
    teamHeaderCell: {
        padding: '15px',
        border: '1px solid #555',
        textAlign: 'left',
        fontSize: '1.4em',
        fontWeight: 'bold',
        color: '#fff',
    },
    tallyRow: {
        backgroundColor: '#3b3b3b',
        fontWeight: 'bold',
    },
    tallyCell: {
        padding: '10px 15px',
        border: '1px solid #555',
        textAlign: 'left',
        whiteSpace: 'nowrap',
        color: '#82ca9d', // Highlight tally cells
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
    popup: {
        position: 'fixed',
        backgroundColor: '#3b3b3b',
        border: '1px solid #555',
        borderRadius: '8px',
        padding: '15px',
        zIndex: 1100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        color: '#fff',
    },
    popupCloseButton: {
        marginTop: '10px',
        padding: '5px 10px',
        border: '1px solid #555',
        borderRadius: '5px',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        color: '#fff',
    },
    tabsContainer: {
        marginBottom: '20px',
        borderBottom: '1px solid #555',
    },
    tab: {
        padding: '10px 20px',
        border: 'none',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        color: '#ccc',
        fontSize: '1em',
        fontWeight: 'bold',
    },
    activeTab: {
        padding: '10px 20px',
        border: 'none',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        color: '#fff',
        fontSize: '1em',
        fontWeight: 'bold',
        borderBottom: '2px solid #405de6',
    },
};

export default CompetenciesPage;