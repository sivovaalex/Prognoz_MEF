import React, { useState, useRef, useEffect } from 'react';
import {
  Wand2,
  Copy,
  Calculator,
  Check,
  X,
  Maximize2,
  Minimize2,
  Search,
  HelpCircle,
  Plus,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface FormulaEditorIndicator {
  id: string;
  num?: string;
  key?: string;
  name: string;
  isReference?: boolean;
  isRef?: boolean;
}

interface FormulaItem {
  id: string;
  name: string;
  description: string;
  type: 'function' | 'syntax';
  category: string;
  insertText: string;
  helpText: string;
}

const FORMULA_ELEMENTS: FormulaItem[] = [
  // Математика (4)
  {
    id: 'abs',
    name: 'Abs',
    description: 'Абсолютное значение',
    type: 'function',
    category: 'Математика',
    insertText: 'Abs()',
    helpText: 'Abs(число) — возвращает абсолютное значение числа',
  },
  {
    id: 'max',
    name: 'Max',
    description: 'Максимум из двух',
    type: 'function',
    category: 'Математика',
    insertText: 'Max(, )',
    helpText: 'Max(a, b) — возвращает большее из двух значений',
  },
  {
    id: 'min',
    name: 'Min',
    description: 'Минимум из двух',
    type: 'function',
    category: 'Математика',
    insertText: 'Min(, )',
    helpText: 'Min(a, b) — возвращает меньшее из двух значений',
  },
  {
    id: 'round',
    name: 'Round',
    description: 'Округление до N знаков',
    type: 'function',
    category: 'Математика',
    insertText: 'Round(, 2)',
    helpText: 'Round(число, знаков) — округляет число до указанного количества знаков',
  },

  // Логические (5)
  {
    id: 'if',
    name: 'If',
    description: 'Условный оператор if...then...else',
    type: 'syntax',
    category: 'Логические',
    insertText: 'If(, , )',
    helpText: 'If(условие, значение_если_истина, значение_если_ложь)',
  },
  {
    id: 'and',
    name: 'And',
    description: 'Логическое И (конъюнкция)',
    type: 'syntax',
    category: 'Логические',
    insertText: ' And ',
    helpText: 'Условие1 And Условие2 — истина, если оба условия истинны',
  },
  {
    id: 'or',
    name: 'Or',
    description: 'Логическое ИЛИ (дизъюнкция)',
    type: 'syntax',
    category: 'Логические',
    insertText: ' Or ',
    helpText: 'Условие1 Or Условие2 — истина, если хотя бы одно условие истинно',
  },
  {
    id: 'not',
    name: 'Not',
    description: 'Логическое отрицание НЕ',
    type: 'syntax',
    category: 'Логические',
    insertText: 'Not()',
    helpText: 'Not(условие) — инвертирует логическое значение',
  },
  {
    id: 'isnull',
    name: 'IsNull',
    description: 'Проверка на отсутствие значения',
    type: 'function',
    category: 'Логические',
    insertText: 'IsNull()',
    helpText: 'IsNull(значение) — возвращает true, если значение не задано',
  },

  // Статистика (5)
  {
    id: 'sum',
    name: 'Sum',
    description: 'Сумма значений выборки',
    type: 'function',
    category: 'Статистика',
    insertText: 'Sum()',
    helpText: 'Sum(ряд) — вычисляет арифметическую сумму элементов',
  },
  {
    id: 'avg',
    name: 'Avg',
    description: 'Среднее арифметическое',
    type: 'function',
    category: 'Статистика',
    insertText: 'Avg()',
    helpText: 'Avg(ряд) — вычисляет среднее арифметическое',
  },
  {
    id: 'count',
    name: 'Count',
    description: 'Количество непустых значений',
    type: 'function',
    category: 'Статистика',
    insertText: 'Count()',
    helpText: 'Count(ряд) — возвращает число заполненных элементов',
  },
  {
    id: 'median',
    name: 'Median',
    description: 'Медиана числового ряда',
    type: 'function',
    category: 'Статистика',
    insertText: 'Median()',
    helpText: 'Median(ряд) — вычисляет медианное значение ряда',
  },
  {
    id: 'rank',
    name: 'Rank',
    description: 'Ранг значения в выборке',
    type: 'function',
    category: 'Статистика',
    insertText: 'Rank()',
    helpText: 'Rank(значение, ряд) — возвращает порядковое место значения',
  },

  // Рейтинговые надстройки (5)
  {
    id: 'rank_ind',
    name: 'Ранг_показателя',
    description: 'Ранг ОМСУ по показателю (1..N)',
    type: 'syntax',
    category: 'Рейтинг',
    insertText: 'Ранг_показателя',
    helpText: 'Ранг_показателя — место муниципалитета по данному показателю',
  },
  {
    id: 'weight',
    name: 'Вес',
    description: 'Утвержденный вес показателя',
    type: 'syntax',
    category: 'Рейтинг',
    insertText: 'Вес',
    helpText: 'Вес — весовой коэффициент показателя в расчете рейтинга',
  },
  {
    id: 'dir_score',
    name: 'Балл_направления',
    description: 'Суммарный балл направления',
    type: 'syntax',
    category: 'Рейтинг',
    insertText: 'Балл_направления',
    helpText: 'Балл_направления — агрегированный балл муниципалитета по разделу',
  },
  {
    id: 'rank_zato',
    name: 'Ранг_показателя_ЗАТО',
    description: 'Ранг среди группы ЗАТО (1..5)',
    type: 'syntax',
    category: 'Рейтинг',
    insertText: 'Ранг_показателя_ЗАТО',
    helpText: 'Ранг_показателя_ЗАТО — место территории среди группы ЗАТО',
  },
  {
    id: 'summ',
    name: 'СУММ',
    description: 'Агрегатная сумма для формулы рейтинга',
    type: 'function',
    category: 'Рейтинг',
    insertText: 'СУММ(Ранг_показателя * Вес)',
    helpText: 'СУММ(...) — агрегирует произведение рангов и весов',
  },

  // Конструкции и операторы (14)
  {
    id: 'op_plus',
    name: '+ (Сложение)',
    description: 'Оператор сложения',
    type: 'syntax',
    category: 'Операторы',
    insertText: ' + ',
    helpText: 'a + b',
  },
  {
    id: 'op_minus',
    name: '- (Вычитание)',
    description: 'Оператор вычитания',
    type: 'syntax',
    category: 'Операторы',
    insertText: ' - ',
    helpText: 'a - b',
  },
  {
    id: 'op_mul',
    name: '* (Умножение)',
    description: 'Оператор умножения',
    type: 'syntax',
    category: 'Операторы',
    insertText: ' * ',
    helpText: 'a * b',
  },
  {
    id: 'op_div',
    name: '/ (Деление)',
    description: 'Оператор деления',
    type: 'syntax',
    category: 'Операторы',
    insertText: ' / ',
    helpText: 'a / b',
  },
  {
    id: 'op_pow',
    name: '^ (Возведение в степень)',
    description: 'Оператор степени',
    type: 'syntax',
    category: 'Операторы',
    insertText: ' ^ ',
    helpText: 'a ^ b',
  },
  {
    id: 'op_paren',
    name: '( ) (Скобки)',
    description: 'Группировка операций',
    type: 'syntax',
    category: 'Операторы',
    insertText: '()',
    helpText: '(a + b) * c',
  },
  {
    id: 'op_eq',
    name: '== (Равно)',
    description: 'Проверка равенства',
    type: 'syntax',
    category: 'Операторы',
    insertText: ' == ',
    helpText: 'a == b',
  },
  {
    id: 'op_neq',
    name: '!= (Не равно)',
    description: 'Проверка неравенства',
    type: 'syntax',
    category: 'Операторы',
    insertText: ' != ',
    helpText: 'a != b',
  },
  {
    id: 'op_gt',
    name: '> (Больше)',
    description: 'Строго больше',
    type: 'syntax',
    category: 'Операторы',
    insertText: ' > ',
    helpText: 'a > b',
  },
  {
    id: 'op_gte',
    name: '>= (Больше или равно)',
    description: 'Больше либо равно',
    type: 'syntax',
    category: 'Операторы',
    insertText: ' >= ',
    helpText: 'a >= b',
  },
  {
    id: 'op_lt',
    name: '< (Меньше)',
    description: 'Строго меньше',
    type: 'syntax',
    category: 'Операторы',
    insertText: ' < ',
    helpText: 'a < b',
  },
  {
    id: 'op_lte',
    name: '<= (Меньше или равно)',
    description: 'Меньше либо равно',
    type: 'syntax',
    category: 'Операторы',
    insertText: ' <= ',
    helpText: 'a <= b',
  },
  {
    id: 'op_comma',
    name: ', (Разделитель аргументов)',
    description: 'Разделитель параметров функции',
    type: 'syntax',
    category: 'Операторы',
    insertText: ', ',
    helpText: 'Функция(а, б)',
  },
  {
    id: 'op_semicolon',
    name: '; (Конец выражения)',
    description: 'Разделитель составных инструкций',
    type: 'syntax',
    category: 'Операторы',
    insertText: '; ',
    helpText: 'Инструкция1; Инструкция2',
  },
];

interface FormulaEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  initialFormula: string;
  onSave: (formula: string) => void;
  indicators?: FormulaEditorIndicator[];
}

