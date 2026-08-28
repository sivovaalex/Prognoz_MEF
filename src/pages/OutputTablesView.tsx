import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { VALUE_FIELDS, VALUE_GROUPS } from '@/lib/types';
import { ARCHIVE_YEARS, CURRENT_EVAL_YEAR, buildArchiveOmsuValues } from '@/lib/data';
import { EMPTY_TREE_FILTER, chevronParents, visibleTree, type TreeFilter } from '@/lib/indTree';
import { IndToolbar, TreeToggle } from '@/components/IndToolbar';
import { ValueGroupHeader, fieldTint, type ValueColumnField, type ValueColumnGroup } from '@/components/ValueColumns';
import { ValueTip } from '@/components/ValueTip';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Download, ChevronDown, Info } from 'lucide-react';
import { dirStats } from './OmsuForm';

// --- Вид ЦИО (только просмотр, компоновка как в рабочем месте ОМСУ) ---
function OutputTableCio() {
  const { state } = useStore();
  const activeOmsus = state.omsus.filter(o => o.isActive);
  const [selectedOmsuId, setSelectedOmsuId] = useState<string>(activeOmsus[0]?.id || '');
  // аккордеон: открыта только одна сфера
  const [openDir, setOpenDir] = useState<string | null>(state.directions[0]?.id ?? null);
  // дерево показателей: сворачивание дочерних и фильтры
  const [treeFilter, setTreeFilter] = useState<TreeFilter>(EMPTY_TREE_FILTER);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // «Год оценки»: какую таблицу вытаскивать из «БД» (последние 10 лет оценки)
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_EVAL_YEAR);
  // «Вариант прогноза»: 'all' — оба варианта, '1' — консервативный, '2' — базовый
  const [forecastVariant, setForecastVariant] = useState<'all' | '1' | '2'>('all');
  // Отображение справочных показателей (в названии «справочно», без учёта регистра)
  const [showReference, setShowReference] = useState(true);
  const isCurrentYear = selectedYear === CURRENT_EVAL_YEAR;

  // Колонки таблицы за год оценки Y: отчёты Y-3…Y-1, оценка Y, прогнозы Y+1…Y+3 (2 варианта)
  const fields = useMemo<ValueColumnField[]>(() => {
    if (isCurrentYear)
      return [...VALUE_FIELDS].map((f) => ({
        ...f,
        variant: f.key.startsWith('cons') ? (1 as const) : f.key.startsWith('base') ? (2 as const) : undefined,
      }));
    const Y = selectedYear;
    return [
      { key: 'r1', group: `y${Y - 3}`, label: 'Отчёт', _bg: 'report' },
      { key: 'r2', group: `y${Y - 2}`, label: 'Отчёт', _bg: 'report' },
      { key: 'r3', group: `y${Y - 1}`, label: 'Отчёт', _bg: 'report' },
      { key: 'e', group: `y${Y}`, label: 'Оценка', _bg: 'estimate' },
      { key: 'c1', group: `y${Y + 1}`, label: 'Прогноз вариант 1 (консервативный)', _bg: 'y2027', variant: 1 },
      { key: 'b1', group: `y${Y + 1}`, label: 'Прогноз вариант 2 (базовый)', _bg: 'y2027', variant: 2 },
      { key: 'c2', group: `y${Y + 2}`, label: 'Прогноз вариант 1 (консервативный)', _bg: 'y2028', variant: 1 },
      { key: 'b2', group: `y${Y + 2}`, label: 'Прогноз вариант 2 (базовый)', _bg: 'y2028', variant: 2 },
      { key: 'c3', group: `y${Y + 3}`, label: 'Прогноз вариант 1 (консервативный)', _bg: 'y2029', variant: 1 },
      { key: 'b3', group: `y${Y + 3}`, label: 'Прогноз вариант 2 (базовый)', _bg: 'y2029', variant: 2 },
    ];
  }, [selectedYear, isCurrentYear]);

  // Колонки, отображаемые с учётом фильтра «Вариант прогноза»
  const visibleFields = useMemo(
    () =>
      forecastVariant === 'all'
        ? fields
        : fields.filter((f) => f.variant === undefined || f.variant === Number(forecastVariant)),
    [fields, forecastVariant],
  );

  const headerGroups = useMemo<ValueColumnGroup[]>(() => {
    if (isCurrentYear) return [...VALUE_GROUPS];
    const Y = selectedYear;
    return [
      { key: `y${Y - 3}`, label: `${Y - 3}`, span: 1, _bg: 'report' },
      { key: `y${Y - 2}`, label: `${Y - 2}`, span: 1, _bg: 'report' },
      { key: `y${Y - 1}`, label: `${Y - 1}`, span: 1, _bg: 'report' },
      { key: `y${Y}`, label: `${Y}`, span: 1, _bg: 'estimate' },
      { key: `y${Y + 1}`, label: `${Y + 1}`, span: 2, _bg: 'y2027' },
      { key: `y${Y + 2}`, label: `${Y + 2}`, span: 2, _bg: 'y2028' },
      { key: `y${Y + 3}`, label: `${Y + 3}`, span: 2, _bg: 'y2029' },
    ];
  }, [selectedYear, isCurrentYear]);

  // «БД»: таблица за выбранный год оценки (текущий год — живые данные из стора)
  const archiveVals = useMemo(
    () => (isCurrentYear ? null : buildArchiveOmsuValues(selectedYear, state.indicators)),
    [selectedYear, isCurrentYear, state.indicators],
  );

  const mun = state.omsus.find((m) => m.id === selectedOmsuId);
  const values = state.omsuValues[selectedOmsuId] || {};

  // Значение ячейки: текущий год — из стора, архивный год — из «БД»
  const getVal = (indId: string, key: string): number | null => {
    if (isCurrentYear) {
      const v = values[indId];
      if (!v) return null;
      const val = (v as unknown as Record<string, number | null | undefined>)[key];
      return typeof val === 'number' ? val : null;
    }
    return archiveVals?.[selectedOmsuId]?.[indId]?.[key] ?? null;
  };

  // Выделяемые колонки: оценка и последний отчётный год
  const isBoldKey = (key: string) =>
    isCurrentYear ? key === 'v2026' || key === 'v2025' : key === 'e' || key === 'r3';

  // Закрытый показатель: общий (closed) или индивидуальный для данного ОМСУ (closedForOmsuIds)
  const isClosedForMe = (ind: { closed?: boolean; closedForOmsuIds?: string[] }) =>
    !!ind.closed || (Array.isArray(ind.closedForOmsuIds) && ind.closedForOmsuIds.includes(selectedOmsuId));

  // ЗАТО: показатели с флагом zato видны только ОМСУ с отметкой ЗАТО
  // (ОМСУ-ЗАТО видит и обычные показатели)
  const myIndicators = state.indicators.filter((i) => !i.zato || mun?.isZato);
  // Справочные показатели (в названии «справочно», без учёта регистра) — по желанию
  const shownIndicators = showReference
    ? myIndicators
    : myIndicators.filter((i) => !/справочно/i.test(i.name));
  const visible = visibleTree(shownIndicators, collapsed, treeFilter);
  const parents = chevronParents(state.indicators);
  const toggleNode = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {state.campaign.module === 'ukaz'
              ? 'Контроль исполнения Указа Президента РФ №607'
              : 'Прогноз социально-экономического развития'} — {mun?.name || '—'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {state.campaign.name}, {state.campaign.period} · Выходная таблица для ЦИОГВ (режим просмотра)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4 text-green-700" />
            Скачать эксель
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm flex gap-2">
        <Info className="h-4 w-4 text-blue-700 mt-0.5 shrink-0" />
        <span>
          {isCurrentYear
            ? 'Значения муниципального прогноза в режиме просмотра — изменить данные из этого раздела нельзя. Наборы показателей по сферам можно сворачивать — одновременно открыта одна сфера.'
            : `Выходная таблица за ${selectedYear} год оценки (из архива «БД»). Отчётные годы: ${selectedYear - 3}–${selectedYear - 1}, оценка: ${selectedYear}, прогноз: ${selectedYear + 1}–${selectedYear + 3}. Режим просмотра — изменить данные нельзя.`}
        </span>
      </div>

      <IndToolbar
        filter={treeFilter}
        onChange={setTreeFilter}
        shown={visible.length}
        total={shownIndicators.length}
        prefix={
          <>
            <select
              className="text-sm h-9 border rounded border-slate-300 px-2"
              value={selectedOmsuId}
              onChange={(e) => setSelectedOmsuId(e.target.value)}
            >
              {activeOmsus.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Год оценки:</span>
              <select
                className="text-sm h-9 border rounded border-slate-300 px-2"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {ARCHIVE_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y === CURRENT_EVAL_YEAR ? `${y} (текущая кампания)` : `${y} (архив)`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Вариант прогноза:</span>
              <select
                className="text-sm h-9 border rounded border-slate-300 px-2"
                value={forecastVariant}
                onChange={(e) => setForecastVariant(e.target.value as 'all' | '1' | '2')}
              >
                <option value="all">Все</option>
                <option value="1">Вариант 1 (Консервативный)</option>
                <option value="2">Вариант 2 (Базовый)</option>
              </select>
            </div>
            <label className="flex cursor-pointer select-none items-center gap-1.5 whitespace-nowrap text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 accent-blue-600"
                checked={showReference}
                onChange={(e) => setShowReference(e.target.checked)}
              />
              Отображение справочных показателей
            </label>
          </>
        }
      />

      {state.directions.map((d) => {
        const inds = visible.filter((i) => i.directionId === d.id);
        if (!inds.length) return null;
        const dirInds = shownIndicators.filter((i) => i.directionId === d.id && !i.isGroup);
        const st = isCurrentYear
          ? dirStats(dirInds, values)
          : {
              total: dirInds.length,
              filled: dirInds.filter((i) => getVal(i.id, 'e') != null).length,
            };
        const open = openDir === d.id;
        return (
          <Card key={d.id}>
            <button
              type="button"
              className="w-full flex items-center justify-between gap-3 px-6 py-3 text-left hover:bg-slate-50 rounded-t-xl transition-colors"
              onClick={() => setOpenDir(open ? null : d.id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`} />
                <span className="font-semibold text-base truncate">{d.name}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-end text-xs">
                <Badge variant="outline" className="text-slate-700 border-slate-300">
                  Введено: {st.filled}/{st.total}
                </Badge>
              </div>
            </button>

            {open && (
              <CardContent className="pt-0 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <ValueGroupHeader
                      fields={visibleFields}
                      groups={headerGroups}
                      leading={
                        <>
                          <th rowSpan={2} className="text-left p-2 w-12 align-middle">№</th>
                          <th rowSpan={2} className="text-left p-2 align-middle min-w-[220px]">Показатель</th>
                          <th rowSpan={2} className="text-left p-2 align-middle">ЦИО</th>
                        </>
                      }
                    />
                  </thead>

                  <tbody>
                    {inds.map((ind) => {
                      if (ind.isGroup) {
                        return (
                          <tr key={ind.id} className="border-b bg-slate-50/80">
                            <td className="p-2 text-muted-foreground whitespace-nowrap align-middle">{ind.num}</td>
                            <td colSpan={2 + visibleFields.length} className="p-2 align-middle">
                              <span
                                className="flex items-center gap-1 font-semibold text-slate-700"
                                style={{ paddingLeft: `${(ind.level - 1) * 18}px` }}
                              >
                                <TreeToggle
                                  hasChildren={parents.has(ind.id)}
                                  collapsed={!!collapsed[ind.id]}
                                  onToggle={() => toggleNode(ind.id)}
                                />
                                <span>
                                  <span className="mr-1 text-slate-400">▸</span>
                                  {ind.name}
                                </span>
                              </span>
                            </td>
                          </tr>
                        );
                      }
                      const v = values[ind.id];
                      const closedForMe = isClosedForMe(ind);
                      return (
                        <tr key={ind.id} className="border-b hover:bg-slate-50 align-top">
                          <td className="p-2 text-muted-foreground whitespace-nowrap">{ind.num}</td>
                          <td className="p-2">
                            <div className="flex items-start gap-1.5" style={{ paddingLeft: `${(ind.level - 1) * 18}px` }}>
                              <span className="mt-0.5 inline-flex shrink-0">
                                <TreeToggle
                                  hasChildren={parents.has(ind.id)}
                                  collapsed={!!collapsed[ind.id]}
                                  onToggle={() => toggleNode(ind.id)}
                                />
                              </span>
                              <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      aria-label={`Информация о расчёте показателя ${ind.num}`}
                                      className="mt-0.5 inline-flex shrink-0 cursor-help text-slate-400 hover:text-blue-700 focus:text-blue-700 transition-colors outline-none"
                                    >
                                      <Info className="h-4 w-4" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" sideOffset={6} className="max-w-xs p-3 text-xs leading-relaxed">
                                    <div className="font-semibold text-sm mb-1">{ind.num}. {ind.name}</div>
                                    <div><span className="opacity-60">Формула расчёта:</span> {ind.formula}</div>
                                    <div><span className="opacity-60">Единица измерения:</span> {ind.unit}</div>
                                    <div><span className="opacity-60">Оптимум:</span> {ind.optimum === 'max' ? 'чем больше, тем лучше (↑ max)' : 'чем меньше, тем лучше (↓ min)'}</div>
                                    <div><span className="opacity-60">Отраслевой ЦИО:</span> {state.cios.find((c) => c.id === ind.cioId)?.short}</div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <div className="font-medium">{ind.name}</div>
                              {closedForMe && (
                                <span
                                  title="Показатель закрыт для ввода и согласования"
                                  className="text-[10px] px-1.5 py-0.5 rounded border border-slate-300 bg-slate-100 text-slate-500 whitespace-nowrap"
                                >
                                  Закрыт
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2"><Badge variant="secondary">{state.cios.find((c) => c.id === ind.cioId)?.short}</Badge></td>

                          {visibleFields.map((f) => (
                            <td key={f.key} className={`p-1.5 text-center ${fieldTint(f.key)}`}>
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className={isBoldKey(f.key) ? 'font-medium' : ''}>
                                  <ValueTip
                                    value={getVal(ind.id, f.key)}
                                    updatedAt={isCurrentYear ? v?.updatedAt ?? null : null}
                                    author={isCurrentYear ? v?.signedBy ?? 'Иванова А.П.' : null}
                                  />
                                </span>
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// --- Главный враппер ---
export function OutputTablesView() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Выходные таблицы</h2>
        <p className="text-sm text-muted-foreground">
          Сводные и муниципальные формы данных
        </p>
      </div>

      <OutputTableCio />
    </div>
  );
}

