import styles from './BundleChips.module.css';

/** Bundle sizes rendered as small seat-count chips. */
export function BundleChips({ sizes }: { sizes: number[] }) {
  return (
    <ul className={styles.chips} aria-label="Bundle sizes">
      {sizes.map((size) => (
        <li key={size} className={styles.chip}>
          {size}
          <span className={styles.unit}> {size === 1 ? 'seat' : 'seats'}</span>
        </li>
      ))}
    </ul>
  );
}
