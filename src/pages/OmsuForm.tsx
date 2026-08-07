import { useState } from 'react';
import { useStore } from '@/lib/store';
import { DIRECTIONS, CIOS, CURRENT_OMSU, MUNICIPALITIES } from '@/lib/data';
import { VALUE_FIELDS } from '@/lib/types';
import { EMPTY_TREE_FILTER, chevronParents, visibleTree, type TreeFilter } from '@/lib/indTree';
import { IndToolbar, TreeToggle } from '@/components/IndToolbar';
import { OmsuStatusBadge, CioStatusBadge } from '@/components/StatusBadge';
import { ValueGroupHeader, fieldTint } from '@/components/ValueColumns';
import { ValueTip, WithValueTip } from '@/components/ValueTip';
import { SignDialog } from '@/components/SignDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { FileSignature, Undo2, Lock, AlertTriangle, Info, ChevronDown, Users } from 'lucide-react';

/** Сводка статусов по набору показателей сферы */
function dirStats(inds: { id: string }[], values: Record<string, { status: string } | undefined>) {
  const total = inds.length;
  let filled = 0, approved = 0, pending = 0, returned = 0;
  inds.forEach((i) => {
    const st = values[i.id]?.status ?? 'not_filled';
    if (st !== 'not_filled') filled += 1;
    if (st === 'approved') approved += 1;
    if (st === 'pending_cio') pending += 1;
    if (st === 'returned') returned += 1;
  });
  return { total, filled, approved, pending, returned };
}

