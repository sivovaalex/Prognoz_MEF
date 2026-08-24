import type { Direction, Indicator } from './types';

/**
 * Нумерация показателей автоматическая: номер определяется позицией
 * показателя среди «своих» (те же parentId) и пересчитывается при
 * добавлении, изменении и перетаскивании (drag-and-drop).
 */

/** Активен ли показатель на дату (мягкое удаление через actualTo) */
export const isIndActive = (i: Indicator, date: string): boolean =>
  i.actualFrom <= date && (!i.actualTo || i.actualTo > date);

/** Числовой префикс названия раздела (например, «1. Демография…» → «1») */
const dirNumOf = (directions: Direction[], directionId: string): string =>
  directions.find((d) => d.id === directionId)?.name.match(/^(\d+)/)?.[1] || '0';

/**
 * Номер верхнего уровня: «1.1» (с номером раздела) или «1» (без номера).
 * Схема определяется по номеру первого существующего верхнего показателя.
 */
const topNum = (directionId: string, idx: number, pool: Indicator[], directions: Direction[]): string => {
  const dn = dirNumOf(directions, directionId);
  const tops = pool.filter((x) => x.parentId === null && x.directionId === directionId);
  const first = tops[0];
  if (first && !first.num.startsWith(`${dn}.`)) return `${idx + 1}`;
  return `${dn}.${idx + 1}`;
};

/** Номер узла по его позиции среди «своих» (рекурсивно через родителей) */
const numOf = (
  ind: Indicator,
  byId: Map<string, Indicator>,
  pool: Indicator[],
  directions: Direction[],
  visited: Set<string>,
): string => {
  if (visited.has(ind.id)) return dirNumOf(directions, ind.directionId); // защита от циклов
  visited.add(ind.id);
  if (!ind.parentId) {
    const sibs = pool.filter((x) => x.parentId === null && x.directionId === ind.directionId);
    return topNum(ind.directionId, sibs.findIndex((x) => x.id === ind.id), pool, directions);
  }
  const parent = byId.get(ind.parentId);
  const pnum = parent ? numOf(parent, byId, pool, directions, visited) : dirNumOf(directions, ind.directionId);
  const sibs = pool.filter((x) => x.parentId === ind.parentId);
  const idx = sibs.findIndex((x) => x.id === ind.id);
  return idx >= 0 ? `${pnum}.${idx + 1}` : pnum;
};

/**
 * Автоматический номер показателя по позиции.
 * - существующий показатель (id передан) — его позиция среди «своих» сейчас;
 * - новый показатель — в конец списка детей выбранного родителя/раздела.
 */
export function autoIndicatorNum(
  all: Indicator[],
  directions: Direction[],
  date: string,
  candidate: { id?: string; parentId: string | null; directionId: string },
): string {
  const byId = new Map(all.map((i) => [i.id, i]));
  const activeAll = all.filter((i) => isIndActive(i, date));
  const active = activeAll.filter((i) => i.id !== candidate.id);

  const existing = candidate.id ? byId.get(candidate.id) : undefined;
  if (
    existing &&
    isIndActive(existing, date) &&
    existing.parentId === candidate.parentId &&
    existing.directionId === candidate.directionId
  ) {
    return numOf(existing, byId, activeAll, directions, new Set());
  }

  // новый показатель (или сменены родитель/раздел) — позиция в конце
  if (!candidate.parentId) {
    const sibs = active.filter((x) => x.parentId === null && x.directionId === candidate.directionId);
    return topNum(candidate.directionId, sibs.length, sibs, directions);
  }
  const parent = byId.get(candidate.parentId);
  const pnum = parent ? numOf(parent, byId, active, directions, new Set()) : dirNumOf(directions, candidate.directionId);
  const sibs = active.filter((x) => x.parentId === candidate.parentId);
  return `${pnum}.${sibs.length + 1}`;
}

/**
 * Пересчитывает num и level у всех активных показателей по их позиции в дереве.
 * Вызывается после добавления, изменения, удаления и перемещения показателей.
 */
