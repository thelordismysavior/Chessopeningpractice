import { Chess, type Move, type Square } from 'chess.js';

export type LevelKey = 'beginner' | 'intermediate' | 'advanced';
export const LEVELS: LevelKey[] = ['beginner', 'intermediate', 'advanced'];

export type PracticePosition = {
  id: string;
  fen: string;
  expectedMove: string;
  expectedSan: string;
  explanation: string;
};

export type Lesson = {
  level: LevelKey;
  title: string;
  summary: string;
  positions: PracticePosition[];
};

export type Course = {
  id: 'jobava-london' | 'london-system';
  name: string;
  side: 'white';
  coreLine: string;
  description: string;
  eco: string;
  sources: string[];
  lessons: Record<LevelKey, Lesson>;
};

function toUci(move: Move): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

function positionLine(idPrefix: string, moves: string[], explanations: string[]): PracticePosition[] {
  const chess = new Chess();
  const positions: PracticePosition[] = [];

  for (const san of moves) {
    if (chess.turn() === 'w') {
      const before = chess.fen();
      const move = chess.move(san);
      positions.push({
        id: `${idPrefix}-${positions.length + 1}`,
        fen: before,
        expectedMove: toUci(move),
        expectedSan: move.san,
        explanation: explanations[positions.length],
      });
    } else {
      chess.move(san);
    }
  }

  return positions;
}

function lesson(level: LevelKey, title: string, summary: string, moves: string[], explanations: string[]): Lesson {
  return { level, title, summary, positions: positionLine(`${level}`, moves, explanations) };
}

const jobavaExplanations = [
  'Claim the centre with a pawn and prepare active piece play.',
  'Develop the queen knight to pressure d5 and make the opening immediately active.',
  'Develop the bishop outside the pawn chain before playing e3.',
  'Support the centre and open the f1 bishop without losing flexibility.',
  'Bring the other knight toward the centre and connect the pieces.',
  'Trade or challenge the active bishop when it offers itself on d3.',
  'Castle before launching a flank plan; the king is ready for the middlegame.',
  'Coordinate the queen with the bishops and keep pressure on the centre.',
];

const jobavaIntermediateExplanations = [
  'Claim the centre with a pawn and prepare active piece play.',
  'Develop the queen knight to pressure d5 immediately.',
  'Develop the bishop outside the pawn chain before e3.',
  'Support the centre while keeping the f1 bishop free.',
  'Bring the king knight toward the centre and keep castling available.',
  'Question the bishop pin before it can disturb your development.',
  'Recapture toward the centre and restore control of the key squares.',
  'Develop the bishop to d3 and prepare safe castling.',
];

const jobavaAdvancedExplanations = [
  'Claim the centre while keeping the position flexible against ...Nf6.',
  'Develop the queen knight and support pressure on d5.',
  'Place the bishop outside the pawn chain before Black settles.',
  'Build a stable centre and open the f1 bishop.',
  'Offer the bishop trade to remove Black’s active defender.',
  'Develop the king knight and prepare to castle.',
  'Recapture with the queen to keep the centre supported.',
  'Castle now that the king-side pieces are developed.',
];

const londonBeginnerExplanations = [
  'Start with a stable central pawn and make the intended structure clear.',
  'Develop the king knight to control e5 and support a flexible setup.',
  'Place the dark-square bishop outside the pawn chain before e3.',
  'Build a solid centre while keeping the c1 bishop active on f4.',
  'Develop the f1 bishop and prepare to castle.',
  'Castle to finish the basic setup and keep the king safe.',
  'Use c3 to support d4 and prepare a calm central expansion.',
  'Complete development and connect the rooks before choosing a plan.',
];

