# Chess Opening Practice

A practice app for drilling chess opening repertoires. A learner works through curated lines
move by move until each one is committed to memory, then returns to them on a review schedule.

## Language

### Product identity

**LINE/64**:
The canonical product experience and identity for the chess-opening practice app.
_Avoid_: Line_64 (the design-package name), redesign

### Repertoire structure

**Course**:
A curated opening program that groups named lines into level bands. A learner enters a Course
before choosing a level or line.
_Avoid_: Course card, opening, repertoire

**Banked Line**:
A line saved automatically after the learner completes a clean recall pass. It can enter scheduled
review but is not necessarily mastered.
_Avoid_: Saved line, completed line, mastered line

### Board tempo

**Move Animation**:
The visual slide of a piece from its origin square to its destination. Its length is a device
preference the learner sets in Settings, and it is suppressed entirely for a learner who prefers
reduced motion.
_Avoid_: Move duration (that is the preference, not the animation), transition

**Move Beat**:
The deliberate pause offered around an opponent reply, giving the learner time to register what was
played before the next prompt arrives. Distinct from Move Animation: a beat is empty time, not
movement, so it survives a reduced-motion preference. A learner who sets the animation to zero is
asking for no tempo at all, and that suppresses the beats too. A beat is a ceiling rather than a
fixed length, because the learner can end it early with a Tempo Cut.
_Avoid_: Delay, pacing, settle time

**Tempo Cut**:
The learner reaching for the board before the tempo has finished, which abandons the remaining
Move Animation and Move Beats and settles the position at once. An offer of time that the learner
declines, available in every Drill Phase.
_Avoid_: Snap, skip, interrupt, premove

### Engine read

**Eval Bar**:
The running read on who stands better in the position on the board, always oriented to the
learner's side rather than to the side to move.
_Avoid_: Evaluation meter, engine meter, gauge

**Provisional Score**:
An in-progress reading the engine offers while it is still searching. Shown on the Eval Bar so the
learner watches it converge, then discarded.
_Avoid_: Partial score, interim score

**Settled Score**:
The engine's final reading for a position. The only one worth keeping: it is what the Eval Bar
rests on, what a revisit of the position reuses, and what a mistake is measured against.
_Avoid_: Final score, best score

### Drill

**Practice Mode**:
The learner's assistance choice within a Drill Phase: `Learn` reveals the move guide and records an
assisted outcome, while `Drill` withholds the guide and permits clean recall. Changing Practice Mode
does not change phase progression.
_Avoid_: Drill Phase, mode override

**Drill Phase**:
Which of the three stages a learner is currently in for a line: `teach`, where the move guide is
shown and mistakes are not scored; `recall`, where the guide is withheld and the line must be
produced from memory; or `review`, a later return to a line that has already been banked.
_Avoid_: Practice Mode, mode
