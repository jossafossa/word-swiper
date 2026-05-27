import { useEffect, useRef, useState } from 'react';
import { attachSwipeField, type SwipeFieldController, type SwipeWord } from '../core/swipeField';
import { matchSwipe, type MatchOptions } from '../core/matcher';
import { dictionary, isKnownWord } from '../core/dictionary';

export const useSwipeField = (options: MatchOptions) => {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const controllerRef = useRef<SwipeFieldController | undefined>(undefined);
  const [lastWord, setLastWord] = useState<SwipeWord | undefined>(undefined);

  // Keep the latest weights without re-attaching the controller.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!fieldRef.current) return;
    const controller = attachSwipeField(fieldRef.current, {
      decode: (raw, holds) => matchSwipe(raw, dictionary, { ...optionsRef.current, holds }, 5),
      isWord: isKnownWord,
      onWordChange: setLastWord,
    });
    controllerRef.current = controller;
    return () => controller.destroy();
  }, []);

  return {
    fieldRef,
    lastWord,
    choose: (index: number) => controllerRef.current?.choose(index),
  };
};
