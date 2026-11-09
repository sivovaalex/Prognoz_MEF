import type { ReactNode } from 'react';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import { fmt } from '@/lib/rating';
import type { CellValue } from '@/lib/types';
import { getCellValueDescription } from '@/lib/types';

function TipContent({
  updatedAt,
  author,
  description,
}: {
  updatedAt?: string | null;
  author?: string | null;
  description?: string | null;
}) {
  return (
    <TooltipContent side="top" sideOffset={4} className="text-xs leading-relaxed max-w-xs">
      {description && (
        <div className="font-semibold text-slate-900 border-b pb-1 mb-1">{description}</div>
      )}
      {description && (
        <div className="text-[11px] text-amber-700 mb-1">В формулах учитывается как пустое</div>
      )}
      <div><span className="opacity-60">Дата внесения:</span> {updatedAt ?? '—'}</div>
      <div><span className="opacity-60">Внёс данные:</span> {author ?? '—'}</div>
    </TooltipContent>
  );
}

/** Значение показателя с тултипом: при наведении — дата внесения и ФИО внёсшего данные */
export function ValueTip({ value, updatedAt, author }: {
  value: CellValue | undefined;
  updatedAt?: string | null;
  author?: string | null;
}) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;

  const desc = getCellValueDescription(value);
  if (desc) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help font-bold text-slate-800 border-b border-dotted border-slate-400 bg-slate-100/70 px-1 py-0.5 rounded">
            {fmt(value)}
          </span>
        </TooltipTrigger>
        <TipContent updatedAt={updatedAt} author={author} description={desc} />
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help border-b border-dotted border-slate-400">{fmt(value)}</span>
      </TooltipTrigger>
      <TipContent updatedAt={updatedAt} author={author} />
    </Tooltip>
  );
}

/** Обёртка с тултипом (дата внесения и ФИО) для произвольного содержимого, напр. поля ввода.
 *  Тултип показывается только при show=true (т.е. когда данные внесены). */
export function WithValueTip({ show, updatedAt, author, children }: {
  show: boolean;
  updatedAt?: string | null;
  author?: string | null;
  children: ReactNode;
}) {
  if (!show) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TipContent updatedAt={updatedAt} author={author} />
    </Tooltip>
  );
}
