import { Armchair, Ban } from 'lucide-react';
import type { BookingQuote } from '../../api/types';
import { pluralize } from '../../lib/format';
import styles from './QuoteResult.module.css';

/** Above this many bundles the strip groups by size instead of drawing each bundle. */
const MAX_DRAWN_BUNDLES = 40;

/** Shades for up to 10 bundle sizes, from the accent outwards. */
const SHADES = ['0.79', '0.66', '0.88', '0.56', '0.72', '0.94', '0.6', '0.84', '0.7', '0.9'];

export function QuoteResult({ quote }: { quote: BookingQuote }) {
  if (!quote.possible || quote.totalBundles === null) {
    return (
      <div className={styles.impossible} role="status">
        <span className={styles.impossibleIcon}>
          <Ban size={22} aria-hidden />
        </span>
        <div>
          <p className={styles.impossibleTitle}>Not possible</p>
          <p className={styles.impossibleText}>
            No mix of {formatSizes(quote.cinema.bundleSizes)}-seat bundles at {quote.cinema.name}{' '}
            adds up to exactly {pluralize(quote.groupSize, 'seat')}. Try a different group size or
            cinema.
          </p>
        </div>
      </div>
    );
  }

  const shadeOf = (size: number) =>
    SHADES[quote.cinema.bundleSizes.indexOf(size) % SHADES.length] ?? SHADES[0];
  const segments =
    quote.totalBundles <= MAX_DRAWN_BUNDLES
      ? quote.bundles.flatMap((bundle) =>
          Array.from({ length: bundle.count }, () => ({ size: bundle.size, seats: bundle.size })),
        )
      : quote.bundles.map((bundle) => ({ size: bundle.size, seats: bundle.size * bundle.count }));

  return (
    <div className={styles.result} role="status" aria-live="polite">
      <div className={styles.headline}>
        <p className={styles.total}>
          <span className={styles.totalNumber}>{quote.totalBundles}</span>
          <span className={styles.totalLabel}>
            {quote.totalBundles === 1 ? 'bundle' : 'bundles'}
          </span>
        </p>
        <p className={styles.caption}>
          <Armchair size={16} aria-hidden />
          {pluralize(quote.groupSize, 'seat')}, no empty seats
        </p>
      </div>

      <div className={styles.strip} aria-hidden>
        {segments.map((segment, index) => (
          <span
            key={index}
            className={styles.segment}
            style={{
              flexGrow: segment.seats,
              background: `oklch(${shadeOf(segment.size)} 0.12 163)`,
            }}
            title={`${segment.seats} seats`}
          />
        ))}
      </div>

      <table className={styles.breakdown}>
        <caption className="sr-only">Bundles to buy</caption>
        <thead>
          <tr>
            <th scope="col">Bundle</th>
            <th scope="col">Quantity</th>
            <th scope="col">Seats</th>
          </tr>
        </thead>
        <tbody>
          {quote.bundles.map((bundle) => (
            <tr key={bundle.size}>
              <th scope="row">
                <span className={styles.bundleName}>
                  <span
                    className={styles.swatch}
                    style={{ background: `oklch(${shadeOf(bundle.size)} 0.12 163)` }}
                    aria-hidden
                  />
                  {bundle.size}-seat bundle
                </span>
              </th>
              <td>&times; {bundle.count}</td>
              <td>{(bundle.size * bundle.count).toLocaleString('en-US')}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td>{quote.totalBundles}</td>
            <td>{quote.groupSize.toLocaleString('en-US')}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** [4, 6] -> "4- and 6", [2, 5, 9] -> "2-, 5- and 9" (read with the trailing "-seat"). */
function formatSizes(sizes: number[]): string {
  if (sizes.length === 1) return String(sizes[0]);
  return `${sizes.slice(0, -1).join('-, ')}- and ${sizes[sizes.length - 1]}`;
}
