import { Check } from 'lucide-react';
import type { Cinema } from '../../api/types';
import { BundleChips } from './BundleChips';
import styles from './CinemaPicker.module.css';

export interface CinemaPickerProps {
  cinemas: Cinema[];
  selectedId: number | undefined;
  onSelect: (id: number) => void;
}

/** Cinemas as selectable cards (a native radio group under the hood). */
export function CinemaPicker({ cinemas, selectedId, onSelect }: CinemaPickerProps) {
  return (
    <fieldset className={styles.picker}>
      <legend className="sr-only">Cinema</legend>
      {cinemas.map((cinema) => {
        const selected = cinema.id === selectedId;
        return (
          <label key={cinema.id} className={styles.card} data-selected={selected}>
            <input
              type="radio"
              name="cinema"
              className="sr-only"
              value={cinema.id}
              checked={selected}
              onChange={() => onSelect(cinema.id)}
            />
            <span className={styles.radio} aria-hidden>
              <Check size={12} strokeWidth={3} />
            </span>
            <span className={styles.body}>
              <span className={styles.name}>{cinema.name}</span>
              <BundleChips sizes={cinema.bundleSizes} />
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
