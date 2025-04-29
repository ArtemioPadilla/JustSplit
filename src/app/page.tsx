import Link from 'next/link'
import styles from './page.module.css'

export default function Home() {
  return (
    <main className={styles.main}>
      <h1>JustSplit</h1>
      <p>Fair expense splitting, made simple.</p>
      <p>Track, divide, and settle shared expenses effortlessly — for trips, events, or daily life.</p>
      <div className={styles.buttons}>
        <Link href="/expenses/new" className={styles.button}>
          Add Expense
        </Link>
        <Link href="/events/new" className={styles.button}>
          Create Event
        </Link>
      </div>
    </main>
  )
}
