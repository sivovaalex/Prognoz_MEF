import { useState } from 'react';
import { useStore } from '@/lib/store';

import type { Indicator } from '@/lib/types';
import { EMPTY_TREE_FILTER, chevronParents, visibleTree, type TreeFilter } from '@/lib/indTree';
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
import { Plus, Pencil, Settings2, Settings, PowerOff } from 'lucide-react';

const currentYear = new Date().getFullYear();
const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;

const repOptions: { value: string, label: string }[] = [];
for (let y = currentYear - 10; y <= currentYear; y++) {
  const prefix = y === currentYear ? '[Текущий год]' : `[Текущий год - ${currentYear - y} год]`;
  repOptions.push({ value: `y${y}`, label: `${prefix} (${y} год)` });
  for (let q = 1; q <= 4; q++) {
    if (y === currentYear && q > currentQuarter) break;
    repOptions.push({ value: `q${q}_${y}`, label: `${prefix} ${q} квартал (${q} квартал ${y} года)` });
  }
}
repOptions.reverse(); // Показываем свежие сверху

const estOptions: { value: string, label: string }[] = [{ value: 'none', label: 'Нет' }];
for (let y = currentYear - 1; y <= currentYear + 1; y++) {
  const prefix = y === currentYear ? '[Текущий год]' : y < currentYear ? '[Прошлый год]' : '[Следующий год]';
  estOptions.push({ value: `y${y}`, label: `${prefix} (${y} год)` });
  for (let q = 1; q <= 4; q++) {
    estOptions.push({ value: `q${q}_${y}`, label: `${prefix} ${q} квартал (${q} квартал ${y} года)` });
  }
}

const forOptions: { value: string, label: string }[] = [];
for (let y = currentYear; y <= currentYear + 15; y++) {
  const prefix = y === currentYear ? '[Текущий год]' : `[Текущий год + ${y - currentYear} год]`;
  forOptions.push({ value: `y${y}`, label: `${prefix} (${y} год)` });
  for (let q = 1; q <= 4; q++) {
    forOptions.push({ value: `q${q}_${y}`, label: `${prefix} ${q} квартал (${q} квартал ${y} года)` });
  }
}

