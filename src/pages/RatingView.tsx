import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';

import { computeRating, computeZatoRating, computeDirectionRatings, rankValues, rankColor, fmt, type RatingCalcType, type MunRating } from '@/lib/rating';
import { RATING_DEFAULT_PERIODS } from '@/lib/data';
import { EMPTY_TREE_FILTER, chevronParents, visibleTree } from '@/lib/indTree';
import { TreeToggle } from '@/components/IndToolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { RoleId } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, Minus, Calculator, Info } from 'lucide-react';

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

function TableMeta({ periodName, formula }: { periodName: string; formula?: string }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
      <span>Территория: <b className="font-semibold text-slate-800">Московская область</b></span>
      <span>Период сбора: <b className="font-semibold text-slate-800">{periodName}</b></span>
      <span>Источник данных: <b className="font-semibold text-slate-800">Ведомственные данные</b></span>
      <span>Дата последнего обновления: <b className="font-semibold text-slate-800">{now()}</b></span>
      {formula && (
        <span>Формула: <b className="font-semibold text-blue-700 font-mono">{formula}</b></span>
      )}
    </div>
  );
}

/** Повёрнутый текст шапки (читается снизу вверх, как в референсном отчёте) */
function RotatedHeader({ text, height, align = 'center' }: { text: string; height: number; align?: 'center' | 'end' }) {
  return (
    <div
      className={`flex justify-center overflow-hidden ${align === 'end' ? 'items-end' : 'items-center'}`}
      style={{ height }}
    >
      <span
        className="whitespace-nowrap text-[11px] leading-tight"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        {text}
      </span>
    </div>
  );
}

/** Цвет ячейки матрицы «По показателям»: зелёный (топ-30%) → жёлтый → красный (при 51 ОМСУ: 1–15 / 16–40 / 41–51) */
function cellColor(rank: number | null, n: number): string {
  if (rank == null) return '#f1f5f9';
  const t = (rank - 1) / Math.max(1, n - 1);
  if (t < 0.3) return '#90ee90';
  if (t < 0.8) return '#ffff99';
  return '#ff9999';
}

// Матричные таблицы рейтинга (стиль референсного отчёта: серая шапка #d9d9d9, рамки #ccc, по центру)
const mTh = 'border border-[#ccc] bg-[#d9d9d9] px-1 py-1 text-center text-[12px] font-bold align-middle';
const mTd = 'border border-[#ccc] px-1 py-1 text-center text-[12px] whitespace-nowrap';

