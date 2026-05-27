import { frequencyScore } from './frequency';
import { cornerScore, detectCorners, pathPassesNearKey, pathScore } from './keyboard';

export type Match = {
  word: string;
  score: number;
};

// Tunable so the UI can expose them as sliders and let you feel each signal's
// effect. `timing` only bites when per-key hold durations are supplied.
export type Weights = {
  path: number;
  corner: number;
  timing: number;
  anchor: number;
  frequency: number;
  missPenalty: number;
};

export const defaultWeights: Weights = {
  path: 3,
  corner: 3,
  timing: 2,
  anchor: 1.5,
  frequency: 0.5,
  missPenalty: 0.5,
};

export type MatchOptions = {
  weights: Weights;
  allowMissedLetter: boolean;
  // Hold duration (ms) per character of the swipe, same length as the swipe.
  // Present only when the swipe was captured live; undefined for typed text.
  holds?: number[];
};

// True when every letter of `word` appears in `swipe` in the same relative
// order (any characters allowed in between) — the core swipe heuristic.
const isSubsequence = (word: string, swipe: string): boolean => {
  let swipeIndex = 0;
  for (const letter of word) {
    swipeIndex = swipe.indexOf(letter, swipeIndex);
    if (swipeIndex === -1) return false;
    swipeIndex += 1;
  }
  return true;
};

// Swipe indices each letter of `word` maps to (greedy), or undefined if `word`
// is not a subsequence of `swipe`.
const subsequencePositions = (word: string, swipe: string): number[] | undefined => {
  const positions: number[] = [];
  let swipeIndex = 0;
  for (const letter of word) {
    const found = swipe.indexOf(letter, swipeIndex);
    if (found === -1) return undefined;
    positions.push(found);
    swipeIndex = found + 1;
  }
  return positions;
};

// How many of `word`'s letters must be dropped for it to become a subsequence
// of `swipe`, or undefined if it cannot fit within `maxMissed`. A dropped letter
// is only forgiven when the swipe path actually glided past that key — so we
// won't invent a letter (the "o" in forwastes) the finger never went near.
const missedLetters = (word: string, swipe: string, maxMissed: number): number | undefined => {
  if (isSubsequence(word, swipe)) return 0;
  if (maxMissed < 1) return undefined;

  for (let i = 0; i < word.length; i++) {
    const reduced = word.slice(0, i) + word.slice(i + 1);
    const positions = subsequencePositions(reduced, swipe);
    if (!positions) continue;

    // Where the dropped letter would sit: between its neighbours' matches.
    const from = i > 0 ? positions[i - 1] : 0;
    const to = i < positions.length ? positions[i] : swipe.length - 1;
    if (pathPassesNearKey(swipe, word[i], from, to)) return 1;
  }
  return undefined;
};

// Greedy alignment of `word` onto `swipe`: the swipe index each word letter maps
// to, skipping word letters that cannot be found (the fuzzy-missed ones).
const alignPositions = (word: string, swipe: string): number[] => {
  const positions: number[] = [];
  let swipeIndex = 0;
  for (const letter of word) {
    const found = swipe.indexOf(letter, swipeIndex);
    if (found === -1) continue;
    positions.push(found);
    swipeIndex = found + 1;
  }
  return positions;
};

// Fraction of the total dwell time that lands on the word's letters. Keys you
// lingered on are likely intended; a word whose letters sit on those keys (and
// not on the quickly-glided filler) scores near 1.
const timingScore = (word: string, swipe: string, holds: number[] | undefined): number => {
  if (!holds || holds.length === 0) return 0;

  const totalDwell = holds.reduce((sum, hold) => sum + hold, 0);
  if (totalDwell === 0) return 0;

  let matchedDwell = 0;
  for (const position of alignPositions(word, swipe)) {
    matchedDwell += holds[position] ?? 0;
  }
  return matchedDwell / totalDwell;
};

const anchorScore = (word: string, swipe: string): number => {
  const startsRight = word[0] === swipe[0];
  const endsRight = word[word.length - 1] === swipe[swipe.length - 1];
  return (startsRight ? 0.5 : 0) + (endsRight ? 0.5 : 0);
};

const scoreMatch = (
  word: string,
  swipe: string,
  corners: string[],
  missed: number,
  options: MatchOptions,
): number => {
  const { weights, holds } = options;
  return (
    pathScore(word, swipe) * weights.path +
    cornerScore(word, corners) * weights.corner +
    timingScore(word, swipe, holds) * weights.timing +
    anchorScore(word, swipe) * weights.anchor +
    frequencyScore(word) * weights.frequency -
    missed * weights.missPenalty
  );
};

export const matchSwipe = (
  swipe: string,
  dictionary: string[],
  options: MatchOptions,
  limit = 5,
): Match[] => {
  const cleanSwipe = swipe.toLowerCase().trim();
  if (cleanSwipe.length === 0) return [];

  const maxMissed = options.allowMissedLetter ? 1 : 0;
  const corners = detectCorners(cleanSwipe);

  // Cheap pre-filter: a letter absent from the swipe must be a skipped key, so a
  // word with more absent letters than maxMissed can never fit.
  const swipeChars = new Set(cleanSwipe);

  const matches: Match[] = [];
  for (const word of dictionary) {
    let absentLetters = 0;
    for (const letter of word) {
      if (!swipeChars.has(letter)) absentLetters += 1;
      if (absentLetters > maxMissed) break;
    }
    if (absentLetters > maxMissed) continue;

    const missed = missedLetters(word, cleanSwipe, maxMissed);
    if (missed === undefined) continue;

    matches.push({ word, score: scoreMatch(word, cleanSwipe, corners, missed, options) });
  }

  return matches.sort((first, second) => second.score - first.score).slice(0, limit);
};

// Async wrapper around the pure matcher. The matching itself is synchronous,
// but exposing it as a promise lets the UI treat it like a remote lookup —
// swap the body for a fetch() once matching moves server-side.
export const matchSwipeAsync = (
  swipe: string,
  dictionary: string[],
  options: MatchOptions,
  limit = 5,
  signal?: AbortSignal,
): Promise<Match[]> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    // Small artificial delay so the loading state is observable and races are
    // realistic; drop this when wiring up a real backend.
    const timer = setTimeout(() => resolve(matchSwipe(swipe, dictionary, options, limit)), 150);

    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
