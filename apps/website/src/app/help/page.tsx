'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FaQuestion, FaBook, FaHeadset, FaEnvelope } from 'react-icons/fa';
import { useLanguage } from '@cybereco/ui-components';
import styles from './page.module.css';

export default function HelpPage() {
  const { t } = useLanguage();

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {t('helpPage.title') || 'How Can We Help?'}
        </motion.h1>
        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {t('helpPage.subtitle') || 'Find the support you need with our help resources and documentation'}
        </motion.p>
      </header>

      <div className={styles.helpGrid}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/faq" className={styles.helpCard}>
            <div className={styles.iconWrapper}>
              <FaQuestion />
            </div>
            <h3 className={styles.cardTitle}>
              {t('helpPage.faqTitle') || 'FAQ'}
            </h3>
            <p className={styles.cardDescription}>
              {t('helpPage.faqDesc') || 'Find answers to commonly asked questions about our solutions and the CyberEco ecosystem'}
            </p>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Link href="/documentation" className={styles.helpCard}>
            <div className={styles.iconWrapper}>
              <FaBook />
            </div>
            <h3 className={styles.cardTitle}>
              {t('helpPage.docsTitle') || 'Solution Documentation'}
            </h3>
            <p className={styles.cardDescription}>
              {t('helpPage.docsDesc') || 'Detailed guides and documentation for all solution categories in our digital ecosystem'}
            </p>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link href="/support" className={styles.helpCard}>
            <div className={styles.iconWrapper}>
              <FaHeadset />
            </div>
            <h3 className={styles.cardTitle}>
              {t('helpPage.supportTitle') || 'Community Support'}
            </h3>
            <p className={styles.cardDescription}>
              {t('helpPage.supportDesc') || 'Get help from our support team and community for any issues across all solution categories'}
            </p>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link href="/contact" className={styles.helpCard}>
            <div className={styles.iconWrapper}>
              <FaEnvelope />
            </div>
            <h3 className={styles.cardTitle}>
              {t('helpPage.contactTitle') || 'Contact'}
            </h3>
            <p className={styles.cardDescription}>
              {t('helpPage.contactDesc') || 'Reach out to us directly for questions about any of our solutions or to suggest new features'}
            </p>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}