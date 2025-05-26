'use client';

import { motion } from 'framer-motion';
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
        <div className={styles.container}>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerChildren}
          >
            <h1 className={styles.mainTitle}>
              <motion.h1
                variants={fadeInUp}
              >
                About JustSplit
              </motion.h1>
            </h1>
            <p className={styles.subtitle}>
              <motion.p
                variants={fadeInUp}
              >
                Simplifying expense sharing since 2023
              </motion.p>
            </p>
          </motion.div>
        </div>
      </section>

      {/* Our Mission */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.twoColumns}>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerChildren}
            >
              <div className={styles.columnContent}>
                <motion.div
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
              </div>
              <div className={styles.columnImage}>
                <motion.div
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
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className={styles.section}>
        <div className={styles.container}>
          <h2 className={`${styles.sectionTitle} ${styles.centered}`}>
            <motion.h2 variants={fadeInUp}>
              How It Works
            </motion.h2>
          </h2>
          <div className={styles.workflowSteps}>
            <motion.div variants={fadeInUp}>
              {/* Placeholder for actual workflow steps */}
              <div className={styles.stepItem}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepText}>Create an event or group.</div>
              </div>
              <div className={styles.stepItem}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepText}>Add expenses as they happen.</div>
              </div>
              <div className={styles.stepItem}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepText}>Settle up with a single click.</div>
              </div>
            </motion.div>
          </div>
          <p className={`${styles.sectionText} ${styles.centered}`}>
            <motion.p variants={fadeInUp}>
              Our intelligent system calculates who owes whom, making settlements a breeze.
            </motion.p>
          </p>
        </div>
      </section>

      {/* Our Team Section (Example, if it exists and uses motion) */}
      {/* Assuming a similar structure if there were errors here */}
      
      {/* Join Us Section / CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <h2 className={styles.ctaTitle}>
            <motion.h2 variants={fadeInUp}>
              Ready to Simplify Your Shared Expenses?
            </motion.h2>
          </h2>
          <p className={styles.ctaText}>
            <motion.p variants={fadeInUp}>
              Join thousands of users who trust JustSplit to manage their group finances.
              Sign up today and experience hassle-free expense sharing!
            </motion.p>
          </p>
          <div className={styles.ctaButtons}>
            <motion.div variants={fadeInUp}>
              <Link href="/auth/register" legacyBehavior>
                <a className={`${styles.button} ${styles.buttonPrimary}`}>Get Started for Free</a>
              </Link>
              <Link href="/#features" legacyBehavior>
                <a className={`${styles.button} ${styles.buttonSecondary}`}>Learn More</a>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