const londonIntermediateExplanations = [
  'Start with a stable central pawn and keep the plan flexible.',
  'Develop the king knight to control e5 and support the centre.',
  'Place the bishop outside the pawn chain before e3.',
  'Build the structure while watching Black’s central break.',
  'Support d4 and prepare a solid response to ...c5.',
  'Develop the queen knight and keep the bishop pair coordinated.',
  'Develop the f1 bishop before castling.',
  'Castle once the king-side pieces are ready.',
];

const londonAdvancedExplanations = [
  'Start with a stable central pawn while keeping options against ...Nf6.',
  'Develop the king knight and prepare the dark-square bishop’s route.',
  'Place the bishop outside the pawn chain before e3.',
  'Build the structure and keep the f1 bishop active.',
  'Develop the f1 bishop and connect the king-side pieces.',
  'Castle before the central tension opens.',
  'Develop the queen knight and support the centre.',
  'Use c3 to reinforce d4 and prepare the central break.',
];

export const COURSES: Course[] = [
  {
    id: 'jobava-london',
    name: 'Jobava London',
    side: 'white',
    coreLine: '1. d4 d5 2. Nc3 Nf6 3. Bf4',
    description: 'An assertive London setup with early pressure on the centre.',
    eco: 'D00',
    sources: ['https://github.com/lichess-org/chess-openings', 'https://en.wikibooks.org/wiki/Chess_Opening_Theory'],
    lessons: {
      beginner: lesson('beginner', 'Build the setup', 'Learn the three core moves and the shape of the position.', ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'e6', 'e3', 'c5', 'Nf3', 'Nc6', 'Bd3', 'Bd6', 'O-O', 'O-O', 'Qd2', 'Re8'], jobavaExplanations),
      intermediate: lesson('intermediate', 'Meet the active defence', 'Keep your pieces active when Black develops with ...Bb4.', ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'e6', 'e3', 'Bb4', 'Nge2', 'O-O', 'a3', 'Bxc3+', 'Nxc3', 'c5', 'Bd3', 'Nc6'], jobavaIntermediateExplanations),
      advanced: lesson('advanced', 'Play for the initiative', 'Recognise the tactical bishop trade and keep a useful lead in development.', ['d4', 'Nf6', 'Nc3', 'd5', 'Bf4', 'Bf5', 'e3', 'e6', 'Bd3', 'Be7', 'Nf3', 'Bxd3', 'Qxd3', 'c5', 'O-O', 'Nc6'], jobavaAdvancedExplanations),
    },
  },
  {
    id: 'london-system',
    name: 'London System',
    side: 'white',
    coreLine: '1. d4 d5 2. Nf3 Nf6 3. Bf4',
    description: 'A dependable structure built around a safe king and clear plans.',
    eco: 'D02',
    sources: ['https://github.com/lichess-org/chess-openings', 'https://en.wikibooks.org/wiki/Chess_Opening_Theory'],
    lessons: {
      beginner: lesson('beginner', 'Build the system', 'Learn the reliable setup that makes the London easy to repeat.', ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'e6', 'e3', 'Bd6', 'Bd3', 'O-O', 'O-O', 'c5', 'c3', 'Nc6', 'Nbd2', 'Re8'], londonBeginnerExplanations),
      intermediate: lesson('intermediate', 'Handle central tension', 'Develop naturally while watching for ...c5 and ...Bd6.', ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'e6', 'e3', 'c5', 'c3', 'Nc6', 'Nbd2', 'Bd6', 'Bd3', 'O-O', 'O-O', 'Re8'], londonIntermediateExplanations),
      advanced: lesson('advanced', 'Use the full structure', 'Finish development and prepare the central break that gives the system bite.', ['d4', 'Nf6', 'Nf3', 'e6', 'Bf4', 'b6', 'e3', 'Bb7', 'Bd3', 'Be7', 'O-O', 'O-O', 'Nbd2', 'c5', 'c3', 'd5'], londonAdvancedExplanations),
    },
  },
];

export const coursesById = Object.fromEntries(COURSES.map((course) => [course.id, course])) as Record<Course['id'], Course>;
