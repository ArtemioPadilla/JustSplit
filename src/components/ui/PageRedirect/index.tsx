'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './styles.module.css';

interface PageRedirectProps {
  redirectPath: string;
  title: string;
}

export default function PageRedirect({ redirectPath, title }: PageRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    router.push(redirectPath);
  }, [router, redirectPath]);

  return (
    <div className={styles.container}>
      <div className={styles.loader}></div>
      <p className={styles.message}>Redirecting to {title}...</p>
    </div>
  );
}
