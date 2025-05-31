'use client';

import { useLanguage } from '@cybereco/ui-components';
import styles from './page.module.css';

export default function TermsPage() {
  const { t } = useLanguage();
  
  return (
        <div className={styles.container}>
          <header className={styles.pageHeader}>
            <h1 className={styles.title}>
              {t('termsPage.title') || "Terms of Service"}
            </h1>
            <p className={styles.subtitle}>
              {t('termsPage.subtitle') || "Please read these terms of service carefully before using our platform"}
            </p>
          </header>
          
          <section className={styles.contentSection}>
            <div className={styles.content}>
              <h2>{t('termsPage.agreementTitle') || "1. Agreement to Terms"}</h2>
              <p>
                {t('termsPage.agreementText') || "By accessing or using CyberEco's website or applications, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing our services."}
              </p>
              
              <h2>{t('termsPage.licenseTitle') || "2. Use License"}</h2>
              <p>
                {t('termsPage.licenseText') || "Permission is granted to temporarily access the materials on CyberEco's website or applications for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:"}
              </p>
              <ul>
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to decompile or reverse engineer any software contained on CyberEco's servers</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
                <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
              </ul>
              
              <h2>{t('termsPage.accountTitle') || "3. Account Responsibilities"}</h2>
              <p>
                {t('termsPage.accountText') || "If you create an account with us, you are responsible for maintaining the confidentiality of your account and password, and for restricting access to your computer. You agree to accept responsibility for all activities that occur under your account or password."}
              </p>
              
              <h2>{t('termsPage.liabilityTitle') || "4. Limitation of Liability"}</h2>
              <p>
                {t('termsPage.liabilityText') || "In no event shall CyberEco or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on CyberEco's website, even if CyberEco or a CyberEco authorized representative has been notified orally or in writing of the possibility of such damage."}
              </p>
              
              <h2>{t('termsPage.accuracyTitle') || "5. Accuracy of Materials"}</h2>
              <p>
                {t('termsPage.accuracyText') || "The materials appearing on CyberEco's website or applications could include technical, typographical, or photographic errors. CyberEco does not warrant that any of the materials on its website are accurate, complete, or current."}
              </p>
              
              <h2>{t('termsPage.linksTitle') || "6. Links"}</h2>
              <p>
                {t('termsPage.linksText') || "CyberEco has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by CyberEco of the site. Use of any such linked website is at the user's own risk."}
              </p>
              
              <h2>{t('termsPage.modificationsTitle') || "7. Modifications"}</h2>
              <p>
                {t('termsPage.modificationsText') || "CyberEco may revise these terms of service at any time without notice. By using this website or our applications, you are agreeing to be bound by the current version of these Terms of Service."}
              </p>
              
              <h2>{t('termsPage.contactTitle') || "8. Contact Us"}</h2>
              <p>
                {t('termsPage.contactText') || "If you have any questions about these Terms, please contact us at terms@cybereco.io."}
              </p>
            </div>
            
            <p className={styles.lastUpdated}>
              {t('termsPage.lastUpdated') || "Last updated: January 2023"}
            </p>
          </section>
        </div>
  );
}