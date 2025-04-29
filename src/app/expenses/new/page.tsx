'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function NewExpense() {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
    participants: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement expense creation logic
    console.log('Expense data:', formData);
    alert('This functionality will be implemented soon!');
  };

  return (
    <main className={styles.container}>
      <div className={styles.formContainer}>
        <h1 className={styles.heading}>Add New Expense</h1>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>Description</label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="amount" className={styles.label}>Amount</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              min="0"
              className={styles.input}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="currency" className={styles.label}>Currency</label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className={styles.select}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
            </select>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="date" className={styles.label}>Date</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className={styles.input}
              required
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
              Add Expense
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
