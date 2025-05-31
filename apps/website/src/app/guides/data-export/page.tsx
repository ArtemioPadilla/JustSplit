'use client';

import { useLanguage } from '@cybereco/ui-components';
import styles from './page.module.css';

export default function DataExportGuidePage() {
  const { t } = useLanguage();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <a href="/documentation" className={styles.breadcrumbLink}>
            {t('dataExportGuide.documentation') || 'Documentation'}
          </a>
          <span className={styles.breadcrumbSeparator}>›</span>
          <span className={styles.breadcrumbCurrent}>
            {t('dataExportGuide.title') || 'Data Export & Analysis'}
          </span>
        </div>
        <h1 className={styles.title}>
          📊 {t('dataExportGuide.title') || 'Data Export & Analysis'}
        </h1>
        <div className={styles.guideMeta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>⏱️ {t('dataExportGuide.duration') || 'Duration'}:</span>
            <span className={styles.metaValue}>15-20 {t('dataExportGuide.minutes') || 'minutes'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>📈 {t('dataExportGuide.level') || 'Level'}:</span>
            <span className={styles.metaValue}>{t('dataExportGuide.intermediate') || 'Intermediate'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>🎯 {t('dataExportGuide.goal') || 'Goal'}:</span>
            <span className={styles.metaValue}>{t('dataExportGuide.goalText') || 'Master data analysis and export'}</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.introSection}>
          <h2 className={styles.sectionTitle}>
            {t('dataExportGuide.introTitle') || 'Your Financial Data, Your Way'}
          </h2>
          <p className={styles.introText}>
            {t('dataExportGuide.introText') || 'Take control of your financial data with CyberEco\'s comprehensive export and analysis tools. This guide covers everything from basic CSV exports to advanced analytics, helping you understand spending patterns, generate reports, and integrate with external tools for deeper insights.'}
          </p>
          
          <div className={styles.benefitsGrid}>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>📈</div>
              <h4>{t('dataExportGuide.insightsBenefit') || 'Deep Insights'}</h4>
              <p>{t('dataExportGuide.insightsBenefitDesc') || 'Understand spending patterns and trends'}</p>
            </div>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>🔗</div>
              <h4>{t('dataExportGuide.integrationBenefit') || 'Easy Integration'}</h4>
              <p>{t('dataExportGuide.integrationBenefitDesc') || 'Connect with your favorite financial tools'}</p>
            </div>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>🔒</div>
              <h4>{t('dataExportGuide.privacyBenefit') || 'Privacy Preserved'}</h4>
              <p>{t('dataExportGuide.privacyBenefitDesc') || 'Full control over what data you export'}</p>
            </div>
          </div>
        </div>

        <div className={styles.exportFormatsSection}>
          <h2 className={styles.sectionTitle}>
            {t('dataExportGuide.exportFormats') || 'Export Formats'}
          </h2>
          
          <div className={styles.formatsList}>
            <div className={styles.formatCard}>
              <div className={styles.formatHeader}>
                <div className={styles.formatIcon}>📊</div>
                <h3>{t('dataExportGuide.csvFormat') || 'CSV (Comma-Separated Values)'}</h3>
                <span className={styles.popularBadge}>{t('dataExportGuide.mostPopular') || 'Most Popular'}</span>
              </div>
              <p className={styles.formatDescription}>
                {t('dataExportGuide.csvDesc') || 'Perfect for spreadsheet analysis, accounting software, and custom reporting tools.'}
              </p>
              <div className={styles.formatFeatures}>
                <h4>{t('dataExportGuide.includes') || 'Includes'}:</h4>
                <ul>
                  <li>{t('dataExportGuide.csvFeature1') || 'All expense transactions with timestamps'}</li>
                  <li>{t('dataExportGuide.csvFeature2') || 'Participant details and split amounts'}</li>
                  <li>{t('dataExportGuide.csvFeature3') || 'Category tags and custom notes'}</li>
                  <li>{t('dataExportGuide.csvFeature4') || 'Settlement status and payment methods'}</li>
                </ul>
              </div>
              <div className={styles.useCase}>
                <strong>{t('dataExportGuide.bestFor') || 'Best for'}:</strong>
                <span>{t('dataExportGuide.csvBestFor') || 'Excel analysis, QuickBooks import, tax preparation'}</span>
              </div>
            </div>

            <div className={styles.formatCard}>
              <div className={styles.formatHeader}>
                <div className={styles.formatIcon}>🔧</div>
                <h3>{t('dataExportGuide.jsonFormat') || 'JSON (JavaScript Object Notation)'}</h3>
                <span className={styles.technicalBadge}>{t('dataExportGuide.technical') || 'Technical'}</span>
              </div>
              <p className={styles.formatDescription}>
                {t('dataExportGuide.jsonDesc') || 'Structured data format ideal for developers and advanced integrations.'}
              </p>
              <div className={styles.formatFeatures}>
                <h4>{t('dataExportGuide.includes') || 'Includes'}:</h4>
                <ul>
                  <li>{t('dataExportGuide.jsonFeature1') || 'Complete data structure with relationships'}</li>
                  <li>{t('dataExportGuide.jsonFeature2') || 'Nested group and member information'}</li>
                  <li>{t('dataExportGuide.jsonFeature3') || 'Metadata and system-generated fields'}</li>
                  <li>{t('dataExportGuide.jsonFeature4') || 'API-compatible format for automation'}</li>
                </ul>
              </div>
              <div className={styles.useCase}>
                <strong>{t('dataExportGuide.bestFor') || 'Best for'}:</strong>
                <span>{t('dataExportGuide.jsonBestFor') || 'Custom apps, data migration, backup systems'}</span>
              </div>
            </div>

            <div className={styles.formatCard}>
              <div className={styles.formatHeader}>
                <div className={styles.formatIcon}>📄</div>
                <h3>{t('dataExportGuide.pdfFormat') || 'PDF Reports'}</h3>
                <span className={styles.visualBadge}>{t('dataExportGuide.visual') || 'Visual'}</span>
              </div>
              <p className={styles.formatDescription}>
                {t('dataExportGuide.pdfDesc') || 'Formatted reports perfect for sharing, presentations, and record-keeping.'}
              </p>
              <div className={styles.formatFeatures}>
                <h4>{t('dataExportGuide.includes') || 'Includes'}:</h4>
                <ul>
                  <li>{t('dataExportGuide.pdfFeature1') || 'Visual charts and spending summaries'}</li>
                  <li>{t('dataExportGuide.pdfFeature2') || 'Professional formatting and branding'}</li>
                  <li>{t('dataExportGuide.pdfFeature3') || 'Group member contribution breakdowns'}</li>
                  <li>{t('dataExportGuide.pdfFeature4') || 'Period comparisons and trend analysis'}</li>
                </ul>
              </div>
              <div className={styles.useCase}>
                <strong>{t('dataExportGuide.bestFor') || 'Best for'}:</strong>
                <span>{t('dataExportGuide.pdfBestFor') || 'Sharing with others, business reports, archiving'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.exportProcessSection}>
          <h2 className={styles.sectionTitle}>
            {t('dataExportGuide.exportProcess') || 'Export Process'}
          </h2>
          
          <div className={styles.processSteps}>
            <div className={styles.processStep}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h3>{t('dataExportGuide.step1Title') || 'Choose Your Scope'}</h3>
                <p>{t('dataExportGuide.step1Desc') || 'Select which data to export: specific groups, date ranges, or your complete financial history.'}</p>
                <div className={styles.scopeOptions}>
                  <div className={styles.scopeOption}>
                    <strong>{t('dataExportGuide.singleGroup') || 'Single Group'}</strong>
                    <p>{t('dataExportGuide.singleGroupDesc') || 'Export data from one specific group'}</p>
                  </div>
                  <div className={styles.scopeOption}>
                    <strong>{t('dataExportGuide.multipleGroups') || 'Multiple Groups'}</strong>
                    <p>{t('dataExportGuide.multipleGroupsDesc') || 'Select multiple groups for combined analysis'}</p>
                  </div>
                  <div className={styles.scopeOption}>
                    <strong>{t('dataExportGuide.completeHistory') || 'Complete History'}</strong>
                    <p>{t('dataExportGuide.completeHistoryDesc') || 'Export all your financial data across all groups'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.processStep}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h3>{t('dataExportGuide.step2Title') || 'Set Date Range'}</h3>
                <p>{t('dataExportGuide.step2Desc') || 'Specify the time period for your export. Choose from preset ranges or set custom dates.'}</p>
                <div className={styles.dateRanges}>
                  <div className={styles.rangeOptions}>
                    <span className={styles.rangeOption}>{t('dataExportGuide.lastMonth') || 'Last Month'}</span>
                    <span className={styles.rangeOption}>{t('dataExportGuide.lastQuarter') || 'Last Quarter'}</span>
                    <span className={styles.rangeOption}>{t('dataExportGuide.lastYear') || 'Last Year'}</span>
                    <span className={styles.rangeOption}>{t('dataExportGuide.allTime') || 'All Time'}</span>
                    <span className={styles.rangeOption}>{t('dataExportGuide.customRange') || 'Custom Range'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.processStep}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <h3>{t('dataExportGuide.step3Title') || 'Configure Privacy'}</h3>
                <p>{t('dataExportGuide.step3Desc') || 'Control what personal information to include or anonymize in your export.'}</p>
                <div className={styles.privacyControls}>
                  <div className={styles.privacyToggle}>
                    <strong>{t('dataExportGuide.includeNames') || 'Include Member Names'}</strong>
                    <p>{t('dataExportGuide.includeNamesDesc') || 'Show real names vs. anonymized identifiers'}</p>
                  </div>
                  <div className={styles.privacyToggle}>
                    <strong>{t('dataExportGuide.includeNotes') || 'Include Personal Notes'}</strong>
                    <p>{t('dataExportGuide.includeNotesDesc') || 'Export custom notes and comments'}</p>
                  </div>
                  <div className={styles.privacyToggle}>
                    <strong>{t('dataExportGuide.includeReceipts') || 'Include Receipt Images'}</strong>
                    <p>{t('dataExportGuide.includeReceiptsDesc') || 'Package receipt photos with data export'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.processStep}>
              <div className={styles.stepNumber}>4</div>
              <div className={styles.stepContent}>
                <h3>{t('dataExportGuide.step4Title') || 'Download & Verify'}</h3>
                <p>{t('dataExportGuide.step4Desc') || 'Generate your export file and verify the data integrity before using it for analysis.'}</p>
                <div className={styles.verificationChecks}>
                  <div className={styles.checkItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>{t('dataExportGuide.check1') || 'Verify transaction count matches your records'}</span>
                  </div>
                  <div className={styles.checkItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>{t('dataExportGuide.check2') || 'Spot-check a few transactions for accuracy'}</span>
                  </div>
                  <div className={styles.checkItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>{t('dataExportGuide.check3') || 'Confirm date ranges are correct'}</span>
                  </div>
                  <div className={styles.checkItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>{t('dataExportGuide.check4') || 'Test file opens properly in target application'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.analysisSection}>
          <h2 className={styles.sectionTitle}>
            {t('dataExportGuide.analysisTools') || 'Analysis Tools & Techniques'}
          </h2>
          
          <div className={styles.toolsGrid}>
            <div className={styles.toolCard}>
              <div className={styles.toolIcon}>📈</div>
              <h3>{t('dataExportGuide.spreadsheetAnalysis') || 'Spreadsheet Analysis'}</h3>
              <p>{t('dataExportGuide.spreadsheetDesc') || 'Use Excel, Google Sheets, or Numbers for quick insights and custom charts.'}</p>
              <div className={styles.toolFeatures}>
                <h4>{t('dataExportGuide.commonAnalyses') || 'Common Analyses'}:</h4>
                <ul>
                  <li>{t('dataExportGuide.monthlyTrends') || 'Monthly spending trends and seasonality'}</li>
                  <li>{t('dataExportGuide.categoryBreakdown') || 'Spending breakdown by category'}</li>
                  <li>{t('dataExportGuide.memberComparison') || 'Member contribution comparisons'}</li>
                  <li>{t('dataExportGuide.budgetTracking') || 'Budget vs. actual analysis'}</li>
                </ul>
              </div>
              <div className={styles.toolTip}>
                <strong>{t('dataExportGuide.proTip') || 'Pro Tip'}:</strong>
                <p>{t('dataExportGuide.spreadsheetTip') || 'Use pivot tables to quickly summarize large datasets by category, member, or time period.'}</p>
              </div>
            </div>

            <div className={styles.toolCard}>
              <div className={styles.toolIcon}>💼</div>
              <h3>{t('dataExportGuide.businessTools') || 'Business Intelligence Tools'}</h3>
              <p>{t('dataExportGuide.businessToolsDesc') || 'Import data into Power BI, Tableau, or similar tools for advanced visualization.'}</p>
              <div className={styles.toolFeatures}>
                <h4>{t('dataExportGuide.advancedFeatures') || 'Advanced Features'}:</h4>
                <ul>
                  <li>{t('dataExportGuide.interactiveDashboards') || 'Interactive dashboards and filters'}</li>
                  <li>{t('dataExportGuide.predictiveAnalytics') || 'Predictive analytics and forecasting'}</li>
                  <li>{t('dataExportGuide.crossGroupAnalysis') || 'Cross-group spending pattern analysis'}</li>
                  <li>{t('dataExportGuide.automatedReporting') || 'Automated report generation and sharing'}</li>
                </ul>
              </div>
              <div className={styles.toolTip}>
                <strong>{t('dataExportGuide.proTip') || 'Pro Tip'}:</strong>
                <p>{t('dataExportGuide.businessTip') || 'Set up data refresh schedules to automatically update your dashboards with new exports.'}</p>
              </div>
            </div>

            <div className={styles.toolCard}>
              <div className={styles.toolIcon}>💰</div>
              <h3>{t('dataExportGuide.personalFinance') || 'Personal Finance Apps'}</h3>
              <p>{t('dataExportGuide.personalFinanceDesc') || 'Integrate with Mint, YNAB, Personal Capital, or other budgeting tools.'}</p>
              <div className={styles.toolFeatures}>
                <h4>{t('dataExportGuide.integrationBenefits') || 'Integration Benefits'}:</h4>
                <ul>
                  <li>{t('dataExportGuide.holisticView') || 'Holistic view of all your finances'}</li>
                  <li>{t('dataExportGuide.automaticCategorization') || 'Automatic categorization and budgeting'}</li>
                  <li>{t('dataExportGuide.goalTracking') || 'Goal tracking and financial planning'}</li>
                  <li>{t('dataExportGuide.creditScore') || 'Credit score monitoring and alerts'}</li>
                </ul>
              </div>
              <div className={styles.toolTip}>
                <strong>{t('dataExportGuide.proTip') || 'Pro Tip'}:</strong>
                <p>{t('dataExportGuide.personalTip') || 'Map CyberEco categories to your budgeting app categories for seamless integration.'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.insightsSection}>
          <h2 className={styles.sectionTitle}>
            {t('dataExportGuide.keyInsights') || 'Key Insights to Look For'}
          </h2>
          
          <div className={styles.insightsList}>
            <div className={styles.insightCard}>
              <div className={styles.insightIcon}>📊</div>
              <h3>{t('dataExportGuide.spendingPatterns') || 'Spending Patterns'}</h3>
              <div className={styles.insightDetails}>
                <p>{t('dataExportGuide.patternsDesc') || 'Identify recurring themes in your group spending behavior.'}</p>
                <div className={styles.patternExamples}>
                  <div className={styles.pattern}>
                    <strong>{t('dataExportGuide.seasonalSpending') || 'Seasonal Spending'}</strong>
                    <p>{t('dataExportGuide.seasonalDesc') || 'Higher entertainment costs in summer, heating bills in winter'}</p>
                  </div>
                  <div className={styles.pattern}>
                    <strong>{t('dataExportGuide.weekdayPatterns') || 'Weekday vs. Weekend'}</strong>
                    <p>{t('dataExportGuide.weekdayDesc') || 'Different spending categories during work vs. leisure time'}</p>
                  </div>
                  <div className={styles.pattern}>
                    <strong>{t('dataExportGuide.groupSize') || 'Group Size Impact'}</strong>
                    <p>{t('dataExportGuide.groupSizeDesc') || 'How group size affects per-person costs and categories'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.insightCard}>
              <div className={styles.insightIcon}>⚖️</div>
              <h3>{t('dataExportGuide.fairnessMetrics') || 'Fairness & Balance'}</h3>
              <div className={styles.insightDetails}>
                <p>{t('dataExportGuide.fairnessDesc') || 'Understand how equitably expenses are shared among group members.'}</p>
                <div className={styles.fairnessMetrics}>
                  <div className={styles.metric}>
                    <strong>{t('dataExportGuide.contributionRatio') || 'Contribution Ratio'}</strong>
                    <p>{t('dataExportGuide.contributionDesc') || 'Who pays for expenses vs. who benefits'}</p>
                  </div>
                  <div className={styles.metric}>
                    <strong>{t('dataExportGuide.settlementSpeed') || 'Settlement Speed'}</strong>
                    <p>{t('dataExportGuide.settlementDesc') || 'How quickly members pay their shares'}</p>
                  </div>
                  <div className={styles.metric}>
                    <strong>{t('dataExportGuide.participationLevel') || 'Participation Level'}</strong>
                    <p>{t('dataExportGuide.participationDesc') || 'Activity levels and engagement across members'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.insightCard}>
              <div className={styles.insightIcon}>🎯</div>
              <h3>{t('dataExportGuide.optimizationOpportunities') || 'Optimization Opportunities'}</h3>
              <div className={styles.insightDetails}>
                <p>{t('dataExportGuide.optimizationDesc') || 'Find ways to reduce costs and improve group financial efficiency.'}</p>
                <div className={styles.optimizations}>
                  <div className={styles.optimization}>
                    <strong>{t('dataExportGuide.bulkPurchasing') || 'Bulk Purchasing'}</strong>
                    <p>{t('dataExportGuide.bulkDesc') || 'Items frequently bought individually that could be bulk purchased'}</p>
                  </div>
                  <div className={styles.optimization}>
                    <strong>{t('dataExportGuide.subscriptionAudit') || 'Subscription Audit'}</strong>
                    <p>{t('dataExportGuide.subscriptionDesc') || 'Duplicate or underused subscription services'}</p>
                  </div>
                  <div className={styles.optimization}>
                    <strong>{t('dataExportGuide.vendorSwitching') || 'Vendor Switching'}</strong>
                    <p>{t('dataExportGuide.vendorDesc') || 'Expensive vendors where cheaper alternatives exist'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.automationSection}>
          <h2 className={styles.sectionTitle}>
            {t('dataExportGuide.automatedExports') || 'Automated Exports'}
          </h2>
          
          <div className={styles.automationOptions}>
            <div className={styles.automationCard}>
              <div className={styles.automationIcon}>🔄</div>
              <h3>{t('dataExportGuide.scheduledExports') || 'Scheduled Exports'}</h3>
              <p>{t('dataExportGuide.scheduledDesc') || 'Set up regular exports to run automatically at specified intervals.'}</p>
              <div className={styles.scheduleOptions}>
                <div className={styles.scheduleOption}>
                  <strong>{t('dataExportGuide.daily') || 'Daily'}</strong>
                  <p>{t('dataExportGuide.dailyDesc') || 'For active groups with frequent transactions'}</p>
                </div>
                <div className={styles.scheduleOption}>
                  <strong>{t('dataExportGuide.weekly') || 'Weekly'}</strong>
                  <p>{t('dataExportGuide.weeklyDesc') || 'Standard option for most groups'}</p>
                </div>
                <div className={styles.scheduleOption}>
                  <strong>{t('dataExportGuide.monthly') || 'Monthly'}</strong>
                  <p>{t('dataExportGuide.monthlyDesc') || 'For budget reviews and monthly reporting'}</p>
                </div>
                <div className={styles.scheduleOption}>
                  <strong>{t('dataExportGuide.quarterly') || 'Quarterly'}</strong>
                  <p>{t('dataExportGuide.quarterlyDesc') || 'For business groups and formal reporting'}</p>
                </div>
              </div>
            </div>

            <div className={styles.automationCard}>
              <div className={styles.automationIcon}>🔗</div>
              <h3>{t('dataExportGuide.apiIntegration') || 'API Integration'}</h3>
              <p>{t('dataExportGuide.apiDesc') || 'Connect directly to external systems using our REST API for real-time data access.'}</p>
              <div className={styles.apiFeatures}>
                <ul>
                  <li>{t('dataExportGuide.realtimeData') || 'Real-time data access'}</li>
                  <li>{t('dataExportGuide.customFiltering') || 'Custom filtering and queries'}</li>
                  <li>{t('dataExportGuide.webhookNotifications') || 'Webhook notifications for new transactions'}</li>
                  <li>{t('dataExportGuide.rateLimitProtection') || 'Rate limiting and authentication'}</li>
                </ul>
              </div>
              <div className={styles.codeExample}>
                <h4>{t('dataExportGuide.exampleRequest') || 'Example API Request'}:</h4>
                <div className={styles.codeBlock}>
                  <code>
                    GET /api/v1/exports/transactions<br/>
                    ?group_id=123&from=2024-01-01&format=json
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.nextStepsSection}>
          <h2 className={styles.sectionTitle}>
            {t('dataExportGuide.nextStepsTitle') || 'Next Steps'}
          </h2>
          <div className={styles.nextStepsGrid}>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>🔐</div>
              <h3>{t('dataExportGuide.privacySettings') || 'Privacy & Security'}</h3>
              <p>{t('dataExportGuide.privacyDesc') || 'Learn to configure privacy settings for data exports and protect sensitive information.'}</p>
              <a href="/guides/privacy-settings" className={styles.nextStepLink}>
                {t('dataExportGuide.learnMore') || 'Learn More'} →
              </a>
            </div>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>👥</div>
              <h3>{t('dataExportGuide.groupManagement') || 'Advanced Group Management'}</h3>
              <p>{t('dataExportGuide.groupDesc') || 'Master complex group scenarios and learn to generate group-specific reports.'}</p>
              <a href="/guides/group-management" className={styles.nextStepLink}>
                {t('dataExportGuide.explore') || 'Explore'} →
              </a>
            </div>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>🤝</div>
              <h3>{t('dataExportGuide.support') || 'Data Support'}</h3>
              <p>{t('dataExportGuide.supportDesc') || 'Get help with complex exports, data integration, or custom analysis needs.'}</p>
              <a href="/support" className={styles.nextStepLink}>
                {t('dataExportGuide.contactSupport') || 'Contact Support'} →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}