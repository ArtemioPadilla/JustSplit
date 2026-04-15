'use client';

import { useLanguage } from '@cybereco/ui-components';
import styles from './page.module.css';

export default function MobileAppGuidePage() {
  const { t } = useLanguage();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <a href="/documentation" className={styles.breadcrumbLink}>
            {t('mobileAppGuide.documentation') || 'Documentation'}
          </a>
          <span className={styles.breadcrumbSeparator}>›</span>
          <span className={styles.breadcrumbCurrent}>
            {t('mobileAppGuide.title') || 'Mobile App Guide'}
          </span>
        </div>
        <h1 className={styles.title}>
          📱 {t('mobileAppGuide.title') || 'Mobile App Guide'}
        </h1>
        <div className={styles.guideMeta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>⏱️ {t('mobileAppGuide.duration') || 'Duration'}:</span>
            <span className={styles.metaValue}>15-20 {t('mobileAppGuide.minutes') || 'minutes'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>📈 {t('mobileAppGuide.level') || 'Level'}:</span>
            <span className={styles.metaValue}>{t('mobileAppGuide.beginner') || 'Beginner'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>🎯 {t('mobileAppGuide.goal') || 'Goal'}:</span>
            <span className={styles.metaValue}>{t('mobileAppGuide.goalText') || 'Optimize mobile experience'}</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.introSection}>
          <h2 className={styles.sectionTitle}>
            {t('mobileAppGuide.introTitle') || 'Mobile-First Experience'}
          </h2>
          <p className={styles.introText}>
            {t('mobileAppGuide.introText') || 'CyberEco apps are designed mobile-first for on-the-go expense tracking, group management, and real-time collaboration. This guide covers mobile-specific features, offline capabilities, and tips for optimal mobile usage.'}
          </p>
          
          <div className={styles.platformSupport}>
            <div className={styles.platformCard}>
              <div className={styles.platformIcon}>📱</div>
              <h4>{t('mobileAppGuide.ios') || 'iOS App'}</h4>
              <p>{t('mobileAppGuide.iosDesc') || 'iOS 14+ (iPhone, iPad) with native features'}</p>
              <div className={styles.platformBadge}>{t('mobileAppGuide.available') || 'Available'}</div>
            </div>
            <div className={styles.platformCard}>
              <div className={styles.platformIcon}>🤖</div>
              <h4>{t('mobileAppGuide.android') || 'Android App'}</h4>
              <p>{t('mobileAppGuide.androidDesc') || 'Android 8+ with Material Design'}</p>
              <div className={styles.platformBadge}>{t('mobileAppGuide.available') || 'Available'}</div>
            </div>
            <div className={styles.platformCard}>
              <div className={styles.platformIcon}>🌐</div>
              <h4>{t('mobileAppGuide.pwa') || 'Progressive Web App'}</h4>
              <p>{t('mobileAppGuide.pwaDesc') || 'Works on any mobile browser with app-like experience'}</p>
              <div className={styles.platformBadge}>{t('mobileAppGuide.available') || 'Available'}</div>
            </div>
          </div>
        </div>

        <div className={styles.featuresSection}>
          <h2 className={styles.sectionTitle}>
            {t('mobileAppGuide.mobileFeatures') || 'Mobile-Optimized Features'}
          </h2>

          <div className={styles.featureList}>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>📷</div>
              <div className={styles.featureContent}>
                <h3>{t('mobileAppGuide.receiptScanning') || 'Receipt Scanning'}</h3>
                <p>{t('mobileAppGuide.receiptScanningDesc') || 'Point your camera at any receipt and automatically extract expense details, amounts, and participants.'}</p>
                <div className={styles.featureTips}>
                  <h4>{t('mobileAppGuide.tips') || 'Tips'}:</h4>
                  <ul>
                    <li>{t('mobileAppGuide.scanTip1') || 'Hold phone steady for 2-3 seconds'}</li>
                    <li>{t('mobileAppGuide.scanTip2') || 'Ensure good lighting and flat receipt'}</li>
                    <li>{t('mobileAppGuide.scanTip3') || 'Tap to focus if image is blurry'}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>📍</div>
              <div className={styles.featureContent}>
                <h3>{t('mobileAppGuide.locationBasedExpenses') || 'Location-Based Expenses'}</h3>
                <p>{t('mobileAppGuide.locationBasedDesc') || 'Automatically suggest expense categories and participants based on your location and past spending patterns.'}</p>
                <div className={styles.featureTips}>
                  <h4>{t('mobileAppGuide.howItWorks') || 'How it works'}:</h4>
                  <ul>
                    <li>{t('mobileAppGuide.locationTip1') || 'App learns your frequent locations'}</li>
                    <li>{t('mobileAppGuide.locationTip2') || 'Suggests relevant groups and categories'}</li>
                    <li>{t('mobileAppGuide.locationTip3') || 'Privacy-first: location data stays on device'}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>⚡</div>
              <div className={styles.featureContent}>
                <h3>{t('mobileAppGuide.quickActions') || 'Quick Actions'}</h3>
                <p>{t('mobileAppGuide.quickActionsDesc') || 'Access common actions with swipe gestures, force touch, and one-tap shortcuts for faster expense entry.'}</p>
                <div className={styles.actionGrid}>
                  <div className={styles.actionItem}>
                    <span className={styles.actionGesture}>←</span>
                    <span>{t('mobileAppGuide.swipeLeft') || 'Swipe left to mark paid'}</span>
                  </div>
                  <div className={styles.actionItem}>
                    <span className={styles.actionGesture}>→</span>
                    <span>{t('mobileAppGuide.swipeRight') || 'Swipe right to edit'}</span>
                  </div>
                  <div className={styles.actionItem}>
                    <span className={styles.actionGesture}>↓</span>
                    <span>{t('mobileAppGuide.pullDown') || 'Pull down to refresh'}</span>
                  </div>
                  <div className={styles.actionItem}>
                    <span className={styles.actionGesture}>3D</span>
                    <span>{t('mobileAppGuide.forceTouch') || 'Force touch for quick preview'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>🔔</div>
              <div className={styles.featureContent}>
                <h3>{t('mobileAppGuide.smartNotifications') || 'Smart Notifications'}</h3>
                <p>{t('mobileAppGuide.smartNotificationsDesc') || 'Intelligent notifications that learn your preferences and only alert you about important expense updates.'}</p>
                <div className={styles.notificationTypes}>
                  <div className={styles.notificationType}>
                    <span className={styles.notificationIcon}>💰</span>
                    <div>
                      <h5>{t('mobileAppGuide.expenseAlerts') || 'Expense Alerts'}</h5>
                      <p>{t('mobileAppGuide.expenseAlertsDesc') || 'New expenses, payment requests, settlements'}</p>
                    </div>
                  </div>
                  <div className={styles.notificationType}>
                    <span className={styles.notificationIcon}>👥</span>
                    <div>
                      <h5>{t('mobileAppGuide.groupUpdates') || 'Group Updates'}</h5>
                      <p>{t('mobileAppGuide.groupUpdatesDesc') || 'Member changes, group settings, invitations'}</p>
                    </div>
                  </div>
                  <div className={styles.notificationType}>
                    <span className={styles.notificationIcon}>📊</span>
                    <div>
                      <h5>{t('mobileAppGuide.summaryReports') || 'Summary Reports'}</h5>
                      <p>{t('mobileAppGuide.summaryReportsDesc') || 'Weekly summaries, monthly reports, insights'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.offlineSection}>
          <h2 className={styles.sectionTitle}>
            {t('mobileAppGuide.offlineCapabilities') || 'Offline Capabilities'}
          </h2>
          
          <div className={styles.offlineGrid}>
            <div className={styles.offlineCard}>
              <div className={styles.offlineIcon}>💾</div>
              <h3>{t('mobileAppGuide.localStorage') || 'Local Storage'}</h3>
              <p>{t('mobileAppGuide.localStorageDesc') || 'All your recent data is stored locally for instant access even without internet connection.'}</p>
              <div className={styles.offlineFeatures}>
                <span className={styles.feature}>✓ {t('mobileAppGuide.viewExpenses') || 'View recent expenses'}</span>
                <span className={styles.feature}>✓ {t('mobileAppGuide.viewGroups') || 'Browse groups'}</span>
                <span className={styles.feature}>✓ {t('mobileAppGuide.viewBalances') || 'Check balances'}</span>
              </div>
            </div>
            
            <div className={styles.offlineCard}>
              <div className={styles.offlineIcon}>📝</div>
              <h3>{t('mobileAppGuide.offlineEntry') || 'Offline Entry'}</h3>
              <p>{t('mobileAppGuide.offlineEntryDesc') || 'Create and edit expenses while offline. Changes sync automatically when you reconnect.'}</p>
              <div className={styles.offlineFeatures}>
                <span className={styles.feature}>✓ {t('mobileAppGuide.addExpenses') || 'Add new expenses'}</span>
                <span className={styles.feature}>✓ {t('mobileAppGuide.takePhotos') || 'Take receipt photos'}</span>
                <span className={styles.feature}>✓ {t('mobileAppGuide.editDrafts') || 'Edit draft expenses'}</span>
              </div>
            </div>
            
            <div className={styles.offlineCard}>
              <div className={styles.offlineIcon}>🔄</div>
              <h3>{t('mobileAppGuide.autoSync') || 'Auto-Sync'}</h3>
              <p>{t('mobileAppGuide.autoSyncDesc') || 'Seamless synchronization when connection is restored. No data loss, ever.'}</p>
              <div className={styles.offlineFeatures}>
                <span className={styles.feature}>✓ {t('mobileAppGuide.conflictResolution') || 'Smart conflict resolution'}</span>
                <span className={styles.feature}>✓ {t('mobileAppGuide.backgroundSync') || 'Background sync'}</span>
                <span className={styles.feature}>✓ {t('mobileAppGuide.progressIndicator') || 'Sync progress indicator'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.optimizationSection}>
          <h2 className={styles.sectionTitle}>
            {t('mobileAppGuide.performanceOptimization') || 'Performance Optimization'}
          </h2>
          
          <div className={styles.optimizationTips}>
            <div className={styles.tipCategory}>
              <h3>{t('mobileAppGuide.batteryOptimization') || 'Battery Optimization'}</h3>
              <div className={styles.tipList}>
                <div className={styles.tip}>
                  <span className={styles.tipIcon}>🔋</span>
                  <div>
                    <h4>{t('mobileAppGuide.backgroundApp') || 'Background App Refresh'}</h4>
                    <p>{t('mobileAppGuide.backgroundAppDesc') || 'Disable for longer battery life, enable for real-time updates'}</p>
                  </div>
                </div>
                <div className={styles.tip}>
                  <span className={styles.tipIcon}>📱</span>
                  <div>
                    <h4>{t('mobileAppGuide.lowPowerMode') || 'Low Power Mode'}</h4>
                    <p>{t('mobileAppGuide.lowPowerModeDesc') || 'App automatically reduces features to conserve battery'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={styles.tipCategory}>
              <h3>{t('mobileAppGuide.dataUsage') || 'Data Usage'}</h3>
              <div className={styles.tipList}>
                <div className={styles.tip}>
                  <span className={styles.tipIcon}>📶</span>
                  <div>
                    <h4>{t('mobileAppGuide.wifiPreference') || 'Wi-Fi Preference'}</h4>
                    <p>{t('mobileAppGuide.wifiPreferenceDesc') || 'Large uploads (photos) wait for Wi-Fi by default'}</p>
                  </div>
                </div>
                <div className={styles.tip}>
                  <span className={styles.tipIcon}>🗜️</span>
                  <div>
                    <h4>{t('mobileAppGuide.dataCompression') || 'Data Compression'}</h4>
                    <p>{t('mobileAppGuide.dataCompressionDesc') || 'Images compressed automatically to save mobile data'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.troubleshootingSection}>
          <h2 className={styles.sectionTitle}>
            {t('mobileAppGuide.mobileTroubleshooting') || 'Mobile Troubleshooting'}
          </h2>
          
          <div className={styles.troubleshootingList}>
            <div className={styles.troubleItem}>
              <h4>{t('mobileAppGuide.appCrashing') || 'App Crashing or Freezing'}</h4>
              <ol>
                <li>{t('mobileAppGuide.crashSolution1') || 'Force close and restart the app'}</li>
                <li>{t('mobileAppGuide.crashSolution2') || 'Restart your device'}</li>
                <li>{t('mobileAppGuide.crashSolution3') || 'Update to latest app version'}</li>
                <li>{t('mobileAppGuide.crashSolution4') || 'Clear app cache (Android) or reinstall (iOS)'}</li>
              </ol>
            </div>
            
            <div className={styles.troubleItem}>
              <h4>{t('mobileAppGuide.syncIssues') || 'Data Not Syncing'}</h4>
              <ol>
                <li>{t('mobileAppGuide.syncSolution1') || 'Check internet connection'}</li>
                <li>{t('mobileAppGuide.syncSolution2') || 'Pull down to refresh manually'}</li>
                <li>{t('mobileAppGuide.syncSolution3') || 'Log out and log back in'}</li>
                <li>{t('mobileAppGuide.syncSolution4') || 'Check Background App Refresh settings'}</li>
              </ol>
            </div>
            
            <div className={styles.troubleItem}>
              <h4>{t('mobileAppGuide.receiptScanIssues') || 'Receipt Scanning Not Working'}</h4>
              <ol>
                <li>{t('mobileAppGuide.scanSolution1') || 'Check camera permissions in phone settings'}</li>
                <li>{t('mobileAppGuide.scanSolution2') || 'Clean camera lens and ensure good lighting'}</li>
                <li>{t('mobileAppGuide.scanSolution3') || 'Try manual entry if receipt is damaged'}</li>
                <li>{t('mobileAppGuide.scanSolution4') || 'Update app for latest scanning improvements'}</li>
              </ol>
            </div>
          </div>
        </div>

        <div className={styles.nextStepsSection}>
          <h2 className={styles.sectionTitle}>
            {t('mobileAppGuide.nextStepsTitle') || 'Next Steps'}
          </h2>
          <div className={styles.nextStepsGrid}>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>💰</div>
              <h3>{t('mobileAppGuide.justSplitGuide') || 'JustSplit Complete Guide'}</h3>
              <p>{t('mobileAppGuide.justSplitGuideDesc') || 'Master all JustSplit features including group management and advanced splitting.'}</p>
              <a href="/guides/justsplit" className={styles.nextStepLink}>
                {t('mobileAppGuide.learnMore') || 'Learn More'} →
              </a>
            </div>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>🔐</div>
              <h3>{t('mobileAppGuide.privacySettings') || 'Privacy & Security'}</h3>
              <p>{t('mobileAppGuide.privacySettingsDesc') || 'Configure mobile-specific privacy settings and security features.'}</p>
              <a href="/guides/privacy-settings" className={styles.nextStepLink}>
                {t('mobileAppGuide.configure') || 'Configure'} →
              </a>
            </div>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>🤝</div>
              <h3>{t('mobileAppGuide.support') || 'Get Support'}</h3>
              <p>{t('mobileAppGuide.supportDesc') || 'Contact our mobile app support team for device-specific help.'}</p>
              <a href="/support" className={styles.nextStepLink}>
                {t('mobileAppGuide.contactSupport') || 'Contact Support'} →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}