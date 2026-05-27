import { useRef, useState, type KeyboardEvent } from 'react';
import { matchSwipe, type Match, type MatchOptions } from './matcher';
import { dictionary } from './dictionary';

export type TypedWord = {
  token: string;
  matches: Match[];
  chosenIndex: number;
};

type ActiveBuffer = {
  keys: string[];
  holds: number[];
};

const emptyBuffer: ActiveBuffer = { keys: [], holds: [] };

const isLetter = (key: string): boolean => key.length === 1 && key >= 'a' && key <= 'z';

export const useSwipeTyper = (options: MatchOptions, pauseMs: number) => {
  const [committed, setCommitted] = useState<TypedWord[]>([]);
  const [active, setActive] = useState<ActiveBuffer>(emptyBuffer);

  // Refs mirror the latest values so the pause timer and event handlers always
  // read current state without re-subscribing.
  const activeRef = useRef<ActiveBuffer>(emptyBuffer);
  const pressedKeys = useRef(new Map<string, { index: number; pressedAt: number }>());
  const pauseTimer = useRef<number | undefined>(undefined);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const pauseRef = useRef(pauseMs);
  pauseRef.current = pauseMs;

  const setBuffer = (next: ActiveBuffer) => {
    activeRef.current = next;
    setActive(next);
  };

  // Finalise the active swipe into a word, picking `chosenIndex` of its matches.
  const commitActive = (chosenIndex = 0) => {
    const token = activeRef.current.keys.join('');
    if (token.length === 0) return;

    const matches = matchSwipe(
      token,
      dictionary,
      { ...optionsRef.current, holds: activeRef.current.holds },
      5,
    );
    pressedKeys.current.clear();
    setBuffer(emptyBuffer);
    const safeIndex = Math.min(chosenIndex, Math.max(0, matches.length - 1));
    setCommitted((previous) => [...previous, { token, matches, chosenIndex: safeIndex }]);
  };

  // A pause in typing ends the current word — just like lifting your finger.
  const schedulePause = () => {
    window.clearTimeout(pauseTimer.current);
    pauseTimer.current = window.setTimeout(() => commitActive(0), pauseRef.current);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();

    if (key === 'backspace') {
      event.preventDefault();
      window.clearTimeout(pauseTimer.current);
      if (activeRef.current.keys.length > 0) {
        setBuffer({
          keys: activeRef.current.keys.slice(0, -1),
          holds: activeRef.current.holds.slice(0, -1),
        });
      } else {
        setCommitted((previous) => previous.slice(0, -1));
      }
      return;
    }

    if (!isLetter(key) || event.repeat || pressedKeys.current.has(key)) return;

    pressedKeys.current.set(key, {
      index: activeRef.current.keys.length,
      pressedAt: performance.now(),
    });
    setBuffer({
      keys: [...activeRef.current.keys, key],
      holds: [...activeRef.current.holds, 0],
    });
    schedulePause();
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    const pressed = pressedKeys.current.get(key);
    if (!pressed) return;

    pressedKeys.current.delete(key);
    const hold = performance.now() - pressed.pressedAt;
    setBuffer({
      ...activeRef.current,
      holds: activeRef.current.holds.map((value, index) =>
        index === pressed.index ? hold : value,
      ),
    });
  };

  const chooseCommitted = (wordIndex: number, matchIndex: number) =>
    setCommitted((previous) =>
      previous.map((word, index) =>
        index === wordIndex ? { ...word, chosenIndex: matchIndex } : word,
      ),
    );

  // Picking a suggestion for the in-progress word commits it immediately.
  const chooseActive = (matchIndex: number) => {
    window.clearTimeout(pauseTimer.current);
    commitActive(matchIndex);
  };

  const clearAll = () => {
    window.clearTimeout(pauseTimer.current);
    pressedKeys.current.clear();
    setBuffer(emptyBuffer);
    setCommitted([]);
  };

  return {
    committed,
    activeText: active.keys.join(''),
    activeHolds: active.holds,
    handleKeyDown,
    handleKeyUp,
    chooseCommitted,
    chooseActive,
    clearAll,
  };
};
