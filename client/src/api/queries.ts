import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { watchTime } from '../lib/format';
import { api } from './client';
import type {
  BookingQuote,
  Cinema,
  CinemaInput,
  Movie,
  MovieInput,
  Reservation,
  ReservationInput,
  MoviePatch,
  RewatchPlan,
  TitleDetails,
  TmdbMovie,
  TmdbMovieDetails,
} from './types';

/** Central query keys so invalidation is consistent across the app. */
export const queryKeys = {
  movies: ['movies'] as const,
  rewatchPlan: (movieId: number) => ['movies', movieId, 'rewatch-order'] as const,
  titleDetails: (movieId: number) => ['movies', movieId, 'details'] as const,
  cinemas: ['cinemas'] as const,
  bookingQuote: (cinemaId: number, groupSize: number) =>
    ['cinemas', cinemaId, 'booking', groupSize] as const,
  reservations: ['reservations'] as const,
  tmdbStatus: ['tmdb', 'status'] as const,
  tmdbSearch: (query: string) => ['tmdb', 'search', query] as const,
};

/* Movies ------------------------------------------------------------------ */

export function useMovies() {
  return useQuery({ queryKey: queryKeys.movies, queryFn: () => api.get<Movie[]>('/movies') });
}

/**
 * Every movie mutation can change rewatch plans (watched state, runtime,
 * prerequisites), and plans are keyed under ['movies', ...], so invalidating
 * the 'movies' prefix refreshes the list and every cached plan together.
 */
function useInvalidateMovies() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.movies });
}

export function useCreateMovie() {
  const invalidate = useInvalidateMovies();
  return useMutation({
    mutationFn: (input: MovieInput) => api.post<Movie>('/movies', input),
    onSuccess: invalidate,
  });
}

export function useUpdateMovie() {
  const invalidate = useInvalidateMovies();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: MoviePatch }) =>
      api.patch<Movie>(`/movies/${id}`, patch),
    onSuccess: invalidate,
  });
}

const isRewatchPlanKey = (key: readonly unknown[]) =>
  key.length === 3 && key[0] === 'movies' && key[2] === 'rewatch-order';
const isDetailsKey = (key: readonly unknown[]) =>
  key.length === 3 && key[0] === 'movies' && key[2] === 'details';

/**
 * Toggles `watched` optimistically so the tick, progress bar and remaining
 * time all respond instantly, in the movie list and in every cached rewatch
 * plan. Everything is rolled back if the request fails, and refetched from
 * the server once it settles.
 */
export function useToggleWatched() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, watched }: { id: number; watched: boolean }) =>
      api.patch<Movie>(`/movies/${id}`, { watched }),
    onMutate: async ({ id, watched }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.movies });

      const previousList = queryClient.getQueryData<Movie[]>(queryKeys.movies);
      const previousPlans = queryClient.getQueriesData<RewatchPlan>({
        predicate: (query) => isRewatchPlanKey(query.queryKey),
      });
      const previousDetails = queryClient.getQueriesData<TitleDetails>({
        predicate: (query) => isDetailsKey(query.queryKey),
      });

      queryClient.setQueryData<Movie[]>(queryKeys.movies, (movies) =>
        movies?.map((movie) => (movie.id === id ? { ...movie, watched } : movie)),
      );
      for (const [key, plan] of previousPlans) {
        if (plan) queryClient.setQueryData(key, applyWatched(plan, id, watched));
      }
      const tick = (movie: Movie) => (movie.id === id ? { ...movie, watched } : movie);
      for (const [key, details] of previousDetails) {
        if (!details) continue;
        queryClient.setQueryData<TitleDetails>(key, {
          ...details,
          movie: tick(details.movie),
          prerequisites: details.prerequisites.map(tick),
          dependents: details.dependents.map(tick),
        });
      }

      return { previousList, previousPlans, previousDetails };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData(queryKeys.movies, context.previousList);
      for (const [key, plan] of context.previousPlans) queryClient.setQueryData(key, plan);
      for (const [key, details] of context.previousDetails) queryClient.setQueryData(key, details);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.movies }),
  });
}

