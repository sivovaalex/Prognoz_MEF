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
import { Plus, Pencil, Settings2, Settings, PowerOff, LineChart, Maximize2, Minimize2, X, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CollectionFormSettings } from '@/components/CollectionFormSettings';

export function Setup({ block = 'mun' }: { block?: string }) {
  const { state, dispatch } = useStore();
  const [editInd, setEditInd] = useState<Indicator | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [editDir, setEditDir] = useState<{ id?: string, num: string, name: string, cioIds: string[], actualFrom: string, actualTo?: string | null } | null>(null);
  const [treeFilter, setTreeFilter] = useState<TreeFilter>({ ...EMPTY_TREE_FILTER, actualDate: new Date().toISOString().split('T')[0] });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dirError, setDirError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [indErrors, setIndErrors] = useState<{ num?: string; name?: string }>({});

  // Drag-and-drop: перестановка показателей с автоматической перенумерацией
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<{ targetId: string; before: boolean } | null>(null);
  const [topDropDir, setTopDropDir] = useState<string | null>(null);

  const visible = visibleTree(state.indicators, collapsed, treeFilter);
  const parents = chevronParents(state.indicators);
  const toggleNode = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));
  const uniqueUnits = Array.from(
    new Set([
      ...(state.units || []).map((u) => u.name),
      ...state.indicators.map((i) => i.unit),
      '%',
      'человек',
      'рубль',
      'млн. рублей',
      'тыс. кв. м общей площади',
      'единица',
      'число родившихся на 1000 человек населения',
      'на 1000 человек населения',
      'процент к предыдущему году',
    ].filter((u) => typeof u === 'string' && u.trim().length > 0))
  ).sort();

  const openNew = () => {
    setIsNew(true);
    setIsFullscreen(false);
    setIndErrors({});
    const autoNum = autoIndicatorNum(state.indicators, state.directions, treeFilter.actualDate || '', {
      parentId: null,
      directionId: state.directions[0]?.id || '',
    });
    setEditInd({
      id: `i${Date.now()}`,
      num: autoNum || '',
      name: '',
      directionId: state.directions[0]?.id || '',
      cioId: state.cios[0]?.id || '',
      unit: '%',
      optimum: 'max',
      weight: 1,
      weightZato: 1,
      order: undefined,
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
      ratingValueFormula: '',
      ratingFormula: '',
      ratingFormulaZato: '',
    });
  };

  const openNewDir = () => {
    setDirError(null);
    setEditDir({ num: '', name: '', cioIds: state.cios[0] ? [state.cios[0].id] : [], actualFrom: new Date().toISOString().split('T')[0] });
  };

  const save = () => {
    if (!editInd) return;
    const errors: { num?: string; name?: string } = {};
    if (!editInd.num || !editInd.num.trim()) {
      errors.num = 'Укажите числовой ключ';
    }
    if (!editInd.name || !editInd.name.trim()) {
      errors.name = 'Укажите наименование';
    }
    if (Object.keys(errors).length > 0) {
      setIndErrors(errors);
      return;
    }
    if (editInd.hasRatingParams) {
      const w = Number(editInd.weight);
      if (Number.isNaN(w) || w < 0 || w > 100) {
        alert('Вес показателя (Общий рейтинг) должен быть числом от 0 до 100');
        return;
      }
      if (editInd.zato && editInd.weightZato !== undefined) {
        const wz = Number(editInd.weightZato);
        if (Number.isNaN(wz) || wz < 0 || wz > 100) {
          alert('Вес в рейтинге ЗАТО должен быть числом от 0 до 100');
          return;
        }
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
    setIsFullscreen(false);
    setIndErrors({});
  };

  const saveDir = () => {
    if (!editDir || !editDir.name.trim()) return;
    const cleanName = editDir.name.trim();
    const isDuplicate = state.directions.some(
      (d) => d.id !== editDir.id && d.name.replace(/^[0-9.]+\s*/, '').toLowerCase() === cleanName.toLowerCase() && !d.actualTo
    );
    if (isDuplicate) {
      setDirError('Имя направления уже существует');
      return;
    }
    const nameStr = editDir.num ? `${editDir.num}. ${cleanName}` : cleanName;
    const cIds = editDir.cioIds.length > 0 ? editDir.cioIds : (state.cios[0] ? [state.cios[0].id] : []);
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
          cioIds: cIds,
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
          cioIds: cIds,
          actualFrom: editDir.actualFrom,
          actualTo: null
        }
      });
    }
    setEditDir(null);
    setDirError(null);
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
          <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-1" /> Настройки
          </Button>
          <Button variant="outline" onClick={openNewDir}>
            <Plus className="h-4 w-4 mr-1" /> Добавить раздел показателя
          </Button>
          <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-1" /> Добавить показатель
          </Button>
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
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
                            setIsNew(false);
                            setEditInd({
                              ...ind,
                              order: ind.order,
                              weightZato: ind.weightZato ?? ind.weight ?? 1,
                              isReference: ind.isReference ?? ind.name.startsWith('Справочно: '),
                              hasRatingParams: ind.hasRatingParams ?? (
                                (ind.weight ?? 0) > 0 ||
                                !!ind.closed ||
                                !!ind.zato ||
                                (ind.closedForOmsuIds && ind.closedForOmsuIds.length > 0) ||
                                !!ind.calcException ||
                                !!ind.ratingFormula
                              ),
                              ratingValueFormula: ind.ratingValueFormula || '',
                              ratingFormula: ind.ratingFormula || '',
                              ratingFormulaZato: ind.ratingFormulaZato || '',
                            });
                          }}
                          className={`border-b ${ind.isGroup ? 'bg-slate-50/80' : 'hover:bg-slate-50 cursor-pointer'} ${
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
                                    order: ind.order,
                              weightZato: ind.weightZato ?? ind.weight ?? 1,
                              isReference: ind.isReference ?? ind.name.startsWith('Справочно: '),
                                    hasRatingParams: ind.hasRatingParams ?? (
                                      (ind.weight ?? 0) > 0 ||
                                      !!ind.closed ||
                                      !!ind.zato ||
                                      (ind.closedForOmsuIds && ind.closedForOmsuIds.length > 0) ||
                                      !!ind.calcException ||
                                      !!ind.ratingFormula
                                    ),
                                    ratingValueFormula: ind.ratingValueFormula || '',
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

      <Dialog
        open={!!editInd}
        onOpenChange={(v) => {
          if (!v) {
            setEditInd(null);
            setIsFullscreen(false);
            setIndErrors({});
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className={cn(
            "p-0 gap-0 transition-all duration-200 overflow-hidden flex flex-col bg-white",
            isFullscreen
              ? "!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none !max-h-none !rounded-none"
              : "w-[850px] max-w-[95vw] h-[90vh] max-h-[90vh] sm:max-w-[850px] rounded-2xl shadow-2xl border border-slate-200"
          )}
        >
          <DialogTitle className="sr-only">
            {isNew ? 'Новый показатель' : 'Редактирование показателя'}
          </DialogTitle>

          {/* Шапка модального окна */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50/80 border border-blue-100 flex items-center justify-center shrink-0">
                <LineChart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 leading-tight">
                  {isNew ? 'Новый показатель' : 'Редактирование показателя'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Заполните сведения о показателе и сохраните изменения
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-lg hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title={isFullscreen ? 'Свернуть' : 'Развернуть на весь экран'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => { setEditInd(null); setIsFullscreen(false); setIndErrors({}); }}
                className="p-1.5 rounded-lg hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Тело модального окна со скроллом */}
          {editInd && (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* СЕКЦИЯ 1: Основные сведения */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Основные сведения</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Наименование, раздел и привязка показателя</p>
                </div>

                {/* * Ключ */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">* Ключ:</Label>
                  <Input
                    placeholder="Введите числовой ключ..."
                    value={editInd.num}
                    onChange={(e) => {
                      setEditInd({ ...editInd, num: e.target.value });
                      if (indErrors.num) setIndErrors(p => ({ ...p, num: undefined }));
                    }}
                    className={cn(
                      "h-9 text-sm rounded-lg transition-colors",
                      (!editInd.num || indErrors.num)
                        ? "border-rose-300 focus-visible:ring-rose-400 focus-visible:border-rose-400"
                        : "border-slate-200"
                    )}
                  />
                  {indErrors.num && <p className="text-[11px] text-rose-500">{indErrors.num}</p>}
                </div>

                {/* * Наименование */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">* Наименование:</Label>
                  <Input
                    placeholder="Введите наименование..."
                    value={editInd.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditInd({
                        ...editInd,
                        name: val,
                        isReference: val.startsWith('Справочно: ') ? true : editInd.isReference,
                      });
                      if (indErrors.name) setIndErrors(p => ({ ...p, name: undefined }));
                    }}
                    className={cn(
                      "h-9 text-sm rounded-lg border-slate-200",
                      indErrors.name && "border-rose-300 focus-visible:ring-rose-400"
                    )}
                  />
                  {indErrors.name && <p className="text-[11px] text-rose-500">{indErrors.name}</p>}
                </div>

                {/* Сетка: Раздел показателя & ЦИО */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">* Раздел показателя:</Label>
                    <Select
                      value={editInd.directionId}
                      onValueChange={(v) => setEditInd({ ...editInd, directionId: v })}
                    >
                      <SelectTrigger className="h-9 text-sm rounded-lg border-slate-200">
                        <SelectValue placeholder="Выберите раздел..." />
                      </SelectTrigger>
                      <SelectContent>
                        {state.directions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">* ЦИО:</Label>
                    <Select
                      value={editInd.cioId}
                      onValueChange={(v) => setEditInd({ ...editInd, cioId: v })}
                    >
                      <SelectTrigger className="h-9 text-sm rounded-lg border-slate-200">
                        <SelectValue placeholder="Выберите ЦИО..." />
                      </SelectTrigger>
                      <SelectContent>
                        {state.cios.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.short})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Сетка: Ед. изм. & Родительский показатель */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">* Ед. изм.:</Label>
                    <Select
                      value={editInd.unit || undefined}
                      onValueChange={(v) => setEditInd({ ...editInd, unit: v })}
                    >
                      <SelectTrigger className="h-9 text-sm rounded-lg border-slate-200">
                        <SelectValue placeholder="Выберите единицу измерения..." />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueUnits.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Родительский показатель:</Label>
                    <Select
                      value={editInd.parentId || 'none'}
                      onValueChange={(v) => setEditInd({ ...editInd, parentId: v === 'none' ? null : v })}
                    >
                      <SelectTrigger className="h-9 text-sm rounded-lg border-slate-200">
                        <SelectValue placeholder="Выберите родителя..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Выберите родителя...</SelectItem>
                        {state.indicators
                          .filter(i => i.id !== editInd.id && !isDescendant(state.indicators, editInd.id, i.id))
                          .map(i => (
                            <SelectItem key={i.id} value={i.id}>{i.num}. {i.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Порядковый номер внутри группы */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Порядковый номер внутри группы:</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="Введите порядковый номер..."
                      value={editInd.order ?? ''}
                      onChange={(e) => setEditInd({
                        ...editInd,
                        order: e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                      })}
                      className="h-9 text-sm rounded-lg border-slate-200 pr-8"
                    />
                    <div className="absolute right-0 top-0 bottom-0 w-7 flex flex-col border-l border-slate-200 rounded-r-lg overflow-hidden bg-slate-50">
                      <button
                        type="button"
                        className="flex-1 flex items-center justify-center hover:bg-slate-200 text-slate-600 border-b border-slate-200 transition-colors"
                        onClick={() => setEditInd({ ...editInd, order: (editInd.order ?? 0) + 1 })}
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        className="flex-1 flex items-center justify-center hover:bg-slate-200 text-slate-600 transition-colors"
                        onClick={() => setEditInd({ ...editInd, order: Math.max(0, (editInd.order ?? 0) - 1) })}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Чекбокс «Справочный» */}
                <div className="rounded-xl border border-slate-100 bg-[#fbfcfd] p-3">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={!!(editInd.isReference || editInd.name.startsWith('Справочно: '))}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        let newName = editInd.name;
                        if (checked) {
                          if (!newName.startsWith('Справочно: ')) newName = 'Справочно: ' + newName;
                        } else {
                          if (newName.startsWith('Справочно: ')) newName = newName.replace(/^Справочно:s*/, '');
                        }
                        setEditInd({ ...editInd, isReference: checked, name: newName });
                      }}
                    />
                    <span>Справочный</span>
                  </label>
                </div>
              </div>

              {/* СЕКЦИЯ 2: Формулы */}
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Формулы</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Расчётные формулы прогноза, отчёта и оценки</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Формула (базового) прогноза/плана:</Label>
                    <div className="relative">
                      <Input
                        placeholder="Формула расчета..."
                        value={editInd.formula || ''}
                        onChange={(e) => setEditInd({ ...editInd, formula: e.target.value })}
                        className="h-9 text-xs font-mono rounded-lg border-slate-200 pr-9"
                      />
                      <Pencil className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Формула консервативного прогноза:</Label>
                    <div className="relative">
                      <Input
                        placeholder="Формула расчета..."
                        value={editInd.consCoeff || ''}
                        onChange={(e) => setEditInd({ ...editInd, consCoeff: e.target.value })}
                        className="h-9 text-xs font-mono rounded-lg border-slate-200 pr-9"
                      />
                      <Pencil className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Формула отчета:</Label>
                  <div className="relative">
                    <Input
                      placeholder="Формула расчета..."
                      value={editInd.formulaReport || ''}
                      onChange={(e) => setEditInd({ ...editInd, formulaReport: e.target.value })}
                      className="h-9 text-xs font-mono rounded-lg border-slate-200 pr-9"
                    />
                    <Pencil className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Формула оценки:</Label>
                  <div className="relative">
                    <Input
                      placeholder="Формула расчета..."
                      value={editInd.formulaEstimate || ''}
                      onChange={(e) => setEditInd({ ...editInd, formulaEstimate: e.target.value })}
                      className="h-9 text-xs font-mono rounded-lg border-slate-200 pr-9"
                    />
                    <Pencil className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* СЕКЦИЯ 3: Параметры рейтинга */}
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Параметры рейтинга</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Оптимум, исключения и ограничения по ОМСУ</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditInd({ ...editInd, hasRatingParams: !editInd.hasRatingParams })}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 border transition-all cursor-pointer select-none",
                      editInd.hasRatingParams
                        ? "border-amber-300 bg-[#fffbeb] text-slate-800 shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span className={cn(
                      "w-4 h-4 rounded flex items-center justify-center border text-[10px]",
                      editInd.hasRatingParams ? "bg-amber-400 border-amber-500 text-white" : "border-slate-300 bg-white"
                    )}>
                      {editInd.hasRatingParams && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <span>Показатель для рейтинга</span>
                  </button>
                </div>

                {!editInd.hasRatingParams ? (
                  <div className="rounded-xl border border-slate-100 bg-[#f8fafc] p-4 text-xs text-slate-600">
                    Включите «Показатель для рейтинга», чтобы задать оптимум, исключения и ограничения по ОМСУ.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Оптимум и Закрыть для ОМСУ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-700">Оптимум:</Label>
                        <Select
                          value={editInd.optimum}
                          onValueChange={(v: 'max' | 'min') => setEditInd({ ...editInd, optimum: v })}
                        >
                          <SelectTrigger className="h-9 text-sm rounded-lg border-slate-200">
                            <SelectValue placeholder="Выберите..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="max">Максимум (max)</SelectItem>
                            <SelectItem value="min">Минимум (min)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-700">Закрыть для ОМСУ:</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs hover:bg-slate-50 transition-colors text-left"
                            >
                              <span className={(!editInd.closedForOmsuIds || editInd.closedForOmsuIds.length === 0) ? "text-slate-400 text-xs" : "text-slate-800 text-xs font-medium truncate"}>
                                {(!editInd.closedForOmsuIds || editInd.closedForOmsuIds.length === 0)
                                  ? "Выберите..."
                                  : ('Выбрано ОМСУ: ' + editInd.closedForOmsuIds.length)}
                              </span>
                              <ChevronDown className="h-4 w-4 opacity-50 shrink-0 text-slate-500" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-2 max-h-60 overflow-y-auto" align="start">
                            <div className="space-y-1">
                              <div className="text-[11px] font-semibold text-slate-500 px-1.5 py-1 border-b">
                                Выберите ОМСУ, которым закрыт ввод:
                              </div>
                              {state.omsus.map((o) => {
                                const isChecked = (editInd.closedForOmsuIds || []).includes(o.id);
                                return (
                                  <label key={o.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded text-xs cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const cur = editInd.closedForOmsuIds || [];
                                        const next = e.target.checked ? [...cur, o.id] : cur.filter(id => id !== o.id);
                                        setEditInd({ ...editInd, closedForOmsuIds: next });
                                      }}
                                    />
                                    <span className="truncate">{o.name}</span>
                                    {o.isZato && <Badge variant="outline" className="ml-auto text-[9px] px-1 py-0 border-amber-300 text-amber-700 bg-amber-50">ЗАТО</Badge>}
                                  </label>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* Раздельные веса: Общий рейтинг и Рейтинг ЗАТО */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-700">
                          Вес показателя (Общий рейтинг) *
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          placeholder="1.0"
                          value={editInd.weight ?? ''}
                          onChange={(e) => setEditInd({ ...editInd, weight: e.target.value === '' ? 0 : Number(e.target.value) })}
                          className="h-9 text-sm rounded-lg border-slate-200"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className={cn("text-xs font-medium", editInd.zato ? "text-slate-700" : "text-slate-400")}>
                          Вес в рейтинге ЗАТО {editInd.zato ? '*' : '(при включении ЗАТО)'}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          disabled={!editInd.zato}
                          placeholder={editInd.zato ? "1.0" : "Включите отметку ЗАТО ниже"}
                          value={editInd.weightZato ?? (editInd.zato ? editInd.weight ?? 1 : '')}
                          onChange={(e) => setEditInd({ ...editInd, weightZato: e.target.value === '' ? 0 : Number(e.target.value) })}
                          className={cn("h-9 text-sm rounded-lg border-slate-200", !editInd.zato && "bg-slate-50 text-slate-400 cursor-not-allowed")}
                        />
                      </div>
                    </div>

                    {/* Формула значения рейтинга */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-700">Формула значения рейтинга:</Label>
                      <div className="relative">
                        <Input
                          placeholder="Формула расчета значения рейтинга..."
                          value={editInd.ratingValueFormula || ''}
                          onChange={(e) => setEditInd({ ...editInd, ratingValueFormula: e.target.value })}
                          className="h-9 text-xs font-mono rounded-lg border-slate-200 pr-9"
                        />
                        <Pencil className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                      </div>
                    </div>

                    {/* Формулы места по значению рейтинга: Общий и ЗАТО */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-700">Формула места по значению рейтинга:</Label>
                        <div className="relative">
                          <Input
                            placeholder="Формула расчета места по значению рейтинга..."
                            value={editInd.ratingFormula || ''}
                            onChange={(e) => setEditInd({ ...editInd, ratingFormula: e.target.value })}
                            className="h-9 text-xs font-mono rounded-lg border-slate-200 pr-9"
                          />
                          <Pencil className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className={cn("text-xs font-medium", editInd.zato ? "text-slate-700" : "text-slate-400")}>
                          Формула Места по значению рейтинга ЗАТО:
                        </Label>
                        <div className="relative">
                          <Input
                            disabled={!editInd.zato}
                            placeholder={editInd.zato ? "Формула расчета места для ЗАТО..." : "Включите отметку ЗАТО ниже"}
                            value={editInd.ratingFormulaZato || ''}
                            onChange={(e) => setEditInd({ ...editInd, ratingFormulaZato: e.target.value })}
                            className={cn(
                              "h-9 text-xs font-mono rounded-lg border-slate-200 pr-9",
                              !editInd.zato && "bg-slate-50 text-slate-400 cursor-not-allowed"
                            )}
                          />
                          <Pencil className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Исключения расчета (единое для ОМСУ и ЗАТО) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-700">Исключения расчета:</Label>
                      <div className="relative">
                        <Input
                          placeholder="Дополнительное правило присвоения баллов и мест..."
                          value={editInd.calcException || ''}
                          onChange={(e) => setEditInd({ ...editInd, calcException: e.target.value })}
                          className="h-9 text-xs rounded-lg border-slate-200 pr-9"
                        />
                        <Pencil className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                      </div>
                    </div>

                    {/* Чекбоксы: Закрыть показатель от ввода согласования & ЗАТО */}
                    <div className="rounded-xl border border-slate-100 bg-[#fbfcfd] p-3 flex flex-wrap items-center gap-6">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={!!editInd.closed}
                          onChange={(e) => setEditInd({ ...editInd, closed: e.target.checked })}
                        />
                        <span>Закрыть показатель от ввода согласования</span>
                      </label>

                      <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={!!editInd.zato}
                          onChange={(e) => {
                            const isZato = e.target.checked;
                            setEditInd({
                              ...editInd,
                              zato: isZato,
                              weightZato: isZato ? (editInd.weightZato ?? editInd.weight ?? 1) : editInd.weightZato,
                            });
                          }}
                        />
                        <span>ЗАТО (показатель виден только ОМСУ с отметкой ЗАТО)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Подвал модального окна */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-white shrink-0">
            <Button
              onClick={save}
              className="bg-[#9bb0e8] hover:bg-[#889fdc] text-white px-5 rounded-lg text-sm font-medium shadow-xs"
            >
              Сохранить
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setEditInd(null); setIsFullscreen(false); setIndErrors({}); }}
              className="text-slate-600 hover:text-slate-800 text-sm font-normal"
            >
              Отмена
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      

      <Dialog open={!!editDir} onOpenChange={(v) => { if (!v) { setEditDir(null); setDirError(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editDir?.id ? 'Редактирование раздела' : 'Новый раздел показателя'}</DialogTitle>
          </DialogHeader>
          {editDir && (
            <div className="grid gap-3 text-sm">
              {dirError && (
                <div className="p-2 text-xs bg-red-50 text-red-600 border border-red-200 rounded">
                  {dirError}
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>№</Label>
                <Input className="col-span-3" value={editDir.num} onChange={(e) => setEditDir({ ...editDir, num: e.target.value })} />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>Название *</Label>
                <Input className="col-span-3" value={editDir.name} onChange={(e) => { setEditDir({ ...editDir, name: e.target.value }); setDirError(null); }} />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>ЦИО *</Label>
                <Select
                  value={editDir.cioIds?.[0] || state.cios[0]?.id}
                  onValueChange={(v) => setEditDir({ ...editDir, cioIds: [v] })}
                >
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Выберите ЦИО" /></SelectTrigger>
                  <SelectContent>
                    {state.cios.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.short})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDir(null); setDirError(null); }}>Отмена</Button>
            <Button onClick={saveDir}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модальное окно настроек формы сбора (роли/участники) */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Настройки формы сбора и прав доступа</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <CollectionFormSettings block={block || 'mun'} />
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSettingsOpen(false)}>Закрыть</Button>
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
