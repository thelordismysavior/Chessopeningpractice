# Reset All Progress

## Goal

Let the signed-in learner reset all course progress from Dashboard settings without changing the device-local move duration.

## Scope

- Show the reset control only in the Dashboard settings dialog.
- Reset progress for all four courses.
- Clear completed levels, unlock state, attempts, missed positions, completed positions, banked variations, and review history.
- Preserve move duration and authentication.
- Keep practice-session settings unchanged.

## Design

Add `resetAllProgress(courseIds)` beside the existing progress persistence functions. It requires a signed-in user and uses one Firestore write batch to delete that user's course progress documents. Deleting the documents reuses the existing `loadProgress()` fallback to `emptyProgress()` and prevents a partial reset.

The Dashboard settings dialog adds a visually separated reset section below the move-duration preference. Selecting **Reset all progress** reveals an inline confirmation with a concise irreversible-action warning, **Cancel**, and **Reset progress**.

While the batch is pending, confirmation controls are disabled to prevent duplicate requests. On success, the dialog closes and the Dashboard reloads, showing every course at its initial Beginner state. On failure, the dialog remains open, existing progress remains intact, and an inline `role="alert"` message explains that the reset failed and can be retried.

## Data Flow

1. The learner opens Dashboard settings.
2. The learner selects **Reset all progress**.
3. The dialog reveals inline confirmation controls.
4. Confirming calls `resetAllProgress()` with the existing course IDs.
5. Firestore atomically deletes the signed-in user's course documents.
6. The Dashboard reloads progress through the existing loader.

## Accessibility

- Use native buttons and the existing native dialog.
- Keep the confirmation and failure message inside the dialog.
- Move focus to the confirmation action when the second step appears.
- Announce failures with `role="alert"`.
- Preserve visible focus styles and readable destructive-action contrast.

## Verification

- A successful reset returns all courses to initial progress.
- A failed reset keeps the dialog open and allows retry without changing displayed progress.
- Reset controls appear on the Dashboard but not during practice.
- Move duration remains unchanged after reset.
- Firestore tests verify that the approved owner may delete their own progress and cannot delete another user's progress.

## Out of Scope

- Resetting one course or one level.
- Undo or progress backups.
- Resetting move duration.
- Resetting progress during an active practice session.
- Server-side administration tooling.
