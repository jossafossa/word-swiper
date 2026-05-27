import { useSwipeField } from './useSwipeField';
import type { MatchOptions } from '../core/matcher';

type SwipeTyperProps = {
  options: MatchOptions;
};

export const SwipeTyper = ({ options }: SwipeTyperProps) => {
  const { fieldRef, lastWord, choose } = useSwipeField(options);

  return (
    <div className="typer">
      <label className="field-label" htmlFor="swipe-field">
        Typ een woord snel achter elkaar; een spatie of korte pauze zet het vast.
        Gewone woorden blijven staan.
      </label>
      <textarea
        id="swipe-field"
        ref={fieldRef}
        className="swipe-field"
        rows={3}
        placeholder="Typ hier…"
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
    </div>
  );
};
