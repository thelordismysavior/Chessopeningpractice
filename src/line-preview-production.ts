import { renderBoard, renderEvalBar, updateBoard, updateEvalBar } from './board-view';
import { engine } from './engine/engine-client';
import { effectiveMoveDuration, loadMoveDuration, moveBeats } from './move-settings';
import { createLinePreview, type LinePreviewController } from './line-preview';
import { app, escapeHtml, levelNames, sideNames, topbarMarkup } from './screens/shell';

export const productionLinePreview: LinePreviewController = createLinePreview(app, {
  engine,
  topbarMarkup: (options) => topbarMarkup({ email: null, ...options }),
  renderBoard,
  updateBoard,
  renderEvalBar,
  updateEvalBar,
  escapeHtml,
  levelNames,
  sideNames,
  timing: {
    loadMoveDuration,
    effectiveMoveDuration,
    moveBeats,
    reducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    window,
  },
});
