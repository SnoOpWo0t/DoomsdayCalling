import { Check } from 'lucide-react';
import styles from './WatchToggle.module.css';

export interface WatchToggleProps {
  watched: boolean;
  title: string;
  onChange: (watched: boolean) => void;
  disabled?: boolean;
}

/** Round tick button; exposes its state with aria-pressed. */
export function WatchToggle({ watched, title, onChange, disabled }: WatchToggleProps) {
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={watched}
      aria-label={watched ? `Mark ${title} as not watched` : `Mark ${title} as watched`}
      title={watched ? 'Watched' : 'Mark as watched'}
      onClick={() => onChange(!watched)}
      disabled={disabled}
    >
      <Check size={16} strokeWidth={3} aria-hidden />
    </button>
  );
}
