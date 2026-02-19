// file: roster-app/app/api/roster/summarize/route.ts

import { NextRequest, NextResponse } from 'next/server';
import moment from 'moment-timezone';

// Function to get the full URL for internal API calls
function getAppUrl() {
  const host = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  return host;
}

interface LeaveEntry {
  user_id: string;
  start_date: string; // ISO string
  end_date: string;   // ISO string
  leave_type: "block" | "advance";
}

interface ApprovedBlockLeaveEntry {
    _id: string;
    user_id: string;
    date: string; // ISO string (represents one day of leave)
    leave_type: "block" | "advance";
    sub_leave_type?: string;
}


export async function POST(request: NextRequest) {
  const { year, month, userId } = await request.json(); // e.g., year: 2026, month: 2 (for February)

  if (!userId) {
    return NextResponse.json({ success: false, message: 'User ID is required for summary.' }, { status: 400 });
  }

  try {
    // --- 1. Fetch Data from your own APIs ---
    const appUrl = getAppUrl();
    const monthStr = String(month).padStart(2, '0');

    // Define the month range for fetching all relevant leaves
    const monthStart = moment.utc(`${year}-${monthStr}-01`).startOf('month');
    const monthEnd = moment.utc(`${year}-${monthStr}-01`).endOf('month');

    // Fetch approved leaves for the entire month
    const approvedLeaveRes = await fetch(`${appUrl}/api/block-leave/fetch-approved-month?year=${year}&month=${monthStr}`);
    const pendingLeaveRes = await fetch(`${appUrl}/api/block-leave/fetch-pending-month?year=${year}&month=${monthStr}`);
    
    // Roster data is not directly needed for this summary but keeping the fetch if other parts of code expects it
    const rosterRes = await fetch(`${appUrl}/api/roster/fetch-month?startDate=${monthStart.toISOString()}&endDate=${monthEnd.toISOString()}&userId=${userId}`);


    if (!approvedLeaveRes.ok || !pendingLeaveRes.ok || !rosterRes.ok) {
        let errorMessage = 'Failed to fetch internal data for summary.';
        if (!approvedLeaveRes.ok) errorMessage += ` Approved Leave Fetch Error: ${await approvedLeaveRes.text()}`;
        if (!pendingLeaveRes.ok) errorMessage += ` Pending Leave Fetch Error: ${await pendingLeaveRes.text()}`;
        if (!rosterRes.ok) errorMessage += ` Roster Fetch Error: ${await rosterRes.text()}`;
        throw new Error(errorMessage);
    }

    const approvedLeaveData = await approvedLeaveRes.json();
    const pendingLeaveData = await pendingLeaveRes.json();
    // const rosterData = await rosterRes.json(); // Not used directly in this rule-based summary

    console.log("--- DEBUG: Raw Approved Leave Data for Month ---", approvedLeaveData.data);
    console.log("--- DEBUG: Raw Pending Leave Data for Month ---", pendingLeaveData.data);

    // --- 2. Implement Rule-Based Summary Logic ---
    const summaryParts: string[] = [];

    // Calculate the current week based on the month and year provided
    // For simplicity, let's consider the week containing the first day of the selected month
    const currentWeekStart = moment.utc(`${year}-${monthStr}-01`).startOf('week');
    const currentWeekEnd = moment.utc(`${year}-${monthStr}-01`).endOf('week');

    summaryParts.push(`Summary for the week of ${currentWeekStart.format('DD MMM')} to ${currentWeekEnd.format('DD MMM')}:`);

    // Count leaves for the current week
    let impromptuLeavesCountWeek = 0; // Interpreted as 'advance' leaves
    let blockLeavesCountWeek = 0;     // Interpreted as 'block' leaves

    // Approved Leaves for week
    approvedLeaveData.data.forEach((leave: ApprovedBlockLeaveEntry) => {
        const leaveDate = moment.utc(leave.date);
        if (leaveDate.isBetween(currentWeekStart, currentWeekEnd, null, '[]')) { // '[]' for inclusive
            if (leave.leave_type === 'advance') {
                impromptuLeavesCountWeek++;
            } else if (leave.leave_type === 'block') {
                blockLeavesCountWeek++;
            }
        }
    });

    // Pending Leaves for week
    let pendingLeavesInWeekCount = 0;
    pendingLeaveData.data.forEach((leave: LeaveEntry) => {
        const leaveStart = moment.utc(leave.start_date);
        const leaveEnd = moment.utc(leave.end_date);
        
        // Check for any overlap with the current week
        if (leaveStart.isSameOrBefore(currentWeekEnd, 'day') && leaveEnd.isSameOrAfter(currentWeekStart, 'day')) {
            pendingLeavesInWeekCount++;
        }
    });


    summaryParts.push(`- Number of Impromptu (Advance) Leaves: ${impromptuLeavesCountWeek}`);
    summaryParts.push(`- Number of Block Leaves: ${blockLeavesCountWeek}`);
    summaryParts.push(`- Number of Pending Leave Applications: ${pendingLeavesInWeekCount}`);

    // --- Monthly Summary ---
    summaryParts.push(`\nSummary for the entire month of ${moment.months(month-1)} ${year}:`);

    let impromptuLeavesCountMonth = 0;
    let blockLeavesCountMonth = 0;
    let pendingLeavesCountMonth = 0;

    // Approved Leaves for month
    approvedLeaveData.data.forEach((leave: ApprovedBlockLeaveEntry) => {
        if (leave.leave_type === 'advance') {
            impromptuLeavesCountMonth++;
        } else if (leave.leave_type === 'block') {
            blockLeavesCountMonth++;
        }
    });

    // Pending Leaves for month
    pendingLeaveData.data.forEach((leave: LeaveEntry) => {
        pendingLeavesCountMonth++;
    });

    summaryParts.push(`- Number of Impromptu (Advance) Leaves: ${impromptuLeavesCountMonth}`);
    summaryParts.push(`- Number of Block Leaves: ${blockLeavesCountMonth}`);
    summaryParts.push(`- Number of Pending Leave Applications: ${pendingLeavesCountMonth}`);


    const finalSummary = summaryParts.join('\n');

    return NextResponse.json({ success: true, summary: finalSummary });

  } catch (error) {
    console.error("Error in rule-based summary generation:", error);
    let errorMessage = "An unknown server error occurred.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}