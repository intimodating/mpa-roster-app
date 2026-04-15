// app/roster/ShiftReplacementModal.tsx
"use client";
import React, { useState, useEffect } from 'react';

// Define interfaces based on the data you expect
interface LeaveRequest {
    _id: string;
    user_id: string;
    date: string;
    leave_type: string;
    shift?: "Morning" | "Afternoon" | "Night" | "No";
}

interface ReplacementCandidate {
    user_id: string;
    proficiency_grade: number;
    reserve_deploy_count: number;
}

interface CategorizedCandidates {
    [category: string]: ReplacementCandidate[];
}

interface ApplicantDetails {
    user_id: string;
    proficiency_grade: number;
}

interface ShiftReplacementModalProps {
    leave: LeaveRequest | null;
    onClose: () => void;
    onReplacementSuccess: (leaveId: string) => void;
}

export default function ShiftReplacementModal({ leave, onClose, onReplacementSuccess }: ShiftReplacementModalProps) {
    const [applicantDetails, setApplicantDetails] = useState<ApplicantDetails | null>(null);
    const [categorizedCandidates, setCategorizedCandidates] = useState<CategorizedCandidates | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!leave) return;

        const fetchReplacementData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Fetch applicant details (including proficiency)
                const userRes = await fetch(`/api/users/${leave.user_id}`);
                if (!userRes.ok) throw new Error("Failed to fetch applicant details.");
                const userData = await userRes.json();
                if (!userData.success) throw new Error(userData.message);
                setApplicantDetails(userData.data);

                // Extract console if exists (e.g., "Morning (VTIS East)")
                const consoleMatch = leave.shift ? leave.shift.match(/\(([^)]+)\)/) : null;
                const requiredConsole = consoleMatch ? consoleMatch[1] : null;

                // Fetch replacement candidates
                const replacementsRes = await fetch(`/api/users/find-replacements`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        date: leave.date.split('T')[0],
                        min_proficiency_grade: userData.data.proficiency_grade,
                        required_console: requiredConsole
                    }),
                });
                if (!replacementsRes.ok) throw new Error("Failed to fetch replacement candidates.");
                const replacementsData = await replacementsRes.json();
                if (!replacementsData.success) throw new Error(replacementsData.message);
                
                setCategorizedCandidates(replacementsData.data);

            } catch (err: unknown) {
                console.error("Error fetching replacement data:", err);
                let errorMessage = "An unexpected error occurred.";
                if (err instanceof Error) {
                    errorMessage = err.message;
                }
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReplacementData();
    }, [leave]);

    const handleSelectReplacement = async (replacementId: string) => {
        if (!leave || !applicantDetails) return;

        try {
            const res = await fetch('/api/roster/replace-shift', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leave_id: leave._id,
                    applicant_user_id: leave.user_id,
                    replacement_user_id: replacementId,
                    date: leave.date.split('T')[0],
                }),
            });

            const data = await res.json();

            if (data.success) {
                alert("Shift replacement successful and leave approved!");
                onReplacementSuccess(leave._id);
                onClose();
            } else {
                throw new Error(data.message || "Failed to process shift replacement.");
            }
        } catch (err: unknown) {
            console.error("Error during shift replacement:", err);
            let errorMessage = "An unexpected error occurred.";
            if (err instanceof Error) {
                errorMessage = err.message;
            }
            alert(`Error: ${errorMessage}`);
        }
    };

    const hasAnyCandidates = categorizedCandidates && Object.values(categorizedCandidates).some(arr => arr.length > 0);

    return (
        <div style={styles.modalBackdrop}>
            <div style={styles.modalContent}>
                <h2 style={styles.header}>Shift Replacement</h2>
                <button onClick={onClose} style={styles.closeButton}>X</button>

                {isLoading && <p>Loading replacement options...</p>}
                {error && <p style={{ color: 'red' }}>Error: {error}</p>}

                {!isLoading && !error && (
                    <>
                        <div style={styles.applicantInfo}>
                            <h4>Leave Applicant:</h4>
                            <p>User ID: {applicantDetails?.user_id}</p>
                            <p>Proficiency Grade: {applicantDetails?.proficiency_grade}</p>
                            <p>Shift to Cover: {leave?.shift} on {leave ? new Date(leave.date).toLocaleDateString() : ''}</p>
                        </div>

                        <h4 style={styles.listHeader}>Available Replacements</h4>
                        {hasAnyCandidates ? (
                            Object.entries(categorizedCandidates!).map(([category, list]) => (
                                list.length > 0 && (
                                    <div key={category} style={styles.categoryContainer}>
                                        <h5 style={styles.categoryHeader}>{category}</h5>
                                        <ul style={styles.candidateList}>
                                            {list.map(c => (
                                                <li key={c.user_id} style={styles.candidateItem}>
                                                    <span>User: {c.user_id} (Grade: {c.proficiency_grade}, Deploy Count: {c.reserve_deploy_count || 0})</span>
                                                    <button 
                                                        style={styles.selectButton}
                                                        onClick={() => handleSelectReplacement(c.user_id)}
                                                    >
                                                        Select
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )
                            ))
                        ) : (
                            <p>No suitable replacement candidates found.</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// Basic styles - can be improved
const styles: Record<string, React.CSSProperties> = {
    modalBackdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: '#2c2c2c',
        color: '#fff',
        padding: '20px',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '650px',
        maxHeight: '85vh',
        overflowY: 'auto',
        position: 'relative',
    },
    header: {
        textAlign: 'center',
        marginBottom: '20px',
    },
    closeButton: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'transparent',
        border: 'none',
        color: '#fff',
        fontSize: '1.5rem',
        cursor: 'pointer',
    },
    applicantInfo: {
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#3b3b3b',
        borderRadius: '6px',
        borderLeft: '4px solid #1a73e8',
    },
    listHeader: {
        marginTop: '20px',
        borderBottom: '1px solid #555',
        paddingBottom: '5px',
        fontSize: '1.2rem',
        color: '#82ca9d',
    },
    categoryContainer: {
        marginTop: '15px',
        backgroundColor: '#333',
        borderRadius: '6px',
        padding: '10px',
        border: '1px solid #444',
    },
    categoryHeader: {
        margin: '0 0 10px 0',
        paddingBottom: '5px',
        borderBottom: '1px solid #555',
        color: '#ffd700',
        fontSize: '1rem',
    },
    candidateList: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
    },
    candidateItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 5px',
        borderBottom: '1px solid #444',
    },
    selectButton: {
        padding: '6px 12px',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: '#34a853',
        color: 'white',
        cursor: 'pointer',
        fontSize: '0.9rem',
    },
};
