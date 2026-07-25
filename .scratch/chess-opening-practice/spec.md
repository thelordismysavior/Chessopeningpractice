# Chess Opening Practice v1

Status: ready-for-agent

## Problem Statement

The user wants a private chess-opening practice app that teaches a small, structured repertoire from beginner through advanced level. Existing opening resources are broad and difficult to turn into a repeatable practice routine. The app must work on desktop and Android, preserve progress across devices, and keep the first release focused on practicing moves rather than becoming a complete chess database or engine.

## Solution

Build a private, online-only chess practice app with a Vite and vanilla TypeScript frontend. Firebase Authentication provides Google Sign-In, Firestore stores the approved user's practice progress, and Firebase Hosting serves the web build. Tauri v2 is scaffolded around the same frontend so native packaging can be added later without changing the practice flow.

The app ships four fixed, curated courses:

- Jobava London for White: `1. d4 d5 2. Nc3 Nf6 3. Bf4`
- London System for White: `1. d4 d5 2. Nf3 Nf6 3. Bf4`
- Classical Sicilian for Black: `1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3`
- Classical Caro-Kann for Black: `1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5`

Each course has three sequential lessons: Beginner, Intermediate, and Advanced. Each lesson contains roughly 8–12 practice positions, short original explanations, and a move-by-move drill.

## User Stories

1. As the owner of the app, I want to sign in with Google, so that my progress has a stable identity across devices.
2. As the owner of the app, I want unauthenticated users blocked from the dashboard, so that the app remains private.
3. As the owner of the app, I want only my approved Google account to access stored progress, so that another authenticated account cannot use my data.
4. As a signed-in learner, I want to see all four opening courses on a dashboard, so that I can choose what to study.
5. As a signed-in learner, I want each course to show its side, opening name, progress, and next available lesson, so that I know what to practice next.
6. As a White player, I want a Jobava London course, so that I can practice my selected White repertoire.
7. As a White player, I want a London System course, so that I can practice my selected classical London repertoire.
8. As a Black player, I want a Classical Sicilian course, so that I can practice a consistent response to 1.e4.
9. As a Black player, I want a Classical Caro-Kann course, so that I can practice a consistent alternative response to 1.e4.
10. As a learner, I want Beginner lessons to explain the setup and purpose of the core moves, so that I understand what I am memorizing.
11. As a learner, I want Intermediate lessons to cover plans and common opponent deviations, so that I can respond beyond the first few moves.
12. As a learner, I want Advanced lessons to cover deeper branches, tactical ideas, and common mistakes, so that I can extend the repertoire responsibly.
13. As a learner, I want Intermediate locked until Beginner is complete, so that I follow the intended learning progression.
14. As a learner, I want Advanced locked until Intermediate is complete, so that I do not skip the foundations.
15. As a learner, I want to read a short explanation before or beside a drill position, so that each move has a reason.
16. As a learner, I want to see whose turn it is and which side of the repertoire I am practicing, so that I do not confuse White and Black objectives.
17. As a learner, I want to practice a position by selecting a move on a chessboard, so that the app feels like chess practice rather than a text quiz.
18. As a learner, I want the first practice run to follow the course line in order, so that I learn the structure before being tested randomly.
19. As a learner, I want later review to revisit completed and missed positions in a mixed order, so that I practice recall rather than only recognition.
20. As a learner, I want the exact curated repertoire move to count as correct, so that the course teaches a clear line instead of accepting arbitrary legal moves.
21. As a learner, I want an incorrect move to show the expected move and a short explanation, so that I understand the mistake.
22. As a learner, I want to retry an incorrect position before continuing, so that I do not advance without practicing the intended response.
23. As a learner, I want a clean drill run to complete a lesson, so that progress reflects demonstrated recall.
24. As a learner, I want missed positions recorded, so that review can prioritize the areas I struggle with.
25. As a learner, I want the next lesson and unlocked level to be obvious after completion, so that I always know what to do next.
26. As a learner, I want progress to be saved to Firebase while I practice online, so that desktop and Android sessions share the same state.
27. As a learner, I want course completion, unlocks, attempts, and review history synchronized, so that progress is not lost when I change devices.
28. As a learner, I want the app to show a retryable error when Firebase is unavailable, so that a temporary network issue does not look like lost progress.
29. As a learner, I want the app to remember my authenticated session, so that I do not need to sign in for every practice session.
30. As a learner, I want to sign out, so that I can end the session on a shared device.
31. As a maintainer, I want course content bundled with the app, so that lesson reads do not depend on Firestore availability or live third-party APIs.
32. As a maintainer, I want opening metadata and source references recorded with course content, so that each repertoire decision can be reviewed later.
33. As a maintainer, I want original lesson explanations, so that the app does not copy commercial course text or unlicensed instructional material.
34. As a maintainer, I want a clear sources and attribution view, so that the app acknowledges the Lichess opening dataset and linked references.
35. As a maintainer, I want the web build hosted through Firebase Hosting, so that the app has one HTTPS URL for desktop and Android browsers.
36. As a maintainer, I want Tauri scaffolding present from the beginning, so that a future APK can reuse the existing frontend.
37. As a maintainer, I want the frontend to run without native-only assumptions, so that the same practice flow works in a browser and inside Tauri.
38. As a maintainer, I want local Firebase emulators available during development, so that authentication and Firestore rules can be tested without changing production data.
39. As a maintainer, I want Firebase configuration supplied through environment-specific configuration, so that project details are not hardcoded into source code.
40. As a maintainer, I want the practice engine to be independent of rendering and Firebase, so that move correctness and lesson progression can be tested reliably.

