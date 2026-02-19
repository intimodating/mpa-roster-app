"use client";
import React from 'react';

interface LeaveDetailsModalProps {
  leaveDetails: any; // Assuming 'any' for now, can be refined with an interface for Leave
  userName: string;
  onClose: () => void;
}

const LeaveDetailsModal: React.FC<LeaveDetailsModalProps> = ({ leaveDetails, userName, onClose }) => {
  if (!leaveDetails) {
    return null;
  }

  const formattedDate = new Date(leaveDetails.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <h2 style={modalStyles.header}>Leave Details for {userName}</h2>
        <div style={modalStyles.content}>
          <p><strong>Date:</strong> {formattedDate}</p>
          <p><strong>Leave Type:</strong> {leaveDetails.leave_type}</p>
          {leaveDetails.sub_leave_type && (
            <p><strong>Sub-Leave Type:</strong> {leaveDetails.sub_leave_type}</p>
          )}
          <p><strong>Status:</strong> {leaveDetails.status}</p>
        </div>
        <button style={modalStyles.closeButton} onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

// --- STYLES ---
const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#3b3b3b',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
    maxWidth: '500px',
    width: '90%',
    color: '#fff',
    position: 'relative',
  },
  header: {
    marginTop: 0,
    color: '#fff',
    borderBottom: '1px solid #555',
    paddingBottom: '10px',
    marginBottom: '20px',
  },
  content: {
    marginBottom: '20px',
    lineHeight: '1.6',
  },
  closeButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '1em',
    alignSelf: 'flex-end',
    transition: 'background-color 0.2s',
  },
};

export default LeaveDetailsModal;
