import Link from 'next/link'
import styles from './styles.module.css'

interface HeaderProps {
  currentPage?: string;
}

export default function Header({ currentPage = 'home' }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Link href="/">JustSplit</Link>
      </div>
      <nav className={styles.nav}>
        <Link href="/" className={currentPage === 'home' ? styles.active : ''}>
          Home
        </Link>
        <Link href="/events" className={currentPage === 'events' ? styles.active : ''}>
          Events
        </Link>
        <Link href="/settlements" className={currentPage === 'settlements' ? styles.active : ''}>
          Settlements
        </Link>
        <Link href="/profile" className={currentPage === 'profile' ? styles.active : ''}>
          Profile
        </Link>
      </nav>
    </header>
  )
}