## Implementation Decisions

- Use Vite with vanilla TypeScript and standard browser APIs. Do not add React, a component library, or a state-management framework for v1.
- Scaffold Tauri v2 around the Vite frontend. The first release includes Tauri project structure only; it does not build or distribute an APK.
- Use Firebase Authentication with Google as the only sign-in provider.
- Require authentication before showing the course dashboard or practice content.
- Enforce the approved-account restriction in Firestore Security Rules, not only in the frontend. Every progress read and write must be owned by the authenticated user and additionally restricted to the approved account.
- Use Firestore for progress only. Store progress in per-user, per-course documents containing lesson completion, unlocked level, attempts, missed positions, and review state. Keep the structure denormalized for the dashboard and course queries.
- Use explicit reads and writes for progress rather than a permanent real-time listener. The app is single-user and online-only, so a persistent listener would add complexity and unnecessary reads.
- Use the modular Firebase Web SDK and environment-specific Firebase configuration.
- Use the Firebase Emulator Suite for local Auth and Firestore development and Security Rules tests.
- Use Firebase Hosting for the browser build.
- Bundle course content with the frontend. Do not load lesson content from Firestore at runtime.
- Use Lichess `chess-openings` for opening names, ECO metadata, and canonical move sequences. Use Lichess Opening Explorer and the researched sources to validate and curate content before bundling it. Do not request live Explorer statistics during practice.
- Treat the Lichess opening metadata as classification data, not as an assertion that every bundled move is the only correct chess move.
- Write original lesson explanations. Link to Wikibooks or other references instead of copying third-party instructional prose.
- Present courses as fixed repertoire branches. The first release does not generate lines dynamically from live statistics.
- Use a touch-first chessboard that supports selecting a source square and destination square. It must work in a desktop pointer environment and on Android touch screens.
- Use a chess rules library for legal move validation and notation rather than implementing chess rules from scratch. The practice engine still owns repertoire correctness and progression.
- The primary test seam is a pure practice-session boundary: given a course position and a user move, it returns the expected feedback, next position, retry state, and lesson completion state. The UI, Firebase adapter, and Tauri shell consume this boundary but do not define its rules.
- Authentication and persistence are integration boundaries. Browser and Tauri auth flows must be smoke-tested, while Firestore access must be tested against the local emulator and Security Rules.

## Testing Decisions

- Tests should verify observable behavior: which move is accepted, what feedback appears, when a position can be retried, when a lesson completes, and what progress is persisted. They should not assert DOM structure, Firebase SDK calls, or internal helper names.
- The practice-session boundary is the highest-value seam and should receive focused tests for correct moves, incorrect moves, retry behavior, ordered first-pass selection, review selection, lesson completion, and sequential level unlocking.
- Course-content validation should check that each course has the expected side, core line, three levels, valid positions, expected moves, and explanations.
- Firestore Security Rules should be tested with the Firebase Emulator Suite for unauthenticated access, approved-account access, another-account denial, and cross-user document denial.
- Firebase persistence tests should verify that completion and attempt updates survive reload and are reflected on another authenticated client session. The test should use the emulator rather than production Firebase.
- Authentication smoke tests should cover sign-in, signed-in dashboard access, sign-out, and the mobile redirect path. Popup behavior may be used on desktop with redirect fallback.
- The Tauri shell should have a minimal build/configuration check proving that the Vite frontend is wired as its frontend distribution. Native APK packaging and signing are not part of the v1 test gate.
- There is no existing test prior art in the repository; the repository currently contains only agent documentation and research notes. Add the smallest test tooling needed for the practice boundary and Firebase rules.

## Out of Scope

- Native APK generation, signing, Play Store distribution, or native Android-only features.
- Offline practice, offline persistence, queued writes, or conflict resolution.
- Firebase Realtime Database, Cloud Storage, Cloud Functions, or Firebase Data Connect.
- Live Lichess Opening Explorer statistics in the user interface.
- Dynamic course or repertoire generation.
- A full chess engine, engine evaluation, or engine opponent.
- Accepting arbitrary legal moves as equivalent to the curated repertoire move.
- PGN import, personal-game analysis, or personalized drills from the user's games.
- A course editor, admin interface, or user-authored repertoire builder.
- Personal notes, custom lines, annotations, or saved variations.
- Additional opening families beyond the four defined courses.
- Covering every Sicilian or London variation. Each v1 course is intentionally narrow.
- Multi-user sharing, social features, leaderboards, public profiles, or roles beyond the approved account.
- Email/password, Apple, GitHub, or other authentication providers.
- Copying commercial books, course text, video transcripts, user annotations, or unlicensed PGN collections.

## Further Notes

- The source research is recorded in `docs/research/chess-opening-sources.md`.
- Primary references are the [Lichess chess-openings dataset](https://github.com/lichess-org/chess-openings), [Lichess Opening Explorer](https://lichess.org/api#tag/Opening-Explorer), [Lichess open database](https://database.lichess.org/), and [Wikibooks copyright guidance](https://en.wikibooks.org/wiki/Wikibooks:Copyrights).
- The Lichess opening-name dataset is released under CC0/public-domain terms. Lichess database exports are also released under CC0. Wikibooks text normally requires attribution and share-alike compliance, so original explanations are the default.
- The repository has no existing application code, glossary, ADRs, build system, or test suite. The implementation agent may establish the initial Vite/Tauri/Firebase project structure while preserving this scope.
- The app should expose a small sources/attribution view even though the primary bundled opening metadata is CC0; this makes provenance clear and preserves room for future source-specific licensing.
