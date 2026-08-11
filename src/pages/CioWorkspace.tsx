import { Fragment, useState } from 'react';
import { useStore } from '@/lib/store';
import { CURRENT_CIO } from '@/lib/data';
import { VALUE_FIELDS, emptyValueFields } from '@/lib/types';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { CheckCircle2, Undo2, Send, Lock, Info, ChevronDown, ChevronRight } from 'lucide-react';

export function CioWorkspace({ hideOmsuApprove = false }: { hideOmsuApprove?: boolean }) {
  const { state, dispatch } = useStore();
  const cio = state.cios.find((c) => c.id === CURRENT_CIO)!;
  const [returnTarget, setReturnTarget] = useState<{ munId: string; indId: string } | null>(null);
  const [comment, setComment] = useState('');
  const [signTarget, setSignTarget] = useState<string | null>(null);

  // Сворачивание согласования: сферы (по умолчанию развёрнуты)
  const [openDirs, setOpenDirs] = useState<Record<string, boolean>>({});
  const dirOpen = (id: string) => openDirs[id] ?? true;

  const myIndicators = state.indicators.filter((i) => i.cioId === CURRENT_CIO);
  const myFillable = myIndicators.filter((i) => !i.isGroup);

  // дерево показателей: сворачивание дочерних и фильтры (общие для обеих вкладок)
  const [treeFilter, setTreeFilter] = useState<TreeFilter>(EMPTY_TREE_FILTER);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // фильтр по ОМСУ на вкладке согласования
  const [munFilter, setMunFilter] = useState<string>('all');
  const scopeMuns = munFilter === 'all' ? state.omsus : state.omsus.filter((m) => m.id === munFilter);
  const myVisible = visibleTree(myIndicators, collapsed, treeFilter);
  const myOwnVisible = visibleTree(myFillable, collapsed, treeFilter);
  const parents = chevronParents(state.indicators);
  const toggleNode = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));
  const pendingCount = state.omsus.reduce(
    (acc, m) => acc + myFillable.filter((i) => state.omsuValues[m.id]?.[i.id]?.status === 'pending_cio').length,
    0,
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Рабочее место отраслевого ЦИО — {cio.short}</h2>
        <p className="text-sm text-muted-foreground">{cio.name} · {state.campaign.period}</p>
      </div>

      <Tabs defaultValue={hideOmsuApprove ? 'own' : 'approve'}>
        <TabsList>
          {!hideOmsuApprove && (
            <TabsTrigger value="approve">
              Согласование показателей ОМСУ
              {pendingCount > 0 && <Badge className="ml-2 bg-amber-500">{pendingCount}</Badge>}
            </TabsTrigger>
          )}
          <TabsTrigger value="own">Собственные показатели ЦИО</TabsTrigger>
        </TabsList>

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
                Согласуйте подписанные ЭЦП значения ОМСУ по показателям вашей отрасли или верните на доработку с комментарием.
                После согласования изменение показателя ОМСУ блокируется. Наведите курсор на значение, чтобы увидеть дату
                внесения и ФИО внёсшего данные. Сферы и показатели можно сворачивать.
              </span>
            </div>

            {state.directions.map((d) => {
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

        <TabsContent value="own" className="space-y-4 mt-4">
          {!hideOmsuApprove ? (
            <Tabs defaultValue="indicators">
              <TabsList className="mb-4">
                <TabsTrigger value="indicators">Показатели</TabsTrigger>
                <TabsTrigger value="territory">Территория</TabsTrigger>
              </TabsList>
              <TabsContent value="indicators" className="space-y-4">
                <CioOwnIndicators 
                  myOwnVisible={myOwnVisible} 
                  myFillable={myFillable}
                  collapsed={collapsed}
                  toggleNode={toggleNode}
                  parents={parents}
                  treeFilter={treeFilter}
                  setTreeFilter={setTreeFilter}

                  cio={cio}
                  setSignTarget={setSignTarget}
                />
              </TabsContent>
              <TabsContent value="territory" className="space-y-4">
                <CioTerritoryIndicators 
                  myOwnVisible={myOwnVisible} 
                  myFillable={myFillable}
                  collapsed={collapsed}
                  toggleNode={toggleNode}
                  parents={parents}
                  treeFilter={treeFilter}
                  setTreeFilter={setTreeFilter}
                  munFilter={munFilter}
                  setMunFilter={setMunFilter}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              <CioOwnIndicators 
                myOwnVisible={myOwnVisible} 
                myFillable={myFillable}
                collapsed={collapsed}
                toggleNode={toggleNode}
                parents={parents}
                treeFilter={treeFilter}
                setTreeFilter={setTreeFilter}

                cio={cio}
                setSignTarget={setSignTarget}
              />
            </div>
          )}
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

      <SignDialog
        open={!!signTarget}
        onOpenChange={(v) => !v && setSignTarget(null)}
        title="Собственный показатель ЦИО — направление на согласование в МЭФ"
        onSigned={() => {
          if (signTarget) dispatch({ type: 'CIO_SIGN_OWN', cioIndId: signTarget, cioId: CURRENT_CIO, actor: 'Петров С.И.' });
          setSignTarget(null);
        }}
      />
    </div>
  );
}

function CioOwnIndicators({ myOwnVisible, myFillable, collapsed, toggleNode, parents, treeFilter, setTreeFilter, cio, setSignTarget }: any) {
  const { state, dispatch } = useStore();
  return (
    <>
      <IndToolbar
        filter={treeFilter}
        onChange={setTreeFilter}
        shown={myOwnVisible.length}
        total={myFillable.length}
      />
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm flex gap-2">
        <Info className="h-4 w-4 text-blue-700 mt-0.5 shrink-0" />
        <span>
          ЦИО вносит собственные значения по тем же показателям, что заполняют ОМСУ его отрасли: отчётные данные за 2023–2025 гг.,
          оценку 2026 г. и прогнозы на 2027–2029 гг. по консервативному и базовому вариантам. Подпишите ЭЦП и отправьте на
          согласование в МЭФ.
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
                    <th rowSpan={2} className="text-left p-2 align-middle">Комментарий МЭФ</th>
                    <th rowSpan={2} className="text-right p-2 w-64 align-middle">Действия</th>
                  </>
                )}
              />
            </thead>
            <tbody>
              {myOwnVisible.map((ind: any) => {
                const v = state.cioValues[ind.id]?.[CURRENT_CIO] ?? { ...emptyValueFields(), status: 'not_filled' as const, updatedAt: null };
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

                      return (
                        <td key={f.key} className={`p-1.5 text-center ${fieldTint(f.key)}`}>
                          {editable && f.key === 'v2026' ? (
                            <WithValueTip show={v[f.key] !== null} updatedAt={v.updatedAt} author={v.signedBy ?? 'Петров С.И.'}>
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
                                    cioId: CURRENT_CIO,
                                    field: f.key,
                                    value: e.target.value === '' ? null : Number(e.target.value),
                                  })
                                }
                              />
                            </WithValueTip>
                          ) : (
                            <span className={f.key === 'v2026' ? 'font-medium' : ''}>
                              <ValueTip value={v[f.key]} updatedAt={v.updatedAt} author={v.signedBy ?? 'Петров С.И.'} />
                            </span>
                          )}

                        </td>
                      );
                    })}
                    <td className="p-2"><CioStatusBadge status={v.status} /></td>
                    <td className="p-2 text-xs text-red-700">{v.comment ?? ''}</td>
                    <td className="p-2 text-right whitespace-nowrap">
                      {editable && v.v2026 !== null && (
                        <Button size="sm" onClick={() => setSignTarget(ind.id)}>
                          <Send className="h-3.5 w-3.5 mr-1" /> Отправить
                        </Button>
                      )}
                      {v.status === 'pending_mef' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => dispatch({ type: 'CIO_RECALL_OWN', cioIndId: ind.id, cioId: CURRENT_CIO, actor: cio.short })}
                        >
                          <Undo2 className="h-3.5 w-3.5 mr-1" /> Отозвать
                        </Button>
                      )}
                      {v.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700">
                          <Lock className="h-3.5 w-3.5" /> согласовано МЭФ
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
    </>
  );
}