export function renumberAll(all: Indicator[], directions: Direction[], date: string): Indicator[] {
  const byId = new Map(all.map((i) => [i.id, i]));
  const active = all.filter((i) => isIndActive(i, date));
  const numCache = new Map<string, string>();
  const levelCache = new Map<string, number>();

  const compute = (ind: Indicator, visited: Set<string>): string => {
    const cached = numCache.get(ind.id);
    if (cached) return cached;
    if (visited.has(ind.id)) return ind.num; // защита от циклов
    visited.add(ind.id);
    let num: string;
    let level: number;
    if (!ind.parentId) {
      const dn = dirNumOf(directions, ind.directionId);
      const sibs = active.filter((x) => x.parentId === null && x.directionId === ind.directionId);
      const idx = sibs.findIndex((x) => x.id === ind.id);
      const first = sibs[0];
      num = first && !first.num.startsWith(`${dn}.`) ? `${idx + 1}` : `${dn}.${idx + 1}`;
      level = 1;
    } else {
      const parent = byId.get(ind.parentId);
      const pnum = parent ? compute(parent, visited) : dirNumOf(directions, ind.directionId);
      const sibs = active.filter((x) => x.parentId === ind.parentId);
      const idx = sibs.findIndex((x) => x.id === ind.id);
      num = idx >= 0 ? `${pnum}.${idx + 1}` : ind.num;
      level = (parent ? (levelCache.get(ind.parentId) ?? 1) : 0) + 1;
    }
    numCache.set(ind.id, num);
    levelCache.set(ind.id, level);
    return num;
  };

  return all.map((i) => {
    if (!isIndActive(i, date)) return i;
    compute(i, new Set());
    return { ...i, num: numCache.get(i.id) ?? i.num, level: levelCache.get(i.id) ?? i.level };
  });
}

/** ID узла и всех его потомков */
export function subtreeIds(all: Indicator[], rootId: string): Set<string> {
  const out = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    all.forEach((i) => {
      if (i.parentId && out.has(i.parentId) && !out.has(i.id)) {
        out.add(i.id);
        grew = true;
      }
    });
  }
  return out;
}

/** Является ли `id` потомком `ancestorId` */
export const isDescendant = (all: Indicator[], ancestorId: string, id: string): boolean =>
  subtreeIds(all, ancestorId).has(id);

/** Справочный показатель — наименование начинается с префикса «Справочно» */
export const isReference = (i: Indicator): boolean => /^справочно/i.test(i.name.trim());

/** Идентификаторы узлов, у которых есть дочерние показатели */
export function parentIdSet(inds: Indicator[]): Set<string> {
  const s = new Set<string>();
  inds.forEach((i) => { if (i.parentId) s.add(i.parentId); });
  return s;
}

/**
 * Узлы, у которых должна отрисовываться кнопка сворачивания:
 * есть хотя бы один потомок, не скрытый жёстким правилом «Скрыть справочные».
 */
export function chevronParents(all: Indicator[]): Set<string> {
  return parentIdSet(all);
}

export interface TreeFilter {
  query: string;   // поиск по наименованию
  cioId: string;   // 'all' или id ответственного ЦИО
  status?: string; // статус
  actualDate?: string; // дата актуальности
}

export const EMPTY_TREE_FILTER: TreeFilter = { 
  query: '', 
  cioId: 'all', 
  status: 'all',
};

export const isTreeFilterActive = (f: TreeFilter): boolean =>
  f.query.trim() !== '' || f.cioId !== 'all' || (f.status !== undefined && f.status !== 'all');

/**
 * Видимые узлы дерева показателей.
 * Без активных фильтров — применяется сворачивание (collapsed).
 * С активными фильтрами — сворачивание игнорируется, показываются совпавшие узлы
 * и их цепочки предков для контекста. «Скрыть справочные» — жёсткое правило:
 * справочный узел не показывается, даже если у него есть видимые потомки.
 */
export function visibleTree(
  all: Indicator[],
  collapsed: Record<string, boolean>,
  f: TreeFilter,
): Indicator[] {
  const byId = new Map(all.map((i) => [i.id, i]));

  if (isTreeFilterActive(f)) {
    const q = f.query.trim().toLowerCase();
    const match = (i: Indicator): boolean => {
      if (f.cioId !== 'all' && i.cioId !== f.cioId) return false;
      if (q && !i.name.toLowerCase().includes(q)) return false;
      return true;
    };
    const keep = new Set<string>();
    all.forEach((i) => {
      if (!match(i)) return;
      let cur: Indicator | undefined = i;
      while (cur && !keep.has(cur.id)) {
        keep.add(cur.id);
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
      }
    });
    return all.filter((i) => keep.has(i.id));
  }

  const hidden = new Set<string>();
  all.forEach((i) => {
    let p = i.parentId;
    while (p) {
      if (collapsed[p]) { hidden.add(i.id); break; }
      p = byId.get(p)?.parentId ?? null;
    }
  });
  return all.filter((i) => !hidden.has(i.id));
}
