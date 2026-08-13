import type { Indicator } from './types';

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
