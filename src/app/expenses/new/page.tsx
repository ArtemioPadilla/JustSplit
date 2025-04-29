'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../../context/AppContext';
import { SUPPORTED_CURRENCIES } from '../../../utils/currencyExchange';
import styles from './page.module.css';

export default function NewExpense() {
  const router = useRouter();
  const { state, dispatch } = useAppContext();
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [eventId, setEventId] = useState<string | undefined>(undefined);
  
  // Add a participant input field
  const [newParticipantName, setNewParticipantName] = useState('');

  const handleAddParticipant = () => {
    if (!newParticipantName.trim()) return;
    
    // Check if user already exists
    const existingUser = state.users.find(
      user => user.name.toLowerCase() === newParticipantName.toLowerCase()
    );
    
    if (existingUser) {
      // Use existing user
      if (!participants.includes(existingUser.id)) {
        setParticipants([...participants, existingUser.id]);
      }
    } else {
      // Create new user
      dispatch({
        type: 'ADD_USER',
        payload: { name: newParticipantName }
      });
    }
    
    setNewParticipantName('');
  };
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!description || !amount || !paidBy || participants.length === 0) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Add the expense
    dispatch({
      type: 'ADD_EXPENSE',
      payload: {
        description,
        amount: parseFloat(amount),
        currency,
        date,
        paidBy,
        participants,
        eventId,
        settled: false
      }
    });
    
    // Navigate to expenses list
    router.push('/expenses/list');
  };
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>New Expense</h1>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="description" className={styles.label}>
            Description
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className={styles.input}
            placeholder="e.g., Dinner at restaurant"
          />
        </div>
        
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="amount" className={styles.label}>
              Amount
            </label>
            <input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className={styles.input}
              placeholder="0.00"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="currency" className={styles.label}>
              Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={styles.select}
            >
              {SUPPORTED_CURRENCIES.map(curr => (
                <option key={curr.code} value={curr.code}>
                  {curr.code} ({curr.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="date" className={styles.label}>
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={styles.input}
          />
        </div>
        
        {state.events.length > 0 && (
          <div className={styles.formGroup}>
            <label htmlFor="event" className={styles.label}>
              Event (Optional)
            </label>
            <select
              id="event"
              value={eventId || ''}
              onChange={(e) => setEventId(e.target.value || undefined)}
              className={styles.select}
            >
              <option value="">None</option>
              {state.events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className={styles.formGroup}>
          <label htmlFor="paidBy" className={styles.label}>
            Paid By
          </label>
          <select
            id="paidBy"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            required
            className={styles.select}
          >
            <option value="" disabled>
              Select who paid
            </option>
            {state.users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className={styles.formGroup}>
          <label className={styles.label}>Participants</label>
          
          <div className={styles.participantsList}>
            {participants.length > 0 ? (
              state.users
                .filter(user => participants.includes(user.id))
                .map(user => (
                  <div key={user.id} className={styles.participantItem}>
                    <span>{user.name}</span>
                    <button
                      type="button"
                      onClick={() => setParticipants(participants.filter(id => id !== user.id))}
                      className={styles.removeButton}
                    >
                      ✕
                    </button>
                  </div>
                ))
            ) : (
              <p className={styles.noParticipants}>No participants selected</p>
            )}
          </div>
          
          <div className={styles.addParticipant}>
            <input
              type="text"
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              className={styles.participantInput}
              placeholder="Enter participant name"
            />
            <button
              type="button"
              onClick={handleAddParticipant}
              className={styles.addButton}
            >
              Add
            </button>
          </div>
          
          <div className={styles.existingUsers}>
            <p className={styles.existingUsersTitle}>Or select existing users:</p>
            <div className={styles.userList}>
              {state.users
                .filter(user => !participants.includes(user.id))
                .map(user => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setParticipants([...participants, user.id])}
                    className={styles.userButton}
                  >
                    {user.name}
                  </button>
                ))}
            </div>
          </div>
        </div>
        
        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.submitButton}>
            Save Expense
          </button>
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
