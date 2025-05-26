import Link from 'next/link';
import styles from '../../app/page.module.css';
import Button from '../ui/Button';

export default function WelcomeScreen() {
  return (
    <main className={styles.main}>
      <h1>JustSplit</h1>
      <p>Fair expense splitting, made simple.</p>
      <p>Track, divide, and settle shared expenses effortlessly — for trips, events, or daily life.</p>
      <div className={styles.buttons}>
        <Link href="/expenses/new" passHref>
          <Button variant="primary">Add Expense</Button>
        </Link>
        <Link href="/events/new" passHref>
          <Button variant="primary">Create Event</Button>
        </Link>
        
      </div>
    </main>
  );
}
