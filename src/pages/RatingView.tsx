import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';

import { computeRating, computeDirectionRatings, rankValues, rankColor, fmt, type RatingCalcType, type MunRating } from '@/lib/rating';
import { CURRENT_EVAL_YEAR } from '@/lib/data';
import { EMPTY_TREE_FILTER, chevronParents, visibleTree } from '@/lib/indTree';
import { TreeToggle } from '@/components/IndToolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const YEAR = CURRENT_EVAL_YEAR;

function now(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** Детерминированная "динамика" для демо */
function dynDelta(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 997;
  return (h % 5) - 2; // -2..+2
}

function DynCell({ delta }: { delta: number }) {
  if (delta > 0) return <span className="inline-flex items-center gap-1 text-green-700 text-xs"><TrendingUp className="h-3.5 w-3.5" />+{delta}</span>;
  if (delta < 0) return <span className="inline-flex items-center gap-1 text-red-700 text-xs"><TrendingDown className="h-3.5 w-3.5" />{delta}</span>;
  return <span className="inline-flex items-center gap-1 text-gray-500 text-xs"><Minus className="h-3.5 w-3.5" />0</span>;
}

export function RatingView() {
  const { state, dispatch } = useStore();
  const mode = state.ratingMode;

  // ── Выпадающие списки-фильтры ─────────────────────────────────────────────
  // 1. Тип расчёта: исходный алгоритм / индивидуальный вес
  const [calcType, setCalcType] = useState<RatingCalcType>('base');
  // 2. Период: кварталы текущего рейтингового года
  const [period, setPeriod] = useState<number>(() => Math.floor(new Date().getMonth() / 3) + 1);
  // 3. Показатели и направления (вкладки «По территории» и «По разделу показателя»):
  //    «Итоговый рейтинг» или одно из направлений
  const [selInd, setSelInd] = useState<string>('total');
  // 4. Территория
  const [selMun, setSelMun] = useState<string>(state.omsus[0]?.id);
  // 5. С учётом динамики (вкладки «По территории» и «По разделу показателя»)
  const [withDyn, setWithDyn] = useState(false);
  // Активная вкладка
  const [tab, setTab] = useState('territory');
  // 6. Вкладка «По разделу показателя»: сортировка строк
  const [sortDir, setSortDir] = useState<string>('none');

  const rows = useMemo(() => computeRating(state, mode, { calcType, period }), [state, mode, calcType, period]);
  const dirRows = useMemo(() => computeDirectionRatings(state, rows, { calcType }), [state, rows, calcType]);

  // Динамика: место ОМСУ по динамике (1 = лучшая динамика)
  const dynPlaces = (key: string) =>
    rankValues(state.omsus.map((m) => ({ id: m.id, value: dynDelta(key + m.id) })), 'max');
  // Итоговое место с учётом динамики: ранг по (базовый балл + место по динамике)
  const dynAdjustedPlace = (key: string, base: Record<string, number | null>, munId: string): number | null => {
    const dp = dynPlaces(key);
    const combined = state.omsus
      .filter((m) => base[m.id] != null)
      .map((m) => ({ id: m.id, value: (base[m.id] as number) + dp[m.id] }));
    if (!combined.length) return null;
    return rankValues(combined, 'min')[munId] ?? null;
  };

  // Территории: ОМСУ по алфавиту (первая — Балашиха)
  const munsSorted = useMemo(
    () => [...state.omsus].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [state.omsus],
  );

  // Выбранное направление (null — «Итоговый рейтинг»)
  const selDirection = selInd === 'total' ? null : state.directions.find((d) => d.id === selInd) ?? null;
  const activeDirections = selDirection ? [selDirection] : state.directions;

  // Дерево показателей в сводной оценке по территории (с учётом выбранного направления)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const treeInds = useMemo(
    () => state.indicators.filter((i) => activeDirections.some((d) => d.id === i.directionId)),
    [state.indicators, selInd],
  );
  const visible = visibleTree(treeInds, collapsed, EMPTY_TREE_FILTER);
  const parents = chevronParents(treeInds);
  const toggleNode = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  // Матрица показателей: все показатели (фильтр направления действует только на вкладке по территории)
  const matrixInds = useMemo(
    () => state.indicators.filter((i) => !i.isGroup),
    [state.indicators],
  );

  const n = state.omsus.length;
  const mun = rows.find((r) => r.munId === selMun)!;

  // Итоговая строка сводной оценки: по выбранному направлению либо общий рейтинг
  const topScore = selDirection ? (dirRows[selDirection.id]?.[selMun]?.score ?? null) : mun.score;
  const topPlace = selDirection ? (dirRows[selDirection.id]?.[selMun]?.place ?? null) : mun.place;

  // Базовые баллы по всем ОМСУ для расчёта места «с учётом динамики»
  const topBaseScores: Record<string, number | null> = {};
  rows.forEach((r) => {
    topBaseScores[r.munId] = selDirection ? (dirRows[selDirection.id]?.[r.munId]?.score ?? null) : r.score;
  });
  const topPlaceShown = withDyn ? dynAdjustedPlace(selInd, topBaseScores, selMun) : topPlace;

  // Вкладка «По разделу показателя»: базовые баллы выбранного раздела (для «итогового места» с динамикой)
  const dirTabBaseScores: Record<string, number | null> = {};
  rows.forEach((r) => {
    dirTabBaseScores[r.munId] = selInd === 'total' ? r.score : (dirRows[selInd]?.[r.munId]?.score ?? null);
  });

  // Вкладка «По разделу показателя»: сортировка строк
  // (без сортировки / место / место динамики / итоговое место — по возрастанию или убыванию)
  const dirSortedRows: MunRating[] = (() => {
    const list = [...rows].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    if (sortDir === 'none') return list;
    const dp = dynPlaces(selInd);
    const basePlace = (m: MunRating) =>
      selInd === 'total' ? m.place : (dirRows[selInd]?.[m.munId]?.place ?? null);
    const val = (m: MunRating): number | null => {
      if (sortDir === 'place-asc' || sortDir === 'place-desc') return basePlace(m);
      if (sortDir === 'dynplace-asc' || sortDir === 'dynplace-desc') return dp[m.munId] ?? null;
      if (sortDir === 'final-asc' || sortDir === 'final-desc')
        return withDyn ? dynAdjustedPlace(selInd, dirTabBaseScores, m.munId) : basePlace(m);
      return null;
    };
    const desc = sortDir.endsWith('-desc');
    list.sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va == null && vb == null) return a.name.localeCompare(b.name, 'ru');
      if (va == null) return 1; // ОМСУ без места — в конец
      if (vb == null) return -1;
      return desc ? vb - va : va - vb;
    });
    return list;
  })();

  const thCls = 'p-2 text-xs font-medium text-left border-b bg-slate-50';
  const tdCls = 'p-2 text-sm border-b';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Сводный рейтинг ОМСУ</h2>
          <p className="text-sm text-muted-foreground">
            Период: {period} квартал {YEAR} · Тип расчёта: {calcType === 'base' ? 'исходный алгоритм' : 'индивидуальный вес'} · Источник данных: ведомственные данные · Обновлено: {now()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`rounded-full px-3 py-1 text-xs font-medium border ${mode === 'preview' ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white text-gray-600'}`}
            onClick={() => dispatch({ type: 'SET_RATING_MODE', mode: 'preview' })}
          >
            Предварительный (все введённые)
          </button>
          <button
            className={`rounded-full px-3 py-1 text-xs font-medium border ${mode === 'final' ? 'bg-green-100 border-green-400 text-green-900' : 'bg-white text-gray-600'}`}
            onClick={() => dispatch({ type: 'SET_RATING_MODE', mode: 'final' })}
          >
            Итоговый (только согласованные)
          </button>
        </div>
      </div>

      {mode === 'preview' && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
          Предварительный расчёт: учитываются все введённые данные, в т.ч. несогласованные (выделены «*»). Доступен куратору МЭФ в ходе сбора.
        </div>
      )}

      {/* ===== Фильтры: тип расчёта, период, показатели и направления, территория ===== */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Тип расчёта</span>
              <div>
                <Select value={calcType} onValueChange={(v) => setCalcType(v as RatingCalcType)}>
                  <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Исходный алгоритм</SelectItem>
                    <SelectItem value="individual">Индивидуальный вес</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Период</span>
              <div>
                <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((q) => (
                      <SelectItem key={q} value={String(q)}>{q} квартал {YEAR}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(tab === 'territory' || tab === 'direction') && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Показатели и направления</span>
                <div>
                  <Select value={selInd} onValueChange={setSelInd}>
                    <SelectTrigger className="w-80">
                      <SelectValue>
                        {selInd === 'total' ? 'Итоговый рейтинг' : (selDirection?.name ?? '')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total">Итоговый рейтинг</SelectItem>
                      {state.directions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {(tab === 'territory' || tab === 'direction') && (
              <label className="mb-2 flex cursor-pointer select-none items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={withDyn}
                  onChange={(e) => setWithDyn(e.target.checked)}
                />
                С учётом динамики
              </label>
            )}
            {tab === 'direction' && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Сортировка</span>
                <div>
                  <Select value={sortDir} onValueChange={setSortDir}>
                    <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без сортировки</SelectItem>
                      <SelectItem value="place-desc">Место по убыванию</SelectItem>
                      <SelectItem value="place-asc">Место по возрастанию</SelectItem>
                      <SelectItem value="dynplace-desc">Место динамики по убыванию</SelectItem>
                      <SelectItem value="dynplace-asc">Место динамики по возрастанию</SelectItem>
                      <SelectItem value="final-desc">Итоговое место по убыванию</SelectItem>
                      <SelectItem value="final-asc">Итоговое место по возрастанию</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {tab !== 'direction' && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Территория</span>
                <div>
                  <Select value={selMun} onValueChange={setSelMun}>
                    <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {munsSorted.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>min</span>
        <div className="h-3 w-64 rounded" style={{ background: 'linear-gradient(to right, #b7e4a8, #fff2a0, #ffb3a7)' }} />
        <span>max</span>
      </div>

      <Card>
        <CardContent className="pt-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="territory">Сводная оценка по территории</TabsTrigger>
              <TabsTrigger value="direction">Сводная оценка по разделу показателя</TabsTrigger>
              <TabsTrigger value="indicators">Сводная оценка по показателям</TabsTrigger>
              <TabsTrigger value="compare">Сравнение вариантов расчёта</TabsTrigger>
            </TabsList>

            {/* ===== По территории ===== */}
            <TabsContent value="territory">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={thCls}>Разделы показателя/показатели</th>
                      <th className={thCls}>Значение</th>
                      <th className={thCls}>Место по значению</th>
                      <th className={thCls}>Динамика</th>
                      <th className={thCls}>Место по динамике</th>
                      <th className={thCls}>Итоговое место</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-semibold">
                      <td className={tdCls}>{selDirection ? `Итоговый рейтинг: ${selDirection.name}` : 'Итоговый рейтинг'}</td>
                      <td className={tdCls} style={{ background: rankColor(topPlace, n) }}>{fmt(topScore, 0)}</td>
                      <td className={tdCls} style={{ background: rankColor(topPlace, n) }}>{topPlace ?? '—'}</td>
                      <td className={tdCls}><DynCell delta={dynDelta(selMun + selInd)} /></td>
                      <td className={tdCls}>{withDyn ? (dynPlaces(selInd)[selMun] ?? '—') : '—'}</td>
                      <td className={tdCls} style={{ background: rankColor(topPlaceShown, n) }}>{topPlaceShown ?? '—'}</td>
                    </tr>
                    {activeDirections.map((d) => {
                      const dr = dirRows[d.id]?.[selMun];
                      const inds = visible.filter((i) => i.directionId === d.id);
                      if (!inds.length) return [];
                      const dBase: Record<string, number | null> = {};
                      rows.forEach((r) => { dBase[r.munId] = dirRows[d.id]?.[r.munId]?.score ?? null; });
                      const dPlaceShown = withDyn ? dynAdjustedPlace(d.id, dBase, selMun) : (dr?.place ?? null);
                      return [
                        <tr key={d.id} className="font-medium bg-slate-50/60">
                          <td className={tdCls}>{d.name}</td>
                          <td className={tdCls} style={{ background: rankColor(dr?.place ?? null, n) }}>{fmt(dr?.score ?? null, 0)}</td>
                          <td className={tdCls} style={{ background: rankColor(dr?.place ?? null, n) }}>{dr?.place ?? '—'}</td>
                          <td className={tdCls}><DynCell delta={dynDelta(selMun + d.id)} /></td>
                          <td className={tdCls}>{withDyn ? (dynPlaces(d.id)[selMun] ?? '—') : '—'}</td>
                          <td className={tdCls} style={{ background: rankColor(dPlaceShown, n) }}>{dPlaceShown ?? '—'}</td>
                        </tr>,
                        ...inds.map((ind) => {
                          if (ind.isGroup) {
                            return (
                              <tr key={ind.id} className="bg-slate-50/40">
                                <td className={tdCls} colSpan={6}>
                                  <span className="flex items-center gap-1 font-semibold text-slate-600" style={{ paddingLeft: `${24 + (ind.level - 1) * 18}px` }}>
                                    <TreeToggle
                                      hasChildren={parents.has(ind.id)}
                                      collapsed={!!collapsed[ind.id]}
                                      onToggle={() => toggleNode(ind.id)}
                                    />
                                    <span>
                                      <span className="mr-1 text-slate-400">▸</span>
                                      {ind.num} {ind.name}
                                    </span>
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                          const c = mun.cells[ind.id];
                          const iBase: Record<string, number | null> = {};
                          rows.forEach((r) => { iBase[r.munId] = r.cells[ind.id]?.rank ?? null; });
                          const iPlaceShown = withDyn ? dynAdjustedPlace(ind.id, iBase, selMun) : (c?.rank ?? null);
                          return (
                            <tr key={ind.id}>
                              <td className={tdCls}>
                                <span className="flex items-center gap-1" style={{ paddingLeft: `${24 + (ind.level - 1) * 18}px` }}>
                                  <TreeToggle
                                    hasChildren={parents.has(ind.id)}
                                    collapsed={!!collapsed[ind.id]}
                                    onToggle={() => toggleNode(ind.id)}
                                  />
                                  <span>{ind.num} {ind.name}</span>
                                </span>
                              </td>
                              <td className={tdCls} style={{ background: rankColor(c?.rank ?? null, n) }}>
                                {fmt(c?.value ?? null)}{c && !c.approved && c.value !== null && mode === 'preview' ? ' *' : ''}
                              </td>
                              <td className={tdCls} style={{ background: rankColor(c?.rank ?? null, n) }}>{c?.rank ?? '—'}</td>
                              <td className={tdCls}><DynCell delta={dynDelta(selMun + ind.id)} /></td>
                              <td className={tdCls}>{withDyn ? (dynPlaces(ind.id)[selMun] ?? '—') : '—'}</td>
                              <td className={tdCls} style={{ background: rankColor(iPlaceShown, n) }}>{iPlaceShown ?? '—'}</td>
                            </tr>
                          );
                        }),
                      ];
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* ===== По направлению ===== */}
            <TabsContent value="direction">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={thCls}>Территории</th>
                      <th className={thCls}>Значение</th>
                      <th className={thCls}>Место по значению</th>
                      <th className={thCls}>Динамика</th>
                      <th className={thCls}>Место по динамике</th>
                      <th className={thCls}>Итоговое место</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dirSortedRows.map((r, idx) => {
                      const dr = selInd === 'total' ? null : (dirRows[selInd]?.[r.munId] ?? null);
                      const val = selInd === 'total' ? r.score : (dr?.score ?? null);
                      const place = selInd === 'total' ? r.place : (dr?.place ?? null);
                      const finalPlace = withDyn ? dynAdjustedPlace(selInd, dirTabBaseScores, r.munId) : place;
                      return (
                        <tr key={r.munId}>
                          <td className={tdCls}>{idx + 1}. {r.name}</td>
                          <td className={tdCls} style={{ background: rankColor(place, n) }}>{fmt(val)}</td>
                          <td className={tdCls} style={{ background: rankColor(place, n) }}>{place ?? '—'}</td>
                          <td className={tdCls}><DynCell delta={dynDelta(r.munId + selInd)} /></td>
                          <td className={tdCls}>{withDyn ? (dynPlaces(selInd)[r.munId] ?? '—') : '—'}</td>
                          <td className={tdCls} style={{ background: rankColor(finalPlace, n) }}>{finalPlace ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* ===== По показателям (матрица) ===== */}
            <TabsContent value="indicators">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className={`${thCls} sticky left-0 z-10 min-w-[140px]`}>Территория</th>
                      {matrixInds.map((ind) => (
                        <th key={ind.id} className={`${thCls} text-center`} title={ind.name}>{ind.num}</th>
                      ))}
                      <th className={`${thCls} text-center`}>Σ мест</th>
                      <th className={`${thCls} text-center`}>Место</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...rows].sort((a, b) => (a.place ?? 999) - (b.place ?? 999)).map((r) => (
                      <tr key={r.munId}>
                        <td className={`${tdCls} sticky left-0 bg-white font-medium`}>{r.name}</td>
                        {matrixInds.map((ind) => {
                          const c = r.cells[ind.id];
                          return (
                            <td
                              key={ind.id}
                              className={`${tdCls} text-center`}
                              style={{ background: rankColor(c?.rank ?? null, n) }}
                              title={`${ind.name}: ${fmt(c?.value ?? null)}${c && !c.approved ? ' (не согласовано)' : ''}`}
                            >
                              {c?.rank ?? '—'}
                            </td>
                          );
                        })}
                        <td className={`${tdCls} text-center font-medium`} style={{ background: rankColor(r.place, n) }}>{fmt(r.score, 0)}</td>
                        <td className={`${tdCls} text-center font-semibold`} style={{ background: rankColor(r.place, n) }}>{r.place ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">В ячейках — место ОМСУ по показателю (наведите курсор для просмотра значения).</p>
            </TabsContent>

            {/* ===== Сравнение вариантов ===== */}
            <TabsContent value="compare">
              <CompareVariants calcType={calcType} period={period} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

/** Вариант А: сумма мест. Вариант Б: взвешенная сумма нормированных баллов (0..100) */
function CompareVariants({ calcType, period }: { calcType: RatingCalcType; period: number }) {
  const { state } = useStore();
  const mode = state.ratingMode;
  const rows = useMemo(() => computeRating(state, mode, { calcType, period }), [state, mode, calcType, period]);
  const n = state.omsus.length;

  const variantB = useMemo(() => {
    // нормирование: балл = 100 × (1 − (место−1)/(N−1))
    return rows.map((r) => {
      let sum = 0;
      let cnt = 0;
      state.indicators.filter((i) => !i.isGroup).forEach((ind) => {
        const c = r.cells[ind.id];
        if (c?.rank !== null && c?.rank !== undefined) {
          sum += (100 * (1 - (c.rank - 1) / Math.max(n - 1, 1))) * (ind.weight || 1);
          cnt += 1;
        }
      });
      return { munId: r.munId, name: r.name, ball: cnt ? Math.round(sum) : null };
    });
  }, [rows, state.indicators, n]);

  const placeB = useMemo(() => {
    const sorted = [...variantB].filter((v) => v.ball !== null).sort((a, b) => (b.ball ?? 0) - (a.ball ?? 0));
    const map: Record<string, number> = {};
    sorted.forEach((v, i) => { map[v.munId] = i + 1; });
    return map;
  }, [variantB]);

  const tdCls = 'p-2 text-sm border-b';
  const thCls = 'p-2 text-xs font-medium text-left border-b bg-slate-50';

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thCls}>Территория</th>
            <th className={thCls} colSpan={2}>Вариант А — сумма мест</th>
            <th className={thCls} colSpan={2}>Вариант Б — взвешенные баллы (0–100)</th>
            <th className={thCls}>Δ мест</th>
          </tr>
          <tr>
            <th className={thCls}></th>
            <th className={thCls}>Σ мест</th>
            <th className={thCls}>Место</th>
            <th className={thCls}>Балл</th>
            <th className={thCls}>Место</th>
            <th className={thCls}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const b = variantB.find((v) => v.munId === r.munId)!;
            const pb = b.ball !== null ? placeB[r.munId] : null;
            const delta = r.place !== null && pb !== null ? pb - r.place : null;
            return (
              <tr key={r.munId}>
                <td className={`${tdCls} font-medium`}>{r.name}</td>
                <td className={tdCls} style={{ background: rankColor(r.place, n) }}>{fmt(r.score, 0)}</td>
                <td className={tdCls} style={{ background: rankColor(r.place, n) }}>{r.place ?? '—'}</td>
                <td className={tdCls} style={{ background: rankColor(pb, n) }}>{b.ball ?? '—'}</td>
                <td className={tdCls} style={{ background: rankColor(pb, n) }}>{pb ?? '—'}</td>
                <td className={tdCls}>
                  {delta === null ? '—' : delta === 0 ? <span className="text-gray-500">0</span> : (
                    <span className={delta > 0 ? 'text-red-700' : 'text-green-700'}>
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground mt-2">
        Сравнение позволяет куратору МЭФ оценить чувствительность итогового места к методике расчёта до утверждения итогового рейтинга.
      </p>
    </div>
  );
}