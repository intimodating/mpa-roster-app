"use client";
import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface ExportSimulationReportModalProps {
    onClose: () => void;
    rosterData: any;
    leaveData: any;
    users: any[];
    simStartDate: string;
    simEndDate: string;
}

const ExportSimulationReportModal: React.FC<ExportSimulationReportModalProps> = ({ 
    onClose, 
    rosterData, 
    leaveData, 
    users, 
    simStartDate, 
    simEndDate 
}) => {
    const [startDate, setStartDate] = useState(simStartDate);
    const [endDate, setEndDate] = useState(simEndDate);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (!startDate || !endDate) {
            alert("Please select both start and end dates.");
            return;
        }

        if (startDate < simStartDate || endDate > simEndDate || startDate > endDate) {
            alert(`Please select a date range within the simulation period: ${simStartDate} to ${simEndDate}.`);
            return;
        }

        setIsExporting(true);
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            // Reset times to start/end of day
            start.setUTCHours(0, 0, 0, 0);
            end.setUTCHours(23, 59, 59, 999);

            const diffTime = Math.abs(end.getTime() - start.getTime());
            const totalDaysInRange = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Aggregate data per user from simulation results
            const reportData = users.map((user: any) => {
                let eastMorningCount = 0;
                let eastAfternoonCount = 0;
                let eastNightCount = 0;
                let westMorningCount = 0;
                let westAfternoonCount = 0;
                let westNightCount = 0;
                let ojtCount = 0;
                let totalShifts = 0;
                let totalLeaves = 0;

                let curr = new Date(start);
                while (curr <= end) {
                    const dateKey = curr.toISOString().split('T')[0];
                    
                    // Check Roster
                    const dayData = rosterData[dateKey];
                    if (dayData) {
                        ['East', 'West'].forEach(loc => {
                            ['Morning', 'Afternoon', 'Night'].forEach(st => {
                                const worker = dayData[loc][st]?.find((w: any) => w.user_id === user.user_id);
                                if (worker) {
                                    totalShifts++;
                                    if (worker.is_ojt) ojtCount++;
                                    
                                    if (loc === 'East') {
                                        if (st === 'Morning') eastMorningCount++;
                                        else if (st === 'Afternoon') eastAfternoonCount++;
                                        else if (st === 'Night') eastNightCount++;
                                    } else {
                                        if (st === 'Morning') westMorningCount++;
                                        else if (st === 'Afternoon') westAfternoonCount++;
                                        else if (st === 'Night') westNightCount++;
                                    }
                                }
                            });
                        });
                    }

                    // Check Leave
                    if (leaveData[user.user_id]?.[dateKey]) {
                        totalLeaves++;
                    }

                    curr.setUTCDate(curr.getUTCDate() + 1);
                }

                const offDays = Math.max(0, totalDaysInRange - totalShifts - totalLeaves);

                return {
                    "Staff ID": user.user_id,
                    "Staff Name": user.name || user.user_id,
                    "Total East Morning": eastMorningCount,
                    "Total East Afternoon": eastAfternoonCount,
                    "Total East Night": eastNightCount,
                    "Total West Morning": westMorningCount,
                    "Total West Afternoon": westAfternoonCount,
                    "Total West Night": westNightCount,
                    "Total OJT": ojtCount,
                    "Total Shifts": totalShifts,
                    "Total Off Days": offDays,
                    "Total Leaves": totalLeaves
                };
            });

            // Generate Excel File (same as original ExportReportModal)
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Simulation Roster Report');

            worksheet.columns = [
                { header: 'Staff ID', key: 'Staff ID', width: 25 },
                { header: 'Staff Name', key: 'Staff Name', width: 30 },
                { header: 'Total East Morning', key: 'Total East Morning', width: 20 },
                { header: 'Total East Afternoon', key: 'Total East Afternoon', width: 20 },
                { header: 'Total East Night', key: 'Total East Night', width: 20 },
                { header: 'Total West Morning', key: 'Total West Morning', width: 20 },
                { header: 'Total West Afternoon', key: 'Total West Afternoon', width: 20 },
                { header: 'Total West Night', key: 'Total West Night', width: 20 },
                { header: 'Total OJT', key: 'Total OJT', width: 15 },
                { header: 'Total Shifts', key: 'Total Shifts', width: 15 },
                { header: 'Total Off Days', key: 'Total Off Days', width: 15 },
                { header: 'Total Leaves', key: 'Total Leaves', width: 15 },
            ];

            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

            reportData.forEach((item: any) => {
                const row = worksheet.addRow(item);
                row.alignment = { vertical: 'middle', horizontal: 'center' };
                row.getCell(1).alignment = { horizontal: 'left' };
                row.getCell(2).alignment = { horizontal: 'left' };
            });

            worksheet.eachRow((row) => {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Simulation_Roster_Report_${startDate}_to_${endDate}.xlsx`);

            onClose();
        } catch (error) {
            console.error("Simulation Export error:", error);
            alert("An error occurred during simulation export.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div style={styles.backdrop}>
            <div style={styles.modal}>
                <h2 style={styles.header}>Export Simulation Report</h2>
                <p style={styles.subtext}>Select a date range within the simulation period ({simStartDate} to {simEndDate}) to generate an Excel report.</p>
                
                <div style={styles.formGroup}>
                    <label style={styles.label}>Start Date</label>
                    <input 
                        type="date" 
                        value={startDate} 
                        min={simStartDate}
                        max={simEndDate}
                        onChange={(e) => setStartDate(e.target.value)} 
                        style={styles.input}
                    />
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>End Date</label>
                    <input 
                        type="date" 
                        value={endDate} 
                        min={simStartDate}
                        max={simEndDate}
                        onChange={(e) => setEndDate(e.target.value)} 
                        style={styles.input}
                    />
                </div>

                <div style={styles.btnGroup}>
                    <button onClick={onClose} style={styles.cancelBtn} disabled={isExporting}>Cancel</button>
                    <button onClick={handleExport} style={styles.exportBtn} disabled={isExporting}>
                        {isExporting ? 'Exporting...' : 'Generate Excel'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    backdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 3000,
    },
    modal: {
        backgroundColor: '#2c2c2c',
        color: '#fff',
        padding: '30px',
        borderRadius: '12px',
        width: '450px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    },
    header: {
        marginTop: 0,
        color: '#82ca9d',
        marginBottom: '10px',
    },
    subtext: {
        fontSize: '0.9em',
        color: '#aaa',
        marginBottom: '20px',
    },
    formGroup: {
        marginBottom: '20px',
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontSize: '0.95em',
        fontWeight: 'bold',
    },
    input: {
        width: '100%',
        padding: '10px',
        borderRadius: '6px',
        border: '1px solid #444',
        backgroundColor: '#1e1e1e',
        color: '#fff',
        boxSizing: 'border-box',
    },
    btnGroup: {
        display: 'flex',
        gap: '15px',
        marginTop: '30px',
    },
    exportBtn: {
        flex: 1,
        padding: '12px',
        backgroundColor: '#34a853',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
    },
    cancelBtn: {
        flex: 1,
        padding: '12px',
        backgroundColor: '#555',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
    }
};

export default ExportSimulationReportModal;
