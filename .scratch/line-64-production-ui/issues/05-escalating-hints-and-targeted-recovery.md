# 05 — Escalating hints and targeted recovery

**What to build:** Give a struggling learner the least revealing useful help and recover only weak positions when the Recall mistake budget is exhausted, without replaying material already recalled correctly.

**Blocked by:** 04 — One-line Teach and Recall journey.

**Status:** ready-for-agent

- [ ] Recall and Review initially hide all optional hints.
- [ ] The first hint reveals the lesson plan without revealing the full move.
- [ ] The second hint highlights the destination square.
- [ ] The third hint reveals the full move and route.
- [ ] The first requested hint marks the position assisted; later hint levels do not multiply-count assistance.
- [ ] Assisted outcomes reset the position to interval stage zero.
- [ ] Recall counts at most one scored mistake per position regardless of repeated wrong attempts before correction.
- [ ] The mistake budget remains two scored positions.
- [ ] Exhausting the budget does not interrupt the current Recall pass.
- [ ] After the pass, only positions missed during that pass enter one targeted recovery pass.
- [ ] Correctly recalled positions are not replayed during targeted recovery.
- [ ] Completing targeted recovery banks the line automatically.
- [ ] Missed or assisted positions receive an in-session retry before being scheduled four hours out.
- [ ] Feedback and hint changes use an `aria-live` region and preserve the persistent Board focus/selection contract.
- [ ] Unit coverage proves hint levels, assistance accounting, mistake counting, recovery selection, banking, and schedule reset.
- [ ] Stubbed browser coverage proves the visible hint sequence and that targeted recovery omits clean positions.

