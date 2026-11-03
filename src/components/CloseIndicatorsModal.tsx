import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/lib/store';
import type { ValueFieldKey } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, ChevronDown, CheckCircle2, X } from 'lucide-react';

interface CloseIndicatorsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultIndicatorId?: string;
  defaultMunId?: string;
}

export function CloseIndicatorsModal({
  open,
  onOpenChange,
  defaultIndicatorId,
  defaultMunId,
}: CloseIndicatorsModalProps) {
  const { state, dispatch } = useStore();

  // Вид данных: 'Отчет' | 'Оценка' | 'Прогноз'
  const [dataKind, setDataKind] = useState<'report' | 'estimate' | 'forecast'>('report');

  // Год: по умолчанию 2025
  const [year, setYear] = useState<string>('2025');

  // Показатель
  const fillableIndicators = useMemo(() => {
    return state.indicators.filter((i) => !i.isGroup);
  }, [state.indicators]);

  const [indicatorId, setIndicatorId] = useState<string>(
    defaultIndicatorId || fillableIndicators[0]?.id || ''
  );
  const [indSearch, setIndSearch] = useState<string>('');
  const [indDropdownOpen, setIndDropdownOpen] = useState(false);

  // Источник данных: 'omsu' | 'cio'
  const [source, setSource] = useState<'omsu' | 'cio'>('omsu');

  // Территория (для ОМСУ): 'all' (массивом) или конкретный ID
  const [munId, setMunId] = useState<string>(defaultMunId || 'all');

  // ЦИО (для ЦИО): точечный ID ЦИО
  const [cioId, setCioId] = useState<string>(state.cios[0]?.id || '');

  // Действие:
  // 1. hard_approve: "Утвердить (нельзя отклонить из отчёта)"
  // 2. approve: "Утвердить"
  // 3. cancel: "Отменить утверждение"
  const [action, setAction] = useState<'hard_approve' | 'approve' | 'cancel'>('hard_approve');

  // Сообщение об успешном выполнении
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Сброс и синхронизация при открытии модального окна
  useEffect(() => {
    if (open) {
      setSuccessMsg(null);
      setIndDropdownOpen(false);
      setIndSearch('');
      if (defaultIndicatorId) {
        setIndicatorId(defaultIndicatorId);
      } else if (!indicatorId && fillableIndicators.length > 0) {
        setIndicatorId(fillableIndicators[0].id);
      }
      if (defaultMunId) {
        setMunId(defaultMunId);
      }
    }
  }, [open, defaultIndicatorId, defaultMunId, fillableIndicators, indicatorId]);

  // Закрытие по Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Доступные года в зависимости от вида данных
  const availableYears = useMemo(() => {
    switch (dataKind) {
      case 'report':
        return ['2023', '2024', '2025'];
      case 'estimate':
        return ['2026'];
      case 'forecast':
        return ['2027', '2028', '2029'];
      default:
        return ['2023', '2024', '2025', '2026', '2027', '2028', '2029'];
    }
  }, [dataKind]);

  // Фильтрация показателей при поиске
  const filteredIndicators = useMemo(() => {
    if (!indSearch.trim()) return fillableIndicators;
    const q = indSearch.toLowerCase();
    return fillableIndicators.filter(
      (i) => (i.num || '').toLowerCase().includes(q) || (i.name || '').toLowerCase().includes(q)
    );
  }, [fillableIndicators, indSearch]);

  const selectedInd = useMemo(() => {
    return (
      (indicatorId ? state.indicators.find((i) => i.id === indicatorId) : null) ||
      fillableIndicators[0] ||
      state.indicators[0]
    );
  }, [state.indicators, indicatorId, fillableIndicators]);

  // Синхронизация года при смене вида данных
  const handleDataKindChange = (kind: 'report' | 'estimate' | 'forecast') => {
    setDataKind(kind);
    if (kind === 'report') setYear('2025');
    else if (kind === 'estimate') setYear('2026');
    else if (kind === 'forecast') setYear('2027');
  };

  // Определение полей модели (fieldKeys) на основе выбранного года
  const getFieldKeysForYear = (y: string): ValueFieldKey[] => {
    switch (y) {
      case '2023':
        return ['v2023'];
      case '2024':
        return ['v2024'];
      case '2025':
        return ['v2025'];
      case '2026':
        return ['v2026'];
      case '2027':
        return ['cons2027', 'base2027'];
      case '2028':
        return ['cons2028', 'base2028'];
      case '2029':
        return ['cons2029', 'base2029'];
      default:
        return ['v2025'];
    }
  };

  const handleApply = () => {
    if (!selectedInd) return;

    const fieldKeys = getFieldKeysForYear(year);

    dispatch({
      type: 'MASS_INDICATOR_LOCK',
      source,
      indId: selectedInd.id,
      fieldKeys,
      munId: source === 'omsu' ? munId : undefined,
      cioId: source === 'cio' ? (cioId || selectedInd.cioId) : undefined,
      action,
      actor: 'Куратор МЭФ / Администратор',
    });

    const actionLabel =
      action === 'hard_approve'
        ? 'Утверждено (нельзя отклонить)'
        : action === 'approve'
        ? 'Утверждено'
        : 'Утверждение отменено';

    const targetDesc =
      source === 'omsu'
        ? munId === 'all'
          ? 'по всем ОМСУ (массивом)'
          : `по территории ${state.omsus.find((m) => m.id === munId)?.name}`
        : `по ЦИО ${state.cios.find((c) => c.id === cioId)?.short || cioId}`;

    setSuccessMsg(`${actionLabel}: показатель «${selectedInd.num}. ${selectedInd.name}» (${targetDesc})`);

    setTimeout(() => {
      setSuccessMsg(null);
      onOpenChange(false);
    }, 1100);
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-4 animate-in fade-in duration-150"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="relative w-full max-w-[500px] bg-[#f0f0f0] border-2 border-slate-400 text-slate-900 rounded-none shadow-2xl p-5 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок окна с кнопкой закрытия */}
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-300">
          <h3 className="text-sm font-semibold text-slate-800 tracking-tight">
            Закрытие ввода по показателям
          </h3>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-slate-500 hover:text-slate-800 p-0.5 hover:bg-slate-200 transition-colors"
            title="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {successMsg ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-600 animate-bounce" />
            <p className="text-sm font-semibold text-slate-800">{successMsg}</p>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            {/* 1. Вид данных */}
            <div className="grid grid-cols-[130px_1fr] items-center gap-2">
              <Label className="text-xs text-slate-800 font-normal">Вид данных:</Label>
              <div className="relative">
                <select
                  value={dataKind}
                  onChange={(e) => handleDataKindChange(e.target.value as any)}
                  className="w-full h-7 px-2 pr-7 text-xs bg-white border border-slate-400 rounded-none shadow-inner focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="report">Отчет</option>
                  <option value="estimate">Оценка</option>
                  <option value="forecast">Прогноз</option>
                </select>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-0.5 text-slate-500">
                  <Search className="w-3 h-3" />
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* 2. Год */}
            <div className="grid grid-cols-[130px_1fr] items-center gap-2">
              <Label className="text-xs text-slate-800 font-normal">Год:</Label>
              <div className="relative">
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full h-7 px-2 pr-7 text-xs bg-white border border-slate-400 rounded-none shadow-inner focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-0.5 text-slate-500">
                  <Search className="w-3 h-3" />
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* 3. Показатели */}
            <div className="grid grid-cols-[130px_1fr] items-start gap-2">
              <Label className="text-xs text-slate-800 font-normal mt-1.5">Показатели:</Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIndDropdownOpen(!indDropdownOpen)}
                  className="w-full h-7 px-2 pr-7 text-xs text-left bg-white border border-slate-400 rounded-none shadow-inner truncate flex items-center justify-between"
                  title={selectedInd ? `${selectedInd.num}. ${selectedInd.name}` : 'Выберите показатель'}
                >
                  <span className="truncate">
                    {selectedInd ? `${selectedInd.num}. ${selectedInd.name}` : 'Выберите показатель'}
                  </span>
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-0.5 text-slate-500">
                    <Search className="w-3 h-3" />
                    <ChevronDown className="w-3 h-3" />
                  </div>
                </button>

                {indDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[9999]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIndDropdownOpen(false);
                      }}
                    />
                    <div className="absolute z-[10000] left-0 right-0 top-8 bg-white border border-slate-400 shadow-xl max-h-56 overflow-hidden flex flex-col">
                      <div className="p-1 border-b border-slate-200 bg-slate-50">
                        <input
                          type="text"
                          placeholder="Поиск показателя по номеру или названию..."
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-none outline-none focus:border-blue-500"
                          value={indSearch}
                          onChange={(e) => setIndSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="overflow-y-auto max-h-44 py-1 divide-y divide-slate-100">
                        {filteredIndicators.map((ind) => (
                          <div
                            key={ind.id}
                            className={`px-2 py-1.5 text-xs cursor-pointer hover:bg-blue-50 transition-colors ${
                              ind.id === (selectedInd?.id || indicatorId)
                                ? 'bg-blue-100 font-semibold text-blue-900'
                                : 'text-slate-800'
                            }`}
                            onClick={() => {
                              setIndicatorId(ind.id);
                              if (ind.cioId) setCioId(ind.cioId);
                              setIndDropdownOpen(false);
                              setIndSearch('');
                            }}
                          >
                            <span className="font-mono text-slate-500 mr-1.5">{ind.num}</span>
                            <span>{ind.name}</span>
                            {ind.closed && (
                              <span className="ml-1.5 text-[10px] text-red-600 bg-red-50 border border-red-200 px-1 py-0.5 rounded font-normal">
                                Закрыт от ввода
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 4. Источник данных */}
            <div className="grid grid-cols-[130px_1fr] items-center gap-2">
              <Label className="text-xs text-slate-800 font-normal">Источник данных:</Label>
              <div className="relative">
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as any)}
                  className="w-full h-7 px-2 pr-7 text-xs bg-white border border-slate-400 rounded-none shadow-inner focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="omsu">Данные муниципальных образований (прогноз)</option>
                  <option value="cio">Данные ЦИО</option>
                </select>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-0.5 text-slate-500">
                  <Search className="w-3 h-3" />
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* 5. Территория / ЦИО */}
            <div className="grid grid-cols-[130px_1fr] items-center gap-2">
              <Label className="text-xs text-slate-800 font-normal">
                {source === 'omsu' ? 'Территория:' : 'ЦИО (точечно):'}
              </Label>
              <div className="relative">
                {source === 'omsu' ? (
                  <select
                    value={munId}
                    onChange={(e) => setMunId(e.target.value)}
                    className="w-full h-7 px-2 pr-7 text-xs bg-white border border-slate-400 rounded-none shadow-inner focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="all">Все муниципальные образования (массивом)</option>
                    {state.omsus.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={cioId}
                    onChange={(e) => setCioId(e.target.value)}
                    className="w-full h-7 px-2 pr-7 text-xs bg-white border border-slate-400 rounded-none shadow-inner focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {state.cios.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.short})
                      </option>
                    ))}
                  </select>
                )}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-0.5 text-slate-500">
                  <Search className="w-3 h-3" />
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* 6. Блок "Действие" (Fieldset / Groupbox) */}
            <fieldset className="border border-slate-400 p-2.5 pt-1 rounded-none bg-transparent">
              <legend className="px-1 text-xs text-slate-900 font-medium">Действие</legend>
              <div className="space-y-1.5 pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="modal_action"
                    value="hard_approve"
                    checked={action === 'hard_approve'}
                    onChange={() => setAction('hard_approve')}
                    className="h-3.5 w-3.5 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-900 font-medium">
                    Утвердить (нельзя отклонить из отчёта)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="modal_action"
                    value="approve"
                    checked={action === 'approve'}
                    onChange={() => setAction('approve')}
                    className="h-3.5 w-3.5 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-900">Утвердить</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="modal_action"
                    value="cancel"
                    checked={action === 'cancel'}
                    onChange={() => setAction('cancel')}
                    className="h-3.5 w-3.5 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-900">Отменить утверждение</span>
                </label>
              </div>
            </fieldset>

            {/* Кнопки ОК и Выход */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={handleApply}
                className="h-7 px-6 text-xs bg-[#e1e1e1] hover:bg-[#d4d4d4] text-slate-900 border border-slate-400 rounded-none shadow-xs font-normal focus:ring-1 focus:ring-blue-600"
              >
                ОК
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-7 px-5 text-xs bg-[#e1e1e1] hover:bg-[#d4d4d4] text-slate-900 border border-slate-400 rounded-none shadow-xs font-normal"
              >
                Выход
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