export const FormulaEditorModal: React.FC<FormulaEditorModalProps> = ({
  isOpen,
  onClose,
  title = 'Формула отчета',
  initialFormula,
  onSave,
  indicators = [],
}) => {
  const [formula, setFormula] = useState(initialFormula);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [validationResult, setValidationResult] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });

  // Filters for indicators
  const [indSearch, setIndSearch] = useState('');
  const [indFilter, setIndFilter] = useState<'all' | 'calc' | 'ref'>('all');
  const [indSortAsc, setIndSortAsc] = useState(true);

  // Filters for formula elements
  const [elemSearch, setElemSearch] = useState('');
  const [elemFilter, setElemFilter] = useState<'all' | 'function' | 'syntax'>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [activeHelp, setActiveHelp] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFormula(initialFormula || '');
      setValidationResult({ status: 'idle', message: '' });
      setActiveHelp(null);
    }
  }, [isOpen, initialFormula]);

  if (!isOpen) return null;

  // Insert text into textarea at current cursor position
  const insertTextAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setFormula((prev) => prev + text);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = formula;
    const next = current.substring(0, start) + text + current.substring(end);
    setFormula(next);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + text.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  // Format formula (basic beautifier)
  const handleFormat = () => {
    let formatted = formula.trim();
    // Normalize spaces around operators
    formatted = formatted
      .replace(/\s*([+\-*/^=<>!]+)\s*/g, ' $1 ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s*\(\s*/g, '(')
      .replace(/\s*\)\s*/g, ')')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .replace(/\s+/g, ' ');
    setFormula(formatted);
  };

  // Copy formula to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(formula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Validate formula syntax
  const handleValidate = () => {
    const trimmed = formula.trim();
    if (!trimmed) {
      setValidationResult({ status: 'error', message: 'Формула пуста. Введите выражение для расчета.' });
      return;
    }

    // Check bracket balance
    let openParens = 0;
    let openBrackets = 0;
    for (const char of trimmed) {
      if (char === '(') openParens++;
      if (char === ')') openParens--;
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets--;
      if (openParens < 0) {
        setValidationResult({ status: 'error', message: 'Ошибка: закрывающая круглая скобка ")" без пары' });
        return;
      }
      if (openBrackets < 0) {
        setValidationResult({ status: 'error', message: 'Ошибка: закрывающая квадратная скобка "]" без пары' });
        return;
      }
    }

    if (openParens > 0) {
      setValidationResult({ status: 'error', message: `Ошибка: пропущено ${openParens} закрывающих круглых скобок ")"` });
      return;
    }
    if (openBrackets > 0) {
      setValidationResult({ status: 'error', message: `Ошибка: незакрытая квадратная скобка показателя "[${trimmed.slice(trimmed.lastIndexOf('['))}"` });
      return;
    }

    setValidationResult({ status: 'success', message: '✓ Формула синтаксически корректна. Ошибок не обнаружено.' });
  };

  const handleSave = () => {
    onSave(formula);
    onClose();
  };

  // Filtered indicators
  const filteredIndicators = indicators.filter((ind) => {
    const isReference = ind.isReference ?? ind.isRef ?? false;
    if (indFilter === 'calc' && isReference) return false;
    if (indFilter === 'ref' && !isReference) return false;
    const code = ind.num || ind.key || ind.id;
    if (!indSearch) return true;
    const q = indSearch.toLowerCase();
    return code.toLowerCase().includes(q) || ind.name.toLowerCase().includes(q);
  }).sort((a, b) => {
    const codeA = a.num || a.key || a.id;
    const codeB = b.num || b.key || b.id;
    return indSortAsc ? codeA.localeCompare(codeB, undefined, { numeric: true }) : codeB.localeCompare(codeA, undefined, { numeric: true });
  });

  const calcIndCount = indicators.filter((i) => !(i.isReference ?? i.isRef)).length;
  const refIndCount = indicators.filter((i) => !!(i.isReference ?? i.isRef)).length;

  // Filtered elements
  const filteredElements = FORMULA_ELEMENTS.filter((el) => {
    if (elemFilter === 'function' && el.type !== 'function') return false;
    if (elemFilter === 'syntax' && el.type !== 'syntax') return false;
    if (!elemSearch) return true;
    const q = elemSearch.toLowerCase();
    return el.name.toLowerCase().includes(q) || el.description.toLowerCase().includes(q) || el.category.toLowerCase().includes(q);
  });

  // Group elements by category
  const categories = Array.from(new Set(filteredElements.map((el) => el.category)));
  const funcCount = FORMULA_ELEMENTS.filter((e) => e.type === 'function').length;
  const syntaxCount = FORMULA_ELEMENTS.filter((e) => e.type === 'syntax').length;

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Line numbers calculation
  const lineCount = Math.max(formula.split('\n').length, 3);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150">
      <div
        className={cn(
          "bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200 transition-all duration-200 overflow-hidden",
          isFullscreen ? "w-full h-full rounded-none" : "w-full max-w-5xl max-h-[92vh]"
        )}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white select-none shrink-0">
          <div className="flex items-center gap-3">
            {/* Soft blue icon with cursive italic f */}
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-serif italic font-bold text-xl shadow-xs">
              f
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-semibold text-slate-900">Редактирование формулы</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0284c7] text-white shadow-xs">
                  {title}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Настройка расчетной формулы, синтаксическая валидация и тестовый расчет
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              title={isFullscreen ? "Свернуть" : "Развернуть на весь экран"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#fafbfc]">
          {/* TOP SECTION: Редактор формулы */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Редактор формулы</h4>
                <p className="text-xs text-slate-500">Синтаксис DSL с поддержкой показателей [Код]</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFormat}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                >
                  <Wand2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Форматировать</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
                </button>
              </div>
            </div>

            {/* Code editor box with line numbers */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 overflow-hidden">
              <div className="flex min-h-[140px]">
                {/* Line numbers */}
                <div className="w-10 bg-slate-50/70 border-r border-slate-100 py-2.5 px-2 text-right select-none text-xs font-mono text-slate-400 leading-6">
                  {lineNumbers.map((num) => (
                    <div key={num}>{num}</div>
                  ))}
                </div>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={formula}
                  onChange={(e) => {
                    setFormula(e.target.value);
                    if (validationResult.status !== 'idle') {
                      setValidationResult({ status: 'idle', message: '' });
                    }
                  }}
                  placeholder="Введите формулу расчета..."
                  rows={Math.max(lineCount, 4)}
                  className="flex-1 p-2.5 text-xs font-mono text-slate-800 leading-6 resize-none outline-none bg-transparent"
                  spellCheck={false}
                />
              </div>

              {/* Status / Preview bar below editor */}
              <div className="px-3 py-2 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs">
                {validationResult.status === 'idle' ? (
                  <span className="text-slate-400 italic">
                    {formula ? formula : 'Введите формулу расчета'}
                  </span>
                ) : validationResult.status === 'success' ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    {validationResult.message}
                  </span>
                ) : (
                  <span className="text-rose-600 font-medium">
                    {validationResult.message}
                  </span>
                )}
                <span className="text-[11px] text-slate-400">Символов: {formula.length}</span>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Two columns (Split view) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* LEFT COLUMN: Показатели */}
            <div className="space-y-2.5 flex flex-col">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-slate-800">Показатели</h4>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  {indicators.length}
                </span>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Поиск показателей..."
                  value={indSearch}
                  onChange={(e) => setIndSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-400"
                />
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-100/80 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setIndFilter('all')}
                  className={cn(
                    "flex-1 py-1 rounded-md text-center transition-all font-medium cursor-pointer",
                    indFilter === 'all' ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Все {indicators.length}
                </button>
                <button
                  type="button"
                  onClick={() => setIndFilter('calc')}
                  className={cn(
                    "flex-1 py-1 rounded-md text-center transition-all font-medium cursor-pointer",
                    indFilter === 'calc' ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Расчётные {calcIndCount}
                </button>
                <button
                  type="button"
                  onClick={() => setIndFilter('ref')}
                  className={cn(
                    "flex-1 py-1 rounded-md text-center transition-all font-medium cursor-pointer",
                    indFilter === 'ref' ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Справочные {refIndCount}
                </button>
              </div>

              {/* Indicators Table */}
              <div className="flex-1 min-h-[220px] max-h-[300px] border border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col shadow-xs">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-600 select-none">
                  <span>Показатель</span>
                  <button
                    type="button"
                    onClick={() => setIndSortAsc(!indSortAsc)}
                    className="p-1 hover:bg-slate-200/60 rounded transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Сортировать по коду"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {filteredIndicators.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      Нет данных для отображения
                    </div>
                  ) : (
                    filteredIndicators.map((ind) => {
                      const code = ind.num || ind.key || ind.id;
                      const isRef = ind.isReference ?? ind.isRef ?? false;
                      return (
                        <div
                          key={ind.id}
                          onClick={() => insertTextAtCursor(`[${code}]`)}
                          className="flex items-center justify-between px-3 py-2 hover:bg-blue-50/50 cursor-pointer transition-colors group"
                          title="Нажмите для вставки в формулу"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="font-mono text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded text-[11px] font-semibold shrink-0">
                              [{code}]
                            </span>
                            <span className="truncate text-slate-700 group-hover:text-slate-900 font-medium">
                              {ind.name}
                            </span>
                            {isRef && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded shrink-0">
                                справ.
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              insertTextAtCursor(`[${code}]`);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 hover:bg-blue-100 rounded transition-all shrink-0 cursor-pointer"
                            title="Вставить показатель в формулу"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Элементы формулы */}
            <div className="space-y-2.5 flex flex-col">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-slate-800">Элементы формулы</h4>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  {FORMULA_ELEMENTS.length}
                </span>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Поиск по функциям и конструкциям..."
                  value={elemSearch}
                  onChange={(e) => setElemSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-400"
                />
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-100/80 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setElemFilter('all')}
                  className={cn(
                    "flex-1 py-1 rounded-md text-center transition-all font-medium cursor-pointer",
                    elemFilter === 'all' ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Все {FORMULA_ELEMENTS.length}
                </button>
                <button
                  type="button"
                  onClick={() => setElemFilter('function')}
                  className={cn(
                    "flex-1 py-1 rounded-md text-center transition-all font-medium cursor-pointer",
                    elemFilter === 'function' ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Функции {funcCount}
                </button>
                <button
                  type="button"
                  onClick={() => setElemFilter('syntax')}
                  className={cn(
                    "flex-1 py-1 rounded-md text-center transition-all font-medium cursor-pointer",
                    elemFilter === 'syntax' ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Конструкции {syntaxCount}
                </button>
              </div>

              {/* Accordion Table of Elements */}
              <div className="flex-1 min-h-[220px] max-h-[300px] border border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col shadow-xs">
                <div className="grid grid-cols-[1fr_80px_60px] px-3 py-2 bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-600 select-none">
                  <span>Элемент</span>
                  <span className="text-center">Тип</span>
                  <span></span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {categories.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      Нет данных для отображения
                    </div>
                  ) : (
                    categories.map((cat) => {
                      const items = filteredElements.filter((el) => el.category === cat);
                      const isCollapsed = collapsedCategories[cat];
                      return (
                        <div key={cat} className="border-b border-slate-100 last:border-b-0">
                          {/* Group header */}
                          <div
                            onClick={() => toggleCategory(cat)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50/50 hover:bg-slate-100/70 font-semibold text-slate-700 cursor-pointer select-none text-[11px]"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span>{cat}</span>
                            <span className="text-slate-400 font-normal">({items.length})</span>
                          </div>

                          {!isCollapsed &&
                            items.map((item) => (
                              <div
                                key={item.id}
                                className="grid grid-cols-[1fr_80px_60px] items-center px-3 py-2 hover:bg-slate-50/80 border-t border-slate-50 transition-colors"
                              >
                                <div className="pr-2">
                                  <div className="font-semibold text-slate-800">{item.name}</div>
                                  <div className="text-[11px] text-slate-500 truncate">{item.description}</div>
                                </div>

                                <div className="text-center">
                                  <span
                                    className={cn(
                                      "inline-block px-2 py-0.5 rounded text-[10px] font-medium border",
                                      item.type === 'function'
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-purple-50 text-purple-700 border-purple-200"
                                    )}
                                  >
                                    {item.type === 'function' ? 'Функция' : 'Конструкция'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setActiveHelp(activeHelp === item.id ? null : item.id)}
                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                    title="Справка"
                                  >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => insertTextAtCursor(item.insertText)}
                                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                    title="Вставить в формулу"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {activeHelp === item.id && (
                                  <div className="col-span-3 mt-1.5 p-2 bg-blue-50/70 border border-blue-100 rounded-lg text-[11px] text-blue-900 leading-normal">
                                    <div className="font-semibold font-mono text-blue-800">{item.insertText}</div>
                                    <div className="mt-0.5 text-slate-600">{item.helpText}</div>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white shrink-0">
          <div>
            <button
              type="button"
              onClick={handleValidate}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Calculator className="w-4 h-4 text-slate-500" />
              <span>Проверить формулу</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-[#1e40af] hover:bg-[#1d4ed8] text-white text-xs font-medium rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
