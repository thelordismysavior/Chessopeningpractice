# Chess Opening Practice

A practice app for drilling chess opening repertoires. A learner works through curated lines
move by move until each one is committed to memory, then returns to them on a review schedule.

## Language

### Board tempo

**Move Animation**:
The visual slide of a piece from its origin square to its destination. Its length is a device
preference the learner sets in Settings, and it is suppressed entirely for a learner who prefers
reduced motion.
_Avoid_: Move duration (that is the preference, not the animation), transition

**Move Beat**:
The deliberate pause held around an opponent reply, giving the learner time to register what was
played before the next prompt arrives. Distinct from Move Animation: a beat is empty time, not
movement, so it survives a reduced-motion preference. A learner who sets the animation to zero is
asking for no tempo at all, and that suppresses the beats too.
_Avoid_: Delay, pacing, settle time

### Drill

**Drill Phase**:
Which of the three modes a learner is currently in for a line: `teach`, where the move guide is
shown and mistakes are not scored; `recall`, where the guide is withheld and the line must be
produced from memory; or `review`, a later return to a line that has already been banked.
