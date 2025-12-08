// components/LoginForm.tsx
"use client";
import { useState } from "react";
import styles from "./LoginForm.module.css";

interface LoginFormProps {
  onLogin: (user_id: string, password: string) => void;
  isLoading: boolean; // <-- Accept the new prop
}

export default function LoginForm({ onLogin, isLoading}: LoginFormProps) {
  const [user_id, setUserId] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 👇 call the parent's function, passing the data upward
    if (!isLoading) {
      onLogin(user_id, password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2>Sign In</h2>

      <div className={styles.inputGroup}>
        <label>User ID</label>
        <input
          type="text"
          value={user_id}
          onChange={(e) => setUserId(e.target.value)}
        />
      </div>

      <div className={styles.inputGroup}>
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button 
        type="submit"
        className={styles.button}
        // 🛑 Disable the button while loading
        disabled={isLoading} 
        style={{ opacity: isLoading ? 0.6 : 1 }} // Optional: dim the button
      >
        {/* 🛑 Change button text based on state */}
        {isLoading ? 'Logging In...' : 'Log In'}
      </button>
    </form>
  );
}
