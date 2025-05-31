'use client';

import { useLanguage } from '@cybereco/ui-components';
import styles from './page.module.css';

export default function StatusPage() {
  const { t } = useLanguage();
  
  return (
        <div className={styles.container}>
          <header className={styles.pageHeader}>
            <h1 className={styles.title}>
              {t('statusPage.title') || 'System Status'}
            </h1>
            <p className={styles.subtitle}>
              {t('statusPage.subtitle') || 'Current operational status of all CyberEco services and applications'}
            </p>
          </header>
          
          <section className={styles.contentSection}>
            <div className={styles.overallStatus}>
              <div className={styles.statusIndicator}>
                <div className={styles.statusLight}></div>
                <h2 className={styles.statusText}>All Systems Operational</h2>
              </div>
              <p className={styles.statusDescription}>
                All CyberEco services are currently running smoothly with no known issues.
              </p>
            </div>

            <div className={styles.servicesStatus}>
              <h3 className={styles.sectionTitle}>Service Status</h3>
              
              <div className={styles.serviceItem}>
                <div className={styles.serviceInfo}>
                  <h4 className={styles.serviceName}>CyberEco Hub</h4>
                  <p className={styles.serviceDescription}>Central authentication and user management</p>
                </div>
                <div className={styles.serviceStatus}>
                  <span className={styles.statusBadge + ' ' + styles.operational}>Operational</span>
                </div>
              </div>

              <div className={styles.serviceItem}>
                <div className={styles.serviceInfo}>
                  <h4 className={styles.serviceName}>JustSplit</h4>
                  <p className={styles.serviceDescription}>Expense splitting and financial management</p>
                </div>
                <div className={styles.serviceStatus}>
                  <span className={styles.statusBadge + ' ' + styles.operational}>Operational</span>
                </div>
              </div>

              <div className={styles.serviceItem}>
                <div className={styles.serviceInfo}>
                  <h4 className={styles.serviceName}>Website</h4>
                  <p className={styles.serviceDescription}>Main website and documentation</p>
                </div>
                <div className={styles.serviceStatus}>
                  <span className={styles.statusBadge + ' ' + styles.operational}>Operational</span>
                </div>
              </div>

              <div className={styles.serviceItem}>
                <div className={styles.serviceInfo}>
                  <h4 className={styles.serviceName}>Somos</h4>
                  <p className={styles.serviceDescription}>Family roots and cultural heritage explorer</p>
                </div>
                <div className={styles.serviceStatus}>
                  <span className={styles.statusBadge + ' ' + styles.development}>In Development</span>
                </div>
              </div>

              <div className={styles.serviceItem}>
                <div className={styles.serviceInfo}>
                  <h4 className={styles.serviceName}>Demos</h4>
                  <p className={styles.serviceDescription}>Community governance and decision making</p>
                </div>
                <div className={styles.serviceStatus}>
                  <span className={styles.statusBadge + ' ' + styles.development}>In Development</span>
                </div>
              </div>

              <div className={styles.serviceItem}>
                <div className={styles.serviceInfo}>
                  <h4 className={styles.serviceName}>Plantopia</h4>
                  <p className={styles.serviceDescription}>Smart gardening and plant management</p>
                </div>
                <div className={styles.serviceStatus}>
                  <span className={styles.statusBadge + ' ' + styles.development}>In Development</span>
                </div>
              </div>
            </div>

            <div className={styles.uptime}>
              <h3 className={styles.sectionTitle}>System Uptime (Last 30 Days)</h3>
              <div className={styles.uptimeGrid}>
                <div className={styles.uptimeItem}>
                  <h4 className={styles.uptimeService}>Hub</h4>
                  <div className={styles.uptimeBar}>
                    <div className={styles.uptimeProgress} style={{width: '99.9%'}}></div>
                  </div>
                  <span className={styles.uptimePercent}>99.9%</span>
                </div>
                <div className={styles.uptimeItem}>
                  <h4 className={styles.uptimeService}>JustSplit</h4>
                  <div className={styles.uptimeBar}>
                    <div className={styles.uptimeProgress} style={{width: '99.8%'}}></div>
                  </div>
                  <span className={styles.uptimePercent}>99.8%</span>
                </div>
                <div className={styles.uptimeItem}>
                  <h4 className={styles.uptimeService}>Website</h4>
                  <div className={styles.uptimeBar}>
                    <div className={styles.uptimeProgress} style={{width: '100%'}}></div>
                  </div>
                  <span className={styles.uptimePercent}>100%</span>
                </div>
              </div>
            </div>

            <div className={styles.recentIncidents}>
              <h3 className={styles.sectionTitle}>Recent Incidents</h3>
              <div className={styles.incidentItem}>
                <div className={styles.incidentDate}>No recent incidents</div>
                <div className={styles.incidentDescription}>
                  All systems have been running smoothly with no reported incidents in the past 30 days.
                </div>
              </div>
            </div>

            <div className={styles.maintenance}>
              <h3 className={styles.sectionTitle}>Scheduled Maintenance</h3>
              <div className={styles.maintenanceItem}>
                <div className={styles.maintenanceDate}>No scheduled maintenance</div>
                <div className={styles.maintenanceDescription}>
                  There is currently no scheduled maintenance for any CyberEco services.
                </div>
              </div>
            </div>
          </section>
        </div>
  );
}