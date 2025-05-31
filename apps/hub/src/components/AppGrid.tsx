'use client';

import { useEffect, useState } from 'react';
import { Card } from '@cybereco/ui-components';
import { getHubFirestore, queryDocuments, getCurrentUser } from '@cybereco/firebase-config';
import { where } from 'firebase/firestore';
import type { App } from '@cybereco/shared-types';
import { useAuth } from './AuthContext';
import styles from './AppGrid.module.css';

export function AppGrid() {
  const { user } = useAuth();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadApps() {
      if (!user) return;

      try {
        const db = getHubFirestore();
        const availableApps = await queryDocuments<App>(
          db,
          'apps',
          where('status', '==', 'active')
        );

        // In production, filter by user permissions
        setApps(availableApps);
      } catch (error) {
        console.error('Failed to load apps:', error);
      } finally {
        setLoading(false);
      }
    }

    loadApps();
  }, [user]);

  if (loading) {
    return <div className={styles.loading}>Loading applications...</div>;
  }

  if (apps.length === 0) {
    // Show default JustSplit app
    const defaultApps: App[] = [{
      id: 'justsplit',
      name: 'JustSplit',
      description: 'Split expenses with friends and family',
      icon: '💰',
      url: process.env.NEXT_PUBLIC_JUSTSPLIT_URL || 'http://localhost:4000',
      category: 'finance',
      status: 'active',
      requiresAuth: true,
      features: ['Expense tracking', 'Group management', 'Settlement tracking'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }];

    return (
      <div className={styles.grid}>
        {defaultApps.map(app => (
          <AppCard key={app.id} app={app} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {apps.map(app => (
        <AppCard key={app.id} app={app} />
      ))}
    </div>
  );
}

function AppCard({ app }: { app: App }) {
  const { user } = useAuth();

  const handleLaunch = async () => {
    if (!user) return;

    // Get Firebase user and create a token for the app to verify
    const firebaseUser = await getCurrentUser();
    const token = firebaseUser ? await firebaseUser.getIdToken() : '';
    
    // Redirect to app with token
    const url = new URL(app.url);
    url.searchParams.set('token', token);
    url.searchParams.set('returnUrl', window.location.origin);
    
    window.location.href = url.toString();
  };

  return (
    <Card className={styles.appCard} onClick={handleLaunch} hoverable>
      <div className={styles.appIcon}>{app.icon}</div>
      <h3 className={styles.appName}>{app.name}</h3>
      <p className={styles.appDescription}>{app.description}</p>
      <div className={styles.appFeatures}>
        {app.features.slice(0, 3).map((feature, index) => (
          <span key={index} className={styles.feature}>
            {feature}
          </span>
        ))}
      </div>
      <button className={styles.launchButton}>
        Launch App →
      </button>
    </Card>
  );
}