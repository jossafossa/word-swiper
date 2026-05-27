type Point = {
  x: number;
  y: number;
};

export type KeyPosition = Point & {
  key: string;
};

// QWERTY rows. The fractional offsets mimic the physical stagger of a real
// keyboard so geometric distances between keys are roughly accurate.
const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const rowOffsets = [0, 0.25, 0.75];

export const keyPositions: KeyPosition[] = rows.flatMap((rowKeys, row) =>
  rowKeys.split('').map((key, index) => ({ key, x: index + rowOffsets[row], y: row })),
);

const positionByKey = new Map<string, Point>(
  keyPositions.map(({ key, x, y }) => [key, { x, y }]),
);

// Keys within roughly one key-width count as neighbours. Used to forgive a
// detected corner that landed on the key next to the intended one.
const NEIGHBOUR_RADIUS = 1.2;

const neighboursByKey = new Map<string, Set<string>>(
  keyPositions.map(({ key, x, y }) => {
    const neighbours = new Set<string>([key]);
    for (const other of keyPositions) {
      const distance = Math.hypot(x - other.x, y - other.y);
      if (distance > 0 && distance < NEIGHBOUR_RADIUS) neighbours.add(other.key);
    }
    return [key, neighbours];
  }),
);

const toPath = (word: string): Point[] => {
  const path: Point[] = [];
  for (const letter of word) {
    const position = positionByKey.get(letter);
    if (position) path.push(position);
  }
  return path;
};

const distanceToSegment = (point: Point, start: Point, end: Point): number => {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const segmentLengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (segmentLengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);

  const projection =
    ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / segmentLengthSquared;
  const clamped = Math.max(0, Math.min(1, projection));
  return Math.hypot(point.x - (start.x + clamped * deltaX), point.y - (start.y + clamped * deltaY));
};

const distanceToPath = (point: Point, path: Point[]): number => {
  let minimum = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    minimum = Math.min(minimum, distanceToSegment(point, path[i], path[i + 1]));
  }
  return minimum;
};

// How well the swiped keys lie along the ideal path of `word`: 1 means every
// swiped key sits right on the word's key-to-key polyline, approaching 0 as the
// swipe wanders away from it. This is what separates a word the finger actually
// traced (e.g. "peanut") from one that merely shares its letters ("point").
export const pathScore = (word: string, swipe: string): number => {
  const path = toPath(word);
  if (path.length < 2) return 0;

  const swipedKeys = toPath(swipe);
  if (swipedKeys.length === 0) return 0;

  let totalDistance = 0;
  for (const key of swipedKeys) totalDistance += distanceToPath(key, path);
  const averageDistance = totalDistance / swipedKeys.length;

  return 1 / (1 + averageDistance);
};

// Did the finger glide near `key` while travelling between swipe positions
// `fromIndex` and `toIndex`? Used to justify a skipped key: only forgive a
// missing letter if the swipe path actually passed over it, rather than
// inventing a letter the finger never went near.
export const pathPassesNearKey = (
  swipe: string,
  key: string,
  fromIndex: number,
  toIndex: number,
  radius = 1,
): boolean => {
  const target = positionByKey.get(key);
  if (!target) return false;

  const segment = toPath(swipe).slice(fromIndex, toIndex + 1);
  if (segment.length === 0) return false;
  if (segment.length === 1) {
    return Math.hypot(target.x - segment[0].x, target.y - segment[0].y) < radius;
  }
  return distanceToPath(target, segment) < radius;
};

type Vertex = Point & {
  key: string;
};

const toVertices = (swipe: string): Vertex[] => {
  const vertices: Vertex[] = [];
  for (const letter of swipe) {
    const position = positionByKey.get(letter);
    if (!position) continue;
    // Collapse repeated keys: holding/re-touching a key is not a turn.
    if (vertices[vertices.length - 1]?.key === letter) continue;
    vertices.push({ key: letter, ...position });
  }
  return vertices;
};

const CORNER_ANGLE_THRESHOLD = Math.PI / 4; // 45°

const turnAngle = (before: Point, at: Point, after: Point): number => {
  const inX = at.x - before.x;
  const inY = at.y - before.y;
  const outX = after.x - at.x;
  const outY = after.y - at.y;
  const magnitudes = Math.hypot(inX, inY) * Math.hypot(outX, outY);
  if (magnitudes === 0) return 0;

  const cosine = (inX * outX + inY * outY) / magnitudes;
  return Math.acos(Math.max(-1, Math.min(1, cosine)));
};

// The keys where the finger changed direction, plus the start and end. These
// are the likely *intended* letters: between them the finger just glides.
export const detectCorners = (swipe: string): string[] => {
  const vertices = toVertices(swipe.toLowerCase());
  const corners: string[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const isEndpoint = i === 0 || i === vertices.length - 1;
    if (isEndpoint) {
      corners.push(vertices[i].key);
      continue;
    }
    if (turnAngle(vertices[i - 1], vertices[i], vertices[i + 1]) > CORNER_ANGLE_THRESHOLD) {
      corners.push(vertices[i].key);
    }
  }
  return corners;
};

// Fraction of detected corners that `word` accounts for, in order, allowing a
// corner to be matched by a neighbouring key. Every deliberate turn should
// correspond to a letter of the intended word, so a high score means the word
// explains the swipe's shape; a low score means it ignores the turns.
export const cornerScore = (word: string, corners: string[]): number => {
  if (corners.length === 0) return 0;

  let wordIndex = 0;
  let hits = 0;
  for (const corner of corners) {
    const allowed = neighboursByKey.get(corner);
    if (!allowed) continue;
    for (let i = wordIndex; i < word.length; i++) {
      if (allowed.has(word[i])) {
        hits += 1;
        wordIndex = i + 1;
        break;
      }
    }
  }
  return hits / corners.length;
};
