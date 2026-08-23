# Course line audit

Research date: 2026-08-08

## Scope

This ledger covers every authored variation in the four bundled Courses: 72 variations and 460 learner positions. The prior Jobava correction showed that a move can be legal while its teaching claim is wrong, so this audit checks both board truth and practical repertoire quality.

## Criteria

Each variation is reviewed at the learner positions, not only at the final position:

- **Legal sequence:** every authored move is legal and each learner position follows from exactly one opponent reply.
- **Tactical safety:** no avoidable queen/material loss, missed capture, hanging piece, illegal pin claim, or forced tactical refutation.
- **Opening identity:** the line still teaches the named Course and branch rather than drifting into an unrelated system.
- **Practical frequency:** the opponent trigger is a plausible/common response for the intended level, checked against opening references or Lichess Explorer when a line is doubtful.
- **Prose/board agreement:** summaries and explanations describe pieces, threats, blockers, captures, and resulting plans that actually exist in the FEN.
- **Learner-level fit:** beginner lines teach stable principles; intermediate lines introduce common tactical/structural decisions; advanced lines may require sharper theory but remain explainable.
- **Evidence/disposition:** engine output is a review signal, not an automatic verdict. Sound practical alternatives remain verified when they have a coherent plan and no concrete tactical defect.

### Review method

The authored SAN arrays were reconstructed with the existing chess.js path. Structural checks covered all 460 positions and 388 consecutive learner-to-reply links. The vendored Stockfish 18 Lite WASM worker reviewed every position at 250 ms and rechecked material candidates at 700 ms and the confirmed defects at 2 seconds. A move was changed only when board geometry or a concrete tactical consequence contradicted the authored recommendation or explanation.

## Inventory and disposition

