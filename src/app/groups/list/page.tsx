'use client';

import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import Link from 'next/link';
import styles from './page.module.css';
import Button from '../../../components/ui/Button';
import { useRouter } from 'next/navigation';
import EditableText from '../../../components/ui/EditableText';

export default function GroupsList() {
  const { state, updateGroup } = useAppContext();
  const router = useRouter();
  const [filter, setFilter] = useState('');
  const [updatingGroups, setUpdatingGroups] = useState<Record<string, boolean>>({});

  const filteredGroups = state.groups?.filter(group => 
    group.name.toLowerCase().includes(filter.toLowerCase())
  ) || [];

  const handleGroupNameUpdate = async (groupId: string, newName: string) => {
    setUpdatingGroups({ ...updatingGroups, [groupId]: true });
    
    // Find the group to update
    const groupToUpdate = state.groups.find(group => group.id === groupId);
    
    if (groupToUpdate) {
      try {
        // Update in database
        await updateGroup(groupId, { name: newName });
      } catch (error) {
        console.error('Error updating group name:', error);
        alert('Failed to update group name. Please try again.');
      } finally {
        // Clear updating status after a short delay to show feedback
        setTimeout(() => {
          setUpdatingGroups(prev => ({ ...prev, [groupId]: false }));
        }, 500);
      }
    }
  };

  const handleGroupDescriptionUpdate = async (groupId: string, newDescription: string) => {
    setUpdatingGroups({ ...updatingGroups, [groupId]: true });
    
    const groupToUpdate = state.groups.find(group => group.id === groupId);
    
    if (groupToUpdate) {
      try {
        await updateGroup(groupId, { description: newDescription });
      } catch (error) {
        console.error('Error updating group description:', error);
        alert('Failed to update group description. Please try again.');
      } finally {
        setTimeout(() => {
          setUpdatingGroups(prev => ({ ...prev, [groupId]: false }));
        }, 500);
      }
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Your Groups</h1>
      
      {(!state.groups || state.groups.length === 0) ? (
        <div className={styles.emptyState}>
          <p>You haven&apos;t created any groups yet.</p>
          <Button 
            variant="primary" 
            onClick={() => router.push('/groups/new')}
          >
            Create New Group
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.topActions}>
            <Button 
              variant="primary" 
              onClick={() => router.push('/groups/new')}
            >
              Create New Group
            </Button>
            
            <div className={styles.filterContainer}>
              <input
                type="text"
                placeholder="Filter groups..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className={styles.filterInput}
              />
            </div>
          </div>
          
          <div className={styles.groupsList}>
            {filteredGroups.map((group) => {
              const isUpdating = updatingGroups[group.id] || false;
              
              return (
                <div key={group.id} className={styles.groupCard}>
                  <EditableText 
                    as="h2"
                    value={group.name}
                    onSave={(newName) => handleGroupNameUpdate(group.id, newName)}
                    className={`${styles.groupName} ${isUpdating ? styles.updating : ''}`}
                    placeholder="Group Name"
                  />
                  
                  <EditableText 
                    as="p"
                    value={group.description || ''}
                    onSave={(newDescription) => handleGroupDescriptionUpdate(group.id, newDescription)}
                    className={`${styles.groupDescription} ${isUpdating ? styles.updating : ''}`}
                    placeholder="Click to add a description"
                  />
                  
                  <div className={styles.groupStats}>
                    <div className={styles.stat}>
                      <span className={styles.statIcon}>👥</span>
                      <span className={styles.statLabel}>Members:</span>
                      <span className={styles.statValue}>{group.members.length}</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statIcon}>📅</span>
                      <span className={styles.statLabel}>Events:</span>
                      <span className={styles.statValue}>{group.eventIds.length}</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statIcon}>💰</span>
                      <span className={styles.statLabel}>Expenses:</span>
                      <span className={styles.statValue}>{group.expenseIds.length}</span>
                    </div>
                  </div>
                  
                  <div className={styles.createdInfo}>
                    <span className={styles.createdDate}>
                      Created: {new Date(group.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className={styles.actions}>
                    <Link href={`/groups/${group.id}`}>
                      <Button variant="secondary">View Details</Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
