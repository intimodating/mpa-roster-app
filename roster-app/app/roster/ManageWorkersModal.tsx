import React, { useState } from 'react';

interface ManageWorkersModalProps {
  onClose: () => void;
}

type WorkerRequestBody = 
  | { user_id: string; password?: string; account_type?: 'Planner' | 'Non-Planner'; proficiency_grade?: number; }
  | { user_id: string; };

const ManageWorkersModal: React.FC<ManageWorkersModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'add' | 'modify' | 'delete'>('add');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // State for Add Worker
  const [addUserId, setAddUserId] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addAccountType, setAddAccountType] = useState<'Planner' | 'Non-Planner'>('Non-Planner');
  const [addProficiencyGrade, setAddProficiencyGrade] = useState<number>(1);

  // State for Modify Worker
  const [modifyUserId, setModifyUserId] = useState('');
  const [modifyPassword, setModifyPassword] = useState('');
  const [modifyAccountType, setModifyAccountType] = useState<'Planner' | 'Non-Planner' | ''>('');
  const [modifyProficiencyGrade, setModifyProficiencyGrade] = useState<number | ''>('');

  // State for Delete Worker
  const [deleteUserId, setDeleteUserId] = useState('');

  const handleSubmit = async (endpoint: string, body: WorkerRequestBody) => {
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        // Clear form fields on success
        if (endpoint === 'add') {
          setAddUserId('');
          setAddPassword('');
          setAddAccountType('Non-Planner');
          setAddProficiencyGrade(1);
        } else if (endpoint === 'modify') {
          setModifyUserId('');
          setModifyPassword('');
          setModifyAccountType('');
          setModifyProficiencyGrade('');
        } else if (endpoint === 'delete') {
          setDeleteUserId('');
        }
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (_err: unknown) {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWorker = () => {
    handleSubmit('add', {
      user_id: addUserId,
      password: addPassword,
      account_type: addAccountType,
      proficiency_grade: addProficiencyGrade,
    });
  };

  const handleModifyWorker = () => {
    const updateBody: WorkerRequestBody = { 
      user_id: modifyUserId,
      password: modifyPassword,
      account_type: modifyAccountType === '' ? undefined : modifyAccountType,
      proficiency_grade: modifyProficiencyGrade === '' ? undefined : modifyProficiencyGrade
    };
    if (modifyPassword) updateBody.password = modifyPassword;
    if (modifyAccountType) updateBody.account_type = modifyAccountType;
    if (modifyProficiencyGrade !== '') updateBody.proficiency_grade = modifyProficiencyGrade;
    handleSubmit('update', updateBody);
  };

  const handleDeleteWorker = () => {
    handleSubmit('delete', { user_id: deleteUserId });
  };

  return (
    <div style={modalStyles.backdrop}>
      <div style={modalStyles.modal}>
        <h2 style={modalStyles.header}>Manage Workers</h2>
        
        <div style={modalStyles.tabsContainer}>
          <button
            style={{ ...modalStyles.tabButton, ...(activeTab === 'add' ? modalStyles.activeTab : {}) }}
            onClick={() => setActiveTab('add')}
          >
            Add Worker
          </button>
          <button
            style={{ ...modalStyles.tabButton, ...(activeTab === 'modify' ? modalStyles.activeTab : {}) }}
            onClick={() => setActiveTab('modify')}
          >
            Modify Worker
          </button>
          <button
            style={{ ...modalStyles.tabButton, ...(activeTab === 'delete' ? modalStyles.activeTab : {}) }}
            onClick={() => setActiveTab('delete')}
          >
            Delete Worker
          </button>
        </div>

        {message && (
          <p style={{ color: message.type === 'success' ? 'green' : 'red', textAlign: 'center' }}>
            {message.text}
          </p>
        )}

        {isLoading && <p style={{ textAlign: 'center' }}>Loading...</p>}

        {activeTab === 'add' && (
          <div style={modalStyles.formContainer}>
            <h3>Add New Worker</h3>
            <div style={modalStyles.inputGroup}>
              <label>User ID:</label>
              <input type="text" value={addUserId} onChange={(e) => setAddUserId(e.target.value)} style={modalStyles.input} />
            </div>
            <div style={modalStyles.inputGroup}>
              <label>Password:</label>
              <input type="password" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} style={modalStyles.input} />
            </div>
            <div style={modalStyles.inputGroup}>
              <label>Account Type:</label>
              <select value={addAccountType} onChange={(e) => setAddAccountType(e.target.value as 'Planner' | 'Non-Planner')} style={modalStyles.select}>
                <option value="Non-Planner">Non-Planner</option>
                <option value="Planner">Planner</option>
              </select>
            </div>
            <div style={modalStyles.inputGroup}>
              <label>Proficiency Grade:</label>
              <input type="number" min="1" max="9" value={addProficiencyGrade} onChange={(e) => setAddProficiencyGrade(parseInt(e.target.value, 10))} style={modalStyles.input} />
            </div>
            <button onClick={handleAddWorker} style={modalStyles.actionButton}>Add Worker</button>
          </div>
        )}

        {activeTab === 'modify' && (
          <div style={modalStyles.formContainer}>
            <h3>Modify Worker</h3>
            <div style={modalStyles.inputGroup}>
              <label>User ID to Modify:</label>
              <input type="text" value={modifyUserId} onChange={(e) => setModifyUserId(e.target.value)} style={modalStyles.input} />
            </div>
            <div style={modalStyles.inputGroup}>
              <label>New Password (optional):</label>
              <input type="password" value={modifyPassword} onChange={(e) => setModifyPassword(e.target.value)} style={modalStyles.input} />
            </div>
            <div style={modalStyles.inputGroup}>
              <label>New Account Type (optional):</label>
              <select value={modifyAccountType} onChange={(e) => setModifyAccountType(e.target.value as 'Planner' | 'Non-Planner' | '')} style={modalStyles.select}>
                <option value="">No Change</option>
                <option value="Non-Planner">Non-Planner</option>
                <option value="Planner">Planner</option>
              </select>
            </div>
            <div style={modalStyles.inputGroup}>
              <label>New Proficiency Grade (optional):</label>
              <input type="number" min="1" max="9" value={modifyProficiencyGrade} onChange={(e) => setModifyProficiencyGrade(parseInt(e.target.value, 10))} style={modalStyles.input} />
            </div>
            <button onClick={handleModifyWorker} style={modalStyles.actionButton}>Modify Worker</button>
          </div>
        )}

        {activeTab === 'delete' && (
          <div style={modalStyles.formContainer}>
            <h3>Delete Worker</h3>
            <div style={modalStyles.inputGroup}>
              <label>User ID to Delete:</label>
              <input type="text" value={deleteUserId} onChange={(e) => setDeleteUserId(e.target.value)} style={modalStyles.input} />
            </div>
            <button onClick={handleDeleteWorker} style={{ ...modalStyles.actionButton, backgroundColor: '#dc3545' }}>Delete Worker</button>
          </div>
        )}

        <div style={modalStyles.actions}>
          <button onClick={onClose} style={modalStyles.closeButton}>Close</button>
        </div>
      </div>
    </div>
  );
};

