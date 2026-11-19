import { Tv } from 'lucide-react';
import styles from './SeriesBadge.module.css';

/** Marks a title as a series; movies are the default and stay unmarked. */
export function SeriesBadge() {
  return (
    <span className={styles.badge}>
      <Tv size={12} aria-hidden />
      Series
    </span>
  );
}
