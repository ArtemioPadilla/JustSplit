'use client';

import { useLanguage } from '@cybereco/ui-components';
import styles from './page.module.css';

export default function PrivacyPage() {
  const { t } = useLanguage();
  
  return (
        <div className={styles.container}>
          <header className={styles.pageHeader}>
            <h1 className={styles.title}>
              {t('privacyPage.title') || "Privacy Policy"}
            </h1>
            <p className={styles.subtitle}>
              {t('privacyPage.subtitle') || "How we collect, use, and protect your information"}
            </p>
          </header>
          
          <section className={styles.contentSection}>
            <div className={styles.content}>
              <h2>{t('privacyPage.introTitle') || "Introduction"}</h2>
              <p>
                {t('privacyPage.introText') || "CyberEco (\"we\", \"our\", or \"us\") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our applications."}
              </p>
              
              <h2>{t('privacyPage.collectionTitle') || "Information We Collect"}</h2>
              <p>
                {t('privacyPage.collectionText') || "We may collect information about you in a variety of ways. The information we may collect includes:"}
              </p>
              <ul>
                <li>Personal Data: Personally identifiable information, such as your name, email address, and telephone number, that you voluntarily provide to us.</li>
                <li>Derivative Data: Information our servers automatically collect when you access our platform, such as your IP address, browser type, operating system, access times, and the pages you have viewed.</li>
                <li>Financial Data: Financial information, such as data related to your payment method, that we may collect when you purchase or use our services.</li>
              </ul>
              
              <h2>{t('privacyPage.useTitle') || "Use of Your Information"}</h2>
              <p>
                {t('privacyPage.useText') || "Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. We may use information collected about you to:"}
              </p>
              <ul>
                <li>Create and manage your account.</li>
                <li>Process transactions.</li>
                <li>Send you administrative information, such as updates, security alerts, and support messages.</li>
                <li>Respond to your comments, questions, and requests.</li>
                <li>Develop and display content and advertising tailored to your interests.</li>
              </ul>
              
              <h2>{t('privacyPage.disclosureTitle') || "Disclosure of Your Information"}</h2>
              <p>
                {t('privacyPage.disclosureText') || "We may share information we have collected about you in certain situations. Your information may be disclosed as follows:"}
              </p>
              <ul>
                <li>By Law or to Protect Rights: If we believe the release of information about you is necessary to respond to legal process or to protect the rights, property, and safety of CyberEco, our users, or others.</li>
                <li>Third-Party Service Providers: We may share your information with third parties that perform services for us or on our behalf.</li>
                <li>Marketing Communications: With your consent, we may share your information with third parties for marketing purposes.</li>
              </ul>
              
              <h2>{t('privacyPage.securityTitle') || "Security of Your Information"}</h2>
              <p>
                {t('privacyPage.securityText') || "We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that no security measures are perfect or impenetrable."}
              </p>
              
              <h2>{t('privacyPage.contactTitle') || "Contact Us"}</h2>
              <p>
                {t('privacyPage.contactText') || "If you have questions or concerns about this Privacy Policy, please contact us at privacy@cybereco.io."}
              </p>
            </div>
            
            <p className={styles.lastUpdated}>
              {t('privacyPage.lastUpdated') || "Last updated: January 2023"}
            </p>
          </section>
        </div>
  );
}