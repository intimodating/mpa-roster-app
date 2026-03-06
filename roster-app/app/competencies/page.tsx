"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// --- INTERFACES ---

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

interface ModifyCompetencyModalProps {
    onClose: () => void;
    onSave: () => void;
    users: { user_id: string; name?: string }[];
}

interface DeleteCompetencyModalProps {
    onClose: () => void;
    onDelete: () => void;
    users: { user_id: string; name?: string }[];
}

interface ModifyOJTModalProps {
    onClose: () => void;
    onSave: () => void;
    users: { user_id: string; name?: string }[];
}

interface DeleteOJTModalProps {
    onClose: () => void;
    onDelete: () => void;
    users: { user_id: string; name?: string }[];
}

// --- CONSTANTS ---

const COMPETENCY_COLUMNS_LIST = [
    "East Control", "West Control", "Keppel", "Cruisebay",
    "VTIS East", "VTIS West", "VTIS Central", "Sembawang Control",
    "Jurong Control", "Pasir Panjang Control", "Sembawang MTC",
    "Pasir Panjang MTC", "VTIS MTC", "PSU", "Temasek MTC",
    "GMDSS", "STW (PB)", "Vista DO/ Sensitive Vessels",
    "STW (TU)", "Changi DO", "Watch IC Console",
    "Proactive"
];

const user_id_col_width = 120;
const proficiency_grade_col_width = 80;
const team_col_width = 80;
const default_competency_col_width = 150;

// --- STYLES ---

