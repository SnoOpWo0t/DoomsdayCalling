import { Clapperboard, Plus, RefreshCw, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useBookingQuote, useCinemas, useNearbyPossibleSizes } from '../../api/queries';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { StateMessage } from '../../components/ui/StateMessage';
import { LIMITS } from '../../lib/constants';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { parseGroupSize } from './bundle-sizes';
import styles from './BookingPage.module.css';
import { CinemaFormDialog } from './CinemaFormDialog';
import { CinemaPicker } from './CinemaPicker';
import { HowItWorks } from './HowItWorks';
import { MyReservations } from './MyReservations';
import { QuoteResult } from './QuoteResult';
import { ReservePanel } from './ReservePanel';

const PRESETS = [6, 11, 44, 7];

export function BookingPage() {
  const cinemas = useCinemas();
  const [params, setParams] = useSearchParams();
  const [groupText, setGroupText] = useState(params.get('group') ?? '6');
  const [adding, setAdding] = useState(false);

  const all = cinemas.data ?? [];
  const requestedId = Number(params.get('cinema'));
  const cinemaId = all.some((cinema) => cinema.id === requestedId) ? requestedId : all[0]?.id;

  const groupSize = parseGroupSize(useDebouncedValue(groupText, 250));
  const groupError =
    groupText.trim() !== '' && parseGroupSize(groupText) === undefined
      ? `Enter a whole number from ${LIMITS.groupSize.min} to ${LIMITS.groupSize.max.toLocaleString('en-US')}.`
      : undefined;

  const quote = useBookingQuote(cinemaId, groupSize);
  const nearby = useNearbyPossibleSizes(cinemaId, groupSize, quote.data?.possible === false);

  // Keep the URL in sync so a quote can be bookmarked or shared.
  useEffect(() => {
    if (cinemaId === undefined) return;
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('cinema', String(cinemaId));
        if (groupSize !== undefined) next.set('group', String(groupSize));
        return next;
      },
      { replace: true },
    );
  }, [cinemaId, groupSize, setParams]);

  const selectCinema = (id: number) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('cinema', String(id));
        return next;
      },
      { replace: true },
    );

  const header = (
    <PageHeader
      eyebrow="Opening night · Avengers: Doomsday"
      title="Book a watch party"
      description="Going with friends? Work out exactly which seat bundles to buy for your group, then reserve them."
      actions={
        <Button icon={Plus} onClick={() => setAdding(true)}>
          Add cinema
        </Button>
      }
    />
  );

  const dialog = adding && (
    <CinemaFormDialog
      onClose={() => setAdding(false)}
      onCreated={(cinema) => selectCinema(cinema.id)}
    />
  );

  if (cinemas.isPending) {
    return (
      <>
        {header}
        <SkeletonRows rows={4} label="Loading cinemas" />
      </>
    );
  }

  if (cinemas.isError) {
    return (
      <>
        {header}
        <StateMessage
          icon={RefreshCw}
          title="Could not load cinemas"
          tone="danger"
          action={
            <Button icon={RefreshCw} onClick={() => void cinemas.refetch()}>
              Try again
            </Button>
          }
        >
          {cinemas.error.message}
        </StateMessage>
      </>
    );
  }

  if (all.length === 0) {
    return (
      <>
        {header}
        <StateMessage
          icon={Clapperboard}
          title="No cinemas yet"
          action={
            <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>
              Add a cinema
            </Button>
          }
        >
          Add a cinema and the seat bundles it sells for opening night.
        </StateMessage>
        {dialog}
      </>
    );
  }

  return (
    <>
      {header}
      <HowItWorks />

      <div className={styles.layout}>
        <section aria-labelledby="cinema-heading" className={styles.cinemas}>
          <h2 id="cinema-heading" className={styles.sectionTitle}>
            1. Choose a cinema
          </h2>
          <CinemaPicker cinemas={all} selectedId={cinemaId} onSelect={selectCinema} />
        </section>

        <section aria-labelledby="quote-heading" className={styles.quote}>
          <h2 id="quote-heading" className={styles.sectionTitle}>
            2. How many are coming?
          </h2>

          <div className={styles.groupRow}>
            <TextField
              label="Group size"
              inputMode="numeric"
              value={groupText}
              onChange={(event) => setGroupText(event.target.value)}
              error={groupError}
              hint={`${LIMITS.groupSize.min}-${LIMITS.groupSize.max.toLocaleString('en-US')} people`}
              fieldClassName={styles.groupField}
            />
            <div className={styles.presets} role="group" aria-label="Example group sizes">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={styles.preset}
                  aria-pressed={groupText === String(preset)}
                  onClick={() => setGroupText(String(preset))}
                >
                  <Users size={14} aria-hidden />
                  {preset}
                  <span className="sr-only"> people</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.resultArea} aria-busy={quote.isFetching || undefined}>
            {groupSize === undefined ? (
              <p className={styles.placeholder}>
                Enter how many people are coming to see which bundles to buy.
              </p>
            ) : quote.isError ? (
              <StateMessage icon={RefreshCw} title="Could not get a quote" tone="danger">
                {quote.error.message}
              </StateMessage>
            ) : quote.data ? (
              <>
                <QuoteResult
                  quote={quote.data}
                  suggestions={
                    nearby.length > 0 && (
                      <div className={styles.suggestions}>
                        <span>Works at this cinema:</span>
                        {nearby.map((size) => (
                          <button
                            key={size}
                            type="button"
                            className={styles.preset}
                            onClick={() => setGroupText(String(size))}
                          >
                            <Users size={14} aria-hidden />
                            {size}
                            <span className="sr-only"> people</span>
                          </button>
                        ))}
                      </div>
                    )
                  }
                />
                {quote.data.possible && <ReservePanel quote={quote.data} />}
              </>
            ) : (
              <p className={styles.placeholder}>Working out the best bundles...</p>
            )}
          </div>
        </section>
      </div>

      <MyReservations />

      {dialog}
    </>
  );
}
