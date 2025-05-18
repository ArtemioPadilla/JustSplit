'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import styles from './about.module.css';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6 }
  }
};

const staggerChildren = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2
    }
  }
};

const AboutPage = () => {
  return (
    <div className={styles.aboutPage}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <motion.div 
          className={styles.container}
          initial="hidden"
          animate="visible"
          variants={staggerChildren}
        >
          <motion.h1 
            className={styles.mainTitle}
            variants={fadeInUp}
          >
            About JustSplit
          </motion.h1>
          <motion.p 
            className={styles.subtitle}
            variants={fadeInUp}
          >
            Simplifying expense sharing since 2023
          </motion.p>
        </motion.div>
      </section>

      {/* Our Mission */}
      <section className={styles.section}>
        <div className={styles.container}>
          <motion.div 
            className={styles.twoColumns}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerChildren}
          >
            <motion.div 
              className={styles.columnContent}
              variants={fadeInUp}
            >
              <h2 className={styles.sectionTitle}>Our Mission</h2>
              <p className={styles.sectionText}>
                JustSplit was created with a simple mission: to eliminate the awkward conversations and
                complexities of splitting expenses with friends, family, and roommates.
              </p>
              <p className={styles.sectionText}>
                We believe that managing shared finances should be effortless, transparent, and stress-free.
                By providing an intuitive platform for expense tracking and debt settlement, we help preserve
                the relationships that matter most.
              </p>
            </motion.div>
            <motion.div 
              className={styles.columnImage}
              variants={fadeInUp}
            >
              <div className={styles.missionImageContainer}>
                <div className={styles.valueCard}>
                  <div className={styles.valueIcon}>🤝</div>
                  <h3>Simplicity</h3>
                  <p>Making expense sharing accessible to everyone</p>
                </div>
                <div className={styles.valueCard}>
                  <div className={styles.valueIcon}>⚖️</div>
                  <h3>Fairness</h3>
                  <p>Ensuring everyone pays exactly what they owe</p>
                </div>
                <div className={styles.valueCard}>
                  <div className={styles.valueIcon}>🛡️</div>
                  <h3>Trust</h3>
                  <p>Building transparent financial relationships</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className={`${styles.section} ${styles.altBackground}`}>
        <div className={styles.container}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerChildren}
          >
            <motion.h2 
              className={`${styles.sectionTitle} ${styles.centered}`}
              variants={fadeInUp}
            >
              How JustSplit Works
            </motion.h2>
            
            <motion.div 
              className={styles.workflowSteps}
              variants={fadeInUp}
            >
              <div className={styles.step}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <h3>Create Groups</h3>
                  <p>Organize your expenses by trip, household, event, or any shared experience</p>
                </div>
              </div>
              
              <div className={styles.step}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <h3>Add Expenses</h3>
                  <p>Log bills as they happen and assign them to the right people</p>
                </div>
              </div>
              
              <div className={styles.step}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <h3>Split Automatically</h3>
                  <p>Our algorithm calculates the most efficient way to settle debts</p>
                </div>
              </div>
              
              <div className={styles.step}>
                <div className={styles.stepNumber}>4</div>
                <div className={styles.stepContent}>
                  <h3>Settle Up</h3>
                  <p>See who owes what and mark debts as paid when settled</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Our Team */}
      <section className={styles.section}>
        <div className={styles.container}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerChildren}
          >
            <motion.h2 
              className={`${styles.sectionTitle} ${styles.centered}`}
              variants={fadeInUp}
            >
              The Bigger Picture
            </motion.h2>
            
            <motion.p 
              className={`${styles.sectionText} ${styles.centered}`}
              variants={fadeInUp}
            >
              JustSplit is part of CyberEco. A ecosistem to enhance the control of your environment and ecosistem.
            </motion.p>
            
          </motion.div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerChildren}
          >
            <motion.h2 
              className={styles.ctaTitle}
              variants={fadeInUp}
            >
              Have Questions?
            </motion.h2>
            
            <motion.p 
              className={styles.ctaText}
              variants={fadeInUp}
            >
              We'd love to hear from you! Reach out to our team for support, partnership opportunities, or just to say hello.
            </motion.p>
            
            <motion.div 
              className={styles.ctaButtons}
              variants={fadeInUp}
            >
              <Link href="/help" className={styles.primaryButton}>
                Visit Help Center
              </Link>
              <a href="mailto:contact@justsplit.com" className={styles.secondaryButton}>
                Email Us
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
