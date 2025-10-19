// app/pages/home/page.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // <--- Make sure to import Link

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

  useEffect(() => {
    // 1. Attempt to retrieve stored user data from local storage
    const storedUser = localStorage.getItem('loggedInUser'); 

    if (storedUser) {
      try {
        const userData: UserData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
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
    // 🛑 Apply the new navy blue root style
    <div style={styles.root}>
      <div style={styles.container}>
        <h1 style={styles.header}>Welcome, {user.name}! 🚀</h1>
        <p style={styles.subheader}>
          Your User ID is: **{user.user_id}**
        </p>
        
        <div style={styles.contentBox}>
          <h2>MPA Roster Dashboard</h2>
          <p>This is your personalized home page, secured after successful login.</p>

          {/* 🛑 NEW BUTTON TO ROSTER PAGE */}
          <Link href="/pages/roster" passHref>
            <button style={styles.rosterButton}>View Roster Calendar</button>
          </Link>
        </div>

        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {

  rosterButton: {
    padding: '10px 20px',
    backgroundColor: '#34a853', // Google green
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1em',
    fontWeight: 'bold',
    marginTop: '20px',
    marginRight: '15px',
    transition: 'background-color 0.3s',
  },
  container: {
    padding: '40px',
    maxWidth: '900px',
    margin: '40px auto',
    border: '1px solid #e0e0e0',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    fontFamily: 'Roboto, sans-serif',
    backgroundColor: '#000080',
  },
  header: {
    color: '#ffffff',
    borderBottom: '2px solid #1a73e8',
    paddingBottom: '10px',
    marginBottom: '20px',
  },
  subheader: {
    fontSize: '1.1em',
    color: '#ffffff',
    marginBottom: '30px',
  },
  contentBox: {
    marginTop: '30px',
    padding: '25px',
    backgroundColor: '#000000',
    borderRadius: '8px',
    border: '1px solid #eeeeee',
  },
  logoutButton: {
    marginTop: '40px',
    padding: '12px 30px',
    backgroundColor: '#000000', // Google red
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1em',
    fontWeight: 'bold',
    transition: 'background-color 0.3s',
  },
  center: {
    textAlign: 'center', 
    padding: '100px', 
    fontSize: '1.2em'
  }
};