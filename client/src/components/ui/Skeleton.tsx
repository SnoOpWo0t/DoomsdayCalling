import styles from './Skeleton.module.css';

/** Placeholder rows shown while data loads, shaped like the content they replace. */
export function SkeletonRows({ rows = 4, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div className={styles.list} role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.row}>
          <span className={`${styles.block} ${styles.poster}`} />
          <span className={styles.lines}>
            <span className={`${styles.block} ${styles.line}`} />
            <span className={`${styles.block} ${styles.lineShort}`} />
          </span>
        </div>
      ))}
    </div>
  );
}
