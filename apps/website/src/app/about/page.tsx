'use client';

import { motion } from 'framer-motion';
import { FaHandshake } from 'react-icons/fa';
import { useLanguage } from '@cybereco/ui-components';
import styles from './page.module.css';

export default function AboutPage() {
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
          {t('aboutPage.title') || 'About CyberEco'}
        </motion.h1>
        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {t('aboutPage.subtitle') || 'Learn about our mission, vision, and the values that guide our innovative technology solutions.'}
        </motion.p>
      </header>

      <section className={styles.section}>
        <div className={styles.aboutContent}>
          <div className={styles.textContent}>
            <h2 className={styles.sectionTitle}>{t('aboutPage.whoWeAreTitle') || 'Who We Are'}</h2>
            <p>
              {t('aboutPage.whoWeAreP1') || 'CyberEco is a human-centered digital ecosystem for conscious, connected, and sustainable living. In a world where digital life is fragmented, extractive, and overwhelming, CyberEco exists to offer a better path — one rooted in sovereignty, community, and balance.'}
            </p>
            <p>
              {t('aboutPage.whoWeAreP2') || 'We believe your digital presence should empower you, not exploit you. Your identity should belong to you. Your data should serve you. Your actions should connect you with others meaningfully.'}
            </p>
          </div>
          <div className={styles.logoContainer}>
            <img src="/logo.svg" alt="CyberEco Logo" className={styles.logoImage} />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('aboutPage.whyWeExistTitle') || 'Why We Exist'}</h2>
        <blockquote className={styles.manifestoQuote}>
          {t('aboutPage.manifestoQuote') || 'In a world where digital life is fragmented, extractive, and overwhelming, CyberEco exists to offer a better path — one rooted in sovereignty, community, and balance.'}
        </blockquote>
        <p>{t('aboutPage.whyWeExistText') || 'The digital world has become increasingly disconnected from human values. We created CyberEco to bridge this gap, providing digital solutions that align with how people naturally want to connect, collaborate, and live sustainably.'}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('aboutPage.whatWeAreTitle') || 'What We Are'}</h2>
        <p>{t('aboutPage.whatWeAreText') || 'CyberEco is not just another app. It is a modular digital ecosystem — an operating system for life — where each platform solves a real need while contributing to a greater whole.'}</p>
        <ul>
          <li>{t('aboutPage.whatWeArePoint1') || 'A place to manage your finances.'}</li>
          <li>{t('aboutPage.whatWeArePoint2') || 'A place to resolve conflicts peacefully.'}</li>
          <li>{t('aboutPage.whatWeArePoint3') || 'A place to grow, learn, vote, connect, and belong.'}</li>
          <li>{t('aboutPage.whatWeArePoint4') || 'A place where your values and data align.'}</li>
        </ul>
        <p>{t('aboutPage.whatWeAreConclusion') || 'At the center is the CyberEco Hub — your identity, your dashboard, your digital home.'}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('aboutPage.visionMissionTitle') || 'Our Vision & Mission'}</h2>
        <div className={styles.aboutContent}>
          <div className={styles.textContent}>
            <h3>{t('aboutPage.visionTitle') || 'Vision'}</h3>
            <p>
              {t('aboutPage.visionText') || 'To empower millions of people — not with more notifications, but with clarity, autonomy, and connection. To create a digital environment as human, intentional, and resilient as the world we deserve offline.'}
            </p>
          </div>
          <div className={styles.textContent}>
            <h3>{t('aboutPage.missionTitle') || 'Mission'}</h3>
            <p>
              {t('aboutPage.missionText') || 'To create a modular digital ecosystem — an operating system for life — where each platform solves a real need while contributing to a greater whole, centered around the CyberEco Hub as your identity, your dashboard, your digital home.'}
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('aboutPage.valuesTitle') || 'Our Values'}</h2>
        <motion.div 
          className={styles.valueCard}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h3 className={styles.valueTitle}>{t('aboutPage.value1Title') || 'Digital Sovereignty'}</h3>
          <p>{t('aboutPage.value1Text') || 'You own your identity, your data, your narrative. We create technology that empowers rather than exploits.'}</p>
        </motion.div>
        
        <motion.div 
          className={styles.valueCard}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
        >
          <h3 className={styles.valueTitle}>{t('aboutPage.value2Title') || 'Wellbeing by Design'}</h3>
          <p>{t('aboutPage.value2Text') || 'Tech must serve your life — not consume it. We design solutions that enhance your wellbeing rather than draining it.'}</p>
        </motion.div>
        
        <motion.div 
          className={styles.valueCard}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <h3 className={styles.valueTitle}>{t('aboutPage.value3Title') || 'Interconnection with Purpose'}</h3>
          <p>{t('aboutPage.value3Text') || 'Every platform is useful alone, but transformative together. We create an ecosystem of solutions that complement each other.'}</p>
        </motion.div>
        
        <motion.div 
          className={styles.valueCard}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <h3 className={styles.valueTitle}>{t('aboutPage.value4Title') || 'Community is Core'}</h3>
          <p>{t('aboutPage.value4Text') || 'We build tools for individuals, powered by the collective. Community engagement and collaborative growth are at the heart of our ecosystem.'}</p>
        </motion.div>
        
        <motion.div 
          className={styles.valueCard}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <h3 className={styles.valueTitle}>{t('aboutPage.value5Title') || 'Open by Nature'}</h3>
          <p>{t('aboutPage.value5Text') || 'Wherever possible, CyberEco is modular, transparent, and interoperable. We embrace openness and collaboration in our development approach.'}</p>
        </motion.div>
      </section>

      <motion.div 
        className={styles.joinSection}
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className={styles.iconContainer}>
          <FaHandshake />
        </div>
        <h2 className={styles.joinTitle}>{t('aboutPage.joinUsTitle') || 'Join Us'}</h2>
        <p className={styles.joinText}>{t('aboutPage.joinUsText') || 'CyberEco is a platform — but also a movement. We welcome creators, collaborators, dreamers, and builders. Let\'s shape a digital future worth living in — together.'}</p>
      </motion.div>
    </div>
  );
}