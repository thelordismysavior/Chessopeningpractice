# LINE/64 production UI and learning loop

Status: ready-for-agent

## Problem Statement

The learner currently has a functional chess-opening drill, but its visual language, navigation, content structure, and review behavior do not form one coherent product. The LINE/64 handoff defines a complete board-first interface, while the learning research calls for clearer concept teaching, line roles, branch recognition, authored correction, and real position-level spaced review. The current app also treats review as a boolean state rather than a time-based schedule.

The learner needs the full product to feel like one quiet, focused system: choose a useful line, understand its plan, recall it from the board, recover from mistakes without unnecessary repetition, and know exactly what to do next.

## Solution

Implement the ten production LINE/64 surfaces using the exported design as the visual contract and the research as the learning-behavior contract. Preserve the existing repertoire, progress, Firebase security, engine behavior, and board interaction model.

Give every trainable position an expanding review interval. Keep sessions focused on one line. Introduce course-level lesson ideas, explicit content roles, escalating hints, targeted mistake recovery, and a one-time branch-point review after a core line is first banked. Make every surface addressable through hash routing while preserving static Firebase and Tauri hosting.

## User Stories

1. As a learner, I want to land on Home after signing in, so that I can choose my next action instead of being forced into practice.
2. As a learner, I want the most useful due or recommended line emphasized on Home, so that I can resume quickly.
3. As a learner, I want to see my existing four opening courses, so that the redesign does not replace my repertoire.
4. As a learner, I want my saved progress preserved, so that adopting LINE/64 does not erase prior work.
5. As a learner, I want visible LINE/64 branding throughout the product, so that the app feels coherent.
6. As a learner, I want a dark, board-first interface, so that surrounding chrome does not compete with the position.
7. As a learner using a phone, I want the board to remain the largest element, so that move input stays comfortable.
8. As a learner using a tablet or desktop, I want the same experience to adapt fluidly, so that the product does not feel like unrelated fixed layouts.
9. As a keyboard user, I want every board square and action reachable with visible focus, so that I can complete practice without a pointer.
10. As a screen-reader user, I want board squares, prompt changes, feedback, and busy states announced accurately, so that practice state remains understandable.
11. As a reduced-motion learner, I want Move Animation suppressed while the Move Beat remains readable, so that accessibility does not remove instructional timing.
12. As a learner, I want to end the Move Beat with a Tempo Cut, so that I control practice pace.
13. As a learner, I want Home, Course, Lines, Practice, Result, Settings, Queue, Browse, Sources, and Account to be distinct surfaces, so that each screen has one clear purpose.
14. As a learner, I want browser Back, refresh, and deep links to work, so that navigation behaves predictably.
15. As a learner, I want Course to explain one opening’s curriculum, so that I understand what its levels and lines contain.
16. As a learner, I want Lines to show a short actionable selection, so that I can choose among due, banked, and next material without searching the full repertoire.
17. As a learner, I want Browse to search the complete repertoire, so that I can find any opening or line directly.
18. As an experienced learner, I want direct access to every course level and branch, so that hard progression locks do not block targeted study.
19. As a newer learner, I want Home and Course to continue recommending a sensible level, so that removing locks does not remove guidance.
20. As a learner, I want course lines sorted by a meaningful Recommended order, so that due and core material appears before less urgent content.
21. As a learner, I want to sort course lines by level, category, status, or name, so that I can browse using the dimension I care about.
22. As a learner, I want each line labeled core, alternative, reference, or punish, so that I understand its learning burden.
23. As a learner, I want core, alternative, and punish lines to remain trainable, so that useful repertoire branches enter recall and review.
24. As a learner, I want reference lines to remain visible without becoming review debt, so that I can study rare or contextual material freely.
25. As a learner opening a reference line, I want moves and explanations visible in Study, so that I can understand it without scoring.
26. As a learner, I want Study activity to leave banking, mastery, and scheduling unchanged, so that exploration does not distort progress.
27. As a learner, I want a compact lesson idea before new material, so that I know the anchor position, plan, opponent trigger, and resulting plan.
28. As a learner, I want lesson ideas grounded in the bundled repertoire, so that the app does not invent chess claims or unsupported popularity statistics.
29. As a learner opening an untouched line directly, I want its concept entry before the board, so that direct access still teaches before testing.
30. As a learner, I want one line per practice session, so that sessions remain focused and completion is meaningful.
31. As a learner starting an untouched trainable line, I want a Teach pass followed by Recall, so that orientation precedes retrieval.
32. As a learner reopening a banked or mastered line directly, I want Recall without repeating Teach, so that familiar material stays efficient.
33. As a learner entering from Queue, I want only due positions in the Review Drill Phase, so that weak positions receive targeted attention.
34. As a learner, I want the guide visible in Teach and hidden in Recall, so that teaching and scoring remain honest.
35. As a learner, I want hints hidden until requested, so that I can attempt clean recall first.
36. As a learner requesting help, I want hints to escalate from plan to destination to full route, so that the minimum useful clue is revealed.
37. As a learner using any hint, I want the position counted as assisted, so that clean and assisted recall remain distinguishable.
38. As a learner making an illegal move, I want local feedback without a scored miss, so that input errors do not corrupt learning history.
39. As a learner making a repertoire mistake, I want the authored reason before engine analysis, so that I learn the plan rather than only an evaluation number.
40. As a learner, I want the expected move revealed after my attempt and an obvious retry, so that correction stays immediate.
41. As a learner, I want the board to remain in place during feedback, so that correction does not break spatial context or focus.
42. As a learner, I want the Eval Bar attached to the board, so that engine context remains visually subordinate to the position.
43. As a learner, I want move-cost analysis behind an Engine note disclosure, so that secondary engine detail does not dominate authored teaching.
44. As a learner, I want retry available while engine analysis is still loading, so that the engine never blocks practice.
45. As a learner, I want a two-mistake budget, so that the session can identify when targeted recovery is needed.
46. As a learner exhausting the mistake budget, I want to finish the current pass and retry only missed positions, so that I do not replay moves I already know.
47. As a learner completing targeted recovery, I want the line banked automatically, so that no redundant confirmation action is required.
48. As a learner, I want missed or assisted positions scheduled for near-term review, so that banking a line does not hide weak moves.
49. As a learner first banking a core line, I want one branch-point question, so that I practice recognizing the first change in plan.
50. As a learner, I want branch-point review to use a trainable alternative’s divergence position, so that the question reflects real repertoire content.
51. As a learner, I want branch-point review scored and corrected like other recall, so that it contributes to useful review history.
52. As a learner, I want branch-point review only on the first bank, so that later core recalls remain focused.
53. As a learner, I want clean position recalls scheduled at expanding intervals, so that strong memories consume less practice time.
54. As a learner, I want a miss or hint to reset the interval, so that weak recall returns quickly.
55. As a learner, I want missed positions retried during the current session, so that correction is immediate rather than deferred.
56. As a learner, I want due status based on the current time, so that Queue reflects actual scheduled work.
57. As a returning learner with legacy progress, I want already-due positions due immediately after migration, so that pending review is not lost.
58. As a returning learner with completed non-due positions, I want their first timed review scheduled four hours after migration, so that prior work enters the new system without a reset.
59. As a learner, I want untouched positions left unscheduled, so that Queue contains only learned material.
60. As a learner, I want Queue to show due work before recently banked material, so that urgency is clear.
61. As a learner, I want recently banked positions to show their next review time, so that I know when they will return.
62. As a learner, I want every completed position outcome saved immediately, so that leaving mid-line does not lose meaningful work.
63. As a learner leaving mid-line, I want the unfinished line left unbanked, so that partial completion is not presented as success.
64. As a learner reopening an unfinished line, I want to restart that line while retaining position history, so that the session stays coherent without losing data.
65. As a learner, I want Result to summarize the settled session state, mistakes, line state, and authored explanation, so that completion is clear.
66. As a learner refreshing Result, I want the current tab’s latest summary restored, so that an accidental refresh does not blank the screen.
67. As a learner opening Result without a current summary, I want to return safely to Home, so that stale URLs do not produce broken UI.
68. As a learner, I want exactly one recommended next action, so that the result screen does not become a menu.
69. As a learner with remaining trainable material, I want Continue as the next action, so that I can keep learning.
70. As a learner with due positions, I want Review due positions as the next action, so that weak material takes priority.
71. As a learner with nothing immediately actionable, I want Return home, so that the flow ends cleanly.
72. As a learner, I do not want a nonfunctional transfer-game action, so that every displayed action has a complete destination.
73. As a learner, I want Settings available as a normal route, so that preferences are easy to find.
74. As a learner in an active drill, I want Settings to open as a modal, so that changing tempo does not discard the session.
75. As a learner, I want Move Animation adjustable from zero to two seconds in fifty-millisecond steps, so that board motion matches my preference.
76. As a learner, I want Settings to explain Move Beat, Tempo Cut, and reduced-motion behavior, so that the controls are understandable.
77. As a learner, I want device tempo preferences to remain local, so that they do not become learning progress.
78. As a signed-in learner, I want Account to show my email and overall learning summary, so that I can identify the active account and progress.
79. As a learner, I want Account links to Settings and Sources, so that related controls remain discoverable.
80. As a learner, I want to sign out from Account, so that I can end the authenticated session.
81. As a learner, I want Reset all progress protected by explicit confirmation, so that destructive action is deliberate.
82. As a learner resetting progress, I want the copy to state exactly what is cleared, so that the consequence is unambiguous.
83. As a learner, I want reset to preserve device tempo preferences, so that clearing learning history does not alter accessibility choices.
84. As a learner, I want authentication, approval, pending, loading, failure, retry, and sign-out states preserved, so that the redesign does not weaken account behavior.
85. As a learner, I want loading, empty, error, disabled, and reduced-motion states represented consistently, so that every product state remains usable.
86. As a learner, I want direct declarative feedback without toasts, confetti, streaks, or celebratory animation, so that practice remains calm.
87. As a learner, I want real opening names, explanations, levels, sources, and progress instead of design placeholders, so that the implemented product remains truthful.
88. As a maintainer, I want the handoff used as reference rather than copied wholesale, so that production code does not contain duplicate prototype and plugin metadata.
89. As a maintainer, I want existing package, Firebase, storage, and Tauri identifiers preserved, so that a visible rebrand does not create an infrastructure migration.
90. As a maintainer, I want the existing Board and Eval Bar update boundary preserved, so that touch latency, focus, animation cleanup, and streamed evaluation remain correct.
91. As a maintainer, I want timed progress safely merged under concurrent saves, so that counters and schedule state do not overwrite one another.
92. As a maintainer, I want no new telemetry, so that learning behavior is not collected without a policy or destination.

