import { dictionary } from './dictionary';

// The dictionary is already in descending frequency order, so a word's index is
// its frequency rank (0 = most common).
const rankByWord = new Map<string, number>(dictionary.map((word, index) => [word, index]));

const rankedCount = rankByWord.size;

// 1 for the single most common word, approaching 0 for rarer words, and 0 for
// words outside the list entirely.
export const frequencyScore = (word: string): number => {
  const rank = rankByWord.get(word);
  if (rank === undefined) return 0;
  return 1 - rank / rankedCount;
};

// Whether the exact word exists in the dictionary — used to keep genuinely
// typed words instead of "correcting" them to a swipe match.
export const isKnownWord = (word: string): boolean => rankByWord.has(word);
