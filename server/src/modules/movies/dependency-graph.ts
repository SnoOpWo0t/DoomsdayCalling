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

/**
 * Returns every movie that must be watched before `target` (its
 * prerequisites, their prerequisites, and so on), each exactly once, ordered
 * so that every movie comes after all of its own prerequisites. The target
 * itself is not included.
 *
 * Algorithm: depth-first search with post-order output. A movie is appended
 * only after all of its prerequisites have been appended, which is exactly
 * the "comes after its prerequisites" guarantee (a topological order of the
 * target's ancestors). A `done` set ensures shared prerequisites, such as a
 * movie reachable through two paths, are emitted once.
 *
 * The DFS uses an explicit stack instead of recursion, so very deep chains
 * cannot overflow the call stack.
 *
 * `compare` decides the order in which sibling prerequisites are explored.
 * Any order is valid; sorting by release date gives the most natural plan.
 *
 * Complexity: O(V + E) for the traversal, plus sorting each adjacency list.
 */
export function rewatchOrder(
  graph: PrerequisiteGraph,
  target: MovieId,
  compare: (a: MovieId, b: MovieId) => number = (a, b) => a - b,
): MovieId[] {
  const prerequisitesOf = (id: MovieId) => [...(graph.get(id) ?? [])].sort(compare);

  const order: MovieId[] = [];
  const done = new Set<MovieId>();
  const visiting = new Set<MovieId>([target]);
  const stack: Array<{ id: MovieId; prerequisites: MovieId[]; next: number }> = [
    { id: target, prerequisites: prerequisitesOf(target), next: 0 },
  ];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1]!;

    if (frame.next < frame.prerequisites.length) {
      const prerequisite = frame.prerequisites[frame.next]!;
      frame.next += 1;

      if (done.has(prerequisite)) continue;
      if (visiting.has(prerequisite)) {
        // Writes are guarded by findCycle, so this means the stored data is corrupt.
        throw new Error(`Prerequisite cycle detected at movie ${prerequisite}`);
      }

      visiting.add(prerequisite);
      stack.push({ id: prerequisite, prerequisites: prerequisitesOf(prerequisite), next: 0 });
      continue;
    }

    // Every prerequisite of this movie is already in `order`: it can go next.
    stack.pop();
    visiting.delete(frame.id);
    done.add(frame.id);
    if (frame.id !== target) order.push(frame.id);
  }

  return order;
}