| Course | Level | Variation | Kind | Learner positions | Reconstructed line | Disposition |
|---|---|---|---:|---:|---|---|
| Jobava London | beginner | beginner-main | core | 10 | d4 d5 Nc3 Nf6 Bf4 e6 e3 c5 Nb5 Na6 c3 Bd6 Nxd6+ Kf8 Nxc8 Rxc8 Be2 cxd4 exd4 | Corrected — ...Bd6 is met by Nxd6+ and Nxc8 |
| Jobava London | beginner | beginner-alternative | alternative | 5 | d4 d5 Nc3 Nf6 Bf4 c6 e3 Bf5 Bd3 | Verified — no concrete defect found |
| Jobava London | beginner | beginner-meet-g6 | alternative | 8 | d4 d5 Nc3 Nf6 Bf4 g6 e3 Bg7 Nb5 Na6 Nf3 O-O Be2 c6 Nc3 | Verified — no concrete defect found |
| Jobava London | beginner | beginner-meet-c5 | alternative | 7 | d4 d5 Nc3 Nf6 Bf4 c5 e3 Nc6 Nb5 e5 dxe5 Ne4 f3 | Verified — no concrete defect found |
| Jobava London | beginner | beginner-punish | punish | 5 | d4 d5 Nc3 Nf6 Bf4 Bf5 f3 e6 e4 | Verified — no concrete defect found |
| Jobava London | intermediate | intermediate-main | core | 9 | d4 d5 Nc3 Nf6 Bf4 e6 Nb5 Na6 e3 c6 Nc3 Nc7 Nf3 Bd6 Ne5 O-O Bd3 | Verified — no concrete defect found |
| Jobava London | intermediate | intermediate-alternative | alternative | 5 | d4 d5 Nc3 Nf6 Bf4 c6 e3 Qb6 Qc1 | Verified — no concrete defect found |
| Jobava London | intermediate | intermediate-meet-a6 | alternative | 7 | d4 d5 Nc3 Nf6 Bf4 a6 e3 e6 Nf3 c5 Be2 Nc6 O-O | Verified — no concrete defect found |
| Jobava London | intermediate | intermediate-meet-g6 | alternative | 7 | d4 d5 Nc3 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O Be2 c5 O-O | Verified — no concrete defect found |
| Jobava London | intermediate | intermediate-punish | punish | 5 | d4 d5 Nc3 Nf6 Bf4 Bf5 f3 e6 e4 | Verified — no concrete defect found |
| Jobava London | advanced | advanced-main | core | 10 | d4 d5 Nc3 Nf6 Bf4 e6 Nb5 Na6 e3 c6 Nc3 Nc7 Nf3 Bd6 Ne5 O-O Bd3 c5 O-O | Verified — no concrete defect found |
| Jobava London | advanced | advanced-alternative | alternative | 5 | d4 d5 Nc3 Nf6 Bf4 c6 e3 Bf5 Nf3 | Verified — no concrete defect found |
| Jobava London | advanced | advanced-meet-c5 | alternative | 6 | d4 d5 Nc3 Nf6 Bf4 c5 e4 cxd4 Nb5 Na6 Qxd4 | Corrected — removed unsupported “with tempo” claim |
| Jobava London | advanced | advanced-meet-g6 | alternative | 8 | d4 d5 Nc3 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O h3 c5 dxc5 Qa5 Bd3 | Verified — no concrete defect found |
| Jobava London | advanced | advanced-punish | punish | 5 | d4 d5 Nc3 Nf6 Bf4 Bf5 f3 e6 e4 | Verified — no concrete defect found |
| London System | beginner | beginner-main | core | 8 | d4 d5 Nf3 Nf6 Bf4 e6 e3 Bd6 Bd3 O-O O-O c5 c3 Nc6 Nbd2 | Verified — no concrete defect found |
| London System | beginner | beginner-reference | reference | 5 | d4 d5 Nf3 Nf6 Bf4 c5 e3 Nc6 c3 | Verified — no concrete defect found |
| London System | beginner | beginner-meet-g6 | alternative | 7 | d4 d5 Nf3 Nf6 Bf4 g6 e3 Bg7 h3 O-O Be2 c5 O-O | Verified — no concrete defect found |
| London System | beginner | beginner-meet-c6 | alternative | 6 | d4 d5 Nf3 Nf6 Bf4 c6 e3 Bf5 Bd3 e6 O-O | Verified — no concrete defect found |
| London System | beginner | beginner-punish | punish | 5 | d4 d5 Nf3 Nf6 Bf4 Bf5 c4 e6 Nc3 | Corrected — ...Bf5 is an early tempo choice, not a bishop attack |
| London System | intermediate | intermediate-main | core | 9 | d4 d5 Nf3 Nf6 Bf4 e6 e3 c5 c3 Nc6 Nbd2 Bd6 Bd3 O-O O-O Re8 Qe2 | Verified — no concrete defect found |
| London System | intermediate | intermediate-alternative | alternative | 5 | d4 d5 Nf3 Nf6 Bf4 c5 e3 Qb6 Nc3 | Corrected — ...Qb6 pressure on b2 acknowledged |
| London System | intermediate | intermediate-meet-bf5 | alternative | 6 | d4 d5 Nf3 Nf6 Bf4 Bf5 c4 e6 Nc3 c6 e3 | Verified — no concrete defect found |
| London System | intermediate | intermediate-meet-nh5 | alternative | 6 | d4 d5 Nf3 Nf6 Bf4 Nh5 Bg5 h6 Bh4 g5 Bg3 | Verified — no concrete defect found |
| London System | intermediate | intermediate-punish | punish | 5 | d4 d5 Nf3 Nf6 Bf4 Bf5 c4 c6 Nc3 | Corrected — ...Bf5 is an early tempo choice, not a bishop attack |
| London System | advanced | advanced-main | core | 9 | d4 d5 Nf3 Nf6 Bf4 e6 e3 Bd6 Bd3 O-O O-O c5 c3 Nc6 Nbd2 Qc7 Bg5 Re8 | Corrected — Bg5 moves the attacked bishop before ...Bxf4 |
| London System | advanced | advanced-alternative | alternative | 5 | d4 d5 Nf3 Nf6 Bf4 c5 e3 Nc6 c3 | Corrected — ...Qb6 pressure on b2 acknowledged |
| London System | advanced | advanced-meet-g6 | alternative | 7 | d4 d5 Nf3 Nf6 Bf4 g6 e3 Bg7 h3 O-O Be2 c5 O-O | Verified — no concrete defect found |
| London System | advanced | advanced-meet-c6 | alternative | 7 | d4 d5 Nf3 Nf6 Bf4 c6 e3 Bf5 c4 e6 Nc3 Nbd7 Be2 | Verified — no concrete defect found |
| London System | advanced | advanced-poisoned-pawn | punish | 7 | d4 d5 Nf3 Nf6 Bf4 c5 e3 Qb6 Nc3 Qxb2 Nb5 Na6 Rb1 | Verified — no concrete defect found |
| London System | advanced | advanced-punish | punish | 5 | d4 d5 Nf3 Nf6 Bf4 Nh5 Bg5 h6 Bh4 | Verified — no concrete defect found |
| Classical Sicilian | beginner | beginner-main | core | 8 | c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 d6 Bg5 e6 Qd2 Be7 O-O-O O-O | Verified — no concrete defect found |
| Classical Sicilian | beginner | beginner-reference | reference | 4 | c5 Nf3 Nc6 Bb5 g6 O-O Bg7 | Verified — no concrete defect found |
| Classical Sicilian | beginner | beginner-alapin | alternative | 7 | c5 c3 d5 exd5 Qxd5 d4 Nc6 Nf3 Nf6 Be2 cxd4 cxd4 Bf5 | Verified — no concrete defect found |
| Classical Sicilian | beginner | beginner-closed | alternative | 6 | c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 f4 e6 | Verified — no concrete defect found |
| Classical Sicilian | beginner | beginner-smith-morra | alternative | 6 | c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 Nf6 | Verified — no concrete defect found |
| Classical Sicilian | beginner | beginner-punish | punish | 4 | c5 Nf3 Nc6 Bc4 e6 O-O Nf6 | Verified — no concrete defect found |
| Classical Sicilian | intermediate | intermediate-main | core | 9 | c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Bxf6 gxf6 | Verified — no concrete defect found |
| Classical Sicilian | intermediate | intermediate-alternative | alternative | 4 | c5 Nf3 Nc6 Bb5 e6 O-O Nge7 | Verified — no concrete defect found |
| Classical Sicilian | intermediate | intermediate-grand-prix | alternative | 6 | c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bb5 Nd4 O-O e6 | Verified — no concrete defect found |
| Classical Sicilian | intermediate | intermediate-delayed-alapin | alternative | 6 | c5 Nf3 Nc6 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 d6 | Verified — no concrete defect found |
| Classical Sicilian | intermediate | intermediate-anti-sveshnikov | alternative | 6 | c5 Nf3 Nc6 Nc3 e5 Bc4 Be7 d3 d6 O-O Nf6 | Verified — no concrete defect found |
| Classical Sicilian | intermediate | intermediate-smith-morra-accepted | alternative | 7 | c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 e6 Bc4 Qc7 O-O Nf6 | Verified — no concrete defect found |
| Classical Sicilian | intermediate | intermediate-punish | punish | 4 | c5 Nf3 Nc6 Bc4 e6 d3 Nf6 | Verified — no concrete defect found |
| Classical Sicilian | advanced | advanced-main | core | 10 | c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Bxf6 gxf6 Nd5 Bg7 | Verified — no concrete defect found |
| Classical Sicilian | advanced | advanced-alternative | alternative | 5 | c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 e5 | Verified — no concrete defect found |
| Classical Sicilian | advanced | advanced-richter-rauzer | alternative | 8 | c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 d6 Bg5 e6 Qd2 Be7 O-O-O O-O | Verified — no concrete defect found |
| Classical Sicilian | advanced | advanced-sozin | alternative | 8 | c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 d6 Bc4 e6 Bb3 Be7 O-O O-O | Verified — no concrete defect found |
| Classical Sicilian | advanced | advanced-classical-be2 | alternative | 8 | c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 d6 Be2 e5 Nb3 Be7 O-O O-O | Verified — no concrete defect found |
| Classical Sicilian | advanced | advanced-closed-fianchetto | alternative | 8 | c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 f4 e6 Nf3 Nge7 O-O O-O | Verified — no concrete defect found |
| Classical Sicilian | advanced | advanced-punish | punish | 5 | c5 Nf3 Nc6 Bc4 e6 O-O a6 a4 Nf6 | Verified — no concrete defect found |
| Classical Caro-Kann | beginner | beginner-main | core | 9 | c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 Nf3 Nd7 h4 h6 h5 Bh7 Bd3 Bxd3 | Verified — no concrete defect found |
| Classical Caro-Kann | beginner | beginner-alternative | alternative | 4 | c6 d4 d5 exd5 cxd5 Bd3 Nc6 | Verified — no concrete defect found |
| Classical Caro-Kann | beginner | beginner-advance | alternative | 6 | c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 O-O Nc6 | Verified — no concrete defect found |
| Classical Caro-Kann | beginner | beginner-two-knights | alternative | 6 | c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 d4 Nf6 | Verified — no concrete defect found |
| Classical Caro-Kann | beginner | beginner-fantasy | alternative | 5 | c6 d4 d5 f3 e6 Nc3 Nf6 e5 Nfd7 | Verified — no concrete defect found |
| Classical Caro-Kann | beginner | beginner-hillbilly | alternative | 5 | c6 Bc4 d5 exd5 cxd5 Bb5+ Nc6 d4 Nf6 | Verified — no concrete defect found |
| Classical Caro-Kann | beginner | beginner-punish | punish | 4 | c6 d4 d5 Bd3 dxe4 Bxe4 Nf6 | Verified — no concrete defect found |
| Classical Caro-Kann | intermediate | intermediate-main | core | 9 | c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 Nf3 Nd7 Bd3 e6 O-O Ngf6 Re1 Be7 | Verified — no concrete defect found |
| Classical Caro-Kann | intermediate | intermediate-alternative | alternative | 4 | c6 d4 d5 exd5 cxd5 c4 Nf6 | Verified — no concrete defect found |
| Classical Caro-Kann | intermediate | intermediate-panov | alternative | 6 | c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Bb4 | Verified — no concrete defect found |
| Classical Caro-Kann | intermediate | intermediate-advance-short | alternative | 6 | c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 O-O Nc6 | Verified — no concrete defect found |
| Classical Caro-Kann | intermediate | intermediate-advance-tal | alternative | 5 | c6 d4 d5 e5 Bf5 h4 h6 g4 Bd7 | Verified — no concrete defect found |
| Classical Caro-Kann | intermediate | intermediate-fantasy | alternative | 6 | c6 d4 d5 f3 e6 Nc3 Nf6 e5 Nfd7 f4 c5 | Verified — no concrete defect found |
| Classical Caro-Kann | intermediate | intermediate-punish | punish | 4 | c6 d4 d5 Bd3 dxe4 Bxe4 Nf6 | Verified — no concrete defect found |
| Classical Caro-Kann | advanced | advanced-main | core | 9 | c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 N1e2 Nd7 Bf4 e6 Qd2 Ngf6 O-O-O Nd5 | Corrected — ...Nd5 replaces the bishop-hanging ...Bb4 |
| Classical Caro-Kann | advanced | advanced-alternative | alternative | 5 | c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 Nc6 | Verified — no concrete defect found |
| Classical Caro-Kann | advanced | advanced-panov-main | alternative | 9 | c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Bb4 cxd5 exd5 Bd3 O-O O-O Nc6 | Verified — no concrete defect found |
| Classical Caro-Kann | advanced | advanced-advance-van-der-wiel | alternative | 6 | c6 d4 d5 e5 Bf5 Nc3 e6 g4 Bg6 Nge2 c5 | Verified — no concrete defect found |
| Classical Caro-Kann | advanced | advanced-classical-tartakower | alternative | 7 | c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 Nf3 Bd6 Bd3 O-O | Verified — no concrete defect found |
| Classical Caro-Kann | advanced | advanced-two-knights-exchange | alternative | 7 | c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 d4 Nf6 Bd3 dxe4 | Verified — no concrete defect found |
| Classical Caro-Kann | advanced | advanced-punish | punish | 5 | c6 d4 d5 Bd3 dxe4 Bxe4 Nf6 Nc3 Nbd7 | Verified — no concrete defect found |

