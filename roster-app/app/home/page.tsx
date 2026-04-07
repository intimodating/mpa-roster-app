// app/home/page.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ManageWorkersModal from '../roster/ManageWorkersModal';

interface UserData {
  name: string;
  user_id: string;
  account_type: string,
}

// Custom High-End SVG Icons
const Icons = {
  Home: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Calendar: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Leaves: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>,
  Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-3-3.87"/><path d="M9 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><circle cx="17" cy="7" r="4"/></svg>,
  Analytics: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Logout: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
};

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isManageWorkersModalOpen, setIsManageWorkersModalOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
      try {
        const userData: UserData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        localStorage.removeItem('loggedInUser');
        router.push('/');
      }
    } else {
      router.push('/');
    }
    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    router.push('/');
  };

  if (isLoading) return <div style={styles.loading}>Loading...</div>;
  if (!user) return null;

  const isPlanner = user.account_type === "Planner";

  return (
    <div style={styles.dashboardContainer}>
      {/* Sidebar Navigation */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.logoContainer}>
             <Image src="/mpa_logo.png" alt="MPA" width={32} height={32} />
          </div>
          <span style={styles.brandName}>MPA Roster</span>
        </div>

        <nav style={styles.nav}>
          <div style={styles.navSection}>
            <span style={styles.sectionLabel}>Operations</span>
            <Link href="/roster" style={styles.navLink}><Icons.Calendar /> View Roster</Link>
            <Link href="/block-leaves-calendar" style={styles.navLink}><Icons.Leaves /> Block Leaves</Link>
          </div>

          {isPlanner && (
            <div style={styles.navSection}>
              <span style={styles.sectionLabel}>Management</span>
              <button onClick={() => setIsManageWorkersModalOpen(true)} style={styles.navButton}>
                <Icons.Users /> Manage Workers
              </button>
              <Link href="/dashboard" style={styles.navLink}><Icons.Analytics /> Analytics</Link>
              <Link href="/competencies" style={styles.navLink}><Icons.Users /> Competencies</Link>
              <Link href="/staff-profiles" style={styles.navLink}><Icons.Home /> Profiles</Link>
            </div>
          )}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userProfile}>
            <div style={styles.avatar}>{user.name[0]}</div>
            <div style={styles.userInfo}>
              <span style={styles.userName}>{user.name}</span>
              <span style={styles.userRole}>{user.account_type}</span>
            </div>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            <Icons.Logout /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={styles.mainContent}>
        <header style={styles.header}>
          <h1 style={styles.welcomeText}>Overview</h1>
          <div style={styles.dateDisplay}>{new Date().toLocaleDateString('en-SG', { dateStyle: 'full' })}</div>
        </header>

        <div style={styles.heroBanner}>
          <h2 style={styles.heroTitle}>Welcome back, {user.name.split(' ')[0]}</h2>
          <p style={styles.heroSubtitle}>You have full access to the Maritime and Port Authority roster management system.</p>
        </div>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{...styles.iconWrapper, backgroundColor: '#eff6ff', color: '#3b82f6'}}><Icons.Calendar /></div>
              <h3 style={styles.cardTitle}>Roster Management</h3>
            </div>
            <p style={styles.cardBody}>Monitor real-time shift distributions, manage replacements, and export operational reports.</p>
            <Link href="/roster" style={styles.cardAction}>Open Roster Calendar →</Link>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{...styles.iconWrapper, backgroundColor: '#ecfdf5', color: '#10b981'}}><Icons.Leaves /></div>
              <h3 style={styles.cardTitle}>Leave Tracking</h3>
            </div>
            <p style={styles.cardBody}>Review block leave applications and ensure minimum manning requirements are met during holiday cycles.</p>
            <Link href="/block-leaves-calendar" style={styles.cardAction}>Manage Leaves →</Link>
          </div>

          {isPlanner && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={{...styles.iconWrapper, backgroundColor: '#fef3c7', color: '#f59e0b'}}><Icons.Analytics /></div>
                <h3 style={styles.cardTitle}>System Analytics</h3>
              </div>
              <p style={styles.cardBody}>Access deep insights into team proficiency, night-shift fairness, and personnel deployment rates.</p>
              <Link href="/dashboard" style={styles.cardAction}>View Analytics →</Link>
            </div>
          )}
        </div>
      </main>

      {isManageWorkersModalOpen && (
        <ManageWorkersModal onClose={() => setIsManageWorkersModalOpen(false)} />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  dashboardContainer: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    fontFamily: '"Inter", "Segoe UI", sans-serif',
  },
  sidebar: {
    width: '280px',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    height: '100vh',
    zIndex: 100,
  },
  brand: {
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid #f1f5f9',
  },
  logoContainer: {
    width: '36px',
    height: '36px',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  nav: {
    flex: 1,
    padding: '20px 16px',
    overflowY: 'auto',
  },
  navSection: {
    marginBottom: '24px',
  },
  sectionLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: '#94a3b8',
    letterSpacing: '0.05em',
    paddingLeft: '12px',
    marginBottom: '8px',
    display: 'block',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: '8px',
    color: '#475569',
    textDecoration: 'none',
    fontSize: '0.925rem',
    fontWeight: 500,
    transition: 'all 0.2s',
    marginBottom: '4px',
  },
  navButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: '8px',
    color: '#475569',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '0.925rem',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  sidebarFooter: {
    padding: '20px',
    borderTop: '1px solid #f1f5f9',
    backgroundColor: '#fafafa',
  },
  userProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#0f172a',
  },
  userRole: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  logoutBtn: {
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    backgroundColor: 'white',
    color: '#ef4444',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  mainContent: {
    marginLeft: '280px',
    flex: 1,
    padding: '40px 60px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  },
  welcomeText: {
    fontSize: '1.875rem',
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.025em',
  },
  dateDisplay: {
    fontSize: '0.875rem',
    color: '#64748b',
    fontWeight: 500,
  },
  heroBanner: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '40px',
    color: 'white',
    marginBottom: '40px',
    backgroundImage: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  heroTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '8px',
  },
  heroSubtitle: {
    color: '#94a3b8',
    fontSize: '1rem',
    maxWidth: '600px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e2e8f0',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px',
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#0f172a',
  },
  cardBody: {
    color: '#64748b',
    fontSize: '0.935rem',
    lineHeight: 1.6,
    marginBottom: '24px',
    flex: 1,
  },
  cardAction: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '1.1rem',
    color: '#64748b',
  }
};
