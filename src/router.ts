import { coursesById, LEVELS, type Course, type LevelKey } from './courses';
import type { ReviewGroup } from './review-queue';
import type { Screen } from './screens/navigation';

export const HOME_HASH = '#/home';

export type HashRoute =
  | { name: 'dashboard' }
  | { name: 'sources' }
  | { name: 'review-queue' }
  | { name: 'browse'; courseId?: Course['id']; lineId?: string }
  | { name: 'practice'; courseId: Course['id']; level: LevelKey; reviewPositionIds?: string[]; runIndex?: number; runGroups?: ReviewGroup[]; entryHandoff?: { banked: string; next: string; verb?: string } };

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

function courseId(value: string | undefined): Course['id'] | undefined {
  return value && value in coursesById ? value as Course['id'] : undefined;
}

function level(value: string | undefined): LevelKey | undefined {
  return value && LEVELS.includes(value as LevelKey) ? value as LevelKey : undefined;
}

function pathAndQuery(hash: string): { path: string[]; query: URLSearchParams } {
  const raw = hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  return { path: path.split('/').filter(Boolean).map(decode), query: new URLSearchParams(query) };
}

function runGroups(value: string | null): ReviewGroup[] | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    const groups = parsed.filter((group): group is ReviewGroup => {
      if (!group || typeof group !== 'object') return false;
      const candidate = group as Partial<ReviewGroup>;
      return typeof candidate.courseId === 'string' && candidate.courseId in coursesById
        && typeof candidate.level === 'string' && LEVELS.includes(candidate.level as LevelKey)
        && Array.isArray(candidate.positionIds) && candidate.positionIds.every((id) => typeof id === 'string');
    });
    return groups.length === parsed.length ? groups : undefined;
  } catch {
    return undefined;
  }
}

export function parseHash(hash: string): HashRoute {
  const { path, query } = pathAndQuery(hash);
  const [surface, first, second] = path;

  if (!surface || surface === 'home' || surface === 'dashboard') return { name: 'dashboard' };
  if (surface === 'sources') return { name: 'sources' };
  if (surface === 'queue' || surface === 'review-queue') return { name: 'review-queue' };
  if (surface === 'browse') {
    const requestedCourse = first ?? query.get('course') ?? undefined;
    const selectedCourse = courseId(requestedCourse);
    const lineId = second ?? query.get('line') ?? undefined;
    if (requestedCourse && !selectedCourse) return { name: 'dashboard' };
    if (lineId && (!selectedCourse || !LEVELS.some((candidate) => coursesById[selectedCourse].lessons[candidate].variations.some((variation) => variation.id === lineId)))) return { name: 'dashboard' };
    return { name: 'browse', ...(selectedCourse ? { courseId: selectedCourse } : {}), ...(lineId ? { lineId } : {}) };
  }
  if (surface === 'practice') {
    const selectedCourse = courseId(first);
    const selectedLevel = level(second);
    if (!selectedCourse || !selectedLevel) return { name: 'dashboard' };
    const review = query.get('review');
    const run = Number.parseInt(query.get('run') ?? '', 10);
    const groups = runGroups(query.get('groups'));
    const reviewPositionIds = review ? review.split(',').map(decode).filter(Boolean) : undefined;
    const banked = query.get('banked');
    const next = query.get('next');
    return {
      name: 'practice',
      courseId: selectedCourse,
      level: selectedLevel,
      ...(reviewPositionIds?.length ? { reviewPositionIds } : {}),
      ...(Number.isInteger(run) && run >= 0 ? { runIndex: run } : {}),
      ...(groups ? { runGroups: groups } : {}),
      ...(banked && next ? { entryHandoff: { banked, next, verb: query.get('verb') ?? undefined } } : {}),
    };
  }
  return { name: 'dashboard' };
}

function query(values: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

export function hashForScreen(screen: Screen): string {
  switch (screen.name) {
    case 'dashboard':
      return HOME_HASH;
    case 'sources':
      return '#/sources';
    case 'review-queue':
      return '#/review-queue';
    case 'browse':
      return `#/browse${screen.courseId ? `/${encodeURIComponent(screen.courseId)}` : ''}${screen.lineId ? `/${encodeURIComponent(screen.lineId)}` : ''}`;
    case 'practice':
      return `#/practice/${encodeURIComponent(screen.course.id)}/${screen.level}${query({
        review: screen.reviewPositionIds?.join(','),
        run: screen.run ? String(screen.run.index) : undefined,
        groups: screen.run ? JSON.stringify(screen.run.groups) : undefined,
        banked: screen.entryHandoff?.banked,
        next: screen.entryHandoff?.next,
        verb: screen.entryHandoff?.verb,
      })}`;
  }
}

export function hashForRoute(route: HashRoute): string {
  switch (route.name) {
    case 'dashboard':
      return HOME_HASH;
    case 'sources':
      return '#/sources';
    case 'review-queue':
      return '#/review-queue';
    case 'browse':
      return `#/browse${route.courseId ? `/${encodeURIComponent(route.courseId)}` : ''}${route.lineId ? `/${encodeURIComponent(route.lineId)}` : ''}`;
    case 'practice':
      return `#/practice/${encodeURIComponent(route.courseId)}/${route.level}${query({
        review: route.reviewPositionIds?.join(','),
        run: route.runIndex === undefined ? undefined : String(route.runIndex),
        groups: route.runGroups ? JSON.stringify(route.runGroups) : undefined,
        banked: route.entryHandoff?.banked,
        next: route.entryHandoff?.next,
        verb: route.entryHandoff?.verb,
      })}`;
  }
}
