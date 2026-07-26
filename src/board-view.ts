import type { Chess } from 'chess.js';
import type { Course } from './courses';
import { pieceAppearance, pieceCode } from './piece-appearance';
import { routeArrowGeometry } from './route-arrow';
import type { MoveTransition } from './transition-plans';
import { evalLabel, fillFraction, type EvalScore } from './engine/eval-scale';
import type { EngineStatus } from './engine/engine-client';

export function squareName(row: number, column: number, side: Course['side']): string {
  const boardRow = side === 'black' ? 7 - row : row;
  const boardColumn = side === 'black' ? 7 - column : column;
  return `${String.fromCharCode(97 + boardColumn)}${8 - boardRow}`;
}

export type SquareRoute = { from: string; to: string };
export type BoardAnimation = { plan: MoveTransition; arrived: boolean; duration: number };

export function squarePosition(square: string, side: Course['side']): { x: number; y: number } {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  return { x: side === 'black' ? 7 - file : file, y: side === 'black' ? rank : 7 - rank };
}

export function markerPosition(square: string, side: Course['side']): string {
  const position = squarePosition(square, side);
  return `left:${(position.x + .5) * 12.5}%;top:${(position.y + .5) * 12.5}%;`;
}

export function renderRoute(route: SquareRoute | null, side: Course['side'], className: string, markers = true): string {
  if (!route) return '';
  const from = squarePosition(route.from, side);
  const to = squarePosition(route.to, side);
  const geometry = routeArrowGeometry((from.x + .5) * 12.5, (from.y + .5) * 12.5, (to.x + .5) * 12.5, (to.y + .5) * 12.5);
  if (!geometry) return '';
  const headPercent = geometry.width > 0 ? Math.min(100, geometry.head / geometry.width * 100) : 0;
  const markerMarkup = markers
    ? `<span class="route-origin" style="${markerPosition(route.from, side)}"></span><span class="route-target" style="${markerPosition(route.to, side)}"></span>`
    : '';
  return `<div class="board-route ${className}" aria-hidden="true">${markerMarkup}<span class="route-arrow" style="left:${geometry.left}%;top:${geometry.top}%;width:${geometry.width}%;--route-head:${headPercent}%;transform:translateY(-50%) rotate(${geometry.angle}deg)"></span></div>`;
}

export function renderBoard(chess: Chess, selected: string | null, side: Course['side'], guide: SquareRoute | null, route: SquareRoute | null, animation: BoardAnimation | null, dragging: boolean, disabled: boolean, selectableColor: 'w' | 'b'): string {
  const board = chess.board();
  const rows = side === 'black' ? board.slice().reverse().map((row) => row.slice().reverse()) : board;
  const hiddenPieces = new Set<string>(animation?.plan.pieces.map((piece) => piece.from));
  const squares = rows.flatMap((row, rowIndex) => row.map((piece, columnIndex) => {
    const square = squareName(rowIndex, columnIndex, side);
    const dark = (rowIndex + columnIndex) % 2 === 1;
    const selectedClass = selected === square ? 'is-selected' : '';
    const visiblePiece = hiddenPieces.has(square) ? null : piece;
    const appearance = visiblePiece ? pieceAppearance(pieceCode(visiblePiece.color, visiblePiece.type)) : null;
    const movable = !disabled && piece?.color === selectableColor;
    const fileLabel = rowIndex === 7 ? `<span class="coord-file" aria-hidden="true">${square[0]}</span>` : '';
    const rankLabel = columnIndex === 0 ? `<span class="coord-rank" aria-hidden="true">${square[1]}</span>` : '';
    const pieceMarkup = appearance
      ? `<span class="piece piece-side-${appearance.side}">${appearance.glyph}</span>`
      : '<span class="piece"></span>';
    return `<button type="button" class="board-square ${dark ? 'is-dark' : 'is-light'} ${selectedClass}${movable ? ' is-movable' : ''}" data-square="${square}" aria-pressed="${selected === square}" aria-label="${square}${visiblePiece ? `, ${visiblePiece.color === 'w' ? 'white' : 'black'} ${visiblePiece.type}` : ''}"${disabled ? ' disabled' : ''}>${fileLabel}${rankLabel}${pieceMarkup}</button>`;
  })).join('');
  const animatedPieces = animation ? animation.plan.pieces.map((piece) => {
    const from = squarePosition(piece.from, side);
    const to = squarePosition(piece.to, side);
    const appearance = pieceAppearance(piece.piece);
    return `<span class="animated-piece piece-side-${appearance.side} ${animation.arrived ? 'is-arrived' : ''}" style="--move-duration:${animation.duration}ms;--from-x:${from.x};--from-y:${from.y};--to-x:${to.x};--to-y:${to.y}">${appearance.glyph}</span>`;
  }).join('') : '';
  return `<div class="board ${dragging ? 'is-dragging' : ''}" role="group" aria-label="Chess board" aria-busy="${disabled}">${squares}${renderRoute(guide, side, 'guide-overlay', false)}<div class="piece-layer" aria-hidden="true">${animatedPieces}</div>${renderRoute(route, side, 'feedback-overlay')}</div>`;
}

export function renderEvalBar(score: EvalScore | null, status: EngineStatus): string {
  if (status === 'unavailable') return '<p class="eval-note">Engine unavailable</p>';
  const percent = score ? fillFraction(score) * 100 : 50;
  const value = score ? evalLabel(score) : '--';
  return `<div class="eval-bar ${score ? '' : 'is-pending'}"><span class="eval-track" aria-hidden="true"><span class="eval-fill" style="--eval-fill:${percent.toFixed(1)}%"></span></span><span class="eval-value">${value}</span></div>`;
}
