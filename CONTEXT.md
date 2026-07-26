# Chess Practice

Chess Practice teaches a fixed opening repertoire through guided positions and clean-run recall.

## Language

**Variation**:
One continuous line of play within a lesson, from the starting position to a playable middlegame. A lesson holds three: the main line, the alternative, and the punish line.
_Avoid_: Branch, sub-line, path

**Banked variation**:
A variation the learner has finished without a mistake. Banking is per variation: a slip replays only that variation, and a lesson completes when all three are banked.
_Avoid_: Cleared, passed, mastered

**Move guide**:
A persistent visual preview of the repertoire move, shown before every move in a regular lesson as a green directional arrow from the origin square to the destination. It is hidden when a review position first appears.
_Avoid_: Hint, suggestion, answer

**Review session**:
A recall check containing previously missed positions, initially presented without a move guide. Its move guide appears after the first scored mistake so the retry teaches the correction.
_Avoid_: Lesson, guided practice

**Opponent reply**:
The repertoire response that plays automatically after a correct learner move and before the next move guide appears.
_Avoid_: Computer move, AI move

**Mistake feedback**:
The response to a legal move outside the repertoire: the learner's piece returns to its origin, the attempted route flashes red, the current position remains active, and the clean run ends.
_Avoid_: Error state, illegal drop

**Illegal drop**:
An impossible chess move or stray piece drop that receives the same red visual response without counting as an attempt or ending the clean run.
_Avoid_: Mistake, failed attempt

**Move duration**:
The device-local animation time, in milliseconds, shared by every learner move and opponent reply, including castling and captures. It defaults to 200 and accepts values from 0 to 2000 in increments of 50.
_Avoid_: Animation speed, transition time
