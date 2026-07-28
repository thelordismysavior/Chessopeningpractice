# Browser tests stub Firebase; only one journey runs against the emulator

Almost every browser spec replaces `src/firebase.ts` and `src/progress.ts` with in-page stubs
(`test/browser/app-stubs.ts`), keeping progress in a per-page in-memory map instead of Firestore.
Only `test/browser/emulator-matrix.spec.ts` drives the real Auth and Firestore emulators, and it is
the sole reason the `emulated` Playwright project exists. We took that split because the emulator
adds no signal to tests about the learning engine, the review queue, or layout, while it does cost a
Java process, a serialised worker, and a per-move transaction round trip — and because stubs let a
test seed any course state instantly rather than playing hundreds of moves to reach it.

## Consequences

Data-layer regressions are only caught in one place, so anything touching progress persistence,
the save-failure path, or Firestore rules must be covered in the emulated spec or in
`test/rules.test.ts` — the stubs will happily agree with a broken `src/progress.ts`. The stubs
duplicate the real `diffProgress`/`mergeProgress` logic, so a change to the merge semantics has to be
mirrored in `app-stubs.ts` or the stubbed suite silently drifts from production behaviour.
