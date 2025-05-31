'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '../../../context/AppContext';
import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';
import Timeline from '../../../components/ui/Timeline';
import Button from '../../../components/ui/Button';
import EditableText from '../../../components/ui/EditableText';
import CurrencySelector from '../../../components/ui/CurrencySelector';
import { convertCurrency } from '../../../utils/currencyExchange';

export default function ExpenseDetail() {
  const router = useRouter();
  const params = useParams();
  const { 
    state, 
    dispatch, 
    updateExpense, 
    deleteExpense,
    preferredCurrency, 
    isConvertingCurrencies,
  } = useAppContext();
  
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isUpdatingNotes, setIsUpdatingNotes] = useState<boolean>(false);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [localCurrency, setLocalCurrency] = useState<string>(preferredCurrency || 'USD');

  const expenseId = params?.id as string | undefined;

  const expense = useMemo(() => {
    if (!expenseId) return undefined;
    return state.expenses.find(e => e.id === expenseId);
  }, [state.expenses, expenseId]);

  const paidByUser = useMemo(() => {
    if (!expense) return null;
    return state.users.find(user => user.id === expense.paidBy);
  }, [expense, state.users]);

  const event = useMemo(() => {
    if (!expense) return null;
    return state.events.find(e => e.id === expense.eventId);
  }, [expense, state.events]);

  const participants = useMemo(() => {
    if (!expense) return [];
    return state.users.filter(user => expense.participants.includes(user.id));
  }, [expense, state.users]);

  const eventExpenses = useMemo(() => {
    if (!event) return []; // Depends on event, which depends on expense
    return state.expenses.filter(e => e.eventId === event.id);
  }, [event, state.expenses]);

  // Handle expense description update
  const handleExpenseDescriptionUpdate = async (newDescription: string) => {
    if (!expense) return;
    setIsUpdating(true);
    
    try {
      // Update local state
      const updatedExpense = { ...expense, description: newDescription };
      dispatch({ type: 'UPDATE_EXPENSE', payload: updatedExpense });
      
      // Update in Firestore
      await updateExpense(expense.id, { description: newDescription });
    } catch (error) {
      console.error('Error updating expense description:', error);
      alert('Failed to update expense description. Please try again.');
    } finally {
      setTimeout(() => setIsUpdating(false), 500);
    }
  };

  // Handle expense notes update
  const handleExpenseNotesUpdate = async (newNotes: string) => {
    if (!expense) return;
    setIsUpdatingNotes(true);
    
    try {
      // Update local state
      const updatedExpense = { ...expense, notes: newNotes };
      dispatch({ type: 'UPDATE_EXPENSE', payload: updatedExpense });
      
      // Update in Firestore
      await updateExpense(expense.id, { notes: newNotes });
    } catch (error) {
      console.error('Error updating expense notes:', error);
      alert('Failed to update expense notes. Please try again.');
    } finally {
      setTimeout(() => setIsUpdatingNotes(false), 500);
    }
  };

  // Handle expense deletion
  const handleDeleteExpense = async () => {
    if (!expense) return;
    
    const confirmDelete = window.confirm('Are you sure you want to delete this expense? This action cannot be undone.');
    if (!confirmDelete) return;
    
    try {
      await deleteExpense(expense.id);
      
      // Navigate based on whether expense was part of an event
      if (expense.eventId) {
        router.push(`/events/${expense.eventId}`);
      } else {
        router.push('/expenses/list');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense. Please try again.');
    }
  };
  
  // Calculate converted amount when currency or expense changes
  useEffect(() => {
    if (!expense || !isConvertingCurrencies) {
      setConvertedAmount(null);
      return;
    }

    const calculateConversion = async () => {
      if (expense.currency === preferredCurrency) {
        setConvertedAmount(expense.amount);
      } else {
        try {
          // Use the imported convertCurrency function from utils
          const { convertedAmount } = await convertCurrency(
            expense.amount,
            expense.currency,
            preferredCurrency
          );
          setConvertedAmount(convertedAmount);
        } catch (error) {
          console.error('Error converting currency:', error);
          // Fallback to original amount on error
          setConvertedAmount(expense.amount);
        }
      }
    };

    calculateConversion();
  }, [expense, preferredCurrency, isConvertingCurrencies]);

  if (!expenseId) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Loading...</h1>
        <p>Expense ID not found in URL.</p>
        <Link href="/expenses/list" className={styles.backButton}>
          Return to Expenses List
        </Link>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Expense Not Found</h1>
        <p>The expense you&apos;re looking for (ID: {expenseId}) doesn&apos;t exist or has been deleted.</p>
        <Link href="/expenses/list" className={styles.backButton}>
          Return to Expenses List
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <EditableText
          as="h1"
          value={expense.description}
          onSave={handleExpenseDescriptionUpdate}
          className={`${styles.title} ${isUpdating ? styles.updating : ''}`}
        />
        <div className={styles.headerActions}>
          <CurrencySelector
            value={localCurrency}
            onChange={setLocalCurrency}
            compact={true}
            label="Convert to:"
          />
          <Link href="/expenses/list" className={styles.backButton}>
            Back to Expenses
          </Link>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.amountDisplay}>
          <span className={styles.currency}>{isConvertingCurrencies ? preferredCurrency : expense.currency}</span>
          <span className={styles.amount}>
            {isConvertingCurrencies && convertedAmount !== null 
              ? convertedAmount.toFixed(2) 
              : expense.amount.toFixed(2)
            }
          </span>
          {isConvertingCurrencies && convertedAmount !== null && expense.currency !== preferredCurrency && (
            <span className={styles.originalAmount}>
              (Originally: {expense.currency} {expense.amount.toFixed(2)})
            </span>
          )}
        </div>
      </div>

      {event && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Expense Timeline</h2>
          <Timeline
            event={{
              ...event,
              startDate: event.startDate || event.date || '',
            }}
            expenses={eventExpenses.map(exp => ({
              ...exp,
              date: exp.date,
              type: 'expense',
              title: exp.description,
              eventName: event.name,
              userNames: Object.fromEntries(exp.participants.map(pid => {
                const user = state.users.find(u => u.id === pid);
                return [pid, user ? user.name : 'Unknown'];
              })),
              category: exp.category ?? '',
            }))}
          />
          <div className={styles.eventDetails}>
            <span className={styles.detailLabel}>Part of Event:</span>
            <Link href={`/events/${event.id}`} className={styles.eventLink}>
              {event.name}
            </Link>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Details</h2>
        <div className={styles.detailGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Date</span>
            <span className={styles.detailValue}>
              {new Date(expense.date).toLocaleDateString()}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Paid By</span>
            <span className={styles.detailValue}>
              {paidByUser ? paidByUser.name : 'Unknown User'}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Event</span>
            <span className={styles.detailValue}>
              {event ? event.name : 'No Event'}
            </span>
          </div>
          {/* Category was removed as it's not in Expense type */}
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Status</span>
            <span className={`${styles.detailValue} ${expense.settled ? styles.settled : styles.unsettled}`}>
              {expense.settled ? 'Settled' : 'Unsettled'}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Split Method</span>
            <span className={styles.detailValue}>
              {expense.splitMethod === 'equal' ? 'Split Equally' : expense.splitMethod === 'custom' ? 'Custom Split' : 'Percentage Split'}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Split Among ({participants.length})</h2>
        {participants.length > 0 ? (
          <ul className={styles.participantsList}>
            {participants.map(user => (
              <li key={user.id} className={styles.participantItem}>
                {user.name}
              </li>
            ))}
          </ul>
        ) : (
          <p>This expense isn&apos;t split with anyone.</p>
        )}
      </div>

      {/* Use EditableText for notes */}
      {expense.notes !== undefined && ( // Check if notes exist (can be empty string)
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Notes</h2>
          <EditableText
            as="p"
            value={expense.notes || ''} // Provide empty string if notes is null/undefined
            onSave={handleExpenseNotesUpdate}
            className={`${styles.notes} ${isUpdatingNotes ? styles.updating : ''}`}
            placeholder="Click to add notes"
          />
        </div>
      )}

      {expense.images && expense.images.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Receipts & Evidence</h2>
          <div className={styles.imageGallery}>
            {expense.images.map((image, index) => (
              <div key={image} className={styles.imageContainer}> {/* Changed key to image */}
                <a href={image} target="_blank" rel="noopener noreferrer">
                  <Image
                    src={image}
                    alt={`Receipt ${index + 1}`}
                    className={styles.image}
                    width={200}
                    height={200}
                  />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <Button
          onClick={() => {
            import('../../../utils/csvExport').then(module => {
              module.exportExpensesToCSV(
                [expense],
                state.users,
                state.events,
                `expense-${expense.id}.csv`
              );
            });
          }}
          variant="secondary"
        >
          Export as CSV
        </Button>
        <Button
          onClick={() => router.push(`/expenses/edit/${expenseId}`)}
          variant="secondary"
        >
          Edit Expense
        </Button>
        <Button
          onClick={handleDeleteExpense}
          variant="secondary"
        >
          Delete Expense
        </Button>
      </div>
    </div>
  );
}
