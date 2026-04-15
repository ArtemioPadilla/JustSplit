'use client';

import { useState, ChangeEvent, FormEvent, useEffect, useRef } from 'react';
import { useLanguage } from '@cybereco/ui-components';
import styles from './page.module.css';

declare global {
  interface Window {
    grecaptcha: any;
  }
}

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  _gotcha?: string; // honeypot field
}

export default function ContactPage() {
  const { t } = useLanguage();
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
    _gotcha: ''
  });
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  useEffect(() => {
    // Check if script already exists
    const existingScript = document.querySelector('script[src="https://www.google.com/recaptcha/api.js"]');
    
    if (!existingScript) {
      // Load reCAPTCHA script
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
      script.async = true;
      script.defer = true;
      
      // Global callback for when reCAPTCHA loads
      (window as any).onRecaptchaLoad = () => {
        setRecaptchaLoaded(true);
        renderRecaptcha();
      };
      
      document.head.appendChild(script);
    } else if (window.grecaptcha) {
      // Script already loaded
      setRecaptchaLoaded(true);
      renderRecaptcha();
    }

    return () => {
      // Clean up global callback
      delete (window as any).onRecaptchaLoad;
    };
  }, []);

  const renderRecaptcha = () => {
    if (window.grecaptcha && recaptchaRef.current && !recaptchaRef.current.hasChildNodes()) {
      try {
        window.grecaptcha.render(recaptchaRef.current, {
          sitekey: '6LeQpU8rAAAAAE7_wA-RYz4afnvqN_3_Q02VCVZ3',
          theme: 'light'
        });
      } catch (error) {
        console.error('Error rendering reCAPTCHA:', error);
      }
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      // Get reCAPTCHA response
      const recaptchaResponse = window.grecaptcha?.getResponse();
      
      console.log('reCAPTCHA response:', recaptchaResponse);
      console.log('grecaptcha available:', !!window.grecaptcha);
      
      if (!recaptchaResponse) {
        setErrorMessage('Please complete the reCAPTCHA verification.');
        setIsSubmitting(false);
        return;
      }

      const submissionData = {
        ...formData,
        'g-recaptcha-response': recaptchaResponse
      };

      console.log('Submission data:', submissionData);

      const response = await fetch('https://formspree.io/f/xwpbepaz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(submissionData),
      });

      if (response.ok) {
        setIsSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '', _gotcha: '' });
        // Reset reCAPTCHA
        window.grecaptcha?.reset();
        setTimeout(() => {
          setIsSubmitted(false);
        }, 5000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || errorData.errors?.[0]?.message || 
          `Server error (${response.status}). Please try again or contact us directly.`;
        setErrorMessage(errorMsg);
        // Reset reCAPTCHA on error
        window.grecaptcha?.reset();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setErrorMessage('Network error. Please check your connection and try again.');
      // Reset reCAPTCHA on error
      window.grecaptcha?.reset();
    } finally {
      setIsSubmitting(false);
    }
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
              {/* Honeypot field for spam protection - hidden from users */}
              <input
                type="text"
                name="_gotcha"
                value={formData._gotcha}
                onChange={handleChange}
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
              />
              
              {isSubmitted && (
                <div className={styles.successMessage}>
                  {t('contactPage.successMessage') || "Your message has been sent successfully. We'll get back to you soon!"}
                </div>
              )}
              
              {errorMessage && (
                <div className={styles.errorMessage}>
                  {errorMessage}
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
              
              {/* reCAPTCHA widget */}
              <div className={styles.recaptchaContainer}>
                <div ref={recaptchaRef}></div>
                {!recaptchaLoaded && (
                  <div className={styles.recaptchaLoading}>
                    Loading reCAPTCHA...
                  </div>
                )}
              </div>
              
              <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                <svg className={styles.submitIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
                {isSubmitting 
                  ? (t('contactPage.sendingButton') || 'Sending...') 
                  : (t('contactPage.submitButton') || 'Send Message')
                }
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