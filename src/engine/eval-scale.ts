export type EvalScore = { kind: 'cp'; cp: number } | { kind: 'mate'; movesToMate: number };

export type Severity = 'fine' | 'inaccuracy' | 'mistake' | 'blunder';

/** Lower bound of each band, in centipawns. */
export const SEVERITY_CP = { inaccuracy: 50, mistake: 150, blunder: 300 } as const;

/** Shapes the bar: smooth, symmetric, and saturating without a clamp. */
const FILL_SCALE = 400;

const MATE_VALUE = 100_000;

export function parseScore(line: string): EvalScore | null {
  const mate = /score mate (-?\d+)/.exec(line);
  if (mate) return { kind: 'mate', movesToMate: Number(mate[1]) };
  const centipawns = /score cp (-?\d+)/.exec(line);
  return centipawns ? { kind: 'cp', cp: Number(centipawns[1]) } : null;
}

/** UCI reports from the side to move; the bar always reads from the learner's side. */
export function orientScore(score: EvalScore, fen: string, learnerColor: 'w' | 'b'): EvalScore {
  const sideToMove = fen.split(' ')[1] === 'b' ? 'b' : 'w';
  if (sideToMove === learnerColor) return score;
  return score.kind === 'mate' ? { kind: 'mate', movesToMate: -score.movesToMate } : { kind: 'cp', cp: -score.cp };
}

export function scoreValue(score: EvalScore): number {
  if (score.kind === 'cp') return score.cp;
  return score.movesToMate >= 0 ? MATE_VALUE : -MATE_VALUE;
}

export function fillFraction(score: EvalScore): number {
  if (score.kind === 'mate') return score.movesToMate >= 0 ? 1 : 0;
  return 0.5 + 0.5 * (score.cp / (Math.abs(score.cp) + FILL_SCALE));
}

export function evalLabel(score: EvalScore): string {
  if (score.kind === 'mate') return `${score.movesToMate >= 0 ? '' : '-'}M${Math.abs(score.movesToMate)}`;
  const pawns = score.cp / 100;
  const sign = pawns > 0 ? '+' : pawns < 0 ? '-' : '';
  return `${sign}${Math.abs(pawns).toFixed(2)}`;
}

export function centipawnLoss(expected: EvalScore, played: EvalScore): number {
  return Math.max(0, scoreValue(expected) - scoreValue(played));
}

export function moveSeverity(lossCp: number): Severity {
  if (lossCp >= SEVERITY_CP.blunder) return 'blunder';
  if (lossCp >= SEVERITY_CP.mistake) return 'mistake';
  if (lossCp >= SEVERITY_CP.inaccuracy) return 'inaccuracy';
  return 'fine';
}

export function costPhrase(playedSan: string, expectedSan: string, lossCp: number): string {
  const pawns = (lossCp / 100).toFixed(1);
  switch (moveSeverity(lossCp)) {
    case 'inaccuracy':
      return `${playedSan} gives up ${pawns} - ${expectedSan} is the line.`;
    case 'mistake':
      return `${playedSan} loses ${pawns} - ${expectedSan} is the line.`;
    case 'blunder':
      return `${playedSan} throws away ${pawns} - ${expectedSan} is the line.`;
    default:
      return `${playedSan} is playable, but ${expectedSan} is the line.`;
  }
}