## Confirmed corrections

### Jobava: ...Bd6 after ...c5 and ...Na6

The old position was FEN `r1bqk2r/pp3ppp/n2bpn2/1Npp4/3P1B2/2P1P3/PP3PPP/R2QKBNR w KQkq - 1 7`, where the authored move was `Bd3`. The concrete line `Nxd6+ Kf8 Nxc8 Rxc8` takes both bishops before consolidating. With Black's c-pawn already on c5, neither c-pawn nor e-pawn can safely recapture on d6. This agrees with the Jobava Nb5 guidance in [Attacking Chess](https://www.attackingchess.com/how-to-play-the-jobava-london-system-nb5-trap-attacking-plans-and-key-lines/), which advises taking the bishop after ...Bd6.

### London: ...Qc7 attacks the f4 bishop

The old advanced main line played `Qe2` while the bishop remained on f4 and Black's bishop sat on d6. Stockfish's 2-second principal variation was `...Bxf4 exf4 Qxf4`, turning the move-order choice into a structural/pawn concession. The corrected move is `Bg5`, which moves the attacked bishop before the exchange.

### Caro-Kann: ...Bb4 does not pin the moved knight

The old advanced Classical line played `...Bb4` after White had already moved the c3 knight to e2. In the resulting FEN, `Qxb4` is legal and captures the bishop. The corrected move is `...Nd5`. The [Classical System reference](https://www.modern-chess.com/opening/caro-kann-defense-classical-system/) supports the broader practical principle of challenging the centre and completing development; the exact bishop geometry and replacement move were verified locally.

### London ...Qb6 and early ...Bf5 wording

The revised explanations no longer claim that `Nc3` defends b2 or that `...Qb6` leaves b2 without a target. The [London anti-...c5/...Qb6 reference](https://www.chessworld.net/london-system-anti-c5-qb6.asp) explicitly describes `...Qb6` as an attack on b2 and recommends a concrete response. The early `...Bf5` summaries now describe Black's lost development tempo rather than claiming that c4 attacks the bishop.

## Accepted practical alternatives

Several engine mismatches were reviewed and intentionally retained because they were sound repertoire choices rather than tactical defects: the corrected Jobava Qc1 response to ...Qb6, the Jobava ...Bf5/e4 attacking plan, the early ...c5/Qxd4 line, and normal London bishop retreats or exchanges after ...Bd6. The practical-soundness decision means these are not rewritten solely because a short engine search prefers another move.

## Evidence log

| Location | Finding | Evidence | Action |
|---|---|---|---|
| jobava-london/beginner/beginner-main | ...Bd6 allowed Nxd6+ and Nxc8; old Bd3 missed a concrete bishop sequence. | FEN above; Stockfish 18 at 2 seconds; Attacking Chess Jobava reference. | Corrected move sequence and explanations; added regression. |
| london-system/advanced/advanced-main | Qe2 left the f4 bishop exposed to ...Bxf4; ...Qc7 made the queen recapture possible. | Stockfish 18 PV Bxf4 exf4 Qxf4; chess.js legal-move check. | Changed Qe2 to Bg5; added regression. |
| classical-caro-kann/advanced/advanced-main | ...Bb4 was not a pin after N1e2; Qxb4 captured the bishop. | chess.js confirms Qxb4; Stockfish 18 prefers Nd5. | Changed ...Bb4 to ...Nd5; added regression. |
| london-system/intermediate/intermediate-alternative | Nc3 was described as defending b2 after ...Qb6, but the knight does not do that. | London anti-...c5/...Qb6 reference; board geometry. | Kept the practical Nc3 move but corrected the explanation. |
| london-system/advanced/advanced-alternative | c3 was described as leaving ...Qb6 without a target even though ...Qb6 attacks b2. | London anti-...c5/...Qb6 reference; board geometry. | Corrected the explanation. |
| london-system/*-punish | c4 was described as attacking/exposing the early ...Bf5 bishop. | Board geometry; practical opening review. | Reframed both summaries around the lost development tempo. |
| jobava-london/advanced/advanced-meet-c5 | Qxd4 was called a tempo gain without a concrete tempo claim. | Board geometry; engine review retained the practical move. | Corrected the explanation only. |

## Source-access note

The exact Lichess Explorer FEN queries were attempted during the audit, but the live `explorer.lichess.ovh` endpoint returned HTTP 401 in this environment. No live frequency claim is presented here; the flagged lines were cross-checked against the fetched opening references and local chess.js/Stockfish board evidence instead.

## Sources

- [Lichess chess-openings](https://github.com/lichess-org/chess-openings)
- [Lichess Opening Explorer](https://lichess.org/api#tag/Opening-Explorer)
- [Lichess open database](https://database.lichess.org/)
- [Wikibooks Chess Opening Theory](https://en.wikibooks.org/wiki/Chess_Opening_Theory)

The authored explanations remain original. External sources are used to check classification and practical branch relevance, not copied as lesson text.
