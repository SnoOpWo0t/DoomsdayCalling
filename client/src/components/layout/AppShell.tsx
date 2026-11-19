import { CalendarClock, Film, ListOrdered, Ticket, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet, ScrollRestoration } from 'react-router';
import { PREMIERE_DATE } from '../../lib/constants';
import { daysUntil, pluralize } from '../../lib/format';
import styles from './AppShell.module.css';

const NAV_ITEMS: Array<{ to: string; label: string; icon: LucideIcon }> = [
  { to: '/', label: 'Movies & series', icon: Film },
  { to: '/plan', label: 'Rewatch plan', icon: ListOrdered },
  { to: '/booking', label: 'Booking', icon: Ticket },
];

export function AppShell() {
  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <NavLink to="/" className={styles.brand} aria-label="Doomsday Calling home">
            <span className={styles.brandMark} aria-hidden />
            <span className={styles.brandText}>
              Doomsday <span className={styles.brandAccent}>Calling</span>
            </span>
          </NavLink>

          <nav aria-label="Main" className={styles.nav}>
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                }
              >
                <Icon size={16} aria-hidden />
                <span className={styles.navLabel}>{label}</span>
              </NavLink>
            ))}
          </nav>

          <PremiereCountdown />
        </div>
      </header>

      <main id="main" className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <p>
          Sample watch links are for this challenge only, not an official guide.
          <span className={styles.footerSep} aria-hidden>
            /
          </span>
          Movie data and posters, when enabled, from TMDb. This product uses the TMDb API but is not
          endorsed or certified by TMDb.
        </p>
      </footer>

      <ScrollRestoration />
    </div>
  );
}

function PremiereCountdown() {
  const days = daysUntil(PREMIERE_DATE);
  const date = PREMIERE_DATE.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <p className={styles.countdown}>
      <CalendarClock size={16} aria-hidden />
      {days > 0 ? (
        <span>
          <strong>{pluralize(days, 'day')}</strong>
          <span className={styles.countdownDetail}> to opening night, {date}</span>
        </span>
      ) : (
        <span>
          <strong>Now showing</strong>
        </span>
      )}
    </p>
  );
}
