import { useState, Fragment } from 'react';
import { useStore } from '@/lib/store';
import { VALUE_FIELDS, VALUE_GROUPS } from '@/lib/types';
import { EMPTY_TREE_FILTER, chevronParents, visibleTree, type TreeFilter } from '@/lib/indTree';
import { IndToolbar, TreeToggle } from '@/components/IndToolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Undo2, CheckCircle2, Info, Lock, Send } from 'lucide-react';
import { fieldTint } from '@/components/ValueColumns';
import { CioStatusBadge } from '@/components/StatusBadge';
import { ValueTip } from '@/components/ValueTip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

const GROUP_HEAD: Record<string, string> = {
  report: 'bg-green-50/70',
  estimate: 'bg-amber-50/70',
  y2027: 'bg-blue-50/70',
  y2028: 'bg-blue-50/70',
  y2029: 'bg-blue-50/70',
};

export function MefWorkspace({ block }: { block?: string }) {
  const isNewLogic = block === 'mun' || block === 'rating_main' || block === 'ukaz_main';
  return isNewLogic ? <MefWorkspaceNew /> : <MefWorkspaceOld />;
}

function MefWorkspaceNew() {
  const { state } = useStore();
  const [treeFilter, setTreeFilter] = useState<TreeFilter>(EMPTY_TREE_FILTER);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showOmsu, setShowOmsu] = useState(false);

  const parents = chevronParents(state.indicators);
  const toggleNode = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  const visible = visibleTree(state.indicators, collapsed, treeFilter);
  const fillable = state.indicators.filter((i) => !i.isGroup);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Согласование прогноза</h2>
          <p className="text-sm text-muted-foreground">Проверка и утверждение данных ЦИО.</p>
        </div>
      </div>
      <Tabs defaultValue="indicators">
        <TabsList className="mb-4">
          <TabsTrigger value="indicators">Показатели</TabsTrigger>
          <TabsTrigger value="territory">Территория</TabsTrigger>
        </TabsList>
        <TabsContent value="indicators" className="space-y-4">
          <MefIndicators
            visible={visible}
            fillable={fillable}
            collapsed={collapsed}
            toggleNode={toggleNode}
            parents={parents}
            treeFilter={treeFilter}
            setTreeFilter={setTreeFilter}
            showOmsu={showOmsu}
            setShowOmsu={setShowOmsu}
          />
        </TabsContent>
        <TabsContent value="territory" className="space-y-4">
          <MefTerritoryIndicators
            visible={visible}
            fillable={fillable}
            collapsed={collapsed}
            toggleNode={toggleNode}
            parents={parents}
            treeFilter={treeFilter}
            setTreeFilter={setTreeFilter}
            showOmsu={showOmsu}
            setShowOmsu={setShowOmsu}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MefIndicators({ visible, fillable, collapsed, toggleNode, parents, treeFilter, setTreeFilter, showOmsu, setShowOmsu }: any) {
  const [munFilter, setMunFilter] = useState<string>('m1');
  const { state, dispatch } = useStore();
  const [returnTarget, setReturnTarget] = useState<{ cioId: string; indId: string } | null>(null);
  const [comment, setComment] = useState('');

  return (
    <>
      <IndToolbar filter={treeFilter} onChange={setTreeFilter} shown={visible.length} total={fillable.length} hideCioFilter munId={munFilter} onMunChange={setMunFilter} allowAllMuns={false} />
      <div className="flex items-center gap-2 mt-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showOmsu} onChange={(e) => setShowOmsu(e.target.checked)} />
          Показать данные ОМСУ
        </label>
      </div>
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm flex gap-2 mt-4">
        <Info className="h-4 w-4 text-blue-700 mt-0.5 shrink-0" />
        <span>
          МЭФ проверяет значения, внесённые ЦИО. Вы можете согласовать данные или внести собственные.
        </span>
      </div>

      <Card className="mt-4">
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th rowSpan={3} className="text-left p-2 align-middle min-w-[220px]">Показатель / ЦИО</th>
                {VALUE_GROUPS.map((g) => (
                  <th key={g.key} colSpan={g.span * (showOmsu ? 3 : 2)} className={`text-center p-1.5 border-l border-b ${GROUP_HEAD[g._bg]}`}>
                    {g.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b text-xs text-muted-foreground">
                {VALUE_FIELDS.map((f) => (
                  <th key={f.key} colSpan={showOmsu ? 3 : 2} className={`text-center p-1.5 border-l border-b ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/70' : fieldTint(f.key)}`}>
                    {f.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b text-xs text-muted-foreground">
                {VALUE_FIELDS.map((f) => (
                  <Fragment key={f.key}>
                    {showOmsu && <th className={`text-center p-1.5 font-medium border-l ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/70' : fieldTint(f.key)}`}>ОМСУ</th>}
                    <th className={`text-center p-1.5 font-medium ${!showOmsu ? 'border-l' : ''} ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/70' : fieldTint(f.key)}`}>ЦИО</th>
                    <th className={`text-center p-1.5 font-medium ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/70' : fieldTint(f.key)}`}>МЭФ</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((ind: any) => {
                if (ind.isGroup) {
                  return (
                    <tr key={ind.id} className="border-b bg-slate-50/80">
                      <td colSpan={1 + VALUE_FIELDS.length * (showOmsu ? 3 : 2)} className="p-2 align-middle">
                        <span className="flex items-center gap-1 font-semibold text-slate-700" style={{ paddingLeft: `${(ind.level - 1) * 18}px` }}>
                          <TreeToggle hasChildren={parents.has(ind.id)} collapsed={!!collapsed[ind.id]} onToggle={() => toggleNode(ind.id)} />
                          <span><span className="mr-1 text-slate-400">▸</span>{ind.num}. {ind.name}</span>
                        </span>
                      </td>
                    </tr>
                  );
                }

                const cioVals = state.cioValues[ind.id] || {};
                const ciosWithData = Object.entries(cioVals).filter(([_, v]) => v.v2026 !== null || v.status !== 'not_filled');
                
                return (
                  <Fragment key={ind.id}>
                    {ciosWithData.length === 0 ? (
                      <tr className="border-b hover:bg-slate-50">
                        <td className="p-2" colSpan={1 + VALUE_FIELDS.length * (showOmsu ? 3 : 2)}>
                          <div className="flex items-start gap-1" style={{ paddingLeft: `${(ind.level - 1) * 18}px` }}>
                            <TreeToggle hasChildren={parents.has(ind.id)} collapsed={!!collapsed[ind.id]} onToggle={() => toggleNode(ind.id)} />
                            <div>
                              <span className="font-medium text-slate-500">{ind.num} {ind.name} <span className="font-normal">({ind.unit})</span></span>
                              <div className="text-xs text-slate-400">Нет данных от ЦИО</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      ciosWithData.map(([cioId, v], ri) => {
                        const cioObj = state.cios.find((c) => c.id === cioId);
                        const mefV = state.mefValues[ind.id]?.[cioId] || { ...v, status: 'not_filled', updatedAt: null };
                        return (
                          <tr key={cioId} className={`border-b ${v.status === 'pending_mef' ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}>
                            <td className="p-2 align-top">
                              <div className="flex items-start gap-1" style={{ paddingLeft: `${(ind.level - 1) * 18}px` }}>
                                {ri === 0 && (
                                  <span className="mt-0.5 inline-flex shrink-0">
                                    <TreeToggle hasChildren={parents.has(ind.id)} collapsed={!!collapsed[ind.id]} onToggle={() => toggleNode(ind.id)} />
                                  </span>
                                )}
                                <div>
                                  {ri === 0 && <span className="font-medium">{ind.num} {ind.name} <span className="font-normal text-muted-foreground">({ind.unit})</span><br /></span>}
                                  <span className="text-sm font-semibold text-slate-700">ЦИО: {cioObj?.short || cioId}</span>
                                </div>
                              </div>
                            </td>
                            {VALUE_FIELDS.map((f) => (
                              <Fragment key={f.key}>
                                {showOmsu && (
                                  <td className={`p-1.5 text-center border-l ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/30' : fieldTint(f.key)}`}>
                                    <span className="text-muted-foreground">—</span>
                                  </td>
                                )}
                                <td className={`p-1.5 text-center ${!showOmsu ? 'border-l' : ''} ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/30' : fieldTint(f.key)}`}>
                                  <ValueTip value={v[f.key]} updatedAt={v.updatedAt} author={v.signedBy ?? 'Ответственный'} />
                                  {(f.key === 'v2026' || f.key === 'v2025') && (
                                    <div className="mt-1 flex flex-col items-center gap-1">
                                      <CioStatusBadge status={v.status} />
                                      {v.status === 'pending_mef' && (
                                        <div className="flex gap-1 mt-1">
                                          <Button size="icon-sm" variant="outline" className="h-6 w-6 text-green-600 hover:text-green-700" onClick={() => dispatch({ type: 'MEF_APPROVE', cioIndId: ind.id, cioId, actor: 'МЭФ' })} title="Согласовать">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button size="icon-sm" variant="outline" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => { setReturnTarget({ cioId, indId: ind.id }); setComment(''); }} title="Вернуть">
                                            <Undo2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className={`p-1.5 text-center ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/30' : fieldTint(f.key)}`}>
                                  {(f.key === 'v2026' || f.key === 'v2025') ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <Input
                                        type="number"
                                        step="0.1"
                                        className="h-8 w-[76px] text-center mx-auto bg-white px-1 font-medium border-amber-300"
                                        placeholder="—"
                                        value={mefV[f.key] ?? ''}
                                        disabled={v.status === 'approved'}
                                        onChange={(e) => dispatch({ type: 'MEF_SET_OWN', cioIndId: ind.id, cioId, field: f.key, value: e.target.value === '' ? null : Number(e.target.value) })}
                                      />

                                      {v.status !== 'approved' && mefV[f.key] !== null && mefV.status === 'draft' && (
                                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 mt-1 text-blue-600 hover:text-blue-700" onClick={() => dispatch({ type: 'MEF_SEND_OWN', cioIndId: ind.id, cioId })} title="Отправить">
                                          <Send className="h-3 w-3 mr-1" /> Отправить
                                        </Button>
                                      )}
                                      {v.status !== 'approved' && mefV.status === 'sent' && (
                                        <div className="flex flex-col items-center gap-1 mt-1">
                                          <span className="text-[10px] text-amber-600 leading-tight">Отправлено</span>
                                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-red-500 hover:text-red-600" onClick={() => dispatch({ type: 'MEF_RECALL_OWN', cioIndId: ind.id, cioId })} title="Отозвать">
                                            <Undo2 className="h-3 w-3 mr-1" /> Вернуть
                                          </Button>
                                        </div>
                                      )}                                      {v.status === 'approved' && <span className="text-[10px] text-green-600 flex items-center gap-0.5 mt-1"><Lock className="w-3 h-3"/> Согласовано</span>}
                                    </div>
                                  ) : (
                                    <ValueTip value={mefV[f.key] ?? v[f.key]} updatedAt={mefV.updatedAt} author="МЭФ" />
                                  )}
                                </td>
                              </Fragment>
                            ))}
                          </tr>
                        );
                      })
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!returnTarget} onOpenChange={(v) => !v && setReturnTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Возврат показателя на доработку ЦИО</DialogTitle></DialogHeader>
          <Textarea placeholder="Комментарий для ЦИО (обязательно)" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTarget(null)}>Отмена</Button>
            <Button variant="destructive" disabled={!comment.trim()} onClick={() => { if (returnTarget) dispatch({ type: 'MEF_RETURN', cioId: returnTarget.cioId, cioIndId: returnTarget.indId, actor: 'МЭФ', comment: comment.trim() }); setReturnTarget(null); }}>Вернуть на доработку</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MefTerritoryIndicators({ visible, fillable, collapsed, toggleNode, parents, treeFilter, setTreeFilter, showOmsu, setShowOmsu }: any) {
  const { state, dispatch } = useStore();
  const [returnTarget, setReturnTarget] = useState<{ cioId: string; indId: string; munId: string } | null>(null);
  const [comment, setComment] = useState('');
  
  const [munFilter, setMunFilter] = useState<string>('all');
  let activeOmsus = state.omsus.filter((m) => m.isActive);
  if (munFilter !== 'all') {
    activeOmsus = activeOmsus.filter(o => o.id === munFilter);
  }

  return (
    <>
      <IndToolbar filter={treeFilter} onChange={setTreeFilter} shown={visible.length} total={fillable.length} hideCioFilter munId={munFilter} onMunChange={setMunFilter} />
      <div className="flex items-center gap-2 mt-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showOmsu} onChange={(e) => setShowOmsu(e.target.checked)} />
          Показать данные ОМСУ
        </label>
      </div>
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm flex gap-2 mt-4">
        <Info className="h-4 w-4 text-blue-700 mt-0.5 shrink-0" />
        <span>МЭФ проверяет значения территорий, внесённые ЦИО. Вы можете согласовать данные или внести собственные.</span>
      </div>

      <Card className="mt-4">
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th rowSpan={3} className="text-left p-2 align-middle min-w-[220px]">Территория / Показатель</th>
                {VALUE_GROUPS.map((g) => (
                  <th key={g.key} colSpan={g.span * (showOmsu ? 3 : 2)} className={`text-center p-1.5 border-l border-b ${GROUP_HEAD[g._bg]}`}>
                    {g.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b text-xs text-muted-foreground">
                {VALUE_FIELDS.map((f) => (
                  <th key={f.key} colSpan={showOmsu ? 3 : 2} className={`text-center p-1.5 border-l border-b ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/70' : fieldTint(f.key)}`}>
                    {f.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b text-xs text-muted-foreground">
                {VALUE_FIELDS.map((f) => (
                  <Fragment key={f.key}>
                    {showOmsu && <th className={`text-center p-1.5 font-medium border-l ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/70' : fieldTint(f.key)}`}>ОМСУ</th>}
                    <th className={`text-center p-1.5 font-medium ${!showOmsu ? 'border-l' : ''} ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/70' : fieldTint(f.key)}`}>ЦИО</th>
                    <th className={`text-center p-1.5 font-medium ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/70' : fieldTint(f.key)}`}>МЭФ</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((ind: any) => (
                <Fragment key={ind.id}>
                  <tr className="border-b bg-slate-100">
                    <td colSpan={1 + VALUE_FIELDS.length * (showOmsu ? 3 : 2)} className="p-2 font-medium">
                      <div className="flex items-center gap-1" style={{ paddingLeft: `${(ind.level - 1) * 16}px` }}>
                        <TreeToggle hasChildren={parents.has(ind.id)} collapsed={!!collapsed[ind.id]} onToggle={() => toggleNode(ind.id)} />
                        <span>{ind.num} {ind.name} <span className="font-normal text-muted-foreground text-xs ml-2">({ind.unit})</span></span>
                      </div>
                    </td>
                  </tr>
                  {!collapsed[ind.id] && activeOmsus.map((omsu) => {
                    const cioId = ind.cioId;
                    const v = state.cioTerritoryValues[cioId]?.[ind.id]?.[omsu.id];
                    if (!v && !showOmsu) return null; 
                    const safeV = v || { v2023: null, v2024: null, v2025: null, v2026: null, cons2027: null, base2027: null, cons2028: null, base2028: null, cons2029: null, base2029: null, status: 'not_filled', updatedAt: null };
                    
                    const mefV = state.mefTerritoryValues[cioId]?.[ind.id]?.[omsu.id] || { v2023: null, v2024: null, v2025: null, v2026: null, cons2027: null, base2027: null, cons2028: null, base2028: null, cons2029: null, base2029: null, status: 'not_filled', updatedAt: null };
                    return (
                      <tr key={omsu.id} className={`border-b ${safeV.status === 'pending_mef' ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}>
                        <td className="p-2 font-medium pl-6">{omsu.name}</td>
                        {VALUE_FIELDS.map((f) => (
                          <Fragment key={f.key}>
                            {showOmsu && (
                              <td className={`p-1.5 text-center border-l ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/30' : fieldTint(f.key)}`}>
                                <span className="text-muted-foreground">—</span>
                              </td>
                            )}
                            <td className={`p-1.5 text-center ${!showOmsu ? 'border-l' : ''} ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/30' : fieldTint(f.key)}`}>
                              <ValueTip value={safeV[f.key]} updatedAt={safeV.updatedAt} author={safeV.signedBy ?? 'Ответственный'} />
                              {(f.key === 'v2026' || f.key === 'v2025') && (
                                <div className="mt-1 flex flex-col items-center gap-1">
                                  <CioStatusBadge status={safeV.status} />
                                  {safeV.status === 'pending_mef' && (
                                    <div className="flex gap-1 mt-1">
                                      <Button size="icon-sm" variant="outline" className="h-6 w-6 text-green-600 hover:text-green-700" onClick={() => dispatch({ type: 'MEF_TERR_APPROVE', indId: ind.id, cioId, munId: omsu.id, actor: 'МЭФ' })} title="Согласовать">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button size="icon-sm" variant="outline" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => { setReturnTarget({ cioId, indId: ind.id, munId: omsu.id }); setComment(''); }} title="Вернуть">
                                        <Undo2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className={`p-1.5 text-center ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/30' : fieldTint(f.key)}`}>
                              {(f.key === 'v2026' || f.key === 'v2025') ? (
                                <div className="flex flex-col items-center gap-1">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    className="h-8 w-[76px] text-center mx-auto bg-white px-1 font-medium border-amber-300"
                                    placeholder="—"
                                    value={mefV[f.key] ?? ''}
                                    disabled={safeV.status === 'approved'}
                                    onChange={(e) => dispatch({ type: 'MEF_TERR_SET_VALUE', indId: ind.id, cioId, munId: omsu.id, field: f.key, value: e.target.value === '' ? null : Number(e.target.value) })}
                                  />
                                  {safeV.status !== 'approved' && mefV[f.key] !== null && mefV.status === 'draft' && (
                                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 mt-1 text-blue-600 hover:text-blue-700" onClick={() => dispatch({ type: 'MEF_TERR_SEND_OWN', indId: ind.id, cioId, munId: omsu.id })} title="Отправить">
                                      <Send className="h-3 w-3 mr-1" /> Отправить
                                    </Button>
                                  )}
                                  {safeV.status !== 'approved' && mefV.status === 'sent' && (
                                    <div className="flex flex-col items-center gap-1 mt-1">
                                      <span className="text-[10px] text-amber-600 leading-tight">Отправлено</span>
                                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-red-500 hover:text-red-600" onClick={() => dispatch({ type: 'MEF_TERR_RECALL_OWN', indId: ind.id, cioId, munId: omsu.id })} title="Отозвать">
                                        <Undo2 className="h-3 w-3 mr-1" /> Вернуть
                                      </Button>
                                    </div>
                                  )}
                                  {safeV.status === 'approved' && <span className="text-[10px] text-green-600 flex items-center gap-0.5 mt-1"><Lock className="w-3 h-3"/> Согласовано</span>}
                                </div>
                              ) : (
                                <ValueTip value={mefV[f.key] ?? safeV[f.key]} updatedAt={mefV.updatedAt} author="МЭФ" />
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

      <Dialog open={!!returnTarget} onOpenChange={(v) => !v && setReturnTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Возврат территории на доработку ЦИО</DialogTitle></DialogHeader>
          <Textarea placeholder="Комментарий для ЦИО (обязательно)" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTarget(null)}>Отмена</Button>
            <Button variant="destructive" disabled={!comment.trim()} onClick={() => { if (returnTarget) dispatch({ type: 'MEF_TERR_RETURN', cioId: returnTarget.cioId, indId: returnTarget.indId, munId: returnTarget.munId, actor: 'МЭФ', comment: comment.trim() }); setReturnTarget(null); }}>Вернуть на доработку</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MefWorkspaceOld() {
  const { state, dispatch } = useStore();
  const [treeFilter, setTreeFilter] = useState<TreeFilter>(EMPTY_TREE_FILTER);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [returnTarget, setReturnTarget] = useState<{ cioId: string; indId: string } | null>(null);
  const [comment, setComment] = useState('');

  const visible = visibleTree(state.indicators, collapsed, treeFilter);
  const parents = chevronParents(state.indicators);
  const toggleNode = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));
  const fillable = state.indicators.filter((i) => !i.isGroup);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-semibold">Согласование показателей ЦИО</h2><p className="text-sm text-muted-foreground">Проверка и утверждение данных ЦИО.</p></div>
      </div>
      <IndToolbar filter={treeFilter} onChange={setTreeFilter} shown={visible.length} total={fillable.length} />
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm flex gap-2">
        <Info className="h-4 w-4 text-blue-700 mt-0.5 shrink-0" />
        <span>МЭФ проверяет значения, внесённые ЦИО. Вы можете согласовать данные или внести собственные.</span>
      </div>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th rowSpan={3} className="text-left p-2 align-middle min-w-[220px]">Показатель / ЦИО</th>
                {VALUE_GROUPS.map((g) => (
                  <th key={g.key} colSpan={g.span * 2} className={`text-center p-1.5 border-l border-b ${GROUP_HEAD[g._bg]}`}>
                    {g.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b text-xs text-muted-foreground">
                {VALUE_FIELDS.map((f) => (
                  <th key={f.key} colSpan={2} className={`text-center p-1.5 border-l border-b ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/70' : fieldTint(f.key)}`}>
                    {f.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b text-xs text-muted-foreground">
                {VALUE_FIELDS.map((f) => (
                  <Fragment key={f.key}>
                    <th className={`text-center p-1.5 font-medium border-l ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/70' : fieldTint(f.key)}`}>ЦИО</th>
                    <th className={`text-center p-1.5 font-medium ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/70' : fieldTint(f.key)}`}>МЭФ</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((ind: any) => {
                if (ind.isGroup) {
                  return (
                    <tr key={ind.id} className="border-b bg-slate-50/80">
                      <td colSpan={1 + VALUE_FIELDS.length * 2} className="p-2 align-middle">
                        <span className="flex items-center gap-1 font-semibold text-slate-700" style={{ paddingLeft: `${(ind.level - 1) * 18}px` }}>
                          <TreeToggle hasChildren={parents.has(ind.id)} collapsed={!!collapsed[ind.id]} onToggle={() => toggleNode(ind.id)} />
                          <span><span className="mr-1 text-slate-400">▸</span>{ind.num}. {ind.name}</span>
                        </span>
                      </td>
                    </tr>
                  );
                }

                const cioVals = state.cioValues[ind.id] || {};
                const ciosWithData = Object.entries(cioVals).filter(([_, v]) => v.v2026 !== null || v.status !== 'not_filled');
                
                return (
                  <Fragment key={ind.id}>
                    {ciosWithData.length === 0 ? (
                      <tr className="border-b hover:bg-slate-50">
                        <td className="p-2" colSpan={1 + VALUE_FIELDS.length * 2}>
                          <div className="flex items-start gap-1" style={{ paddingLeft: `${(ind.level - 1) * 18}px` }}>
                            <TreeToggle hasChildren={parents.has(ind.id)} collapsed={!!collapsed[ind.id]} onToggle={() => toggleNode(ind.id)} />
                            <div>
                              <span className="font-medium text-slate-500">{ind.num} {ind.name} <span className="font-normal">({ind.unit})</span></span>
                              <div className="text-xs text-slate-400">Нет данных от ЦИО</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      ciosWithData.map(([cioId, v], ri) => {
                        const cioObj = state.cios.find((c) => c.id === cioId);
                        const mefV = state.mefValues[ind.id]?.[cioId] || { ...v, status: 'not_filled', updatedAt: null };
                        return (
                          <tr key={cioId} className={`border-b ${v.status === 'pending_mef' ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}>
                            <td className="p-2 align-top">
                              <div className="flex items-start gap-1" style={{ paddingLeft: `${(ind.level - 1) * 18}px` }}>
                                {ri === 0 && (
                                  <span className="mt-0.5 inline-flex shrink-0">
                                    <TreeToggle hasChildren={parents.has(ind.id)} collapsed={!!collapsed[ind.id]} onToggle={() => toggleNode(ind.id)} />
                                  </span>
                                )}
                                <div>
                                  {ri === 0 && <span className="font-medium">{ind.num} {ind.name} <span className="font-normal text-muted-foreground">({ind.unit})</span><br /></span>}
                                  <span className="text-sm font-semibold text-slate-700">ЦИО: {cioObj?.short || cioId}</span>
                                </div>
                              </div>
                            </td>
                            {VALUE_FIELDS.map((f) => (
                              <Fragment key={f.key}>
                                <td className={`p-1.5 text-center border-l ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/30' : fieldTint(f.key)}`}>
                                  <ValueTip value={v[f.key]} updatedAt={v.updatedAt} author={v.signedBy ?? 'Ответственный'} />
                                  {(f.key === 'v2026' || f.key === 'v2025') && (
                                    <div className="mt-1 flex flex-col items-center gap-1">
                                      <CioStatusBadge status={v.status} />
                                      {v.status === 'pending_mef' && (
                                        <div className="flex gap-1 mt-1">
                                          <Button size="icon-sm" variant="outline" className="h-6 w-6 text-green-600 hover:text-green-700" onClick={() => dispatch({ type: 'MEF_APPROVE', cioIndId: ind.id, cioId, actor: 'МЭФ' })} title="Согласовать">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button size="icon-sm" variant="outline" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => { setReturnTarget({ cioId, indId: ind.id }); setComment(''); }} title="Вернуть">
                                            <Undo2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className={`p-1.5 text-center ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/30' : fieldTint(f.key)}`}>
                                  {(f.key === 'v2026' || f.key === 'v2025') ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <Input
                                        type="number"
                                        step="0.1"
                                        className="h-8 w-[76px] text-center mx-auto bg-white px-1 font-medium border-amber-300"
                                        placeholder="—"
                                        value={mefV[f.key] ?? ''}
                                        disabled={v.status === 'approved'}
                                        onChange={(e) => dispatch({ type: 'MEF_SET_OWN', cioIndId: ind.id, cioId, field: f.key, value: e.target.value === '' ? null : Number(e.target.value) })}
                                      />

                                      {v.status !== 'approved' && (
                                        <div className="flex gap-1 mt-1">
                                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-blue-600 hover:text-blue-700" title="Отправить">
                                            <Send className="h-3 w-3 mr-1" /> Отправить
                                          </Button>
                                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-red-500 hover:text-red-600" onClick={() => dispatch({ type: 'MEF_SET_OWN', cioIndId: ind.id, cioId, field: f.key, value: null })} title="Вернуть">
                                            <Undo2 className="h-3 w-3 mr-1" /> Вернуть
                                          </Button>
                                        </div>
                                      )}                                      {v.status === 'approved' && <span className="text-[10px] text-green-600 flex items-center gap-0.5 mt-1"><Lock className="w-3 h-3"/> Согласовано</span>}
                                    </div>
                                  ) : (
                                    <ValueTip value={mefV[f.key] ?? v[f.key]} updatedAt={mefV.updatedAt} author="МЭФ" />
                                  )}
                                </td>
                              </Fragment>
                            ))}
                          </tr>
                        );
                      })
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!returnTarget} onOpenChange={(v) => !v && setReturnTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Возврат показателя на доработку ЦИО</DialogTitle></DialogHeader>
          <Textarea placeholder="Комментарий для ЦИО (обязательно)" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTarget(null)}>Отмена</Button>
            <Button variant="destructive" disabled={!comment.trim()} onClick={() => { if (returnTarget) dispatch({ type: 'MEF_RETURN', cioId: returnTarget.cioId, cioIndId: returnTarget.indId, actor: 'МЭФ', comment: comment.trim() }); setReturnTarget(null); }}>Вернуть на доработку</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
