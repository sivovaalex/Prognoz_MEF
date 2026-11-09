import React, { useState, useEffect, useRef } from 'react';
import type { CellValue } from '@/lib/types';
import { parseCellValue, formatCellValueForInput, getCellValueDescription } from '@/lib/types';
import { Input } from '@/components/ui/input';

interface CellInputProps {
  value: CellValue;
  onChange: (val: CellValue) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  title?: string;
}

export function CellInput({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = '—',
  title,
}: CellInputProps) {
  const [localText, setLocalText] = useState<string>(() => formatCellValueForInput(value));
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Синхронизация внешнего значения, когда поле не находится в фокусе ввода
  useEffect(() => {
    if (!isFocused) {
      setLocalText(formatCellValueForInput(value));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalText(raw);
    const parsed = parseCellValue(raw);
    onChange(parsed);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Если фокус перешел на кнопки быстрого выбора внутри контейнера — не сбрасываем
    if (containerRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsFocused(false);
    const parsed = parseCellValue(localText);
    onChange(parsed);
    setLocalText(formatCellValueForInput(parsed));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    // Быстрые клавиши
    if (e.key === '-' && localText === '') {
      e.preventDefault();
      onChange('-');
      setLocalText('—');
    }
  };

  const desc = getCellValueDescription(value);
  const effectiveTitle = desc
    ? `${desc}. В формулах учитывается как пустое.`
    : (title || 'Число, «-» (прочерк — нет значения) или «...» (троеточие — нет статистики)');

  return (
    <div ref={containerRef} className="relative group/cell inline-flex flex-col items-center">
      <Input
        type="text"
        disabled={disabled}
        className={`${className} text-center mx-auto transition-colors ${
          value === '-'
            ? 'font-bold text-slate-800 bg-amber-50/30 border-amber-300'
            : value === '...'
            ? 'font-bold text-blue-900 bg-blue-50/30 border-blue-300 tracking-wider'
            : ''
        }`}
        placeholder={placeholder}
        value={localText}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        title={effectiveTitle}
      />

      {/* Быстрые кнопки вставки «Прочерк» и «Троеточие» при фокусе */}
      {isFocused && !disabled && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 bg-white border border-slate-300 shadow-md rounded px-1.5 py-0.5 text-[10px] whitespace-nowrap animate-in fade-in zoom-in-95">
          <button
            type="button"
            className="px-1 py-0.5 rounded hover:bg-amber-100 text-amber-900 font-semibold transition-colors"
            title="Прочерк: явление отсутствует (нет значения)"
            onMouseDown={(e) => {
              e.preventDefault();
              onChange('-');
              setLocalText('—');
              setIsFocused(false);
            }}
          >
            — прочерк
          </button>
          <span className="text-slate-300 font-light">|</span>
          <button
            type="button"
            className="px-1 py-0.5 rounded hover:bg-blue-100 text-blue-900 font-semibold transition-colors"
            title="Троеточие: сведения отсутствуют (нет статистики)"
            onMouseDown={(e) => {
              e.preventDefault();
              onChange('...');
              setLocalText('...');
              setIsFocused(false);
            }}
          >
            ... троеточие
          </button>
        </div>
      )}
    </div>
  );
}

