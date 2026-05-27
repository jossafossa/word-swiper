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
        Veeg over je toetsen alsof het je telefoon is — sleep met je muis (of
        vinger) over het toetsenbord hieronder, of typ snel op je echte
        toetsenbord. Bij loslaten of een korte pauze wordt het beste woord
        vastgezet; daarna begin je aan het volgende. Klik een woord aan om een
        andere suggestie te kiezen.
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
