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
        Een gewoon tekstveld — typ en bewerk vrij, zet de cursor waar je wilt.
        Typ een woord snel achter elkaar (of sleep over het toetsenbord) en bij
        een spatie of korte pauze wordt het naar het beste woord omgezet. Echte
        woorden blijven staan; klik een suggestie om te vervangen.
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
