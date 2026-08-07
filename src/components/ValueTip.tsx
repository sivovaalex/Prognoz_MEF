import type { ReactNode } from 'react';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import { fmt } from '@/lib/rating';

function TipContent({ updatedAt, author }: { updatedAt?: string | null; author?: string | null }) {
  return (
    <TooltipContent side="top" sideOffset={4} className="text-xs leading-relaxed">
      <div><span className="opacity-60">Дата внесения:</span> {updatedAt ?? '—'}</div>
      <div><span className="opacity-60">Внёс данные:</span> {author ?? '—'}</div>
    </TooltipContent>
  );
}

/** Значение показателя с тултипом: при наведении — дата внесения и ФИО внёсшего данные */
export function ValueTip({ value, updatedAt, author }: {
  value: number | null | undefined;
  updatedAt?: string | null;
  author?: string | null;
}) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
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
