import type { ReactNode } from 'react';
import { VALUE_FIELDS, VALUE_GROUPS } from '@/lib/types';

const GROUP_HEAD: Record<string, string> = {
  report: 'bg-green-50/70',
  estimate: 'bg-amber-50/70',
  y2027: 'bg-blue-50/70',
  y2028: 'bg-blue-50/70',
  y2029: 'bg-blue-50/70',
};

/** Колонка таблицы значений (VALUE_FIELDS или набор колонок архивного года оценки) */
export type ValueColumnField = { key: string; group: string; label: string; _bg: string; variant?: 1 | 2 };
/** Группа верхнего уровня шапки (год) */
export type ValueColumnGroup = { key: string; label: string; span: number; _bg: string };

/** Фон ячейки данных по полю значения (включая слоты архива: r* — отчёт, e — оценка) */
export function fieldTint(key: string): string {
  if (key === 'v2026' || key === 'e') return 'bg-amber-50/30';
  if (key.startsWith('v') || key.startsWith('r')) return 'bg-green-50/30';
  return 'bg-blue-50/30';
}

/**
 * Двухуровневая шапка колонок значений показателя:
 * для текущего года — 2023–2025 (отчёт), 2026 (оценка), 2027–2029 (прогнозы, 2 варианта);
 * для архивного года оценки Y — та же структура, сдвинутая на Y.
 * В `leading`/`trailing` передаются ячейки с rowSpan={2} до/после колонок значений.
 * `fields` — набор колонок, `groups` — верхние группы (годы).
 */
export function ValueGroupHeader({ leading, trailing, fields = VALUE_FIELDS, groups = VALUE_GROUPS }: {
  leading: ReactNode;
  trailing?: ReactNode;
  fields?: readonly ValueColumnField[];
  groups?: readonly ValueColumnGroup[];
}) {
  // Группы верхнего уровня для переданных колонок (ключ группы = f.group)
  const topGroups: { key: string; label: string; span: number; _bg: string }[] = [];
  for (const f of fields) {
    const g = groups.find((x) => x.key === f.group);
    const last = topGroups[topGroups.length - 1];
    if (last && last.key === f.group) last.span += 1;
    else if (g) topGroups.push({ key: g.key, label: g.label, span: 1, _bg: g._bg });
  }
  return (
    <>
      <tr className="border-b text-xs text-muted-foreground">
        {leading}
        {topGroups.map((g) => (
          <th key={g.key} colSpan={g.span} className={`text-center p-1.5 border-l border-b ${GROUP_HEAD[g._bg]}`}>
            {g.label}
          </th>
        ))}
        {trailing}
      </tr>
      <tr className="border-b text-xs text-muted-foreground">
        {fields.map((f, i) => (
          <th
            key={f.key}
            className={`text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] ${i === 0 ? 'border-l' : ''} ${GROUP_HEAD[f._bg]}`}
          >
            {f.label}
          </th>
        ))}
      </tr>
    </>
  );
}
