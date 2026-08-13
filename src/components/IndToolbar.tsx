import { useState } from 'react';
import { useStore } from '@/lib/store';
import { isTreeFilterActive, type TreeFilter } from '@/lib/indTree';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  const { state } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const active = isTreeFilterActive(filter);
  
  const filteredInds = state.indicators.filter(ind => 
    !filter.query || 
    ind.name.toLowerCase().includes(filter.query.toLowerCase()) || 
    (ind.num || '').toLowerCase().includes(filter.query.toLowerCase())
  );

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border bg-white px-3 py-2">
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-8 h-9 cursor-text"
              placeholder="Поиск показателя по названию"
              value={filter.query}
              onChange={(e) => {
                onChange({ ...filter, query: e.target.value });
                setSearchOpen(true);
              }}
              onClick={() => setSearchOpen(true)}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="max-h-[300px] overflow-y-auto p-1">
            {filteredInds.length === 0 && <div className="p-2 text-sm text-slate-500">Ничего не найдено</div>}
            {filteredInds.map(ind => (
              <div
                key={ind.id}
                className="px-2 py-1.5 text-sm hover:bg-slate-100 cursor-pointer rounded-sm flex"
                style={{ paddingLeft: `${(ind.level - 1) * 16 + 8}px` }}
                onClick={() => {
                  onChange({ ...filter, query: ind.name });
                  setSearchOpen(false);
                }}
              >
                <span className="font-medium mr-1.5 shrink-0 whitespace-nowrap">{ind.num}</span>
                <span className={ind.isGroup ? "font-medium" : ""}>{ind.name}</span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {!hideCioFilter && (
        <Select value={filter.cioId} onValueChange={(v) => onChange({ ...filter, cioId: v })}>
          <SelectTrigger className="h-9 w-[240px]">
            <SelectValue placeholder="Ответственный ЦИО" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все ответственные ЦИО</SelectItem>
            {state.cios.map((c) => <SelectItem key={c.id} value={c.id}>{c.short}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {filter.actualDate !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Дата актуальности:</span>
          <Input 
            type="date"
            className="h-9 w-[150px]"
            value={filter.actualDate}
            onChange={(e) => onChange({ ...filter, actualDate: e.target.value })}
          />
        </div>
      )}
      {munId !== undefined && onMunChange && (
        <Select value={munId} onValueChange={onMunChange}>
          <SelectTrigger className="h-9 w-[240px]">
            <SelectValue placeholder="ОМСУ" />
          </SelectTrigger>
          <SelectContent>
            {allowAllMuns !== false && <SelectItem value="all">Все ОМСУ</SelectItem>}
            {state.omsus.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
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