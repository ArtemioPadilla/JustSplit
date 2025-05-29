'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { useLanguage } from '@justsplit/ui-components';
import styles from './page.module.css';

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactPage() {
  const { t } = useLanguage();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    // Here you would usually send the form data to your backend
    console.log('Form submitted:', formData);
    // Show success message
    setIsSubmitted(true);
    // Reset form
    setFormData({ name: '', email: '', subject: '', message: '' });
    // Hide success message after 5 seconds
    setTimeout(() => {
      setIsSubmitted(false);
    }, 5000);
  };

  return (
        <div className={styles.container}>
          <header className={styles.pageHeader}>
            <h1 className={styles.title}>
              {t('contactPage.title') || 'Contact Us'}
            </h1>
            <p className={styles.subtitle}>
              {t('contactPage.subtitle') || "We'd love to hear from you. Send us a message and we'll respond as soon as possible."}
            </p>
          </header>
          
          <div className={styles.contactGrid}>
            <form className={styles.contactForm} onSubmit={handleSubmit}>
              {isSubmitted && (
                <div className={styles.successMessage}>
                  {t('contactPage.successMessage') || "Your message has been sent successfully. We'll get back to you soon!"}
                </div>
              )}
              
              <div className={styles.formGroup}>
                <label htmlFor="name" className={styles.label}>
                  {t('contactPage.nameLabel') || 'Name'}
                </label>
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
                <label htmlFor="email" className={styles.label}>
                  {t('contactPage.emailLabel') || 'Email'}
                </label>
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
                <label htmlFor="subject" className={styles.label}>
                  {t('contactPage.subjectLabel') || 'Subject'}
                </label>
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
                <label htmlFor="message" className={styles.label}>
                  {t('contactPage.messageLabel') || 'Message'}
                </label>
                <textarea 
                  id="message" 
                  name="message" 
                  value={formData.message}
                  onChange={handleChange}
                  className={styles.textarea}
                  required 
                />
              </div>
              
              <button type="submit" className={styles.submitButton}>
                <svg className={styles.submitIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
                {t('contactPage.submitButton') || 'Send Message'}
              </button>
            </form>
            
            <div className={styles.contactInfo}>
              <h2 className={styles.infoTitle}>
                {t('contactPage.contactInfoTitle') || 'Get in Touch'}
              </h2>
              
              <div className={styles.infoItem}>
                <div className={styles.iconWrapper}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                </div>
                <div className={styles.infoContent}>
                  <h3 className={styles.infoLabel}>
                    {t('contactPage.emailContactLabel') || 'Email'}
                  </h3>
                  <p className={styles.infoValue}>info@cybere.co</p>
                </div>
              </div>
              
              <div className={styles.infoItem}>
                <div className={styles.iconWrapper}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </div>
                <div className={styles.infoContent}>
                  <h3 className={styles.infoLabel}>
                    {t('contactPage.addressLabel') || 'Address'}
                  </h3>
                  <p className={styles.infoValue}>Mexico City</p>
                </div>
              </div>
              
              <div className={styles.socialLinks}>
                <h3 className={styles.socialTitle}>
                  {t('contactPage.socialTitle') || 'Follow Us'}
                </h3>
                {/* Add your social links here */}
              </div>
            </div>
          </div>
        </div>
  );
}