import { useCancelReservation, useReservations } from '../../api/queries';
import styles from './MyReservations.module.css';
import { TicketCard } from './TicketCard';

/** The current guest's reservations, newest first, each cancellable. */
export function MyReservations() {
  const reservations = useReservations();
  const cancel = useCancelReservation();
  const list = reservations.data ?? [];

  return (
    <section aria-labelledby="reservations-heading" className={styles.section}>
      <h2 id="reservations-heading" className={styles.heading}>
        My reservations
        <span className={styles.count}>{list.length}</span>
      </h2>
      {reservations.isPending ? null : list.length === 0 ? (
        <p className={styles.empty}>
          No reservations yet. Reserve a quote above and it will appear here.
        </p>
      ) : (
        <div className={styles.list}>
          {list.map((reservation) => (
            <TicketCard
              key={reservation.id}
              reservation={reservation}
              onCancel={() => cancel.mutate(reservation.id)}
              cancelling={cancel.isPending && cancel.variables === reservation.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
