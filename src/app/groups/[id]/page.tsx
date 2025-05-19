'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '../../../context/AppContext';
import EditableText from '../../../components/ui/EditableText';
import Button from '../../../components/ui/Button';
import styles from './page.module.css';

export default function GroupDetail() {
  const router = useRouter();
  const params = useParams();
  const { state, updateGroup, deleteGroup, addEventToGroup, addExpenseToGroup, addMemberToGroup } = useAppContext();
  const groupId = params.id as string;
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('members');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  // Find the group
  const group = state.groups.find(g => g.id === groupId);
  
  if (!group) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Group Not Found</h1>
        <p>The group you're looking for doesn't exist or has been deleted.</p>
        <Link href="/groups/list" className={styles.backButton}>
          Return to Groups List
        </Link>
      </div>
    );
  }
  
  // Get group members, events, and expenses
  const members = state.users.filter(user => group.members.includes(user.id));
  const events = state.events.filter(event => group.eventIds.includes(event.id));
  const expenses = state.expenses.filter(expense => group.expenseIds.includes(expense.id));
  
  // Get available events (not already in the group)
  const availableEvents = state.events.filter(event => !group.eventIds.includes(event.id));
  
  // Get available expenses (not already in the group)
  const availableExpenses = state.expenses.filter(expense => !group.expenseIds.includes(expense.id));
  
  // Get available users (not already members)
  const availableUsers = state.users.filter(user => !group.members.includes(user.id));
  
  const handleGroupNameUpdate = async (newName: string) => {
    setIsUpdating(true);
    
    try {
      const updatedGroup = { ...group, name: newName };
      updateGroup(updatedGroup);
    } catch (error) {
      console.error('Error updating group name:', error);
    } finally {
      setTimeout(() => {
        setIsUpdating(false);
      }, 500);
    }
  };
  
  const handleGroupDescriptionUpdate = async (newDescription: string) => {
    setIsUpdating(true);
    
    try {
      const updatedGroup = { ...group, description: newDescription };
      updateGroup(updatedGroup);
    } catch (error) {
      console.error('Error updating group description:', error);
    } finally {
      setTimeout(() => {
        setIsUpdating(false);
      }, 500);
    }
  };
  
  const handleDeleteGroup = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }
    
    deleteGroup(groupId);
    router.push('/groups/list');
  };
  
  const handleAddEvent = (eventId: string) => {
    addEventToGroup(groupId, eventId);
  };
  
  const handleAddExpense = (expenseId: string) => {
    addExpenseToGroup(groupId, expenseId);
  };
  
  const handleAddMember = (userId: string) => {
    addMemberToGroup(groupId, userId);
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <EditableText
          as="h1"
          value={group.name}
          onSave={handleGroupNameUpdate}
          className={`${styles.title} ${isUpdating ? styles.updating : ''}`}
        />
        <Link href="/groups/list" className={styles.backButton}>
          Back to Groups
        </Link>
      </div>
      
      <div className={styles.description}>
        <EditableText
          as="p"
          value={group.description || 'No description provided. Click to add one.'}
          onSave={handleGroupDescriptionUpdate}
          className={`${styles.descriptionText} ${isUpdating ? styles.updating : ''}`}
          placeholder="Click to add a description"
        />
      </div>
      
      <div className={styles.tabs}>
        <button
          className={`${styles.tabButton} ${activeTab === 'members' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members ({members.length})
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'events' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Events ({events.length})
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'expenses' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          Expenses ({expenses.length})
        </button>
      </div>
      
      <div className={styles.tabContent}>
        {activeTab === 'members' && (
          <div className={styles.membersTab}>
            <h2 className={styles.sectionTitle}>Members</h2>
            
            {members.length > 0 ? (
              <ul className={styles.membersList}>
                {members.map(member => (
                  <li key={member.id} className={styles.memberItem}>
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName}>{member.name}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyMessage}>No members in this group yet.</p>
            )}
            
            {availableUsers.length > 0 && (
              <div className={styles.addSection}>
                <h3 className={styles.addSectionTitle}>Add Members</h3>
                <div className={styles.addList}>
                  {availableUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleAddMember(user.id)}
                      className={styles.addButton}
                    >
                      <span className={styles.addIcon}>+</span> {user.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'events' && (
          <div className={styles.eventsTab}>
            <h2 className={styles.sectionTitle}>Events</h2>
            
            {events.length > 0 ? (
              <ul className={styles.eventsList}>
                {events.map(event => (
                  <li key={event.id} className={styles.eventItem}>
                    <div className={styles.eventInfo}>
                      <span className={styles.eventName}>{event.name}</span>
                      {event.startDate && (
                        <span className={styles.eventDate}>
                          {new Date(event.startDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Link href={`/events/${event.id}`} className={styles.viewButton}>
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyMessage}>No events in this group yet.</p>
            )}
            
            {availableEvents.length > 0 && (
              <div className={styles.addSection}>
                <h3 className={styles.addSectionTitle}>Add Events</h3>
                <div className={styles.addList}>
                  {availableEvents.map(event => (
                    <button
                      key={event.id}
                      onClick={() => handleAddEvent(event.id)}
                      className={styles.addButton}
                    >
                      <span className={styles.addIcon}>+</span> {event.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'expenses' && (
          <div className={styles.expensesTab}>
            <h2 className={styles.sectionTitle}>Expenses</h2>
            
            {expenses.length > 0 ? (
              <ul className={styles.expensesList}>
                {expenses.map(expense => (
                  <li key={expense.id} className={styles.expenseItem}>
                    <div className={styles.expenseInfo}>
                      <span className={styles.expenseName}>{expense.description}</span>
                      <span className={styles.expenseAmount}>
                        {expense.amount} {expense.currency}
                      </span>
                    </div>
                    <Link href={`/expenses/${expense.id}`} className={styles.viewButton}>
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyMessage}>No expenses in this group yet.</p>
            )}
            
            {availableExpenses.length > 0 && (
              <div className={styles.addSection}>
                <h3 className={styles.addSectionTitle}>Add Expenses</h3>
                <div className={styles.addList}>
                  {availableExpenses.map(expense => (
                    <button
                      key={expense.id}
                      onClick={() => handleAddExpense(expense.id)}
                      className={styles.addButton}
                    >
                      <span className={styles.addIcon}>+</span> {expense.description} ({expense.amount} {expense.currency})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className={styles.dangerZone}>
        <h2 className={styles.dangerZoneTitle}>Danger Zone</h2>
        <div className={styles.dangerZoneContent}>
          <p>Deleting this group will not delete its members, events, or expenses.</p>
          <button
            onClick={handleDeleteGroup}
            className={styles.deleteButton}
          >
            {isConfirmingDelete ? 'Confirm Delete' : 'Delete Group'}
          </button>
          {isConfirmingDelete && (
            <button
              onClick={() => setIsConfirmingDelete(false)}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
