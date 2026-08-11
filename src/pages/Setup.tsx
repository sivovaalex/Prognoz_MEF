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
import { Plus, Pencil, Settings2, Settings } from 'lucide-react';

export function Setup({ block }: { block: string }) {
  const { state, dispatch } = useStore();
  const [editInd, setEditInd] = useState<Indicator | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [editDir, setEditDir] = useState<{ num: string, name: string, cioId: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<('omsu'|'cio'|'mef')[]>([]);
  const [treeFilter, setTreeFilter] = useState<TreeFilter>(EMPTY_TREE_FILTER);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const visible = visibleTree(state.indicators, collapsed, treeFilter);
  const parents = chevronParents(state.indicators);
  const toggleNode = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

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
    });
  };

  const openNewDir = () => {
    setEditDir({ num: '', name: '', cioId: state.cios[0]?.id || '' });
  };

  const save = () => {
    if (!editInd || !editInd.name.trim()) return;
    dispatch({ type: isNew ? 'ADD_INDICATOR' : 'UPDATE_INDICATOR', indicator: editInd });
    setEditInd(null);
  };

  const saveDir = () => {
    // В рамках прототипа просто закрываем окно (DIRECTIONS сейчас хранятся в константах)
    setEditDir(null);
  };

  const openSettings = () => {
    setSettingsForm(state.blockSettings[block]?.approvers || []);
    setShowSettings(true);
  };

  const saveSettings = () => {
    dispatch({ type: 'UPDATE_BLOCK_SETTINGS', block, approvers: settingsForm });
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
          <Button variant="outline" onClick={openSettings}><Settings className="h-4 w-4 mr-1" /> Настройки</Button>
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
            {state.directions.map((d) => {
              const inds = visible.filter((i) => i.directionId === d.id);
              if (!inds.length) return null;
              return (
                <Card key={d.id}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{d.name}</CardTitle>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditDir({ num: d.name.split('.')[0] || '', name: d.name, cioId: state.cios[0]?.id || '' })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
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
                              <Button variant="ghost" size="icon" onClick={() => { setIsNew(false); setEditInd({ ...ind }); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
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
                <Input className="col-span-3" value={editInd.unit} onChange={(e) => setEditInd({ ...editInd, unit: e.target.value })} />
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

              <div className="grid grid-cols-4 items-center gap-2">
                <Label>Формула баз. прогноза *</Label>
                <Input className="col-span-3 font-mono text-xs" value={editInd.formula} onChange={(e) => setEditInd({ ...editInd, formula: e.target.value })} />
              </div>

              <div className="grid grid-cols-4 items-center gap-2">
                <Label>Коэфф. консерв. прогноза *</Label>
                <Input className="col-span-3 font-mono text-xs" value={editInd.consCoeff || ''} onChange={(e) => setEditInd({ ...editInd, consCoeff: e.target.value })} />
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
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>ЦИО *</Label>
                <Select value={editDir.cioId} onValueChange={(v) => setEditDir({ ...editDir, cioId: v })}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {state.cios.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Настройки согласования</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Кто согласует</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>Отмена</Button>
            <Button onClick={saveSettings}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
