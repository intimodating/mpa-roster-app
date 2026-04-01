"use client";
import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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

interface Props {
    shiftData: ShiftData;
    userLookup: Record<string, { name: string }>;
}

const ExportDayShiftButton: React.FC<Props> = ({ shiftData, userLookup }) => {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet(`Shift ${shiftData.date}`);

            // 1. Setup Columns
            worksheet.columns = [
                { header: 'Shift', key: 'shift', width: 15 },
                { header: 'Location', key: 'location', width: 10 },
                { header: 'Console', key: 'console', width: 25 },
                { header: 'Staff ID', key: 'user_id', width: 20 },
                { header: 'Staff Name', key: 'name', width: 30 },
                { header: 'Type', key: 'type', width: 10 }, // OJT or Regular
                { header: 'Leave Type', key: 'leave_type', width: 20 },
            ];

            // 2. Style Header Row
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1a73e8' }
            };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

            // 3. Track Busy Staff
            const busyStaff = new Set<string>();

            // 4. Add Shift Data
            ['Morning', 'Afternoon', 'Night'].forEach(shiftType => {
                ['East', 'West'].forEach(location => {
                    const workers = shiftData[location as 'East' | 'West'][shiftType as keyof ShiftDetails];
                    workers.forEach(worker => {
                        busyStaff.add(worker.user_id);
                        const row = worksheet.addRow({
                            shift: shiftType,
                            location: location,
                            console: worker.assigned_console || 'Not Assigned',
                            user_id: worker.user_id,
                            name: userLookup[worker.user_id]?.name || 'N/A',
                            type: worker.is_ojt ? 'OJT' : 'Regular',
                            leave_type: 'N/A'
                        });

                        // Highlight explicitly assigned '0' or empty console
                        if (worker.assigned_console === '0') {
                            row.getCell('console').font = { bold: true, color: { argb: 'FFFF0000' } };
                        }
                        
                        if (worker.is_ojt) {
                            row.getCell('type').font = { bold: true, color: { argb: 'FFf09433' } };
                        }
                    });
                });
            });

            // 5. Add Leaves Data
            if (shiftData.leaves && shiftData.leaves.length > 0) {
                shiftData.leaves.forEach(leave => {
                    busyStaff.add(leave.user_id);
                    worksheet.addRow({
                        shift: 'N/A',
                        location: 'N/A',
                        console: 'N/A',
                        user_id: leave.user_id,
                        name: userLookup[leave.user_id]?.name || 'N/A',
                        type: 'Leave',
                        leave_type: leave.sub_leave_type ? `${leave.leave_type} (${leave.sub_leave_type})` : leave.leave_type
                    });
                });
            }

            // 6. Add Off Staff (Assigned '0')
            Object.keys(userLookup).forEach(userId => {
                if (!busyStaff.has(userId)) {
                    worksheet.addRow({
                        shift: 'Off',
                        location: 'N/A',
                        console: '0',
                        user_id: userId,
                        name: userLookup[userId]?.name || 'N/A',
                        type: 'Off',
                        leave_type: 'N/A'
                    });
                }
            });

            // 7. Add Borders to all cells
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

            // 6. Generate and Download
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Shift_Details_${shiftData.date}.xlsx`);

        } catch (error) {
            console.error("Single Day Export error:", error);
            alert("An error occurred during export.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button 
            onClick={handleExport} 
            disabled={isExporting}
            style={btnStyle}
        >
            {isExporting ? 'Exporting...' : 'Export Shift'}
        </button>
    );
};

const btnStyle: React.CSSProperties = {
    padding: '8px 15px',
    backgroundColor: '#34a853',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.9em',
};

export default ExportDayShiftButton;
