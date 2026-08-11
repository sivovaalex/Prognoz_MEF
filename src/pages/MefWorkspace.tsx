import { useState, Fragment } from 'react';
import { useStore } from '@/lib/store';
import { VALUE_FIELDS } from '@/lib/types';
import { EMPTY_TREE_FILTER, chevronParents, visibleTree, type TreeFilter } from '@/lib/indTree';
import { IndToolbar, TreeToggle } from '@/components/IndToolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Undo2, CheckCircle2, Info, Lock } from 'lucide-react';
import { ValueGroupHeader, fieldTint } from '@/components/ValueColumns';
import { CioStatusBadge } from '@/components/StatusBadge';
import { ValueTip } from '@/components/ValueTip';

export function MefWorkspace() {
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
        <div>
          <h2 className="text-lg font-semibold">Согласование показателей ЦИО</h2>
          <p className="text-sm text-muted-foreground">
            Проверка и утверждение собственных показателей центральных исполнительных органов.
          </p>
        </div>
      </div>

      <IndToolbar
        filter={treeFilter}
        onChange={setTreeFilter}
        shown={visible.length}
        total={fillable.length}
      />

      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm flex gap-2">
        <Info className="h-4 w-4 text-blue-700 mt-0.5 shrink-0" />
        <span>
          МЭФ проверяет значения, внесённые ЦИО. Вы можете согласовать данные или вернуть их на доработку с указанием причины.
        </span>
      </div>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <ValueGroupHeader
                leading={<th rowSpan={2} className="text-left p-2 align-middle min-w-[220px]">Показатель / ЦИО</th>}
                trailing={(
                  <>
                    <th rowSpan={2} className="text-left p-2 align-middle border-l">Статус</th>
                    <th rowSpan={2} className="text-right p-2 w-64 align-middle">Действия</th>
                  </>
                )}
              />
            </thead>
            <tbody>
              {visible.map((ind) => {
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

                const cioVals = state.cioValues[ind.id] || {};
                const ciosWithData = Object.entries(cioVals).filter(([_, v]) => v.v2026 !== null);
                
                return (
                  <Fragment key={ind.id}>
                    {ciosWithData.length === 0 ? (
                      <tr className="border-b hover:bg-slate-50">
                        <td className="p-2" colSpan={3 + VALUE_FIELDS.length + 2}>
                          <div className="flex items-start gap-1" style={{ paddingLeft: `${(ind.level - 1) * 18}px` }}>
                            <TreeToggle
                              hasChildren={parents.has(ind.id)}
                              collapsed={!!collapsed[ind.id]}
                              onToggle={() => toggleNode(ind.id)}
                            />
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
                        return (
                          <tr key={cioId} className={`border-b ${v.status === 'pending_mef' ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}>
                            {ri === 0 && (
                              <td rowSpan={ciosWithData.length} className="p-2 align-top w-1/3">
                                <div className="flex items-start gap-1" style={{ paddingLeft: `${(ind.level - 1) * 18}px` }}>
                                  <span className="mt-0.5 inline-flex shrink-0">
                                    <TreeToggle
                                      hasChildren={parents.has(ind.id)}
                                      collapsed={!!collapsed[ind.id]}
                                      onToggle={() => toggleNode(ind.id)}
                                    />
                                  </span>
                                  <div>
                                    <span className="font-medium">{ind.num} {ind.name} <span className="font-normal text-muted-foreground">({ind.unit})</span></span>
                                  </div>
                                </div>
                              </td>
                            )}
                            <td className="p-2 font-medium border-l">{cioObj?.short || cioId}</td>
                            {VALUE_FIELDS.map((f) => (
                              <td key={f.key} className={`p-1.5 text-center ${f.key === 'v2026' ? 'font-medium' : ''} ${fieldTint(f.key)}`}>
                                <ValueTip value={v[f.key]} updatedAt={v.updatedAt} author={v.signedBy ?? 'Ответственный'} />
                              </td>
                            ))}
                            <td className="p-2 border-l"><CioStatusBadge status={v.status} /></td>
                            <td className="p-2 text-right whitespace-nowrap">
                              {v.status === 'pending_mef' && (
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    size="sm"
                                    onClick={() => dispatch({ type: 'MEF_APPROVE', cioId, cioIndId: ind.id, actor: 'МЭФ' })}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Согласовать
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => { setReturnTarget({ cioId, indId: ind.id }); setComment(''); }}
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
          <DialogHeader>
            <DialogTitle>Возврат показателя на доработку ЦИО</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Комментарий для ЦИО (обязательно)"
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
                  dispatch({ type: 'MEF_RETURN', cioId: returnTarget.cioId, cioIndId: returnTarget.indId, actor: 'МЭФ', comment: comment.trim() });
                setReturnTarget(null);
              }}
            >
              Вернуть на доработку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
