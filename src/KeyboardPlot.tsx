import { useRef, type PointerEvent } from 'react';
import { detectCorners, keyPositions } from './keyboard';

type KeyboardPlotProps = {
  swipe: string;
  holds?: number[];
  onSwipeUpdate?: (keys: string[], holds: number[]) => void;
  onSwipeEnd?: () => void;
};

const CELL = 44;
const PADDING = 22;
const BASE_RADIUS = 14;
const MAX_EXTRA_RADIUS = 9;
const HIT_RADIUS = CELL * 0.7;

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

export const KeyboardPlot = ({ swipe, holds, onSwipeUpdate, onSwipeEnd }: KeyboardPlotProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ keys: string[]; holds: number[]; lastKeyAt: number } | undefined>(undefined);

  const cleanSwipe = swipe.toLowerCase();
  const corners = new Set(detectCorners(cleanSwipe));
  const holdByKey = maxHoldByKey(cleanSwipe, holds);
  const longestHold = Math.max(0, ...holdByKey.values());
  const isInteractive = onSwipeUpdate !== undefined;

  const pathPoints = [...cleanSwipe]
    .map((letter) => positionByKey.get(letter))
    .filter((position) => position !== undefined)
    .map((position) => {
      const { cx, cy } = center(position.x, position.y);
      return `${cx},${cy}`;
    })
    .join(' ');

  // The key under the pointer, or undefined if the pointer is between keys.
  const keyAtPointer = (event: PointerEvent<SVGSVGElement>): string | undefined => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const rect = svg.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * width;
    const py = ((event.clientY - rect.top) / rect.height) * height;

    let closest: { key: string; distance: number } | undefined;
    for (const { key, x, y } of keyPositions) {
      const { cx, cy } = center(x, y);
      const distance = Math.hypot(px - cx, py - cy);
      if (distance < HIT_RADIUS && (!closest || distance < closest.distance)) {
        closest = { key, distance };
      }
    }
    return closest?.key;
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (!isInteractive) return;
    event.preventDefault();
    try {
      svgRef.current?.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can fail for synthetic events; the drag still works.
    }
    drag.current = { keys: [], holds: [], lastKeyAt: performance.now() };
    onSwipeUpdate?.([], []);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const key = keyAtPointer(event);
    if (!key) return;

    const { keys, holds: dragHolds } = drag.current;
    if (keys[keys.length - 1] === key) return;

    const now = performance.now();
    if (keys.length > 0) dragHolds[keys.length - 1] = now - drag.current.lastKeyAt;
    drag.current.lastKeyAt = now;
    keys.push(key);
    dragHolds.push(0);
    onSwipeUpdate?.([...keys], [...dragHolds]);
  };

  const handlePointerUp = () => {
    if (!drag.current) return;
    drag.current = undefined;
    onSwipeEnd?.();
  };

  return (
    <svg
      ref={svgRef}
      className={isInteractive ? 'plot interactive' : 'plot'}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Swipe-toetsenbord"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
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
