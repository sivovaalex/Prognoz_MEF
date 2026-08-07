import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { MUNICIPALITIES, DIRECTIONS } from '@/lib/data';
import { computeRating, computeDirectionRatings, rankColor, fmt } from '@/lib/rating';
import { EMPTY_TREE_FILTER, chevronParents, visibleTree, type TreeFilter } from '@/lib/indTree';
import { IndToolbar, TreeToggle } from '@/components/IndToolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
  const rows = useMemo(() => computeRating(state, mode), [state, mode]);
  const dirRows = useMemo(() => computeDirectionRatings(state, rows), [state, rows]);
  const [selMun, setSelMun] = useState(MUNICIPALITIES[0].id);
  const [selInd, setSelInd] = useState<string>('total');
  // дерево показателей в сводной оценке по территории
  const [treeFilter, setTreeFilter] = useState<TreeFilter>(EMPTY_TREE_FILTER);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const visible = visibleTree(state.indicators, collapsed, treeFilter);
  const parents = chevronParents(state.indicators);
  const toggleNode = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  const n = MUNICIPALITIES.length;
  const mun = rows.find((r) => r.munId === selMun)!;

  const thCls = 'p-2 text-xs font-medium text-left border-b bg-slate-50';
  const tdCls = 'p-2 text-sm border-b';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Сводный рейтинг ОМСУ</h2>
          <p className="text-sm text-muted-foreground">
            Отчётный период: {state.campaign.period} · Источник данных: ведомственные данные · Обновлено: {now()}
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

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>min</span>
        <div className="h-3 w-64 rounded" style={{ background: 'linear-gradient(to right, #b7e4a8, #fff2a0, #ffb3a7)' }} />
        <span>max</span>
      </div>

      <Card>
        <CardContent className="pt-4">
          <Tabs defaultValue="territory">
            <TabsList className="mb-4">
              <TabsTrigger value="territory">Сводная оценка по территории</TabsTrigger>
              <TabsTrigger value="direction">Сводная оценка по направлению</TabsTrigger>
              <TabsTrigger value="indicators">Сводная оценка по показателям</TabsTrigger>
              <TabsTrigger value="compare">Сравнение вариантов расчёта</TabsTrigger>
            </TabsList>

            {/* ===== По территории ===== */}
            <TabsContent value="territory">
              <div className="mb-3 flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Территория:</span>
                <Select value={selMun} onValueChange={setSelMun}>
                  <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {rows.map((r) => <SelectItem key={r.munId} value={r.munId}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {!mun.complete && <Badge variant="outline" className="text-amber-700 border-amber-300">неполные данные ({mun.missing} показ.)</Badge>}
              </div>
              <div className="mb-3">
                <IndToolbar
                  filter={treeFilter}
                  onChange={setTreeFilter}
                  shown={visible.length}
                  total={state.indicators.length}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={thCls}>Направления/показатели</th>
                      <th className={thCls}>Значение</th>
                      <th className={thCls}>Место по значению</th>
                      <th className={thCls}>Динамика</th>
                      <th className={thCls}>Место по динамике</th>
                      <th className={thCls}>Итоговое место</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-semibold">
                      <td className={tdCls}>Итоговый рейтинг</td>
                      <td className={tdCls} style={{ background: rankColor(mun.place, n) }}>{fmt(mun.score, 0)}</td>
                      <td className={tdCls} style={{ background: rankColor(mun.place, n) }}>{mun.place ?? '—'}</td>
                      <td className={tdCls}><DynCell delta={dynDelta(selMun + 'total')} /></td>
                      <td className={tdCls}>—</td>
                      <td className={tdCls} style={{ background: rankColor(mun.place, n) }}>{mun.place ?? '—'}</td>
                    </tr>
                    {DIRECTIONS.map((d) => {
                      const dr = dirRows[d.id]?.[selMun];
                      const inds = visible.filter((i) => i.directionId === d.id);
                      if (!inds.length) return [];
                      return [
                        <tr key={d.id} className="font-medium bg-slate-50/60">
                          <td className={tdCls}>{d.name}</td>
                          <td className={tdCls} style={{ background: rankColor(dr?.place ?? null, n) }}>{fmt(dr?.score ?? null, 0)}</td>
                          <td className={tdCls} style={{ background: rankColor(dr?.place ?? null, n) }}>{dr?.place ?? '—'}</td>
                          <td className={tdCls}><DynCell delta={dynDelta(selMun + d.id)} /></td>
                          <td className={tdCls}>—</td>
                          <td className={tdCls} style={{ background: rankColor(dr?.place ?? null, n) }}>{dr?.place ?? '—'}</td>
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
                              <td className={tdCls}>—</td>
                              <td className={tdCls} style={{ background: rankColor(c?.rank ?? null, n) }}>{c?.rank ?? '—'}</td>
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
              <div className="mb-3 flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Показатель:</span>
                <Select value={selInd} onValueChange={setSelInd}>
                  <SelectTrigger className="w-80"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">Итоговый рейтинг</SelectItem>
                    {DIRECTIONS.map((d) => <SelectItem key={d.id} value={d.id}>Направление: {d.name}</SelectItem>)}
                    {state.indicators.filter((i) => !i.isGroup).map((i) => <SelectItem key={i.id} value={i.id}>{i.num} {i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
                    {[...rows]
                      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
                      .map((r, idx) => {
                        let val: number | null, place: number | null, appr = true;
                        if (selInd === 'total') {
                          val = r.score; place = r.place;
                        } else if (selInd.startsWith('d')) {
                          const dr = dirRows[selInd]?.[r.munId];
                          val = dr?.score ?? null; place = dr?.place ?? null;
                        } else {
                          const c = r.cells[selInd];
                          val = c?.value ?? null; place = c?.rank ?? null; appr = c?.approved ?? true;
                        }
                        return (
                          <tr key={r.munId}>
                            <td className={tdCls}>{idx + 1}. {r.name}</td>
                            <td className={tdCls} style={{ background: rankColor(place, n) }}>
                              {fmt(val)}{!appr && val !== null && mode === 'preview' ? ' *' : ''}
                            </td>
                            <td className={tdCls} style={{ background: rankColor(place, n) }}>{place ?? '—'}</td>
                            <td className={tdCls}><DynCell delta={dynDelta(r.munId + selInd)} /></td>
                            <td className={tdCls}>—</td>
                            <td className={tdCls} style={{ background: rankColor(place, n) }}>{place ?? '—'}</td>
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
                      {state.indicators.filter((i) => !i.isGroup).map((ind) => (
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
                        {state.indicators.filter((i) => !i.isGroup).map((ind) => {
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
              <CompareVariants />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

/** Вариант А: сумма мест. Вариант Б: взвешенная сумма нормированных баллов (0..100) */
function CompareVariants() {
  const { state } = useStore();
  const mode = state.ratingMode;
  const rows = useMemo(() => computeRating(state, mode), [state, mode]);
  const n = MUNICIPALITIES.length;

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