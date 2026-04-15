'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/Header';
import { useAuth } from '../../../context/AuthContext';
import NotificationModule from '../../../context/NotificationContext';
import styles from '../page.module.css';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  //const [avatarUrl, setAvatarUrl] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signUp, signInWithProvider } = useAuth();
  const { showNotification } = NotificationModule.useNotification();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await signUp(email, password, name);
      router.push('/');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign up';
      showNotification(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialSignIn = async (provider: 'google' | 'facebook' | 'twitter') => {
    try {
      await signInWithProvider(provider);
      router.push('/');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with provider';
      showNotification(errorMessage, 'error');
    }
  };

  return (
    <>
      <Header />
      <div className="main-content">
        <div className={styles.container}>
          <div className={styles.authCard}>
            <h1 className={styles.title}>Sign Up</h1>
            
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              
              <button 
                type="submit" 
                className={`btn ${styles.submitButton}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing up...' : 'Sign Up'}
              </button>
            </form>
            
            <div className={styles.divider}>or</div>
            
            <div className={styles.socialButtons}>
              <button 
                className={`${styles.socialButton} ${styles.google}`}
                onClick={() => handleSocialSignIn('google')}
              >
                Continue with Google
              </button>
              <button 
                className={`${styles.socialButton} ${styles.facebook}`}
                onClick={() => handleSocialSignIn('facebook')}
              >
                Continue with Facebook
              </button>
              <button 
                className={`${styles.socialButton} ${styles.twitter}`}
                onClick={() => handleSocialSignIn('twitter')}
              >
                Continue with Twitter
              </button>
            </div>
            
            <div className={styles.links}>
              <Link href="/auth/signin">
                Already have an account? Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}