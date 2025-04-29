'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function NewEvent() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    participants: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement event creation logic
    console.log('Event data:', formData);
    alert('This functionality will be implemented soon!');
  };

  return (
    <main className={styles.container}>
      <div className={styles.formContainer}>
        <h1 className={styles.heading}>Create New Event</h1>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>Event Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className={styles.textarea}
            ></textarea>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="startDate" className={styles.label}>Start Date</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="endDate" className={styles.label}>End Date</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="participants" className={styles.label}>Participants (comma-separated)</label>
            <input
              type="text"
              id="participants"
              name="participants"
              value={formData.participants}
              onChange={handleChange}
              placeholder="e.g., Alice, Bob, Charlie"
              className={styles.input}
              required
            />
          </div>
          
          <div className={styles.formActions}>
            <Link href="/" className={styles.cancelButton}>
              Cancel
            </Link>
            <button 
              type="submit" 
              className={styles.submitButton}
            >
              Create Event
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
