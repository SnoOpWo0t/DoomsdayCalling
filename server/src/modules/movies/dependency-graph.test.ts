import { describe, expect, it } from 'vitest';
import { findCycle, type PrerequisiteGraph } from './dependency-graph.js';

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
