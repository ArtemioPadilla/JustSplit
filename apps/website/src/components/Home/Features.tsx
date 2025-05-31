'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FaUsers, FaLeaf, FaLock, FaLaptopCode } from 'react-icons/fa';
import { useLanguage } from '@cybereco/ui-components';
import styles from './Features.module.css';

const featuresData = [
  {
    id: 1,
    icon: FaUsers,
    titleKey: 'homePage.features.communityTitle',
    descKey: 'homePage.features.communityDesc',
    defaultTitle: 'Community Building',
    defaultDesc: 'Create and nurture thriving digital communities with tools designed for meaningful connection and collaboration.',
  },
  {
    id: 2,
    icon: FaLeaf,
    titleKey: 'homePage.features.sustainabilityTitle',
    descKey: 'homePage.features.sustainabilityDesc',
    defaultTitle: 'Sustainability',
    defaultDesc: 'Eco-friendly digital solutions designed with environmental impact in mind, promoting sustainable practices.',
  },
  {
    id: 3,
    icon: FaLock,
    titleKey: 'homePage.features.securityTitle',
    descKey: 'homePage.features.securityDesc',
    defaultTitle: 'Enhanced Security',
    defaultDesc: 'State-of-the-art security measures to protect your data and ensure privacy across all our applications.',
  },
  {
    id: 4,
    icon: FaLaptopCode,
    titleKey: 'homePage.features.innovationTitle',
    descKey: 'homePage.features.innovationDesc',
    defaultTitle: 'Innovative Tech',
    defaultDesc: 'Cutting-edge technology solutions that anticipate needs and solve problems before they arise.',
  },
];

export default function Features() {
  const { t } = useLanguage();

  return (
    <section className={styles.featuresSection}>
      <div className={styles.container}>
        <motion.h2 
          className={styles.sectionTitle}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          {t('homePage.features.sectionTitle') || 'Transformative Technology Solutions'}
        </motion.h2>
        <motion.p 
          className={styles.sectionDescription}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          {t('homePage.features.sectionSubtitle') || 'What sets our solutions apart from the rest'}
        </motion.p>
        
        <div className={styles.featuresGrid}>
          {featuresData.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <motion.div 
                key={feature.id} 
                className={styles.featureCard}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                viewport={{ once: true, margin: "-50px" }}
              >
                <div className={styles.iconWrapper}>
                  <IconComponent className={styles.icon} />
                </div>
                <h3 className={styles.featureTitle}>
                  {t(feature.titleKey) || feature.defaultTitle}
                </h3>
                <p className={styles.featureDescription}>
                  {t(feature.descKey) || feature.defaultDesc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}