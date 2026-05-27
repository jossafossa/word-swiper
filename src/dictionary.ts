import wordsText from './words.txt?raw';

// The 50k most frequent English words (Norvig's Google Web Trillion Word Corpus
// counts), in descending frequency order. Limiting to real, common words keeps
// obscure dictionary entries from polluting the matches.
export const dictionary = wordsText
  .split('\n')
  .map((word) => word.trim())
  .filter((word) => word.length > 0);
