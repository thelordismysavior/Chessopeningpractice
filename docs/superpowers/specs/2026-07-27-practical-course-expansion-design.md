# Practical Course Expansion

## Goal

Expand all four opening courses with practical opponent replies. Preserve the existing 36 lines and add branches according to each opening's real reply diversity, not an equal quota.

## Scope

- Jobava London: add common setup disruptions and move orders.
- London System: add common central challenges, bishop development, and kingside setups.
- Classical Sicilian: add major Open Sicilian choices and practical Anti-Sicilians.
- Classical Caro-Kann: add Advance, Exchange, Panov, Fantasy, Two Knights, and useful sidelines.
- Prefer breadth of practical coverage over longer theoretical main lines.
- Keep the existing beginner, intermediate, and advanced lesson structure.
- Keep explanations original and concise.

## Content Model

Allow more than one variation of the same kind in a lesson. New variations receive explicit, stable IDs. Existing variation and practice-position IDs remain unchanged so saved progress still maps to the original content.

The existing `main`, `alternative`, and `punish` labels remain. A lesson may contain several `alternative` branches when opponents have several practical replies.

## Course Experience

The dashboard, browse screen, lesson runner, mastery meter, and review queue continue consuming the existing variation arrays. They should display and track the added lines without a new screen or interaction pattern.

No visual redesign, dependency, remote content service, or runtime opening database is added.

## Content Rules

- Every move sequence must be legal.
- Every learner turn gets one expected move and one useful explanation.
- Each new line represents a distinct opponent choice or move order.
- Titles name the reply being handled.
- Summaries explain the plan rather than claim exhaustive theory.
- Practical alternatives may be shorter than main lines.
- Content is checked against Lichess opening data and the bundled engine where applicable.

## Compatibility

- Preserve existing course IDs.
- Preserve existing variation IDs and practice-position IDs.
- Give every added variation a unique ID within its course and level.
- Keep progress loading tolerant of newly added, previously unseen positions.

## Verification

- Update content tests to allow multiple alternatives while requiring at least one main, alternative, and punish line per lesson.
- Assert unique variation and position IDs.
- Replay every sequence with `chess.js`.
- Verify the stored opponent reply connects consecutive learner positions.
- Run the complete unit suite and production build.
- Exercise dashboard, browse, and lesson entry in browser checks.

## Non-goals

- Equal line counts per course.
- Exhaustive opening theory.
- New courses or levels.
- Live Opening Explorer requests.
- UI redesign.
