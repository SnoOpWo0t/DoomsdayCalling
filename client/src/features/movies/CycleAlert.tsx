import { ArrowRight } from 'lucide-react';
import type { CycleStep } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import styles from './CycleAlert.module.css';

/** Explains a 409 CIRCULAR_DEPENDENCY by drawing the loop the change would create. */
export function CycleAlert({ cycle }: { cycle: CycleStep[] }) {
  const start = cycle[0]?.title ?? 'This movie';
  const lastIndex = cycle.length - 1;
  return (
    <Alert title="That would create a loop" reveal>
      <p>
        {start} cannot require a movie that already depends on it. Nothing was saved; pick different
        prerequisites or break the chain first.
      </p>
      <ol className={styles.chain} aria-label="Dependency loop">
        {cycle.map((step, index) => (
          <li key={`${step.id}-${index}`} className={styles.item}>
            {index > 0 && <ArrowRight size={14} className={styles.arrow} aria-hidden />}
            <span className={index === 0 || index === lastIndex ? styles.endpoint : styles.step}>
              {step.title}
            </span>
          </li>
        ))}
      </ol>
    </Alert>
  );
}