/** Returns `plan` as it will look once movie `id` has the given watched state. */
export function applyWatched(plan: RewatchPlan, id: number, watched: boolean): RewatchPlan {
  const movies = plan.movies.map((movie) => (movie.id === id ? { ...movie, watched } : movie));
  const unwatched = movies.filter((movie) => !movie.watched);
  return {
    ...plan,
    target: plan.target.id === id ? { ...plan.target, watched } : plan.target,
    movies,
    watchedCount: movies.length - unwatched.length,
    unwatchedRuntimeMinutes: unwatched.reduce((sum, movie) => sum + watchTime(movie), 0),
  };
}

export function useDeleteMovie() {
  const invalidate = useInvalidateMovies();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/movies/${id}`),
    onSuccess: invalidate,
  });
}

export function useRewatchPlan(movieId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.rewatchPlan(movieId ?? 0),
    queryFn: () => api.get<RewatchPlan>(`/movies/${movieId}/rewatch-order`),
    enabled: movieId !== undefined,
    placeholderData: keepPreviousData,
  });
}

export function useTitleDetails(movieId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.titleDetails(movieId ?? 0),
    queryFn: () => api.get<TitleDetails>(`/movies/${movieId}/details`),
    enabled: movieId !== undefined,
  });
}

/* Cinemas ----------------------------------------------------------------- */

export function useCinemas() {
  return useQuery({ queryKey: queryKeys.cinemas, queryFn: () => api.get<Cinema[]>('/cinemas') });
}

export function useCreateCinema() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CinemaInput) => api.post<Cinema>('/cinemas', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cinemas }),
  });
}

export function useDeleteCinema() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/cinemas/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cinemas }),
  });
}

export function useBookingQuote(cinemaId: number | undefined, groupSize: number | undefined) {
  return useQuery({
    queryKey: queryKeys.bookingQuote(cinemaId ?? 0, groupSize ?? 0),
    queryFn: () => api.get<BookingQuote>(`/cinemas/${cinemaId}/booking?groupSize=${groupSize}`),
    enabled: cinemaId !== undefined && groupSize !== undefined,
    staleTime: Infinity, // A quote for the same cinema and group never changes.
  });
}

/**
 * Quotes for group sizes near `groupSize` (within `range`), used to suggest
 * sizes that do work when the requested one is not possible. The server does
 * all the maths; results share the normal quote cache.
 */
export function useNearbyPossibleSizes(
  cinemaId: number | undefined,
  groupSize: number | undefined,
  enabled: boolean,
  range = 3,
): number[] {
  const sizes =
    groupSize === undefined
      ? []
      : Array.from({ length: range * 2 + 1 }, (_, index) => groupSize - range + index).filter(
          (size) => size >= 1 && size <= 10_000 && size !== groupSize,
        );
  const results = useQueries({
    queries: sizes.map((size) => ({
      queryKey: queryKeys.bookingQuote(cinemaId ?? 0, size),
      queryFn: () => api.get<BookingQuote>(`/cinemas/${cinemaId}/booking?groupSize=${size}`),
      enabled: enabled && cinemaId !== undefined,
      staleTime: Infinity,
    })),
  });
  return sizes.filter((_, index) => results[index]?.data?.possible);
}

/* Reservations ------------------------------------------------------------ */

export function useReservations() {
  return useQuery({
    queryKey: queryKeys.reservations,
    queryFn: () => api.get<Reservation[]>('/reservations'),
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReservationInput) => api.post<Reservation>('/reservations', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.reservations }),
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/reservations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.reservations }),
  });
}

/* TMDb -------------------------------------------------------------------- */

export function useTmdbStatus() {
  return useQuery({
    queryKey: queryKeys.tmdbStatus,
    queryFn: () => api.get<{ enabled: boolean }>('/tmdb/status'),
    staleTime: Infinity,
  });
}

export function useTmdbSearch(query: string, enabled: boolean) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.tmdbSearch(trimmed),
    queryFn: () => api.get<TmdbMovie[]>(`/tmdb/search?query=${encodeURIComponent(trimmed)}`),
    enabled: enabled && trimmed.length >= 2,
    staleTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function fetchTmdbDetails(tmdbId: number) {
  return api.get<TmdbMovieDetails>(`/tmdb/movies/${tmdbId}`);
}
