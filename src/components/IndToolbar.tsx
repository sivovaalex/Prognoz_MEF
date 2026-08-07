import { CIOS, MUNICIPALITIES } from '@/lib/data';
import { isTreeFilterActive, type TreeFilter } from '@/lib/indTree';
import { Input } from '@/components/ui/input';

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';

interface TreeToggleProps {
  hasChildren: boolean;
  collapsed: boolean;
  onToggle: () => void;
}

/** Кнопка сворачивания/разворачивания дочерних показателей узла дерева */
export function TreeToggle({ hasChildren, collapsed, onToggle }: TreeToggleProps) {
  if (!hasChildren) return <span className="inline-block w-4 shrink-0" />;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className="inline-flex shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 h-4 w-4"
      title={collapsed ? 'Развернуть дочерние показатели' : 'Свернуть дочерние показатели'}
    >
      {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );
}

interface Props {
  filter: TreeFilter;
  onChange: (f: TreeFilter) => void;
  /** Сколько узлов показано / всего (выводится при активном фильтре) */
  shown?: number;
  total?: number;
  /** Не показывать фильтр по ответственному ЦИО */
  hideCioFilter?: boolean;
  /** Фильтр по ОМСУ (если задан вместе с onMunChange) */
  munId?: string;
  onMunChange?: (v: string) => void;
  allowAllMuns?: boolean;
  showStatusFilter?: boolean;
}

/** Панель над таблицами показателей: поиск, фильтр по ЦИО / ОМСУ */
export function IndToolbar({ filter, onChange, shown, total, hideCioFilter, munId, onMunChange, allowAllMuns, showStatusFilter }: Props) {
  const active = isTreeFilterActive(filter);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border bg-white px-3 py-2">
      <div className="relative min-w-[220px] flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-8 h-9"
          placeholder="Поиск показателя по названию"
          value={filter.query}
          onChange={(e) => onChange({ ...filter, query: e.target.value })}
        />
      </div>
      {!hideCioFilter && (
        <Select value={filter.cioId} onValueChange={(v) => onChange({ ...filter, cioId: v })}>
          <SelectTrigger className="h-9 w-[240px]">
            <SelectValue placeholder="Ответственный ЦИО" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все ответственные ЦИО</SelectItem>
            {CIOS.map((c) => <SelectItem key={c.id} value={c.id}>{c.short}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {munId !== undefined && onMunChange && (
        <Select value={munId} onValueChange={onMunChange}>
          <SelectTrigger className="h-9 w-[240px]">
            <SelectValue placeholder="ОМСУ" />
          </SelectTrigger>
          <SelectContent>
            {allowAllMuns !== false && <SelectItem value="all">Все ОМСУ</SelectItem>}
            {MUNICIPALITIES.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {showStatusFilter && (
        <Select value={filter.status || 'all'} onValueChange={(v) => onChange({ ...filter, status: v })}>
          <SelectTrigger className="h-9 w-[220px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="not_filled">Не заполнено</SelectItem>
            <SelectItem value="draft">Черновик</SelectItem>
            <SelectItem value="pending_cio">На согласовании (ЦИО)</SelectItem>
            <SelectItem value="returned">Возвращено</SelectItem>
            <SelectItem value="pending_mef">На согласовании (МЭФ)</SelectItem>
            <SelectItem value="approved">Согласовано</SelectItem>
          </SelectContent>
        </Select>
      )}

      {active && shown !== undefined && total !== undefined && (
        <span className="text-xs text-muted-foreground ml-auto">
          Показано: {shown} из {total}
        </span>
      )}
    </div>
  );
}