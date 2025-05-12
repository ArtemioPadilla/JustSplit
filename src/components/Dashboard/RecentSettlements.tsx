import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../../app/page.module.css';
import { useAppContext } from '../../context/AppContext';
import { formatCurrency, convertCurrency, getCurrencySymbol } from '../../utils/currencyExchange';

const RecentSettlements = ({ settlements: propSettlements, users: propUsers, events: propEvents, preferredCurrency: propPreferredCurrency, isConvertingCurrencies: propIsConverting, expenses: propExpenses }) => {
  const context = useAppContext();
  const state = context?.state;
  const preferredCurrency = propPreferredCurrency || context?.preferredCurrency || 'USD';
  const isConvertingCurrencies = propIsConverting !== undefined ? propIsConverting : context?.isConvertingCurrencies ?? true;
  const users = propUsers || state?.users || [];
  const events = propEvents || state?.events || [];
  const settlements = propSettlements || state?.settlements || [];
  const expenses = propExpenses || state?.expenses || [];
  const [expanded, setExpanded] = useState({});

  // Helper: get user name
  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown';
  };

  // Helper: get event name
  const getEventName = (eventId) => {
    if (!eventId) return null;
    const event = events.find(e => e.id === eventId);
    return event ? event.name : null;
  };

  // Fetch converted amounts for settlements
  const [convertedAmounts, setConvertedAmounts] = useState({});
  const [fallbacks, setFallbacks] = useState({});

  useEffect(() => {
    let isMounted = true;
    const fetchConversions = async () => {
      const conversions = {};
      const fallbackFlags = {};
      await Promise.all(
        settlements.map(async (settlement) => {
          if (settlement.currency === preferredCurrency || !isConvertingCurrencies) {
            conversions[settlement.id] = settlement.amount;
            fallbackFlags[settlement.id] = false;
          } else {
            try {
              const { convertedAmount, isFallback } = await convertCurrency(
                settlement.amount,
                settlement.currency,
                preferredCurrency
              );
              conversions[settlement.id] = convertedAmount;
              fallbackFlags[settlement.id] = isFallback;
            } catch {
              conversions[settlement.id] = settlement.amount;
              fallbackFlags[settlement.id] = true;
            }
          }
        })
      );
      if (isMounted) {
        setConvertedAmounts(conversions);
        setFallbacks(fallbackFlags);
      }
    };
    fetchConversions();
    return () => { isMounted = false; };
  }, [settlements, preferredCurrency, isConvertingCurrencies]);

  // Show only the 3 most recent settlements
  const recentSettlements = [...settlements]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  return (
    <div className={styles.dashboardCard}>
      <h2 className={styles.cardTitle}>Recent Settlements</h2>
      {recentSettlements.length > 0 ? (
        <ul className={styles.settlementsList} style={{ padding: 0, margin: 0 }}>
          {recentSettlements.map(settlement => {
            const fromName = getUserName(settlement.fromUser);
            const toName = getUserName(settlement.toUser);
            const eventName = getEventName(settlement.eventId);
            const originalAmount = formatCurrency(settlement.amount, settlement.currency);
            const converted = convertedAmounts[settlement.id];
            const isFallback = fallbacks[settlement.id];
            const showConverted = settlement.currency !== preferredCurrency && isConvertingCurrencies;
            const expenseCount = settlement.expenseIds?.length || 0;
            const isExpanded = expanded[settlement.id];
            return (
              <li key={settlement.id} className={styles.settlementItem} style={{ listStyle: 'none', marginBottom: 18 }}>
                <div className={styles.settlementCard} style={{ boxShadow: 'var(--shadow-md)', borderRadius: 12, padding: 20, background: '#fff', transition: 'box-shadow 0.2s', position: 'relative' }}>
                  <div className={styles.settlementDetails} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className={styles.settlementUsers} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className={styles.userAvatar} title={fromName} style={{ background: '#e0e7ef', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 18 }}>{fromName[0]}</span>
                      <span className={styles.userName} style={{ fontWeight: 500 }}>{fromName}</span>
                      <span className={styles.arrowIcon} style={{ fontSize: 22, margin: '0 8px', color: '#bbb' }}>→</span>
                      <span className={styles.userAvatar} title={toName} style={{ background: '#e0e7ef', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 18 }}>{toName[0]}</span>
                      <span className={styles.userName} style={{ fontWeight: 500 }}>{toName}</span>
                    </div>
                    <div className={styles.settlementAmount} style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, fontSize: 18 }}>{originalAmount}</span>
                      {showConverted && converted !== undefined && (
                        <span className={styles.convertedAmount} title={isFallback ? 'Approximate conversion' : 'Converted amount'} style={{ marginLeft: 8, fontSize: '0.95em', color: '#888' }}>
                          ≈ {getCurrencySymbol(preferredCurrency)}{converted.toFixed(2)}
                          {isFallback && <span style={{ color: '#fcd34d', marginLeft: 2 }} title="Approximate rate">*</span>}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.settlementMeta} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
                    <span className={styles.settlementDate} style={{ color: '#888', fontSize: 14 }}>{new Date(settlement.date).toLocaleDateString()}</span>
                    {eventName && <span className={styles.settlementEvent} style={{ color: '#4f46e5', fontWeight: 500 }}>Event: <b>{eventName}</b></span>}
                    <span className={styles.settlementStatus} style={{ color: 'var(--color-success)', fontWeight: 600, background: '#e6f9f0', borderRadius: 8, padding: '2px 10px', fontSize: 13 }}>Completed</span>
                    <span style={{ color: '#888', fontSize: 13, cursor: 'pointer' }} onClick={() => setExpanded(e => ({ ...e, [settlement.id]: !e[settlement.id] }))}>
                      {expenseCount} expense{expenseCount !== 1 ? 's' : ''} {expenseCount > 0 && (<span style={{ textDecoration: 'underline', marginLeft: 4 }}>{isExpanded ? 'Hide' : 'Show'}</span>)}
                    </span>
                  </div>
                  {isExpanded && expenseCount > 0 && (
                    <div style={{ marginTop: 10, background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {settlement.expenseIds.map(expId => {
                          const exp = expenses.find(e => e.id === expId);
                          if (!exp) return null;
                          return (
                            <li key={expId} style={{ padding: '4px 0', borderBottom: '1px solid #eee', fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{exp.description}</span>
                              <span style={{ color: '#888', fontSize: 13 }}>{formatCurrency(exp.amount, exp.currency)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  <Link href={`/settlements/${settlement.id}`} className={styles.settlementLink} data-testid="next-link" style={{ position: 'absolute', inset: 0, zIndex: 1, borderRadius: 12 }} aria-label={`View settlement details for ${fromName} to ${toName}`}></Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>No settlements yet</p>
      )}
      <div className={styles.viewAllLink}>
        <Link href="/settlements">View all settlements</Link>
      </div>
    </div>
  );
};

export default RecentSettlements;
