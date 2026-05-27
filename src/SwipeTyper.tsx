import { useRef, useState } from 'react';
import { useSwipeField } from './useSwipeField';
import { KeyboardPlot } from './KeyboardPlot';
import type { MatchOptions } from './matcher';

type SwipeTyperProps = {
  options: MatchOptions;
};

export const SwipeTyper = ({ options }: SwipeTyperProps) => {
  const { fieldRef, lastWord, choose, commitSwipe } = useSwipeField(options);

  // The in-progress on-screen swipe, mirrored to a ref so the pointer-end
  // handler reads the final value without a stale closure.
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const activeRef = useRef<{ keys: string[]; holds: number[] }>({ keys: [], holds: [] });

  const handleSwipeUpdate = (keys: string[], holds: number[]) => {
    activeRef.current = { keys, holds };
    setActiveKeys(keys);
  };

  const handleSwipeEnd = () => {
    const { keys, holds } = activeRef.current;
    if (keys.length > 0) commitSwipe(keys.join(''), holds);
    activeRef.current = { keys: [], holds: [] };
    setActiveKeys([]);
  };

  return (
    <div className="typer">
      <label className="field-label" htmlFor="swipe-field">
        Typ snel of veeg over het toetsenbord; spatie of een korte pauze zet het
        woord vast. Gewone woorden blijven staan.
      </label>
      <textarea
        id="swipe-field"
        ref={fieldRef}
        className="swipe-field"
        rows={3}
        placeholder="Typ of veeg hier…"
        autoFocus
      />

      {lastWord && (
        <div className="suggestions">
          <span className="field-label">
            Suggesties voor <code>{lastWord.raw}</code> — klik om te vervangen
          </span>
          <div className="alternatives">
            {lastWord.matches.map((match, index) => (
              <button
                key={`${match.word}-${index}`}
                type="button"
                className={index === lastWord.chosenIndex ? 'alt-chip chosen' : 'alt-chip'}
                onClick={() => choose(index)}
              >
                {match.word}
              </button>
            ))}
          </div>
        </div>
      )}

      <KeyboardPlot
        swipe={activeKeys.join('')}
        holds={activeRef.current.holds}
        onSwipeUpdate={handleSwipeUpdate}
        onSwipeEnd={handleSwipeEnd}
      />
    </div>
  );
};
