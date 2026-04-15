'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types';
import NotificationModule from '../../context/NotificationContext';
import AvatarUploader from '../../components/AvatarUploader';
import Button from '../../components/ui/Button';
import CurrencySelector from '../../components/ui/CurrencySelector';
import styles from './page.module.css';

export default function ProfilePage() {
  const { userProfile, updateProfile, signOut } = useAuth(); // Add signOut from useAuth
  const { showNotification } = NotificationModule.useNotification();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [preferredCurrency, setPreferredCurrency] = useState('USD');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Validation states
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  
  // Load user data into form fields when user data is available
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name ?? '');
      setEmail(userProfile.email ?? '');
      setPhoneNumber(userProfile.phoneNumber ?? '');
      setPreferredCurrency(userProfile.preferredCurrency ?? 'USD');
      setAvatarUrl(userProfile.avatarUrl ?? null);
    }
  }, [userProfile]);

  // Validate email format
  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Empty email is valid (optional field)
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    
    setEmailError(isValid ? '' : 'Please enter a valid email address');
    return isValid;
  };
  
  // Validate phone number format
  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Empty phone is valid (optional field)
    
    // Simple validation for international phone numbers
    const phoneRegex = /^\+?[(]?\d{1,4}[)]?[-\s.]?\d{1,4}[-\s.]?\d{1,9}$/;
    const isValid = phoneRegex.test(phone);
    
    setPhoneError(isValid ? '' : 'Please enter a valid phone number');
    return isValid;
  };
  
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    validateEmail(newEmail);
  };
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhone = e.target.value;
    setPhoneNumber(newPhone);
    validatePhone(newPhone);
  };
  
  const handleSave = async () => {
    if (!userProfile) return;
    
    if (!name.trim()) {
      showNotification('Name cannot be empty', 'error');
      return;
    }
    
    // Validate email and phone
    const isEmailValid = validateEmail(email);
    const isPhoneValid = validatePhone(phoneNumber);
    
    if (!isEmailValid || !isPhoneValid) {
      showNotification('Please correct the form errors before saving', 'error');
      return;
    }
    
    try {
      const profileData: Partial<User> = {
        name: name.trim(),
        preferredCurrency
      };

      // Only include fields that have actual values
      if (email.trim()) {
        profileData.email = email.trim();
      }
      if (phoneNumber.trim()) {
        profileData.phoneNumber = phoneNumber.trim();
      }
      // Handle the avatarUrl explicitly, converting null to undefined
      if (avatarUrl !== null) {
        profileData.avatarUrl = avatarUrl;
      }

      await updateProfile(profileData);
      
      showNotification('Profile updated successfully', 'success');
      setIsEditing(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      showNotification(errorMessage, 'error');
    }
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
      showNotification('You have been signed out successfully', 'success');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
      showNotification('Failed to sign out: ' + errorMessage, 'error');
    }
  };
  
  if (!userProfile) {
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
              {isEditing ? (
                <AvatarUploader 
                  avatarUrl={avatarUrl} 
                  onAvatarChange={setAvatarUrl}
                  name={name}
                />
              ) : (
                <div className={styles.avatar}>
                  {userProfile?.avatarUrl ? (
                    <Image 
                      src={userProfile.avatarUrl} 
                      alt={`${userProfile.name}'s avatar`} 
                      className={styles.avatarImage}
                      width={100}
                      height={100}
                    />
                  ) : (
                    <span>{userProfile?.name.charAt(0)}</span>
                  )}
                </div>
              )}
              <div>
                <h2>{userProfile?.name}</h2>
                {userProfile?.email && <p>{userProfile.email}</p>}
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
                      onChange={handleEmailChange}
                      className={styles.input}
                    />
                    {emailError && <p className={styles.error}>{emailError}</p>}
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="phoneNumber">Phone Number</label>
                    <input
                      id="phoneNumber"
                      type="tel"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      className={styles.input}
                    />
                    {phoneError && <p className={styles.error}>{phoneError}</p>}
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="preferredCurrency">Preferred Currency</label>
                    <CurrencySelector
                      id="preferredCurrency"
                      value={preferredCurrency}
                      onChange={setPreferredCurrency}
                      className={styles.currencySelector}
                    />
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
                      <span className={styles.infoValue}>{userProfile.name}</span>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Email:</span>
                      <span className={styles.infoValue}>
                        {userProfile.email ?? 'Not provided'}
                      </span>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Phone:</span>
                      <span className={styles.infoValue}>
                        {userProfile.phoneNumber ?? 'Not provided'}
                      </span>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Preferred Currency:</span>
                      <span className={styles.infoValue}>
                        {userProfile.preferredCurrency ?? 'USD'}
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
                
                {/* Move sign out button to bottom with better styling */}
                <div className={styles.signOutSection}>
                  <Button 
                    onClick={handleSignOut} 
                    variant="secondary"
                  >
                    Sign Out
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
  );
}