function CioTerritoryIndicators({ myOwnVisible, myFillable, collapsed, toggleNode, parents, treeFilter, setTreeFilter, munFilter, setMunFilter }: any) {
  const { state, dispatch } = useStore();
  let activeOmsus = state.omsus.filter(o => o.isActive);
  if (munFilter && munFilter !== 'all') {
    activeOmsus = activeOmsus.filter(o => o.id === munFilter);
  }

  return (
    <>
      <IndToolbar
        filter={treeFilter}
        onChange={setTreeFilter}
        shown={myOwnVisible.length}
        total={myFillable.length}
        munId={munFilter}
        onMunChange={setMunFilter}
      />
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm flex gap-2">
        <Info className="h-4 w-4 text-blue-700 mt-0.5 shrink-0" />
        <span>ЦИО вносит данные в разрезе ОМСУ.</span>
      </div>
      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th rowSpan={2} className="text-left p-2 align-middle min-w-[220px]">Территория</th>
                <th colSpan={6} className="text-center p-1.5 border-l border-b bg-green-50/70">Отчёт</th>
                <th colSpan={2} className="text-center p-1.5 border-l border-b bg-amber-50/70">Оценка</th>
                <th colSpan={4} className="text-center p-1.5 border-l border-b bg-blue-50/70">2027 год</th>
                <th colSpan={4} className="text-center p-1.5 border-l border-b bg-blue-50/70">2028 год</th>
                <th colSpan={4} className="text-center p-1.5 border-l border-b bg-blue-50/70">2029 год</th>
              </tr>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] border-l bg-green-50/70">2023 (ОМСУ)</th>
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] bg-green-50/70">2023</th>
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] border-l bg-green-50/70">2024 (ОМСУ)</th>
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] bg-green-50/70">2024</th>
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] border-l bg-green-50/70">2025 (ОМСУ)</th>
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] bg-green-50/70">2025</th>
                
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] border-l bg-amber-50/70">Оценка (ОМСУ)</th>
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] bg-amber-50/70">2026</th>
                
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] border-l bg-blue-50/70">Баз. (ОМСУ)</th>
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] bg-blue-50/70">Баз.</th>
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] border-l bg-blue-50/70">Конс. (ОМСУ)</th>
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] bg-blue-50/70">Конс.</th>
                
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] border-l bg-blue-50/70">Баз. (ОМСУ)</th>
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] bg-blue-50/70">Баз.</th>
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] border-l bg-blue-50/70">Конс. (ОМСУ)</th>
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] bg-blue-50/70">Конс.</th>
                
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] border-l bg-blue-50/70">Баз. (ОМСУ)</th>
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] bg-blue-50/70">Баз.</th>
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] border-l bg-blue-50/70">Конс. (ОМСУ)</th>
                <th className="text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] bg-blue-50/70">Конс.</th>
              </tr>
            </thead>
            <tbody>
              {myOwnVisible.map((ind: any) => (
                <Fragment key={ind.id}>
                  <tr className="border-b bg-slate-100">
                    <td colSpan={1 + VALUE_FIELDS.length * 2} className="p-2 font-medium">
                      <div className="flex items-center gap-1" style={{ paddingLeft: `${(ind.level - 1) * 16}px` }}>
                        <TreeToggle
                          hasChildren={parents.has(ind.id)}
                          collapsed={!!collapsed[ind.id]}
                          onToggle={() => toggleNode(ind.id)}
                        />
                        <span>{ind.num} {ind.name} <span className="font-normal text-muted-foreground text-xs ml-2">({ind.unit})</span></span>
                      </div>
                    </td>
                  </tr>
                  {!collapsed[ind.id] && activeOmsus.map((omsu) => {
                    const v = state.cioTerritoryValues[CURRENT_CIO]?.[ind.id]?.[omsu.id] ?? { ...emptyValueFields(), status: 'not_filled', updatedAt: null };
                    const omsuV = state.omsuValues[omsu.id]?.[ind.id];
                    return (
                      <tr key={omsu.id} className="border-b hover:bg-slate-50">
                        <td className="p-2 font-medium pl-6">{omsu.name}</td>
                        {VALUE_FIELDS.map((f) => (
                          <Fragment key={f.key}>
                            {/* Столбец ОМСУ */}
                            <td className={`p-1.5 text-center border-l ${f.key === 'v2026' ? 'bg-amber-50/30' : fieldTint(f.key)}`}>
                              <div className="flex flex-col items-center justify-center gap-1">
                                <ValueTip value={omsuV?.[f.key] ?? null} updatedAt={omsuV?.updatedAt ?? null} author={omsuV?.signedBy ?? 'ОМСУ'} />
                                {f.key === 'v2026' && omsuV && <OmsuStatusBadge status={omsuV.status} />}
                              </div>
                            </td>
                            {/* Столбец ЦИО */}
                            <td className={`p-1.5 text-center ${f.key === 'v2026' ? 'bg-amber-50/30' : fieldTint(f.key)}`}>
                              {f.key === 'v2026' ? (
                                <Input
                                  type="number"
                                  step="0.1"
                                  className="h-8 w-[76px] text-center mx-auto bg-white px-1 font-medium border-amber-300"
                                  placeholder="—"
                                  value={v[f.key] ?? ''}
                                  onChange={(e) =>
                                    dispatch({
                                      type: 'CIO_TERR_SET_VALUE',
                                      cioId: CURRENT_CIO,
                                      indId: ind.id,
                                      munId: omsu.id,
                                      field: f.key,
                                      value: e.target.value === '' ? null : Number(e.target.value),
                                    })
                                  }
                                />
                              ) : (
                                <ValueTip value={v[f.key] ?? omsuV?.[f.key] ?? null} updatedAt={v.updatedAt} author="ЦИО" />
                              )}
                            </td>
                          </Fragment>
                        ))}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
