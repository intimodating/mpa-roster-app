// app/page.tsx
"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from 'next/navigation'; 
import React from 'react';

export default function Home() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [user_id, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) {
      const timer = setInterval(() => {
        setProgress(oldProgress => {
          if (oldProgress >= 90) {
            clearInterval(timer);
            return oldProgress;
          }
          return oldProgress + 5; 
        });
      }, 50);

      return () => {
        clearInterval(timer);
      };
    }
  }, [isLoading]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    
    setIsLoading(true);
    setProgress(0);
    setErrorMsg(null);
    
    try {
      // Simulate a short delay for login aesthetics
      await new Promise(resolve => setTimeout(resolve, 800));

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, password }),
      });

      const data = await res.json();

      if (data.success) {
        const userToStore = { 
          name: data.user.name, 
          user_id: data.user.user_id,
          account_type: data.user.account_type
        };
        localStorage.setItem('loggedInUser', JSON.stringify(userToStore));
        
        setProgress(100);
        await new Promise(resolve => setTimeout(resolve, 500));
        router.push('/home'); 
      } else {
        setErrorMsg(data.message);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login Error:", error);
      setErrorMsg("An unexpected connection error occurred.");
      setIsLoading(false);
    } 
  }

  return (
    <div style={styles.pageWrapper}>
      {/* Left side: Branding/Visual */}
      <div style={styles.brandSide}>
        {/* Animated Background Image (Ken Burns Effect) */}
        <div style={styles.brandBgImage} />
        
        {/* Subtle Radar Sweep */}
        <div style={styles.radarSweep} />

        {/* Digital Grid Mesh Overlay */}
        <div style={styles.gridOverlay} />

        <div style={styles.brandOverlay} />
        
        <div style={styles.brandContent}>
          <div style={styles.logoBadge}>
            <Image
              src="/mpa_logo.png"
              alt="MPA logo"
              width={180}
              height={90}
              style={styles.brandLogo}
              priority
            />
          </div>
          <h1 style={styles.brandTitle}>Maritime Personnel <br/>Command Center</h1>
          <p style={styles.brandSubtitle}>
            Secure terminal for the MPA Roster Management System. <br/>
            Optimizing maritime operations since 2026.
          </p>
          <div style={styles.brandFooter}>
            © 2026 Maritime and Port Authority of Singapore
          </div>
        </div>
        <div style={styles.credit}>
          Built by Timothy Chan
        </div>
      </div>

      {/* Right side: Login Form */}
      <div style={styles.formSide}>
        <div style={styles.formContainer}>
          <header style={styles.formHeader}>
            <h2 style={styles.formTitle}>Terminal Access</h2>
            <p style={styles.formSubtitle}>Please enter your credentials to authenticate.</p>
          </header>

          {isLoading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>Authenticating Terminal...</p>
              <div style={styles.progressTrack}>
                <div style={{...styles.progressFill, width: `${progress}%`}} />
              </div>
              <p style={styles.progressPercent}>{Math.round(progress)}%</p>
            </div>
          ) : (
            <form onSubmit={handleLogin} style={styles.form}>
              {errorMsg && (
                <div style={styles.errorBanner}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div style={styles.inputGroup}>
                <label style={styles.label}>User Identification</label>
                <div style={styles.inputWrapper}>
                   <svg style={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                   <input
                    type="text"
                    placeholder="Enter User ID"
                    value={user_id}
                    onChange={(e) => setUserId(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Security Token</label>
                <div style={styles.inputWrapper}>
                  <svg style={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input
                    type="password"
                    placeholder="Enter Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <button type="submit" style={styles.submitBtn}>
                Login to Command Center
              </button>
            </form>
          )}

          <footer style={styles.formFooter}>
            <p>Authorized Personnel Only</p>
          </footer>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes kenBurns { 
          0% { transform: scale(1); } 
          50% { transform: scale(1.1); }
          100% { transform: scale(1); } 
        }
        @keyframes radarRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  brandSide: {
    flex: '1.2',
    backgroundColor: '#0f172a',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px',
    overflow: 'hidden',
  },
  brandBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'url("https://images.unsplash.com/photo-1524522173746-f628baad3644?q=80&w=2000&auto=format&fit=crop")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    animation: 'kenBurns 40s ease-in-out infinite',
    zIndex: 0,
  },
  radarSweep: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '200%',
    height: '200%',
    translate: '-50% -50%',
    background: 'conic-gradient(from 0deg, transparent 0deg, rgba(59, 130, 246, 0.08) 60deg, transparent 61deg)',
    animation: 'radarRotate 12s linear infinite',
    zIndex: 1,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
    backgroundSize: '30px 30px',
    zIndex: 2,
  },
  brandOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    backdropFilter: 'blur(3px)',
    zIndex: 3,
  },
  brandContent: {
    position: 'relative',
    zIndex: 4,
    maxWidth: '500px',
  },
  logoBadge: {
    backgroundColor: 'white',
    padding: '15px 25px',
    borderRadius: '12px',
    display: 'inline-block',
    marginBottom: '40px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  },
  brandLogo: {
    display: 'block',
    objectFit: 'contain',
  },
  brandTitle: {
    fontSize: '3.5rem',
    fontWeight: 800,
    color: '#ffffff',
    lineHeight: '1.1',
    marginBottom: '24px',
    letterSpacing: '-0.03em',
  },
  brandSubtitle: {
    fontSize: '1.1rem',
    color: '#94a3b8',
    lineHeight: '1.6',
    marginBottom: '48px',
  },
  brandFooter: {
    fontSize: '0.8rem',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontWeight: 600,
  },
  credit: {
    position: 'absolute',
    bottom: '24px',
    left: '24px',
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.3)',
    fontWeight: 500,
    letterSpacing: '0.05em',
    zIndex: 5,
  },
  formSide: {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    backgroundColor: '#f8fafc',
  },
  formContainer: {
    width: '100%',
    maxWidth: '440px',
  },
  formHeader: {
    marginBottom: '40px',
  },
  formTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '8px',
    letterSpacing: '-0.02em',
  },
  formSubtitle: {
    fontSize: '1rem',
    color: '#64748b',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#334155',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: '#94a3b8',
  },
  input: {
    width: '100%',
    padding: '14px 14px 14px 44px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    fontSize: '1rem',
    transition: 'all 0.2s',
    outline: 'none',
    color: '#0f172a',
  },
  submitBtn: {
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '10px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  forgotPass: {
    textAlign: 'right',
    marginTop: '-8px',
  },
  link: {
    fontSize: '0.875rem',
    color: '#3b82f6',
    fontWeight: 500,
    cursor: 'pointer',
  },
  errorBanner: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '8px',
    color: '#b91c1c',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  formFooter: {
    marginTop: '60px',
    textAlign: 'center',
    fontSize: '0.875rem',
    color: '#94a3b8',
    paddingTop: '30px',
    borderTop: '1px solid #e2e8f0',
  },
  footerLinks: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    marginTop: '10px',
  },
  loadingContainer: {
    padding: '40px 0',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #0f172a',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginBottom: '20px',
  },
  loadingText: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '24px',
  },
  progressTrack: {
    width: '100%',
    height: '6px',
    backgroundColor: '#e2e8f0',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0f172a',
    transition: 'width 0.1s ease-in-out',
  },
  progressPercent: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#64748b',
  }
};
