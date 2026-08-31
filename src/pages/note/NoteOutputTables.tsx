import { useState } from 'react';
import { useStore } from '@/lib/store';
import { NoteTable } from '@/components/note/NoteTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function NoteOutputTables({ fixedMunId }: { fixedMunId?: string }) {
  const { state } = useStore();
  const muns = state.omsus.filter((m) => m.isActive !== false);
  const [munId, setMunId] = useState(fixedMunId ?? muns[0]?.id ?? '');
  const mun = state.omsus.find((m) => m.id === munId);

  const active = state.noteTemplates.filter((t) => t.isActive);
  const munData = state.noteOmsuValues[munId] ?? {};

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">
          Итоговые таблицы пояснительной записки{fixedMunId && mun ? ` — ${mun.name}` : ''}
        </h2>
        <p className="text-sm text-slate-500">
          Формирование итоговых таблиц по согласованным данным пояснительной записки
        </p>
      </div>

      {!fixedMunId && (
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
      )}

      {active.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
          Нет данных для отображения
        </div>
      ) : (
        <NoteTable
          templates={active}
          directions={state.directions}
          indicators={state.indicators}
          mode="readonly"
          omsuData={munData}
        />
      )}
    </div>
  );
}