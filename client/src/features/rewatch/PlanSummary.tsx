import { Clock, Hourglass } from 'lucide-react';
import type { RewatchPlan } from '../../api/types';
import { Poster } from '../../components/ui/Poster';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { formatRuntime, watchTime } from '../../lib/format';
import styles from './PlanSummary.module.css';

/** Target poster, progress bar and remaining watch time. */
export function PlanSummary({ plan }: { plan: RewatchPlan }) {
  const { target, totalCount, watchedCount, unwatchedRuntimeMinutes } = plan;
  const totalRuntime = plan.movies.reduce((sum, movie) => sum + watchTime(movie), 0);
  const progressLabel = `${watchedCount} of ${totalCount} watched`;

  return (
    <section className={styles.summary} aria-labelledby="plan-target">
      <Poster
        title={target.title}
        posterPath={target.posterPath}
        size="md"
        className={styles.poster}
      />

      <div className={styles.body}>
        <p className={styles.kicker}>Before you see</p>
        <h2 id="plan-target" className={styles.target}>
          {target.title}
        </h2>

        {totalCount > 0 && (
          <div className={styles.progress}>
            <div className={styles.progressHeader}>
              <span className={styles.progressLabel}>{progressLabel}</span>
              <span className={styles.percent}>
                {Math.round((watchedCount / totalCount) * 100)}%
              </span>
            </div>
            <ProgressBar value={watchedCount} max={totalCount} label={progressLabel} />
          </div>
        )}

        {totalCount > 0 && (
          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt>
                <Hourglass size={14} aria-hidden /> Remaining
              </dt>
              <dd className={styles.remaining}>{formatRuntime(unwatchedRuntimeMinutes)}</dd>
            </div>
            <div className={styles.stat}>
              <dt>
                <Clock size={14} aria-hidden /> Whole plan
              </dt>
              <dd>{formatRuntime(totalRuntime)}</dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  );
}
