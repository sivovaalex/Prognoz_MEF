import { useState, useEffect } from 'react';
import type { SysUser } from '@/lib/types';
import { CIOS, MUNICIPALITIES } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface UserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Partial<SysUser> | null;
  onSave: (u: SysUser) => void;
}

const CIO_BLOCKS = [
  { id: 'mun', name: 'Муниципальный прогноз' },
  { id: 'obl', name: 'Областной прогноз' },
  { id: 'params', name: 'Параметры СЭР' },
  { id: 'form2p', name: 'Форма 2П' },
  { id: 'long_term', name: 'Долгосрочный прогноз' },
];

function MultiSelect({ options, selected, onChange, placeholder }: any) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start h-auto min-h-9 text-left font-normal py-1 px-2 border-slate-300">
          {selected.length === 0 && <span className="text-muted-foreground text-xs">{placeholder}</span>}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5 mb-0.5">
              {selected.map((id: string) => {
                const opt = options.find((o: any) => o.id === id);
                return <Badge variant="secondary" key={id} className="text-[10px] font-normal rounded px-1.5 py-0">{opt?.name || id}</Badge>;
              })}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 shadow-lg" align="start">
        <div className="max-h-[300px] overflow-y-auto flex flex-col p-1">
          {options.map((o: any) => (
            <label key={o.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 rounded cursor-pointer text-xs">
              <input 
                type="checkbox" 
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={selected.includes(o.id)}
                onChange={(e) => {
                  if (e.target.checked) onChange([...selected, o.id]);
                  else onChange(selected.filter((x: string) => x !== o.id));
                }}
              />
              {o.name}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function UserModal({ open, onOpenChange, user, onSave }: UserModalProps) {
  const [tab, setTab] = useState<'info' | 'permissions'>('info');
  const [formData, setFormData] = useState<Partial<SysUser>>({});

  useEffect(() => {
    if (user) {
      setFormData(user);
      setTab('info');
    }
  }, [user]);

  const updateField = (field: keyof SysUser, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const perms = formData.perms || {
    isCio: false,
    isOmsu: false,
    isMef: false,
    isAdmin: false,
    cioIds: [],
    cioBlocks: [],
    omsuId: '',
  };

  const updatePerms = (updates: Partial<typeof perms>) => {
    setFormData(prev => ({ ...prev, perms: { ...perms, ...updates } }));
  };

  const setCio = (val: boolean) => {
    if (val) updatePerms({ isCio: true, isOmsu: false, isMef: false, isAdmin: false, omsuId: '' });
    else updatePerms({ isCio: false, cioIds: [], cioBlocks: [] });
  };
  
  const setOmsu = (val: boolean) => {
    if (val) updatePerms({ isOmsu: true, isCio: false, isMef: false, isAdmin: false, cioIds: [], cioBlocks: [] });
    else updatePerms({ isOmsu: false, omsuId: '' });
  };

  const setMef = (val: boolean) => {
    if (val) updatePerms({ isMef: true, isCio: false, isOmsu: false, cioIds: [], cioBlocks: [], omsuId: '' });
    else updatePerms({ isMef: false });
  };

  const setAdmin = (val: boolean) => {
    if (val) updatePerms({ isAdmin: true, isCio: false, isOmsu: false, cioIds: [], cioBlocks: [], omsuId: '' });
    else updatePerms({ isAdmin: false });
  };

  const isInfoValid = !!(formData.login && formData.lastName && formData.firstName && formData.email && formData.position);
  let isPermsValid = true;
  if (perms.isCio) {
    isPermsValid = perms.cioIds.length > 0 && perms.cioBlocks.length > 0;
  } else if (perms.isOmsu) {
    isPermsValid = !!perms.omsuId;
  }
  const isValid = isInfoValid && isPermsValid;

  const handleSave = () => {
    if (!isValid) return;
    onSave(formData as SysUser);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] w-[95vw] max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>{user?.id ? 'Редактировать пользователя' : 'Создать пользователя'}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 border-b mt-4">
          <button
            onClick={() => setTab('info')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${tab === 'info' ? 'border-[#1e5c8f] text-[#1e5c8f]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Информация о пользователе
          </button>
          <button
            onClick={() => setTab('permissions')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${tab === 'permissions' ? 'border-[#1e5c8f] text-[#1e5c8f]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Права пользователя
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {tab === 'info' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Личные данные</h4>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Имя пользователя (Login) *</Label>
                    <Input placeholder="Введите логин..." value={formData.login || ''} onChange={e => updateField('login', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Фамилия *</Label>
                    <Input placeholder="Введите фамилию..." value={formData.lastName || ''} onChange={e => updateField('lastName', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Имя *</Label>
                    <Input placeholder="Введите имя..." value={formData.firstName || ''} onChange={e => updateField('firstName', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Отчество</Label>
                    <Input placeholder="Введите отчество..." value={formData.middleName || ''} onChange={e => updateField('middleName', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Дата рождения</Label>
                    <Input type="date" value={formData.birthDate || ''} onChange={e => updateField('birthDate', e.target.value)} />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Контактная информация</h4>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Email *</Label>
                    <Input placeholder="Введите email..." value={formData.email || ''} onChange={e => updateField('email', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Телефон</Label>
                    <Input placeholder="Введите телефон..." value={formData.phone || ''} onChange={e => updateField('phone', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Телеграм</Label>
                    <Input placeholder="Введите Телеграм..." value={formData.telegram || ''} onChange={e => updateField('telegram', e.target.value)} />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Место работы</h4>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Город / ОМСУ</Label>
                    <Input placeholder="Введите город..." value={formData.city || ''} onChange={e => updateField('city', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Организация</Label>
                    <Input placeholder="Введите организацию..." value={formData.organization || ''} onChange={e => updateField('organization', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Ведомство</Label>
                    <Input placeholder="Введите ведомство..." value={formData.department || ''} onChange={e => updateField('department', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Должность *</Label>
                    <Input placeholder="Введите должность..." value={formData.position || ''} onChange={e => updateField('position', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'permissions' && (
            <div className="space-y-6">
              <div className="text-sm text-slate-500 mb-4">
                Настройте права пользователя. Обратите внимание, что права ЦИО, ОМСУ и группы (МЭФ + Администратор) являются взаимоисключающими.
              </div>
              <div className="border rounded-md overflow-hidden bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-3 w-16 text-center font-semibold text-slate-600">Вкл.</th>
                      <th className="p-3 text-left font-semibold text-slate-600 w-1/4">Настройка</th>
                      <th className="p-3 text-left font-semibold text-slate-600">Выбор / Значение</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {/* ЦИО */}
                    <tr className={perms.isCio ? 'bg-blue-50/30' : ''}>
                      <td className="p-3 text-center align-top">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mt-2 cursor-pointer"
                          checked={perms.isCio}
                          onChange={(e) => setCio(e.target.checked)}
                        />
                      </td>
                      <td className="p-3 align-top">
                        <div className="font-medium text-slate-700">Настройки ЦИО</div>
                        <div className="text-xs text-muted-foreground mt-1">Обязательно для сотрудников ЦИО</div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-4">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">ЦИО (множественный выбор) *</Label>
                            {perms.isCio ? (
                              <MultiSelect 
                                options={CIOS}
                                selected={perms.cioIds}
                                onChange={(ids: string[]) => updatePerms({ cioIds: ids })}
                                placeholder="Выберите ЦИО..."
                              />
                            ) : (
                              <div className="text-xs text-slate-400 py-1">—</div>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">ЦИО вкладка прогноза *</Label>
                            {perms.isCio ? (
                              <MultiSelect 
                                options={CIO_BLOCKS}
                                selected={perms.cioBlocks}
                                onChange={(ids: string[]) => updatePerms({ cioBlocks: ids })}
                                placeholder="Выберите вкладки..."
                              />
                            ) : (
                              <div className="text-xs text-slate-400 py-1">—</div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* ОМСУ */}
                    <tr className={perms.isOmsu ? 'bg-blue-50/30' : ''}>
                      <td className="p-3 text-center align-top">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mt-2 cursor-pointer"
                          checked={perms.isOmsu}
                          onChange={(e) => setOmsu(e.target.checked)}
                        />
                      </td>
                      <td className="p-3 align-top">
                        <div className="font-medium text-slate-700">Настройки ОМСУ</div>
                        <div className="text-xs text-muted-foreground mt-1">Только один ОМСУ для редактирования</div>
                      </td>
                      <td className="p-3">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">ОМСУ (одиночный выбор) *</Label>
                          {perms.isOmsu ? (
                            <Select value={perms.omsuId} onValueChange={(v) => updatePerms({ omsuId: v })}>
                              <SelectTrigger className="w-full h-9">
                                <SelectValue placeholder="Выберите ОМСУ..." />
                              </SelectTrigger>
                              <SelectContent>
                                {MUNICIPALITIES.map(m => (
                                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="text-xs text-slate-400 py-1">—</div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* МЭФ */}
                    <tr className={perms.isMef ? 'bg-blue-50/30' : ''}>
                      <td className="p-3 text-center align-top">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mt-1 cursor-pointer"
                          checked={perms.isMef}
                          onChange={(e) => setMef(e.target.checked)}
                        />
                      </td>
                      <td className="p-3 align-top">
                        <div className="font-medium text-slate-700">Настройка МЭФ</div>
                      </td>
                      <td className="p-3">
                        {perms.isMef ? (
                          <div className="text-xs text-slate-600">Активирует вкладки "Обзор сбора", "Управление"</div>
                        ) : (
                          <div className="text-xs text-slate-400">—</div>
                        )}
                      </td>
                    </tr>

                    {/* Администратор */}
                    <tr className={perms.isAdmin ? 'bg-blue-50/30' : ''}>
                      <td className="p-3 text-center align-top">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mt-1 cursor-pointer"
                          checked={perms.isAdmin}
                          onChange={(e) => setAdmin(e.target.checked)}
                        />
                      </td>
                      <td className="p-3 align-top">
                        <div className="font-medium text-slate-700">Настройки Администратора</div>
                      </td>
                      <td className="p-3">
                        {perms.isAdmin ? (
                          <div className="text-xs text-slate-600">Активирует блок "Администрирование" и вкладки настроек</div>
                        ) : (
                          <div className="text-xs text-slate-400">—</div>
                        )}
                      </td>
                    </tr>

                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 pt-4 border-t flex items-center justify-between">
          <div className="flex gap-2 mr-auto">
            <Button variant="link" size="sm" className="px-0 text-blue-600">Отправить ссылку восстановления пароля</Button>
            <Button variant="link" size="sm" className="px-0 text-blue-600">Зайти под пользователем</Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button onClick={handleSave} disabled={!isValid}>Сохранить</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
