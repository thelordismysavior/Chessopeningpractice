# 02 — Animated Line Preview sequence and completion

**What to build:** Make forward navigation demonstrate the authored continuation on the board. Next
should visibly play the learner-side move and any connecting opponent reply, then allow the learner
to finish the final move, restart the preview, or enter practice when the line is trainable.

**Blocked by:** 01 — Canonical Line Preview entry and manual walkthrough.

**Status:** ready-for-agent

- [ ] Next animates the current authored move from its origin square to its destination rather than replacing the position with an unexplained snapshot.
- [ ] When the next authored prompt follows an opponent reply, that reply animates after the authored move and the board settles on the exact next authored position.
- [ ] When no connecting opponent reply exists, the board still settles deterministically on the next authored position.
- [ ] Previous restores the prior authored prompt immediately without reverse-animating chess moves.
- [ ] Previous, Next, and their keyboard equivalents cannot start overlapping transitions while a forward sequence is settling.
- [ ] The visible busy and disabled states accurately communicate when the sequence is settling and clear when input is available again.
- [ ] Forward movement uses the existing Move Animation duration preference.
- [ ] A zero-duration preference settles the full sequence without offered tempo, and reduced motion suppresses sliding while preserving the same final board states.
- [ ] Line Preview does not add Tempo Cut, autoplay, playback-speed, or loop controls.
- [ ] Next remains available at the final authored prompt and plays the final authored move before showing completion.
- [ ] Completion is explicit and offers Restart Preview, which restores the first prompt with its guide and explanation without changing progress.
- [ ] Completion offers Practice This Line for core, alternative, and punish lines and preserves the selected Course, level, and line when opening practice.
- [ ] Completion never offers practice for a reference line.
- [ ] Navigating, completing, restarting, or leaving an animated Line Preview remains progress-neutral.
- [ ] High-level browser coverage deterministically proves authored movement, opponent replies, input locking, immediate Previous behavior, motion preferences, final-move completion, restart, conditional practice entry, and unchanged progress without arbitrary sleeps.

