import frequencyText from './frequency-list.txt?raw';

// 10k English words in descending frequency order → word -> rank (0 = most
// common). Built once at module load.
const rankByWord = new Map<string, number>(
  frequencyText
    .split('\n')
    .map((line) => line.trim())
    .filter((word) => word.length > 0)
    .map((word, index) => [word, index] as const),
);

const rankedCount = rankByWord.size;

// 1 for the single most common word, approaching 0 for rarer words, and 0 for
// words outside the frequency list entirely.
export const frequencyScore = (word: string): number => {
  const rank = rankByWord.get(word);
  if (rank === undefined) return 0;
  return 1 - rank / rankedCount;
};
