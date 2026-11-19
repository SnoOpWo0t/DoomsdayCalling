import { useState } from 'react';
import { posterUrl } from '../../lib/format';
import styles from './Poster.module.css';

export interface PosterProps {
  title: string;
  posterPath: string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const IMAGE_WIDTH = { xs: 'w92', sm: 'w185', md: 'w342' } as const;

/**
 * Movie poster with a typographic fallback, so the layout looks intentional
 * whether or not TMDb is configured.
 */
export function Poster({ title, posterPath, size = 'sm', className }: PosterProps) {
  const [failed, setFailed] = useState(false);
  const src = posterUrl(posterPath, IMAGE_WIDTH[size]);
  const classes = [styles.poster, styles[size], className].filter(Boolean).join(' ');

  if (!src || failed) {
    return (
      <div className={`${classes} ${styles.fallback}`} aria-hidden>
        <span className={styles.initials}>{initialsOf(title)}</span>
      </div>
    );
  }

  return (
    <img
      className={classes}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

/** "Avengers: Infinity War" -> "IW", "Iron Man" -> "IM". Skips franchise prefixes before a colon. */
function initialsOf(title: string): string {
  const main = title.includes(':') ? title.slice(title.indexOf(':') + 1) : title;
  const words = main
    .trim()
    .split(/\s+/)
    .filter((word) => !['the', 'a', 'an', 'of'].includes(word.toLowerCase()));
  return (words.length > 0 ? words : [main])
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}
