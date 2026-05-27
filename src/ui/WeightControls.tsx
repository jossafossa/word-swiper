import type { Weights } from '../core/matcher';

type WeightControlsProps = {
  weights: Weights;
  allowMissedLetter: boolean;
  onWeightsChange: (weights: Weights) => void;
  onAllowMissedLetterChange: (allow: boolean) => void;
};

const sliders: { key: keyof Weights; label: string; max: number }[] = [
  { key: 'path', label: 'Pad (vorm)', max: 6 },
  { key: 'corner', label: 'Hoeken', max: 6 },
  { key: 'timing', label: 'Timing (dwell)', max: 6 },
  { key: 'anchor', label: 'Anchor (begin/eind)', max: 6 },
  { key: 'frequency', label: 'Frequentie', max: 6 },
  { key: 'missPenalty', label: 'Miss-straf', max: 2 },
];

export const WeightControls = ({
  weights,
  allowMissedLetter,
  onWeightsChange,
  onAllowMissedLetterChange,
}: WeightControlsProps) => (
  <div className="controls">
    {sliders.map(({ key, label, max }) => (
      <label key={key} className="control">
        <span className="control-label">
          {label} <span className="control-value">{weights[key].toFixed(1)}</span>
        </span>
        <input
          type="range"
          min={0}
          max={max}
          step={0.1}
          value={weights[key]}
          onChange={(event) =>
            onWeightsChange({ ...weights, [key]: Number(event.target.value) })
          }
        />
      </label>
    ))}
    <label className="control control-toggle">
      <input
        type="checkbox"
        checked={allowMissedLetter}
        onChange={(event) => onAllowMissedLetterChange(event.target.checked)}
      />
      <span>Fuzzy: één gemiste letter toestaan</span>
    </label>
  </div>
);
