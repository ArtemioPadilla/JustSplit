'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../../context/AppContext';
import styles from './page.module.css';
import Button from '../../../components/ui/Button';

export default function AddFriend() {
  const router = useRouter();
  const { dispatch } = useAppContext();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('Please enter a friend name');
      return;
    }
    
    // Add the user/friend
    dispatch({
      type: 'ADD_USER',
      payload: {
        name: name.trim(),
        email: email.trim() || undefined
      }
    });
    
    // Navigate back to friends list
    router.push('/friends');
  };
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Add a Friend</h1>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.label}>
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={styles.input}
            placeholder="Enter friend's name"
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>
            Email (Optional)
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            placeholder="Enter friend's email"
          />
        </div>
        
        <div className={styles.buttonGroup}>
          <Button type="submit" variant="primary">
            Add Friend
          </Button>
          <button
            type="button"
            onClick={() => router.back()}
            className={styles.cancelButton}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