## Implementation Decisions

- Implement these production surfaces: Home, Course, Lines, Practice, Result, Settings, Queue, Browse, Sources, and Account.
- The LINE/64 archive governs visual tokens, responsive geometry, typography, spacing, component states, motion, and voice.
- The learning research governs teaching order, content roles, correction, branch review, scheduling, and progress semantics.
- Existing authentication, authorization, Firestore ownership, engine behavior, repertoire content, and source metadata remain authoritative when neither design nor research requires a behavioral change.
- Use LINE/64 for visible branding, document titles, and accessibility labels. Preserve internal package, Firebase, storage, and Tauri identifiers.
- Replace the visible warm beige/orange theme with the LINE/64 Void, Graphite, Bone, Slate, Rule, and Guide system. Guide green is limited to board guidance.
- Do not copy exported HTML, previews, plugin metadata, or prototype assets into production. Port only required design decisions and exact reusable geometry.
- Use hash routing with addressable route parameters. This must work under static Firebase hosting and Tauri without a router dependency or server rewrites.
- Home is always the post-authentication entry. Its dominant action selects the next due or recommended line rather than auto-opening practice.
- Course presents one opening’s curriculum, promise, lesson idea, sorting, and lines. Lines presents a short actionable cross-course list. Browse presents the exhaustive searchable repertoire and Study entry.
- Keep the existing four courses, all real variations, saved progress, levels, explanations, and sources. Do not replace them with sample copy or sample progress from the handoff.
- Remove hard level locks. Keep level ordering as guidance and progress context, but allow direct line access at every level.
- Recommended course order is: due trainable lines; untouched core, alternative, and punish lines by level; banked or mastered lines; reference lines. Use a stable alphabetical tie-breaker.
- Rename the existing main role to core. Alternative and punish remain trainable. Add reference as non-trainable.
- Mark only the handoff-equivalent London early `...c5` line and Sicilian `Bb5` line as reference. Do not arbitrarily demote other alternatives.
- Reference lines open in Study with moves and explanations visible. They never enter Teach, Recall, Review, banking, mastery, scheduling, or scored progress.
- Alternative is a line classification in this release. Each practice position retains one authored repertoire move; multiple equivalent accepted moves are deferred until content identifies them explicitly.
- Author one lesson-idea record per course level, for twelve records total. Each contains an anchor position, plan, opponent trigger, and resulting plan.
- Lesson-idea content must come from bundled positions, core variations, summaries, and authored move explanations. Do not add unsourced statistics or engine-derived plans.
- An untouched line opened directly from Lines or Browse first shows the compact lesson idea and line preview with one Start lesson action.
- A practice session contains one line. Course Start lesson selects that level’s recommended core line. A line row starts its own line. Home Continue selects the current due or recommended line.
- Untouched trainable lines run Teach then Recall. Banked or mastered lines opened directly run Recall. Queue runs Review only for due positions. Reference lines run Study only.
- Teach exposes full guidance and does not contribute scored accuracy. Recall withholds guidance until requested. Review drills only positions whose schedule is due.
- Automatic banking occurs after successful completion and any required targeted recovery. The Result surface confirms the state; there is no redundant Bank line button.
- On the first bank of a core line, require exactly one branch-point review question using the first trainable alternative’s divergence position. Score, explain, and retry it normally. Do not repeat this special question on later core recalls.
- Hints have three disclosure levels: lesson plan, destination square, then full move and route. The first hint request marks the position assisted.
- Illegal moves produce local, unscored feedback. A repertoire miss is counted once per position even if the learner makes several wrong attempts before correction.
- Keep a two-mistake budget. When exhausted, finish the current Recall pass, retry only missed positions once, then bank the line and schedule those weak positions. Do not replay the full line.
- Persist each completed position outcome immediately. Exiting an incomplete session does not bank the line; reopening restarts the line while retaining saved position history.
- Replace boolean-only review behavior with position-level timed scheduling.
- Each position record gains an interval stage and next-review timestamp while retaining attempts, clean recalls, misses, assistance, and other learning counters needed by current progress reporting.
- Use these fixed stages: 4 hours, 1 day, 3 days, 1 week, 2 weeks, 1 month, 3 months, and 6 months.
- A clean, unassisted recall advances one interval stage. A miss or hint resets to stage zero. Missed positions resurface in-session before their four-hour schedule begins.
- Queue membership is computed from the next-review timestamp and the current time, not from a manually maintained due flag.
- Legacy due positions migrate as due immediately. Legacy completed, non-due positions migrate to stage zero and become due four hours after migration. Untouched positions remain unscheduled. Migration never resets completed lines or counters.
- Progress deltas and transactional merges must preserve additive counters while treating interval stage and next-review timestamp as latest schedule state. Stub persistence must mirror production merge semantics.
- Queue lists due items first and recently banked items second. Upcoming material displays its next review time without treating it as currently due.
- Result is a separate route. Store only the latest session summary in session storage so the current tab can survive refresh. A result route without a summary redirects Home.
- Result contains Settled Score, mistakes, line state, the relevant branch summary, authored correction, and exactly one next action.
- Next-action priority is Continue when trainable material remains, Review due positions when review is actionable, then Return home. Do not add Play a transfer game.
- Settings exists as a route and as a modal during active practice, backed by one preference component and the same local device state.
- Move Animation remains adjustable from 0–2000 ms in 50 ms increments with a 200 ms default. Reduced motion sets effective animation to zero while retaining Move Beat. An explicit zero requests no tempo and suppresses both animation and beats.
- Preserve Tempo Cut in every Drill Phase and describe it as learner-controlled termination of the remaining Move Animation and Move Beat.
- Account contains signed-in email, overall learning summary, Settings and Sources links, Sign out, and confirmed Reset all progress. Exclude profile editing, source import, subscriptions, and account deletion.
- Reset all progress clears course learning records and preserves device tempo preferences.
- Preserve Firebase sign-in, sign-up, approved-email gate, pending approval, error recovery, and sign-out behavior. Restyle only.
- Show authored “Why this move” feedback before engine detail. Keep the Eval Bar attached to the board. Put move-cost analysis in a collapsed Engine note and never block retry on engine work.
- Preserve the architectural decision that only Board and Eval Bar update in place. The Board’s persistent square buttons retain delegated input, focus, drag, selection, animation, and cleanup behavior.
- Use real buttons for all 64 squares, 44 px minimum targets, visible focus, accurate square labels, `aria-live` prompt and feedback updates, and `aria-busy` during settled engine/move work.
- Keep primary practice actions to at most two on phones. Use inline feedback, no toast, glow, gradient, confetti, streak, badge, or automatic celebratory motion.
- Implement loading, empty, error, disabled, and reduced-motion states without layout collapse.
- Do not add analytics or telemetry. Persist only data required for learning behavior and existing progress reporting.

