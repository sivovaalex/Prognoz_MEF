import type { ReactNode } from 'react';
import { VALUE_FIELDS, VALUE_GROUPS, type ValueFieldKey } from '@/lib/types';

/** Фон заголовков по группам: Отчёт — зелёный, Оценка — янтарный, прогнозы — синий */
const GROUP_HEAD: Record<string, string> = {
  report: 'bg-green-50/70',
  estimate: 'bg-amber-50/70',
  y2027: 'bg-blue-50/70',
  y2028: 'bg-blue-50/70',
  y2029: 'bg-blue-50/70',
};

/** Фон ячейки данных по полю значения */
export function fieldTint(key: ValueFieldKey): string {
  if (key === 'v2026') return 'bg-amber-50/30';
  if (key.startsWith('v')) return 'bg-green-50/30';
  return 'bg-blue-50/30';
}

/**
 * Двухуровневая шапка колонок значений показателя:
 * «Отчёт» (2023–2025), «Оценка» (2026), «2027»/«2028»/«2029» (прогнозы, 2 варианта).
 * В `leading`/`trailing` передаются ячейки с rowSpan={2} до/после колонок значений.
 */
export function ValueGroupHeader({ leading, trailing }: { leading: ReactNode; trailing?: ReactNode }) {
  return (
    <>
      <tr className="border-b text-xs text-muted-foreground">
        {leading}
        {VALUE_GROUPS.map((g) => (
          <th key={g.key} colSpan={g.span} className={`text-center p-1.5 border-l border-b ${GROUP_HEAD[g.key]}`}>
            {g.label}
          </th>
        ))}
        {trailing}
      </tr>
      <tr className="border-b text-xs text-muted-foreground">
        {VALUE_FIELDS.map((f, i) => (
          <th
            key={f.key}
            className={`text-center p-1.5 font-medium whitespace-normal leading-tight min-w-[76px] ${i === 0 ? 'border-l' : ''} ${GROUP_HEAD[f.group]}`}
          >
            {f.label}
          </th>
        ))}
      </tr>
    </>
  );
}
