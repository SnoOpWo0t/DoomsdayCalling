import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('exposes progress to assistive technology', () => {
    render(<ProgressBar value={4} max={7} label="4 of 7 watched" />);
    const bar = screen.getByRole('progressbar', { name: '4 of 7 watched' });
    expect(bar).toHaveAttribute('aria-valuenow', '4');
    expect(bar).toHaveAttribute('aria-valuemax', '7');
  });

  it('fills proportionally and handles an empty plan', () => {
    const { rerender } = render(<ProgressBar value={4} max={8} label="half" />);
    expect(screen.getByRole('progressbar').firstElementChild).toHaveStyle({ width: '50%' });

    rerender(<ProgressBar value={0} max={0} label="nothing to watch" />);
    expect(screen.getByRole('progressbar').firstElementChild).toHaveStyle({ width: '0%' });
  });
});
