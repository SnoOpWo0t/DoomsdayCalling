import { describe, expect, it } from 'vitest';
import { findCycle, rewatchOrder, type PrerequisiteGraph } from './dependency-graph.js';

// Sample data from the assessment brief.
const IRON_MAN = 1;
const FIRST_AVENGER = 2;
const AVENGERS = 3;
const CIVIL_WAR = 4;
const RAGNAROK = 5;
const INFINITY_WAR = 6;
const ENDGAME = 7;
const DOOMSDAY = 8;

const mcu: PrerequisiteGraph = new Map([
  [IRON_MAN, []],
  [FIRST_AVENGER, []],
  [AVENGERS, [IRON_MAN, FIRST_AVENGER]],
  [CIVIL_WAR, [AVENGERS]],
  [RAGNAROK, []],
  [INFINITY_WAR, [CIVIL_WAR, RAGNAROK]],
  [ENDGAME, [INFINITY_WAR]],
  [DOOMSDAY, [ENDGAME]],
]);

describe('findCycle', () => {
  it('rejects making Endgame a prerequisite of Iron Man (brief example)', () => {
    expect(findCycle(mcu, IRON_MAN, [ENDGAME])).toEqual([
      IRON_MAN,
      ENDGAME,
      INFINITY_WAR,
      CIVIL_WAR,
      AVENGERS,
      IRON_MAN,
    ]);
  });

  it('rejects a movie listing itself as a prerequisite', () => {
    expect(findCycle(mcu, RAGNAROK, [RAGNAROK])).toEqual([RAGNAROK, RAGNAROK]);
  });

  it('rejects a two-movie loop', () => {
    expect(findCycle(mcu, IRON_MAN, [AVENGERS])).toEqual([IRON_MAN, AVENGERS, IRON_MAN]);
  });

  it('allows adding an unrelated prerequisite', () => {
    expect(findCycle(mcu, RAGNAROK, [IRON_MAN, FIRST_AVENGER])).toBeNull();
  });

  it('allows adding a prerequisite that is already reachable (redundant edge)', () => {
    expect(findCycle(mcu, DOOMSDAY, [ENDGAME, IRON_MAN])).toBeNull();
  });

  it('allows clearing all prerequisites', () => {
    expect(findCycle(mcu, ENDGAME, [])).toBeNull();
  });

  it("ignores the movie's current edges because they are being replaced", () => {
    // Avengers currently needs Iron Man. Replacing that with Ragnarok and then
    // asking whether Iron Man may need Avengers must consider the *new* graph.
    const graph: PrerequisiteGraph = new Map([
      [IRON_MAN, []],
      [AVENGERS, [IRON_MAN]],
    ]);
    expect(findCycle(graph, AVENGERS, [RAGNAROK])).toBeNull();
  });

  it('allows a diamond shape (shared prerequisite reached twice)', () => {
    const graph: PrerequisiteGraph = new Map([
      [AVENGERS, [IRON_MAN, FIRST_AVENGER]],
      [IRON_MAN, [RAGNAROK]],
      [FIRST_AVENGER, [RAGNAROK]],
      [RAGNAROK, []],
    ]);
    expect(findCycle(graph, DOOMSDAY, [AVENGERS])).toBeNull();
  });

  it('handles long chains without recursion limits', () => {
    const size = 50_000;
    const graph = new Map<number, number[]>();
    for (let id = 1; id <= size; id += 1) graph.set(id, id > 1 ? [id - 1] : []);
    expect(findCycle(graph, size, [size - 1])).toBeNull();
    expect(findCycle(graph, 1, [size])?.length).toBe(size + 1);
  });
});

/** Every movie reachable from `target` via prerequisite edges (excluding the target). */
function ancestorsOf(graph: PrerequisiteGraph, target: number): Set<number> {
  const seen = new Set<number>();
  const stack = [...(graph.get(target) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(graph.get(id) ?? []));
  }
  return seen;
}

