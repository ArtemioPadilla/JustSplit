'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '../../../context/AppContext';
import Link from 'next/link';
import styles from './page.module.css';

export default function FriendDetail() {
  const router = useRouter();
  const params = useParams();
  const { state, dispatch } = useAppContext();
  const friendId = params?.id ? (params.id as string) : '';
  
  const [friend, setFriend] = useState<{ id: string; name: string; email?: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  
  // Find friend in users array
  useEffect(() => {
    const foundFriend = state.users.find(user => user.id === friendId);
    if (foundFriend) {
      setFriend(foundFriend);
      setEditName(foundFriend.name);
      setEditEmail(foundFriend.email || '');
    }
  }, [friendId, state.users]);
  
  // Get expenses involving this friend
  const sharedExpenses = state.expenses.filter(expense => 
    expense.participants.includes(friendId)
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Calculate balance with this friend
  const calculateBalance = () => {
    let balance = 0;
    
    sharedExpenses.forEach(expense => {
      if (expense.settled) return;
      
      const totalParticipants = expense.participants.length;
      const amountPerPerson = expense.amount / totalParticipants;
      
      if (expense.paidBy === friendId) {
        // Friend paid, so we might owe them
        const myShare = amountPerPerson;
        balance -= myShare;
      } else {
        // We paid, so they might owe us
        const friendShare = amountPerPerson;
        balance += friendShare;
      }
    });
    
    return balance;
  };
  
  const handleSaveEdit = () => {
    if (!editName.trim()) {
      alert('Name cannot be empty');
      return;
    }
    
    dispatch({
      type: 'UPDATE_USER',
      payload: {
        id: friendId,
        name: editName.trim(),
        email: editEmail.trim() || undefined
      }
    });
    
    setIsEditing(false);
  };
  
  if (!friend) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Friend Not Found</h1>
        <p>The friend you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        <Link href="/friends" className={styles.backButton}>
          Return to Friends List
        </Link>
      </div>
    );
  }
  
  // Calculate the balance with this friend
  const balance = calculateBalance();
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {isEditing ? 'Edit Friend' : friend.name}
        </h1>
        <Link href="/friends" className={styles.backButton}>
          Back to Friends
        </Link>
      </div>
      
      <div className={styles.section}>
        {isEditing ? (
          <div className={styles.editForm}>
            <div className={styles.formGroup}>
              <label htmlFor="editName">Name</label>
              <input
                id="editName"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={styles.input}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="editEmail">Email (Optional)</label>
              <input
                id="editEmail"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className={styles.input}
              />
            </div>
            
            <div className={styles.buttonGroup}>
              <button onClick={handleSaveEdit} className={styles.saveButton}>
                Save Changes
              </button>
              <button onClick={() => setIsEditing(false)} className={styles.cancelButton}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.friendProfile}>
            <div className={styles.profileHeader}>
              <div className={styles.avatar}>
                <span>{friend.name.charAt(0)}</span>
              </div>
              <div className={styles.info}>
                <h2>{friend.name}</h2>
                {friend.email && <p className={styles.email}>{friend.email}</p>}
              </div>
            </div>
            
            <div className={styles.balanceSection}>
              <h3>Balance with {friend.name}</h3>
              <div className={`${styles.balanceAmount} ${balance > 0 ? styles.positive : balance < 0 ? styles.negative : ''}`}>
                {balance > 0 ? `${friend.name} owes you $${Math.abs(balance).toFixed(2)}` : 
                 balance < 0 ? `You owe ${friend.name} $${Math.abs(balance).toFixed(2)}` :
                 `You're all settled up with ${friend.name}`}
              </div>
            </div>
            
            <div className={styles.actions}>
              <button onClick={() => setIsEditing(true)} className={styles.editButton}>
                Edit Friend
              </button>
              <button 
                onClick={() => router.push(`/expenses/new?friend=${friendId}`)} 
                className={styles.addExpenseButton}
              >
                Add Expense with {friend.name}
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className={styles.section}>
        <h3>Shared Expenses</h3>
        
        {sharedExpenses.length > 0 ? (
          <div className={styles.expensesList}>
            {sharedExpenses.map(expense => (
              <Link 
                key={expense.id} 
                href={`/expenses/${expense.id}`}
                className={styles.expenseCard}
              >
                <div className={styles.expenseHeader}>
                  <span className={styles.expenseDate}>
                    {new Date(expense.date).toLocaleDateString()}
                  </span>
                  <span className={styles.expenseAmount}>
                    {expense.currency} {expense.amount.toFixed(2)}
                  </span>
                </div>
                <div className={styles.expenseName}>{expense.description}</div>
                <div className={styles.expenseStatus}>
                  <span className={expense.settled ? styles.settledBadge : styles.unsettledBadge}>
                    {expense.settled ? 'Settled' : 'Unsettled'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className={styles.emptyMessage}>
            No shared expenses with {friend.name} yet.
          </p>
        )}
      </div>
    </div>
  );
}
