import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  BookingQuote,
  Cinema,
  CinemaInput,
  Movie,
  MovieInput,
  MoviePatch,
  RewatchPlan,
  TmdbMovie,
  TmdbMovieDetails,
} from './types';

/** Central query keys so invalidation is consistent across the app. */
export const queryKeys = {
  movies: ['movies'] as const,
  rewatchPlan: (movieId: number) => ['movies', movieId, 'rewatch-order'] as const,
  cinemas: ['cinemas'] as const,
  bookingQuote: (cinemaId: number, groupSize: number) =>
    ['cinemas', cinemaId, 'booking', groupSize] as const,
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

      queryClient.setQueryData<Movie[]>(queryKeys.movies, (movies) =>
        movies?.map((movie) => (movie.id === id ? { ...movie, watched } : movie)),
      );
      for (const [key, plan] of previousPlans) {
        if (plan) queryClient.setQueryData(key, applyWatched(plan, id, watched));
      }

      return { previousList, previousPlans };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData(queryKeys.movies, context.previousList);
      for (const [key, plan] of context.previousPlans) queryClient.setQueryData(key, plan);
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
    unwatchedRuntimeMinutes: unwatched.reduce((sum, movie) => sum + movie.runtimeMinutes, 0),
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
