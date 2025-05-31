'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { FaChevronDown } from 'react-icons/fa';
import { useLanguage } from '@cybereco/ui-components';
import styles from './page.module.css';

interface ExpandedItems {
  [key: string]: boolean;
}

interface FaqEntry {
  id: string;
  question: string;
  answer: string;
}

interface FaqCategories {
  general: FaqEntry[];
  technical: FaqEntry[];
  business: FaqEntry[];
}

export default function FaqPage() {
  const { t } = useLanguage();
  
  // State to track which FAQ items are expanded
  const [expandedItems, setExpandedItems] = useState<ExpandedItems>({});
  
  // Toggle function for FAQ items
  const toggleItem = (id: string): void => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // FAQ data - organized by categories
  const faqData: FaqCategories = {
    general: [
      {
        id: 'what-is-cybereco',
        question: t('helpPage.faq1Q') || "What is CyberEco?",
        answer: t('helpPage.faq1A') || "CyberEco is an innovative company focused on developing digital applications that enhance financial collaboration, community engagement, and social connectivity through user-centered design."
      },
      {
        id: 'getting-started',
        question: t('helpPage.faq2Q') || "How can I start using CyberEco applications?",
        answer: t('helpPage.faq2A') || "You can explore our solutions in the Portfolio section and download or access them through the links provided for each application."
      }
    ],
    technical: [
      {
        id: 'platform-availability',
        question: t('helpPage.faq3Q') || "Are CyberEco's applications available on all platforms?",
        answer: t('helpPage.faq3A') || "Most of our applications are available as web apps, with iOS and Android versions available for our most popular tools like JustSplit and Nexus."
      },
      {
        id: 'data-security',
        question: t('helpPage.faq4Q') || "How does CyberEco ensure data privacy and security?",
        answer: t('helpPage.faq4A') || "We implement strong encryption, secure authentication protocols, and follow industry best practices for data protection. All our applications are designed with security as a priority."
      }
    ],
    business: [
      {
        id: 'business-use',
        question: t('helpPage.faq5Q') || "Can I use CyberEco applications for my organization or business?",
        answer: t('helpPage.faq5A') || "Yes, many of our applications like Demos and Community Manager have business/organization versions with enhanced features for professional use."
      },
      {
        id: 'enterprise-solutions',
        question: t('faqPage.enterpriseQuestion') || "Do you offer enterprise solutions?",
        answer: t('faqPage.enterpriseAnswer') || "Yes, we provide customized enterprise solutions for larger organizations. Please contact our sales team for more information about enterprise pricing and features."
      }
    ]
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {t('faqPage.title') || "Frequently Asked Questions"}
        </motion.h1>
        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {t('faqPage.subtitle') || "Find answers to common questions about CyberEco and our applications"}
        </motion.p>
      </header>
      
      <section className={styles.faqSection}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className={styles.faqCategory}>{t('faqPage.generalQuestionsTitle') || "General Questions"}</h2>
          {faqData.general.map((faq) => (
            <div key={faq.id} className={styles.faqItem}>
              <button 
                className={styles.faqQuestion}
                onClick={() => toggleItem(faq.id)}
              >
                {faq.question}
                <motion.div
                  className={styles.chevronIcon}
                  animate={{ rotate: expandedItems[faq.id] ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FaChevronDown />
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedItems[faq.id] && (
                  <motion.div
                    className={styles.faqAnswer}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {faq.answer}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          <h2 className={styles.faqCategory}>{t('faqPage.technicalQuestionsTitle') || "Technical Questions"}</h2>
          {faqData.technical.map((faq) => (
            <div key={faq.id} className={styles.faqItem}>
              <button 
                className={styles.faqQuestion}
                onClick={() => toggleItem(faq.id)}
              >
                {faq.question}
                <motion.div
                  className={styles.chevronIcon}
                  animate={{ rotate: expandedItems[faq.id] ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FaChevronDown />
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedItems[faq.id] && (
                  <motion.div
                    className={styles.faqAnswer}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {faq.answer}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          <h2 className={styles.faqCategory}>{t('faqPage.businessEnterpriseTitle') || "Business & Enterprise"}</h2>
          {faqData.business.map((faq) => (
            <div key={faq.id} className={styles.faqItem}>
              <button 
                className={styles.faqQuestion}
                onClick={() => toggleItem(faq.id)}
              >
                {faq.question}
                <motion.div
                  className={styles.chevronIcon}
                  animate={{ rotate: expandedItems[faq.id] ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FaChevronDown />
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedItems[faq.id] && (
                  <motion.div
                    className={styles.faqAnswer}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {faq.answer}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      </section>
      
      <div className={styles.contactSection}>
        <p className={styles.contactText}>{t('faqPage.contactText') || "Still have questions? We're here to help."}</p>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Link href="/contact" className={styles.contactButton}>
            {t('faqPage.contactButton') || "Contact Support"}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}