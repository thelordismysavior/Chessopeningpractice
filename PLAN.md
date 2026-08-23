# Audit authored opening lines

## Context

A previously authored Jobava London line recommended `5.a3?` after `...Qb6`, leaving b2 exposed. The repository needs a systematic audit of all bundled Course variations so similarly legal-but-positionally-wrong moves and inaccurate explanations are found and corrected.

Current scope discovered:
- Course content is authored centrally in `src/courses.ts` and converted from SAN move arrays into learner positions with `chess.js`.
- The catalog began with 72 variations and 459 learner positions; the corrected Jobava line now contains 460 positions across four Courses and three levels.
- `test/course-content.test.ts` already checks legality, move-to-move continuity, structural coverage, queen-capture oversights, and the corrected Jobava `Qc1` case, but legality alone cannot validate opening quality or prose claims.
- The repository already vendors Stockfish at `public/engine/`; no engine or audit dependency needs to be added.

## Approach

Audit every authored variation, not only Jobava:
1. Produce a review ledger keyed by Course, level, and variation.
2. Reconstruct each complete move sequence with the existing `chess.js` data path.
3. Check move quality and tactical soundness at every learner choice, then verify each summary/explanation against the resulting board position.
4. Judge recommendations as practical repertoire moves: accept sound alternatives with coherent plans even when Stockfish ranks another move slightly higher. Flag forced tactical failures, material loss without compensation, opening-identity breaks, and clearly inferior moves; use an engine score swing of roughly one pawn only as a review trigger, never an automatic rejection.
5. Verify opening-theory claims against reproducible, high-trust references already recognized by the project, using game-frequency evidence for practical relevance and the vendored Stockfish engine for tactical checks.
6. Correct only confirmed defects, keeping each line’s intended teaching level and repertoire identity intact.
7. Add the smallest durable automated checks for objective defect classes; use focused regressions for corrections that cannot be generalized.

## Files to modify

Expected implementation files:
- `src/courses.ts` — confirmed move, explanation, or summary corrections.
- `test/course-content.test.ts` — generalized invariants and focused regressions for corrected defects.
- `test/line-preview-interface.test.ts` — keeps the affected preview completion assertion aligned with the corrected line length.
- `docs/research/course-line-audit.md` — review ledger recording evidence and disposition for every variation.

No UI files are expected to change.

## Reuse

- `src/courses.ts:positionLine` — existing SAN-to-FEN/UCI reconstruction through `chess.js`.
- `COURSES` and `LEVELS` from `src/courses.ts` — canonical iteration surface used by existing tests.
- `test/course-content.test.ts` — existing legality, continuity, coverage, and tactical regression seam.
- `ATTRIBUTION_SOURCES` in `src/courses.ts` and `docs/research/chess-opening-sources.md` — established source policy: Lichess opening data/explorer plus original explanations informed by theory references.
- `public/engine/stockfish.js` and the real-worker pattern in `test/browser/engine-asset.spec.ts` — tactical evaluation without a new dependency or production engine changes.

## Steps

- [x] Inventory every Course/level/variation and create a complete audit ledger.
- [x] Establish the ledger fields and practical-soundness criteria: legal sequence, tactical safety, opening identity, practical frequency, prose/board agreement, learner-level fit, evidence, and disposition.
- [x] Reconstruct and inspect every full line, including opponent replies and every generated learner position.
- [x] Use a temporary audit harness around the vendored Stockfish worker to flag large best-move/expected-move discrepancies; do not ship the harness or add engine checks to the normal test suite.
- [x] Attempt reproducible Lichess Explorer queries and cross-check every flagged or doubtful line against the project’s cited opening references; record the endpoint access limitation in the ledger.
- [x] Classify each variation as verified or requiring correction; record evidence for every changed claim.
- [x] Add focused failing regression coverage before each confirmed correction where a useful automated seam exists.
- [x] Apply the minimum corrections in `src/courses.ts` without unrelated content or UI changes.
- [x] Run focused content tests, the full non-browser suite, the production build, and targeted manual Line Preview checks.

## Verification

- `npx vitest run test/course-content.test.ts`
- `npm test`
- `npm run build`
- Confirm the audit ledger accounts for every authored variation exactly once.
- Manually preview each corrected line and confirm board sequence, move guide, summary, and explanation agree.
- Review the final diff to ensure unrelated working-tree files are not included.

## Accepted decision

Recommendations are judged for practical soundness. A valid, coherent repertoire move remains acceptable when an engine’s preferred move is only marginally stronger.
