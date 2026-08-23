import { Chess, type Move } from 'chess.js';

export type LevelKey = 'beginner' | 'intermediate' | 'advanced';
export const LEVELS: LevelKey[] = ['beginner', 'intermediate', 'advanced'];

export type PracticePosition = {
  id: string;
  fen: string;
  expectedMove: string;
  expectedSan: string;
  explanation: string;
};

export type VariationKind = 'core' | 'alternative' | 'reference' | 'punish';

export type Variation = {
  id: string;
  kind: VariationKind;
  title: string;
  summary: string;
  evalCp: number;
  positions: PracticePosition[];
};

export type LessonIdea = {
  anchorFen: string;
  anchorSan: string;
  plan: string;
  opponentTrigger: string;
  resultingPlan: string;
};

export type Lesson = {
  level: LevelKey;
  title: string;
  summary: string;
  variations: Variation[];
  positions: PracticePosition[];
  lessonIdea: LessonIdea;
};

export type Course = {
  id: 'jobava-london' | 'london-system' | 'classical-sicilian' | 'classical-caro-kann';
  name: string;
  side: 'white' | 'black';
  coreLine: string;
  description: string;
  promise: string;
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

type VariationDraft = {
  id?: string;
  kind: VariationKind;
  title: string;
  summary: string;
  evalCp: number;
  moves: string[];
  explanations: string[];
};

function lessonIdea(variations: Variation[]): LessonIdea {
  const core = variations.find((variation) => variation.kind === 'core') ?? variations[0];
  const branch = variations.find((variation) => variation.kind === 'alternative' || variation.kind === 'punish') ?? core;
  const anchor = core.positions[0];
  return {
    anchorFen: anchor.fen,
    anchorSan: anchor.expectedSan,
    plan: core.summary,
    opponentTrigger: `${branch.title}: ${branch.summary.split(';')[0]}`,
    resultingPlan: core.positions.at(-1)?.explanation ?? core.summary,
  };
}

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

function lesson(side: Course['side'], level: LevelKey, title: string, summary: string, drafts: VariationDraft[]): Lesson {
  const variations = drafts.map((draft) => {
    const id = `${level}-${draft.id ?? (draft.kind === 'core' ? 'main' : draft.kind)}`;
    return {
    id,
    kind: draft.kind,
    title: draft.title,
    summary: draft.summary,
    evalCp: draft.evalCp,
    positions: positionLine(id, side, draft.moves, draft.explanations),
    };
  });
  return {
    level,
    title,
    summary,
    variations,
    positions: variations.flatMap((variation) => variation.positions),
    lessonIdea: lessonIdea(variations),
  };
}

export const COURSES: Course[] = [
  {
    id: 'jobava-london',
    name: 'Jobava London',
    side: 'white',
    coreLine: '1. d4 d5 2. Nc3 Nf6 3. Bf4',
    description: 'An assertive London setup with early pressure on the centre.',
    promise: 'Build an active white setup that makes Black answer your plans early.',
    eco: 'D00',
    sources: ['https://github.com/lichess-org/chess-openings', 'https://en.wikibooks.org/wiki/Chess_Opening_Theory'],
    lessons: {
      beginner: lesson('white', 'beginner', 'Build the setup', 'Learn the three core moves and the shape of the position.', [
        {
          kind: 'core',
          title: 'Main line 3...e6',
          summary: 'Black plays the solid 3...e6; support with e3, hit c7 with Nb5, develop Bd3, and castle into a playable middlegame.',
          evalCp: 18,
          moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'e6', 'e3', 'c5', 'Nb5', 'Na6', 'c3', 'Bd6', 'Bd3', 'O-O', 'Nf3', 'Re8', 'O-O'],
          explanations: [
            'Claim the centre with a pawn and prepare active piece play.',
            'Develop the queen knight to pressure d5 and make the opening immediately active.',
            'Develop the bishop outside the pawn chain before playing e3.',
            'Support the centre and open the f1 bishop without losing flexibility.',
            'Jump to b5 and threaten the fork on c7 while Black’s knight is still on b8.',
            'Reinforce d4 with c3 once the c7 idea is answered, keeping a normal Jobava shape.',
            'Develop the bishop to d3 and prepare safe castling.',
            'Bring the king knight toward the centre and keep castling available.',
            'Castle before launching a flank plan; the king is ready for the middlegame.',
          ],
        },
        {
          kind: 'alternative',
          title: 'Meet 3...c6',
          summary: 'Black chooses the solid 3...c6; play e3 and develop against the quieter queenside structure.',
          evalCp: 12,
          moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'c6', 'e3', 'Bf5', 'Bd3'],
          explanations: [
            'Claim the centre with a pawn and prepare active piece play.',
            'Develop the queen knight to pressure d5 immediately.',
            'Develop the bishop outside the pawn chain before e3.',
            'Support the centre and open the f1 bishop against Black’s solid setup.',
            'Challenge the active bishop on f5 and keep a calm queenside plan.',
          ],
        },
        {
          id: 'meet-g6',
          kind: 'alternative',
          title: 'Meet 3...g6',
          summary: 'Against the kingside fianchetto, use Nb5 and keep the centre ready to expand.',
          evalCp: 15,
          moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'g6', 'e3', 'Bg7', 'Nb5', 'Na6', 'Nf3', 'O-O', 'Be2', 'c6', 'Nc3'],
          explanations: [
            'Claim the centre and prepare active piece play.',
            'Develop the queen knight and keep pressure on d5.',
            'Place the bishop outside the pawn chain before e3.',
            'Support d4 and open the f1 bishop while Black fianchettos.',
            'Jump to b5 and make Black spend time covering c7.',
            'Develop the king knight and prepare safe castling.',
            'Develop the bishop and keep the e-file and centre flexible.',
            'Return to c3 after ...c6 and keep the knight central.',
          ],
        },
        {
          id: 'meet-c5',
          kind: 'alternative',
          title: 'Meet 3...c5',
          summary: 'Meet the immediate central break with e3, Nb5, and a timely capture on e5.',
          evalCp: 20,
          moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'c5', 'e3', 'Nc6', 'Nb5', 'e5', 'dxe5', 'Ne4', 'f3'],
          explanations: [
            'Claim the centre and prepare active piece play.',
            'Develop the queen knight and keep pressure on d5.',
            'Place the bishop outside the pawn chain before e3.',
            'Support d4 before Black can build pressure on the centre.',
            'Jump to b5 and keep c7 under tactical pressure.',
            'Take on e5 to remove the advanced pawn and open lines.',
            'Drive the knight away and keep the extra central space.',
          ],
        },
        {
          kind: 'punish',
          title: 'Punish 3...Bf5?!',
          summary: 'Black develops the bishop too early; answer with f3 and e4 to kick it and seize the centre.',
          evalCp: 110,
          moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'Bf5', 'f3', 'e6', 'e4'],
          explanations: [
            'Claim the centre with a pawn and prepare active piece play.',
            'Develop the queen knight to pressure d5 immediately.',
            'Develop the bishop outside the pawn chain before e3.',
            'Play f3 at once so e4 can arrive with tempo against the loose bishop.',
            'Take the centre with e4 and force Black to deal with the kicked bishop.',
          ],
        },
      ]),
      intermediate: lesson('white', 'intermediate', 'Meet the active defence', 'Keep your pieces active when Black chooses among the main third-move replies.', [
        {
          kind: 'core',
          title: 'Main line 3...e6',
          summary: 'Against 3...e6, use Nb5 to provoke ...Na6 and ...c6, then retreat and centralise with Ne5.',
          evalCp: 22,
          moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'e6', 'Nb5', 'Na6', 'e3', 'c6', 'Nc3', 'Nc7', 'Nf3', 'Bd6', 'Ne5', 'O-O', 'Bd3'],
          explanations: [
            'Claim the centre with a pawn and prepare active piece play.',
            'Develop the queen knight to pressure d5 immediately.',
            'Develop the bishop outside the pawn chain before e3.',
            'Jump to b5 and threaten c7 while Black’s knight is undeveloped.',
            'Support the centre and open the f1 bishop while Black deals with the c7 pressure.',
            'Retreat to c3 after ...c6 and keep the knight active in the centre.',
            'Develop the king knight and prepare to occupy e5.',
            'Centralise the knight on e5 and point both pieces toward the kingside.',
            'Develop the bishop to d3 and complete the attacking setup.',
          ],
        },
        {
          kind: 'alternative',
          title: 'Meet 3...c6',
          summary: 'Against 3...c6 and ...Qb6, stay calm with e3 and Qc1, then develop against the bishop.',
          evalCp: 8,
          moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'c6', 'e3', 'Qb6', 'Qc1', 'Bf5'],
          explanations: [
            'Claim the centre with a pawn and prepare active piece play.',
            'Develop the queen knight to pressure d5 immediately.',
            'Develop the bishop outside the pawn chain before e3.',
            'Support the centre and blunt ...Qb6 ideas against b2.',
            'Defend b2 against ...Qxb2 and keep the position solid before ...Bf5.',
          ],
        },
        {
          id: 'meet-a6',
          kind: 'alternative',
          title: 'Meet 3...a6',
          summary: 'Use the slow ...a6 to develop, support the centre, and castle before Black catches up.',
          evalCp: 20,
          moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'a6', 'e3', 'e6', 'Nf3', 'c5', 'Be2', 'Nc6', 'O-O'],
          explanations: [
            'Claim the centre and prepare active piece play.',
            'Develop the queen knight and keep pressure on d5.',
            'Place the bishop outside the pawn chain before e3.',
            'Support d4 and open the f1 bishop while Black spends a tempo.',
            'Develop the king knight and prepare safe castling.',
            'Place the bishop on e2 and keep the centre stable.',
            'Castle before Black completes development and opens the centre.',
          ],
        },
        {
          id: 'meet-g6',
          kind: 'alternative',
          title: 'Build against 3...g6',
          summary: 'Meet the fianchetto with e3, Nf3, and Be2 before deciding where to strike.',
          evalCp: 15,
          moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'g6', 'e3', 'Bg7', 'Nf3', 'O-O', 'Be2', 'c5', 'O-O'],
          explanations: [
            'Claim the centre and prepare active piece play.',
            'Develop the queen knight and keep pressure on d5.',
            'Place the bishop outside the pawn chain before e3.',
            'Support d4 and open the f1 bishop against the fianchetto.',
            'Develop the king knight and prepare safe castling.',
            'Develop the bishop and keep the centre ready for e4 or c4.',
            'Castle while the structure is stable and the rooks can connect.',
          ],
        },
        {
          kind: 'punish',
          title: 'Punish 3...Bf5?!',
          summary: 'When Black plays 3...Bf5?!, drive the bishop with f3 and e4 before it settles.',
          evalCp: 125,
          moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'Bf5', 'f3', 'e6', 'e4', 'Bb4'],
          explanations: [
            'Claim the centre with a pawn and prepare active piece play.',
            'Develop the queen knight to pressure d5 immediately.',
            'Develop the bishop outside the pawn chain before e3.',
            'Play f3 so the e4 break arrives with tempo on the bishop.',
            'Seize the centre with e4 and keep the initiative against the early bishop.',
          ],
        },
      ]),
      advanced: lesson('white', 'advanced', 'Play for the initiative', 'Push the main line into the resulting middlegame plan and keep punishing early ...Bf5.', [
        {
          kind: 'core',
          title: 'Main line 3...e6',
          summary: 'Against 3...e6, force ...c6 with Nb5, centralise on e5, and castle before the centre opens.',
          evalCp: 16,
          moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'e6', 'Nb5', 'Na6', 'e3', 'c6', 'Nc3', 'Nc7', 'Nf3', 'Bd6', 'Ne5', 'O-O', 'Bd3', 'c5', 'O-O'],
          explanations: [
            'Claim the centre while keeping the position flexible against ...Nf6.',
            'Develop the queen knight and support pressure on d5.',
            'Place the bishop outside the pawn chain before Black settles.',
            'Jump to b5 and force Black to spend time defending c7.',
            'Build a stable centre and open the f1 bishop while Black answers the threat.',
            'Return to c3 after ...c6; the knight has gained useful concessions without getting stranded.',
            'Develop the king knight and prepare the central outpost.',
            'Plant the knight on e5 and build pressure toward Black’s king.',
            'Place the bishop on d3 to reinforce the kingside attack.',
            'Castle before ...c5 opens the centre and connect the rook to the middlegame.',
          ],
        },
        {
          kind: 'alternative',
          title: 'Meet 3...c6',
          summary: 'Against the solid 3...c6, develop simply with e3 and Nf3 and keep a queenside plan ready.',
          evalCp: 10,
          moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'c6', 'e3', 'Bf5', 'Nf3'],
          explanations: [
            'Claim the centre while keeping the position flexible.',
            'Develop the queen knight and support pressure on d5.',
            'Place the bishop outside the pawn chain before Black settles.',
            'Support the centre and open the f1 bishop against the solid setup.',
            'Bring the king knight out and keep castling and queenside play available.',
          ],
        },
        {
          id: 'meet-c5',
          kind: 'alternative',
          title: 'Take on the early ...c5',
          summary: 'Use e4 against the early break, then meet ...cxd4 with active knight play and Qxd4.',
          evalCp: 25,
          moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'c5', 'e4', 'cxd4', 'Nb5', 'Na6', 'Qxd4'],
          explanations: [
            'Claim the centre and keep the initiative against ...c5.',
            'Develop the queen knight and support pressure on d5.',
            'Place the bishop outside the pawn chain before Black settles.',
            'Build a strong centre before Black can recapture on d4.',
            'Jump to b5 and combine c7 pressure with the queen recapture.',
            'Recover the pawn with tempo and keep the pieces active.',
          ],
        },
        {
          id: 'meet-g6',
          kind: 'alternative',
          title: 'Keep the centre against ...g6',
          summary: 'Against the fianchetto, use e3, Nf3, h3, and dxc5 to open a useful diagonal.',
          evalCp: 20,
          moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'g6', 'e3', 'Bg7', 'Nf3', 'O-O', 'h3', 'c5', 'dxc5', 'Qa5', 'Bd3'],
          explanations: [
            'Claim the centre and keep the initiative against ...g6.',
            'Develop the queen knight and support pressure on d5.',
            'Place the bishop outside the pawn chain before Black fianchettos.',
            'Build a stable centre and open the f1 bishop.',
            'Develop the king knight and prepare safe castling.',
            'Give the king bishop a useful retreat square and prepare to castle.',
            'Exchange on c5 to remove the central pawn and open lines.',
            'Develop the bishop to d3 and keep pressure on the kingside.',
          ],
        },
        {
          kind: 'punish',
          title: 'Punish 3...Bf5?!',
          summary: 'Punish early ...Bf5 with f3 and e4, forcing the bishop to move again while you take the centre.',
          evalCp: 140,
          moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'Bf5', 'f3', 'e6', 'e4', 'Bg6'],
          explanations: [
            'Claim the centre while keeping the position flexible.',
            'Develop the queen knight and support pressure on d5.',
            'Place the bishop outside the pawn chain before Black settles.',
            'Play f3 immediately so e4 hits the loose bishop with tempo.',
            'Take the centre with e4 and leave Black’s bishop stepping again.',
          ],
        },
      ]),
    },
  },
  {
    id: 'london-system',
    name: 'London System',
    side: 'white',
    coreLine: '1. d4 d5 2. Nf3 Nf6 3. Bf4',
    description: 'A dependable structure built around a safe king and clear plans.',
    promise: 'Reach a repeatable structure, then choose the right central break.',
    eco: 'D02',
    sources: ['https://github.com/lichess-org/chess-openings', 'https://en.wikibooks.org/wiki/Chess_Opening_Theory'],
    lessons: {
      beginner: lesson('white', 'beginner', 'Build the system', 'Learn the reliable setup that makes the London easy to repeat.', [
        {
          kind: 'core',
          title: 'Main line 3...e6',
          summary: 'Black plays 3...e6; complete the classic London setup and connect the pieces.',
          evalCp: 14,
          moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'e6', 'e3', 'Bd6', 'Bd3', 'O-O', 'O-O', 'c5', 'c3', 'Nc6', 'Nbd2', 'Re8'],
          explanations: [
            'Start with a stable central pawn and make the intended structure clear.',
            'Develop the king knight to control e5 and support a flexible setup.',
            'Place the dark-square bishop outside the pawn chain before e3.',
            'Build a solid centre while keeping the c1 bishop active on f4.',
            'Develop the f1 bishop and prepare to castle.',
            'Castle to finish the basic setup and keep the king safe.',
            'Use c3 to support d4 and prepare a calm central expansion.',
            'Complete development and connect the rooks before choosing a plan.',
          ],
        },
        {
          kind: 'reference',
          title: 'Meet 3...c5',
          summary: 'Black challenges the centre with 3...c5; keep the London structure with e3 and c3.',
          evalCp: 6,
          moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'c5', 'e3', 'Nc6', 'c3'],
          explanations: [
            'Start with a stable central pawn and make the intended structure clear.',
            'Develop the king knight to control e5 and support a flexible setup.',
            'Place the dark-square bishop outside the pawn chain before e3.',
            'Support d4 immediately when Black hits the centre with ...c5.',
            'Reinforce d4 with c3 and keep the solid London triangle.',
          ],
        },
        {
          id: 'meet-g6',
          kind: 'alternative',
          title: 'Meet the kingside fianchetto',
          summary: 'Against ...g6 and ...Bg7, keep the London structure and castle before expanding.',
          evalCp: 15,
          moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'g6', 'e3', 'Bg7', 'h3', 'O-O', 'Be2', 'c5', 'O-O'],
          explanations: [
            'Start with a stable central pawn and make the intended structure clear.',
            'Develop the king knight and control e5 before Black fianchettos.',
            'Place the dark-square bishop outside the pawn chain.',
            'Build a solid centre while keeping the c1 bishop active.',
            'Give the king bishop a retreat square and prepare safe castling.',
            'Develop the f1 bishop and keep the centre flexible.',
            'Castle while the structure is stable and connect the rooks.',
          ],
        },
        {
          id: 'meet-c6',
          kind: 'alternative',
          title: 'Meet the Slav setup',
          summary: 'Against ...c6 and ...Bf5, complete development and keep a simple central plan.',
          evalCp: 10,
          moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'c6', 'e3', 'Bf5', 'Bd3', 'e6', 'O-O'],
          explanations: [
            'Start with a stable central pawn and make the intended structure clear.',
            'Develop the king knight and control e5.',
            'Place the dark-square bishop outside the pawn chain.',
            'Build the triangle and keep the bishop active.',
            'Challenge the active bishop before it becomes fully settled.',
            'Complete development and keep the king safe.',
          ],
        },
        {
          kind: 'punish',
          title: 'Punish 3...Bf5?!',
          summary: 'Early ...Bf5 lets you strike with c4 and develop with tempo against the loose setup.',
          evalCp: 95,
          moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'Bf5', 'c4', 'e6', 'Nc3'],
          explanations: [
            'Start with a stable central pawn and make the intended structure clear.',
            'Develop the king knight to control e5 and support a flexible setup.',
            'Place the dark-square bishop outside the pawn chain before e3.',
            'Strike with c4 while Black’s bishop is already committed on f5.',
            'Develop the queen knight and increase pressure on the opened centre.',
          ],
        },
      ]),
      intermediate: lesson('white', 'intermediate', 'Handle central tension', 'Develop naturally while watching for ...c5 and premature bishop moves.', [
        {
          kind: 'core',
          title: 'Main line 3...e6',
          summary: 'Against 3...e6 and ...c5, keep the London triangle and finish development.',
          evalCp: 20,
          moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'e6', 'e3', 'c5', 'c3', 'Nc6', 'Nbd2', 'Bd6', 'Bd3', 'O-O', 'O-O', 'Re8', 'Qe2'],
          explanations: [
            'Start with a stable central pawn and keep the plan flexible.',
            'Develop the king knight to control e5 and support the centre.',
            'Place the bishop outside the pawn chain before e3.',
            'Build the structure while watching Black’s central break.',
            'Support d4 and prepare a solid response to ...c5.',
            'Develop the queen knight and keep the bishop pair coordinated.',
            'Develop the f1 bishop before castling.',
            'Castle once the king-side pieces are ready.',
            'Bring the queen into the game and keep the London setup connected.',
          ],
        },
        {
          kind: 'alternative',
          title: 'Meet 3...c5',
          summary: 'Against an early ...c5 and ...Qb6, support the centre and develop without panic.',
          evalCp: 4,
          moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'c5', 'e3', 'Qb6', 'Nc3'],
          explanations: [
            'Start with a stable central pawn and keep the plan flexible.',
            'Develop the king knight to control e5 and support the centre.',
            'Place the bishop outside the pawn chain before e3.',
            'Support d4 when Black hits the centre immediately.',
            'Develop the queen knight and cover b2 without abandoning the London plan.',
          ],
        },
        {
          id: 'meet-bf5',
          kind: 'alternative',
          title: 'Challenge ...Bf5',
          summary: 'Meet the active bishop with c4 and Nc3, taking space before settling into the triangle.',
          evalCp: 15,
          moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'Bf5', 'c4', 'e6', 'Nc3', 'c6', 'e3'],
          explanations: [
            'Start with a stable central pawn and keep the plan flexible.',
            'Develop the king knight and support the centre.',
            'Place the bishop outside the pawn chain.',
            'Challenge the bishop setup with c4 and claim central space.',
            'Develop the queen knight and increase pressure on d5.',
            'Build the triangle after Black has committed the bishop.',
          ],
        },
        {
          id: 'meet-nh5',
          kind: 'alternative',
          title: 'Save the bishop from ...Nh5',
          summary: 'Keep the bishop after ...Nh5 and ...g5 by using the g5 and g3 squares with tempo.',
          evalCp: 10,
          moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'Nh5', 'Bg5', 'h6', 'Bh4', 'g5', 'Bg3'],
          explanations: [
            'Start with a stable central pawn and keep the plan flexible.',
            'Develop the king knight and support the centre.',
            'Place the bishop outside the pawn chain.',
            'Save the bishop while gaining a useful tempo against the knight plan.',
            'Retreat to h4 and keep the bishop on the long diagonal.',
            'Return to g3 and let Black spend more tempi on the flank.',
          ],
        },
        {
          kind: 'punish',
          title: 'Punish 3...Bf5?!',
          summary: 'Meet early ...Bf5 with c4 and rapid development while Black’s bishop is exposed.',
          evalCp: 100,
          moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'Bf5', 'c4', 'c6', 'Nc3', 'e6'],
          explanations: [
            'Start with a stable central pawn and keep the plan flexible.',
            'Develop the king knight to control e5 and support the centre.',
            'Place the bishop outside the pawn chain before e3.',
            'Open the centre with c4 while the f5 bishop is an early target.',
            'Develop the queen knight and keep pressure on the loose structure.',
          ],
        },
      ]),
      advanced: lesson('white', 'advanced', 'Use the full structure', 'Finish development and prepare the central plan that gives the system bite.', [
        {
          kind: 'core',
          title: 'Main line 3...e6',
          summary: 'Complete the London setup against 3...e6 and place the queen where the middlegame plan starts.',
          evalCp: 18,
          moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'e6', 'e3', 'Bd6', 'Bd3', 'O-O', 'O-O', 'c5', 'c3', 'Nc6', 'Nbd2', 'Qc7', 'Qe2', 'Re8'],
          explanations: [
            'Start with a stable central pawn while keeping options against ...Nf6.',
            'Develop the king knight and prepare the dark-square bishop’s route.',
            'Place the bishop outside the pawn chain before e3.',
            'Build the structure and keep the f1 bishop active.',
            'Develop the f1 bishop and invite a calm London middlegame.',
            'Castle before ...c5 opens the centre; the common mistake is leaving the king in the middle.',
            'Use c3 to reinforce d4 and prepare e4 after ...c5 and ...d5.',
            'Develop the queen knight and support the centre.',
            'Place the queen on e2 so the rooks can connect and the e-file plan begins.',
          ],
        },
        {
          kind: 'alternative',
          title: 'Meet 3...c5',
          summary: 'Against 3...c5 and ...Qb6, keep the triangle and refuse to panic over b2.',
          evalCp: 2,
          moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'c5', 'e3', 'Nc6', 'c3', 'Qb6'],
          explanations: [
            'Start with a stable central pawn while keeping options against ...Nf6.',
            'Develop the king knight and prepare the dark-square bishop’s route.',
            'Place the bishop outside the pawn chain before e3.',
            'Support d4 when Black hits the centre with ...c5.',
            'Reinforce the London triangle and leave ...Qb6 without a real target.',
          ],
        },
        {
          id: 'meet-g6',
          kind: 'alternative',
          title: 'Play against ...g6 and ...Bg7',
          summary: 'Keep the full London setup against the fianchetto and castle before choosing a break.',
          evalCp: 15,
          moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'g6', 'e3', 'Bg7', 'h3', 'O-O', 'Be2', 'c5', 'O-O'],
          explanations: [
            'Start with a stable central pawn while keeping options against ...Nf6.',
            'Develop the king knight and prepare the bishop route.',
            'Place the bishop outside the pawn chain.',
            'Build the triangle and keep the f1 bishop active.',
            'Give the king bishop a safe retreat and prepare castling.',
            'Develop the f1 bishop before the centre opens.',
            'Castle and connect the rooks before choosing the central break.',
          ],
        },
        {
          id: 'meet-c6',
          kind: 'alternative',
          title: 'Break the Slav-style shell',
          summary: 'Against ...c6 and ...Bf5, add c4 and Nc3 to challenge the quiet structure.',
          evalCp: 15,
          moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'c6', 'e3', 'Bf5', 'c4', 'e6', 'Nc3', 'Nbd7', 'Be2'],
          explanations: [
            'Start with a stable central pawn while keeping options against ...Nf6.',
            'Develop the king knight and prepare the bishop route.',
            'Place the bishop outside the pawn chain.',
            'Build the triangle and keep the centre flexible.',
            'Challenge the Slav shell with c4 and claim more space.',
            'Develop the queen knight and reinforce the central pressure.',
            'Develop the bishop and prepare safe castling.',
          ],
        },
        {
          id: 'poisoned-pawn',
          kind: 'punish',
          title: 'Punish the poisoned-pawn grab',
          summary: 'When ...Qxb2 grabs a pawn, use Nb5 and Rb1 to trap the queen and seize the initiative.',
          evalCp: 80,
          moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'c5', 'e3', 'Qb6', 'Nc3', 'Qxb2', 'Nb5', 'Na6', 'Rb1'],
          explanations: [
            'Start with a stable central pawn and keep the plan flexible.',
            'Develop the king knight and control e5.',
            'Place the bishop outside the pawn chain.',
            'Open the f1 bishop and keep the queen exposed to development.',
            'Develop the queen knight and prepare Nb5 against the loose queen.',
            'Jump to b5 and make Black spend a tempo with ...Na6 while the queen stays exposed.',
            'Play Rb1 to attack the queen and convert the pawn grab into time.',
          ],
        },
        {
          kind: 'punish',
          title: 'Punish 3...Nh5?!',
          summary: 'When Black hunts the bishop with ...Nh5, step aside with Bg5 and keep a lead in development.',
          evalCp: 90,
          moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'Nh5', 'Bg5', 'h6', 'Bh4'],
          explanations: [
            'Start with a stable central pawn while keeping options against ...Nf6.',
            'Develop the king knight and prepare the dark-square bishop’s route.',
            'Place the bishop outside the pawn chain before e3.',
            'Refuse to trade on h5; keep the bishop and gain time as Black’s knight wanders.',
            'Retreat along the diagonal and leave Black a tempo down for the middlegame.',
          ],
        },
      ]),
    },
  },
  {
    id: 'classical-sicilian',
    name: 'Classical Sicilian',
    side: 'black',
    coreLine: '1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3',
    description: 'A principled response to 1.e4 that contests the centre at once.',
    promise: 'Meet 1.e4 with active central counterplay and a clear development shell.',
    eco: 'B32',
    sources: ['https://github.com/lichess-org/chess-openings', 'https://lichess.org/api#tag/Opening-Explorer', 'https://database.lichess.org/', 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/Sicilian_Defence'],
    lessons: {
      beginner: lesson('black', 'beginner', 'Build the Sicilian', 'Learn the core Open Sicilian move order and the first reliable setups.', [
        {
          kind: 'core',
          title: 'Main line Open Sicilian',
          summary: 'White opens with 3.d4; build the Classical shell with ...d6, ...e6, and castling.',
          evalCp: 10,
          moves: ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'd6', 'Bg5', 'e6', 'Qd2', 'Be7', 'O-O-O', 'O-O', 'f4'],
          explanations: [
            'Meet 1.e4 with the immediate central break that defines the Sicilian.',
            'Develop the queen knight and support pressure on the d4 square.',
            'Exchange on d4 to challenge White’s centre before it can advance.',
            'Develop with tempo against the e4 pawn and prepare to castle.',
            'Keep the position flexible with ...d6 and support a sound central structure.',
            'Play ...e6 to secure d5 and open the king bishop.',
            'Develop the king bishop and prepare safe castling.',
            'Castle to connect the king and rook before the middlegame opens.',
          ],
        },
        {
          kind: 'reference',
          title: 'Meet 3.Bb5',
          summary: 'White chooses the Rossolimo; fianchetto and keep a solid kingside plan.',
          evalCp: 5,
          moves: ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5', 'g6', 'O-O', 'Bg7'],
          explanations: [
            'Meet 1.e4 with the immediate central break that defines the Sicilian.',
            'Develop the queen knight and support pressure on the d4 square.',
            'Answer the Rossolimo with ...g6 and prepare a dark-square fianchetto.',
            'Complete the fianchetto and keep a flexible Sicilian structure.',
          ],
        },
        {
          id: 'alapin',
          kind: 'alternative',
          title: 'Meet the Alapin',
          summary: 'Against 2.c3, challenge the centre with ...d5 and develop the bishop before White consolidates.',
          evalCp: 10,
          moves: ['e4', 'c5', 'c3', 'd5', 'exd5', 'Qxd5', 'd4', 'Nc6', 'Nf3', 'Nf6', 'Be2', 'cxd4', 'cxd4', 'Bf5'],
          explanations: [
            'Use the Sicilian break and contest the centre immediately.',
            'Open the centre with ...d5 before White can build the c3 setup.',
            'Recapture with the queen and keep pressure on the d4 square.',
            'Develop the queen knight and support the central break.',
            'Develop the king knight and challenge e4.',
            'Exchange on d4 to avoid a broad white centre.',
            'Develop the bishop outside the pawn chain while the centre is open.',
          ],
        },
        {
          id: 'closed',
          kind: 'alternative',
          title: 'Meet the Closed Sicilian',
          summary: 'Against Nc3 and a kingside fianchetto, mirror the setup with ...g6 and ...e6.',
          evalCp: 5,
          moves: ['e4', 'c5', 'Nc3', 'Nc6', 'g3', 'g6', 'Bg2', 'Bg7', 'd3', 'd6', 'f4', 'e6'],
          explanations: [
            'Use the Sicilian break and keep the position dynamic.',
            'Develop the queen knight and control d4.',
            'Fianchetto the king bishop and build a dark-square shell.',
            'Complete the fianchetto and keep the centre flexible.',
            'Support the centre with ...d6 and prepare ...e5.',
            'Play ...e6 to secure d5 and prepare development.',
          ],
        },
        {
          id: 'smith-morra',
          kind: 'alternative',
          title: 'Accept the Smith-Morra',
          summary: 'Accept the gambit pawn and develop with ...Nc6, ...d6, and ...Nf6.',
          evalCp: 15,
          moves: ['e4', 'c5', 'd4', 'cxd4', 'c3', 'dxc3', 'Nxc3', 'Nc6', 'Nf3', 'd6', 'Bc4', 'Nf6'],
          explanations: [
            'Use the Sicilian break and accept a dynamic position.',
            'Take on d4 before White can keep both pawns in the centre.',
            'Accept the gambit pawn and force White to spend time recapturing.',
            'Develop the queen knight and support the extra pawn.',
            'Play ...d6 to secure the centre and open the c8 bishop.',
            'Develop the king knight and prepare to castle.',
          ],
        },
        {
          kind: 'punish',
          title: 'Punish 3.Bc4?!',
          summary: 'White develops the bishop to c4 too early; play ...e6 and ...Nf6 and keep easy development.',
          evalCp: 85,
          moves: ['e4', 'c5', 'Nf3', 'Nc6', 'Bc4', 'e6', 'O-O', 'Nf6', 'd3'],
          explanations: [
            'Meet 1.e4 with the immediate central break that defines the Sicilian.',
            'Develop the queen knight and support pressure on the d4 square.',
            'Meet the early Bc4 with ...e6 and blunt the bishop’s diagonal.',
            'Develop with tempo against e4 and keep a clear lead in useful moves.',
          ],
        },
      ]),
      intermediate: lesson('black', 'intermediate', 'Take dynamic space', 'Use the Open Sicilian main line and keep answers ready for quieter or inaccurate tries.', [
        {
          kind: 'core',
          title: 'Main line 5...e5',
          summary: 'In the Open Sicilian, take space with ...e5 and expand on the queenside.',
          evalCp: -8,
          moves: ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6', 'Bg5', 'a6', 'Na3', 'b5', 'Bxf6', 'gxf6'],
          explanations: [
            'Choose the Sicilian break and fight for the initiative from move one.',
            'Develop the knight to its most active square and keep ...d5 available.',
            'Remove the d4 pawn so White cannot build an unchecked centre.',
            'Hit e4 while completing development toward castling.',
            'Use ...e5 to claim space and make the c3 knight find a precise route.',
            'Support the centre and prepare to challenge White’s active pieces.',
            'Ask the b5 knight a question and gain time for queenside expansion.',
            'Advance ...b5 to gain space and support a dynamic Sicilian structure.',
            'Accept doubled f-pawns to open lines and keep the bishop pair under pressure.',
          ],
        },
        {
          kind: 'alternative',
          title: 'Meet 3.Bb5',
          summary: 'Against the Rossolimo, choose ...e6 and ...Nge7 and keep development compact.',
          evalCp: 0,
          moves: ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5', 'e6', 'O-O', 'Nge7', 'Re1'],
          explanations: [
            'Choose the Sicilian break and fight for the initiative from move one.',
            'Develop the knight to its most active square and keep ...d5 available.',
            'Meet Bb5 with ...e6 and prepare a short development scheme.',
            'Bring the king knight out without blocking the dark-square bishop for long.',
          ],
        },
        {
          id: 'grand-prix',
          kind: 'alternative',
          title: 'Meet the Grand Prix',
          summary: 'Against f4, fianchetto and use ...Nd4 and ...e6 to challenge the attacking setup.',
          evalCp: 5,
          moves: ['e4', 'c5', 'Nc3', 'Nc6', 'f4', 'g6', 'Nf3', 'Bg7', 'Bb5', 'Nd4', 'O-O', 'e6'],
          explanations: [
            'Meet the Grand Prix with the Sicilian break and a dynamic centre.',
            'Develop the queen knight and support ...d5.',
            'Fianchetto the king bishop and control the dark squares.',
            'Complete development while preparing ...Nd4.',
            'Use ...Nd4 to challenge the bishop and centralise with tempo.',
            'Play ...e6 to secure d5 and open the queen bishop.',
          ],
        },
        {
          id: 'delayed-alapin',
          kind: 'alternative',
          title: 'Meet the delayed Alapin',
          summary: 'Against c3 after Nc6, use ...Nf6, ...Nd5, and ...d6 to break the centre later.',
          evalCp: 0,
          moves: ['e4', 'c5', 'Nf3', 'Nc6', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'cxd4', 'd6'],
          explanations: [
            'Choose the Sicilian and keep the centre dynamic.',
            'Develop the queen knight before White can build a broad centre.',
            'Develop the king knight and attack e4.',
            'Retreat to d5 after e5 and prepare ...d6.',
            'Exchange on d4 to undermine the c3 structure.',
            'Play ...d6 to challenge e5 and open the king bishop.',
          ],
        },
        {
          id: 'anti-sveshnikov',
          kind: 'alternative',
          title: 'Meet 3.Nc3',
          summary: 'Against the flexible Nc3 move order, use ...e5 and ...Be7 before castling.',
          evalCp: 5,
          moves: ['e4', 'c5', 'Nf3', 'Nc6', 'Nc3', 'e5', 'Bc4', 'Be7', 'd3', 'd6', 'O-O', 'Nf6'],
          explanations: [
            'Choose the Sicilian and keep the centre dynamic.',
            'Develop the queen knight and support ...e5.',
            'Take space with ...e5 and restrict the d4 break.',
            'Develop the king bishop and prepare safe castling.',
            'Support the centre with ...d6 and keep the structure sound.',
            'Develop the king knight and complete the kingside setup.',
          ],
        },
        {
          id: 'smith-morra-accepted',
          kind: 'alternative',
          title: 'Develop against the accepted Morra',
          summary: 'Keep the gambit pawn and develop ...e6, ...Qc7, and ...Nf6 against the attack.',
          evalCp: 15,
          moves: ['e4', 'c5', 'd4', 'cxd4', 'c3', 'dxc3', 'Nxc3', 'Nc6', 'Nf3', 'e6', 'Bc4', 'Qc7', 'O-O', 'Nf6'],
          explanations: [
            'Choose the Sicilian and accept the gambit structure.',
            'Take on d4 before White can keep both central pawns.',
            'Accept the second pawn and force White to spend time recapturing.',
            'Develop the queen knight and support the extra material.',
            'Play ...e6 to secure d5 and open the f8 bishop.',
            'Place the queen on c7 to support the centre and watch c-file tactics.',
            'Develop the king knight and prepare to castle.',
          ],
        },
        {
          kind: 'punish',
          title: 'Punish 3.Bc4?!',
          summary: 'When White plays an early Bc4, blunt it with ...e6 and develop toward ...Nf6.',
          evalCp: 105,
          moves: ['e4', 'c5', 'Nf3', 'Nc6', 'Bc4', 'e6', 'd3', 'Nf6', 'O-O'],
          explanations: [
            'Choose the Sicilian break and fight for the initiative from move one.',
            'Develop the knight to its most active square and keep ...d5 available.',
            'Meet the early bishop with ...e6 and keep the centre flexible.',
            'Hit e4 while completing development toward castling.',
          ],
        },
      ]),
      advanced: lesson('black', 'advanced', 'Play the open Sicilian', 'Push the ...e5 Classical plan into the middlegame and keep refutations ready.', [
        {
          kind: 'core',
          title: 'Main line 5...e5',
          summary: 'Drive the ...e5 and ...b5 plan into the resulting middlegame with ...Bg7.',
          evalCp: -12,
          moves: ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6', 'Bg5', 'a6', 'Na3', 'b5', 'Bxf6', 'gxf6', 'Nd5', 'Bg7'],
          explanations: [
            'Start the Sicilian and accept a dynamic position where Black contests the centre immediately.',
            'Develop with pressure on d4 and keep the option of ...e5.',
            'Exchange on d4 before White can consolidate the central pawns.',
            'Develop actively against e4 and prepare the standard ...e5 break.',
            'Take space with ...e5, accepting a backward development tempo for central control.',
            'Support the advanced centre and make the b5 square part of the plan.',
            'Gain time against the knight and prepare a queenside pawn storm.',
            'Use ...b5 to gain space before White can complete a quiet setup.',
            'Accept doubled f-pawns to open lines and keep the bishop pair under pressure.',
            'Fianchetto the king bishop and begin the middlegame from a dynamic Classical shell.',
          ],
        },
        {
          kind: 'alternative',
          title: 'Meet 3.Bb5',
          summary: 'Against the Rossolimo, fianchetto and claim space with ...e5 once development is ready.',
          evalCp: 8,
          moves: ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5', 'g6', 'O-O', 'Bg7', 'Re1', 'e5'],
          explanations: [
            'Start the Sicilian and accept a dynamic position where Black contests the centre immediately.',
            'Develop with pressure on d4 and keep flexible answers to Bb5.',
            'Answer the Rossolimo with ...g6 and prepare the fianchetto.',
            'Complete the fianchetto before expanding in the centre.',
            'Take space with ...e5 once the king bishop is developed.',
          ],
        },
        {
          id: 'richter-rauzer',
          kind: 'alternative',
          title: 'Meet the Richter-Rauzer',
          summary: 'Against Bg5, use ...e6 and ...Be7 before castling into a sound Classical structure.',
          evalCp: 0,
          moves: ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'd6', 'Bg5', 'e6', 'Qd2', 'Be7', 'O-O-O', 'O-O'],
          explanations: [
            'Start the Sicilian and contest the centre immediately.',
            'Develop the queen knight and support ...d5.',
            'Exchange on d4 before White can consolidate the centre.',
            'Develop the king knight and pressure e4.',
            'Support the Classical structure with ...d6 and prepare ...e6.',
            'Play ...e6 to secure d5 and open the bishop.',
            'Develop the bishop to e7 and meet the pin without weakening the king.',
            'Castle before the centre opens and connect the rooks.',
          ],
        },
        {
          id: 'sozin',
          kind: 'alternative',
          title: 'Meet the Sozin setup',
          summary: 'Against Bc4, use ...e6, ...Be7, and ...O-O to blunt the attacking bishop.',
          evalCp: 0,
          moves: ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'd6', 'Bc4', 'e6', 'Bb3', 'Be7', 'O-O', 'O-O'],
          explanations: [
            'Start the Sicilian and contest the centre immediately.',
            'Develop the queen knight and support ...d5.',
            'Exchange on d4 before White can consolidate the centre.',
            'Develop the king knight and pressure e4.',
            'Support the Classical structure and prepare ...e6.',
            'Play ...e6 to block the c4 bishop and open the f8 bishop.',
            'Develop the bishop to e7 and keep the king safe.',
            'Castle and bring the rook toward the centre.',
          ],
        },
        {
          id: 'classical-be2',
          kind: 'alternative',
          title: 'Meet the Classical bishop setup',
          summary: 'Against Be2 and e5, use ...d6, ...e5, and ...Be7 for a compact Classical position.',
          evalCp: -5,
          moves: ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'd6', 'Be2', 'e5', 'Nb3', 'Be7', 'O-O', 'O-O'],
          explanations: [
            'Start the Sicilian and contest the centre immediately.',
            'Develop the queen knight and support ...d5.',
            'Exchange on d4 before White can consolidate the centre.',
            'Develop the king knight and prepare the central break.',
            'Use ...d6 to support e5 and keep a sound structure.',
            'Take space with ...e5 and restrict White’s central breaks.',
            'Develop the bishop to e7 and keep the king side coordinated.',
            'Castle and connect the rooks for the middlegame.',
          ],
        },
        {
          id: 'closed-fianchetto',
          kind: 'alternative',
          title: 'Counter the Closed fianchetto',
          summary: 'Against the Closed setup, mirror the kingside and use ...Nge7 to prepare central breaks.',
          evalCp: 0,
          moves: ['e4', 'c5', 'Nc3', 'Nc6', 'g3', 'g6', 'Bg2', 'Bg7', 'd3', 'd6', 'f4', 'e6', 'Nf3', 'Nge7', 'O-O', 'O-O'],
          explanations: [
            'Start the Sicilian and keep the centre dynamic.',
            'Develop the queen knight and support ...d5.',
            'Fianchetto the king bishop and control the dark squares.',
            'Complete the fianchetto and prepare ...d6.',
            'Support the centre and keep ...e5 available.',
            'Play ...e6 to secure d5 and open the queen bishop.',
            'Develop the king knight without blocking the fianchetto bishop.',
            'Castle and keep the kingside compact.',
          ],
        },
        {
          kind: 'punish',
          title: 'Punish 3.Bc4?!',
          summary: 'Punish the early Bc4 with ...e6 and ...a6, keeping easy development and a healthy structure.',
          evalCp: 92,
          moves: ['e4', 'c5', 'Nf3', 'Nc6', 'Bc4', 'e6', 'O-O', 'a6', 'a4', 'Nf6'],
          explanations: [
            'Start the Sicilian and accept a dynamic position where Black contests the centre immediately.',
            'Develop with pressure on d4 and keep flexible answers to Bc4.',
            'Blunt the bishop with ...e6 before White can use the a2-g8 diagonal.',
            'Prepare queenside expansion and ask the bishop what it is doing on c4.',
            'Develop the king knight and keep a clear lead in useful moves.',
          ],
        },
      ]),
    },
  },
  {
    id: 'classical-caro-kann',
    name: 'Classical Caro-Kann',
    side: 'black',
    coreLine: '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5',
    description: 'A solid central defence that develops the light-square bishop early.',
    promise: 'Challenge the centre while freeing the c8 bishop before building the structure.',
    eco: 'B18',
    sources: ['https://github.com/lichess-org/chess-openings', 'https://lichess.org/api#tag/Opening-Explorer', 'https://database.lichess.org/', 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/Caro-Kann_Defence'],
    lessons: {
      beginner: lesson('black', 'beginner', 'Build the Caro-Kann', 'Learn the solid structure and the bishop development that define the defence.', [
        {
          kind: 'core',
          title: 'Main line Classical',
          summary: 'White chooses 3.Nc3; develop the bishop outside the chain and meet the h-pawn probe.',
          evalCp: 6,
          moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'Nf3', 'Nd7', 'h4', 'h6', 'h5', 'Bh7', 'Bd3', 'Bxd3'],
          explanations: [
            'Support the d5 break with a solid structure rather than exposing the king early.',
            'Claim the centre while keeping the light-square bishop free.',
            'Recapture on e4 and make White spend a tempo before developing.',
            'Develop the light-square bishop outside the pawn chain, the Caro-Kann’s key idea.',
            'Retreat to g6 when challenged, keeping the bishop useful on the long diagonal.',
            'Develop the queen knight and reinforce the central squares.',
            'Meet the h-pawn thrust with ...h6 and keep a square for the bishop.',
            'Step to h7 so the bishop stays safe and useful.',
            'Trade on d3 and accept a clean Classical structure for the middlegame.',
          ],
        },
        {
          kind: 'alternative',
          title: 'Meet 3.exd5',
          summary: 'White chooses the Exchange; recapture and develop naturally against the open centre.',
          evalCp: 0,
          moves: ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'Bd3', 'Nc6'],
          explanations: [
            'Support the d5 break with a solid structure rather than exposing the king early.',
            'Claim the centre while keeping the light-square bishop free.',
            'Recapture toward the centre and keep a healthy pawn structure.',
            'Develop the queen knight and contest the open centre.',
          ],
        },
        {
          id: 'advance',
          kind: 'alternative',
          title: 'Meet the Advance',
          summary: 'Against the Advance, develop the bishop before ...e6 and challenge the centre with ...c5.',
          evalCp: 0,
          moves: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6', 'Be2', 'c5', 'O-O', 'Nc6'],
          explanations: [
            'Use the Caro-Kann to build a durable centre and keep the bishop active.',
            'Play ...d5 to challenge the advanced e5 pawn.',
            'Develop the bishop outside the pawn chain before closing with ...e6.',
            'Play ...e6 to support d5 and prepare kingside development.',
            'Challenge the centre with ...c5 before White can build a bind.',
            'Develop the queen knight and increase pressure on d4.',
          ],
        },
        {
          id: 'two-knights',
          kind: 'alternative',
          title: 'Meet the Two Knights',
          summary: 'Against Nc3 and Nf3, use ...Bg4 and ...Bxf3 to reduce White’s attacking pieces.',
          evalCp: 0,
          moves: ['e4', 'c6', 'Nc3', 'd5', 'Nf3', 'Bg4', 'h3', 'Bxf3', 'Qxf3', 'e6', 'd4', 'Nf6'],
          explanations: [
            'Use the Caro-Kann and keep the centre sound.',
            'Play ...d5 before White can establish a broad centre.',
            'Develop the bishop to g4 and pin the knight before ...e6.',
            'Exchange to weaken the queen’s placement and reduce pressure on e5.',
            'Play ...e6 to secure d5 and open the king bishop.',
            'Develop the king knight and prepare to castle.',
          ],
        },
        {
          id: 'fantasy',
          kind: 'alternative',
          title: 'Meet the Fantasy',
          summary: 'Against f3, use ...e6, ...Nf6, and ...Nfd7 to challenge the advanced e5 pawn.',
          evalCp: 0,
          moves: ['e4', 'c6', 'd4', 'd5', 'f3', 'e6', 'Nc3', 'Nf6', 'e5', 'Nfd7'],
          explanations: [
            'Use the Caro-Kann and keep the centre sound.',
            'Play ...d5 to challenge the centre immediately.',
            'Play ...e6 to support d5 and prepare development.',
            'Develop with pressure on e5 and keep the bishop route open.',
            'Retreat the knight to d7 and prepare to break the centre.',
          ],
        },
        {
          id: 'hillbilly',
          kind: 'alternative',
          title: 'Meet the Hillbilly bishop',
          summary: 'Against the early Bc4, use ...d5 and ...cxd5 to make the bishop spend time on b5.',
          evalCp: 10,
          moves: ['e4', 'c6', 'Bc4', 'd5', 'exd5', 'cxd5', 'Bb5+', 'Nc6', 'd4', 'Nf6'],
          explanations: [
            'Use the Caro-Kann and keep the centre sound.',
            'Strike with ...d5 while the bishop is exposed on c4.',
            'Recapture with ...cxd5 and open lines for development.',
            'Meet the check with ...Nc6 and keep the bishop from gaining time.',
            'Develop the king knight and support the central structure.',
          ],
        },
        {
          kind: 'punish',
          title: 'Punish 3.Bd3?!',
          summary: 'White develops the bishop too early; take on e4 and develop with tempo against the loose piece.',
          evalCp: 88,
          moves: ['e4', 'c6', 'd4', 'd5', 'Bd3', 'dxe4', 'Bxe4', 'Nf6', 'Bd3'],
          explanations: [
            'Support the d5 break with a solid structure rather than exposing the king early.',
            'Claim the centre while keeping the light-square bishop free.',
            'Capture on e4 and force the early bishop to move again.',
            'Develop with tempo against the bishop and keep a clear lead in useful moves.',
          ],
        },
      ]),
      intermediate: lesson('black', 'intermediate', 'Keep the bishop active', 'Meet natural development while preserving the Caro-Kann’s best piece.', [
        {
          kind: 'core',
          title: 'Main line Classical',
          summary: 'In the Classical, keep the bishop active, close with ...e6, and finish kingside development.',
          evalCp: 12,
          moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'Nf3', 'Nd7', 'Bd3', 'e6', 'O-O', 'Ngf6', 'Re1', 'Be7'],
          explanations: [
            'Choose the resilient Caro-Kann structure and prepare a healthy central break.',
            'Take space with ...d5 while preserving the c8 bishop’s diagonal.',
            'Recover the pawn with a developing move and make White reveal the plan.',
            'Develop the bishop actively before closing it with ...e6.',
            'Retreat to g6 when challenged, keeping the bishop useful on the long diagonal.',
            'Develop the b8 knight and support ...e6 and ...Ngf6.',
            'Close the centre only after the bishop has escaped the pawn chain.',
            'Develop the king knight and contest White’s central outpost.',
            'Prepare to castle and coordinate the king-side pieces.',
          ],
        },
        {
          kind: 'alternative',
          title: 'Meet 3.exd5',
          summary: 'Against the Exchange, recapture and meet c4 with natural piece development.',
          evalCp: -4,
          moves: ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'c4', 'Nf6', 'Nc3'],
          explanations: [
            'Choose the resilient Caro-Kann structure and prepare a healthy central break.',
            'Take space with ...d5 while preserving the c8 bishop’s diagonal.',
            'Recapture toward the centre and keep a healthy pawn structure.',
            'Develop the king knight and prepare to meet the c4 break calmly.',
          ],
        },
        {
          id: 'panov',
          kind: 'alternative',
          title: 'Meet the Panov',
          summary: 'Against exd5 and c4, recapture and develop with ...Nf6, ...e6, and ...Bb4.',
          evalCp: 0,
          moves: ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'c4', 'Nf6', 'Nc3', 'e6', 'Nf3', 'Bb4'],
          explanations: [
            'Choose the resilient Caro-Kann structure and contest the centre.',
            'Play ...d5 while preserving the c8 bishop’s diagonal.',
            'Recapture toward the centre and keep the structure active.',
            'Develop the king knight and prepare ...e6.',
            'Close the centre only after the bishop is ready to develop.',
            'Use ...Bb4 to pin the knight and increase pressure on d4.',
          ],
        },
        {
          id: 'advance-short',
          kind: 'alternative',
          title: 'Meet the Short Advance',
          summary: 'Against the restrained Advance, use ...Bf5, ...e6, and ...c5 for a principled break.',
          evalCp: 0,
          moves: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6', 'Be2', 'c5', 'O-O', 'Nc6'],
          explanations: [
            'Choose the resilient Caro-Kann structure and keep the bishop active.',
            'Play ...d5 to challenge the advanced pawn.',
            'Develop the bishop before closing the chain with ...e6.',
            'Play ...e6 to support d5 and prepare development.',
            'Break with ...c5 before White can build a bind.',
            'Develop the queen knight and pressure d4.',
          ],
        },
        {
          id: 'advance-tal',
          kind: 'alternative',
          title: 'Meet the Tal Advance',
          summary: 'Against h4 and g4, use ...h6 and ...Bd7 to keep the bishop safe while White overextends.',
          evalCp: 5,
          moves: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'h4', 'h6', 'g4', 'Bd7'],
          explanations: [
            'Choose the Caro-Kann and keep the centre sound.',
            'Play ...d5 to challenge the advanced e5 pawn.',
            'Develop the bishop and make the flank pawns commit.',
            'Use ...h6 to question g5 ideas and preserve the bishop.',
            'Retreat to d7 and prepare to challenge the overextended centre.',
          ],
        },
        {
          id: 'fantasy',
          kind: 'alternative',
          title: 'Break the Fantasy centre',
          summary: 'Against f3 and e5, use ...e6, ...Nf6, ...Nfd7, and ...c5 to attack the centre.',
          evalCp: 0,
          moves: ['e4', 'c6', 'd4', 'd5', 'f3', 'e6', 'Nc3', 'Nf6', 'e5', 'Nfd7', 'f4', 'c5'],
          explanations: [
            'Choose the Caro-Kann and keep the centre sound.',
            'Play ...d5 to challenge the centre immediately.',
            'Play ...e6 to support d5 and prepare development.',
            'Develop with pressure on e5.',
            'Retreat to d7 and prepare the ...c5 break.',
            'Play ...c5 to undermine White’s advanced pawn chain.',
          ],
        },
        {
          kind: 'punish',
          title: 'Punish 3.Bd3?!',
          summary: 'When White plays an early Bd3, take on e4 and hit the bishop with ...Nf6.',
          evalCp: 96,
          moves: ['e4', 'c6', 'd4', 'd5', 'Bd3', 'dxe4', 'Bxe4', 'Nf6', 'Bf3'],
          explanations: [
            'Choose the resilient Caro-Kann structure and prepare a healthy central break.',
            'Take space with ...d5 while preserving the c8 bishop’s diagonal.',
            'Capture on e4 and force the early bishop to spend another tempo.',
            'Develop with tempo against the bishop and keep the initiative.',
          ],
        },
      ]),
      advanced: lesson('black', 'advanced', 'Use the full structure', 'Combine active bishop play with a flexible king-side and queenside plan.', [
        {
          kind: 'core',
          title: 'Main line Classical',
          summary: 'Push the Classical into queenside castling territory and meet it with ...Bb4.',
          evalCp: 15,
          moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'N1e2', 'Nd7', 'Bf4', 'e6', 'Qd2', 'Ngf6', 'O-O-O', 'Bb4'],
          explanations: [
            'Use the Caro-Kann to build a durable centre and keep the c8 bishop active.',
            'Establish the central pawn before White can choose a quieter setup.',
            'Accept the temporary pawn sacrifice and plan to regain it with development.',
            'Develop outside the chain so the bishop does not become a passive defender.',
            'Keep the bishop on the g6 diagonal after White questions it with Ng3.',
            'Place the queen knight on d7 to support ...e6 and control e5.',
            'Play ...e6 only after the bishop is safe, preserving the opening’s central logic.',
            'Develop the king knight without blocking the c8 bishop or the queen.',
            'Use ...Bb4 to pin the knight and make White spend time on the queenside.',
          ],
        },
        {
          kind: 'alternative',
          title: 'Meet 3.exd5',
          summary: 'Against the Exchange and c4, develop both knights and keep a healthy centre.',
          evalCp: 2,
          moves: ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'c4', 'Nf6', 'Nc3', 'Nc6'],
          explanations: [
            'Use the Caro-Kann to build a durable centre and keep the c8 bishop active.',
            'Establish the central pawn before White can choose a quieter setup.',
            'Recapture toward the centre and keep a healthy pawn structure.',
            'Develop the king knight and prepare to meet the c4 break.',
            'Bring the queen knight out and contest the open centre.',
          ],
        },
        {
          id: 'panov-main',
          kind: 'alternative',
          title: 'Play the Panov main line',
          summary: 'Use the Panov structure with ...Bb4, ...exd5, and ...Nc6 to keep active central play.',
          evalCp: 0,
          moves: ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'c4', 'Nf6', 'Nc3', 'e6', 'Nf3', 'Bb4', 'cxd5', 'exd5', 'Bd3', 'O-O', 'O-O', 'Nc6'],
          explanations: [
            'Use the Caro-Kann to build a durable centre and keep the bishop active.',
            'Play ...d5 while preserving the c8 bishop’s diagonal.',
            'Recapture toward the centre and keep the structure active.',
            'Develop the king knight and prepare ...e6.',
            'Close the centre only after the bishop can develop actively.',
            'Use ...Bb4 to pin the knight and pressure d4.',
            'Recapture with ...exd5 and open the e-file for the rook.',
            'Castle before the centre fully opens.',
            'Develop the queen knight and support the central pressure.',
          ],
        },
        {
          id: 'advance-van-der-wiel',
          kind: 'alternative',
          title: 'Meet the Van der Wiel',
          summary: 'Against Nc3, g4, and h4, use ...e6 and ...Bg6 to keep the bishop safe.',
          evalCp: 5,
          moves: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nc3', 'e6', 'g4', 'Bg6', 'Nge2', 'c5', 'h4'],
          explanations: [
            'Use the Caro-Kann and keep the centre sound.',
            'Play ...d5 to challenge the advanced pawn.',
            'Develop the bishop before closing the chain with ...e6.',
            'Play ...e6 to support d5 and prepare the bishop retreat.',
            'Move to g6 and keep the bishop on the long diagonal.',
            'Break with ...c5 before White can stabilise the centre.',
          ],
        },
        {
          id: 'classical-tartakower',
          kind: 'alternative',
          title: 'Choose the Tartakower structure',
          summary: 'Against the Classical exchange, use ...exf6 and ...Bd6 for a solid, active structure.',
          evalCp: 0,
          moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nf6', 'Nxf6+', 'exf6', 'Nf3', 'Bd6', 'Bd3', 'O-O'],
          explanations: [
            'Use the Caro-Kann and keep the c8 bishop active.',
            'Play ...d5 to challenge the centre.',
            'Exchange on e4 and make White spend a tempo recapturing.',
            'Develop with tempo against e4 and prepare to recapture on f6.',
            'Use ...exf6 to keep the e-file open and a strong centre.',
            'Develop the bishop to d6 and prepare to castle.',
            'Castle and connect the rooks for the middlegame.',
          ],
        },
        {
          id: 'two-knights-exchange',
          kind: 'alternative',
          title: 'Simplify the Two Knights',
          summary: 'Against the Two Knights, use ...Bg4 and ...Bxf3 before completing ...e6 and ...dxe4.',
          evalCp: 0,
          moves: ['e4', 'c6', 'Nc3', 'd5', 'Nf3', 'Bg4', 'h3', 'Bxf3', 'Qxf3', 'e6', 'd4', 'Nf6', 'Bd3', 'dxe4', 'Nxe4'],
          explanations: [
            'Use the Caro-Kann and keep the centre sound.',
            'Play ...d5 before White can build a broad centre.',
            'Develop the bishop to g4 and pin the knight.',
            'Exchange to weaken White’s queen placement.',
            'Play ...e6 to secure d5 and open the king bishop.',
            'Develop the king knight and prepare ...dxe4.',
            'Take on e4 and remove White’s central pawn with development.',
          ],
        },
        {
          kind: 'punish',
          title: 'Punish 3.Bd3?!',
          summary: 'Punish the early Bd3 by taking on e4 and developing both knights with tempo.',
          evalCp: 150,
          moves: ['e4', 'c6', 'd4', 'd5', 'Bd3', 'dxe4', 'Bxe4', 'Nf6', 'Nc3', 'Nbd7'],
          explanations: [
            'Use the Caro-Kann to build a durable centre and keep the c8 bishop active.',
            'Establish the central pawn before White can choose a quieter setup.',
            'Capture on e4 and force the early bishop to move again.',
            'Develop with tempo against the bishop and keep the initiative.',
            'Bring the queen knight out and complete a clean development lead.',
          ],
        },
      ]),
    },
  },
];

export const coursesById = Object.fromEntries(COURSES.map((course) => [course.id, course])) as Record<Course['id'], Course>;
