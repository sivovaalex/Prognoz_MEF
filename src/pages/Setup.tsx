import { useState } from 'react';
import { useStore } from '@/lib/store';

import type { Indicator } from '@/lib/types';
import {
  EMPTY_TREE_FILTER, autoIndicatorNum, chevronParents, isDescendant, isIndActive, visibleTree, type TreeFilter,
} from '@/lib/indTree';
import { IndToolbar, TreeToggle } from '@/components/IndToolbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Settings2, PowerOff } from 'lucide-react';

export function Setup({ block: _block }: { block?: string }) {
  const { state, dispatch } = useStore();
  const [editInd, setEditInd] = useState<Indicator | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [editDir, setEditDir] = useState<{ id?: string, num: string, name: string, cioIds: string[], actualFrom: string, actualTo?: string | null } | null>(null);
  const [treeFilter, setTreeFilter] = useState<TreeFilter>({ ...EMPTY_TREE_FILTER, actualDate: new Date().toISOString().split('T')[0] });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // Drag-and-drop: перестановка показателей с автоматической перенумерацией
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<{ targetId: string; before: boolean } | null>(null);
  const [topDropDir, setTopDropDir] = useState<string | null>(null);

  const visible = visibleTree(state.indicators, collapsed, treeFilter);
  const parents = chevronParents(state.indicators);
  const toggleNode = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));
  const uniqueUnits = Array.from(new Set(state.indicators.map((i) => i.unit).filter((u) => typeof u === 'string' && u.trim().length > 0))).sort();

  const openNew = () => {
    setIsNew(true);
    setEditInd({
      id: `i${Date.now()}`,
      num: '',
      name: '',
      directionId: state.directions[0]?.id || '',
      cioId: state.cios[0]?.id || '',
      unit: '%',
      optimum: 'max',
      weight: 0,
      formula: '',
      consCoeff: '',
      formulaReport: '',
      formulaEstimate: '',
      level: 1,
      parentId: null,
      actualFrom: new Date().toISOString().split('T')[0],
      closed: false,
      zato: false,
      closedForOmsuIds: [],
      calcException: '',
      isReference: false,
      hasRatingParams: false,
      ratingFormula: '',
      ratingFormulaZato: '',
    });
  };

  const openNewDir = () => {
    setEditDir({ num: '', name: '', cioIds: [], actualFrom: new Date().toISOString().split('T')[0] });
  };

  const save = () => {
    if (!editInd || !editInd.name.trim()) return;
    if (editInd.hasRatingParams) {
      const w = Number(editInd.weight);
      if (Number.isNaN(w) || w < 0 || w > 100) {
        alert('Вес (раздельного показателя) должен быть числом от 0 до 100');
        return;
      }
    }
    if (isNew) {
      dispatch({ type: 'ADD_INDICATOR', indicator: editInd });
    } else {
      const oldInd = state.indicators.find(i => i.id === editInd.id);
      if (oldInd) {
        dispatch({ type: 'UPDATE_INDICATOR', indicator: { ...oldInd, actualTo: editInd.actualFrom } });
      }
      dispatch({ type: 'ADD_INDICATOR', indicator: { ...editInd, id: 'i' + Date.now() }, afterId: oldInd?.id });
    }
    setEditInd(null);
  };

  const saveDir = () => {
    if (!editDir) return;
    const nameStr = editDir.num ? `${editDir.num}. ${editDir.name}` : editDir.name;
    if (editDir.id) {
      const oldDir = state.directions.find(d => d.id === editDir.id);
      if (oldDir) {
        dispatch({ type: 'UPDATE_DIRECTION', direction: { ...oldDir, actualTo: editDir.actualFrom } });
      }
      dispatch({
        type: 'ADD_DIRECTION',
        direction: {
          id: 'd' + Date.now(),
          name: nameStr,
          cioIds: editDir.cioIds,
          actualFrom: editDir.actualFrom,
          actualTo: null
        }
      });
    } else {
      dispatch({
        type: 'ADD_DIRECTION',
        direction: {
          id: 'd' + Date.now(),
          name: nameStr,
          cioIds: editDir.cioIds,
          actualFrom: editDir.actualFrom,
          actualTo: null
        }
      });
    }
    setEditDir(null);
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'dir' | 'ind', id: string, name: string } | null>(null);

  const deleteDir = (id: string, name: string) => {
    const hasActiveInds = state.indicators.some(i => i.directionId === id && !i.actualTo);
    if (hasActiveInds) {
      alert("Нельзя удалить раздел, так как в нём есть активные показатели.");
      return;
    }
    setDeleteConfirm({ type: 'dir', id, name });
  };

  const deleteInd = (id: string, name: string) => {
    setDeleteConfirm({ type: 'ind', id, name });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Настройка показателей</h2>
          <p className="text-sm text-muted-foreground">
            Перечень показателей, формулы и привязка к отраслевым ЦИО (по данным МЭФ). Отчётный период: {state.campaign.period}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openNewDir}><Plus className="h-4 w-4 mr-1" /> Добавить раздел показателя</Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Добавить показатель</Button>
        </div>
      </div>

      <Tabs defaultValue="indicators">
        <TabsList>
          <TabsTrigger value="indicators"><Settings2 className="h-4 w-4 mr-1" /> Показатели и формулы</TabsTrigger>
        </TabsList>

        <TabsContent value="indicators">
          <div className="space-y-4">
            <IndToolbar
              filter={treeFilter}
              onChange={setTreeFilter}
              shown={visible.length}
              total={state.indicators.length}
            />
            {state.directions.filter(d => d.actualFrom <= (treeFilter.actualDate || '9999-99-99') && (!d.actualTo || d.actualTo > (treeFilter.actualDate || ''))).map((d) => {
              const inds = visible.filter((i) => i.directionId === d.id && i.actualFrom <= (treeFilter.actualDate || '9999-99-99') && (!i.actualTo || i.actualTo > (treeFilter.actualDate || '')));
              if (!inds.length) return null;
              return (
                <Card
          key={d.id}
          className={topDropDir === d.id ? 'ring-2 ring-blue-500' : ''}
          onDragOver={(e) => {
            if (!dragId) return;
            const dragged = state.indicators.find(i => i.id === dragId);
            if (!dragged || dragged.directionId !== d.id) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setTopDropDir(d.id);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (!dragId || topDropDir !== d.id) return;
            dispatch({ type: 'MOVE_INDICATOR', id: dragId, newParentId: null, index: Number.MAX_SAFE_INTEGER });
            setDragId(null); setDropHint(null); setTopDropDir(null);
          }}
        >
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{d.name}</CardTitle>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditDir({ id: d.id, num: d.name.split('.')[0] || '', name: d.name.replace(/^[0-9.]+\s*/, ''), cioIds: d.cioIds || [], actualFrom: d.actualFrom, actualTo: d.actualTo })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => deleteDir(d.id, d.name)} title="Деактивировать">
                          <PowerOff className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left p-2 w-12">№</th>
                          <th className="text-left p-2">Показатель</th>
                          <th className="text-left p-2">Отраслевой ЦИО</th>
                          <th className="text-left p-2">Ед. изм.</th>
                          <th className="text-left p-2">Формула базового прогноза</th>
                          <th className="text-left p-2">Коэффициент консервативного прогноза</th>
                          <th className="p-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {inds.map((ind) => (
                          <tr
                          key={ind.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', ind.id);
                            setDragId(ind.id);
                          }}
                          onDragEnd={() => { setDragId(null); setDropHint(null); setTopDropDir(null); }}
                          onDragOver={(e) => {
                            if (!dragId || dragId === ind.id) return;
                            const dragged = state.indicators.find(i => i.id === dragId);
                            if (!dragged || dragged.directionId !== ind.directionId) return;
                            if (isDescendant(state.indicators, dragId, ind.id)) return;
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = 'move';
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDropHint({ targetId: ind.id, before: e.clientY < rect.top + rect.height / 2 });
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!dragId || !dropHint || dropHint.targetId !== ind.id) return;
                            const sibs = state.indicators.filter(
                              i => i.parentId === ind.parentId && i.directionId === ind.directionId
                                && i.id !== dragId && isIndActive(i, treeFilter.actualDate || ''),
                            );
                            let idx = sibs.findIndex(i => i.id === ind.id);
                            if (!dropHint.before) idx += 1;
                            dispatch({ type: 'MOVE_INDICATOR', id: dragId, newParentId: ind.parentId, index: idx });
                            setDragId(null); setDropHint(null); setTopDropDir(null);
                          }}
                          className={`border-b ${ind.isGroup ? 'bg-slate-50/80' : 'hover:bg-slate-50'} cursor-grab active:cursor-grabbing ${
                            dropHint?.targetId === ind.id
                              ? dropHint.before ? 'shadow-[inset_0_2px_0_0_#2563eb]' : 'shadow-[inset_0_-2px_0_0_#2563eb]'
                              : ''
                          }`}
                        >
                            <td className="p-2 text-muted-foreground whitespace-nowrap">{ind.num}</td>
                            <td className={`p-2 ${ind.isGroup ? 'font-semibold text-slate-700' : 'font-medium'}`}>
                              <span className="flex items-center gap-1" style={{ paddingLeft: `${(ind.level - 1) * 18}px` }}>
                                <TreeToggle
                                  hasChildren={parents.has(ind.id)}
                                  collapsed={!!collapsed[ind.id]}
                                  onToggle={() => toggleNode(ind.id)}
                                />
                                <span>
                                  {ind.isGroup && <span className="mr-1 text-slate-400">▸</span>}
                                  {ind.name}
                                </span>
                              </span>
                            </td>
                            <td className="p-2"><Badge variant="secondary">{state.cios.find((c) => c.id === ind.cioId)?.short}</Badge></td>
                            <td className="p-2">{ind.isGroup ? '—' : ind.unit}</td>
                            <td className="p-2 text-xs text-muted-foreground font-mono">{ind.isGroup ? '—' : ind.formula}</td>
                            <td className="p-2 text-xs text-muted-foreground font-mono">{ind.isGroup ? '—' : (ind.consCoeff || '—')}</td>
                            <td className="p-2">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => {
                                  setIsNew(false);
                                  setEditInd({
                                    ...ind,
                                    isReference: ind.isReference ?? ind.name.startsWith('Справочно: '),
                                    hasRatingParams: ind.hasRatingParams ?? (
                                      (ind.weight ?? 0) > 0 ||
                                      !!ind.closed ||
                                      !!ind.zato ||
                                      (ind.closedForOmsuIds && ind.closedForOmsuIds.length > 0) ||
                                      !!ind.calcException ||
                                      !!ind.ratingFormula
                                    ),
                                    ratingFormula: ind.ratingFormula || '',
                                    ratingFormulaZato: ind.ratingFormulaZato || '',
                                  });
                                }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => deleteInd(ind.id, ind.name)} title="Деактивировать">
                                  <PowerOff className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

      </Tabs>

      <Dialog open={!!editInd} onOpenChange={(v) => !v && setEditInd(null)}>
        <DialogContent className="w-[70vw] max-w-[70vw] sm:max-w-[70vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Новый показатель' : 'Редактирование показателя'}</DialogTitle>
          </DialogHeader>
          {editInd && (
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>№ *</Label>
                <Input
                  className="col-span-3 bg-slate-50 text-muted-foreground"
                  disabled
                  value={autoIndicatorNum(state.indicators, state.directions, treeFilter.actualDate || '', {
                    id: isNew ? undefined : editInd.id,
                    parentId: editInd.parentId,
                    directionId: editInd.directionId,
                  })}
                />
                <p className="col-span-4 -mt-1 text-[10px] text-muted-foreground">
                  Определяется автоматически по позиции показателя (порядок меняется перетаскиванием строк в списке)
                </p>
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>Название *</Label>
                <div className="col-span-3 flex items-center gap-3">
                  <Input
                    className="flex-1"
                    placeholder="Введите наименование показателя..."
                    value={editInd.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditInd({
                        ...editInd,
                        name: val,
                        isReference: val.startsWith('Справочно: ') ? true : false,
                      });
                    }}
                  />
                  <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer whitespace-nowrap select-none">
                    <input
                      type="checkbox"
                      id="is-reference-checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={!!(editInd.isReference || editInd.name.startsWith('Справочно: '))}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        let newName = editInd.name;
                        if (checked) {
                          if (!newName.startsWith('Справочно: ')) {
                            newName = `Справочно: ${newName}`;
                          }
                        } else {
                          if (newName.startsWith('Справочно: ')) {
                            newName = newName.replace(/^Справочно:\s*/, '');
                          }
                        }
                        setEditInd({ ...editInd, isReference: checked, name: newName });
                      }}
                    />
                    <span>Справочно</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>Раздел показателя *</Label>
                <Select value={editInd.directionId} onValueChange={(v) => setEditInd({ ...editInd, directionId: v })}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {state.directions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-2">
                <Label>ЦИО *</Label>
                <Select value={editInd.cioId} onValueChange={(v) => setEditInd({ ...editInd, cioId: v })}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {state.directions.find(d => d.id === editInd.directionId)?.cioIds?.map((cId) => {
                      const c = state.cios.find(x => x.id === cId);
                      return c ? <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem> : null;
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-2">
                <Label>Актуальность с *</Label>
                <Input type="date" className="col-span-3" value={(editInd.actualFrom || '').substring(0, 10)} onChange={(e) => setEditInd({ ...editInd, actualFrom: `${e.target.value}T00:00:00.000Z` })} />
              </div>

              <div className="grid grid-cols-4 items-center gap-2">
                <Label>Родительский показатель</Label>
                <Select value={editInd.parentId || 'none'} onValueChange={(v) => setEditInd({ ...editInd, parentId: v === 'none' ? null : v })}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Нет (верхний уровень)</SelectItem>
                    {state.indicators
                      .filter(i => i.id !== editInd.id && !isDescendant(state.indicators, editInd.id, i.id))
                      .map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.num}. {i.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-2">
                <Label>Ед. изм.</Label>
                <Select value={editInd.unit || undefined} onValueChange={(v) => setEditInd({ ...editInd, unit: v })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Выберите единицу измерения" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueUnits.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 gap-2 border-t pt-3 mt-1">
                <Label className="mt-2 text-sm font-semibold">Формулы</Label>
                <div className="col-span-3 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Формула базового прогноза</Label>
                    <Input className="font-mono text-xs" value={editInd.formula || ''} onChange={(e) => setEditInd({ ...editInd, formula: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Коэффициент консервативного прогноза</Label>
                    <Input className="font-mono text-xs" value={editInd.consCoeff || ''} onChange={(e) => setEditInd({ ...editInd, consCoeff: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Формула отчёта</Label>
                    <Input className="font-mono text-xs" value={editInd.formulaReport || ''} onChange={(e) => setEditInd({ ...editInd, formulaReport: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Формула оценки</Label>
                    <Input className="font-mono text-xs" value={editInd.formulaEstimate || ''} onChange={(e) => setEditInd({ ...editInd, formulaEstimate: e.target.value })} />
                  </div>
                </div>
              </div>

              <>
                <div className="border-t pt-3 mt-1">
                  <span className="text-sm font-semibold text-slate-900">Параметры рейтинга</span>
                </div>

                <div className="grid gap-3 text-sm">
                  <div className="grid grid-cols-4 items-center gap-2">
                    <Label className="col-span-3">Закрыть показатель от ввода и согласования</Label>
                    <div className="col-span-1 flex justify-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={!!editInd.closed}
                        onChange={(e) => setEditInd({ ...editInd, closed: e.target.checked })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-2">
                    <Label>Оптимум *</Label>
                    <Select
                      value={editInd.optimum}
                      onValueChange={(v: 'max' | 'min') => setEditInd({ ...editInd, optimum: v })}
                    >
                      <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="max">Максимум (max)</SelectItem>
                        <SelectItem value="min">Минимум (min)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-2">
                    <Label>Вес (раздельного показателя) *</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      className="col-span-3"
                      value={editInd.weight ?? 0}
                      onChange={(e) => setEditInd({ ...editInd, weight: e.target.value === '' ? 0 : Number(e.target.value) })}
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-2">
                    <Label className="col-span-3">ЗАТО</Label>
                    <div className="col-span-1 flex justify-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={!!editInd.zato}
                        onChange={(e) => setEditInd({ ...editInd, zato: e.target.checked })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-start gap-2">
                    <Label className="pt-2">Закрыть для ОМСУ</Label>
                    <div className="col-span-3 space-y-1">
                      <select
                        multiple
                        className="w-full h-32 p-2 text-xs border rounded-md"
                        value={editInd.closedForOmsuIds || []}
                        onChange={(e) => setEditInd({ ...editInd, closedForOmsuIds: Array.from(e.target.selectedOptions).map(o => o.value) })}
                      >
                        {state.omsus.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                      <p className="text-[10px] text-muted-foreground">
                        Зажмите Ctrl (Cmd) для выбора нескольких элементов. Выбранные ОМСУ не смогут вводить значения по данному показателю.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-2">
                    <Label>Исключения расчёта</Label>
                    <Input
                      className="col-span-3"
                      placeholder="Дополнительное правило присвоения баллов или мест"
                      value={editInd.calcException || ''}
                      onChange={(e) => setEditInd({ ...editInd, calcException: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-2">
                    <label className="col-span-3 inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="has-rating-params-checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={!!editInd.hasRatingParams}
                        onChange={(e) => setEditInd({ ...editInd, hasRatingParams: e.target.checked })}
                      />
                      <span className="text-sm font-medium text-slate-900">Отображать показатель в рейтинге</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-2">
                    <Label>Формула рейтинга</Label>
                    <Input
                      disabled={!editInd.hasRatingParams}
                      className="col-span-3 font-mono text-xs disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-muted-foreground"
                      placeholder="Формула расчёта рейтинга"
                      value={editInd.ratingFormula || ''}
                      onChange={(e) => setEditInd({ ...editInd, ratingFormula: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-2">
                    <Label>Формула рейтинга ЗАТО</Label>
                    <Input
                      disabled={!editInd.hasRatingParams}
                      className="col-span-3 font-mono text-xs disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-muted-foreground"
                      placeholder="Формула расчёта рейтинга для ЗАТО"
                      value={editInd.ratingFormulaZato || ''}
                      onChange={(e) => setEditInd({ ...editInd, ratingFormulaZato: e.target.value })}
                    />
                  </div>
                </div>
              </>

            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInd(null)}>Отмена</Button>
            <Button onClick={save}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editDir} onOpenChange={(v) => !v && setEditDir(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Новый раздел показателя</DialogTitle>
          </DialogHeader>
          {editDir && (
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>№</Label>
                <Input className="col-span-3" value={editDir.num} onChange={(e) => setEditDir({ ...editDir, num: e.target.value })} />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>Название *</Label>
                <Input className="col-span-3" value={editDir.name} onChange={(e) => setEditDir({ ...editDir, name: e.target.value })} />
              </div>

            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDir(null)}>Отмена</Button>
            <Button onClick={saveDir}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модалка подтверждения удаления */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Деактивация {deleteConfirm?.type === 'dir' ? 'раздела' : 'показателя'}</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-slate-700">
            Вы действительно хотите деактивировать {deleteConfirm?.type === 'dir' ? 'раздел' : 'показатель'} <strong>{deleteConfirm?.name}</strong>?
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Отмена</Button>
            <Button variant="destructive" onClick={() => {
              if (deleteConfirm?.type === 'dir') {
                const d = state.directions.find(x => x.id === deleteConfirm.id);
                if (d) dispatch({ type: 'UPDATE_DIRECTION', direction: { ...d, actualTo: new Date().toISOString() } });
              } else if (deleteConfirm?.type === 'ind') {
                const i = state.indicators.find(x => x.id === deleteConfirm.id);
                if (i) dispatch({ type: 'UPDATE_INDICATOR', indicator: { ...i, actualTo: new Date().toISOString() } });
              }
              setDeleteConfirm(null);
            }}>Деактивировать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
