import { useState } from 'react';
import { SwipeTyper } from './SwipeTyper';
import { WeightControls } from './WeightControls';
import { defaultWeights, type MatchOptions, type Weights } from './matcher';

export const App = () => {
  const [weights, setWeights] = useState<Weights>(defaultWeights);
  const [allowMissedLetter, setAllowMissedLetter] = useState(true);

  const options: MatchOptions = { weights, allowMissedLetter };

  return (
    <div id="app">
      <h1>Keyboard Swiper</h1>
      <p className="hint">
        Veeg over je toetsen alsof het je telefoon is: typ snel achter elkaar,
        pauzeer even, en het beste woord wordt vastgezet. Daarna begin je gewoon
        aan het volgende. Klik een woord aan om een andere suggestie te kiezen.
      </p>

      <SwipeTyper options={options} />

      <WeightControls
        weights={weights}
        allowMissedLetter={allowMissedLetter}
        onWeightsChange={setWeights}
        onAllowMissedLetterChange={setAllowMissedLetter}
      />
    </div>
  );
};
