'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/Header';
import { useAuth } from '../../../context/AuthContext';
import NotificationModule from '../../../context/NotificationContext';
import styles from '../page.module.css';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const auth = useAuth(); // Get the whole auth object
  const { signIn, signInWithProvider, user, isLoading } = auth;
  const { showNotification } = NotificationModule.useNotification();
  const router = useRouter();

  console.log('SignIn Page - Auth State:', { user: auth.user, isLoading: auth.isLoading, error: auth.error });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await signIn(email, password);
      router.push('/'); // Redirect to home page after successful sign in
    } catch (error: any) {
      showNotification(error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialSignIn = async (provider: 'google' | 'facebook' | 'twitter') => {
    try {
      await signInWithProvider(provider);
      router.push('/');
    } catch (error: any) {
      showNotification(error.message, 'error');
    }
  };

  return (
    <>
      <Header />
      <div className="main-content">
        <div className={styles.container}>
          <div className={styles.authCard}>
            <h1 className={styles.title}>Sign In</h1>
            
            <form onSubmit={handleSubmit} className={styles.form}>
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
                />
              </div>
              
              <button 
                type="submit" 
                className={`btn ${styles.submitButton}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
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
              <Link href="/auth/signup">
                Don't have an account? Sign Up
              </Link>
              <Link href="/auth/reset-password">
                Forgot your password?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}