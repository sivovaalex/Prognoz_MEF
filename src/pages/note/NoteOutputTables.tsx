import { useState } from 'react';
import { useStore } from '@/lib/store';
import { NoteTable } from '@/components/note/NoteTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function NoteOutputTables() {
  const { state } = useStore();
  const muns = state.omsus.filter((m) => m.isActive !== false);
  const [munId, setMunId] = useState(muns[0]?.id ?? '');
  const [onlyApproved, setOnlyApproved] = useState(true);

  const active = state.noteTemplates.filter((t) => t.isActive);
  const munData = state.noteOmsuValues[munId] ?? {};
  const cioData = Object.fromEntries(
    active.map((t) => [t.id, state.noteCioValues[t.id]?.[munId] ?? { note: '', status: 'none' as const, updatedAt: null }]),
  );
  const tpls = onlyApproved
    ? active.filter((t) => munData[t.id]?.status === 'approved')
    : active;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Итоговые таблицы пояснительной записки</h2>
        <p className="text-sm text-slate-500">
          Формирование итоговых таблиц по согласованным данным пояснительной записки
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <Select value={munId} onValueChange={setMunId}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Территория" /></SelectTrigger>
            <SelectContent>
              {muns.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={onlyApproved}
            onChange={(e) => setOnlyApproved(e.target.checked)}
            className="h-4 w-4 accent-[#1e5c8f]"
          />
          Только согласованные ЦИО
        </label>
      </div>

      {tpls.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
          Нет данных для отображения{onlyApproved ? ' (с согласованных ЦИО шаблонов)' : ''}
        </div>
      ) : (
        <NoteTable
          templates={tpls}
          directions={state.directions}
          indicators={state.indicators}
          mode="readonly"
          omsuData={munData}
          cioData={cioData}
        />
      )}
    </div>
  );
}