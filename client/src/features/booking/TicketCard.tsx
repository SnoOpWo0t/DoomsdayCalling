import { Armchair, CalendarDays, MapPin, Ticket, X } from 'lucide-react';
import type { Reservation } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { PREMIERE_DATE } from '../../lib/constants';
import { describeBundles, pluralize } from '../../lib/format';
import styles from './TicketCard.module.css';

export interface TicketCardProps {
  reservation: Reservation;
  /** Highlight a reservation that was just made. */
  fresh?: boolean;
  onCancel?: () => void;
  cancelling?: boolean;
}

const premiere = PREMIERE_DATE.toLocaleDateString('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/** A reservation drawn as a ticket stub: details on the left, reference on the right. */
export function TicketCard({ reservation, fresh = false, onCancel, cancelling }: TicketCardProps) {
  return (
    <article
      className={styles.ticket}
      data-fresh={fresh || undefined}
      aria-label={`Reservation ${reservation.reference}`}
    >
      <div className={styles.main}>
        <p className={styles.kicker}>
          <Ticket size={14} aria-hidden /> Avengers: Doomsday · Opening night
        </p>
        <h3 className={styles.name}>{reservation.name}</h3>
        <ul className={styles.facts}>
          <li>
            <MapPin size={14} aria-hidden /> {reservation.cinema.name}
          </li>
          <li>
            <CalendarDays size={14} aria-hidden /> {premiere}
          </li>
          <li>
            <Armchair size={14} aria-hidden /> {pluralize(reservation.groupSize, 'seat')}
          </li>
        </ul>
        <p className={styles.bundles}>{describeBundles(reservation.bundles)}</p>
      </div>

      <div className={styles.stub}>
        <span className={styles.stubLabel}>Reference</span>
        <span className={styles.reference}>{reservation.reference}</span>
        {onCancel && reservation.canCancel && (
          <Button size="sm" variant="ghost" icon={X} onClick={onCancel} loading={cancelling}>
            Cancel
          </Button>
        )}
      </div>
    </article>
  );
}