/** Asserts the three properties the brief requires of a rewatch order. */
function expectValidOrder(graph: PrerequisiteGraph, target: number, order: number[]) {
  // Each movie exactly once.
  expect(new Set(order).size).toBe(order.length);
  // Exactly the target's prerequisites (direct and indirect), never the target.
  expect(new Set(order)).toEqual(ancestorsOf(graph, target));
  // Every movie comes after its prerequisites.
  const position = new Map(order.map((id, index) => [id, index]));
  for (const id of order) {
    for (const prerequisite of graph.get(id) ?? []) {
      expect(position.get(prerequisite)!).toBeLessThan(position.get(id)!);
    }
  }
}

describe('rewatchOrder', () => {
  it('returns all 7 other movies in a valid order for Avengers: Doomsday (brief example)', () => {
    const order = rewatchOrder(mcu, DOOMSDAY);
    expect(order).toHaveLength(7);
    expectValidOrder(mcu, DOOMSDAY, order);
    // With ids assigned in release order, the result matches the brief's sample order.
    expect(order).toEqual([
      IRON_MAN,
      FIRST_AVENGER,
      AVENGERS,
      CIVIL_WAR,
      RAGNAROK,
      INFINITY_WAR,
      ENDGAME,
    ]);
  });

  it('returns Iron Man and The First Avenger, then The Avengers, for Civil War (brief example)', () => {
    const order = rewatchOrder(mcu, CIVIL_WAR);
    expect(order).toHaveLength(3);
    expect(order.slice(0, 2).sort()).toEqual([IRON_MAN, FIRST_AVENGER].sort());
    expect(order[2]).toBe(AVENGERS);
  });

  it('returns an empty list for Thor: Ragnarok (brief example)', () => {
    expect(rewatchOrder(mcu, RAGNAROK)).toEqual([]);
  });

  it('returns an empty list for a movie that is not in the graph', () => {
    expect(rewatchOrder(new Map(), 42)).toEqual([]);
  });

  it('lists a shared prerequisite only once (diamond)', () => {
    const graph: PrerequisiteGraph = new Map([
      [4, [2, 3]],
      [2, [1]],
      [3, [1]],
    ]);
    expect(rewatchOrder(graph, 4)).toEqual([1, 2, 3]);
  });

  it('explores siblings in the order given by the comparator', () => {
    const descending = (a: number, b: number) => b - a;
    const order = rewatchOrder(mcu, CIVIL_WAR, descending);
    expect(order).toEqual([FIRST_AVENGER, IRON_MAN, AVENGERS]);
    expectValidOrder(mcu, CIVIL_WAR, order);
  });

  it('throws on corrupt data that contains a cycle instead of looping forever', () => {
    const graph: PrerequisiteGraph = new Map([
      [1, [2]],
      [2, [1]],
    ]);
    expect(() => rewatchOrder(graph, 1)).toThrow(/cycle/);
  });

  it('produces a valid order for a large random acyclic graph', () => {
    // Edges only point from higher to lower ids, so the graph is acyclic by construction.
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const graph = new Map<number, number[]>();
    for (let id = 1; id <= 2000; id += 1) {
      const prerequisites = new Set<number>();
      for (let k = 0; k < 3 && id > 1; k += 1)
        prerequisites.add(1 + Math.floor(random() * (id - 1)));
      graph.set(id, [...prerequisites]);
    }
    expectValidOrder(graph, 2000, rewatchOrder(graph, 2000));
  });

  it('handles long chains without recursion limits', () => {
    const size = 50_000;
    const graph = new Map<number, number[]>();
    for (let id = 1; id <= size; id += 1) graph.set(id, id > 1 ? [id - 1] : []);
    const order = rewatchOrder(graph, size);
    expect(order).toHaveLength(size - 1);
    expect(order[0]).toBe(1);
  });
});
