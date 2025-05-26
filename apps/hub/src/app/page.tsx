'use client';

import { useAuth } from '../components/AuthContext';
import { AppGrid } from '../components/AppGrid';
import { LoginForm } from '../components/LoginForm';
import styles from './page.module.css';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <h1 className={styles.title}>Welcome to JustSplit Hub</h1>
          <p className={styles.subtitle}>Sign in to access your applications</p>
          <LoginForm />
        </div>
      </div>
    );
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className="container">
          <h1>JustSplit Hub</h1>
          <div className={styles.userInfo}>
            <span>Welcome, {user.displayName || user.email}</span>
            <button onClick={() => window.location.href = '/profile'} className={styles.profileButton}>
              Profile
            </button>
          </div>
        </div>
      </header>
      
      <section className={styles.appSection}>
        <div className="container">
          <h2>Your Applications</h2>
          <AppGrid />
        </div>
      </section>
    </main>
  );
}