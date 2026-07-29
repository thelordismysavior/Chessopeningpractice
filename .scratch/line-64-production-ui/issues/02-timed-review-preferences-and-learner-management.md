# 02 — Timed review, preferences, and learner management

**What to build:** Replace boolean-only review with a persisted timed lifecycle and expose the learner-facing Queue, Settings, Account, and Sources surfaces needed to understand and manage that lifecycle without changing authentication or device-preference ownership.

**Blocked by:** 01 — Hash-routed LINE/64 Home shell.

**Status:** ready-for-agent

- [ ] Every learned trainable position stores an interval stage and next-review time alongside existing learning counters.
- [ ] Scheduling uses 4 hours, 1 day, 3 days, 1 week, 2 weeks, 1 month, 3 months, and 6 months.
- [ ] Clean unassisted recall advances a stage; a miss or hint resets to stage zero.
- [ ] Queue membership derives from the current time and next-review time.
- [ ] Legacy due positions migrate as due immediately; completed non-due positions migrate to a review four hours later; untouched positions remain unscheduled.
- [ ] Migration preserves completed lines, counters, practice time, and all existing learner progress.
- [ ] Transactional merges keep counters additive while applying the latest schedule state under concurrent saves.
- [ ] Queue shows due work first and recently banked material second, with readable upcoming review times.
- [ ] Home’s dominant action reflects the timed queue rather than legacy boolean state.
- [ ] Settings is addressable and supplies the same preference component used by the active-practice modal.
- [ ] Move Animation remains 0–2000 ms in 50 ms steps with a 200 ms default; reduced motion and explicit zero retain their distinct Move Beat semantics.
- [ ] Settings explains Move Beat, Tempo Cut, and reduced-motion behavior using repository glossary terms.
- [ ] Account shows signed-in email, overall learning summary, Settings and Sources links, Sign out, and confirmed Reset all progress.
- [ ] Reset states exactly what is cleared, preserves device preferences, and reports save failure without a toast.
- [ ] Sources retains real source metadata and external references in the LINE/64 visual system.
- [ ] Deterministic unit tests cover stage boundaries, due calculation, migration, queue ordering, and progress merging.
- [ ] Browser progress stubs match production merge semantics.
- [ ] Firebase emulator and rules coverage proves migration, concurrent saves, reload, reset, ownership, and failure recovery.

