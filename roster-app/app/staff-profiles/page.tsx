"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StaffProfilesPage() {
    const [searchId, setSearchId] = useState('');
    const [profileData, setProfileData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Fetch all users once for suggestions
    useEffect(() => {
        const fetchAllUsers = async () => {
            try {
                const res = await fetch('/api/users/all');
                const data = await res.json();
                if (data.success) {
                    setAllUsers(data.data);
                }
            } catch (err) {
                console.error("Failed to fetch users for suggestions", err);
            }
        };
        fetchAllUsers();
    }, []);

    // Handle click outside suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchId(val);
        if (val.trim()) {
            const filtered = allUsers.filter(u => 
                (u.user_id && u.user_id.toLowerCase().includes(val.toLowerCase())) || 
                (u.name && u.name.toLowerCase().includes(val.toLowerCase()))
            ).slice(0, 8);
            setSuggestions(filtered);
            setShowSuggestions(true);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const fetchProfile = async (userId: string) => {
        if (!userId) return;
        setIsLoading(true);
        setError(null);
        setShowSuggestions(false);
        try {
            const res = await fetch(`/api/users/${userId}/profile`);
            const data = await res.json();
            if (data.success) {
                setProfileData(data.data);
            } else {
                setError(data.message || "Profile not found");
                setProfileData(null);
            }
        } catch (err) {
            setError("Failed to fetch profile");
            setProfileData(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchProfile(searchId);
    };

    const handleSuggestionClick = (userId: string) => {
        setSearchId(userId);
        fetchProfile(userId);
    };

    const calculatePercentage = (count: number, total: number) => {
        if (total === 0) return "0.0";
        return ((count / total) * 100).toFixed(1);
    };

    return (
        <div style={styles.root}>
            <div style={styles.container}>
                <div style={styles.headerRow}>
                    <Link href="/home" style={styles.backLink}>← Back to Home</Link>
                    <h1 style={styles.title}>Staff Directory</h1>
                </div>

                <div style={styles.searchContainer}>
                    <form onSubmit={handleSearch} style={styles.searchForm}>
                        <input 
                            type="text" 
                            placeholder="Search by User ID or Name..." 
                            value={searchId}
                            onChange={handleInputChange}
                            onFocus={() => searchId.trim() && setShowSuggestions(true)}
                            style={styles.searchInput}
                        />
                        <button type="submit" style={styles.searchButton}>Search</button>
                    </form>
                    
                    {showSuggestions && suggestions.length > 0 && (
                        <div ref={suggestionsRef} style={styles.suggestionsBox}>
                            {suggestions.map(u => (
                                <div 
                                    key={u.user_id} 
                                    style={styles.suggestionItem}
                                    onClick={() => handleSuggestionClick(u.user_id)}
                                >
                                    <div style={styles.suggestionName}>{u.name}</div>
                                    <div style={styles.suggestionId}>{u.user_id}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {isLoading && <div style={styles.center}>Loading profile...</div>}
                
                {error && <div style={styles.error}>{error}</div>}

                {profileData && (
                    <div style={styles.profileContainer}>
                        {/* Instagram Style Header */}
                        <div style={styles.profileHeader}>
                            <div style={styles.avatarPlaceholder}></div>
                            <div style={styles.profileInfo}>
                                <div style={styles.usernameRow}>
                                    <h2 style={styles.username}>{profileData.user.user_id}</h2>
                                    {/* Buttons removed as requested */}
                                </div>
                                <div style={styles.statsRow}>
                                    <span style={styles.statItem}><strong>{profileData.shifts.total}</strong> shifts (3m)</span>
                                    <span style={styles.statItem}><strong>{profileData.leaves.total}</strong> leaves (3m)</span>
                                    <span style={styles.statItem}><strong>{profileData.competencies.length}</strong> competencies</span>
                                </div>
                                <div style={styles.bio}>
                                    <h3 style={styles.realName}>{profileData.user.name}</h3>
                                    <p style={styles.bioText}>
                                        {profileData.user.account_type} • Grade {profileData.user.proficiency_grade}
                                        {profileData.user.team && ` • Team ${profileData.user.team}`}
                                    </p>
                                    {profileData.user.email && <p style={styles.bioLink}>{profileData.user.email}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Competencies Section */}
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>Competencies</h3>
                            <div style={styles.tagContainer}>
                                {profileData.competencies.length > 0 ? profileData.competencies.map((c: any) => (
                                    <div key={c.console} style={styles.tag}>
                                        {c.console} (G{c.grade})
                                    </div>
                                )) : <p style={styles.emptyText}>No competencies recorded.</p>}
                            </div>
                        </div>

                        {/* Deployment Analysis */}
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>Deployment Distribution (Past 3 Months)</h3>
                            <div style={styles.statsGrid}>
                                {Object.entries(profileData.shifts.breakdown).length > 0 ? 
                                    Object.entries(profileData.shifts.breakdown).map(([console, count]: [any, any]) => (
                                        <div key={console} style={styles.statCard}>
                                            <div style={styles.statLabel}>{console}</div>
                                            <div style={styles.statValue}>{calculatePercentage(count, profileData.shifts.total)}%</div>
                                            <div style={styles.statSub}>{count} shifts</div>
                                        </div>
                                    )) : <p style={styles.emptyText}>No shift data available for this period.</p>
                                }
                            </div>
                        </div>

                        {/* Leave Analysis */}
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>Leave Analysis (Past 3 Months)</h3>
                            <div style={styles.statsGrid}>
                                {Object.entries(profileData.leaves.breakdown).length > 0 ? 
                                    Object.entries(profileData.leaves.breakdown).map(([type, count]: [any, any]) => (
                                        <div key={type} style={styles.statCard}>
                                            <div style={styles.statLabel}>{type}</div>
                                            <div style={styles.statValue}>{calculatePercentage(count, profileData.leaves.total)}%</div>
                                            <div style={styles.statSub}>{count} days</div>
                                        </div>
                                    )) : <p style={styles.emptyText}>No leave data available for this period.</p>
                                }
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    root: { minHeight: '100vh', backgroundColor: '#121212', color: '#fff', padding: '40px 20px' },
    container: { maxWidth: '800px', margin: '0 auto' },
    headerRow: { display: 'flex', alignItems: 'center', marginBottom: '30px', justifyContent: 'space-between' },
    backLink: { color: '#0095f6', textDecoration: 'none', fontWeight: 'bold' },
    title: { fontSize: '1.5em', margin: 0 },
    searchContainer: { position: 'relative', marginBottom: '40px' },
    searchForm: { display: 'flex', gap: '10px' },
    searchInput: { flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#262626', color: '#fff' },
    searchButton: { padding: '12px 24px', backgroundColor: '#0095f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
    suggestionsBox: { 
        position: 'absolute', top: '100%', left: 0, right: 0, 
        backgroundColor: '#262626', border: '1px solid #333', borderRadius: '8px', 
        marginTop: '5px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        maxHeight: '300px', overflowY: 'auto'
    },
    suggestionItem: { padding: '10px 15px', borderBottom: '1px solid #333', cursor: 'pointer', transition: 'background 0.2s' },
    suggestionName: { fontWeight: 'bold', fontSize: '0.9em' },
    suggestionId: { fontSize: '0.8em', color: '#8e8e8e' },
    profileContainer: { backgroundColor: '#000', borderRadius: '12px', padding: '40px', border: '1px solid #262626' },
    profileHeader: { display: 'flex', gap: '60px', marginBottom: '40px', alignItems: 'flex-start' },
    avatarPlaceholder: { width: '150px', height: '150px', borderRadius: '50%', backgroundColor: '#262626', border: '1px solid #333', flexShrink: 0 },
    profileInfo: { flex: 1 },
    usernameRow: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' },
    username: { fontSize: '1.5em', fontWeight: 'normal', margin: 0 },
    statsRow: { display: 'flex', gap: '30px', marginBottom: '20px' },
    statItem: { fontSize: '1em' },
    bio: { lineHeight: '1.4' },
    realName: { fontSize: '1em', fontWeight: 'bold', margin: '0 0 5px 0' },
    bioText: { margin: 0, color: '#efefef' },
    bioLink: { color: '#e0f1ff', margin: '5px 0 0 0', fontSize: '0.9em' },
    section: { marginTop: '40px', borderTop: '1px solid #262626', paddingTop: '20px' },
    sectionTitle: { fontSize: '1.1em', color: '#8e8e8e', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' },
    tagContainer: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
    tag: { padding: '6px 12px', backgroundColor: '#1a1a1a', borderRadius: '20px', fontSize: '0.85em', border: '1px solid #333' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' },
    statCard: { padding: '15px', backgroundColor: '#121212', borderRadius: '8px', border: '1px solid #262626', textAlign: 'center' },
    statLabel: { fontSize: '0.75em', color: '#8e8e8e', marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    statValue: { fontSize: '1.4em', fontWeight: 'bold', color: '#0095f6' },
    statSub: { fontSize: '0.7em', color: '#555', marginTop: '5px' },
    center: { textAlign: 'center', padding: '20px' },
    error: { color: '#ed4956', textAlign: 'center', marginBottom: '20px' },
    emptyText: { color: '#8e8e8e', fontStyle: 'italic' }
};
