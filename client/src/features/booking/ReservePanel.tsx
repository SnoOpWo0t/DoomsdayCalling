import { Ticket } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { useCreateReservation } from '../../api/queries';
import type { BookingQuote, Reservation } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import styles from './ReservePanel.module.css';
import { TicketCard } from './TicketCard';

/** Step 3: reserve the quoted bundles under a name, then show the ticket. */
export function ReservePanel({ quote }: { quote: BookingQuote }) {
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string>();
  const [reserved, setReserved] = useState<Reservation | null>(null);
  const createReservation = useCreateReservation();

  // A new quote means a new reservation.
  const quoteKey = `${quote.cinema.id}:${quote.groupSize}`;
  const [lastKey, setLastKey] = useState(quoteKey);
  if (quoteKey !== lastKey) {
    setLastKey(quoteKey);
    setReserved(null);
    createReservation.reset();
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setNameError('Add a name for the reservation, e.g. your group or your own name.');
      return;
    }
    setNameError(undefined);
    try {
      setReserved(
        await createReservation.mutateAsync({
          cinemaId: quote.cinema.id,
          groupSize: quote.groupSize,
          name: name.trim(),
        }),
      );
      setName('');
    } catch {
      // Shown below from the mutation state.
    }
  };

  if (reserved) {
    return (
      <div className={styles.done} role="status">
        <p className={styles.doneTitle}>Reserved. See you on opening night.</p>
        <TicketCard reservation={reserved} fresh />
        <p className={styles.hint}>It is saved under My reservations below.</p>
      </div>
    );
  }

  return (
    <form className={styles.panel} onSubmit={handleSubmit} noValidate>
      <h3 className={styles.title}>3. Reserve these seats</h3>
      <div className={styles.row}>
        <TextField
          label="Reservation name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={nameError}
          placeholder="e.g. Avengers fan club"
          maxLength={100}
          fieldClassName={styles.field}
        />
        <Button type="submit" variant="primary" icon={Ticket} loading={createReservation.isPending}>
          Reserve {quote.totalBundles} {quote.totalBundles === 1 ? 'bundle' : 'bundles'}
        </Button>
      </div>
      {createReservation.error && (
        <Alert>
          {createReservation.error instanceof ApiError
            ? createReservation.error.message
            : 'Could not reserve. Please try again.'}
        </Alert>
      )}
    </form>
  );
}
