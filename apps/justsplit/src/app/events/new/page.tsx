'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../../context/AppContext';
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from '../../../utils/currencyExchange';
import styles from './page.module.css';
import Button from '../../../components/ui/Button';

export default function NewEvent() {
  const router = useRouter();
  const { state, dispatch, addEvent } = useAppContext();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [preferredCurrency, setPreferredCurrency] = useState<string>(DEFAULT_CURRENCY);
  
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
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!name || !startDate || participants.length === 0) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      // Create the event data
      const eventData = {
        name,
        description,
        startDate,
        endDate: endDate || undefined,
        members: participants,
        preferredCurrency,
        date: startDate,
        createdAt: new Date().toISOString(),
        createdBy: state.currentUser?.id || '',
        expenseIds: [],
      };

      // Add to Firestore first
      await addEvent(eventData);

      // Navigate to events list
      router.push('/events/list');
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    }
  };
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>New Event</h1>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.label}>
            Event Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={styles.input}
            placeholder="e.g., Trip to Paris"
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="description" className={styles.label}>
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.textarea}
            placeholder="Add any details about the event"
            rows={3}
          />
        </div>
        
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="startDate" className={styles.label}>
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className={styles.input}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="endDate" className={styles.label}>
              End Date (Optional)
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={styles.input}
              min={startDate}
            />
          </div>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="preferredCurrency" className={styles.label}>
            Preferred Currency
          </label>
          <select
            id="preferredCurrency"
            className={styles.input}
            value={preferredCurrency}
            onChange={(e) => setPreferredCurrency(e.target.value)}
          >
            {SUPPORTED_CURRENCIES.map(currency => (
              <option key={currency.code} value={currency.code}>
                {currency.code} ({currency.symbol}) - {currency.name}
              </option>
            ))}
          </select>
          <small className={styles.helpText}>
            This currency will be used as the default when viewing expenses for this event
          </small>
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
                    <Button
                      type="button"
                      onClick={() => setParticipants(participants.filter(id => id !== user.id))}
                      variant="secondary"
                      size="small"
                    >
                      ✕
                    </Button>
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
            <Button
              type="button"
              onClick={handleAddParticipant}
              variant="secondary"
              size="small"
            >
              Add
            </Button>
          </div>
          
          <div className={styles.existingUsers}>
            <p className={styles.existingUsersTitle}>Or select existing users:</p>
            <div className={styles.userList}>
              {state.users
                .filter(user => !participants.includes(user.id))
                .map(user => (
                  <Button
                    key={user.id}
                    type="button"
                    onClick={() => setParticipants([...participants, user.id])}
                    variant="tertiary"
                    size="small"
                  >
                    {user.name}
                  </Button>
                ))}
            </div>
          </div>
        </div>
        
        <div className={styles.buttonGroup}>
          <Button type="submit" variant="primary">
            Create Event
          </Button>
          <Button
            type="button"
            onClick={() => router.back()}
            variant="tertiary"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
