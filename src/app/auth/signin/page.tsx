'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/Header';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
// import LoadingSpinner from '@/components/ui/LoadingSpinner'; // Commented out
import styles from '../page.module.css';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const auth = useAuth();
  const { signIn, signInWithProvider, currentUser, isLoading } = auth;
  const { showNotification } = useNotification();
  const router = useRouter();

  console.log('SignIn Page - Auth State:', { currentUser: auth.currentUser, isLoading: auth.isLoading }); // Changed user to currentUser and removed error

  useEffect(() => {
    if (currentUser) {
      router.push('/profile');
    }
  }, [currentUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await signIn(email, password);
      router.push('/'); // Redirect to home page after successful sign in
      showNotification('Signed in successfully!', 'success');
    } catch (error: any) {
      console.error('Sign In Error:', error);
      showNotification(error.message || 'Failed to sign in', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialSignIn = async (provider: 'google' | 'facebook' | 'twitter') => {
    try {
      await signInWithProvider(provider);
      router.push('/');
      showNotification('Signed in successfully!', 'success');
    } catch (error: any) {
      console.error('Provider Sign In Error:', error);
      showNotification(error.message || 'Failed to sign in with provider', 'error');
    }
  };

  if (isLoading || currentUser) {
    // return <LoadingSpinner />; // Commented out
    return <div>Loading...</div>; // Placeholder
  }

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
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
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