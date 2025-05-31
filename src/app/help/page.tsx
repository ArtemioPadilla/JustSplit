'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import styles from './help.module.css';

const HelpPage = () => {
  const [activeCategory, setActiveCategory] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Categories for help topics
  const categories = [
    { id: 'getting-started', name: 'Getting Started' },
    { id: 'managing-expenses', name: 'Managing Expenses' },
    { id: 'groups-friends', name: 'Groups & Friends' },
    { id: 'settlements', name: 'Settlements' },
    { id: 'account-billing', name: 'Account & Billing' },
  ];

  // FAQ data organized by category
  const faqData = {
    'getting-started': [
      {
        question: "How do I create an account?",
        answer: "Sign up by clicking the 'Sign Up Free' button on the homepage. You can register using your email address, Google, or Facebook account."
      },
      {
        question: "Is JustSplit free to use?",
        answer: "Yes! JustSplit is completely free for basic expense splitting. We offer premium features for power users who need advanced reporting and integrations."
      },
      {
        question: "How do I add friends to JustSplit?",
        answer: "Navigate to the 'Friends' section and click 'Add Friend'. You can invite friends via email or by sharing your unique invitation link."
      }
    ],
    'managing-expenses': [
      {
        question: "How do I add an expense?",
        answer: "Click the '+' button on the dashboard or Expenses page. Fill in the details such as amount, description, date, who paid, and how to split it."
      },
      {
        question: "Can I split expenses unequally?",
        answer: "Absolutely! When adding an expense, select 'Unequal Split' and you can specify exact amounts or percentages for each person."
      },
      {
        question: "How do I edit or delete an expense?",
        answer: "Find the expense in your list, click on it to view details, then use the edit or delete buttons. Note that this will recalculate balances for everyone involved."
      }
    ],
    'groups-friends': [
      {
        question: "How do I create a group?",
        answer: "Go to the Groups section and click 'Create Group'. Add a name, optional description, and invite members."
      },
      {
        question: "Can I add someone to a group who doesn't use JustSplit?",
        answer: "Yes! Add them as a non-registered user. They won't receive notifications, but you can track their expenses. Invite them anytime to convert to a full user."
      },
      {
        question: "How do I remove someone from a group?",
        answer: "Go to the group settings, select 'Members', find the person you want to remove, and click the remove icon. Note that they must have a zero balance first."
      }
    ],
    'settlements': [
      {
        question: "How do I settle up with someone?",
        answer: "Go to the Settlements page, select the person you want to settle with, click 'Settle Up', and record the payment method and amount."
      },
      {
        question: "Can JustSplit process payments directly?",
        answer: "JustSplit doesn't process payments directly but integrates with popular payment platforms. Record settlements manually after payment is completed."
      },
      {
        question: "How does JustSplit simplify who pays whom?",
        answer: "Our algorithm calculates the minimum number of transactions needed to settle all debts in a group, helping you avoid multiple small payments."
      }
    ],
    'account-billing': [
      {
        question: "How do I change my password or email?",
        answer: "Go to 'Profile' → 'Account Settings' to update your email address, password, or other account information."
      },
      {
        question: "Is my financial information secure?",
        answer: "Absolutely! We use bank-level encryption and never store actual payment details. JustSplit only tracks the information you provide about expenses and balances."
      },
      {
        question: "How do I delete my account?",
        answer: "Go to 'Profile' → 'Account Settings' → 'Delete Account'. Please note you must settle all outstanding balances first."
      }
    ]
  };

  // Toggle FAQ accordion
  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  // Filter FAQs based on search query
  const getFilteredFaqs = () => {
    if (!searchQuery) {
      return faqData[activeCategory as keyof typeof faqData];
    }
    
    const lowerSearchQuery = searchQuery.toLowerCase();
    
    // Search across all categories
    let results: { question: string; answer: string }[] = [];
    Object.values(faqData).forEach(categoryFaqs => {
      const filtered = categoryFaqs.filter(faq => 
        faq.question.toLowerCase().includes(lowerSearchQuery) || 
        faq.answer.toLowerCase().includes(lowerSearchQuery)
      );
      results = [...results, ...filtered];
    });
    
    return results;
  };

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.4 }
    }
  };

  return (
    <div className={styles.helpPage}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <h1 className={styles.mainTitle}>How can we help you?</h1>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search help topics..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className={styles.searchButton}>
              Search
            </button>
          </div>
        </div>
      </section>

      <div className={styles.container}>
        <div className={styles.helpContent}>
          {/* Sidebar Navigation */}
          <aside className={styles.sidebar}>
            <h2 className={styles.sidebarTitle}>Topics</h2>
            <nav className={styles.categoryNav}>
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`${styles.categoryButton} ${activeCategory === category.id ? styles.active : ''}`}
                  onClick={() => {
                    setActiveCategory(category.id);
                    setSearchQuery('');
                  }}
                >
                  {category.name}
                </button>
              ))}
            </nav>
            
            <div className={styles.contactBox}>
              <h3>Need more help?</h3>
              <p>Our support team is ready to assist you with any questions.</p>
              <a href="mailto:support@cybere.co" className={styles.contactLink}>
                Contact Support
              </a>
            </div>
          </aside>

          {/* Main Content */}
          <main className={styles.mainContent}>
            {searchQuery ? (
              <motion.div 
                key="search-results"
                initial="hidden"
                animate="visible"
                variants={fadeIn}
              >
                <h2 className={styles.contentTitle}>
                  Search Results for &quot;{searchQuery}&quot;
                </h2>
                
                {getFilteredFaqs().length > 0 ? (
                  <div className={styles.faqContainer}>
                    {getFilteredFaqs().map((faq, index) => (
                      <div 
                        key={index} 
                        className={`${styles.faqItem} ${activeFaq === index ? styles.active : ''}`}
                      >
                        <button 
                          className={styles.faqQuestion} 
                          onClick={() => toggleFaq(index)}
                          aria-expanded={activeFaq === index}
                        >
                          {faq.question}
                          <span className={styles.faqArrow}>
                            {activeFaq === index ? '−' : '+'}
                          </span>
                        </button>
                        {activeFaq === index && (
                          <div className={styles.faqAnswer}>
                            <p>{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.noResults}>
                    <p>No results found for &quot;{searchQuery}&quot;</p>
                    <p>Try different keywords or browse the topics from the menu.</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key={activeCategory}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
              >
                <h2 className={styles.contentTitle}>
                  {categories.find(category => category.id === activeCategory)?.name}
                </h2>
                
                <div className={styles.faqContainer}>
                  {faqData[activeCategory as keyof typeof faqData].map((faq, index) => (
                    <div 
                      key={index} 
                      className={`${styles.faqItem} ${activeFaq === index ? styles.active : ''}`}
                    >
                      <button 
                        className={styles.faqQuestion} 
                        onClick={() => toggleFaq(index)}
                        aria-expanded={activeFaq === index}
                      >
                        {faq.question}
                        <span className={styles.faqArrow}>
                          {activeFaq === index ? '−' : '+'}
                        </span>
                      </button>
                      {activeFaq === index && (
                        <div className={styles.faqAnswer}>
                          <p>{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {activeCategory === 'getting-started' && (
                  <div className={styles.helpGuides}>
                    <h3 className={styles.guidesTitle}>Quick Start Guides</h3>
                    <div className={styles.guidesGrid}>
                      <div className={styles.guideCard}>
                        <div className={styles.guideIcon}>📱</div>
                        <h4>Getting Started Guide</h4>
                        <p>Set up your account and learn the basics in 5 minutes</p>
                        <Link href="#" className={styles.guideLink}>
                          View Guide
                        </Link>
                      </div>
                      <div className={styles.guideCard}>
                        <div className={styles.guideIcon}>👥</div>
                        <h4>Create Your First Group</h4>
                        <p>Learn how to create groups and invite friends</p>
                        <Link href="#" className={styles.guideLink}>
                          View Guide
                        </Link>
                      </div>
                      <div className={styles.guideCard}>
                        <div className={styles.guideIcon}>💰</div>
                        <h4>Adding Expenses</h4>
                        <p>Step-by-step guide to adding and splitting expenses</p>
                        <Link href="#" className={styles.guideLink}>
                          View Guide
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            
            <div className={styles.helpFooter}>
              <p>Didn&apos;t find what you&apos;re looking for?</p>
              <div className={styles.helpFooterButtons}>
                <Link href="/about" className={styles.footerLink}>
                  About Us
                </Link>
                <a href="mailto:support@cybere.co" className={styles.footerLink}>
                  Contact Support
                </a>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
