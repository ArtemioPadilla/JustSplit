'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FaLifeRing, FaExclamationCircle, FaLightbulb, FaComment, FaPaperPlane } from 'react-icons/fa';
import { useLanguage } from '@cybereco/ui-components';
import styles from './page.module.css';

interface FormData {
  name: string;
  email: string;
  subject: string;
  product: string;
  message: string;
}

export default function SupportPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    product: '',
    message: ''
  });
  
  const { t } = useLanguage();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    // Handle form submission logic
    console.log('Form submitted:', formData);
    alert('Thank you for your message. Our support team will get back to you soon!');
    setFormData({
      name: '',
      email: '',
      subject: '',
      product: '',
      message: ''
    });
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
          {t('supportPage.title') || "Support Center"}
        </motion.h1>
        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {t('supportPage.subtitle') || "Get the assistance you need to solve problems and make the most of CyberEco applications"}
        </motion.p>
      </header>

      <div className={styles.supportOptionsGrid}>
        <motion.div
          className={styles.supportCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className={styles.cardHeader}>
            <div className={styles.iconWrapper}>
              <FaExclamationCircle />
            </div>
            <h3 className={styles.cardTitle}>{t('supportPage.commonIssuesTitle') || "Common Issues"}</h3>
          </div>
          <div className={styles.cardContent}>
            <p className={styles.cardText}>
              {t('supportPage.commonIssuesText') || "Find quick solutions to the most frequently encountered problems with our applications."}
            </p>
            <Link href="/faq" className={styles.cardButton}>{t('supportPage.viewCommonIssues') || "View Common Issues"}</Link>
          </div>
        </motion.div>

        <motion.div
          className={styles.supportCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className={styles.cardHeader}>
            <div className={styles.iconWrapper}>
              <FaLightbulb />
            </div>
            <h3 className={styles.cardTitle}>{t('supportPage.knowledgeBaseTitle') || "Knowledge Base"}</h3>
          </div>
          <div className={styles.cardContent}>
            <p className={styles.cardText}>
              {t('supportPage.knowledgeBaseText') || "Access our detailed documentation and step-by-step guides for all CyberEco applications."}
            </p>
            <Link href="/documentation" className={styles.cardButton}>{t('supportPage.browseKnowledgeBase') || "Browse Knowledge Base"}</Link>
          </div>
        </motion.div>

        <motion.div
          className={styles.supportCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className={styles.cardHeader}>
            <div className={styles.iconWrapper}>
              <FaComment />
            </div>
            <h3 className={styles.cardTitle}>{t('supportPage.communityForumsTitle') || "Community Forums"}</h3>
          </div>
          <div className={styles.cardContent}>
            <p className={styles.cardText}>
              {t('supportPage.communityForumsText') || "Join discussions, share experiences, and find solutions with other users in our community forums."}
            </p>
            <a href="https://community.cybereco.io" target="_blank" rel="noopener noreferrer" className={styles.cardButton}>
              {t('supportPage.visitForums') || "Visit Forums"}
            </a>
          </div>
        </motion.div>

        <motion.div
          className={styles.supportCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className={styles.cardHeader}>
            <div className={styles.iconWrapper}>
              <FaLifeRing />
            </div>
            <h3 className={styles.cardTitle}>{t('supportPage.liveChatTitle') || "Live Chat"}</h3>
          </div>
          <div className={styles.cardContent}>
            <p className={styles.cardText}>
              {t('supportPage.liveChatText') || "Connect with our support team in real-time for immediate assistance with urgent issues."}
            </p>
            <button 
              className={styles.cardButton}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                alert('Live chat feature coming soon!');
              }}
            >
              {t('supportPage.startChat') || "Start Chat"}
            </button>
          </div>
        </motion.div>
      </div>

      <section className={styles.contactFormSection}>
        <h2 className={styles.contactFormTitle}>{t('supportPage.contactSupportTitle') || "Contact Support"}</h2>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>{t('supportPage.nameLabel') || "Your Name"}</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              value={formData.name}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>{t('supportPage.emailLabel') || "Email Address"}</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              value={formData.email}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="subject" className={styles.label}>{t('supportPage.subjectLabel') || "Subject"}</label>
            <input 
              type="text" 
              id="subject" 
              name="subject" 
              value={formData.subject}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="product" className={styles.label}>{t('supportPage.productLabel') || "Product"}</label>
            <select 
              id="product" 
              name="product" 
              value={formData.product}
              onChange={handleChange}
              className={styles.select}
              required
            >
              <option value="">{t('supportPage.selectProduct') || "Select a product"}</option>
              <option value="justsplit">JustSplit</option>
              <option value="plantopia">Plantopia</option>
              <option value="demos">Demos</option>
              <option value="nexus">Nexus</option>
              <option value="tradepilot">TradePilot</option>
              <option value="communitymanager">Community Manager</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="message" className={styles.label}>{t('supportPage.messageLabel') || "Message"}</label>
            <textarea 
              id="message" 
              name="message" 
              value={formData.message}
              onChange={handleChange}
              className={styles.textarea}
              required
            />
          </div>
          
          <motion.button 
            type="submit"
            className={styles.submitButton}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaPaperPlane className={styles.submitIcon} /> {t('supportPage.submitRequest') || "Submit Request"}
          </motion.button>
        </form>
      </section>
    </div>
  );
}