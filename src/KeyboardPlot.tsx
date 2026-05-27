import { detectCorners, keyPositions } from './keyboard';

type KeyboardPlotProps = {
  swipe: string;
  holds?: number[];
};

const CELL = 44;
const PADDING = 22;
const BASE_RADIUS = 14;
const MAX_EXTRA_RADIUS = 9;

const center = (x: number, y: number) => ({
  cx: x * CELL + PADDING,
  cy: y * CELL + PADDING,
});

const positionByKey = new Map(keyPositions.map((position) => [position.key, position]));

const width = Math.max(...keyPositions.map((position) => position.x)) * CELL + PADDING * 2;
const height = Math.max(...keyPositions.map((position) => position.y)) * CELL + PADDING * 2;

// Longest hold seen on each key, so circle size reflects how long it lingered.
const maxHoldByKey = (swipe: string, holds: number[] | undefined): Map<string, number> => {
  const result = new Map<string, number>();
  if (!holds) return result;
  [...swipe].forEach((letter, index) => {
    const hold = holds[index] ?? 0;
    result.set(letter, Math.max(result.get(letter) ?? 0, hold));
  });
  return result;
};

export const KeyboardPlot = ({ swipe, holds }: KeyboardPlotProps) => {
  const cleanSwipe = swipe.toLowerCase();
  const corners = new Set(detectCorners(cleanSwipe));
  const holdByKey = maxHoldByKey(cleanSwipe, holds);
  const longestHold = Math.max(0, ...holdByKey.values());

  const pathPoints = [...cleanSwipe]
    .map((letter) => positionByKey.get(letter))
    .filter((position) => position !== undefined)
    .map((position) => {
      const { cx, cy } = center(position.x, position.y);
      return `${cx},${cy}`;
    })
    .join(' ');

  return (
    <svg className="plot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Swipe-pad">
      {pathPoints.length > 0 && (
        <polyline className="plot-path" points={pathPoints} fill="none" />
      )}
      {keyPositions.map(({ key, x, y }) => {
        const { cx, cy } = center(x, y);
        const isCorner = corners.has(key);
        const holdFraction = longestHold > 0 ? (holdByKey.get(key) ?? 0) / longestHold : 0;
        const radius = BASE_RADIUS + holdFraction * MAX_EXTRA_RADIUS;
        return (
          <g key={key}>
            <circle className={isCorner ? 'plot-key corner' : 'plot-key'} cx={cx} cy={cy} r={radius} />
            <text className="plot-label" x={cx} y={cy} dy="0.35em" textAnchor="middle">
              {key}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
