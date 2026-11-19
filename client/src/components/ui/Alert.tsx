import { CircleAlert, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './Alert.module.css';

export interface AlertProps {
  tone?: 'danger' | 'info';
  title?: string;
  children: ReactNode;
}

/** Inline message inside forms and panels. */
export function Alert({ tone = 'danger', title, children }: AlertProps) {
  const Icon = tone === 'danger' ? CircleAlert : Info;
  return (
    <div
      className={`${styles.alert} ${styles[tone]}`}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <Icon size={18} className={styles.icon} aria-hidden />
      <div className={styles.content}>
        {title && <p className={styles.title}>{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
