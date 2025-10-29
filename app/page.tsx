"use client";
import { useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import { useRouter } from 'next/navigation'; 

import LoginForm from "./components/LoginForm";
export default function Home() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false); //for loading button

  async function handleLogin(user_id: string, password: string) {
    // 2. Set loading state to true
    setIsLoading(true);

    console.log("User entered:", user_id, password);
    
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, password }),
      });

      const data = await res.json();
      console.log(data);

      if (data.success) {
        // Store user data and redirect
        const userToStore = { 
          name: data.user.name, 
          user_id: data.user.user_id,
          account_type: data.user.account_type
        };
        localStorage.setItem('loggedInUser', JSON.stringify(userToStore));
        
        router.push('/home'); 
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      // 3. Set loading state back to false after everything is done
      setIsLoading(false);
    }
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
          {/* Pass the loading state to LoginForm */}
          <LoginForm onLogin={handleLogin} isLoading={isLoading} />
        </div>
      </main>
    </div>
  );
}
