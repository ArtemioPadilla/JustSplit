'use client';

import { useLanguage } from '@cybereco/ui-components';
import styles from './page.module.css';

export default function AccountSetupGuidePage() {
  const { t } = useLanguage();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <a href="/documentation" className={styles.breadcrumbLink}>
            {t('accountSetupGuide.documentation') || 'Documentation'}
          </a>
          <span className={styles.breadcrumbSeparator}>›</span>
          <span className={styles.breadcrumbCurrent}>
            {t('accountSetupGuide.title') || 'Account Creation & Setup'}
          </span>
        </div>
        <h1 className={styles.title}>
          🚀 {t('accountSetupGuide.title') || 'Account Creation & Setup'}
        </h1>
        <div className={styles.guideMeta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>⏱️ {t('accountSetupGuide.duration') || 'Duration'}:</span>
            <span className={styles.metaValue}>10-15 {t('accountSetupGuide.minutes') || 'minutes'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>📈 {t('accountSetupGuide.level') || 'Level'}:</span>
            <span className={styles.metaValue}>{t('accountSetupGuide.beginner') || 'Beginner'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>🎯 {t('accountSetupGuide.goal') || 'Goal'}:</span>
            <span className={styles.metaValue}>{t('accountSetupGuide.goalText') || 'Complete account setup with security'}</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.introSection}>
          <h2 className={styles.sectionTitle}>
            {t('accountSetupGuide.introTitle') || 'Welcome to CyberEco'}
          </h2>
          <p className={styles.introText}>
            {t('accountSetupGuide.introText') || 'This guide will walk you through creating your CyberEco Hub account - your single identity for accessing all applications in our ecosystem. We\'ll cover account creation, security setup, privacy controls, and initial configuration.'}
          </p>
          
          <div className={styles.infoBox}>
            <div className={styles.infoIcon}>🔐</div>
            <div className={styles.infoContent}>
              <h4>{t('accountSetupGuide.privacyFirstTitle') || 'Privacy-First Design'}</h4>
              <p>{t('accountSetupGuide.privacyFirstText') || 'Your CyberEco account is designed with privacy at its core. You own your data, control what you share, and can export or delete your information anytime.'}</p>
            </div>
          </div>
        </div>

        <div className={styles.stepsSection}>
          <h2 className={styles.sectionTitle}>
            {t('accountSetupGuide.stepsTitle') || 'Step-by-Step Setup'}
          </h2>

          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>
                {t('accountSetupGuide.step1Title') || 'Visit the Registration Page'}
              </h3>
              <p className={styles.stepDescription}>
                {t('accountSetupGuide.step1Desc') || 'Navigate to the CyberEco Hub registration page. You can access this from any CyberEco application or directly at hub.cybereco.io/signup.'}
              </p>
              <div className={styles.stepActions}>
                <a href="https://hub.cybereco.io/signup" className={styles.actionButton} target="_blank" rel="noopener noreferrer">
                  {t('accountSetupGuide.signUpNow') || 'Sign Up Now'} →
                </a>
              </div>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>
                {t('accountSetupGuide.step2Title') || 'Choose Your Identity'}
              </h3>
              <p className={styles.stepDescription}>
                {t('accountSetupGuide.step2Desc') || 'Select a unique username and provide your email address. Your username will be your public identifier across all CyberEco applications.'}
              </p>
              <div className={styles.tipBox}>
                <span className={styles.tipIcon}>💡</span>
                <div className={styles.tipContent}>
                  <strong>{t('accountSetupGuide.usernameTitle') || 'Username Tips'}:</strong>
                  <ul>
                    <li>{t('accountSetupGuide.usernameTip1') || 'Choose something memorable and professional'}</li>
                    <li>{t('accountSetupGuide.usernameTip2') || 'Avoid personal information like birthdate'}</li>
                    <li>{t('accountSetupGuide.usernameTip3') || 'You can change it later, but connections may be affected'}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>
                {t('accountSetupGuide.step3Title') || 'Create a Strong Password'}
              </h3>
              <p className={styles.stepDescription}>
                {t('accountSetupGuide.step3Desc') || 'Your password protects access to all your CyberEco applications. Choose a strong, unique password that you don\'t use elsewhere.'}
              </p>
              <div className={styles.requirementsBox}>
                <h4>{t('accountSetupGuide.passwordRequirements') || 'Password Requirements'}:</h4>
                <ul className={styles.requirementsList}>
                  <li className={styles.requirement}>
                    <span className={styles.requirementCheck}>✓</span>
                    {t('accountSetupGuide.passReq1') || 'At least 12 characters long'}
                  </li>
                  <li className={styles.requirement}>
                    <span className={styles.requirementCheck}>✓</span>
                    {t('accountSetupGuide.passReq2') || 'Mix of uppercase and lowercase letters'}
                  </li>
                  <li className={styles.requirement}>
                    <span className={styles.requirementCheck}>✓</span>
                    {t('accountSetupGuide.passReq3') || 'At least one number and special character'}
                  </li>
                  <li className={styles.requirement}>
                    <span className={styles.requirementCheck}>✓</span>
                    {t('accountSetupGuide.passReq4') || 'Not used on any other accounts'}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>4</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>
                {t('accountSetupGuide.step4Title') || 'Enable Two-Factor Authentication'}
              </h3>
              <p className={styles.stepDescription}>
                {t('accountSetupGuide.step4Desc') || 'Add an extra layer of security to your account. We support authenticator apps, SMS, and hardware keys.'}
              </p>
              <div className={styles.optionsGrid}>
                <div className={styles.optionCard}>
                  <div className={styles.optionIcon}>📱</div>
                  <h4>{t('accountSetupGuide.authenticatorApp') || 'Authenticator App'}</h4>
                  <p>{t('accountSetupGuide.authenticatorDesc') || 'Most secure option using apps like Google Authenticator or Authy'}</p>
                  <span className={styles.recommended}>{t('accountSetupGuide.recommended') || 'Recommended'}</span>
                </div>
                <div className={styles.optionCard}>
                  <div className={styles.optionIcon}>💬</div>
                  <h4>{t('accountSetupGuide.smsOption') || 'SMS Code'}</h4>
                  <p>{t('accountSetupGuide.smsDesc') || 'Receive codes via text message to your phone'}</p>
                </div>
                <div className={styles.optionCard}>
                  <div className={styles.optionIcon}>🔑</div>
                  <h4>{t('accountSetupGuide.hardwareKey') || 'Hardware Key'}</h4>
                  <p>{t('accountSetupGuide.hardwareDesc') || 'Physical security keys like YubiKey for maximum security'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>5</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>
                {t('accountSetupGuide.step5Title') || 'Configure Privacy Settings'}
              </h3>
              <p className={styles.stepDescription}>
                {t('accountSetupGuide.step5Desc') || 'Set your default privacy preferences. You can always adjust these later for specific applications or sharing scenarios.'}
              </p>
              <div className={styles.privacySettings}>
                <div className={styles.privacySetting}>
                  <div className={styles.settingHeader}>
                    <h4>{t('accountSetupGuide.profileVisibility') || 'Profile Visibility'}</h4>
                    <span className={styles.settingRecommended}>{t('accountSetupGuide.friendsOnly') || 'Friends Only'} ✓</span>
                  </div>
                  <p>{t('accountSetupGuide.profileVisibilityDesc') || 'Who can see your basic profile information and activity across applications.'}</p>
                </div>
                <div className={styles.privacySetting}>
                  <div className={styles.settingHeader}>
                    <h4>{t('accountSetupGuide.activitySharing') || 'Activity Sharing'}</h4>
                    <span className={styles.settingRecommended}>{t('accountSetupGuide.manual') || 'Manual'} ✓</span>
                  </div>
                  <p>{t('accountSetupGuide.activitySharingDesc') || 'How your activity in applications (like expenses or events) is shared with others.'}</p>
                </div>
                <div className={styles.privacySetting}>
                  <div className={styles.settingHeader}>
                    <h4>{t('accountSetupGuide.dataCollection') || 'Data Collection'}</h4>
                    <span className={styles.settingRecommended}>{t('accountSetupGuide.minimal') || 'Minimal'} ✓</span>
                  </div>
                  <p>{t('accountSetupGuide.dataCollectionDesc') || 'What usage data we collect for improving applications (always anonymized).'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>6</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>
                {t('accountSetupGuide.step6Title') || 'Verify Your Email'}
              </h3>
              <p className={styles.stepDescription}>
                {t('accountSetupGuide.step6Desc') || 'Check your email for a verification message. Click the verification link to activate your account and enable all features.'}
              </p>
              <div className={styles.warningBox}>
                <span className={styles.warningIcon}>⚠️</span>
                <div className={styles.warningContent}>
                  <strong>{t('accountSetupGuide.verificationImportant') || 'Verification Required'}:</strong>
                  <p>{t('accountSetupGuide.verificationText') || 'Some features like password reset and security notifications require a verified email address.'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.nextStepsSection}>
          <h2 className={styles.sectionTitle}>
            {t('accountSetupGuide.nextStepsTitle') || 'Next Steps'}
          </h2>
          <div className={styles.nextStepsGrid}>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>💰</div>
              <h3>{t('accountSetupGuide.exploreJustSplit') || 'Explore JustSplit'}</h3>
              <p>{t('accountSetupGuide.exploreJustSplitDesc') || 'Start sharing expenses with friends and family using our most popular application.'}</p>
              <a href="/guides/justsplit" className={styles.nextStepLink}>
                {t('accountSetupGuide.getStarted') || 'Get Started'} →
              </a>
            </div>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>🔐</div>
              <h3>{t('accountSetupGuide.securityDeepDive') || 'Security Deep Dive'}</h3>
              <p>{t('accountSetupGuide.securityDeepDiveDesc') || 'Learn advanced security features and privacy controls for your account.'}</p>
              <a href="/guides/privacy-settings" className={styles.nextStepLink}>
                {t('accountSetupGuide.learnMore') || 'Learn More'} →
              </a>
            </div>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>🤝</div>
              <h3>{t('accountSetupGuide.joinCommunity') || 'Join the Community'}</h3>
              <p>{t('accountSetupGuide.joinCommunityDesc') || 'Connect with other users and participate in shaping the platform\'s future.'}</p>
              <a href="/guides/community" className={styles.nextStepLink}>
                {t('accountSetupGuide.explore') || 'Explore'} →
              </a>
            </div>
          </div>
        </div>

        <div className={styles.supportSection}>
          <div className={styles.supportBox}>
            <h3>{t('accountSetupGuide.needHelp') || 'Need Help?'}</h3>
            <p>{t('accountSetupGuide.supportText') || 'If you encounter any issues during setup, our support team is here to help.'}</p>
            <div className={styles.supportActions}>
              <a href="/support" className={styles.supportLink}>
                {t('accountSetupGuide.contactSupport') || 'Contact Support'}
              </a>
              <a href="/documentation" className={styles.supportLink}>
                {t('accountSetupGuide.documentation') || 'Documentation'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}