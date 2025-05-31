'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@cybereco/ui-components';
import styles from './CallToAction.module.css';

export default function CallToAction() {
  const { t } = useLanguage();

  return (
    <section className={styles.ctaSection}>
      <div className={styles.container}>
        <motion.h2 
          className={styles.ctaTitle}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          {t('homePage.callToAction.title') || 'Ready to Transform Your Relationship with Technology?'}
        </motion.h2>
        <motion.p 
          className={styles.ctaDescription}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          {t('homePage.callToAction.subtitle') || 'Discover how CyberEco\'s innovative applications can help you manage finances, engage with communities, and navigate social connections more effectively.'}
        </motion.p>
        <motion.div 
          className={styles.ctaButtons}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <Link href="/portfolio" className={styles.primaryButton}>
            {t('homePage.callToAction.exploreSolutions') || 'Explore Solutions'}
          </Link>
          <Link href="/help" className={styles.secondaryButton}>
            {t('homePage.callToAction.contactUs') || 'Get Support'}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}