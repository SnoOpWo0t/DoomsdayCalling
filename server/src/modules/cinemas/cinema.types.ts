import type { BundlePurchase } from './booking-quote.js';

export interface Cinema {
  id: number;
  name: string;
  /** Seats per bundle, ascending. */
  bundleSizes: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingQuoteResponse {
  cinema: Pick<Cinema, 'id' | 'name' | 'bundleSizes'>;
  groupSize: number;
  /** False when no combination of bundles adds up to exactly `groupSize`. */
  possible: boolean;
  totalBundles: number | null;
  bundles: BundlePurchase[];
}
