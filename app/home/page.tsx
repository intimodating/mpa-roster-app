// app/home/page.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ManageWorkersModal from '../roster/ManageWorkersModal'; // Import the new modal

// Define the shape of the user data we expect to store
interface UserData {
  name: string;
  user_id: string;
  account_type: string,
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isManageWorkersModalOpen, setIsManageWorkersModalOpen] = useState(false); // State for modal

  useEffect(() => {
    // 1. Attempt to retrieve stored user data from local storage
    const storedUser = localStorage.getItem('loggedInUser'); 

    if (storedUser) {
      try {
        const userData: UserData = JSON.parse(storedUser);
        setUser(userData);
      } catch (_error: unknown) {
        // Handle corrupt data
        localStorage.removeItem('loggedInUser');
        router.push('/'); 
      }
    } else {
      // 2. If no user data is found (not logged in), redirect to the login page (root path)
      router.push('/'); 
    }
    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
    // Clear user data and redirect to the login page
    localStorage.removeItem('loggedInUser');
    router.push('/');
  };

  if (isLoading) {
    return (
      <div style={styles.center}>
        <p>Loading user session...</p>
      </div>
    );
  }

  // Fallback if user is null after loading (should immediately redirect)
  if (!user) {
    return null; 
  }

  return (
    <div style={styles.root}>
      <div style={styles.container}>
        <h1 style={styles.header}>Welcome, {user.name}! 🚀</h1>
        <p style={styles.subheader}>
          Your User ID is: **{user.user_id}**
        </p>
        
        <div style={styles.contentBox}>
          <h2>MPA Roster Dashboard</h2>
          <p>This is your personalized home page, secured after successful login.</p>

          <Link href="/roster" passHref>
            <button style={styles.rosterButton}>View Roster Calendar</button>
          </Link>

          {user.account_type === "Planner" && (
            <button 
              style={{ ...styles.rosterButton, marginLeft: '10px' }} 
              onClick={() => setIsManageWorkersModalOpen(true)}
            >
              Manage Workers
            </button>
          )}
        </div>

        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </div>

      {isManageWorkersModalOpen && (
        <ManageWorkersModal onClose={() => setIsManageWorkersModalOpen(false)} />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    backgroundColor: '#121212',
    color: '#fff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
  },
  container: {
    textAlign: 'center',
    padding: '40px',
    maxWidth: '900px',
    backgroundColor: '#2c2c2c',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  header: {
    fontSize: '2.5em',
    color: '#fff',
    marginBottom: '10px',
  },
  subheader: {
    fontSize: '1.2em',
    color: '#aaa',
    marginBottom: '30px',
  },
  contentBox: {
    marginTop: '30px',
    padding: '25px',
    backgroundColor: '#3b3b3b',
    borderRadius: '8px',
  },
  rosterButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    color: 'white',
    backgroundImage: 'linear-gradient(45deg, #405de6, #5851db, #833ab4, #c13584, #e1306c, #fd1d1d)',
    fontSize: '1em',
    marginTop: '20px',
  },
  logoutButton: {
    marginTop: '40px',
    padding: '12px 30px',
    border: '1px solid #555',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    backgroundColor: 'transparent',
    color: '#fff',
    fontSize: '1em',
  },
  center: {
    textAlign: 'center', 
    padding: '100px', 
    fontSize: '1.2em',
    color: '#fff',
  }
};