export function RatingView({ role }: { role?: RoleId } = {}) {
  const { state, dispatch } = useStore();
  const mode = state.ratingMode;

  const canConfigureFormula = role === 'admin' || role === 'mef';
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [formulaInput, setFormulaInput] = useState(state.finalRatingFormula || 'СУММ(Ранг_показателя * Вес)');

  // ── Выпадающие списки-фильтры ─────────────────────────────────────────────
  // 1. Тип расчёта: исходный алгоритм / индивидуальный вес
  const [calcType, setCalcType] = useState<RatingCalcType>('base');
  // 2. Периоды сбора рейтинга
  const ratingPeriods = useMemo(() => {
    const curName = state.campaign.module === 'rating' && state.campaign.period
      ? state.campaign.period
      : RATING_DEFAULT_PERIODS[0].name;
    return [
      { id: 'cur', name: `${curName} (текущий сбор)`, quarter: 1, isCurrent: true },
      ...RATING_DEFAULT_PERIODS.slice(1).map((p) => ({ ...p, isCurrent: false })),
    ];
  }, [state.campaign.module, state.campaign.period]);

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('cur');
  const selectedPeriodObj = ratingPeriods.find((p) => p.id === selectedPeriodId) || ratingPeriods[0];
  const period = selectedPeriodObj.quarter ?? 1;
  const selectedPeriodName = selectedPeriodObj.name;
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
  // 7. Вкладка «Сравнение вариантов»: сортировка строк
  const [compareSort, setCompareSort] = useState<string>('none');

  const rows = useMemo(() => computeRating(state, mode, { calcType, period }), [state, mode, calcType, period]);
  // Вкладка «По показателям»: место с учётом индивидуальных весов показателей
  const weightedRows = useMemo(() => computeRating(state, mode, { calcType: 'individual', period }), [state, mode, period]);
  // Короткие названия ответственных ЦИО для шапки «По показателям»
  const cioById = useMemo(() => new Map(state.cios.map((c) => [c.id, c])), [state.cios]);
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
  // «По показателям»: группировка показателей по направлениям для шапки-группы
  const indGroups = useMemo(() => {
    const groups: { dirId: string; dirName: string; inds: typeof matrixInds }[] = [];
    for (const ind of matrixInds) {
      const dir = state.directions.find((d) => d.id === ind.directionId);
      const last = groups[groups.length - 1];
      if (last && last.dirId === ind.directionId) last.inds.push(ind);
      else groups.push({ dirId: ind.directionId, dirName: dir?.name ?? '', inds: [ind] });
    }
    return groups;
  }, [matrixInds, state.directions]);

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
            Период сбора: {selectedPeriodName} · Тип расчёта: {calcType === 'base' ? 'исходный алгоритм' : 'индивидуальный вес'} · Источник данных: ведомственные данные · Обновлено: {now()}
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
            {tab !== 'compare' && (
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
            )}
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Период сбора</span>
              <div>
                <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                  <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ratingPeriods.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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
            {tab === 'compare' && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Сортировка</span>
                <div>
                  <Select value={compareSort} onValueChange={setCompareSort}>
                    <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без сортировки</SelectItem>
                      <SelectItem value="base-desc">Место без учета веса по убыванию</SelectItem>
                      <SelectItem value="base-asc">Место без учета веса по возрастанию</SelectItem>
                      <SelectItem value="ind-desc">Место с учетом веса по убыванию</SelectItem>
                      <SelectItem value="ind-asc">Место с учетом веса по возрастанию</SelectItem>
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
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <TabsList>
                <TabsTrigger value="territory">Сводная оценка по территории</TabsTrigger>
                <TabsTrigger value="direction">Сводная оценка по разделу показателя</TabsTrigger>
                <TabsTrigger value="indicators">Сводная оценка по показателям</TabsTrigger>
                <TabsTrigger value="compare">Сравнение вариантов расчёта</TabsTrigger>
              </TabsList>
              {canConfigureFormula && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormulaInput(state.finalRatingFormula || 'СУММ(Ранг_показателя * Вес)');
                    setIsFormulaModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 border-blue-200 bg-blue-50/60 text-blue-800 hover:bg-blue-100 hover:text-blue-900 font-medium shadow-xs"
                >
                  <Calculator className="h-4 w-4 text-blue-600" />
                  Настройка итогового рейтинга
                </Button>
              )}
            </div>

            {/* ===== По территории ===== */}
            <TabsContent value="territory">
              <TableMeta periodName={selectedPeriodName} formula={state.finalRatingFormula} />
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
              <TableMeta periodName={selectedPeriodName} formula={state.finalRatingFormula} />
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
              <TableMeta periodName={selectedPeriodName} formula={state.finalRatingFormula} />
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={`${mTh} sticky left-0 z-20`} rowSpan={4} style={{ width: 34 }}>
                        <RotatedHeader text="Направления/показатели" height={680} />
                      </th>
                      <th className={`${mTh} sticky left-[34px] z-20`} rowSpan={4} />
                      <th className={mTh} rowSpan={3}>
                        <RotatedHeader text="Индивидуальный вес" height={660} />
                      </th>
                      <th className={mTh} rowSpan={3}>
                        <RotatedHeader text="Итоговый рейтинг" height={660} />
                      </th>
                      {indGroups.map((g) => (
                        <th key={g.dirId} className={mTh} colSpan={g.inds.length}>{g.dirName}</th>
                      ))}
                    </tr>
                    <tr>
                      {matrixInds.map((ind) => (
                        <th key={ind.id} className={mTh} title={cioById.get(ind.cioId)?.name}>
                          <RotatedHeader text={cioById.get(ind.cioId)?.short ?? '—'} height={64} />
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {matrixInds.map((ind) => (
                        <th key={ind.id} className={mTh} title={`${ind.num} ${ind.name}`}>
                          <RotatedHeader text={`${ind.num} ${ind.name.replace(/^Справочно:\s*/, '')}`} height={440} align="end" />
                        </th>
                      ))}
                    </tr>
                    <tr>
                      <th className={mTh}>
                        <RotatedHeader text="Место с учетом весов показателей" height={190} />
                      </th>
                      <th className={mTh}>
                        <RotatedHeader text="Место по значению" height={190} />
                      </th>
                      {matrixInds.map((ind) => (
                        <th key={ind.id} className={mTh}>
                          <RotatedHeader text="Место по значению" height={190} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {munsSorted.map((m, idx) => {
                      const r = rows.find((x) => x.munId === m.id);
                      const wr = weightedRows.find((x) => x.munId === m.id);
                      if (!r || !wr) return null;
                      return (
                        <tr key={m.id}>
                          <td className={`${mTd} sticky left-0 z-10 bg-white`} style={{ width: 34 }} />
                          <td className={`${mTd} sticky left-[34px] z-10 bg-white font-medium`}>{idx + 1}. {m.name}</td>
                          <td
                            className={mTd}
                            style={{ background: cellColor(wr.place, n) }}
                            title={`С учётом индивидуальных весов показателей: ${fmt(wr.score, 0)}`}
                          >
                            {wr.place ?? '—'}
                          </td>
                          <td
                            className={`${mTd} font-semibold`}
                            style={{ background: cellColor(r.place, n) }}
                            title={`Итоговый рейтинг (${calcType === 'individual' ? 'индивидуальный вес' : 'сумма мест'}): ${fmt(r.score, 0)}`}
                          >
                            {r.place ?? '—'}
                          </td>
                          {matrixInds.map((ind) => {
                            const c = r.cells[ind.id];
                            return (
                              <td
                                key={ind.id}
                                className={mTd}
                                style={{ background: cellColor(c?.rank ?? null, n) }}
                                title={`${ind.num} ${ind.name}: ${fmt(c?.value ?? null)}${c && !c.approved ? ' (не согласовано)' : ''}`}
                              >
                                {c?.rank ?? '—'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                В ячейках — место ОМСУ по значению показателя (наведите курсор для просмотра значения). «Место с учетом весов показателей» — итоговое место при расчёте с индивидуальными весами показателей.
              </p>
            </TabsContent>

            {/* ===== Сравнение вариантов ===== */}
            <TabsContent value="compare">
              <CompareVariants sort={compareSort} period={period} periodName={selectedPeriodName} />
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>

      {/* Модальное окно «Настройка итогового рейтинга» */}
      <Dialog open={isFormulaModalOpen} onOpenChange={setIsFormulaModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-5 w-5 text-blue-600" />
              Настройка итогового рейтинга
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Задайте математическую формулу расчета итогового рейтинга ОМСУ.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rating-formula" className="text-sm font-semibold">
                Формула
              </Label>
              <Input
                id="rating-formula"
                value={formulaInput}
                onChange={(e) => setFormulaInput(e.target.value)}
                placeholder="СУММ(Ранг_показателя * Вес)"
                className="font-mono text-xs h-9"
              />
              <p className="text-[11px] text-muted-foreground">
                Формула задает алгоритм расчета итогового рейтинга ОМСУ.
              </p>
            </div>

            <div className="rounded-md border bg-slate-50 p-2.5 text-xs space-y-1.5">
              <div className="font-medium text-slate-700 flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-blue-500" />
                Примеры и переменные:
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  'СУММ(Ранг_показателя * Вес)',
                  'СУММ(Балл_направления)',
                  'СРЗНАЧ(Ранг_показателя)',
                  'Ранг_показателя',
                  'Вес',
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setFormulaInput(chip)}
                    className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    title={`Вставить "${chip}"`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFormulaModalOpen(false)}
            >
              Отмена
            </Button>
            <Button
              size="sm"
              onClick={() => {
                dispatch({
                  type: 'SET_FINAL_RATING_FORMULA',
                  formula: formulaInput.trim() || 'СУММ(Ранг_показателя * Вес)',
                });
                setIsFormulaModalOpen(false);
              }}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Сравнение вариантов: «Исходный алгоритм» (равные веса) и «Индивидуальный вес» показателей */
function CompareVariants({ sort, period, periodName }: { sort: string; period: number; periodName: string }) {
  const { state } = useStore();
  const mode = state.ratingMode;
  const n = state.omsus.length;
  const baseRows = useMemo(() => computeRating(state, mode, { calcType: 'base', period }), [state, mode, period]);
  const indRows = useMemo(() => computeRating(state, mode, { calcType: 'individual', period }), [state, mode, period]);

  // Сводные строки: место без учета веса (исходный алгоритм) и с учетом веса (индивидуальный вес)
  const compareRows = useMemo(() => {
    const indById = new Map(indRows.map((r) => [r.munId, r]));
    const list = baseRows.map((r) => {
      const ir = indById.get(r.munId);
      return {
        munId: r.munId,
        name: r.name,
        basePlace: r.place,
        indPlace: ir?.place ?? null,
      };
    });
    // без сортировки — по алфавиту
    list.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    if (sort !== 'none') {
      const key: 'basePlace' | 'indPlace' = sort.startsWith('base') ? 'basePlace' : 'indPlace';
      const desc = sort.endsWith('desc');
      list.sort((a, b) => {
        const va = a[key], vb = b[key];
        if (va == null && vb == null) return a.name.localeCompare(b.name, 'ru');
        if (va == null) return 1; // ОМСУ без места — в конец
        if (vb == null) return -1;
        return desc ? vb - va : va - vb;
      });
    }
    return list;
  }, [baseRows, indRows, sort]);

  return (
    <div className="overflow-x-auto">
      <TableMeta periodName={periodName} formula={state.finalRatingFormula} />
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={mTh} style={{ width: 34 }} />
            <th className={mTh}>Территории</th>
            <th className={mTh}>Исходный алгоритм</th>
            <th className={mTh}>Индивидуальный вес</th>
          </tr>
        </thead>
        <tbody>
          {compareRows.map((r, idx) => (
            <tr key={r.munId}>
              <td className={`${mTd} text-left`}>{idx + 1}.</td>
              <td className={`${mTd} text-left`}>{r.name}</td>
              <td className={mTd} style={{ background: cellColor(r.basePlace, n) }}>{r.basePlace ?? '—'}</td>
              <td className={mTd} style={{ background: cellColor(r.indPlace, n) }}>{r.indPlace ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground mt-2">
        Сравнение позволяет куратору МЭФ оценить чувствительность итогового места к методике расчёта до утверждения итогового рейтинга.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Рейтинг ОМСУ ЗАТО — отдельная страница (подраздел «Рейтинг ОМСУ»)
// ─────────────────────────────────────────────────────────────────────────────
export function ZatoRatingView({ role }: { role?: RoleId } = {}) {
  const { state, dispatch } = useStore();
  const mode = state.ratingMode;
  const canConfigureFormula = role === 'admin' || role === 'mef';

  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [formulaInput, setFormulaInput] = useState(state.finalRatingFormulaZato || 'СУММ(Ранг_показателя * Вес)');

  const ratingPeriods = useMemo(() => {
    const curName = state.campaign.module === 'rating' && state.campaign.period
      ? state.campaign.period
      : RATING_DEFAULT_PERIODS[0].name;
    return [
      { id: 'cur', name: `${curName} (текущий сбор)`, quarter: 1, isCurrent: true },
      ...RATING_DEFAULT_PERIODS.slice(1).map((p) => ({ ...p, isCurrent: false })),
    ];
  }, [state.campaign.module, state.campaign.period]);

  const [calcType, setCalcType] = useState<RatingCalcType>('base');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('cur');
  const selectedPeriodObj = ratingPeriods.find((p) => p.id === selectedPeriodId) || ratingPeriods[0];
  const period = selectedPeriodObj.quarter ?? 1;
  const selectedPeriodName = selectedPeriodObj.name;

  const [tab, setTab] = useState('zterritory');
  const [selMun, setSelMun] = useState<string>('m52');
  const [selInd, setSelInd] = useState<string>('total');
  const [withDyn, setWithDyn] = useState(false);
  const [sortDir, setSortDir] = useState<string>('none');
  const [compareSort, setCompareSort] = useState<string>('none');

  const zatoRows = useMemo(() => computeZatoRating(state, mode, { calcType, period }), [state, mode, calcType, period]);
  const zatoInds = useMemo(() => state.indicators.filter((i) => !i.isGroup && i.zato), [state.indicators]);
  const zatoMunsSorted = useMemo(
    () => zatoRows.slice().sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [zatoRows],
  );
  const zatoDirRows = useMemo(() => computeDirectionRatings(state, zatoRows, { calcType }), [state, zatoRows, calcType]);
  const zatoN = zatoRows.length;

  const activeDirections = useMemo(() =>
    selInd === 'total'
      ? state.directions.filter((d) => zatoInds.some((i) => i.directionId === d.id))
      : (state.directions.find((d) => d.id === selInd) ? [state.directions.find((d) => d.id === selInd)!] : []),
    [state.directions, zatoInds, selInd],
  );

  const dynPlaces = (key: string) =>
    rankValues(zatoRows.map((m) => ({ id: m.munId, value: dynDelta(key + m.munId) })), 'max');

  const thCls = 'border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700';
  const tdCls = 'border border-slate-100 px-3 py-1.5 text-xs text-slate-800';

  if (zatoInds.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Нет показателей с признаком «ЗАТО». Установите флажок «ЗАТО» в настройках показателя для включения его в рейтинг ЗАТО.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Тип расчёта</span>
              <Select value={calcType} onValueChange={(v) => setCalcType(v as RatingCalcType)}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Исходный алгоритм (равные веса)</SelectItem>
                  <SelectItem value="individual">Индивидуальный вес показателей</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Период сбора</span>
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ratingPeriods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(tab === 'zterritory' || tab === 'zdirection') && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Показатели ЗАТО</span>
                <Select value={selInd} onValueChange={setSelInd}>
                  <SelectTrigger className="w-64">
                    <SelectValue>{selInd === 'total' ? 'Итоговый рейтинг ЗАТО' : (state.directions.find(d => d.id === selInd)?.name ?? '')}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">Итоговый рейтинг ЗАТО</SelectItem>
                    {state.directions.filter(d => zatoInds.some(i => i.directionId === d.id)).map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {tab === 'zterritory' && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Территория ЗАТО</span>
                <Select value={selMun} onValueChange={setSelMun}>
                  <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {zatoMunsSorted.map((m) => (
                      <SelectItem key={m.munId} value={m.munId}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {tab === 'zdirection' && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Сортировка</span>
                <Select value={sortDir} onValueChange={setSortDir}>
                  <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без сортировки</SelectItem>
                    <SelectItem value="place-asc">Место по возрастанию</SelectItem>
                    <SelectItem value="place-desc">Место по убыванию</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {tab === 'zcompare' && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Сортировка</span>
                <Select value={compareSort} onValueChange={setCompareSort}>
                  <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">По алфавиту</SelectItem>
                    <SelectItem value="base-asc">Исх. алгоритм ↑</SelectItem>
                    <SelectItem value="base-desc">Исх. алгоритм ↓</SelectItem>
                    <SelectItem value="ind-asc">Инд. вес ↑</SelectItem>
                    <SelectItem value="ind-desc">Инд. вес ↓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {(tab === 'zterritory' || tab === 'zdirection') && (
              <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={withDyn} onChange={(e) => setWithDyn(e.target.checked)} />
                С учётом динамики
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Легенда */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>min</span>
        <div className="h-3 w-64 rounded" style={{ background: 'linear-gradient(to right, #b7e4a8, #fff2a0, #ffb3a7)' }} />
        <span>max</span>
      </div>

      {/* Таблицы */}
      <Card>
        <CardContent className="pt-4">
          <TableMeta periodName={selectedPeriodName} formula={state.finalRatingFormulaZato} />
          <Tabs value={tab} onValueChange={setTab}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <TabsList>
                <TabsTrigger value="zterritory">Сводная оценка по территории</TabsTrigger>
                <TabsTrigger value="zdirection">Сводная оценка по разделу показателя</TabsTrigger>
                <TabsTrigger value="zindicators">Сводная оценка по показателям</TabsTrigger>
                <TabsTrigger value="zcompare">Сравнение вариантов расчёта</TabsTrigger>
              </TabsList>
              {canConfigureFormula && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormulaInput(state.finalRatingFormulaZato || 'СУММ(Ранг_показателя * Вес)');
                    setIsFormulaModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 border-blue-200 bg-blue-50/60 text-blue-800 hover:bg-blue-100 hover:text-blue-900 font-medium shadow-xs"
                >
                  <Calculator className="h-4 w-4 text-blue-600" />
                  Настройка итогового рейтинга ЗАТО
                </Button>
              )}
            </div>

            {/* ─── По территории ─── */}
            <TabsContent value="zterritory">
              {(() => {
                const munRow = zatoRows.find(r => r.munId === selMun);
                const selDir = selInd === 'total' ? null : state.directions.find(d => d.id === selInd) ?? null;
                const topScore = selDir ? (zatoDirRows[selDir.id]?.[selMun]?.score ?? null) : (munRow?.score ?? null);
                const topPlace = selDir ? (zatoDirRows[selDir.id]?.[selMun]?.place ?? null) : (munRow?.place ?? null);
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className={thCls}>Разделы/показатели (ЗАТО)</th>
                          <th className={thCls}>Значение</th>
                          <th className={thCls}>Место по значению</th>
                          <th className={thCls}>Динамика</th>
                          <th className={thCls}>Место по динамике</th>
                          <th className={thCls}>Итоговое место</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="font-semibold bg-blue-50">
                          <td className={tdCls}>{selDir ? `Итоговый рейтинг ЗАТО: ${selDir.name}` : 'Итоговый рейтинг ЗАТО'}</td>
                          <td className={tdCls} style={{ background: rankColor(topPlace, zatoN) }}>{fmt(topScore, 0)}</td>
                          <td className={tdCls} style={{ background: rankColor(topPlace, zatoN) }}>{topPlace ?? '—'}</td>
                          <td className={tdCls}><DynCell delta={dynDelta(selMun + selInd)} /></td>
                          <td className={tdCls}>{withDyn ? (dynPlaces(selInd)[selMun] ?? '—') : '—'}</td>
                          <td className={tdCls} style={{ background: rankColor(topPlace, zatoN) }}>{topPlace ?? '—'}</td>
                        </tr>
                        {activeDirections.map((d) => {
                          const dr = zatoDirRows[d.id]?.[selMun];
                          const dirInds = zatoInds.filter(i => i.directionId === d.id);
                          if (!dirInds.length) return null;
                          return [
                            <tr key={d.id} className="font-medium bg-slate-50">
                              <td className={tdCls}>{d.name}</td>
                              <td className={tdCls} style={{ background: rankColor(dr?.place ?? null, zatoN) }}>{fmt(dr?.score ?? null, 0)}</td>
                              <td className={tdCls} style={{ background: rankColor(dr?.place ?? null, zatoN) }}>{dr?.place ?? '—'}</td>
                              <td className={tdCls}><DynCell delta={dynDelta(selMun + d.id)} /></td>
                              <td className={tdCls}>{withDyn ? (dynPlaces(d.id)[selMun] ?? '—') : '—'}</td>
                              <td className={tdCls} style={{ background: rankColor(dr?.place ?? null, zatoN) }}>{dr?.place ?? '—'}</td>
                            </tr>,
                            ...dirInds.map((ind) => {
                              const c = munRow?.cells[ind.id];
                              return (
                                <tr key={ind.id}>
                                  <td className={tdCls}><span style={{ paddingLeft: 24 }}>{ind.num} {ind.name}</span></td>
                                  <td className={tdCls} style={{ background: rankColor(c?.rank ?? null, zatoN) }}>
                                    {fmt(c?.value ?? null)}{c && !c.approved && c.value !== null && mode === 'preview' ? ' *' : ''}
                                  </td>
                                  <td className={tdCls} style={{ background: rankColor(c?.rank ?? null, zatoN) }}>{c?.rank ?? '—'}</td>
                                  <td className={tdCls}><DynCell delta={dynDelta(selMun + ind.id)} /></td>
                                  <td className={tdCls}>{withDyn ? (dynPlaces(ind.id)[selMun] ?? '—') : '—'}</td>
                                  <td className={tdCls} style={{ background: rankColor(c?.rank ?? null, zatoN) }}>{c?.rank ?? '—'}</td>
                                </tr>
                              );
                            }),
                          ];
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </TabsContent>

            {/* ─── По разделу показателя ─── */}
            <TabsContent value="zdirection">
              {(() => {
                let list = zatoMunsSorted.slice();
                if (sortDir !== 'none') {
                  const getPlace = (r: typeof list[0]) =>
                    selInd === 'total' ? r.place : (zatoDirRows[selInd]?.[r.munId]?.place ?? null);
                  const desc = sortDir.endsWith('-desc');
                  list.sort((a, b) => {
                    const va = getPlace(a), vb = getPlace(b);
                    if (va == null && vb == null) return a.name.localeCompare(b.name, 'ru');
                    if (va == null) return 1;
                    if (vb == null) return -1;
                    return desc ? vb - va : va - vb;
                  });
                }
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className={thCls}>Территории (ЗАТО)</th>
                          <th className={thCls}>Значение</th>
                          <th className={thCls}>Место по значению</th>
                          <th className={thCls}>Динамика</th>
                          <th className={thCls}>Место по динамике</th>
                          <th className={thCls}>Итоговое место</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((r, idx) => {
                          const dr = selInd === 'total' ? null : (zatoDirRows[selInd]?.[r.munId] ?? null);
                          const val = selInd === 'total' ? r.score : (dr?.score ?? null);
                          const place = selInd === 'total' ? r.place : (dr?.place ?? null);
                          return (
                            <tr key={r.munId}>
                              <td className={tdCls}>{idx + 1}. {r.name}</td>
                              <td className={tdCls} style={{ background: rankColor(place, zatoN) }}>{fmt(val)}</td>
                              <td className={tdCls} style={{ background: rankColor(place, zatoN) }}>{place ?? '—'}</td>
                              <td className={tdCls}><DynCell delta={dynDelta(r.munId + selInd)} /></td>
                              <td className={tdCls}>{withDyn ? (dynPlaces(selInd)[r.munId] ?? '—') : '—'}</td>
                              <td className={tdCls} style={{ background: rankColor(place, zatoN) }}>{place ?? '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </TabsContent>

            {/* ─── По показателям (матрица) ─── */}
            <TabsContent value="zindicators">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={`${mTh} sticky left-0 z-20`} rowSpan={3} style={{ width: 34 }}>
                        <RotatedHeader text="Показатели ЗАТО" height={340} />
                      </th>
                      <th className={`${mTh} sticky left-[34px] z-20`} rowSpan={3} />
                      <th className={mTh} rowSpan={2}>
                        <RotatedHeader text="Итоговый рейтинг" height={320} />
                      </th>
                      {state.directions.filter(d => zatoInds.some(i => i.directionId === d.id)).map((d) => {
                        const cnt = zatoInds.filter(i => i.directionId === d.id).length;
                        return <th key={d.id} className={mTh} colSpan={cnt}>{d.name}</th>;
                      })}
                    </tr>
                    <tr>
                      {zatoInds.map((ind) => (
                        <th key={ind.id} className={mTh} title={`${ind.num} ${ind.name}`}>
                          <RotatedHeader text={`${ind.num} ${ind.name}`} height={280} align="end" />
                        </th>
                      ))}
                    </tr>
                    <tr>
                      <th className={mTh}><RotatedHeader text="Место по значению" height={140} /></th>
                      {zatoInds.map((ind) => (
                        <th key={ind.id} className={mTh}><RotatedHeader text="Место по значению" height={140} /></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {zatoMunsSorted.map((r, idx) => (
                      <tr key={r.munId}>
                        <td className={`${mTd} sticky left-0 z-10 bg-white`} style={{ width: 34 }} />
                        <td className={`${mTd} sticky left-[34px] z-10 bg-white font-medium`}>{idx + 1}. {r.name}</td>
                        <td className={`${mTd} font-semibold`} style={{ background: cellColor(r.place, zatoN) }}>{r.place ?? '—'}</td>
                        {zatoInds.map((ind) => {
                          const c = r.cells[ind.id];
                          return (
                            <td key={ind.id} className={mTd}
                              style={{ background: cellColor(c?.rank ?? null, zatoN) }}
                              title={`${ind.num} ${ind.name}: ${fmt(c?.value ?? null)}`}>
                              {c?.rank ?? '—'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                В ячейках — место ОМСУ ЗАТО по значению показателя среди закрытых административно-территориальных образований.
              </p>
            </TabsContent>

            {/* ─── Сравнение вариантов ─── */}
            <TabsContent value="zcompare">
              {(() => {
                const baseRows = computeZatoRating(state, mode, { calcType: 'base', period });
                const indRows = computeZatoRating(state, mode, { calcType: 'individual', period });
                const indById = new Map(indRows.map(r => [r.munId, r]));
                let list = baseRows
                  .map(r => ({ munId: r.munId, name: r.name, basePlace: r.place, indPlace: indById.get(r.munId)?.place ?? null }))
                  .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
                if (compareSort !== 'none') {
                  const key: 'basePlace' | 'indPlace' = compareSort.startsWith('base') ? 'basePlace' : 'indPlace';
                  const desc = compareSort.endsWith('desc');
                  list.sort((a, b) => {
                    const va = a[key], vb = b[key];
                    if (va == null && vb == null) return a.name.localeCompare(b.name, 'ru');
                    if (va == null) return 1;
                    if (vb == null) return -1;
                    return desc ? vb - va : va - vb;
                  });
                }
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className={mTh} style={{ width: 34 }} />
                          <th className={mTh}>Территории (ЗАТО)</th>
                          <th className={mTh}>Исходный алгоритм</th>
                          <th className={mTh}>Индивидуальный вес</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((r, idx) => (
                          <tr key={r.munId}>
                            <td className={`${mTd} text-left`}>{idx + 1}.</td>
                            <td className={`${mTd} text-left`}>{r.name}</td>
                            <td className={mTd} style={{ background: cellColor(r.basePlace, zatoN) }}>{r.basePlace ?? '—'}</td>
                            <td className={mTd} style={{ background: cellColor(r.indPlace, zatoN) }}>{r.indPlace ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-muted-foreground mt-2">
                      Сравнение позволяет оценить чувствительность итогового места к методике расчёта среди ОМСУ ЗАТО.
                    </p>
                  </div>
                );
              })()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Модальное окно «Настройка итогового рейтинга ЗАТО» */}
      <Dialog open={isFormulaModalOpen} onOpenChange={setIsFormulaModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-5 w-5 text-blue-600" />
              Настройка итогового рейтинга ЗАТО
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Задайте математическую формулу расчета итогового рейтинга ОМСУ для закрытых административно-территориальных образований.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="zato-rating-formula" className="text-sm font-semibold">
                Формула рейтинга ЗАТО
              </Label>
              <Input
                id="zato-rating-formula"
                value={formulaInput}
                onChange={(e) => setFormulaInput(e.target.value)}
                placeholder="СУММ(Ранг_показателя * Вес)"
                className="font-mono text-xs h-9"
              />
              <p className="text-[11px] text-muted-foreground">
                Формула задает алгоритм расчета итогового рейтинга для ОМСУ ЗАТО.
              </p>
            </div>

            <div className="rounded-md border bg-slate-50 p-2.5 text-xs space-y-1.5">
              <div className="font-medium text-slate-700 flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-blue-500" />
                Примеры и переменные:
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  'СУММ(Ранг_показателя * Вес)',
                  'СУММ(Балл_направления)',
                  'СРЗНАЧ(Ранг_показателя)',
                  'Ранг_показателя',
                  'Вес',
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setFormulaInput(chip)}
                    className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    title={`Вставить "${chip}"`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFormulaModalOpen(false)}
            >
              Отмена
            </Button>
            <Button
              size="sm"
              onClick={() => {
                dispatch({
                  type: 'SET_FINAL_RATING_FORMULA_ZATO',
                  formula: formulaInput.trim() || 'СУММ(Ранг_показателя * Вес)',
                });
                setIsFormulaModalOpen(false);
              }}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}