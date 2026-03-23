"use client";
import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface ExportReportModalProps {
    onClose: () => void;
}

const ExportReportModal: React.FC<ExportReportModalProps> = ({ onClose }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (!startDate || !endDate) {
            alert("Please select both start and end dates.");
            return;
        }

        setIsExporting(true);
        try {
            const response = await fetch('/api/roster/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate, endDate })
            });

            const result = await response.json();
            if (!result.success) {
                alert(result.message || "Failed to fetch export data.");
                setIsExporting(false);
                return;
            }

            const data = result.data;

            // Generate Excel File
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Roster Report');

            // 1. Setup Columns (Ordering as requested)
            worksheet.columns = [
                { header: 'Staff ID', key: 'Staff ID', width: 25 },
                { header: 'Staff Name', key: 'Staff Name', width: 30 },
                { header: 'Total Morning', key: 'Total Morning', width: 15 },
                { header: 'Total Afternoon', key: 'Total Afternoon', width: 15 },
                { header: 'Total Night', key: 'Total Night', width: 15 },
                { header: 'Total OJT', key: 'Total OJT', width: 15 },
                { header: 'Total Shifts', key: 'Total Shifts', width: 15 },
                { header: 'Total Off Days', key: 'Total Off Days', width: 15 },
                { header: 'Total Leaves', key: 'Total Leaves', width: 15 },
            ];

            // 2. Style Header Row
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' } // Professional Blue
            };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

            // 3. Add Data Rows
            data.forEach((item: any) => {
                const row = worksheet.addRow(item);
                row.alignment = { vertical: 'middle', horizontal: 'center' };
                // Center the Staff Name/ID to the left for better reading
                row.getCell(1).alignment = { horizontal: 'left' };
                row.getCell(2).alignment = { horizontal: 'left' };
            });

            // 4. Add Borders to all cells
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

            // 5. Generate and Download
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Roster_Report_${startDate}_to_${endDate}.xlsx`);

            onClose();
        } catch (error) {
            console.error("Export error:", error);
            alert("An error occurred during export.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div style={styles.backdrop}>
            <div style={styles.modal}>
                <h2 style={styles.header}>Export Roster Report</h2>
                <p style={styles.subtext}>Select a date range to generate an Excel report for all employees.</p>
                
                <div style={styles.formGroup}>
                    <label style={styles.label}>Start Date</label>
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)} 
                        style={styles.input}
                    />
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>End Date</label>
                    <input 
                        type="date" 
                        value={endDate} 
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
        zIndex: 2000,
    },
    modal: {
        backgroundColor: '#2c2c2c',
        color: '#fff',
        padding: '30px',
        borderRadius: '12px',
        width: '400px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    },
    header: {
        marginTop: 0,
        color: '#1a73e8',
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

export default ExportReportModal;
