// A decoded candidate. Kept minimal so this module stays independent of the
// matcher — any decoder returning objects with a `word` works.
export type Suggestion = {
  word: string;
};

export type SwipeWord = {
  start: number;
  end: number;
  raw: string;
  matches: Suggestion[];
  chosenIndex: number;
};

export type SwipeFieldOptions = {
  // Decode a raw letter run into ranked candidate words. `holds` (per-character
  // dwell, ms) is supplied for on-screen swipes and feeds the timing signal.
  decode: (raw: string, holds?: number[]) => Suggestion[];
  // Whether the raw run is itself a real word (then we keep it as typed).
  isWord: (raw: string) => boolean;
  // Called whenever the last committed word changes (for the suggestion bar).
  onWordChange?: (word: SwipeWord | undefined) => void;
  pauseMs?: number;
};

export type SwipeFieldController = {
  destroy: () => void;
  choose: (index: number) => void;
};

type Field = HTMLInputElement | HTMLTextAreaElement;

const isLetter = (char: string): boolean => char >= 'a' && char <= 'z';

// Attach swipe-decoding to any text field: typed letter runs are decoded to the
// best word on a separator or a pause, while real words are left untouched.
export const attachSwipeField = (field: Field, options: SwipeFieldOptions): SwipeFieldController => {
  const pauseMs = options.pauseMs ?? 700;
  let lastWord: SwipeWord | undefined;
  let pauseTimer: number | undefined;
  let suppress = false; // ignore our own programmatic edits

  const emit = () => options.onWordChange?.(lastWord);

  const runEndingAt = (value: string, caret: number): { start: number; raw: string } => {
    let start = caret;
    while (start > 0 && isLetter(value[start - 1].toLowerCase())) start -= 1;
    return { start, raw: value.slice(start, caret) };
  };

  const buildMatches = (
    raw: string,
    holds: number[] | undefined,
  ): { matches: Suggestion[]; chosenIndex: number } => {
    const lower = raw.toLowerCase();
    const decoded = options.decode(lower, holds).filter((match) => match.word !== lower);
    const rawMatch: Suggestion = { word: lower };
    // Keep a genuinely typed word; otherwise the swipe match wins and the raw
    // run stays available as a fallback.
    if (options.isWord(lower)) return { matches: [rawMatch, ...decoded], chosenIndex: 0 };
    return { matches: [...decoded, rawMatch], chosenIndex: 0 };
  };

  const replaceRange = (start: number, end: number, text: string) => {
    suppress = true;
    field.setRangeText(text, start, end, 'preserve');
    suppress = false;
  };

  const commitRun = (
    start: number,
    end: number,
    caret: number,
    trailingSpace: boolean,
    holds?: number[],
  ) => {
    const raw = field.value.slice(start, end);
    if (raw.length === 0) return;

    const { matches, chosenIndex } = buildMatches(raw, holds);
    const chosen = matches[chosenIndex]?.word ?? raw;
    const replacement = chosen + (trailingSpace ? ' ' : '');

    if (replacement !== raw) {
      replaceRange(start, end, replacement);
      const shift = replacement.length - raw.length;
      const newCaret = caret >= end ? caret + shift : caret;
      field.setSelectionRange(newCaret, newCaret);
    }

    lastWord = { start, end: start + chosen.length, raw, matches, chosenIndex };
    emit();
  };

  const handleInput = () => {
    if (suppress) return;
    const value = field.value;
    const caret = field.selectionStart ?? value.length;
    const previousChar = caret > 0 ? value[caret - 1] : '';

    // A separator was just typed: commit the word that ended before it.
    if (previousChar !== '' && !isLetter(previousChar.toLowerCase())) {
      window.clearTimeout(pauseTimer);
      const { start, raw } = runEndingAt(value, caret - 1);
      if (raw.length > 0) commitRun(start, caret - 1, caret, false);
      return;
    }

    const { start, raw } = runEndingAt(value, caret);
    if (raw.length === 0) return;

    // Starting a fresh word clears the previous word's suggestions.
    if (lastWord && start >= lastWord.end) {
      lastWord = undefined;
      emit();
    }

    // Auto-commit the word at the caret after a pause — wherever the caret is,
    // so editing a word mid-text still decodes and shows suggestions. A trailing
    // space is only added when appending at the very end.
    window.clearTimeout(pauseTimer);
    pauseTimer = window.setTimeout(() => {
      const caretNow = field.selectionStart ?? field.value.length;
      const run = runEndingAt(field.value, caretNow);
      if (run.raw.length === 0) return;
      commitRun(run.start, caretNow, caretNow, caretNow === field.value.length);
    }, pauseMs);
  };

  const choose = (index: number) => {
    if (!lastWord) return;
    const word = lastWord.matches[index]?.word;
    if (word === undefined) return;

    replaceRange(lastWord.start, lastWord.end, word);
    lastWord = { ...lastWord, end: lastWord.start + word.length, chosenIndex: index };
    emit();
    field.focus();
    field.setSelectionRange(lastWord.end, lastWord.end);
  };

  field.addEventListener('input', handleInput);

  return {
    destroy: () => {
      field.removeEventListener('input', handleInput);
      window.clearTimeout(pauseTimer);
    },
    choose,
  };
};
