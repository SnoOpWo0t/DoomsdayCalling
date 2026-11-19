import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import styles from './Field.module.css';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}

/** Label + control + hint/error, wired together for assistive technology. */
function FieldShell({ id, label, hint, error, children, className }: FieldShellProps) {
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-message`} className={styles.error} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-message`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
  fieldClassName?: string;
}

export function TextField({ label, hint, error, fieldClassName, id, ...rest }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} className={fieldClassName}>
      <input
        id={inputId}
        className={styles.control}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${inputId}-message` : undefined}
        {...rest}
      />
    </FieldShell>
  );
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
  fieldClassName?: string;
}

export function SelectField({
  label,
  hint,
  error,
  fieldClassName,
  id,
  children,
  ...rest
}: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <FieldShell id={selectId} label={label} hint={hint} error={error} className={fieldClassName}>
      <select
        id={selectId}
        className={`${styles.control} ${styles.select}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${selectId}-message` : undefined}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}