const modalStyles: Record<string, React.CSSProperties> = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: '#2c2c2c', padding: '30px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', width: '400px', maxWidth: '90%', color: '#fff', position: 'relative' },
    inputGroup: { marginBottom: '15px' },
    input: { width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #555', backgroundColor: '#3b3b3b', color: '#fff' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
    saveButton: { padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: 'white', backgroundColor: '#405de6' },
    cancelButton: { padding: '10px 20px', border: '1px solid #555', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: 'transparent', color: '#fff' },
    competencyList: { marginTop: '15px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #555', borderRadius: '5px', padding: '10px', backgroundColor: '#3b3b3b' },
    checkboxLabel: { display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' },
    deleteButton: { padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: 'white', backgroundColor: '#e64040' },
};

const styles: Record<string, React.CSSProperties> = {
    container: { maxWidth: '1200px', margin: '40px auto', padding: '30px', backgroundColor: '#1e1e1e', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', color: '#fff', fontFamily: 'Arial, sans-serif' },
    header: { textAlign: 'center', fontSize: '2.5em', marginBottom: '30px', color: '#fff' },
    loadingText: { textAlign: 'center', fontSize: '1.2em', color: '#ccc' },
    actionButtons: { marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    topBackButton: { padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: 'white', backgroundColor: '#405de6', transition: 'background-color 0.3s ease' },
    modifyButton: { padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: 'white', backgroundColor: '#5851db', transition: 'background-color 0.3s ease', marginLeft: '10px' },
    deleteButton: { padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: 'white', backgroundColor: '#e64040', marginLeft: '10px' },
    tableContainer: { overflowX: 'auto', marginBottom: '20px', backgroundColor: '#2c2c2c', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    tableHeader: { backgroundColor: '#3b3b3b', color: '#fff', padding: '12px 15px', border: '1px solid #555', textAlign: 'left', whiteSpace: 'nowrap', zIndex: 20 },
    tableCell: { padding: '10px 15px', border: '1px solid #555', textAlign: 'left', whiteSpace: 'nowrap' },
    stickyColumn: { position: 'sticky', backgroundColor: '#2c2c2c', zIndex: 15 },
    teamHeaderRow: { backgroundColor: '#4a4a4a' },
    teamHeaderCell: { padding: '15px', border: '1px solid #555', textAlign: 'left', fontSize: '1.4em', fontWeight: 'bold', color: '#fff' },
    tallyRow: { backgroundColor: '#3b3b3b', fontWeight: 'bold' },
    tallyCell: { padding: '10px 15px', border: '1px solid #555', textAlign: 'left', whiteSpace: 'nowrap', color: '#82ca9d' },
    backButton: { display: 'block', width: 'fit-content', margin: '30px auto 0', padding: '12px 24px', border: '1px solid #555', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: 'transparent', color: '#fff', fontSize: '1em', transition: 'background-color 0.3s ease, color 0.3s ease' },
    popup: { position: 'fixed', backgroundColor: '#3b3b3b', border: '1px solid #555', borderRadius: '8px', padding: '15px', zIndex: 1100, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', color: '#fff' },
    popupCloseButton: { marginTop: '10px', padding: '5px 10px', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer', backgroundColor: 'transparent', color: '#fff' },
    tabsContainer: { marginBottom: '20px', borderBottom: '1px solid #555' },
    tab: { padding: '10px 20px', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', backgroundColor: 'transparent', color: '#ccc', fontSize: '1em', fontWeight: 'bold' },
    activeTab: { padding: '10px 20px', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '2px solid #405de6', cursor: 'pointer', backgroundColor: 'transparent', color: '#fff', fontSize: '1em', fontWeight: 'bold' },
};

// --- SUB-COMPONENTS ---

const CompetencyInfoPopup: React.FC<CompetencyInfoPopupProps> = ({ name, info, position, onClose }) => {
    const popupRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) { onClose(); }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div ref={popupRef} style={{ ...styles.popup, top: position.top, left: position.left }}>
            <h4>{name}</h4>
            <p><strong>Grade:</strong> {info.grade}</p>
            <p><strong>Date Achieved:</strong> {new Date(info.date_achieved).toLocaleDateString()}</p>
            <button onClick={onClose} style={styles.popupCloseButton}>Close</button>
        </div>
    );
};

const ModifyCompetencyModal: React.FC<ModifyCompetencyModalProps> = ({ onClose, onSave, users }) => {
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [selectedConsole, setSelectedConsole] = useState<string>(COMPETENCY_COLUMNS_LIST[0]);
    const [grade, setGrade] = useState<number | ''>('');
    const [dateAchieved, setDateAchieved] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState<string>('');

    const filteredUsers = React.useMemo(() => users.filter(user =>
        (user.user_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    ), [users, searchTerm]);

    useEffect(() => {
        if (filteredUsers.length > 0) {
            if (!selectedUserId || !filteredUsers.some(u => u.user_id === selectedUserId)) { setSelectedUserId(filteredUsers[0].user_id); }
        } else { setSelectedUserId(''); }
    }, [filteredUsers, selectedUserId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSaving(true);
        if (!selectedUserId || !selectedConsole || grade === '' || !dateAchieved) { setError('All fields are required.'); setIsSaving(false); return; }
        try {
            const response = await fetch('/api/competencies/modify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: selectedUserId, console: selectedConsole, grade: Number(grade), date_achieved: dateAchieved }),
            });
            const result = await response.json();
            if (result.success) { onSave(); onClose(); } else { setError(result.message || 'Failed to save competency.'); }
        } catch (err: any) { setError('An unexpected error occurred.'); } finally { setIsSaving(false); }
    };

    return (
        <div style={modalStyles.overlay}>
            <div style={modalStyles.modal}>
                <h2>Modify Competency</h2>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div style={modalStyles.inputGroup}><label>Search User:</label><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={modalStyles.input}/></div>
                    <div style={modalStyles.inputGroup}><label>User ID:</label><select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} style={modalStyles.input} disabled={isSaving || filteredUsers.length === 0}>{filteredUsers.map(user => (<option key={user.user_id} value={user.user_id}>{user.user_id} ({user.name || 'No Name'})</option>))}</select></div>
                    <div style={modalStyles.inputGroup}><label>Console:</label><select value={selectedConsole} onChange={(e) => setSelectedConsole(e.target.value)} style={modalStyles.input} disabled={isSaving}>{COMPETENCY_COLUMNS_LIST.map(c => (<option key={c} value={c}>{c}</option>))}</select></div>
                    <div style={modalStyles.inputGroup}><label>Grade:</label><input type="number" value={grade} onChange={(e) => setGrade(Number(e.target.value))} style={modalStyles.input} min="1" max="15" required disabled={isSaving}/></div>
                    <div style={modalStyles.inputGroup}><label>Date Achieved:</label><input type="date" value={dateAchieved} onChange={(e) => setDateAchieved(e.target.value)} style={modalStyles.input} required disabled={isSaving}/></div>
                    <div style={modalStyles.buttonGroup}><button type="submit" style={modalStyles.saveButton} disabled={isSaving}>Save</button><button type="button" onClick={onClose} style={modalStyles.cancelButton}>Cancel</button></div>
                </form>
            </div>
        </div>
    );
};

const DeleteCompetencyModal: React.FC<DeleteCompetencyModalProps> = ({ onClose, onDelete, users }) => {
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [userCompetencies, setUserCompetencies] = useState<any[]>([]);
    const [selectedConsoles, setSelectedConsoles] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredUsers = React.useMemo(() => users.filter(user =>
        (user.user_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    ), [users, searchTerm]);

    useEffect(() => {
        if (filteredUsers.length > 0) {
            if (!selectedUserId || !filteredUsers.some(u => u.user_id === selectedUserId)) { setSelectedUserId(filteredUsers[0].user_id); }
        } else { setSelectedUserId(''); }
    }, [filteredUsers, selectedUserId]);

    useEffect(() => {
        const load = async () => {
            if (selectedUserId) {
                setIsLoading(true);
                try {
                    const res = await fetch(`/api/competencies/user/${selectedUserId}`);
                    const data = await res.json();
                    if (data.success) { setUserCompetencies(data.competencies); setSelectedConsoles(new Set()); }
                } catch (err) { setError('Failed to load.'); } finally { setIsLoading(false); }
            }
        };
        load();
    }, [selectedUserId]);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch('/api/competencies/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: selectedUserId, consoles: Array.from(selectedConsoles) }),
            });
            if ((await res.json()).success) { onDelete(); onClose(); }
        } catch (err) { setError('Failed to delete.'); } finally { setIsDeleting(false); }
    };

    return (
        <div style={modalStyles.overlay}>
            <div style={modalStyles.modal}>
                <h2>Delete Competency</h2>
                <div style={modalStyles.inputGroup}><label>Search User:</label><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={modalStyles.input}/></div>
                <div style={modalStyles.inputGroup}><label>User ID:</label><select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} style={modalStyles.input}>{filteredUsers.map(user => (<option key={user.user_id} value={user.user_id}>{user.user_id}</option>))}</select></div>
                <div style={modalStyles.competencyList}>{userCompetencies.map(c => (<label key={c.console} style={modalStyles.checkboxLabel}><input type="checkbox" checked={selectedConsoles.has(c.console)} onChange={() => { const s = new Set(selectedConsoles); if(s.has(c.console)) s.delete(c.console); else s.add(c.console); setSelectedConsoles(s); }}/> {c.console}</label>))}</div>
                <div style={modalStyles.buttonGroup}><button onClick={handleDelete} style={modalStyles.deleteButton} disabled={isDeleting}>Delete</button><button onClick={onClose} style={modalStyles.cancelButton}>Cancel</button></div>
            </div>
        </div>
    );
};

const ModifyOJTModal: React.FC<ModifyOJTModalProps> = ({ onClose, onSave, users }) => {
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [selectedConsole, setSelectedConsole] = useState<string>(COMPETENCY_COLUMNS_LIST[0]);
    const [shiftNumber, setShiftNumber] = useState<number | ''>('');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState<string>('');

    const filteredUsers = React.useMemo(() => users.filter(user =>
        (user.user_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    ), [users, searchTerm]);

    useEffect(() => {
        if (filteredUsers.length > 0) {
            if (!selectedUserId || !filteredUsers.some(u => u.user_id === selectedUserId)) { setSelectedUserId(filteredUsers[0].user_id); }
        } else { setSelectedUserId(''); }
    }, [filteredUsers, selectedUserId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch('/api/ojt/modify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: selectedUserId, console: selectedConsole, shift_number: Number(shiftNumber) }),
            });
            if ((await res.json()).success) { onSave(); onClose(); }
        } catch (err) { setError('Error saving.'); } finally { setIsSaving(false); }
    };

    return (
        <div style={modalStyles.overlay}>
            <div style={modalStyles.modal}>
                <h2>Modify OJT</h2>
                <form onSubmit={handleSubmit}>
                    <div style={modalStyles.inputGroup}><label>User:</label><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={modalStyles.input}/></div>
                    <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} style={modalStyles.input}>{filteredUsers.map(u => (<option key={u.user_id} value={u.user_id}>{u.user_id}</option>))}</select>
                    <select value={selectedConsole} onChange={(e) => setSelectedConsole(e.target.value)} style={modalStyles.input}>{COMPETENCY_COLUMNS_LIST.map(c => (<option key={c} value={c}>{c}</option>))}</select>
                    <input type="number" value={shiftNumber} onChange={(e) => setShiftNumber(Number(e.target.value))} style={modalStyles.input} placeholder="Shifts" required/>
                    <div style={modalStyles.buttonGroup}><button type="submit" style={modalStyles.saveButton}>Save</button><button type="button" onClick={onClose} style={modalStyles.cancelButton}>Cancel</button></div>
                </form>
            </div>
        </div>
    );
};

const DeleteOJTModal: React.FC<DeleteOJTModalProps> = ({ onClose, onDelete, users }) => {
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [ojts, setOjts] = useState<any[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredUsers = React.useMemo(() => users.filter(user =>
        (user.user_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    ), [users, searchTerm]);

    useEffect(() => {
        if (filteredUsers.length > 0) {
            if (!selectedUserId || !filteredUsers.some(u => u.user_id === selectedUserId)) { setSelectedUserId(filteredUsers[0].user_id); }
        } else { setSelectedUserId(''); }
    }, [filteredUsers, selectedUserId]);

    useEffect(() => {
        if (selectedUserId) {
            fetch(`/api/ojt/user/${selectedUserId}`).then(r => r.json()).then(d => { if(d.success) setOjts(d.ojts); });
        }
    }, [selectedUserId]);

    const handleDelete = async () => {
        setIsDeleting(true);
        const res = await fetch('/api/ojt/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: selectedUserId, consoles: Array.from(selected) }),
        });
        if ((await res.json()).success) { onDelete(); onClose(); }
        setIsDeleting(false);
    };

    return (
        <div style={modalStyles.overlay}>
            <div style={modalStyles.modal}>
                <h2>Delete OJT</h2>
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} style={modalStyles.input}>{filteredUsers.map(u => (<option key={u.user_id} value={u.user_id}>{u.user_id}</option>))}</select>
                <div style={modalStyles.competencyList}>{ojts.map(o => (<label key={o.console} style={modalStyles.checkboxLabel}><input type="checkbox" onChange={() => { const s = new Set(selected); if(s.has(o.console)) s.delete(o.console); else s.add(o.console); setSelected(s); }}/> {o.console}</label>))}</div>
                <div style={modalStyles.buttonGroup}><button onClick={handleDelete} style={modalStyles.deleteButton}>Delete</button><button onClick={onClose} style={modalStyles.cancelButton}>Cancel</button></div>
            </div>
        </div>
    );
};

const getGradientStyle = (value: number, min: number, max: number): React.CSSProperties => {
    if (max === min) { return { backgroundColor: value > 0 ? 'hsl(120, 40%, 80%)' : 'hsl(0, 40%, 80%)', color: 'black', fontWeight: 'bold' }; }
    const percentage = max > min ? (value - min) / (max - min) : 0;
    const hue = percentage * 120;
    return { backgroundColor: `hsl(${hue}, 40%, 80%)`, color: 'black', fontWeight: 'bold' };
};

const TeamComparisonView: React.FC<{
    groupedByTeam: Record<number, CompetencyData[]>;
    columns: string[];
    sortedTeamIds: number[];
    calculateTeamTally: (teamData: CompetencyData[]) => Record<string, string | number>;
}> = ({ groupedByTeam, columns, sortedTeamIds, calculateTeamTally }) => {
    const competencyColumns = columns.filter(c => !['user_id', 'proficiency_grade', 'team'].includes(c));
    const comparisonData = competencyColumns.map(competency => {
        let total = 0;
        const teamTallies: number[] = [];
        sortedTeamIds.forEach(teamId => {
            const tallyValue = calculateTeamTally(groupedByTeam[teamId])[competency] as number;
            teamTallies.push(tallyValue);
            total += tallyValue;
        });
        return { competency, teamTallies, min: Math.min(...teamTallies), max: Math.max(...teamTallies), total };
    });

    return (
        <div style={styles.tableContainer}>
            <table style={{ ...styles.table, minWidth: '100%' }}>
                <thead><tr><th style={{ ...styles.tableHeader, ...styles.stickyColumn, left: 0, minWidth: default_competency_col_width }}>Competency</th>{sortedTeamIds.map(t => (<th key={t} style={{...styles.tableHeader, textAlign: 'center'}}>Team {t}</th>))}<th style={{...styles.tableHeader, textAlign: 'center'}}>Total</th></tr></thead>
                <tbody>{comparisonData.map(row => (
                    <tr key={row.competency}><td style={{ ...styles.tableCell, ...styles.stickyColumn, left: 0, minWidth: default_competency_col_width, fontWeight: 'bold' }}>{row.competency}</td>{row.teamTallies.map((val, idx) => (<td key={idx} style={{ ...styles.tableCell, textAlign: 'center', ...getGradientStyle(val, row.min, row.max) }}>{val}</td>))}<td style={{...styles.tableCell, textAlign: 'center', fontWeight: 'bold'}}>{row.total}</td></tr>
                ))}</tbody>
            </table>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---

const CompetenciesPage: React.FC = () => {
    const [tableData, setTableData] = useState<CompetencyData[]>([]);
    const [allUsers, setAllUsers] = useState<{ user_id: string; name?: string }[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isModifyOJTModalOpen, setIsModifyOJTModalOpen] = useState(false);
    const [isDeleteOJTModalOpen, setIsDeleteOJTModalOpen] = useState(false);
    const [popupInfo, setPopupInfo] = useState<{ name: string; info: CompetencyDetail; position: { top: number, left: number } } | null>(null);
    const [activeTab, setActiveTab] = useState('breakdown');
    const [ojtData, setOjtData] = useState<any[]>([]);
    const router = useRouter();
    const tableRef = useRef<HTMLTableElement>(null);

    const fetchAllUsers = async () => {
        try {
            const response = await fetch('/api/users/all');
            const result = await response.json();
            if (result.success) { setAllUsers(result.data); }
        } catch (err) { console.error(err); }
    };

    const fetchCompetencies = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/competencies');
            const result = await response.json();
            if (result.success) {
                setTableData(result.data);
                setColumns(result.columns.filter((col: string) => col !== 'name'));
            }
        } catch (err) { setError('Failed to load.'); } finally { setIsLoading(false); }
    };

    const fetchOJT = async () => {
        try {
            const response = await fetch('/api/ojt');
            const result = await response.json();
            if (result.success) { setOjtData(result.data); }
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchCompetencies();
        fetchAllUsers();
        fetchOJT();
    }, []);

    const calculateTeamTally = (teamData: CompetencyData[]) => {
        const tally: Record<string, string | number> = {};
        columns.forEach(col => {
            if (col === 'user_id') { tally[col] = 'Tally'; }
            else if (col === 'proficiency_grade' || col === 'team') { tally[col] = ''; }
            else { tally[col] = teamData.filter(row => row[col] && typeof row[col] === 'object').length; }
        });
        return tally;
    };

    const calculateMinTableWidth = () => {
        let totalWidth = user_id_col_width + proficiency_grade_col_width + team_col_width;
        totalWidth += (columns.length - 3) * default_competency_col_width;
        return `${Math.max(800, totalWidth)}px`;
    };

    if (isLoading) return <div style={styles.container}><h1>Loading...</h1></div>;
    if (error) return <div style={styles.container}><h1>Error: {error}</h1></div>;

    const groupedByTeam: Record<number, CompetencyData[]> = tableData.reduce((acc, row) => {
        const tid = row.team || 0;
        if (!acc[tid]) acc[tid] = [];
        acc[tid].push(row);
        return acc;
    }, {} as Record<number, CompetencyData[]>);
    const sortedTeamIds = Object.keys(groupedByTeam).map(Number).sort((a, b) => a - b);

    return (
        <div style={styles.container}>
            {popupInfo && <CompetencyInfoPopup name={popupInfo.name} info={popupInfo.info} position={popupInfo.position} onClose={() => setPopupInfo(null)} />}
            <h1 style={styles.header}>Staff Competencies Matrix</h1>
            <div style={styles.actionButtons}>
                <button style={styles.topBackButton} onClick={() => router.push('/home')}>Back to Home</button>
                <div>
                    <button style={styles.modifyButton} onClick={() => setIsModifyModalOpen(true)}>Modify Competency</button>
                    <button style={styles.deleteButton} onClick={() => setIsDeleteModalOpen(true)}>Delete Competency</button>
                    <button style={{ ...styles.modifyButton, backgroundColor: '#28a745' }} onClick={() => setIsModifyOJTModalOpen(true)}>Modify OJT</button>
                    <button style={{ ...styles.deleteButton, backgroundColor: '#dc3545' }} onClick={() => setIsDeleteOJTModalOpen(true)}>Delete OJT</button>
                </div>
            </div>

            <div style={styles.tabsContainer}>
                {['breakdown', 'comparison', 'ojt'].map(tab => (
                    <button key={tab} style={activeTab === tab ? styles.activeTab : styles.tab} onClick={() => setActiveTab(tab)}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1).replace('breakdown', 'Team Breakdown').replace('comparison', 'Team Comparison')}
                    </button>
                ))}
            </div>

            {activeTab === 'breakdown' && (
                <div style={styles.tableContainer}>
                    <table ref={tableRef} style={{ ...styles.table, minWidth: calculateMinTableWidth() }}>
                        <thead><tr>{columns.map(col => {
                            let s: React.CSSProperties = { ...styles.tableHeader };
                            if (col === 'user_id') s = { ...s, ...styles.stickyColumn, left: 0, minWidth: user_id_col_width };
                            else if (col === 'proficiency_grade') s = { ...s, ...styles.stickyColumn, left: user_id_col_width, minWidth: proficiency_grade_col_width };
                            else if (col === 'team') s = { ...s, ...styles.stickyColumn, left: user_id_col_width + proficiency_grade_col_width, minWidth: team_col_width };
                            else s = { ...s, minWidth: default_competency_col_width };
                            return <th key={col} style={s}>{col.replace(/_/g, ' ')}</th>;
                        })}</tr></thead>
                        <tbody>{sortedTeamIds.map(tid => (
                            <React.Fragment key={tid}>
                                <tr style={styles.teamHeaderRow}><td colSpan={columns.length} style={styles.teamHeaderCell}>Team {tid}</td></tr>
                                {groupedByTeam[tid].map(row => (
                                    <tr key={row.user_id}>{columns.map(col => {
                                        const isComp = !['user_id', 'proficiency_grade', 'team'].includes(col);
                                        let s: React.CSSProperties = { ...styles.tableCell };
                                        if (col === 'user_id') s = { ...s, ...styles.stickyColumn, left: 0, fontWeight: 'bold' };
                                        else if (col === 'proficiency_grade') s = { ...s, ...styles.stickyColumn, left: user_id_col_width, textAlign: 'center' };
                                        else if (col === 'team') s = { ...s, ...styles.stickyColumn, left: user_id_col_width + proficiency_grade_col_width, textAlign: 'center' };
                                        else s = { ...s, textAlign: 'center', cursor: row[col] ? 'pointer' : 'default' };
                                        return <td key={col} style={s} onClick={(e) => isComp && row[col] && setPopupInfo({ name: row.name || row.user_id, info: row[col] as any, position: { top: e.currentTarget.getBoundingClientRect().bottom + window.scrollY, left: e.currentTarget.getBoundingClientRect().left + window.scrollX } })}>{isComp ? (row[col] ? '✓' : '') : row[col]}</td>;
                                    })}</tr>
                                ))}
                                <tr style={styles.tallyRow}>{columns.map(col => {
                                    let s: React.CSSProperties = { ...styles.tallyCell };
                                    if (col === 'user_id') s = { ...s, ...styles.stickyColumn, left: 0 };
                                    else if (col === 'proficiency_grade') s = { ...s, ...styles.stickyColumn, left: user_id_col_width, textAlign: 'center' };
                                    else if (col === 'team') s = { ...s, ...styles.stickyColumn, left: user_id_col_width + proficiency_grade_col_width, textAlign: 'center' };
                                    else s = { ...s, textAlign: 'center' };
                                    return <td key={col} style={s}>{calculateTeamTally(groupedByTeam[tid])[col]}</td>;
                                })}</tr>
                            </React.Fragment>
                        ))}</tbody>
                    </table>
                </div>
            )}

            {activeTab === 'comparison' && <TeamComparisonView groupedByTeam={groupedByTeam} columns={columns} sortedTeamIds={sortedTeamIds} calculateTeamTally={calculateTeamTally} />}

            {activeTab === 'ojt' && (
                <div style={styles.tableContainer}>
                    <table style={{ ...styles.table, minWidth: calculateMinTableWidth() }}>
                        <thead><tr>{columns.map(col => {
                            let s: React.CSSProperties = { ...styles.tableHeader };
                            if (col === 'user_id') s = { ...s, ...styles.stickyColumn, left: 0 };
                            else if (col === 'proficiency_grade') s = { ...s, ...styles.stickyColumn, left: user_id_col_width };
                            else if (col === 'team') s = { ...s, ...styles.stickyColumn, left: user_id_col_width + proficiency_grade_col_width };
                            return <th key={col} style={s}>{col.replace(/_/g, ' ')}</th>;
                        })}</tr></thead>
                        <tbody>{ojtData.map(row => (
                            <tr key={row.user_id}>{columns.map(col => {
                                const isComp = !['user_id', 'proficiency_grade', 'team'].includes(col);
                                let s: React.CSSProperties = { ...styles.tableCell };
                                if (col === 'user_id') s = { ...s, ...styles.stickyColumn, left: 0, fontWeight: 'bold' };
                                else if (col === 'proficiency_grade') s = { ...s, ...styles.stickyColumn, left: user_id_col_width, textAlign: 'center' };
                                else if (col === 'team') s = { ...s, ...styles.stickyColumn, left: user_id_col_width + proficiency_grade_col_width, textAlign: 'center' };
                                else s = { ...s, textAlign: 'center' };
                                return <td key={col} style={s}>{isComp ? (row[col] ?? '') : row[col]}</td>;
                            })}</tr>
                        ))}</tbody>
                    </table>
                </div>
            )}

            <button style={styles.backButton} onClick={() => router.push('/home')}>Back to Home</button>
            {isModifyModalOpen && <ModifyCompetencyModal onClose={() => setIsModifyModalOpen(false)} onSave={fetchCompetencies} users={allUsers} />}
            {isDeleteModalOpen && <DeleteCompetencyModal onClose={() => setIsDeleteModalOpen(false)} onDelete={fetchCompetencies} users={allUsers} />}
            {isModifyOJTModalOpen && <ModifyOJTModal onClose={() => setIsModifyOJTModalOpen(false)} onSave={fetchOJT} users={allUsers} />}
            {isDeleteOJTModalOpen && <DeleteOJTModal onClose={() => setIsDeleteOJTModalOpen(false)} onDelete={fetchOJT} users={allUsers} />}
        </div>
    );
};

export default CompetenciesPage;
