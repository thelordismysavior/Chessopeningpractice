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
  id: 'jobava-london' | 'london-system' | 'classical-sicilian' | 'classical-caro-kann';
  name: string;
  side: 'white' | 'black';
  coreLine: string;
  description: string;
  eco: string;
  sources: string[];
  lessons: Record<LevelKey, Lesson>;
};

export type AttributionSource = {
  name: string;
  description: string;
  url: string;
};

export const ATTRIBUTION_SOURCES: AttributionSource[] = [
  { name: 'Lichess chess-openings', description: 'CC0 opening names, ECO metadata, and canonical lines used to classify the bundled courses.', url: 'https://github.com/lichess-org/chess-openings' },
  { name: 'Lichess Opening Explorer', description: 'Reference for opening branches and move-order research; v1 does not request live statistics.', url: 'https://lichess.org/api#tag/Opening-Explorer' },
  { name: 'Lichess open database', description: 'CC0 database reference for reproducible opening research.', url: 'https://database.lichess.org/' },
  { name: 'Wikibooks Chess Opening Theory', description: 'Linked explanatory reference; all lesson explanations in this app are original.', url: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory' },
];

function toUci(move: Move): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

function positionLine(idPrefix: string, side: Course['side'], moves: string[], explanations: string[]): PracticePosition[] {
  const chess = new Chess();
  const positions: PracticePosition[] = [];

  for (const san of moves) {
    if (chess.turn() === (side === 'white' ? 'w' : 'b')) {
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

function lesson(side: Course['side'], level: LevelKey, title: string, summary: string, moves: string[], explanations: string[]): Lesson {
  return { level, title, summary, positions: positionLine(`${level}`, side, moves, explanations) };
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

jobavaExplanations[5] = 'Develop the bishop to d3 to challenge the active setup and prepare castling.';

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
  'Develop the king knight and prepare to castle; avoid spending tempi on a premature flank pawn.',
  'Recapture with the queen to keep the centre supported.',
  'Castle now that the king-side pieces are developed; delaying the king is the common mistake.',
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
  'Build the structure and keep the f1 bishop active; avoid closing it with a premature e3.',
  'Develop the f1 bishop and invite ...Be7; if ...Bxd3 comes, Qxd3 keeps central pressure.',
  'Castle before ...c5 opens the centre; the common mistake is leaving the king in the middle.',
  'Develop the queen knight and support the centre.',
  'Use c3 to reinforce d4 and prepare e4 after ...c5 and ...d5; do not rush the break.',
];
londonAdvancedExplanations[2] = 'Meet ...b6 with Bf4 before e3, keeping the c1 bishop active and pressuring c7.';

const sicilianBeginnerExplanations = [
  'Meet 1.e4 with the immediate central break that defines the Sicilian.',
  'Develop the queen knight and support pressure on the d4 square.',
  'Exchange on d4 to challenge White\'s centre before it can advance.',
  'Develop with tempo against the e4 pawn and prepare to castle.',
  'Keep the position flexible with ...d6 and support a sound central structure.',
  'Play ...e6 to secure d5 and open the king bishop.',
  'Develop the king bishop and prepare safe castling.',
  'Castle to connect the king and rook before the middlegame opens.',
  'Place the rook on the open e-file and keep pressure on White\'s centre.',
  'Recapture toward the centre and accept a useful open file for Black.',
];

const sicilianIntermediateExplanations = [
  'Choose the Sicilian break and fight for the initiative from move one.',
  'Develop the knight to its most active square and keep ...d5 available.',
  'Remove the d4 pawn so White cannot build an unchecked centre.',
  'Hit e4 while completing development toward castling.',
  'Use ...e5 to claim space and make the c3 knight find a precise route.',
  'Support the centre and prepare to challenge White\'s active pieces.',
  'Ask the b5 knight a question and gain time for queenside expansion.',
  'Advance ...b5 to gain space and support a dynamic Sicilian structure.',
];

const sicilianAdvancedExplanations = [
  'Start the Sicilian and accept a dynamic position where Black contests the centre immediately.',
  'Develop with pressure on d4 and keep the option of ...e5.',
  'Exchange on d4 before White can consolidate the central pawns.',
  'Develop actively against e4 and prepare the standard ...e5 break.',
  'Take space with ...e5, accepting a backward development tempo for central control.',
  'Support the advanced centre and make the b5 square part of the plan.',
  'Gain time against the knight and prepare a queenside pawn storm.',
  'Use ...b5 to gain space before White can complete a quiet setup.',
  'Open the a-file and remove the b5 pawn from White\'s advanced knight.',
  'Accept doubled f-pawns to open lines and keep the bishop pair under pressure.',
];

const caroKannBeginnerExplanations = [
  'Support the d5 break with a solid structure rather than exposing the king early.',
  'Claim the centre while keeping the light-square bishop free.',
  'Recapture on e4 and make White spend a tempo before developing.',
  'Develop the light-square bishop outside the pawn chain, the Caro-Kann\'s key idea.',
  'Develop the queen knight and reinforce the central squares.',
  'Keep the bishop safe while preparing ...e6 and a complete setup.',
  'Build a sturdy chain and open the dark-square bishop.',
  'Complete development and prepare to challenge White\'s centre.',
];

const caroKannIntermediateExplanations = [
  'Choose the resilient Caro-Kann structure and prepare a healthy central break.',
  'Take space with ...d5 while preserving the c8 bishop\'s diagonal.',
  'Recover the pawn with a developing move and make White reveal the plan.',
  'Develop the bishop actively before closing it with ...e6.',
  'Retreat to g6 when challenged, keeping the bishop useful on the long diagonal.',
  'Develop the b8 knight and support ...e6 and ...Ngf6.',
  'Close the centre only after the bishop has escaped the pawn chain.',
  'Develop the king knight and contest White\'s central outpost.',
  'Prepare to castle and coordinate the king-side pieces.',
];

const caroKannAdvancedExplanations = [
  'Use the Caro-Kann to build a durable centre and keep the c8 bishop active.',
  'Establish the central pawn before White can choose a quieter setup.',
  'Accept the temporary pawn sacrifice and plan to regain it with development.',
  'Develop outside the chain so the bishop does not become a passive defender.',
  'Keep the bishop on the g6 diagonal after White questions it with Ng3.',
  'Develop the king knight without blocking the c8 bishop or the queen.',
  'Place the queen knight on d7 to support ...e6 and control e5.',
  'Play ...e6 only after the bishop is safe, preserving the opening\'s central logic.',
  'Use ...Bb4 to pin the knight and make White spend time on the queenside.',
  'Retreat to a5 while preserving the pin and the bishop\'s active diagonal.',
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
      beginner: lesson('white', 'beginner', 'Build the setup', 'Learn the three core moves and the shape of the position.', ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'e6', 'e3', 'c5', 'Nf3', 'Nc6', 'Bd3', 'Bd6', 'O-O', 'O-O', 'Qd2', 'Re8'], jobavaExplanations),
      intermediate: lesson('white', 'intermediate', 'Meet the active defence', 'Keep your pieces active when Black develops with ...Bb4.', ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'e6', 'e3', 'Bb4', 'Nge2', 'O-O', 'a3', 'Bxc3+', 'Nxc3', 'c5', 'Bd3', 'Nc6'], jobavaIntermediateExplanations),
      advanced: lesson('white', 'advanced', 'Play for the initiative', 'Recognise the tactical bishop trade and keep a useful lead in development.', ['d4', 'Nf6', 'Nc3', 'd5', 'Bf4', 'Bf5', 'e3', 'e6', 'Bd3', 'Be7', 'Nf3', 'Bxd3', 'Qxd3', 'c5', 'O-O', 'Nc6'], jobavaAdvancedExplanations),
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
      beginner: lesson('white', 'beginner', 'Build the system', 'Learn the reliable setup that makes the London easy to repeat.', ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'e6', 'e3', 'Bd6', 'Bd3', 'O-O', 'O-O', 'c5', 'c3', 'Nc6', 'Nbd2', 'Re8'], londonBeginnerExplanations),
      intermediate: lesson('white', 'intermediate', 'Handle central tension', 'Develop naturally while watching for ...c5 and ...Bd6.', ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'e6', 'e3', 'c5', 'c3', 'Nc6', 'Nbd2', 'Bd6', 'Bd3', 'O-O', 'O-O', 'Re8'], londonIntermediateExplanations),
      advanced: lesson('white', 'advanced', 'Use the full structure', 'Finish development and prepare the central break that gives the system bite.', ['d4', 'Nf6', 'Nf3', 'e6', 'Bf4', 'b6', 'e3', 'Bb7', 'Bd3', 'Be7', 'O-O', 'O-O', 'Nbd2', 'c5', 'c3', 'd5'], londonAdvancedExplanations),
    },
  },
  {
    id: 'classical-sicilian',
    name: 'Classical Sicilian',
    side: 'black',
    coreLine: '1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3',
    description: 'A principled response to 1.e4 that contests the centre at once.',
    eco: 'B32',
    sources: ['https://github.com/lichess-org/chess-openings', 'https://lichess.org/api#tag/Opening-Explorer', 'https://database.lichess.org/', 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/Sicilian_Defence'],
    lessons: {
      beginner: lesson('black', 'beginner', 'Build the Sicilian', 'Learn the core move order and a reliable first setup for Black.', ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'd6', 'Be2', 'e6', 'O-O', 'Be7', 'f4', 'O-O', 'Qd2', 'Re8', 'Nxc6', 'bxc6'], sicilianBeginnerExplanations),
      intermediate: lesson('black', 'intermediate', 'Take dynamic space', 'Use ...e5 and queenside expansion to meet White\'s active pieces.', ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6', 'Bg5', 'a6', 'Na3', 'b5'], sicilianIntermediateExplanations),
      advanced: lesson('black', 'advanced', 'Play the open Sicilian', 'Recognise the tempo-gaining ...a6 and ...b5 plan before opening lines.', ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6', 'Bg5', 'a6', 'Na3', 'b5', 'Naxb5', 'axb5', 'Bxf6', 'gxf6'], sicilianAdvancedExplanations),
    },
  },
  {
    id: 'classical-caro-kann',
    name: 'Classical Caro-Kann',
    side: 'black',
    coreLine: '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5',
    description: 'A solid central defence that develops the light-square bishop early.',
    eco: 'B18',
    sources: ['https://github.com/lichess-org/chess-openings', 'https://lichess.org/api#tag/Opening-Explorer', 'https://database.lichess.org/', 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/Caro-Kann_Defence'],
    lessons: {
      beginner: lesson('black', 'beginner', 'Build the Caro-Kann', 'Learn the solid structure and the bishop development that define the defence.', ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Nf3', 'Nd7', 'Bd3', 'Bg6', 'O-O', 'e6', 'Re1', 'Ngf6'], caroKannBeginnerExplanations),
      intermediate: lesson('black', 'intermediate', 'Keep the bishop active', 'Meet natural development while preserving the Caro-Kann\'s best piece.', ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Nf3', 'Bg6', 'Bd3', 'Nd7', 'O-O', 'e6', 'Re1', 'Ngf6', 'Bf4', 'Be7'], caroKannIntermediateExplanations),
      advanced: lesson('black', 'advanced', 'Use the full structure', 'Combine active bishop play with a flexible king-side and queenside plan.', ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'N1e2', 'Nd7', 'Bf4', 'e6', 'Qd2', 'Ngf6', 'O-O-O', 'Bb4', 'a3', 'Ba5'], caroKannAdvancedExplanations),
    },
  },
];

export const coursesById = Object.fromEntries(COURSES.map((course) => [course.id, course])) as Record<Course['id'], Course>;
