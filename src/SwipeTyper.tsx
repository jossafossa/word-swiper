import { useRef, useState } from 'react';
import { useSwipeTyper } from './useSwipeTyper';
import { useSwipeMatch } from './useSwipeMatch';
import { KeyboardPlot } from './KeyboardPlot';
import type { MatchOptions } from './matcher';

type SwipeTyperProps = {
  options: MatchOptions;
};

const wordOf = (token: string, matches: { word: string }[], chosenIndex: number): string =>
  matches[chosenIndex]?.word ?? `[${token}]`;

export const SwipeTyper = ({ options }: SwipeTyperProps) => {
  const [pauseMs, setPauseMs] = useState(700);
  const typer = useSwipeTyper(options, pauseMs);
  const [openIndex, setOpenIndex] = useState<number | undefined>(undefined);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const activeMatch = useSwipeMatch(typer.activeText, { ...options, holds: typer.activeHolds });
  const activeMatches = activeMatch.status === 'success' ? activeMatch.matches : [];

  const refocus = () => surfaceRef.current?.focus();

  const isEmpty = typer.committed.length === 0 && typer.activeText === '';

  return (
    <div className="typer">
      <label className="field-label">
        Swipe-typen — veeg, pauzeer ({pauseMs} ms) voor een nieuw woord, klik een
        woord om een ander te kiezen
      </label>

      <div
        ref={surfaceRef}
        className="typer-surface"
        tabIndex={0}
        role="textbox"
        aria-label="Swipe typen"
        onKeyDown={typer.handleKeyDown}
        onKeyUp={typer.handleKeyUp}
      >
        {isEmpty && <span className="muted">Klik hier en begin te swipen…</span>}
        {typer.committed.map((word, index) => (
          <button
            key={`${word.token}-${index}`}
            type="button"
            className={openIndex === index ? 'word-chip open' : 'word-chip'}
            onClick={() => setOpenIndex(openIndex === index ? undefined : index)}
          >
            {wordOf(word.token, word.matches, word.chosenIndex)}
          </button>
        ))}
        {typer.activeText !== '' && <span className="active-chip">{typer.activeText}</span>}
      </div>

      {openIndex !== undefined && typer.committed[openIndex] && (
        <div className="alternatives">
          {typer.committed[openIndex].matches.map((match, matchIndex) => (
            <button
              key={match.word}
              type="button"
              className={
                matchIndex === typer.committed[openIndex]!.chosenIndex
                  ? 'alt-chip chosen'
                  : 'alt-chip'
              }
              onClick={() => {
                typer.chooseCommitted(openIndex, matchIndex);
                setOpenIndex(undefined);
                refocus();
              }}
            >
              {match.word}
            </button>
          ))}
        </div>
      )}

      {typer.activeText !== '' && (
        <div className="suggestions">
          <span className="field-label">Suggesties (klik = kies en sluit woord af)</span>
          <div className="alternatives">
            {activeMatches.map((match, index) => (
              <button
                key={match.word}
                type="button"
                className={index === 0 ? 'alt-chip chosen' : 'alt-chip'}
                onClick={() => {
                  typer.chooseActive(index);
                  refocus();
                }}
              >
                {match.word}
              </button>
            ))}
            {activeMatches.length === 0 && <span className="muted">Geen match…</span>}
          </div>
        </div>
      )}

      <KeyboardPlot
        swipe={typer.activeText}
        holds={typer.activeHolds}
        onSwipeUpdate={typer.setActiveSwipe}
        onSwipeEnd={typer.commitNow}
      />

      <div className="typer-controls">
        <label className="control">
          <span className="control-label">
            Pauze tot nieuw woord <span className="control-value">{pauseMs} ms</span>
          </span>
          <input
            type="range"
            min={300}
            max={1500}
            step={50}
            value={pauseMs}
            onChange={(event) => setPauseMs(Number(event.target.value))}
          />
        </label>
        {!isEmpty && (
          <button type="button" className="reset" onClick={typer.clearAll}>
            Wis alles
          </button>
        )}
      </div>
    </div>
  );
};