## Testing Decisions

- Good tests assert externally visible learning and product behavior. They do not assert private fields, rendering helper structure, exact internal method calls, or incidental DOM nesting.
- Prefer three high-level seams: learning policy, product journey, and persistence. Do not create a test seam for every screen or helper.
- The learning seam exercises line roles, Drill Phase selection, hint assistance, mistake counting, targeted recovery, automatic banking, branch-point review, interval advancement/reset, due-time calculation, and legacy migration through the existing lesson-runner and review-policy APIs.
- Use deterministic clocks for interval tests. Assert due/not-due behavior at stage boundaries rather than sleeping or depending on wall time.
- Extend existing Vitest patterns for line drills, lesson running, review scheduling, review queues, mastery, progress migration, and progress merging.
- The product seam is a stubbed-browser journey covering Home → Course → concept entry → Teach/Recall → first-bank branch review → Result → Queue.
- The product seam also covers hash-route deep linking, browser Back, result refresh restoration, reference Study neutrality, direct unlocked line access, settings route/modal behavior, Account reset confirmation, and one recommended next action.
- Browser assertions target roles, accessible names, visible state, route changes, board persistence, and completed user actions rather than generated class lists or full-page markup snapshots.
- Preserve and extend prior browser coverage for learning-engine behavior, product surfaces, guided move input, engine assets, and Tempo Cut.
- Keep Board and Eval Bar regression coverage aligned with the existing in-place rendering ADR: live square references must retain focus and interaction while streamed Eval Bar updates remain visible.
- The persistence seam uses the Firebase emulator because timed schedule fields and merge behavior cross the real data boundary. Cover legacy migration, concurrent additive counters, latest schedule state, reset, save failure/retry, and reload.
- Update browser progress stubs whenever production delta or merge semantics change, then use the emulator matrix to prove the stub still represents production behavior.
- Run Firestore rules coverage to verify that the expanded progress shape does not weaken ownership or access restrictions.
- Run the TypeScript/Vite production build, the unit suite, the stubbed Playwright suite, the Firebase emulator/rules checks, and responsive visual verification.
- Compare the implemented product with the handoff at 390×844, 820×1180, and 1440×900. Check board dominance, no horizontal overflow, navigation adaptation, touch targets, focus, and text wrapping.
- Exercise reduced-motion behavior and explicit zero-tempo behavior separately because they intentionally produce different Move Beat semantics.
- No telemetry tests are required because telemetry is out of scope.

