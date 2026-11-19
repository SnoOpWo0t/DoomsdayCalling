import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './StateMessage.module.css';

export interface StateMessageProps {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  tone?: 'neutral' | 'danger' | 'success';
}

/** Centered message for empty, error and completion states. */
export function StateMessage({
  icon: Icon,
  title,
  children,
  action,
  tone = 'neutral',
}: StateMessageProps) {
  return (
    <div
      className={`${styles.state} ${styles[tone]}`}
      role={tone === 'danger' ? 'alert' : undefined}
    >
      <span className={styles.icon}>
        <Icon size={22} aria-hidden />
      </span>
      <h2 className={styles.title}>{title}</h2>
      {children && <div className={styles.body}>{children}</div>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
