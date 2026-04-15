'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@cybereco/ui-components';
import styles from './MissionSection.module.css';

export default function MissionSection() {
  const { t } = useLanguage();

  return (
    <section className={styles.missionSection}>
      <div className={styles.container}>
        <div className={styles.missionContent}>
          <div className={styles.textContent}>
            <motion.p 
              className={styles.sectionSubtitle}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              {t('homePage.mission.sectionTitle') || 'OUR MISSION'}
            </motion.p>
            
            <motion.h2 
              className={styles.sectionTitle}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              {t('homePage.mission.sectionSubtitle') || 'Creating harmony between technology and sustainability'}
            </motion.h2>
            
            <motion.p 
              className={styles.description}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {t('homePage.mission.missionText') || 'At CyberEco, our mission is to design and implement user-centered digital applications that enhance financial collaboration, community engagement, and social connectivity. We develop tools that promote transparency, efficiency, and healthy relationships between people and technology, enabling individuals and communities to thrive in our increasingly digital world.'}
            </motion.p>
            
            <motion.div 
              className={styles.buttonContainer}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <a href="/about" className={styles.learnMoreButton}>
                {t('homePage.mission.learnMore') || 'Learn More About Us'}
              </a>
            </motion.div>
          </div>
          <div className={styles.imageWrapper}>
            <motion.div 
              className={styles.missionImage}
              initial={{ opacity: 0, x: 100 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}