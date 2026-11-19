import { CircleAlert, Info } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Alert.module.css';

export interface AlertProps {
  tone?: 'danger' | 'info';
  title?: string;
  children: ReactNode;
  /** Scroll the alert into view when it appears (useful at the bottom of long forms). */
  reveal?: boolean;
}

/** Inline message inside forms and panels. */
export function Alert({ tone = 'danger', title, children, reveal = false }: AlertProps) {
  const Icon = tone === 'danger' ? CircleAlert : Info;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reveal) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [reveal]);

  return (
    <div
      ref={ref}
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
