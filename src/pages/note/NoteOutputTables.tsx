import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { NOTE_ARCHIVE_YEARS, NOTE_REPORTING_YEAR, buildNoteArchiveOmsuValues } from '@/lib/data';
import { noteTemplateName } from '@/lib/types';
import { NoteTable } from '@/components/note/NoteTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function NoteOutputTables({ fixedMunId }: { fixedMunId?: string }) {
  const { state } = useStore();
  const muns = state.omsus.filter((m) => m.isActive !== false);
  const [munId, setMunId] = useState(fixedMunId ?? muns[0]?.id ?? '');
  const mun = state.omsus.find((m) => m.id === munId);

  // Выбор отчётного года: текущий год + архив за последние 15 лет
  const years = [NOTE_REPORTING_YEAR, ...NOTE_ARCHIVE_YEARS];
  const [year, setYear] = useState<number>(NOTE_REPORTING_YEAR);
  const isArchive = year !== NOTE_REPORTING_YEAR;

  // Архив — снимок документа за прошлый год (все разделы, данные завершённой кампании)
  const templates = isArchive
    ? state.noteTemplates
    : state.noteTemplates.filter((t) => t.isActive);

  const archiveData = useMemo(
    () =>
      isArchive
        ? buildNoteArchiveOmsuValues(year, state.noteTemplates, state.omsus.filter((m) => m.isActive !== false))
        : null,
    [isArchive, year, state.noteTemplates, state.omsus],
  );
  const munData = isArchive ? (archiveData?.[munId] ?? {}) : state.noteOmsuValues[munId] ?? {};

  // Фильтр «Показатели» (только для текущего года): 'all' — все показатели, иначе выбранный показатель ПЗ
  const [indFilter, setIndFilter] = useState<string>('all');
  const indById = new Map(state.indicators.map((i) => [i.id, i]));
  // Если выбранный показатель отсутствует в текущем списке (напр., после смены года) — показываем все
  const filterValue = indFilter === 'all' || templates.some((t) => t.id === indFilter) ? indFilter : 'all';
  // Архивная пояснительная записка всегда показывается целиком, без фильтра по показателю
  const shown = !isArchive && filterValue !== 'all' ? templates.filter((t) => t.id === filterValue) : templates;

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

      <div className="flex flex-wrap items-center gap-3">
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
        <div className="w-56">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Отчетный год" /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y === NOTE_REPORTING_YEAR ? `${y} (текущий)` : `${y} (архив)`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!isArchive && (
          <div className="w-80">
            <Select value={filterValue} onValueChange={setIndFilter}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Показатели" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все показатели</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{noteTemplateName(t, indById)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
          Нет данных для отображения
        </div>
      ) : (
        <NoteTable
          templates={shown}
          directions={state.directions}
          indicators={state.indicators}
          mode="readonly"
          omsuData={munData}
          reportingYear={year}
        />
      )}
    </div>
  );
}