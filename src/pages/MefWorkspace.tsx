import { Fragment, useState } from 'react';
import { useStore } from '@/lib/store';
import { MUNICIPALITIES, CIOS, DIRECTIONS, MEF_CIO } from '@/lib/data';
import { VALUE_FIELDS, emptyValueFields, type ValueFieldKey } from '@/lib/types';
import { EMPTY_TREE_FILTER, chevronParents, visibleTree, type TreeFilter } from '@/lib/indTree';
import { IndToolbar, TreeToggle } from '@/components/IndToolbar';
import { OmsuStatusBadge, CioStatusBadge } from '@/components/StatusBadge';
import { ValueGroupHeader, fieldTint } from '@/components/ValueColumns';
import { ValueTip, WithValueTip } from '@/components/ValueTip';
import { SignDialog } from '@/components/SignDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { CheckCircle2, Undo2, FileSignature, Lock, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { fmt } from '@/lib/rating';

/** ФИО сотрудника МЭФ (для демо) */
const MEF_USER = 'Сидорова Е.В.';

export function MefWorkspace({ hideOmsuApprove = false }: { hideOmsuApprove?: boolean }) {
  const { state, dispatch } = useStore();
  // МЭФ выступает отраслевым ЦИО по закреплённым за ним показателям
  const cio = CIOS.find((c) => c.id === MEF_CIO)!;

  // ── Вкладка «Согласование показателей ОМСУ» ──
  const [returnTarget, setReturnTarget] = useState<{ munId: string; indId: string } | null>(null);
  const [comment, setComment] = useState('');
  // ── Вкладка «Собственные показатели МЭФ» ──
  const [signTarget, setSignTarget] = useState<string | null>(null);
  // ── Вкладка «Согласование показателей ЦИО» ──
  const [cioReturnTarget, setCioReturnTarget] = useState<{ cioIndId: string; cioId: string } | null>(null);
  const [cioComment, setCioComment] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);
  const [cioTreeFilter, setCioTreeFilter] = useState<TreeFilter>(EMPTY_TREE_FILTER);
  const [cioCollapsed, setCioCollapsed] = useState<Record<string, boolean>>({});
  const [openCioDirs, setOpenCioDirs] = useState<Record<string, boolean>>({});

  // Сворачивание: сферы (по умолчанию развёрнуты)
  const [openDirs, setOpenDirs] = useState<Record<string, boolean>>({});
  const dirOpen = (id: string) => openDirs[id] ?? true;

  const myIndicators = state.indicators.filter((i) => i.cioId === MEF_CIO);
  const myFillable = myIndicators.filter((i) => !i.isGroup);

  // дерево показателей: сворачивание дочерних и фильтры (общие для вкладок ОМСУ/собственных)
  const [treeFilter, setTreeFilter] = useState<TreeFilter>(EMPTY_TREE_FILTER);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // фильтр по ОМСУ на вкладке согласования
  const [munFilter, setMunFilter] = useState<string>('all');
  const scopeMuns = munFilter === 'all' ? MUNICIPALITIES : MUNICIPALITIES.filter((m) => m.id === munFilter);
  const myVisible = visibleTree(myIndicators, collapsed, treeFilter);
  const myOwnVisible = visibleTree(myFillable, collapsed, treeFilter);
  const parents = chevronParents(state.indicators);
  const toggleNode = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));
  const pendingCount = MUNICIPALITIES.reduce(
    (acc, m) => acc + myFillable.filter((i) => state.omsuValues[m.id]?.[i.id]?.status === 'pending_cio').length,
    0,
  );

  // Среднее значение по введённым показателям ОМСУ — по каждому показателю МЭФ
  const avgByInd = (indId: string, field: ValueFieldKey) => {
    const vals = MUNICIPALITIES
      .map((m) => state.omsuValues[m.id]?.[indId]?.[field])
      .filter((x): x is number => x !== null && x !== undefined);
    return {
      avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
      count: vals.length,
    };
  };

  // Собственные значения ЦИО, представленные на согласование в МЭФ
  const cioRows = state.indicators.flatMap((ind) => {
    const perCio = state.cioValues[ind.id] ?? {};
    return Object.entries(perCio).map(([cioId, v]) => ({ ind, cioId, v }));
  }).filter((r) => r.v.status !== 'not_filled' && r.v.status !== 'draft');
  const pendingMef = cioRows.filter((r) => r.v.status === 'pending_mef');
  // дерево всех показателей (по сферам) для вкладки согласования ЦИО
  const cioVisibleInds = visibleTree(state.indicators, cioCollapsed, cioTreeFilter);
  const cioParents = chevronParents(state.indicators);
  const toggleCioNode = (id: string) => setCioCollapsed((p) => ({ ...p, [id]: !p[id] }));
  const cioDirOpen = (id: string) => openCioDirs[id] ?? true;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Рабочее место МЭФ</h2>
        <p className="text-sm text-muted-foreground">{cio.name} · {state.campaign.period}</p>
      </div>

      <Tabs defaultValue={hideOmsuApprove ? 'cio' : 'approve'}>
        <TabsList>
          {!hideOmsuApprove && (
          <TabsTrigger value="approve">
            Согласование показателей ОМСУ
            {pendingCount > 0 && <Badge className="ml-2 bg-amber-500">{pendingCount}</Badge>}
          </TabsTrigger>
          )}
          <TabsTrigger value="cio">
            Согласование показателей ЦИО
            {pendingMef.length > 0 && <Badge className="ml-2 bg-amber-500">{pendingMef.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="own">Показатели МЭФ</TabsTrigger>
        </TabsList>

        {/* ─────── Согласование показателей ОМСУ (по показателям МЭФ) ─────── */}
        {!hideOmsuApprove && (
        <TabsContent value="approve" className="space-y-4 mt-4">
          <IndToolbar
            filter={treeFilter}
            onChange={setTreeFilter}
            shown={myVisible.length}
            total={myIndicators.length}
            hideCioFilter
            munId={munFilter}
            onMunChange={setMunFilter}
          />
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm flex gap-2">
            <Info className="h-4 w-4 text-blue-700 mt-0.5 shrink-0" />
            <span>
              Согласуйте подписанные ЭЦП значения ОМСУ по показателям, закреплённым за МЭФ, или верните на доработку
              с комментарием. После согласования изменение показателя ОМСУ блокируется. Наведите курсор на значение,
              чтобы увидеть дату внесения и ФИО внёсшего данные. Сферы и показатели можно сворачивать.
            </span>
          </div>

          {DIRECTIONS.map((d) => {
            const inds = myVisible.filter((i) => i.directionId === d.id);
            if (!inds.length) return null;
            const dOpen = dirOpen(d.id);
            const fillCount = inds.filter((i) => !i.isGroup).length;
            const dirPend = inds.reduce(
              (acc, i) => acc + (i.isGroup ? 0 : scopeMuns.filter((m) => state.omsuValues[m.id]?.[i.id]?.status === 'pending_cio').length),
              0,
            );
            return (
              <Card key={d.id}>
                <CardHeader className="py-3">
                  <button
                    onClick={() => setOpenDirs((p) => ({ ...p, [d.id]: !dOpen }))}
                    className="flex w-full items-center gap-2 text-left"
                  >
                    {dOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />}
                    <CardTitle className="text-base flex-1">{d.name}</CardTitle>
                    <span className="text-xs font-normal text-muted-foreground">
                      Показателей: {fillCount}
                      {dirPend > 0 && <span className="text-amber-700"> · На согласовании: {dirPend}</span>}
                    </span>
                  </button>
                </CardHeader>
                {dOpen && (
                <CardContent className="pt-0 overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <ValueGroupHeader
                        leading={(
                          <>
                            <th rowSpan={2} className="text-left p-2 w-12 align-middle">№</th>
                            <th rowSpan={2} className="text-left p-2 align-middle min-w-[220px]">Показатель</th>
                            <th rowSpan={2} className="text-left p-2 align-middle min-w-[130px]">ОМСУ</th>
                          </>
                        )}
                        trailing={(
                          <>
                            <th rowSpan={2} className="text-left p-2 align-middle border-l">Статус</th>
                            <th rowSpan={2} className="text-right p-2 w-64 align-middle">Действия</th>
                          </>
                        )}
                      />
                    </thead>
                    <tbody>
                      {inds.map((ind) => {
                        if (ind.isGroup) {
                          return (
                            <tr key={ind.id} className="border-b bg-slate-50/80">
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
                                    {ind.num}. {ind.name}
                                  </span>
                                </span>
                              </td>
                            </tr>
                          );
                        }
                        const rows = scopeMuns
                          .map((m) => ({ m, v: state.omsuValues[m.id]?.[ind.id] }))
                          .filter((r) => r.v);
                        const appr = rows.filter((r) => r.v!.status === 'approved').length;
                        const pend = rows.filter((r) => r.v!.status === 'pending_cio').length;
                        return (
                          <Fragment key={ind.id}>
                            {rows.map(({ m, v }, ri) => (
                              <tr key={m.id} className={`border-b ${v!.status === 'pending_cio' ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}>
                                {ri === 0 && (
                                  <td rowSpan={rows.length} className="p-2 text-muted-foreground whitespace-nowrap align-top">{ind.num}</td>
                                )}
                                {ri === 0 && (
                                  <td rowSpan={rows.length} className="p-2 align-top">
                                    <div className="flex items-start gap-1" style={{ paddingLeft: `${(ind.level - 1) * 18}px` }}>
                                      <span className="mt-0.5 inline-flex shrink-0">
                                        <TreeToggle
                                          hasChildren={parents.has(ind.id)}
                                          collapsed={!!collapsed[ind.id]}
                                          onToggle={() => toggleNode(ind.id)}
                                        />
                                      </span>
                                      <div>
                                        <span className="font-medium">{ind.name} <span className="font-normal text-muted-foreground">({ind.unit})</span></span>
                                        <div className="mt-0.5 text-xs text-muted-foreground">
                                          Согласовано: {appr} из {rows.length}
                                          {pend > 0 && <span className="text-amber-700"> · На согласовании: {pend}</span>}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                )}
                                <td className="p-2 font-medium">{m.name}</td>
                                {VALUE_FIELDS.map((f) => (
                                  <td key={f.key} className={`p-1.5 text-center ${f.key === 'v2026' ? 'font-medium' : ''} ${fieldTint(f.key)}`}>
                                    <ValueTip value={v![f.key]} updatedAt={v!.updatedAt} author={v!.signedBy ?? 'Иванова А.П.'} />
                                  </td>
                                ))}
                                <td className="p-2"><OmsuStatusBadge status={v!.status} /></td>
                                <td className="p-2 text-right whitespace-nowrap">
                                  {v!.status === 'pending_cio' && (
                                    <div className="flex gap-1 justify-end">
                                      <Button
                                        size="sm"
                                        onClick={() => dispatch({ type: 'CIO_APPROVE', munId: m.id, indId: ind.id, actor: cio.short })}
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Согласовать
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => { setReturnTarget({ munId: m.id, indId: ind.id }); setComment(''); }}
                                      >
                                        <Undo2 className="h-3.5 w-3.5 mr-1" /> Вернуть
                                      </Button>
                                    </div>
                                  )}
                                  {v!.status === 'approved' && (
                                    <span className="inline-flex items-center gap-1 text-xs text-green-700">
                                      <Lock className="h-3.5 w-3.5" /> заблокировано
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
                )}
              </Card>
            );
          })}
        </TabsContent>
        )}

        {/* ─────── Собственные показатели МЭФ ─────── */}
        <TabsContent value="own" className="space-y-4 mt-4">
          <IndToolbar
            filter={treeFilter}
            onChange={setTreeFilter}
            shown={myOwnVisible.length}
            total={myFillable.length}
            hideCioFilter
          />
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm flex gap-2">
            <Info className="h-4 w-4 text-blue-700 mt-0.5 shrink-0" />
            <span>
              МЭФ вносит собственные значения по закреплённым за ним показателям (те же показатели, что заполняют ОМСУ):
              отчётные данные за 2023–2025 гг., оценку 2026 г. и прогнозы на 2027–2029 гг. по консервативному и базовому
              вариантам. Подпишите ЭЦП и отправьте на согласование согласующему МЭФ. Пока показатель не согласован —
              можно отозвать на изменение. Под каждым полем для справки отображается среднее значение по введённым
              данным ОМСУ (с указанием количества ОМСУ, внёсших значение).
            </span>
          </div>
          <Card>
            <CardContent className="pt-4 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <ValueGroupHeader
                    leading={<th rowSpan={2} className="text-left p-2 align-middle min-w-[220px]">Показатель</th>}
                    trailing={(
                      <>
                        <th rowSpan={2} className="text-left p-2 align-middle border-l">Статус</th>
                        <th rowSpan={2} className="text-left p-2 align-middle">Комментарий согласующего</th>
                        <th rowSpan={2} className="text-right p-2 w-64 align-middle">Действия</th>
                      </>
                    )}
                  />
                </thead>
                <tbody>
                  {myOwnVisible.map((ind) => {
                    const v = state.cioValues[ind.id]?.[MEF_CIO] ?? { ...emptyValueFields(), status: 'not_filled' as const, updatedAt: null };
                    const editable = v.status === 'not_filled' || v.status === 'draft' || v.status === 'returned';
                    return (
                      <tr key={ind.id} className="border-b hover:bg-slate-50 align-top">
                        <td className="p-2">
                          <div className="font-medium flex items-center gap-1" style={{ paddingLeft: `${(ind.level - 1) * 16}px` }}>
                            <TreeToggle
                              hasChildren={parents.has(ind.id)}
                              collapsed={!!collapsed[ind.id]}
                              onToggle={() => toggleNode(ind.id)}
                            />
                            <span>{ind.num} {ind.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground" style={{ paddingLeft: `${(ind.level - 1) * 16 + 20}px` }}>ед. изм.: {ind.unit} · формула: {ind.formula}</div>
                        </td>
                        {VALUE_FIELDS.map((f) => {
                          const { avg, count } = avgByInd(ind.id, f.key);
                          return (
                            <td key={f.key} className={`p-1.5 text-center ${fieldTint(f.key)}`}>
                              {editable ? (
                                <WithValueTip show={v[f.key] !== null} updatedAt={v.updatedAt} author={v.signedBy ?? MEF_USER}>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    className="h-8 w-[76px] text-center mx-auto bg-white px-1"
                                    placeholder="—"
                                    value={v[f.key] ?? ''}
                                    onChange={(e) =>
                                      dispatch({
                                        type: 'CIO_SET_OWN',
                                        cioIndId: ind.id,
                                        cioId: MEF_CIO,
                                        field: f.key,
                                        value: e.target.value === '' ? null : Number(e.target.value),
                                      })
                                    }
                                  />
                                </WithValueTip>
                              ) : (
                                <span className={f.key === 'v2026' ? 'font-medium' : ''}>
                                  <ValueTip value={v[f.key]} updatedAt={v.updatedAt} author={v.signedBy ?? MEF_USER} />
                                </span>
                              )}
                              <div className="mt-1 text-[11px] whitespace-nowrap">
                                <span className="text-muted-foreground">ср. ОМСУ: </span>
                                <span className="font-medium text-blue-800">{avg !== null ? fmt(avg) : '—'}</span>
                                <span className="text-muted-foreground"> · {count}</span>
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-2"><CioStatusBadge status={v.status} /></td>
                        <td className="p-2 text-xs text-red-700">{v.comment ?? ''}</td>
                        <td className="p-2 text-right whitespace-nowrap">
                          {editable && v.v2026 !== null && (
                            <Button size="sm" onClick={() => setSignTarget(ind.id)}>
                              <FileSignature className="h-3.5 w-3.5 mr-1" /> Подписать ЭЦП и отправить на согласование
                            </Button>
                          )}
                          {v.status === 'pending_mef' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => dispatch({ type: 'CIO_RECALL_OWN', cioIndId: ind.id, cioId: MEF_CIO, actor: cio.short })}
                            >
                              <Undo2 className="h-3.5 w-3.5 mr-1" /> Отозвать на изменение
                            </Button>
                          )}
                          {v.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700">
                              <Lock className="h-3.5 w-3.5" /> согласовано
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────── Согласование показателей ЦИО ─────── */}
        <TabsContent value="cio" className="space-y-4 mt-4">
          <IndToolbar
            filter={cioTreeFilter}
            onChange={setCioTreeFilter}
            shown={cioVisibleInds.length}
            total={state.indicators.length}
          />
          <div className="flex flex-wrap items-center gap-3 rounded-md border bg-white px-3 py-2">
            <div className="flex items-center gap-2">
              <Switch id="only-pending" checked={onlyPending} onCheckedChange={setOnlyPending} />
              <Label htmlFor="only-pending" className="text-sm cursor-pointer whitespace-nowrap">Только на согласовании</Label>
            </div>
          </div>
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm flex gap-2">
            <Info className="h-4 w-4 text-blue-700 mt-0.5 shrink-0" />
            <span>
              Собственные значения отраслевых ЦИО по всем показателям муниципального прогноза (сгруппированы по сферам).
              Согласуйте направленные в МЭФ значения или верните ЦИО на доработку с комментарием. После согласования
              изменение показателя ЦИО блокируется. Сферы и показатели можно сворачивать.
            </span>
          </div>

          {DIRECTIONS.map((d) => {
            const inds = cioVisibleInds.filter((i) => i.directionId === d.id);
            if (!inds.length) return null;
            const shownInds = onlyPending
              ? inds.filter((i) => !i.isGroup && state.cioValues[i.id]?.[i.cioId]?.status === 'pending_mef')
              : inds;
            if (!shownInds.length) return null;
            const dOpen = cioDirOpen(d.id);
            const fillCount = inds.filter((i) => !i.isGroup).length;
            const dirPend = inds.reduce(
              (acc, i) => acc + (!i.isGroup && state.cioValues[i.id]?.[i.cioId]?.status === 'pending_mef' ? 1 : 0),
              0,
            );
            return (
              <Card key={d.id}>
                <CardHeader className="py-3">
                  <button
                    onClick={() => setOpenCioDirs((p) => ({ ...p, [d.id]: !dOpen }))}
                    className="flex w-full items-center gap-2 text-left"
                  >
                    {dOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />}
                    <CardTitle className="text-base flex-1">{d.name}</CardTitle>
                    <span className="text-xs font-normal text-muted-foreground">
                      Показателей: {fillCount}
                      {dirPend > 0 && <span className="text-amber-700"> · На согласовании: {dirPend}</span>}
                    </span>
                  </button>
                </CardHeader>
                {dOpen && (
                <CardContent className="pt-0 overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <ValueGroupHeader
                        leading={(
                          <>
                            <th rowSpan={2} className="text-left p-2 align-middle">ЦИО</th>
                            <th rowSpan={2} className="text-left p-2 align-middle min-w-[220px]">Показатель</th>
                          </>
                        )}
                        trailing={(
                          <>
                            <th rowSpan={2} className="text-left p-2 align-middle border-l">Статус</th>
                            <th rowSpan={2} className="text-right p-2 w-56 align-middle">Действия</th>
                          </>
                        )}
                      />
                    </thead>
                    <tbody>
                      {shownInds.map((ind) => {
                        if (ind.isGroup) {
                          return (
                            <tr key={ind.id} className="border-b bg-slate-50/80">
                              <td colSpan={2 + VALUE_FIELDS.length + 2} className="p-2 align-middle">
                                <span
                                  className="flex items-center gap-1 font-semibold text-slate-700"
                                  style={{ paddingLeft: `${(ind.level - 1) * 18}px` }}
                                >
                                  <TreeToggle
                                    hasChildren={cioParents.has(ind.id)}
                                    collapsed={!!cioCollapsed[ind.id]}
                                    onToggle={() => toggleCioNode(ind.id)}
                                  />
                                  <span>
                                    <span className="mr-1 text-slate-400">▸</span>
                                    {ind.num}. {ind.name}
                                  </span>
                                </span>
                              </td>
                            </tr>
                          );
                        }
                        const v = state.cioValues[ind.id]?.[ind.cioId] ?? { ...emptyValueFields(), status: 'not_filled' as const, updatedAt: null };
                        return (
                          <tr key={ind.id} className={`border-b ${v.status === 'pending_mef' ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}>
                            <td className="p-2 align-top"><Badge variant="secondary">{CIOS.find((c) => c.id === ind.cioId)?.short}</Badge></td>
                            <td className="p-2">
                              <div className="font-medium flex items-center gap-1" style={{ paddingLeft: `${(ind.level - 1) * 16}px` }}>
                                <TreeToggle
                                  hasChildren={cioParents.has(ind.id)}
                                  collapsed={!!cioCollapsed[ind.id]}
                                  onToggle={() => toggleCioNode(ind.id)}
                                />
                                <span>{ind.num} {ind.name} <span className="font-normal text-muted-foreground">({ind.unit})</span></span>
                              </div>
                            </td>
                            {VALUE_FIELDS.map((f) => (
                              <td key={f.key} className={`p-1.5 text-center ${f.key === 'v2026' ? 'font-medium' : ''} ${fieldTint(f.key)}`}>
                                <ValueTip value={v[f.key]} updatedAt={v.updatedAt} author={v.signedBy ?? 'Петров С.И.'} />
                              </td>
                            ))}
                            <td className="p-2"><CioStatusBadge status={v.status} /></td>
                            <td className="p-2 text-right whitespace-nowrap">
                              {v.status === 'pending_mef' && (
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    size="sm"
                                    onClick={() => dispatch({ type: 'MEF_APPROVE', cioIndId: ind.id, cioId: ind.cioId, actor: 'МЭФ' })}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Согласовать
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => { setCioReturnTarget({ cioIndId: ind.id, cioId: ind.cioId }); setCioComment(''); }}
                                  >
                                    <Undo2 className="h-3.5 w-3.5 mr-1" /> Вернуть
                                  </Button>
                                </div>
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
        </TabsContent>
      </Tabs>

      {/* Возврат ОМСУ на доработку */}
      <Dialog open={!!returnTarget} onOpenChange={(v) => !v && setReturnTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Возврат показателя на доработку</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Комментарий для ОМСУ (обязательно)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTarget(null)}>Отмена</Button>
            <Button
              variant="destructive"
              disabled={!comment.trim()}
              onClick={() => {
                if (returnTarget)
                  dispatch({ type: 'CIO_RETURN', ...returnTarget, actor: cio.short, comment: comment.trim() });
                setReturnTarget(null);
              }}
            >
              Вернуть на доработку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Возврат показателя ЦИО на доработку */}
      <Dialog open={!!cioReturnTarget} onOpenChange={(v) => !v && setCioReturnTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Возврат показателя ЦИО на доработку</DialogTitle></DialogHeader>
          <Textarea
            placeholder="Комментарий для ЦИО (обязательно)"
            value={cioComment}
            onChange={(e) => setCioComment(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCioReturnTarget(null)}>Отмена</Button>
            <Button
              variant="destructive"
              disabled={!cioComment.trim()}
              onClick={() => {
                if (cioReturnTarget) dispatch({ type: 'MEF_RETURN', ...cioReturnTarget, actor: 'МЭФ', comment: cioComment.trim() });
                setCioReturnTarget(null);
              }}
            >
              Вернуть на доработку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignDialog
        open={!!signTarget}
        onOpenChange={(v) => !v && setSignTarget(null)}
        title="Собственный показатель МЭФ — направление на согласование"
        onSigned={() => {
          if (signTarget) dispatch({ type: 'CIO_SIGN_OWN', cioIndId: signTarget, cioId: MEF_CIO, actor: MEF_USER });
          setSignTarget(null);
        }}
      />
    </div>
  );
}
