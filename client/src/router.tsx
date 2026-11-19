import { createBrowserRouter } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { RouteError } from './components/layout/RouteError';
import { BookingPage } from './features/booking/BookingPage';
import { MoviesPage } from './features/movies/MoviesPage';
import { RewatchPage } from './features/rewatch/RewatchPage';
import { TitlePage } from './features/title/TitlePage';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <MoviesPage /> },
      { path: 'titles/:id', element: <TitlePage /> },
      { path: 'plan', element: <RewatchPage /> },
      { path: 'booking', element: <BookingPage /> },
      { path: '*', element: <RouteError /> },
    ],
  },
]);
