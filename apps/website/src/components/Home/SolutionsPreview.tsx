'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@cybereco/ui-components';
import styles from './SolutionsPreview.module.css';

const solutions = [
  {
    id: 'justsplit',
    name: 'JustSplit',
    description: 'A simple and intuitive expense tracking and sharing app that helps friends, roommates, and groups easily manage shared finances.',
    icon: '💰',
    link: 'https://justsplit.cybere.co',
    color: 'rgba(0, 98, 65, 0.2)',
    category: 'Finance & Economy',
    phase: 'Priority MVP (Phase 1)',
    image: '/portfolio/justsplit.png'
  },
  {
    id: 'demos',
    name: 'Demos',
    description: 'Transparent voting and decision-making platform for organizations and neighborhoods.',
    icon: '🗳️',
    link: '/portfolio#demos',
    color: 'rgba(0, 123, 255, 0.2)',
    category: 'Community & Governance',
    phase: 'Priority MVP (Phase 1)'
  },
  {
    id: 'plantopia',
    name: 'Plantopia',
    description: 'Smart gardening platform with sensors and personalized recommendations.',
    icon: '🌱',
    link: 'https://plantopia.cybere.co',
    color: 'rgba(40, 167, 69, 0.2)',
    category: 'Sustainability & Home',
    phase: 'Green Impact (Phase 2)'
  },
  {
    id: 'educationhub',
    name: 'Education Hub',
    description: 'Modular platform to access learning paths and educational content in a community-oriented environment.',
    icon: '📚',
    link: '/portfolio#educationhub',
    color: 'rgba(255, 193, 7, 0.2)',
    category: 'Education & Growth',
    phase: 'Green Impact (Phase 2)'
  }
];

export default function SolutionsPreview() {
  const { t } = useLanguage();

  return (
    <section className={styles.solutionsSection}>
      <div className={styles.container}>
        <motion.h2 
          className={styles.sectionTitle}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          {t('homePage.solutions.sectionTitle') || 'Our Solutions'}
        </motion.h2>
        <motion.p 
          className={styles.sectionDescription}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          {t('homePage.solutions.sectionSubtitle') || 'Explore our diverse portfolio of digital applications designed to enhance productivity, connectivity, and community engagement'}
        </motion.p>
        
        <div className={styles.solutionsGrid}>
          {solutions.map((solution, index) => (
            <motion.div
              key={solution.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              viewport={{ once: true }}
            >
              <Link 
                href={solution.link}
                className={styles.solutionCard}
                style={{ '--accent-color': solution.color } as React.CSSProperties}
              >
                <div className={styles.cardImage} style={{ backgroundColor: solution.color }}>
                  {solution.image && (
                    <img src={solution.image} alt={solution.name} className={styles.cardImageImg} />
                  )}
                </div>
                <div className={styles.cardBadge}>
                  {solution.phase}
                </div>
                <div className={styles.cardContent}>
                  <span className={styles.cardCategory}>{solution.category}</span>
                  <h3 className={styles.solutionName}>{solution.name}</h3>
                  <p className={styles.solutionDescription}>{solution.description}</p>
                  <span className={styles.learnMore}>
                    {t('homePage.solutions.learnMore') || 'Learn more'} →
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        
        <div className={styles.allSolutionsWrapper}>
          <Link href="/portfolio" className={styles.allSolutionsLink}>
            {t('homePage.solutions.viewAll') || 'View All Solutions'} →
          </Link>
        </div>
      </div>
    </section>
  );
}