export function Setup({ block }: { block: string }) {
  const { state, dispatch } = useStore();
  const [editInd, setEditInd] = useState<Indicator | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [editDir, setEditDir] = useState<{ id?: string, num: string, name: string, cioIds: string[], actualFrom: string, actualTo?: string | null } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<('omsu' | 'cio' | 'mef')[]>([]);
  const [settingsRep, setSettingsRep] = useState<string[]>([]);
  const [settingsEst, setSettingsEst] = useState<string>('none');
  const [settingsFor, setSettingsFor] = useState<string[]>([]);
  const [settingsNote, setSettingsNote] = useState<boolean>(false);
  const [treeFilter, setTreeFilter] = useState<TreeFilter>({ ...EMPTY_TREE_FILTER, actualDate: new Date().toISOString().split('T')[0] });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const visible = visibleTree(state.indicators, collapsed, treeFilter);
  const parents = chevronParents(state.indicators);
  const toggleNode = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));
  const uniqueUnits = Array.from(new Set(state.indicators.map((i) => i.unit).filter((u) => typeof u === 'string' && u.trim().length > 0))).sort();

  const openNew = () => {
    setIsNew(true);
    setEditInd({
      id: `i${Date.now()}`,
      num: `${state.indicators.length + 1}.1`,
      name: '',
      directionId: state.directions[0]?.id || '',
      cioId: state.cios[0]?.id || '',
      unit: '%',
      optimum: 'max',
      weight: 1,
      formula: '',
      consCoeff: '',
      level: 1,
      parentId: null,
      actualFrom: new Date().toISOString().split('T')[0],
    });
  };

  const openNewDir = () => {
    setEditDir({ num: '', name: '', cioIds: [], actualFrom: new Date().toISOString().split('T')[0] });
  };

  const save = () => {
    if (!editInd || !editInd.name.trim()) return;
    if (isNew) {
      dispatch({ type: 'ADD_INDICATOR', indicator: editInd });
    } else {
      const oldInd = state.indicators.find(i => i.id === editInd.id);
      if (oldInd) {
        dispatch({ type: 'UPDATE_INDICATOR', indicator: { ...oldInd, actualTo: editInd.actualFrom } });
      }
      dispatch({ type: 'ADD_INDICATOR', indicator: { ...editInd, id: 'i' + Date.now() } });
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

  const openSettings = () => {
    const s = state.blockSettings[block];
    setSettingsForm(s?.approvers || []);
    setSettingsRep(s?.reportingPeriods || []);
    setSettingsEst(s?.estimatedPeriods?.[0] || 'none');
    setSettingsFor(s?.forecastPeriods || []);
    setSettingsNote(s?.hasNote || false);
    setShowSettings(true);
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

  const saveSettings = () => {
    dispatch({
      type: 'UPDATE_BLOCK_SETTINGS',
      block,
      approvers: settingsForm,
      reportingPeriods: settingsRep,
      estimatedPeriods: [settingsEst],
      forecastPeriods: settingsFor,
      hasNote: settingsNote
    });
    setShowSettings(false);
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
          <Button variant="outline" onClick={openSettings}><Settings className="h-4 w-4 mr-1" /> Настройки формы сбора</Button>
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
                <Card key={d.id}>
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
                          <tr key={ind.id} className={`border-b ${ind.isGroup ? 'bg-slate-50/80' : 'hover:bg-slate-50'}`}>
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
                                <Button variant="ghost" size="icon" onClick={() => { setIsNew(false); setEditInd({ ...ind }); }}>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Новый показатель' : 'Редактирование показателя'}</DialogTitle>
          </DialogHeader>
          {editInd && (
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>№</Label>
                <Input className="col-span-3" value={editInd.num} onChange={(e) => setEditInd({ ...editInd, num: e.target.value })} />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>Название *</Label>
                <Input className="col-span-3" value={editInd.name} onChange={(e) => setEditInd({ ...editInd, name: e.target.value })} />
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
                    {state.indicators.filter(i => i.id !== editInd.id).map(i => (
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

              {state.campaign.name === 'Рейтинг ОМСУ' && (
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label>Оптимум *</Label>
                  <Select value={editInd.optimum} onValueChange={(v: 'max' | 'min') => setEditInd({ ...editInd, optimum: v })}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="max">Максимум (max)</SelectItem>
                      <SelectItem value="min">Минимум (min)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

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
      {/* Модалка настроек блока */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Настройки формы сбора</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6 py-4">
            <div className="space-y-2">
              <Label>Участники процесса</Label>
              <div className="flex flex-col gap-2 mt-2">
                {(['omsu', 'cio', 'mef'] as const).map(role => (
                  <div key={role} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`role-${role}`}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={settingsForm.includes(role)}
                      onChange={(e) => {
                        const c = e.target.checked;
                        if (c) setSettingsForm([...settingsForm, role]);
                        else setSettingsForm(settingsForm.filter(r => r !== role));
                      }}
                    />
                    <label htmlFor={`role-${role}`} className="text-sm font-medium leading-none">
                      {role === 'omsu' ? 'ОМСУ' : role === 'cio' ? 'ЦИО' : 'МЭФ'}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Отчётные периоды</Label>
              <select
                multiple
                className="w-full h-32 p-2 text-xs border rounded-md"
                value={settingsRep}
                onChange={(e) => setSettingsRep(Array.from(e.target.selectedOptions).map(o => o.value))}
              >
                {repOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">Зажмите Ctrl (или Cmd) для выбора нескольких элементов</p>
            </div>

            <div className="space-y-2">
              <Label>Оценочные периоды</Label>
              <Select value={settingsEst} onValueChange={setSettingsEst}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {estOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Прогнозные периоды</Label>
              <select
                multiple
                className="w-full h-32 p-2 text-xs border rounded-md"
                value={settingsFor}
                onChange={(e) => setSettingsFor(Array.from(e.target.selectedOptions).map(o => o.value))}
              >
                {forOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">Зажмите Ctrl (или Cmd) для выбора нескольких элементов</p>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="setting-note"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={settingsNote}
                  onChange={(e) => setSettingsNote(e.target.checked)}
                />
                <label htmlFor="setting-note" className="text-sm font-medium leading-none">
                  Добавить поле Примечание
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>Закрыть</Button>
            <Button onClick={saveSettings}>Сохранить настройки</Button>
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
