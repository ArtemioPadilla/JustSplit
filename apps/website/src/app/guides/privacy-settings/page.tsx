'use client';

import { useLanguage } from '@cybereco/ui-components';
import styles from './page.module.css';

export default function PrivacySettingsGuidePage() {
  const { t } = useLanguage();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <a href="/documentation" className={styles.breadcrumbLink}>
            {t('privacySettingsGuide.documentation') || 'Documentation'}
          </a>
          <span className={styles.breadcrumbSeparator}>›</span>
          <span className={styles.breadcrumbCurrent}>
            {t('privacySettingsGuide.title') || 'Privacy & Security Settings'}
          </span>
        </div>
        <h1 className={styles.title}>
          🔐 {t('privacySettingsGuide.title') || 'Privacy & Security Settings'}
        </h1>
        <div className={styles.guideMeta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>⏱️ {t('privacySettingsGuide.duration') || 'Duration'}:</span>
            <span className={styles.metaValue}>20-25 {t('privacySettingsGuide.minutes') || 'minutes'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>📈 {t('privacySettingsGuide.level') || 'Level'}:</span>
            <span className={styles.metaValue}>{t('privacySettingsGuide.intermediate') || 'Intermediate'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>🎯 {t('privacySettingsGuide.goal') || 'Goal'}:</span>
            <span className={styles.metaValue}>{t('privacySettingsGuide.goalText') || 'Master privacy and security controls'}</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.introSection}>
          <h2 className={styles.sectionTitle}>
            {t('privacySettingsGuide.introTitle') || 'Privacy-First by Design'}
          </h2>
          <p className={styles.introText}>
            {t('privacySettingsGuide.introText') || 'CyberEco applications are built with privacy as a core principle. This comprehensive guide covers all privacy and security settings across the platform, helping you understand what data is collected, how it\'s used, and how to configure optimal settings for your needs.'}
          </p>
          
          <div className={styles.principlesGrid}>
            <div className={styles.principleCard}>
              <div className={styles.principleIcon}>🛡️</div>
              <h4>{t('privacySettingsGuide.dataMinimization') || 'Data Minimization'}</h4>
              <p>{t('privacySettingsGuide.dataMinimizationDesc') || 'We only collect data necessary for functionality'}</p>
            </div>
            <div className={styles.principleCard}>
              <div className={styles.principleIcon}>🔒</div>
              <h4>{t('privacySettingsGuide.endToEndEncryption') || 'End-to-End Encryption'}</h4>
              <p>{t('privacySettingsGuide.endToEndEncryptionDesc') || 'Your sensitive data is encrypted before leaving your device'}</p>
            </div>
            <div className={styles.principleCard}>
              <div className={styles.principleIcon}>👤</div>
              <h4>{t('privacySettingsGuide.userControl') || 'User Control'}</h4>
              <p>{t('privacySettingsGuide.userControlDesc') || 'You control what data to share and with whom'}</p>
            </div>
          </div>
        </div>

        <div className={styles.settingsSection}>
          <h2 className={styles.sectionTitle}>
            {t('privacySettingsGuide.accountPrivacy') || 'Account Privacy Settings'}
          </h2>
          
          <div className={styles.settingCard}>
            <div className={styles.settingHeader}>
              <h3>{t('privacySettingsGuide.profileVisibility') || 'Profile Visibility'}</h3>
              <span className={styles.settingPath}>Hub → Settings → Privacy → Profile</span>
            </div>
            <p className={styles.settingDescription}>
              {t('privacySettingsGuide.profileVisibilityDesc') || 'Control who can see your profile information across all CyberEco applications.'}
            </p>
            <div className={styles.options}>
              <div className={styles.option}>
                <div className={styles.optionHeader}>
                  <strong>{t('privacySettingsGuide.friendsOnly') || 'Friends Only'}</strong>
                  <span className={styles.recommended}>{t('privacySettingsGuide.recommended') || 'Recommended'}</span>
                </div>
                <p>{t('privacySettingsGuide.friendsOnlyDesc') || 'Only people you\'ve explicitly added as friends can see your profile'}</p>
              </div>
              <div className={styles.option}>
                <div className={styles.optionHeader}>
                  <strong>{t('privacySettingsGuide.networkOnly') || 'Network Only'}</strong>
                </div>
                <p>{t('privacySettingsGuide.networkOnlyDesc') || 'Friends and friends-of-friends can see limited profile information'}</p>
              </div>
              <div className={styles.option}>
                <div className={styles.optionHeader}>
                  <strong>{t('privacySettingsGuide.public') || 'Public'}</strong>
                  <span className={styles.caution}>{t('privacySettingsGuide.caution') || 'Use with caution'}</span>
                </div>
                <p>{t('privacySettingsGuide.publicDesc') || 'Anyone can see your basic profile information'}</p>
              </div>
            </div>
          </div>

          <div className={styles.settingCard}>
            <div className={styles.settingHeader}>
              <h3>{t('privacySettingsGuide.activitySharing') || 'Activity Sharing'}</h3>
              <span className={styles.settingPath}>Apps → Individual Settings → Privacy</span>
            </div>
            <p className={styles.settingDescription}>
              {t('privacySettingsGuide.activitySharingDesc') || 'Control how your activity in different applications is shared with other users.'}
            </p>
            <div className={styles.appSettings}>
              <div className={styles.appCard}>
                <h4>💰 JustSplit</h4>
                <div className={styles.toggleGroup}>
                  <div className={styles.toggle}>
                    <strong>{t('privacySettingsGuide.expenseVisibility') || 'Expense Visibility'}</strong>
                    <p>{t('privacySettingsGuide.expenseVisibilityDesc') || 'Who can see expenses you\'re involved in'}</p>
                  </div>
                  <div className={styles.toggle}>
                    <strong>{t('privacySettingsGuide.paymentStatus') || 'Payment Status'}</strong>
                    <p>{t('privacySettingsGuide.paymentStatusDesc') || 'Whether others can see if you\'ve paid your share'}</p>
                  </div>
                  <div className={styles.toggle}>
                    <strong>{t('privacySettingsGuide.spendingPatterns') || 'Spending Patterns'}</strong>
                    <p>{t('privacySettingsGuide.spendingPatternsDesc') || 'Whether to share anonymized spending insights'}</p>
                  </div>
                </div>
              </div>
              <div className={styles.appCard}>
                <h4>🏛️ Demos</h4>
                <div className={styles.toggleGroup}>
                  <div className={styles.toggle}>
                    <strong>{t('privacySettingsGuide.votingHistory') || 'Voting History'}</strong>
                    <p>{t('privacySettingsGuide.votingHistoryDesc') || 'Whether your vote choices are public or private'}</p>
                  </div>
                  <div className={styles.toggle}>
                    <strong>{t('privacySettingsGuide.proposalActivity') || 'Proposal Activity'}</strong>
                    <p>{t('privacySettingsGuide.proposalActivityDesc') || 'Whether others can see proposals you\'ve created or commented on'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.settingCard}>
            <div className={styles.settingHeader}>
              <h3>{t('privacySettingsGuide.dataCollection') || 'Data Collection & Analytics'}</h3>
              <span className={styles.settingPath}>Hub → Settings → Privacy → Data Usage</span>
            </div>
            <p className={styles.settingDescription}>
              {t('privacySettingsGuide.dataCollectionDesc') || 'Control what usage data is collected to improve CyberEco applications.'}
            </p>
            <div className={styles.dataTypes}>
              <div className={styles.dataType}>
                <div className={styles.dataHeader}>
                  <strong>{t('privacySettingsGuide.usageAnalytics') || 'Usage Analytics'}</strong>
                  <span className={styles.anonymous}>{t('privacySettingsGuide.anonymous') || 'Anonymous'}</span>
                </div>
                <p>{t('privacySettingsGuide.usageAnalyticsDesc') || 'How you interact with apps (clicks, time spent, features used)'}</p>
                <div className={styles.benefits}>
                  <span>✓ {t('privacySettingsGuide.benefit1') || 'Helps improve app performance'}</span>
                  <span>✓ {t('privacySettingsGuide.benefit2') || 'Identifies bugs and usability issues'}</span>
                  <span>✓ {t('privacySettingsGuide.benefit3') || 'No personal information collected'}</span>
                </div>
              </div>
              <div className={styles.dataType}>
                <div className={styles.dataHeader}>
                  <strong>{t('privacySettingsGuide.errorReporting') || 'Error Reporting'}</strong>
                  <span className={styles.anonymous}>{t('privacySettingsGuide.anonymous') || 'Anonymous'}</span>
                </div>
                <p>{t('privacySettingsGuide.errorReportingDesc') || 'Automatic crash reports and error logs to fix bugs faster'}</p>
                <div className={styles.benefits}>
                  <span>✓ {t('privacySettingsGuide.errorBenefit1') || 'Faster bug fixes'}</span>
                  <span>✓ {t('privacySettingsGuide.errorBenefit2') || 'Better app stability'}</span>
                  <span>✓ {t('privacySettingsGuide.errorBenefit3') || 'Personal data automatically scrubbed'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.securitySection}>
          <h2 className={styles.sectionTitle}>
            {t('privacySettingsGuide.securitySettings') || 'Security Settings'}
          </h2>
          
          <div className={styles.securityGrid}>
            <div className={styles.securityCard}>
              <div className={styles.securityIcon}>🔐</div>
              <h3>{t('privacySettingsGuide.twoFactorAuth') || 'Two-Factor Authentication'}</h3>
              <p>{t('privacySettingsGuide.twoFactorAuthDesc') || 'Add an extra layer of security to your account with 2FA.'}</p>
              <div className={styles.securitySteps}>
                <div className={styles.step}>
                  <span className={styles.stepNumber}>1</span>
                  <div>
                    <strong>{t('privacySettingsGuide.step1Title') || 'Choose Method'}</strong>
                    <p>{t('privacySettingsGuide.step1Desc') || 'Select authenticator app, SMS, or hardware key'}</p>
                  </div>
                </div>
                <div className={styles.step}>
                  <span className={styles.stepNumber}>2</span>
                  <div>
                    <strong>{t('privacySettingsGuide.step2Title') || 'Set Up Device'}</strong>
                    <p>{t('privacySettingsGuide.step2Desc') || 'Scan QR code or enter setup key'}</p>
                  </div>
                </div>
                <div className={styles.step}>
                  <span className={styles.stepNumber}>3</span>
                  <div>
                    <strong>{t('privacySettingsGuide.step3Title') || 'Save Backup Codes'}</strong>
                    <p>{t('privacySettingsGuide.step3Desc') || 'Store backup codes in a safe place'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.securityCard}>
              <div className={styles.securityIcon}>🔑</div>
              <h3>{t('privacySettingsGuide.sessionManagement') || 'Session Management'}</h3>
              <p>{t('privacySettingsGuide.sessionManagementDesc') || 'Monitor and control active sessions across all your devices.'}</p>
              <div className={styles.sessionFeatures}>
                <div className={styles.feature}>
                  <strong>{t('privacySettingsGuide.activeSessionsTitle') || 'Active Sessions'}</strong>
                  <p>{t('privacySettingsGuide.activeSessionsDesc') || 'See all devices currently logged into your account'}</p>
                </div>
                <div className={styles.feature}>
                  <strong>{t('privacySettingsGuide.sessionTimeoutTitle') || 'Session Timeout'}</strong>
                  <p>{t('privacySettingsGuide.sessionTimeoutDesc') || 'Automatically log out after period of inactivity'}</p>
                </div>
                <div className={styles.feature}>
                  <strong>{t('privacySettingsGuide.remoteLogoutTitle') || 'Remote Logout'}</strong>
                  <p>{t('privacySettingsGuide.remoteLogoutDesc') || 'Log out from all devices instantly if needed'}</p>
                </div>
              </div>
            </div>

            <div className={styles.securityCard}>
              <div className={styles.securityIcon}>📱</div>
              <h3>{t('privacySettingsGuide.deviceSecurity') || 'Device Security'}</h3>
              <p>{t('privacySettingsGuide.deviceSecurityDesc') || 'Additional security measures for mobile and desktop apps.'}</p>
              <div className={styles.deviceOptions}>
                <div className={styles.deviceOption}>
                  <strong>{t('privacySettingsGuide.biometricLock') || 'Biometric Lock'}</strong>
                  <p>{t('privacySettingsGuide.biometricLockDesc') || 'Use fingerprint or face recognition to unlock apps'}</p>
                </div>
                <div className={styles.deviceOption}>
                  <strong>{t('privacySettingsGuide.appPinLock') || 'App PIN Lock'}</strong>
                  <p>{t('privacySettingsGuide.appPinLockDesc') || 'Require PIN to access sensitive information'}</p>
                </div>
                <div className={styles.deviceOption}>
                  <strong>{t('privacySettingsGuide.autoLock') || 'Auto-Lock Timer'}</strong>
                  <p>{t('privacySettingsGuide.autoLockDesc') || 'Automatically lock app after specified time'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.dataRightsSection}>
          <h2 className={styles.sectionTitle}>
            {t('privacySettingsGuide.dataRights') || 'Your Data Rights'}
          </h2>
          
          <div className={styles.rightsGrid}>
            <div className={styles.rightCard}>
              <div className={styles.rightIcon}>📥</div>
              <h3>{t('privacySettingsGuide.dataExport') || 'Data Export'}</h3>
              <p>{t('privacySettingsGuide.dataExportDesc') || 'Download a complete copy of all your data in standard formats.'}</p>
              <div className={styles.rightActions}>
                <button className={styles.actionButton}>
                  {t('privacySettingsGuide.requestExport') || 'Request Data Export'}
                </button>
                <span className={styles.actionNote}>
                  {t('privacySettingsGuide.exportNote') || 'Delivered within 30 days'}
                </span>
              </div>
            </div>

            <div className={styles.rightCard}>
              <div className={styles.rightIcon}>✏️</div>
              <h3>{t('privacySettingsGuide.dataCorrection') || 'Data Correction'}</h3>
              <p>{t('privacySettingsGuide.dataCorrectionDesc') || 'Update or correct any inaccurate personal information in your account.'}</p>
              <div className={styles.rightActions}>
                <button className={styles.actionButton}>
                  {t('privacySettingsGuide.updateProfile') || 'Update Profile'}
                </button>
                <span className={styles.actionNote}>
                  {t('privacySettingsGuide.updateNote') || 'Changes take effect immediately'}
                </span>
              </div>
            </div>

            <div className={styles.rightCard}>
              <div className={styles.rightIcon}>🗑️</div>
              <h3>{t('privacySettingsGuide.dataDeletion') || 'Data Deletion'}</h3>
              <p>{t('privacySettingsGuide.dataDeletionDesc') || 'Permanently delete your account and all associated data.'}</p>
              <div className={styles.rightActions}>
                <button className={styles.actionButton + ' ' + styles.dangerButton}>
                  {t('privacySettingsGuide.deleteAccount') || 'Delete Account'}
                </button>
                <span className={styles.actionNote}>
                  {t('privacySettingsGuide.deleteNote') || 'This action cannot be undone'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.bestPracticesSection}>
          <h2 className={styles.sectionTitle}>
            {t('privacySettingsGuide.bestPractices') || 'Privacy Best Practices'}
          </h2>
          
          <div className={styles.practicesList}>
            <div className={styles.practice}>
              <div className={styles.practiceIcon}>🔒</div>
              <div className={styles.practiceContent}>
                <h4>{t('privacySettingsGuide.practice1Title') || 'Use Strong, Unique Passwords'}</h4>
                <p>{t('privacySettingsGuide.practice1Desc') || 'Create a unique password for your CyberEco account that you don\'t use anywhere else.'}</p>
              </div>
            </div>

            <div className={styles.practice}>
              <div className={styles.practiceIcon}>📱</div>
              <div className={styles.practiceContent}>
                <h4>{t('privacySettingsGuide.practice2Title') || 'Enable All Security Features'}</h4>
                <p>{t('privacySettingsGuide.practice2Desc') || 'Turn on 2FA, biometric locks, and automatic session timeouts for maximum protection.'}</p>
              </div>
            </div>

            <div className={styles.practice}>
              <div className={styles.practiceIcon}>👀</div>
              <div className={styles.practiceContent}>
                <h4>{t('privacySettingsGuide.practice3Title') || 'Review Privacy Settings Regularly'}</h4>
                <p>{t('privacySettingsGuide.practice3Desc') || 'Check your privacy settings every few months and adjust them as your needs change.'}</p>
              </div>
            </div>

            <div className={styles.practice}>
              <div className={styles.practiceIcon}>🚫</div>
              <div className={styles.practiceContent}>
                <h4>{t('privacySettingsGuide.practice4Title') || 'Be Selective with Data Sharing'}</h4>
                <p>{t('privacySettingsGuide.practice4Desc') || 'Only share what\'s necessary for the functionality you need.'}</p>
              </div>
            </div>

            <div className={styles.practice}>
              <div className={styles.practiceIcon}>💻</div>
              <div className={styles.practiceContent}>
                <h4>{t('privacySettingsGuide.practice5Title') || 'Keep Devices Secure'}</h4>
                <p>{t('privacySettingsGuide.practice5Desc') || 'Use device locks, keep software updated, and don\'t share devices with untrusted people.'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.nextStepsSection}>
          <h2 className={styles.sectionTitle}>
            {t('privacySettingsGuide.nextStepsTitle') || 'Next Steps'}
          </h2>
          <div className={styles.nextStepsGrid}>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>👥</div>
              <h3>{t('privacySettingsGuide.groupManagement') || 'Advanced Group Management'}</h3>
              <p>{t('privacySettingsGuide.groupManagementDesc') || 'Learn to manage complex group scenarios and privacy settings for shared expenses.'}</p>
              <a href="/guides/group-management" className={styles.nextStepLink}>
                {t('privacySettingsGuide.learnMore') || 'Learn More'} →
              </a>
            </div>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>📊</div>
              <h3>{t('privacySettingsGuide.dataExportGuide') || 'Data Export & Analysis'}</h3>
              <p>{t('privacySettingsGuide.dataExportGuideDesc') || 'Master data export features and analyze your spending patterns while maintaining privacy.'}</p>
              <a href="/guides/data-export" className={styles.nextStepLink}>
                {t('privacySettingsGuide.explore') || 'Explore'} →
              </a>
            </div>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>🤝</div>
              <h3>{t('privacySettingsGuide.support') || 'Privacy Support'}</h3>
              <p>{t('privacySettingsGuide.supportDesc') || 'Get help with privacy questions or report data protection concerns.'}</p>
              <a href="/support" className={styles.nextStepLink}>
                {t('privacySettingsGuide.contactSupport') || 'Contact Support'} →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}