import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Save, Check } from 'lucide-react';

const currentYear = new Date().getFullYear();
const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;

const repOptions: { value: string; label: string }[] = [];
for (let y = currentYear - 10; y <= currentYear; y++) {
  const prefix = y === currentYear ? '[Текущий год]' : `[Текущий год - ${currentYear - y} год]`;
  repOptions.push({ value: `y${y}`, label: `${prefix} (${y} год)` });
  for (let q = 1; q <= 4; q++) {
    if (y === currentYear && q > currentQuarter) break;
    repOptions.push({ value: `q${q}_${y}`, label: `${prefix} ${q} квартал (${q} квартал ${y} года)` });
  }
}
repOptions.reverse(); // Показываем свежие сверху

const estOptions: { value: string; label: string }[] = [{ value: 'none', label: 'Нет' }];
for (let y = currentYear - 1; y <= currentYear + 1; y++) {
  const prefix = y === currentYear ? '[Текущий год]' : y < currentYear ? '[Прошлый год]' : '[Следующий год]';
  estOptions.push({ value: `y${y}`, label: `${prefix} (${y} год)` });
  for (let q = 1; q <= 4; q++) {
    estOptions.push({ value: `q${q}_${y}`, label: `${prefix} ${q} квартал (${q} квартал ${y} года)` });
  }
}

const forOptions: { value: string; label: string }[] = [];
for (let y = currentYear; y <= currentYear + 15; y++) {
  const prefix = y === currentYear ? '[Текущий год]' : `[Текущий год + ${y - currentYear} год]`;
  forOptions.push({ value: `y${y}`, label: `${prefix} (${y} год)` });
  for (let q = 1; q <= 4; q++) {
    forOptions.push({ value: `q${q}_${y}`, label: `${prefix} ${q} квартал (${q} квартал ${y} года)` });
  }
}

interface CollectionFormSettingsProps {
  block: string;
}

export function CollectionFormSettings({ block }: CollectionFormSettingsProps) {
  const { state, dispatch } = useStore();

  const [settingsForm, setSettingsForm] = useState<('omsu' | 'cio' | 'mef')[]>(['omsu', 'cio', 'mef']);
  const [settingsRep, setSettingsRep] = useState<string[]>([]);
  const [settingsEst, setSettingsEst] = useState<string>('none');
  const [settingsFor, setSettingsFor] = useState<string[]>([]);
  const [settingsNote, setSettingsNote] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    const s = state.blockSettings[block];
    setSettingsForm(s?.approvers || ['omsu', 'cio', 'mef']);
    setSettingsRep(s?.reportingPeriods || []);
    setSettingsEst(s?.estimatedPeriods?.[0] || 'none');
    setSettingsFor(s?.forecastPeriods || []);
    setSettingsNote(s?.hasNote || false);
    setSavedSuccess(false);
  }, [block, state.blockSettings]);

  const saveSettings = () => {
    dispatch({
      type: 'UPDATE_BLOCK_SETTINGS',
      block,
      approvers: settingsForm,
      reportingPeriods: settingsRep,
      estimatedPeriods: [settingsEst],
      forecastPeriods: settingsFor,
      hasNote: settingsNote,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 3500);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Настройки формы сбора</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Участники процесса */}
        <div className="space-y-2">
          <Label className="font-medium text-slate-700">Участники процесса</Label>
          <div className="flex flex-wrap gap-4 pt-1">
            {(['omsu', 'cio', 'mef'] as const).map((role) => (
              <label key={role} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id={`role-${block}-${role}`}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={settingsForm.includes(role)}
                  onChange={(e) => {
                    const c = e.target.checked;
                    if (c) setSettingsForm([...settingsForm, role]);
                    else setSettingsForm(settingsForm.filter((r) => r !== role));
                  }}
                />
                <span className="text-sm font-medium leading-none">
                  {role === 'omsu' ? 'ОМСУ' : role === 'cio' ? 'ЦИО' : 'МЭФ'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Отчётные периоды */}
        <div className="space-y-1.5">
          <Label className="font-medium text-slate-700">Отчётные периоды</Label>
          <select
            multiple
            className="w-full h-28 p-2 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 bg-white"
            value={settingsRep}
            onChange={(e) => setSettingsRep(Array.from(e.target.selectedOptions).map((o) => o.value))}
          >
            {repOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground">Зажмите Ctrl (или Cmd) для выбора нескольких элементов</p>
        </div>

        {/* Оценочные периоды */}
        <div className="space-y-1.5">
          <Label className="font-medium text-slate-700">Оценочные периоды</Label>
          <Select value={settingsEst} onValueChange={setSettingsEst}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {estOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Прогнозные периоды */}
        <div className="space-y-1.5">
          <Label className="font-medium text-slate-700">Прогнозные периоды</Label>
          <select
            multiple
            className="w-full h-28 p-2 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 bg-white"
            value={settingsFor}
            onChange={(e) => setSettingsFor(Array.from(e.target.selectedOptions).map((o) => o.value))}
          >
            {forOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground">Зажмите Ctrl (или Cmd) для выбора нескольких элементов</p>
        </div>

        {/* Примечание */}
        <div className="space-y-2 pt-2 border-t">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              id={`setting-note-${block}`}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={settingsNote}
              onChange={(e) => setSettingsNote(e.target.checked)}
            />
            <span className="text-sm font-medium leading-none">Добавить поле Примечание</span>
          </label>
        </div>

        {/* Кнопка сохранения */}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={saveSettings} className="bg-[#1e5c8f] hover:bg-[#1e5c8f]/90 text-white">
            <Save className="h-4 w-4 mr-1.5" /> Сохранить настройки
          </Button>
          {savedSuccess && (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <Check className="h-3.5 w-3.5 mr-1" /> Настройки сохранены
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
