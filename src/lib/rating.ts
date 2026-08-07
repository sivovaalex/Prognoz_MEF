import type { AppState } from './types';
import { MUNICIPALITIES, DIRECTIONS } from './data';

export interface CellData {
  value: number | null;
  approved: boolean;   // согласовано ли значение
  rank: number | null; // место по значению среди ОМСУ
}

export interface MunRating {
  munId: string;
  name: string;
  cells: Record<string, CellData>;   // indId -> cell
  score: number | null;              // сумма мест
  place: number | null;              // итоговое место
  complete: boolean;                 // все значения согласованы
  missing: number;                   // кол-во показателей без согласованного значения
}

export interface DirectionRating {
  directionId: string;
  name: string;
  score: number | null;
  place: number | null;
}

/** Выбор значения в зависимости от режима рейтинга (оценка 2026 — рейтинговый год) */
function pickValue(state: AppState, munId: string, indId: string, mode: 'preview' | 'final') {
  const v = state.omsuValues[munId]?.[indId];
  if (!v || v.v2026 === null) return { value: null, approved: false };
  const approved = v.status === 'approved';
  if (mode === 'final' && !approved) return { value: null, approved: false };
  return { value: v.v2026, approved };
}

/** Ранжирование: лучшее значение = место 1 */
export function rankValues(values: { id: string; value: number }[], optimum: 'max' | 'min'): Record<string, number> {
  const sorted = [...values].sort((x, y) => (optimum === 'max' ? y.value - x.value : x.value - y.value));
  const ranks: Record<string, number> = {};
  let prev: number | null = null;
  let prevRank = 0;
  sorted.forEach((item, idx) => {
    if (prev !== null && item.value === prev) {
      ranks[item.id] = prevRank;
    } else {
      ranks[item.id] = idx + 1;
      prevRank = idx + 1;
    }
    prev = item.value;
  });
  return ranks;
}

/** Полный расчёт рейтинга */
export function computeRating(state: AppState, mode: 'preview' | 'final'): MunRating[] {
  const inds = state.indicators.filter((i) => !i.isGroup);
  const ranksByInd: Record<string, Record<string, number>> = {};
  inds.forEach((ind) => {
    const vals: { id: string; value: number }[] = [];
    MUNICIPALITIES.forEach((m) => {
      const { value } = pickValue(state, m.id, ind.id, mode);
      if (value !== null) vals.push({ id: m.id, value });
    });
    ranksByInd[ind.id] = rankValues(vals, ind.optimum);
  });

  const rows: MunRating[] = MUNICIPALITIES.map((m) => {
    const cells: Record<string, CellData> = {};
    let score = 0;
    let missing = 0;
    inds.forEach((ind) => {
      const { value, approved } = pickValue(state, m.id, ind.id, mode);
      const rank = value !== null ? ranksByInd[ind.id][m.id] ?? null : null;
      if (rank !== null) score += rank * (ind.weight || 1);
      else missing += 1;
      cells[ind.id] = { value, approved, rank };
    });
    return {
      munId: m.id,
      name: m.name,
      cells,
      score: missing === inds.length ? null : score,
      place: null,
      complete: missing === 0,
      missing,
    };
  });

  // итоговое место
  const withScore = rows.filter((r) => r.score !== null).map((r) => ({ id: r.munId, value: r.score as number }));
  const placeRanks = rankValues(withScore, 'min');
  rows.forEach((r) => { r.place = r.score !== null ? placeRanks[r.munId] ?? null : null; });
  return rows;
}

/** Рейтинг по направлению */
export function computeDirectionRatings(state: AppState, rows: MunRating[]): Record<string, Record<string, DirectionRating>> {
  const result: Record<string, Record<string, DirectionRating>> = {};
  DIRECTIONS.forEach((d) => {
    const inds = state.indicators.filter((i) => i.directionId === d.id && !i.isGroup);
    const scores = rows.map((r) => {
      let sum = 0;
      let cnt = 0;
      inds.forEach((ind) => {
        const cell = r.cells[ind.id];
        if (cell?.rank !== null && cell?.rank !== undefined) { sum += cell.rank; cnt += 1; }
      });
      return { munId: r.munId, score: cnt > 0 ? sum : null };
    });
    const placeRanks = rankValues(
      scores.filter((s) => s.score !== null).map((s) => ({ id: s.munId, value: s.score as number })),
      'min',
    );
    result[d.id] = {};
    scores.forEach((s) => {
      result[d.id][s.munId] = {
        directionId: d.id,
        name: d.name,
        score: s.score,
        place: s.score !== null ? placeRanks[s.munId] ?? null : null,
      };
    });
  });
  return result;
}

/** Цвет ячейки по месту: зелёный (лучший) -> жёлтый -> красный (худший) */
export function rankColor(rank: number | null, maxRank: number): string {
  if (rank === null || maxRank <= 1) return '#f3f4f6';
  const t = (rank - 1) / (maxRank - 1); // 0 = лучший
  if (t < 0.34) return '#b7e4a8';
  if (t < 0.67) return '#fff2a0';
  return '#ffb3a7';
}

/** Статистика согласования для дашборда */
export function approvalStats(state: AppState) {
  let total = 0, approved = 0, pending = 0, returned = 0, draft = 0, empty = 0;
  Object.values(state.omsuValues).forEach((perMun) => {
    state.indicators.filter((i) => !i.isGroup).forEach((ind) => {
      const v = perMun[ind.id];
      total += 1;
      if (!v || v.status === 'not_filled') empty += 1;
      else if (v.status === 'approved') approved += 1;
      else if (v.status === 'pending_cio') pending += 1;
      else if (v.status === 'returned') returned += 1;
      else draft += 1;
    });
  });
  return { total, approved, pending, returned, draft, empty };
}

export function allApproved(state: AppState): boolean {
  const s = approvalStats(state);
  return s.approved === s.total;
}

export function fmt(v: number | null, digits = 2): string {
  if (v === null || v === undefined) return '—';
  return v.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}