export function OmsuForm() {
  const { state, dispatch } = useStore();
  const [munId, setMunId] = useState<string>(CURRENT_OMSU);
  const isCurrentOmsu = munId === CURRENT_OMSU;
  const mun = MUNICIPALITIES.find((m) => m.id === munId)!;
  const [signTarget, setSignTarget] = useState<string | null>(null);
  // аккордеон: открыта только одна сфера
  const [openDir, setOpenDir] = useState<string | null>(DIRECTIONS[0]?.id ?? null);
  // показатель, по которому открыто модальное окно со значениями всех ОМСУ
  const [compareInd, setCompareInd] = useState<string | null>(null);
  // дерево показателей: сворачивание дочерних и фильтры
  const [treeFilter, setTreeFilter] = useState<TreeFilter>(EMPTY_TREE_FILTER);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const visible = visibleTree(state.indicators, collapsed, treeFilter);
  const parents = chevronParents(state.indicators);
  const toggleNode = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  const values = state.omsuValues[munId];
  const fillable = state.indicators.filter((i) => !i.isGroup);
  const total = fillable.length;
  const approved = fillable.filter((i) => values[i.id]?.status === 'approved').length;
  const pending = fillable.filter((i) => values[i.id]?.status === 'pending_cio').length;

  const cmpInd = state.indicators.find((i) => i.id === compareInd) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Форма сбора — {mun.name}</h2>
          <p className="text-sm text-muted-foreground">
            {state.campaign.name}, {state.campaign.period} · срок заполнения: {state.campaign.deadlineOmsu.split('-').reverse().join('.')}
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <Badge variant="outline" className="text-green-700 border-green-300">Согласовано: {approved}/{total}</Badge>
          <Badge variant="outline" className="text-amber-700 border-amber-300">На согласовании: {pending}</Badge>
        </div>
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm flex gap-2">
        <Info className="h-4 w-4 text-blue-700 mt-0.5 shrink-0" />
        <span>
          Заполните значения, подпишите ЭЦП и отправьте на согласование отраслевому ЦИО.
          Пока показатель не согласован, его можно <b>отозвать на изменение</b> и отправить повторно.
          После согласования ЦИО изменение блокируется. Наборы показателей по сферам можно сворачивать —
          одновременно открыта одна сфера.
        </span>
      </div>

      <IndToolbar
        filter={treeFilter}
        onChange={setTreeFilter}
        shown={visible.length}
        total={state.indicators.length}
        munId={munId}
        onMunChange={setMunId}
        allowAllMuns={false}
      />

      {DIRECTIONS.map((d) => {
        const inds = visible.filter((i) => i.directionId === d.id);
        if (!inds.length) return null;
        const st = dirStats(state.indicators.filter((i) => i.directionId === d.id && !i.isGroup), values);
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
                <Badge variant="outline" className="text-green-700 border-green-300">
                  Согласовано: {st.approved}
                </Badge>
                <Badge variant="outline" className="text-amber-700 border-amber-300">
                  На согласовании: {st.pending}
                </Badge>
                {st.returned > 0 && (
                  <Badge variant="outline" className="text-red-700 border-red-300">
                    Возвращено: {st.returned}
                  </Badge>
                )}
              </div>
            </button>

            {open && (
              <CardContent className="pt-0 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <ValueGroupHeader
                      leading={(
                        <>
                          <th rowSpan={2} className="text-left p-2 w-12 align-middle">№</th>
                          <th rowSpan={2} className="text-left p-2 align-middle min-w-[220px]">Показатель</th>
                          <th rowSpan={2} className="text-left p-2 align-middle">ЦИО</th>
                        </>
                      )}
                      trailing={(
                        <>
                          <th rowSpan={2} className="text-left p-2 align-middle border-l">Статус</th>
                          <th rowSpan={2} className="text-left p-2 align-middle">Комментарий / подпись</th>
                          <th rowSpan={2} className="text-right p-2 w-56 align-middle">Действия</th>
                        </>
                      )}
                    />
                  </thead>
                  <tbody>
                    {inds.map((ind) => {
                      if (ind.isGroup) {
                        return (
                          <tr key={ind.id} className="border-b bg-slate-50/80">
                            <td className="p-2 text-muted-foreground whitespace-nowrap align-middle">{ind.num}</td>
                            <td colSpan={3 + VALUE_FIELDS.length + 2} className="p-2 align-middle">
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
                      const editable = isCurrentOmsu && (v.status === 'not_filled' || v.status === 'draft' || v.status === 'returned');
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
                                    <div><span className="opacity-60">Вес в рейтинге:</span> {ind.weight}</div>
                                    <div><span className="opacity-60">Отраслевой ЦИО:</span> {CIOS.find((c) => c.id === ind.cioId)?.short}</div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <div className="font-medium">{ind.name}</div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 shrink-0 text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                                title="Значения показателя по всем ОМСУ (просмотр)"
                                onClick={() => setCompareInd(ind.id)}
                              >
                                <Users className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                          <td className="p-2"><Badge variant="secondary">{CIOS.find((c) => c.id === ind.cioId)?.short}</Badge></td>
                          {VALUE_FIELDS.map((f) => (
                            <td key={f.key} className={`p-1.5 text-center ${fieldTint(f.key)}`}>
                              {editable && f.key === 'v2026' ? (
                                <WithValueTip show={v[f.key] !== null} updatedAt={v.updatedAt} author={v.signedBy ?? 'Иванова А.П.'}>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="h-8 w-[76px] text-center mx-auto px-1"
                                    placeholder="—"
                                    value={v[f.key] ?? ''}
                                    onChange={(e) =>
                                      dispatch({
                                        type: 'OMSU_SET_VALUE',
                                        munId,
                                        indId: ind.id,
                                        field: f.key,
                                        value: e.target.value === '' ? null : Number(e.target.value),
                                      })
                                    }
                                  />
                                </WithValueTip>
                              ) : (
                                <span className={f.key === 'v2026' ? 'font-medium' : ''}>
                                  <ValueTip value={v[f.key]} updatedAt={v.updatedAt} author={v.signedBy ?? 'Иванова А.П.'} />
                                </span>
                              )}
                            </td>
                          ))}
                          <td className="p-2"><OmsuStatusBadge status={v.status} /></td>
                          <td className="p-2 text-xs">
                            {v.comment && (
                              <div className="flex gap-1 text-red-700">
                                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <span>{v.comment}</span>
                              </div>
                            )}
                            {v.signedBy && v.status !== 'draft' && (
                              <div className="text-muted-foreground mt-0.5">ЭЦП: {v.signedBy}</div>
                            )}
                          </td>
                          <td className="p-2 text-right whitespace-nowrap">
                            {editable && v.v2026 !== null && (
                              <Button size="sm" variant="default" onClick={() => setSignTarget(ind.id)}>
                                <FileSignature className="h-3.5 w-3.5 mr-1" />
                                Подписать ЭЦП и отправить
                              </Button>
                            )}
                            {v.status === 'pending_cio' && isCurrentOmsu && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => dispatch({ type: 'OMSU_RECALL', munId, indId: ind.id, actor: mun.name })}
                              >
                                <Undo2 className="h-3.5 w-3.5 mr-1" />
                                Отозвать на изменение
                              </Button>
                            )}
                            {v.status === 'approved' && (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700">
                                <Lock className="h-3.5 w-3.5" /> заблокировано
                              </span>
                            )}
                          </td>
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

      <SignDialog
        open={!!signTarget}
        onOpenChange={(v) => !v && setSignTarget(null)}
        title={`Показатель ${state.indicators.find((i) => i.id === signTarget)?.num ?? ''} — направление на согласование отраслевому ЦИО`}
        onSigned={() => {
          if (signTarget) dispatch({ type: 'OMSU_SIGN_SEND', munId, indId: signTarget, actor: 'Иванова А.П.' });
          setSignTarget(null);
        }}
      />

      {/* Значения показателя по всем ОМСУ — только просмотр */}
      <Dialog open={!!cmpInd} onOpenChange={(v) => !v && setCompareInd(null)}>
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>
              {cmpInd ? `${cmpInd.num}. ${cmpInd.name}` : ''}
              {cmpInd && <span className="text-sm font-normal text-muted-foreground"> ({cmpInd.unit}) — значения по всем ОМСУ, только просмотр</span>}
            </DialogTitle>
          </DialogHeader>
          {cmpInd && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <ValueGroupHeader
                    leading={<th rowSpan={2} className="text-left p-2 align-middle min-w-[140px]">Участник</th>}
                    trailing={<th rowSpan={2} className="text-left p-2 align-middle border-l">Статус</th>}
                  />
                </thead>
                <tbody>
                  {/* Ответственный ЦИО — собственное значение по показателю */}
                  {(() => {
                    const cio = CIOS.find((c) => c.id === cmpInd.cioId);
                    const cv = state.cioValues[cmpInd.id]?.[cmpInd.cioId];
                    return (
                      <tr className="border-b bg-violet-50/40">
                        <td className="p-2 font-medium">
                          {cio?.short} <span className="text-xs font-normal text-violet-700">(ответственный ЦИО)</span>
                        </td>
                        {VALUE_FIELDS.map((f) => (
                          <td key={f.key} className={`p-1.5 text-center ${f.key === 'v2026' ? 'font-medium' : ''}`}>
                            <ValueTip value={cv?.[f.key] ?? null} updatedAt={cv?.updatedAt ?? null} author={cv?.signedBy ?? 'Петров С.И.'} />
                          </td>
                        ))}
                        <td className="p-2">{cv ? <CioStatusBadge status={cv.status} /> : <span className="text-xs text-muted-foreground">нет данных</span>}</td>
                      </tr>
                    );
                  })()}
                  {MUNICIPALITIES.map((m) => {
                    const v = state.omsuValues[m.id]?.[cmpInd.id];
                    if (!v) return null;
                    const isCurrent = m.id === munId;
                    return (
                      <tr key={m.id} className={`border-b ${isCurrent ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}>
                        <td className="p-2 font-medium">
                          {m.name}
                          {isCurrent && <span className="ml-1.5 text-xs text-blue-700">(ваше ОМСУ)</span>}
                        </td>
                        {VALUE_FIELDS.map((f) => (
                          <td key={f.key} className={`p-1.5 text-center ${f.key === 'v2026' ? 'font-medium' : ''} ${fieldTint(f.key)}`}>
                            <ValueTip value={v[f.key]} updatedAt={v.updatedAt} author={v.signedBy ?? 'Иванова А.П.'} />
                          </td>
                        ))}
                        <td className="p-2"><OmsuStatusBadge status={v.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}