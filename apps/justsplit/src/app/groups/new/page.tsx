'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../../context/AppContext';
import styles from './page.module.css';

export default function NewGroup() {
  const router = useRouter();
  const { addGroup, state } = useAppContext();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [newMemberName, setNewMemberName] = useState('');
  
  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    
    // Check if user already exists
    const existingUser = state.users.find(
      user => user.name.toLowerCase() === newMemberName.toLowerCase()
    );
    
    if (existingUser) {
      // Use existing user
      if (!members.includes(existingUser.id)) {
        setMembers([...members, existingUser.id]);
      }
    } else {
      // Create a temporary ID for the user
      // In a real app, you'd use a proper user creation flow
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Add the temporary ID to the members list
      setMembers([...members, tempId]);
    }
    
    setNewMemberName('');
  };
  
  const handleRemoveMember = (memberId: string) => {
    setMembers(members.filter(id => id !== memberId));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
      alert('Please enter a group name');
      return;
    }
    
    const newGroup = {
      name,
      description,
      members,
      eventIds: [],
      expenseIds: [],
    };
    
    addGroup(newGroup);
    
    // Navigate to groups list
    router.push('/groups/list');
  };
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Create New Group</h1>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.label}>
            Group Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={styles.input}
            placeholder="e.g., Roommates, Travel Buddies"
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
            placeholder="Add any details about the group"
            rows={3}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label className={styles.label}>Members</label>
          
          {members.length > 0 ? (
            <ul className={styles.membersList}>
              {members.map(memberId => {
                const member = state.users.find(user => user.id === memberId);
                return (
                  <li key={memberId} className={styles.memberItem}>
                    <span>{member?.name || newMemberName || 'Unknown User'}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(memberId)}
                      className={styles.removeButton}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles.noMembers}>No members added yet</p>
          )}
          
          <div className={styles.addMember}>
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Enter member name"
              className={styles.memberInput}
            />
            <button
              type="button"
              onClick={handleAddMember}
              className={styles.addButton}
            >
              Add
            </button>
          </div>
          
          {/* Existing users that can be quickly added */}
          {state.users.length > 0 && (
            <div className={styles.existingUsers}>
              <h3 className={styles.existingUsersTitle}>Add existing users:</h3>
              <div className={styles.userList}>
                {state.users
                  .filter(user => !members.includes(user.id))
                  .map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setMembers([...members, user.id])}
                      className={styles.userButton}
                    >
                      {user.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
        
        <div className={styles.buttonGroup}>
          <button
            type="button"
            onClick={() => router.back()}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
          >
            Create Group
          </button>
        </div>
      </form>
    </div>
  );
}