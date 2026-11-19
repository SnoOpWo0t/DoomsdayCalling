import { Clapperboard, TriangleAlert } from 'lucide-react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { StateMessage } from '../ui/StateMessage';
import styles from './RouteError.module.css';

/** Fallback for unknown URLs and unexpected render errors. */
export function RouteError() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className={styles.page}>
      <StateMessage
        icon={notFound ? Clapperboard : TriangleAlert}
        title={notFound ? 'Scene missing' : 'Something broke'}
        tone={notFound ? 'neutral' : 'danger'}
        action={
          <Link to="/" className={styles.link}>
            Back to movies
          </Link>
        }
      >
        {notFound
          ? 'There is nothing at this address.'
          : 'An unexpected error stopped this page from loading. Try again in a moment.'}
      </StateMessage>
    </div>
  );
}
