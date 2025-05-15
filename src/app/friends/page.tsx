'use client';

import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import NotificationModule from '../../context/NotificationContext';
import Link from 'next/link';
import styles from './page.module.css';

export default function FriendsPage() {
  const { state } = useAppContext();
  const { showNotification } = NotificationModule.useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  
  // Filter friends based on search term
  const filteredFriends = state.users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Handle social network connection
  const handleSocialConnect = (network: 'facebook' | 'google' | 'twitter') => {
    setIsLoading(network);
    
    // Simulate API call with timeout
    setTimeout(() => {
      setIsLoading(null);
      showNotification(
        `Successfully connected to ${network}! Friends import feature will be available soon.`, 
        'success',
        5000
      );
      setIsImportModalOpen(false);
    }, 1500);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Friends</h1>
      
      <div className={styles.actions}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search friends..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <button 
          className={styles.importButton}
          onClick={() => setIsImportModalOpen(true)}
        >
          Import Friends
        </button>
        
        <Link href="/friends/add" className={styles.addButton}>
          Add Friend
        </Link>
      </div>
      
      {filteredFriends.length === 0 ? (
        <div className={styles.emptyState}>
          <p>You haven't added any friends yet.</p>
          <Link href="/friends/add" className={styles.addButton}>
            Add Your First Friend
          </Link>
        </div>
      ) : (
        <div className={styles.friendsList}>
          {filteredFriends.map(friend => (
            <div key={friend.id} className={styles.friendCard}>
              <div className={styles.friendAvatar}>
                {friend.avatarUrl ? (
                  <img 
                    src={friend.avatarUrl} 
                    alt={`${friend.name}'s avatar`}
                    className={styles.friendAvatarImage}
                  />
                ) : (
                  <span>{friend.name.charAt(0)}</span>
                )}
              </div>
              <div className={styles.friendInfo}>
                <h3 className={styles.friendName}>{friend.name}</h3>
                {friend.email && <p className={styles.friendEmail}>{friend.email}</p>}
              </div>
              <div className={styles.friendActions}>
                <Link href={`/friends/${friend.id}`} className={styles.viewButton}>
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {isImportModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Import Friends</h2>
            <div className={styles.socialButtons}>
              <button 
                className={`${styles.socialButton} ${styles.facebook}`}
                onClick={() => handleSocialConnect('facebook')}
                disabled={isLoading === 'facebook'}
              >
                {isLoading === 'facebook' ? 'Connecting...' : 'Connect Facebook'}
              </button>
              <button 
                className={`${styles.socialButton} ${styles.google}`}
                onClick={() => handleSocialConnect('google')}
                disabled={isLoading === 'google'}
              >
                {isLoading === 'google' ? 'Connecting...' : 'Connect Google'}
              </button>
              <button 
                className={`${styles.socialButton} ${styles.twitter}`}
                onClick={() => handleSocialConnect('twitter')}
                disabled={isLoading === 'twitter'}
              >
                {isLoading === 'twitter' ? 'Connecting...' : 'Connect Twitter'}
              </button>
            </div>
            <p className={styles.modalNote}>
              Connect to your social network to import your friends.
              Your login credentials are secure and won't be stored.
            </p>
            <button 
              className={styles.closeButton}
              onClick={() => setIsImportModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
