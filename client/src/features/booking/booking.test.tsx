import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BookingQuote } from '../../api/types';
import { parseBundleSizes, parseGroupSize } from './bundle-sizes';
import { QuoteResult } from './QuoteResult';

describe('parseBundleSizes', () => {
  it.each([
    ['2, 5', [2, 5]],
    ['20 6 9', [6, 9, 20]],
    ['5,5,2', [2, 5]],
    ['  1;3 , 4 ', [1, 3, 4]],
  ])('parses %j', (text, sizes) => {
    expect(parseBundleSizes(text)).toEqual({ sizes });
  });

  it.each([
    ['', /at least one/],
    ['2, x', /not a whole number/],
    ['2.5', /not a whole number/],
    ['0', /out of range/],
    ['501', /out of range/],
    ['1 2 3 4 5 6 7 8 9 10 11', /at most 10/],
  ])('rejects %j', (text, message) => {
    expect(parseBundleSizes(text).error).toMatch(message);
  });

  it('counts different sizes, so duplicates do not hit the limit', () => {
    expect(parseBundleSizes('1 2 3 4 5 6 7 8 9 10 10').error).toBeUndefined();
  });
});

describe('parseGroupSize', () => {
  it.each([
    ['6', 6],
    ['10000', 10000],
    [' 44 ', 44],
  ])('accepts %j', (text, value) => {
    expect(parseGroupSize(text)).toBe(value);
  });

  it.each(['0', '10001', '4.5', '-3', 'abc', ''])('rejects %j', (text) => {
    expect(parseGroupSize(text)).toBeUndefined();
  });
});

describe('QuoteResult', () => {
  const cinema = { id: 3, name: 'Meridian Grand', bundleSizes: [6, 9, 20] };

  it('shows the total and a row per bundle size (brief example: 44 seats)', () => {
    const quote: BookingQuote = {
      cinema,
      groupSize: 44,
      possible: true,
      totalBundles: 4,
      bundles: [
        { size: 20, count: 1 },
        { size: 9, count: 2 },
        { size: 6, count: 1 },
      ],
    };
    render(<QuoteResult quote={quote} />);

    expect(screen.getByRole('status')).toHaveTextContent('4bundles');
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows.map((row) => row.textContent)).toEqual([
      'BundleQuantitySeats',
      '20-seat bundle× 120',
      '9-seat bundle× 218',
      '6-seat bundle× 16',
      'Total444',
    ]);
  });

  it('explains when no exact combination exists (brief example: 4, 6 and 7)', () => {
    render(
      <QuoteResult
        quote={{
          cinema: { id: 4, name: 'Velvet Row Cinema', bundleSizes: [4, 6] },
          groupSize: 7,
          possible: false,
          totalBundles: null,
          bundles: [],
        }}
      />,
    );
    expect(screen.getByText('Not possible')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'No mix of 4- and 6-seat bundles at Velvet Row Cinema adds up to exactly 7 seats.',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