const modalStyles: Record<string, React.CSSProperties> = {
    backdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modal: {
        backgroundColor: '#2c2c2c',
        color: '#fff',
        padding: '30px',
        borderRadius: '12px',
        width: '500px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        zIndex: 1001,
    },
    header: {
        textAlign: 'center',
        color: '#fff',
        marginBottom: '20px',
    },
    tabsContainer: {
        display: 'flex',
        marginBottom: '20px',
        borderBottom: '1px solid #555',
    },
    tabButton: {
        padding: '10px 20px',
        border: 'none',
        backgroundColor: '#3b3b3b',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '1em',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
        transition: 'background-color 0.3s ease',
    },
    activeTab: {
        backgroundColor: '#555',
        fontWeight: 'bold',
    },
    formContainer: {
        padding: '20px',
        border: '1px solid #555',
        borderRadius: '8px',
        backgroundColor: '#333',
        marginTop: '20px',
    },
    inputGroup: {
        marginBottom: '15px',
    },
    input: {
        width: '100%',
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid #555',
        backgroundColor: '#3b3b3b',
        color: '#fff',
        fontSize: '1em',
        marginTop: '5px',
    },
    select: {
        width: '100%',
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid #555',
        backgroundColor: '#3b3b3b',
        color: '#fff',
        fontSize: '1em',
        marginTop: '5px',
    },
    actionButton: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: '#34a853',
        marginTop: '15px',
        width: '100%',
    },
    actions: {
        marginTop: '30px',
        textAlign: 'right',
    },
    closeButton: {
        padding: '10px 20px',
        border: '1px solid #555',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        backgroundColor: 'transparent',
        color: '#fff',
    },
};

export default ManageWorkersModal;
