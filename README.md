# Keyboard Swiper

Decode a raw keyboard "swipe" into the word you meant — the way a phone's
glide-typing keyboard does, but for a normal QWERTY layout. Drag your finger (or
mouse) across the keys, or fast-type the keys a real swipe would cross, and the
app figures out the word.

> Example: the swipe `lkjhgfdsazcvghy` decodes to **lazy**, and
> `poiuytrewasdfgbnjuyt` to **peanut**.

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # tsc + vite build
```

Vanilla Vite + React + TypeScript. The only runtime deps are `react` /
`react-dom`.

## How it works

A "swipe" is the string of keys the finger crosses. Decoding it means ranking
dictionary words by how well each one explains that swipe. The matcher combines
several signals into one tunable score (see `src/matcher.ts`):

| Signal | Weight | What it measures |
| --- | --- | --- |
| **Path** (`pathScore`) | 3 | How closely the swiped keys lie along the word's key-to-key polyline (the swipe is a physical path, not just a bag of letters). This is what separates `peanut` from `point`. |
| **Corners** (`cornerScore`) | 3 | Whether the word's letters sit on the swipe's direction changes — the finger turns on the letters it means and glides over the rest. |
| **Timing** (`timingScore`) | 2 | Fraction of dwell time spent on the word's letters. Keys you linger on are likely intended. Only active for on-screen swipes (per-key hold durations). |
| **Anchor** | 1.5 | First and last letter match the swipe's start/end (you press those deliberately). |
| **Frequency** | 0.5 | How common the word is — breaks ties (e.g. `lazy` over `lacy`). |
| **Miss penalty** | 0.5 | Cost of a forgiven skipped letter. |

All weights are live-tunable via the sliders in the UI (`WeightControls`).

Candidate gating before scoring:

- **Subsequence + geometric fuzzy** (`missedLetters`): a word must appear in the
  swipe in order. One letter may be skipped, but only if the swipe path actually
  glided near that key — so we never invent a letter the finger never went near
  (this is why `forwastes`/`legacy` no longer beat `features`/`lazy`).
- **Doubled letters** (`collapseRepeats`): a swipe crosses a key once, so words
  are matched against their run-collapsed form (`hello` → `helo`) while still
  scored and displayed in full.

### Dictionary

`src/words.txt` is the 50 000 most frequent English words (Norvig's Google Web
Trillion Word Corpus, <https://norvig.com/ngrams/count_1w.txt>), in descending
frequency order. The line index is the frequency rank. Limiting to real, common
words keeps obscure dictionary entries from polluting results and keeps the
bundle small (~600 KB). `frequency.ts` derives `frequencyScore` and
`isKnownWord` from it.

## The text field

The main UI is a plain `<textarea>` you can type and edit freely (native cursor,
mid-word edits). `src/swipeField.ts` (`attachSwipeField`) is a framework-agnostic
controller you can attach to **any** input/textarea:

- A typed/swiped letter run is decoded into the best word on a **separator**
  (space/punctuation/newline) or a short **pause**. The pause commits the letter
  run **at the cursor**, wherever it is, so editing a word mid-sentence still
  decodes it and refreshes the suggestions.
- A run that is itself a real word is **left as typed** (so normal typing works).
- The **suggestion bar** for the last word persists until the next word begins,
  always lists the raw text as a fallback, and clicking a suggestion replaces the
  word **in place**.
- The on-screen keyboard (`KeyboardPlot`) is interactive: drag to swipe, and the
  decoded word is inserted into the field at the cursor. It also visualises the
  current swipe path, the detected corners (highlighted keys), and dwell time
  (key size).

`useSwipeField` is the thin React wrapper that binds the controller to the
textarea and feeds it the decoder + current weights.

## File map

```
src/
  matcher.ts        Scoring ensemble + candidate gating (the core algorithm)
  keyboard.ts       Key geometry: pathScore, detectCorners, cornerScore, pathPassesNearKey
  frequency.ts      frequencyScore + isKnownWord, from words.txt
  dictionary.ts     Loads words.txt (50k frequency-ranked)
  words.txt         The word list (data)
  swipeField.ts     Reusable controller: swipe-decoding on any text field
  useSwipeField.ts  React hook around attachSwipeField
  SwipeTyper.tsx    The textarea + suggestion bar + on-screen keyboard
  KeyboardPlot.tsx  Interactive/visualising QWERTY keyboard (SVG)
  WeightControls.tsx  Sliders for the scoring weights + fuzzy toggle
  App.tsx           Composition + shared options state
```

## Conventions

Named exports only, `const` arrow functions, no abbreviations, booleans prefixed
(`isWord`, `hasError`), early returns over deep nesting, comments explain *why*
not *what*. Match the surrounding style.

## Ideas / next steps

- **Bigram / sentence context**: pick `lazy` vs `lacy` (or `lay`) using the
  neighbouring words. The biggest remaining recognition win, but needs a bigram
  frequency dataset — discuss scope before pulling in another multi-MB data file.
- Smooth the on-screen-keyboard insertion when the cursor is mid-word (currently
  inserts exactly at the caret, which can glue onto an adjacent word).
- Optional: confidence as a 0–100% bar instead of raw scores.

## Repo

Pushed to `git@personal.github.com:jossafossa/word-swiper.git` (a standalone repo
inside the `PersonalProjects` folder; the surrounding monorepo does not track it).
