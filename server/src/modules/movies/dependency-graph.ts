/**
 * Pure graph logic for movie prerequisites. No database, no framework: this
 * file is the hand-written core of Feature 1 and is unit-tested in isolation.
 *
 * The graph is stored as an adjacency list where an edge `movie -> prereq`
 * means "watch `prereq` before `movie`".
 */
export type MovieId = number;
export type PrerequisiteGraph = ReadonlyMap<MovieId, readonly MovieId[]>;

/**
 * Checks whether giving `movieId` the prerequisites `proposed` would make the
 * movie depend on itself, directly or through other movies.
 *
 * Idea: after the change, a cycle through `movieId` exists exactly when
 * `movieId` can be reached by following prerequisite edges from one of the
 * proposed prerequisites. So we run an iterative depth-first search starting
 * from those prerequisites and stop as soon as we arrive back at `movieId`.
 *
 * The movie's current edges are ignored and replaced by `proposed`, which
 * mirrors how an update replaces the whole prerequisite list.
 *
 * Returns the cycle as a list of ids that starts and ends with `movieId`
 * (e.g. [ironMan, endgame, infinityWar, ..., ironMan]), or `null` if the
 * change is safe.
 *
 * Complexity: O(V + E). Each movie is pushed onto the stack at most once.
 */
export function findCycle(
  graph: PrerequisiteGraph,
  movieId: MovieId,
  proposed: readonly MovieId[],
): MovieId[] | null {
  // `parent` records how the search reached each movie so we can rebuild
  // the path once the cycle is found. Seeding it also marks nodes as visited.
  const parent = new Map<MovieId, MovieId>();
  const stack: MovieId[] = [];

  for (const prerequisite of proposed) {
    if (prerequisite === movieId) return [movieId, movieId];
    if (!parent.has(prerequisite)) {
      parent.set(prerequisite, movieId);
      stack.push(prerequisite);
    }
  }

  while (stack.length > 0) {
    const current = stack.pop()!;
    // `movieId`'s own (old) edges must not be followed: they are being replaced.
    const next = current === movieId ? [] : (graph.get(current) ?? []);

    for (const prerequisite of next) {
      if (prerequisite === movieId) {
        return buildCyclePath(parent, movieId, current);
      }
      if (!parent.has(prerequisite)) {
        parent.set(prerequisite, current);
        stack.push(prerequisite);
      }
    }
  }

  return null;
}

/** Walks the parent links back from `last` to rebuild movieId -> ... -> last -> movieId. */
function buildCyclePath(
  parent: ReadonlyMap<MovieId, MovieId>,
  movieId: MovieId,
  last: MovieId,
): MovieId[] {
  const reversed: MovieId[] = [movieId, last];
  let node = last;
  while (parent.get(node) !== movieId) {
    node = parent.get(node)!;
    reversed.push(node);
  }
  reversed.push(movieId);
  return reversed.reverse();
}
