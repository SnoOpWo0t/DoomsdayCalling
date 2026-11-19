import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  value: number;
  max: number;
  /** Accessible description, e.g. "4 of 7 watched". */
  label: string;
}

export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={label}
      aria-label={label}
    >
      <div className={styles.fill} style={{ width: `${percent}%` }} />
    </div>
  );
}
