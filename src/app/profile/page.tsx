import styles from './page.module.css';

export default function ProfilePage() {
  return (
    <div className={styles.container}>
      <h1>Your Profile</h1>
      
      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>
            <span>JS</span>
          </div>
          <div>
            <h2>User Name</h2>
            <p>user@example.com</p>
          </div>
        </div>
        
        <div className={styles.profileSection}>
          <h3>Personal Information</h3>
          <p>Update your profile information and preferences</p>
          
          <div className={styles.infoCard}>
            <p>This is a placeholder for profile settings. In the future, users will be able to update their information here.</p>
          </div>
        </div>
        
        <div className={styles.profileSection}>
          <h3>Payment Methods</h3>
          <p>Manage your payment preferences</p>
          
          <div className={styles.infoCard}>
            <p>No payment methods added yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