## Out of Scope

- Transfer games, bot opponents, or any Play a transfer game action.
- Game-deviation import, recurring-deviation diagnosis, and branch approval.
- A full course or repertoire editor.
- A full opening database or live opening explorer.
- User-authored line import or source management.
- Multiple equivalent accepted moves from one practice position.
- New courses, replacement repertoire data, or unsourced opening statistics.
- Profile editing, subscriptions, payments, account deletion, or multi-account administration.
- Analytics pipelines, event telemetry, dashboards, or reporting destinations.
- Internal package-name, Firebase-project, local-storage-key, or Tauri bundle-identifier migrations.
- Copying design-export HTML, preview images, plugin metadata, or Open Design chrome into production.
- New routing, state-management, UI-component, charting, or animation dependencies.
- Historical session storage beyond the current tab’s latest Result.

## Further Notes

- Primary visual source: `D:\Designs\line_64.zip`.
- Primary research source: `docs/research/chess-opening-learning-research.md`.
- Use the repository glossary terms Move Animation, Move Beat, Tempo Cut, Eval Bar, Provisional Score, Settled Score, and Drill Phase exactly; avoid their documented synonyms.
- Respect the ADR that only Board and Eval Bar render in place.
- The timed scheduling change crosses the persistence boundary, so emulator and rules verification are mandatory under the agreed conditional test scope.
- Implementation begins only after branch isolation. Existing unrelated working-tree changes belong to the user and must be preserved.
