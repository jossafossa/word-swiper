import { useEffect, useState } from 'react';
import { matchSwipeAsync, type Match, type MatchOptions } from './matcher';
import { dictionary } from './dictionary';

type SwipeMatchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; matches: Match[] };

export const useSwipeMatch = (swipe: string, options: MatchOptions): SwipeMatchState => {
  const [state, setState] = useState<SwipeMatchState>({ status: 'idle' });

  // Re-run whenever the swipe or any tuning option changes.
  const optionsKey = JSON.stringify(options);

  useEffect(() => {
    if (swipe.trim().length === 0) {
      setState({ status: 'idle' });
      return;
    }

    const controller = new AbortController();
    setState({ status: 'loading' });

    matchSwipeAsync(swipe, dictionary, options, 5, controller.signal)
      .then((matches) => setState({ status: 'success', matches }))
      .catch((error) => {
        // Aborted requests are superseded by a newer keystroke — ignore them.
        if (error instanceof DOMException && error.name === 'AbortError') return;
        throw error;
      });

    return () => controller.abort();
    // optionsKey stands in for the deep-compared options object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swipe, optionsKey]);

  return state;
};
