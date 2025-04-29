'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { SUPPORTED_CURRENCIES } from '../../utils/currencyExchange';
import styles from './page.module.css';

export default function ProfilePage() {
  const { state, dispatch } = useAppContext();
  
  // Get the current user (consider the first user as the current user for this app)
  const currentUser = state.users.length > 0 ? state.users[0] : null;
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [preferredCurrency, setPreferredCurrency] = useState('USD');
  
  // Load user data into form fields when user data is available
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhoneNumber(currentUser.phoneNumber || '');
      setPreferredCurrency(currentUser.preferredCurrency || 'USD');
    }
  }, [currentUser]);
  
  const handleSave = () => {
    if (!currentUser) return;
    
    if (!name.trim()) {
      alert('Name cannot be empty');
      return;
    }
    
    dispatch({
      type: 'UPDATE_USER',
      payload: {
        id: currentUser.id,
        name: name.trim(),
        email: email.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        preferredCurrency
      }
    });
    
    setIsEditing(false);
  };
  
  if (!currentUser) {
    return (
      <div className={styles.container}>
        <h1>Profile Not Found</h1>
        <p>No user profile has been set up yet.</p>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <h1>Your Profile</h1>
      
      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>
            <span>{currentUser.name.charAt(0)}</span>
          </div>
          <div>
            <h2>{currentUser.name}</h2>
            {currentUser.email && <p>{currentUser.email}</p>}
          </div>
        </div>
        
        {isEditing ? (
          <div className={styles.profileSection}>
            <h3>Edit Your Profile</h3>
            
            <div className={styles.editForm}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={styles.input}
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
                  className={styles.input}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="phoneNumber">Phone Number</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={styles.input}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="preferredCurrency">Preferred Currency</label>
                <select
                  id="preferredCurrency"
                  value={preferredCurrency}
                  onChange={(e) => setPreferredCurrency(e.target.value)}
                  className={styles.select}
                >
                  {SUPPORTED_CURRENCIES.map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} ({curr.symbol}) - {curr.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className={styles.buttonGroup}>
                <button onClick={handleSave} className={styles.saveButton}>
                  Save Changes
                </button>
                <button onClick={() => setIsEditing(false)} className={styles.cancelButton}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.profileSection}>
              <h3>Personal Information</h3>
              
              <div className={styles.infoCard}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Name:</span>
                  <span className={styles.infoValue}>{currentUser.name}</span>
                </div>
                
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Email:</span>
                  <span className={styles.infoValue}>
                    {currentUser.email || 'Not provided'}
                  </span>
                </div>
                
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Phone:</span>
                  <span className={styles.infoValue}>
                    {currentUser.phoneNumber || 'Not provided'}
                  </span>
                </div>
                
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Preferred Currency:</span>
                  <span className={styles.infoValue}>
                    {currentUser.preferredCurrency || 'USD'}
                  </span>
                </div>
              </div>
              
              <button onClick={() => setIsEditing(true)} className={styles.editButton}>
                Edit Profile
              </button>
            </div>
            
            <div className={styles.profileSection}>
              <h3>Payment Methods</h3>
              
              <div className={styles.infoCard}>
                <p>No payment methods added yet.</p>
                <button className={styles.addButton} disabled>
                  Add Payment Method
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
