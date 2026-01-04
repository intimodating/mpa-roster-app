"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import { useRouter } from 'next/navigation'; 

import LoginForm from "./components/LoginForm";
export default function Home() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      const timer = setInterval(() => {
        setProgress(oldProgress => {
          if (oldProgress >= 90) {
            clearInterval(timer);
            return oldProgress;
          }
          return oldProgress + 10; // Fast simulation for login
        });
      }, 50);

      return () => {
        clearInterval(timer);
      };
    }
  }, [isLoading]);

  async function handleLogin(user_id: string, password: string) {
    setIsLoading(true);
    setProgress(0);

    console.log("User entered:", user_id, password);
    
    try {
      // Simulate a short delay for login
      await new Promise(resolve => setTimeout(resolve, 500));

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, password }),
      });

      const data = await res.json();
      console.log(data);

      if (data.success) {
        const userToStore = { 
          name: data.user.name, 
          user_id: data.user.user_id,
          account_type: data.user.account_type
        };
        localStorage.setItem('loggedInUser', JSON.stringify(userToStore));
        
        setProgress(100);
        await new Promise(resolve => setTimeout(resolve, 300));

        router.push('/home'); 
      } else {
        alert(data.message);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    } 
    // finally block removed to handle loading state manually
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Image
          className={styles.logo}
          src="/mpa_logo.png"
          alt="MPA logo"
          width={400}
          height={200}
          priority
        />

        <div className={styles.formContainer}>
          {isLoading ? (
            <div className={styles.progressContainer}>
              <p style={{textAlign: 'center', fontSize: '1.2em'}}>Logging In... {Math.round(progress)}%</p>
              <div className={styles.progressBarBackground}>
                <div className={styles.progressBarFill} style={{width: `${progress}%`}}></div>
              </div>
            </div>
          ) : (
            <LoginForm onLogin={handleLogin} isLoading={isLoading} />
          )}
        </div>
      </main>
    </div>
  );
}
