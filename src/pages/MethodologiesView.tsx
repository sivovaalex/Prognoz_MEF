import { useState, useMemo, useEffect } from 'react';
import type { RoleId } from '@/lib/types';
import { useStore } from '@/lib/store';
import { CURRENT_OMSU } from '@/lib/data';
import {
  type MethodologyFile,
  type TerritoryApprovalState,
  INITIAL_METHODOLOGY_FILES,
  METHODOLOGY_ROWS,
  getDefaultTerritoryState,
} from '@/lib/methodologiesData';
import { SignDialog } from '@/components/SignDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FileText,
  Download,
  Search,
  CheckCircle2,
  Undo2,
  Lock,
  AlertTriangle,
  Flag,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Plus,
  Send,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Save,
} from 'lucide-react';

interface Props {
  activeTab?: 'list' | 'acknowledgment';
  onTabChange?: (tab: 'list' | 'acknowledgment') => void;
  role: RoleId;
  currentOmsuId?: string;
}

const STORAGE_KEY_METHOD_STATE = 'prognoz_mef_methodology_territory_states';
const STORAGE_KEY_METHOD_FILES = 'prognoz_mef_methodology_files';

export function MethodologiesView({
  activeTab = 'list',
  onTabChange,
  role,
  currentOmsuId = CURRENT_OMSU,
}: Props) {
  const { state, dispatch } = useStore();

  // Внутренняя вкладка, если не управляется извне
  const [tab, setTab] = useState<'list' | 'acknowledgment'>(activeTab);
  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  const handleTabSwitch = (t: 'list' | 'acknowledgment') => {
    setTab(t);
    if (onTabChange) onTabChange(t);
  };

  // Список файлов методик с сохранением в localStorage
  const [methodFiles, setMethodFiles] = useState<MethodologyFile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_METHOD_FILES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_METHODOLOGY_FILES;
  });

  // Состояние согласования по территориям с сохранением в localStorage
  const [territoryStates, setTerritoryStates] = useState<Record<string, Record<string, TerritoryApprovalState>>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_METHOD_STATE);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      m1: getDefaultTerritoryState('m1'),
    };
  });

  const saveTerritoryStates = (newStates: Record<string, Record<string, TerritoryApprovalState>>) => {
    setTerritoryStates(newStates);
    try {
      localStorage.setItem(STORAGE_KEY_METHOD_STATE, JSON.stringify(newStates));
    } catch (e) {
      console.error(e);
    }
  };

  // Активная территория для таблицы согласования (по умолчанию Балашиха m1 или выбранная ОМСУ)
  const [selectedMunId, setSelectedMunId] = useState<string>(role === 'omsu' ? currentOmsuId : 'm1');

  useEffect(() => {
    if (role === 'omsu' && currentOmsuId) {
      setSelectedMunId(currentOmsuId);
    }
  }, [role, currentOmsuId]);

  // Получить или инициализировать состояние для выбранной территории
  const currentTerritoryMap = useMemo(() => {
    if (territoryStates[selectedMunId]) {
      return territoryStates[selectedMunId];
    }
    const def = getDefaultTerritoryState(selectedMunId);
    return def;
  }, [territoryStates, selectedMunId]);

  // Название выбранного муниципалитета
  const selectedMunName = useMemo(() => {
    return state.omsus.find((m) => m.id === selectedMunId)?.name || 'Балашиха';
  }, [state.omsus, selectedMunId]);

  // Фильтры вкладки "Список методик"
  const [fileSearch, setFileSearch] = useState('');
  const [fileDirectionFilter, setFileDirectionFilter] = useState('all');
  const [fileCioFilter, setFileCioFilter] = useState('all');

  // Фильтры вкладки "Форма отметки ознакомления"
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Состояние модальных окон
  const [previewFile, setPreviewFile] = useState<MethodologyFile | null>(null);
  const [signTargetRowId, setSignTargetRowId] = useState<string | null>(null);
  const [batchSignConfirm, setBatchSignConfirm] = useState(false);
  const [returnTarget, setReturnTarget] = useState<{ rowId: string; rowName: string } | null>(null);
  const [returnComment, setReturnComment] = useState('');
  const [editingOmsuComment, setEditingOmsuComment] = useState<{ rowId: string; text: string } | null>(null);
  const [editingCioComment, setEditingCioComment] = useState<{ rowId: string; text: string } | null>(null);
  const [addFileOpen, setAddFileOpen] = useState(false);
  const [newFileForm, setNewFileForm] = useState({
    title: '',
    num: '',
    fileName: '',
    cioName: 'Минтер',
    direction: 'Коммуникация и политика',
    orderNum: 'Распоряжение МЭФ МО № 14-Р',
    description: '',
    formula: '',
  });

  // Фильтрация файлов методик
  const filteredFiles = useMemo(() => {
    return methodFiles.filter((f) => {
      if (fileSearch.trim()) {
        const q = fileSearch.toLowerCase();
        const matchTitle = f.title.toLowerCase().includes(q);
        const matchFile = f.fileName.toLowerCase().includes(q);
        const matchNum = f.num.toLowerCase().includes(q);
        const matchCio = f.cioName.toLowerCase().includes(q);
        if (!matchTitle && !matchFile && !matchNum && !matchCio) return false;
      }
      if (fileDirectionFilter !== 'all' && f.direction !== fileDirectionFilter) return false;
      if (fileCioFilter !== 'all' && f.cioId !== fileCioFilter) return false;
      return true;
    });
  }, [methodFiles, fileSearch, fileDirectionFilter, fileCioFilter]);

  // Фильтрация строк таблицы согласования
  const filteredRows = useMemo(() => {
    return METHODOLOGY_ROWS.filter((r) => {
      if (r.isGroup) return true;
      const stateItem = currentTerritoryMap[r.id];
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchNum = r.num.toLowerCase().includes(q);
        const matchCio = (r.cioName || '').toLowerCase().includes(q);
        const matchComment = (stateItem?.omsuComment || '').toLowerCase().includes(q);
        if (!matchName && !matchNum && !matchCio && !matchComment) return false;
      }
      if (tableStatusFilter !== 'all') {
        const st = stateItem?.status || 'draft';
        if (tableStatusFilter === 'approved' && st !== 'approved') return false;
        if (tableStatusFilter === 'pending_cio' && st !== 'pending_cio') return false;
        if (tableStatusFilter === 'returned' && st !== 'returned') return false;
        if (tableStatusFilter === 'draft' && st !== 'draft' && st !== 'not_filled') return false;
      }
      return true;
    });
  }, [currentTerritoryMap, tableSearch, tableStatusFilter]);

  // Статистика согласования по выбранной территории
  const stats = useMemo(() => {
    const fillable = METHODOLOGY_ROWS.filter((r) => !r.isGroup);
    let approved = 0;
    let pending = 0;
    let returned = 0;
    let draft = 0;

    fillable.forEach((r) => {
      const st = currentTerritoryMap[r.id]?.status || 'draft';
      if (st === 'approved') approved++;
      else if (st === 'pending_cio') pending++;
      else if (st === 'returned') returned++;
      else draft++;
    });

    return {
      total: fillable.length,
      approved,
      pending,
      returned,
      draft,
      pct: Math.round((approved / (fillable.length || 1)) * 100),
    };
  }, [currentTerritoryMap]);

  // Действие: Обновить строку согласования для текущей территории
  const updateRowState = (rowId: string, patch: Partial<TerritoryApprovalState>) => {
    const prevMunState = currentTerritoryMap;
    const prevItem = prevMunState[rowId] || {
      status: 'draft',
      omsuComment: '',
      targetValue: 'согласовано',
      cioComment: '',
    };

    const newMunState = {
      ...prevMunState,
      [rowId]: {
        ...prevItem,
        ...patch,
      },
    };

    saveTerritoryStates({
      ...territoryStates,
      [selectedMunId]: newMunState,
    });
  };

  // ОМСУ: Отправка на согласование (после ЭЦП)
  const handleOmsuSignAndSend = (rowId: string) => {
    updateRowState(rowId, {
      status: 'pending_cio',
      signedBy: role === 'omsu' ? `Иванова А.П. (${selectedMunName})` : 'Ответственный сотрудник ОМСУ',
      signedAt: new Date().toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }),
    });
    dispatch({
      type: 'NOTIFY',
      text: `Методика показателя направлена на рассмотрение в отраслевой ЦИО (${selectedMunName})`,
      forRoles: ['cio', 'mef', 'admin'],
    });
  };

  // ОМСУ: Пакетное подписание всех методик
  const handleBatchSign = () => {
    const prevMunState = { ...currentTerritoryMap };
    const dateStr = new Date().toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
    const actorStr = role === 'omsu' ? `Иванова А.П. (${selectedMunName})` : 'Ответственный сотрудник ОМСУ';

    METHODOLOGY_ROWS.forEach((r) => {
      if (!r.isGroup) {
        const item = prevMunState[r.id] || {
          status: 'draft',
          omsuComment: '',
          targetValue: 'согласовано',
          cioComment: '',
        };
        if (item.status === 'draft' || item.status === 'returned' || item.status === 'not_filled') {
          prevMunState[r.id] = {
            ...item,
            status: 'pending_cio',
            signedBy: actorStr,
            signedAt: dateStr,
          };
        }
      }
    });

    saveTerritoryStates({
      ...territoryStates,
      [selectedMunId]: prevMunState,
    });

    dispatch({
      type: 'NOTIFY',
      text: `ОМСУ ${selectedMunName} направил полный пакет методик (все разделы) на согласование в ЦИО`,
      forRoles: ['cio', 'mef', 'admin'],
    });
  };

  // ОМСУ: Отозвать проект методики из ЦИО
  const handleOmsuRecall = (rowId: string) => {
    updateRowState(rowId, {
      status: 'draft',
    });
    dispatch({
      type: 'NOTIFY',
      text: `ОМСУ ${selectedMunName} отозвал методику для внесения замечаний`,
      forRoles: ['omsu', 'cio', 'mef'],
    });
  };

  // ЦИО / МЭФ / Admin: Согласовать методику
  const handleCioApprove = (rowId: string) => {
    const actor = role === 'cio' ? 'Отраслевой ЦИО МО' : role === 'mef' ? 'Куратор МЭФ МО' : 'Администратор системы';
    updateRowState(rowId, {
      status: 'approved',
      approvedBy: actor,
      approvedAt: new Date().toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }),
      targetValue: 'согласовано',
    });
    dispatch({
      type: 'NOTIFY',
      text: `Методика согласована (${selectedMunName})`,
      forRoles: ['omsu', 'mef', 'admin'],
    });
  };

  // ЦИО: Пакетное согласование курируемых методик
  const handleBatchCioApprove = () => {
    const prevMunState = { ...currentTerritoryMap };
    const dateStr = new Date().toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
    const actorStr = role === 'cio' ? 'Отраслевой ЦИО МО' : 'Куратор МЭФ МО';

    METHODOLOGY_ROWS.forEach((r) => {
      if (!r.isGroup) {
        const item = prevMunState[r.id];
        if (item && (item.status === 'pending_cio' || item.status === 'draft')) {
          prevMunState[r.id] = {
            ...item,
            status: 'approved',
            approvedBy: actorStr,
            approvedAt: dateStr,
            targetValue: item.targetValue || 'согласовано',
          };
        }
      }
    });

    saveTerritoryStates({
      ...territoryStates,
      [selectedMunId]: prevMunState,
    });

    dispatch({
      type: 'NOTIFY',
      text: `Методики согласованы для муниципального образования ${selectedMunName}`,
      forRoles: ['omsu', 'cio', 'mef', 'admin'],
    });
  };

  // ЦИО / МЭФ: Возврат с замечанием
  const handleCioReturn = () => {
    if (!returnTarget || !returnComment.trim()) return;
    updateRowState(returnTarget.rowId, {
      status: 'returned',
      cioComment: returnComment.trim(),
      returnedBy: role === 'cio' ? 'Отраслевой ЦИО МО' : 'Куратор МЭФ МО',
      returnedAt: new Date().toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }),
    });
    dispatch({
      type: 'NOTIFY',
      text: `Методика возвращена ОМСУ ${selectedMunName} с замечанием: "${returnComment.slice(0, 50)}..."`,
      forRoles: ['omsu', 'cio', 'mef'],
    });
    setReturnTarget(null);
    setReturnComment('');
  };

  // Экспорт таблицы в Excel (CSV с поддержкой кириллицы UTF-8 BOM)
  const handleExportCsv = () => {
    const headers = [
      '№',
      'Наименование показателя / методики',
      'Отраслевой ЦИО',
      'Статус согласования',
      'Комментарий ОМСУ',
      'Целевое (плановое) значение',
      'Комментарий ЦИО',
      'Подписано ОМСУ',
      'Согласовано ЦИО',
    ];

    const rows = METHODOLOGY_ROWS.map((r) => {
      if (r.isGroup) {
        return [r.num, `[РАЗДЕЛ] ${r.name}`, '', '', '', '', '', '', ''];
      }
      const item = currentTerritoryMap[r.id] || {
        status: 'draft',
        omsuComment: '',
        targetValue: '',
        cioComment: '',
      };
      const statusLabel =
        item.status === 'approved'
          ? 'Согласовано'
          : item.status === 'pending_cio'
          ? 'На согласовании ЦИО'
          : item.status === 'returned'
          ? 'Возвращено на доработку'
          : 'Ознакомление';

      return [
        r.num,
        r.name,
        r.cioName || '',
        statusLabel,
        `"${(item.omsuComment || '').replace(/"/g, '""')}"`,
        `"${(item.targetValue || '').replace(/"/g, '""')}"`,
        `"${(item.cioComment || '').replace(/"/g, '""')}"`,
        item.signedBy ? `${item.signedBy} (${item.signedAt || ''})` : '',
        item.approvedBy ? `${item.approvedBy} (${item.approvedAt || ''})` : '',
      ];
    });

    const csvContent =
      '\uFEFF' +
      `"Согласование методик муниципальными образованиями - ${selectedMunName}"\n` +
      `"Дата формирования: ${new Date().toLocaleDateString('ru-RU')}"\n\n` +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Согласование_методик_${selectedMunName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Имитация скачивания файла методики
  const handleDownloadFile = (file: MethodologyFile) => {
    const textContent =
      `МОСКОВСКАЯ ОБЛАСТЬ\n` +
      `МИНИСТЕРСТВО ЭКОНОМИКИ И ФИНАНСОВ МОСКОВСКОЙ ОБЛАСТИ\n\n` +
      `ОФИЦИАЛЬНАЯ МЕТОДИКА РАСЧЕТА ПОКАЗАТЕЛЯ РЕЙТИНГА ОМСУ\n` +
      `------------------------------------------------------------------\n` +
      `Наименование: ${file.title}\n` +
      `Номер / шифр: ${file.num}\n` +
      `Отраслевой орган: ${file.cioName}\n` +
      `Направление: ${file.direction}\n` +
      `Утверждено: ${file.orderNum} от ${file.approvedDate} (${file.revision})\n` +
      `Формула расчета: ${file.formula}\n` +
      `Единица измерения: ${file.unit || 'балл'}\n` +
      `Критерий оценки: ${file.targetCriteria || '—'}\n\n` +
      `ОПИСАНИЕ И ПОРЯДОК РАСЧЕТА:\n${file.description}\n\n` +
      `Документ размещен в государственной автоматизированной информационной системе\n` +
      `ГАС «Управление» Московской области. Редакция актуальна на 2026 отчетный год.`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', file.fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Добавление новой методики (для Admin / MEF)
  const handleCreateMethodFile = () => {
    if (!newFileForm.title.trim() || !newFileForm.fileName.trim()) return;
    const newFile: MethodologyFile = {
      id: `method-custom-${Date.now()}`,
      num: newFileForm.num || `${methodFiles.length + 1}.`,
      title: newFileForm.title.trim(),
      fileName: newFileForm.fileName.endsWith('.pdf') ? newFileForm.fileName : `${newFileForm.fileName}.pdf`,
      fileSize: '1.50 МБ',
      fileType: 'pdf',
      cioId: 'custom',
      cioName: newFileForm.cioName,
      direction: newFileForm.direction,
      approvedDate: new Date().toLocaleDateString('ru-RU'),
      orderNum: newFileForm.orderNum,
      revision: 'ред. 2026',
      description: newFileForm.description || 'Утвержденная методика расчета показателя.',
      formula: newFileForm.formula || 'Базовый алгоритм',
      unit: 'балл',
    };

    const updated = [newFile, ...methodFiles];
    setMethodFiles(updated);
    try {
      localStorage.setItem(STORAGE_KEY_METHOD_FILES, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setAddFileOpen(false);
    setNewFileForm({
      title: '',
      num: '',
      fileName: '',
      cioName: 'Минтер',
      direction: 'Коммуникация и политика',
      orderNum: 'Распоряжение МЭФ МО № 14-Р',
      description: '',
      formula: '',
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Заголовок и хлебные крошки в стиле ГАСУ МО ───────────────────────── */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-800">
              Мониторинг показателей развития Московской области
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Московская область</span>
              <span>/</span>
              <span>Ключевые показатели оценки деятельности ОМСУ</span>
              <span>/</span>
              <span className="font-medium text-slate-700">Методология</span>
              <span>/</span>
              <span className="text-[#1e5c8f] font-semibold">
                {tab === 'acknowledgment' ? 'Форма отметки ознакомления с методиками' : 'Реестр файлов с методиками'}
              </span>
            </div>
          </div>

          {/* Вкладки переключения между списком методик и таблицей ознакомления */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 border">
            <button
              onClick={() => handleTabSwitch('list')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                tab === 'list'
                  ? 'bg-white text-[#1e5c8f] shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Методики (Файлы)</span>
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {methodFiles.length}
              </Badge>
            </button>
            <button
              onClick={() => handleTabSwitch('acknowledgment')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                tab === 'acknowledgment'
                  ? 'bg-white text-[#1e5c8f] shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flag className="h-3.5 w-3.5 text-green-600" />
              <span>Форма отметки ознакомления</span>
              <Badge
                variant="outline"
                className={`ml-1 h-4 px-1 text-[10px] ${
                  stats.approved === stats.total ? 'border-green-400 text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'
                }`}
              >
                {stats.approved}/{stats.total}
              </Badge>
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ВКЛАДКА 1: СПИСОК ГИПЕРССЫЛОК НА ФАЙЛЫ С МЕТОДИКАМИ
          ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'list' && (
        <div className="space-y-4">
          {/* Информационный баннер */}
          <div className="flex items-start justify-between gap-4 rounded-lg border border-sky-200 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50/40 p-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-base">
                  Реестр нормативно-утвержденных методик расчета показателей Рейтинга ОМСУ
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-3xl">
                  В разделе размещены действующие редакции нормативно-правовых актов, распоряжений МЭФ МО и отраслевых ЦИО,
                  содержащие утвержденные математические формулы, шкалы оценивания, регламенты верификации и правила согласования целевых значений.
                  Кликните по гиперссылке на файл для скачивания документа или перехода к форме отметки ознакомления.
                </p>
              </div>
            </div>

            {(role === 'admin' || role === 'mef') && (
              <Button
                size="sm"
                className="bg-[#1e5c8f] hover:bg-[#174871] text-white shrink-0 text-xs gap-1.5 shadow-sm"
                onClick={() => setAddFileOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Добавить методику</span>
              </Button>
            )}
          </div>

          {/* Панель поиска и фильтров */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3 shadow-sm">
            <div className="flex flex-1 items-center gap-2 min-w-[260px] max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Поиск по названию, шифру, ЦИО или имени файла..."
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              {fileSearch && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setFileSearch('')}
                  className="h-9 px-2 text-xs"
                >
                  Сбросить
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-muted-foreground font-medium">Направление:</span>
              <Select value={fileDirectionFilter} onValueChange={setFileDirectionFilter}>
                <SelectTrigger className="h-9 w-[200px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все направления</SelectItem>
                  <SelectItem value="Коммуникация и политика">Коммуникация и политика</SelectItem>
                  <SelectItem value="Государственные задачи">Государственные задачи</SelectItem>
                  <SelectItem value="Безопасность">Безопасность</SelectItem>
                  <SelectItem value="Физическая культура и спорт">Физическая культура и спорт</SelectItem>
                  <SelectItem value="Благоустройство и ЖКХ">Благоустройство и ЖКХ</SelectItem>
                  <SelectItem value="Транспортная инфраструктура">Транспорт</SelectItem>
                  <SelectItem value="Экономика и инвестиции">Экономика</SelectItem>
                  <SelectItem value="Общие нормативные акты">Общие акты</SelectItem>
                </SelectContent>
              </Select>

              <span className="text-muted-foreground font-medium ml-2">ЦИО:</span>
              <Select value={fileCioFilter} onValueChange={setFileCioFilter}>
                <SelectTrigger className="h-9 w-[150px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все ведомства</SelectItem>
                  <SelectItem value="minter">Минтер</SelectItem>
                  <SelectItem value="mimp">МИМП</SelectItem>
                  <SelectItem value="gurb">ГУРБ</SelectItem>
                  <SelectItem value="minsport">Минспорт</SelectItem>
                  <SelectItem value="minchistoty">Минчистоты</SelectItem>
                  <SelectItem value="mtdi">Минтранс</SelectItem>
                  <SelectItem value="mii">МИИ</SelectItem>
                  <SelectItem value="mef">МЭФ МО</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Список файлов методик (карточки и табличный вид) */}
          <div className="grid gap-3 md:grid-cols-2">
            {filteredFiles.map((f) => (
              <Card key={f.id} className="overflow-hidden border-slate-200 hover:border-sky-300 hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 border border-red-200 mt-0.5">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-[#1e5c8f] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                            {f.num}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 line-clamp-1">
                            {f.title}
                          </span>
                        </div>

                        {/* Гиперссылка на файл с методикой */}
                        <a
                          href="#download"
                          onClick={(e) => {
                            e.preventDefault();
                            handleDownloadFile(f);
                          }}
                          title={`Скачать официальный файл: ${f.fileName}`}
                          className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-900 hover:underline break-all group"
                        >
                          <Download className="h-3.5 w-3.5 shrink-0 text-sky-600 transition-transform group-hover:translate-y-0.5" />
                          <span className="font-mono text-[11px] font-semibold">{f.fileName}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">({f.fileSize})</span>
                        </a>

                        <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {f.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-muted-foreground flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                        {f.cioName}
                      </Badge>
                      <span className="text-slate-400">·</span>
                      <span>{f.orderNum}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPreviewFile(f)}
                        className="h-7 px-2 text-xs text-slate-700 hover:text-blue-700"
                        title="Подробная информация о методике и формуле"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Паспорт
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          handleTabSwitch('acknowledgment');
                          setTableSearch(f.num.replace('.', ''));
                        }}
                        className="h-7 px-2 text-xs text-sky-700 border-sky-200 hover:bg-sky-50"
                        title="Перейти к форме согласования данной методики"
                      >
                        <Flag className="h-3 w-3 mr-1 text-green-600" />
                        К согласованию
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ВКЛАДКА 2: ФОРМА ОТМЕТКИ ОЗНАКОМЛЕНИЯ С МЕТОДИКАМИ (КАК НА СКРИНЕ)
          ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'acknowledgment' && (
        <div className="space-y-3">
          {/* Верхняя инструментальная панель (в точном стиле скрина) */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-lg border border-b-0 bg-[#f8fafc] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-[#2e7d32] hover:bg-[#256629] text-white text-xs h-8 font-medium shadow-sm gap-1.5"
                onClick={handleExportCsv}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Регламентный отчет</span>
              </Button>

              <div className="flex items-center gap-1 border-l pl-2 ml-1 text-slate-600">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="h-8 w-8 text-slate-600 hover:text-slate-900"
                  onClick={handleExportCsv}
                  title="Экспорт в Excel (CSV/XLS)"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="h-8 w-8 text-slate-600 hover:text-slate-900"
                  onClick={() => window.print()}
                  title="Печать таблицы"
                >
                  <Printer className="h-4 w-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="h-8 w-8 text-slate-600 hover:text-slate-900"
                  onClick={() => {
                    const fresh = getDefaultTerritoryState(selectedMunId);
                    saveTerritoryStates({
                      ...territoryStates,
                      [selectedMunId]: fresh,
                    });
                  }}
                  title="Сбросить состояние к демо-образцу со скрина"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Пакетные действия по согласованию с адаптацией под рабочие места */}
              {role === 'omsu' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-green-300 bg-green-50 text-green-800 hover:bg-green-100 font-semibold gap-1.5"
                  onClick={() => setBatchSignConfirm(true)}
                  disabled={stats.approved === stats.total}
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-green-700" />
                  <span>Согласовать все методики (с ЭЦП)</span>
                </Button>
              )}

              {(role === 'cio' || role === 'mef' || role === 'admin') && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-green-300 bg-green-50 text-green-800 hover:bg-green-100 font-semibold gap-1.5"
                  onClick={handleBatchCioApprove}
                  disabled={stats.approved === stats.total}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-700" />
                  <span>Согласовать выбранные методики</span>
                </Button>
              )}
            </div>
          </div>

          {/* Основная рабочая зона с боковой панелью фильтрации и таблицей */}
          <div className="flex flex-col lg:flex-row items-start gap-4">
            {/* Боковая панель «Элементы управления» */}
            <div
              className={`transition-all duration-200 shrink-0 ${
                isSidebarOpen ? 'w-full lg:w-64' : 'w-full lg:w-10'
              }`}
            >
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                  {isSidebarOpen && <span>Элементы управления</span>}
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors"
                    title={isSidebarOpen ? 'Свернуть панель' : 'Развернуть панель'}
                  >
                    {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>

                {isSidebarOpen && (
                  <div className="p-3 space-y-4 text-xs">
                    {/* Селектор территории */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Территория
                      </label>
                      <Select
                        value={selectedMunId}
                        onValueChange={(val) => setSelectedMunId(val)}
                        disabled={role === 'omsu'} // ОМСУ жестко привязан к своему муниципалитету
                      >
                        <SelectTrigger className="h-8 text-xs bg-slate-50">
                          <SelectValue placeholder="Выберите ОМСУ" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {state.omsus.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name} {m.isZato ? '(ЗАТО)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {role === 'omsu' && (
                        <p className="mt-1 text-[10px] text-muted-foreground italic">
                          Режим личного кабинета ОМСУ: выбор зафиксирован.
                        </p>
                      )}
                    </div>

                    {/* Фильтр по статусу */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Статус согласования
                      </label>
                      <Select value={tableStatusFilter} onValueChange={setTableStatusFilter}>
                        <SelectTrigger className="h-8 text-xs bg-slate-50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все статусы ({stats.total})</SelectItem>
                          <SelectItem value="approved">Согласовано ({stats.approved})</SelectItem>
                          <SelectItem value="pending_cio">На согласовании ЦИО ({stats.pending})</SelectItem>
                          <SelectItem value="returned">На доработке ({stats.returned})</SelectItem>
                          <SelectItem value="draft">Ознакомление ({stats.draft})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Поиск по показателям */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Поиск по строкам
                      </label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          type="text"
                          placeholder="№ или название..."
                          value={tableSearch}
                          onChange={(e) => setTableSearch(e.target.value)}
                          className="pl-7 h-8 text-xs"
                        />
                      </div>
                    </div>

                    {/* Сводная сводка выполнения */}
                    <div className="rounded border bg-slate-50/70 p-2.5 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-800 flex justify-between">
                        <span>Прогресс согласования:</span>
                        <span className="text-green-700 font-mono">{stats.pct}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-600 transition-all duration-300"
                          style={{ width: `${stats.pct}%` }}
                        />
                      </div>
                      <div className="pt-1 flex flex-col gap-1 text-[10px] text-slate-600">
                        <div className="flex justify-between">
                          <span>Всего показателей:</span>
                          <span className="font-semibold">{stats.total}</span>
                        </div>
                        <div className="flex justify-between text-green-700 font-medium">
                          <span>Согласовано:</span>
                          <span>{stats.approved}</span>
                        </div>
                        <div className="flex justify-between text-amber-700 font-medium">
                          <span>На согласовании ЦИО:</span>
                          <span>{stats.pending}</span>
                        </div>
                        {stats.returned > 0 && (
                          <div className="flex justify-between text-red-700 font-medium">
                            <span>С замечаниями:</span>
                            <span>{stats.returned}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Главный блок таблицы (как на скрине) */}
            <div className="flex-1 min-w-0 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b bg-[#fafafa] px-4 py-3">
                <h3 className="text-base font-bold text-slate-900">
                  Согласование методик муниципальными образованиями
                </h3>
                <div className="mt-0.5 text-xs text-slate-600 font-medium">
                  Территория: <span className="text-slate-900 font-bold underline decoration-sky-400">{selectedMunName}</span>
                </div>
              </div>

              {/* Таблица */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#f2efe9] text-slate-800 border-b border-slate-300 font-semibold text-center select-none">
                      <th className="p-2.5 text-left border-r border-slate-300 min-w-[280px] w-[30%]">
                        № и наименование показателя / методики
                      </th>
                      <th className="p-2.5 border-r border-slate-300 min-w-[170px] w-[18%]">
                        <div>Согласование проекта Методики</div>
                        <div className="text-[10px] font-normal text-slate-600">(слово "согласовано" и флажок)</div>
                      </th>
                      <th className="p-2.5 border-r border-slate-300 min-w-[220px] w-[22%]">
                        Комментарий ОМСУ
                      </th>
                      <th className="p-2.5 border-r border-slate-300 min-w-[130px] w-[12%]">
                        Целевое (плановое) значение
                      </th>
                      <th className="p-2.5 border-r border-slate-300 min-w-[240px] w-[24%]">
                        Комментарий ЦИО
                      </th>
                      <th className="p-2.5 min-w-[90px] w-[8%] text-center">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r) => {
                      // Строка-раздел (группа)
                      if (r.isGroup) {
                        return (
                          <tr key={r.id} className="border-b border-slate-300 bg-[#f9f8f5] font-semibold">
                            <td className="p-2.5 text-slate-900 flex items-center gap-1.5 border-r border-slate-300">
                              <span className="text-amber-600">
                                <AlertTriangle className="h-4 w-4" />
                              </span>
                              <span>
                                {r.num} {r.name}
                              </span>
                            </td>
                            <td className="p-2.5 border-r border-slate-300 text-center text-slate-500">—</td>
                            <td className="p-2.5 border-r border-slate-300 text-slate-500">—</td>
                            <td className="p-2.5 border-r border-slate-300 text-center text-slate-500">—</td>
                            <td className="p-2.5 border-r border-slate-300 text-slate-500">—</td>
                            <td className="p-2.5 text-center text-slate-400">—</td>
                          </tr>
                        );
                      }

                      const itemState = currentTerritoryMap[r.id] || {
                        status: 'draft',
                        omsuComment: '',
                        targetValue: 'согласовано',
                        cioComment: '',
                      };

                      const isApproved = itemState.status === 'approved';
                      const isPending = itemState.status === 'pending_cio';
                      const isReturned = itemState.status === 'returned';
                      const isDraft = itemState.status === 'draft' || itemState.status === 'not_filled';

                      // Доступность редактирования комментария ОМСУ
                      const canOmsuEdit = role === 'omsu' || role === 'admin';
                      const isOmsuLocked = isApproved;

                      // Доступность редактирования ответа ЦИО
                      const canCioEdit = role === 'cio' || role === 'mef' || role === 'admin';

                      // Связанный файл методики
                      const linkedFile = methodFiles.find((f) => f.id === r.methodologyFileId);

                      return (
                        <tr
                          key={r.id}
                          className={`border-b border-slate-200 hover:bg-slate-50/80 transition-colors align-top ${
                            isApproved ? 'bg-white' : isPending ? 'bg-amber-50/20' : isReturned ? 'bg-red-50/20' : ''
                          }`}
                        >
                          {/* Колонка 1: Наименование показателя и ссылка на файл */}
                          <td className="p-2.5 border-r border-slate-200">
                            <div className={r.level === 2 ? 'pl-4' : ''}>
                              <div className="font-medium text-slate-900 leading-snug">
                                <span>{r.num} </span>
                                <span>{r.name}</span>
                                {r.cioName && (
                                  <span className="text-slate-600 font-normal"> ({r.cioName})</span>
                                )}
                              </div>

                              {linkedFile && (
                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                  <a
                                    href="#preview"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setPreviewFile(linkedFile);
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] text-sky-700 hover:text-sky-900 hover:underline"
                                    title="Просмотреть паспорт и формулу методики"
                                  >
                                    <FileText className="h-3 w-3 text-sky-600" />
                                    <span>{linkedFile.fileName}</span>
                                  </a>
                                  <button
                                    onClick={() => handleDownloadFile(linkedFile)}
                                    title="Скачать файл методики"
                                    className="text-slate-400 hover:text-slate-700"
                                  >
                                    <Download className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Колонка 2: Согласование проекта Методики (слово "согласовано" и флажок как на скрине) */}
                          <td className="p-2.5 border-r border-slate-200 text-center align-middle">
                            {isApproved ? (
                              <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded bg-green-50 border border-green-200 cursor-help">
                                      {/* Зеленый флажок как на скрине */}
                                      <Flag className="h-4 w-4 text-green-600 fill-green-600" />
                                      <span className="font-semibold text-green-800 text-xs">Согласовано</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs max-w-xs">
                                    <div><b>Согласовано ЦИО</b></div>
                                    <div>Кем: {itemState.approvedBy || 'Отраслевой ЦИО МО'}</div>
                                    <div>Дата: {itemState.approvedAt || '03.08.2026'}</div>
                                    {itemState.signedBy && (
                                      <div className="mt-1 pt-1 border-t text-[10px] text-slate-300">
                                        Подписано ОМСУ: {itemState.signedBy} ({itemState.signedAt})
                                      </div>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : isPending ? (
                              <div className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded bg-amber-50 border border-amber-300 text-amber-800">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                <span className="font-medium text-[11px]">На согласовании</span>
                              </div>
                            ) : isReturned ? (
                              <div className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded bg-red-50 border border-red-300 text-red-800">
                                <Undo2 className="h-3.5 w-3.5 text-red-600 shrink-0" />
                                <span className="font-medium text-[11px]">На доработке</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-600">
                                <span className="text-[11px]">Ознакомление</span>
                              </div>
                            )}
                          </td>

                          {/* Колонка 3: Комментарий ОМСУ */}
                          <td className="p-2.5 border-r border-slate-200">
                            {editingOmsuComment?.rowId === r.id ? (
                              <div className="space-y-1.5">
                                <Textarea
                                  value={editingOmsuComment.text}
                                  onChange={(e) =>
                                    setEditingOmsuComment({ rowId: r.id, text: e.target.value })
                                  }
                                  placeholder="Введите замечания или предложения по методике..."
                                  rows={3}
                                  className="text-xs bg-white"
                                />
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingOmsuComment(null)}
                                    className="h-6 px-2 text-[10px]"
                                  >
                                    Отмена
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      updateRowState(r.id, {
                                        omsuComment: editingOmsuComment.text.trim(),
                                      });
                                      setEditingOmsuComment(null);
                                    }}
                                    className="h-6 px-2 text-[10px] bg-sky-700 text-white hover:bg-sky-800"
                                  >
                                    <Save className="h-3 w-3 mr-1" /> Сохранить
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="group relative min-h-[30px]">
                                {itemState.omsuComment ? (
                                  <div className="text-slate-800 leading-relaxed whitespace-pre-wrap text-[11px]">
                                    {itemState.omsuComment}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">—</span>
                                )}

                                {canOmsuEdit && !isOmsuLocked && (
                                  <button
                                    onClick={() =>
                                      setEditingOmsuComment({
                                        rowId: r.id,
                                        text: itemState.omsuComment || '',
                                      })
                                    }
                                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-sky-700 hover:text-sky-900 text-[10px] underline"
                                  >
                                    {itemState.omsuComment ? 'изменить' : '+ добавить комментарий'}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Колонка 4: Целевое (плановое) значение */}
                          <td className="p-2.5 border-r border-slate-200 text-center">
                            <span className="font-medium text-slate-800 text-[11px]">
                              {itemState.targetValue || 'согласовано'}
                            </span>
                          </td>

                          {/* Колонка 5: Комментарий ЦИО */}
                          <td className="p-2.5 border-r border-slate-200">
                            {editingCioComment?.rowId === r.id ? (
                              <div className="space-y-1.5">
                                <Textarea
                                  value={editingCioComment.text}
                                  onChange={(e) =>
                                    setEditingCioComment({ rowId: r.id, text: e.target.value })
                                  }
                                  placeholder="Введите ответ или обоснование отраслевого ЦИО..."
                                  rows={4}
                                  className="text-xs bg-white"
                                />
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingCioComment(null)}
                                    className="h-6 px-2 text-[10px]"
                                  >
                                    Отмена
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      updateRowState(r.id, {
                                        cioComment: editingCioComment.text.trim(),
                                      });
                                      setEditingCioComment(null);
                                    }}
                                    className="h-6 px-2 text-[10px] bg-green-700 text-white hover:bg-green-800"
                                  >
                                    <Save className="h-3 w-3 mr-1" /> Сохранить
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="group relative min-h-[30px]">
                                {itemState.cioComment ? (
                                  <div className="text-slate-800 leading-relaxed whitespace-pre-wrap text-[11px] bg-slate-50/70 p-2 rounded border border-slate-100">
                                    {itemState.cioComment}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">—</span>
                                )}

                                {canCioEdit && (
                                  <button
                                    onClick={() =>
                                      setEditingCioComment({
                                        rowId: r.id,
                                        text: itemState.cioComment || '',
                                      })
                                    }
                                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-green-700 hover:text-green-900 text-[10px] underline"
                                  >
                                    {itemState.cioComment ? 'изменить ответ' : '+ ответить от ЦИО'}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Колонка 6: Действия по согласованию (адаптация принципа рабочих мест) */}
                          <td className="p-2.5 text-center align-middle">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              {/* Кнопки ОМСУ */}
                              {(role === 'omsu' || role === 'admin') && (
                                <>
                                  {(isDraft || isReturned) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-[10px] px-2 border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 font-medium"
                                      onClick={() => setSignTargetRowId(r.id)}
                                      title="Подписать ЭЦП и направить на согласование в ЦИО"
                                    >
                                      <Send className="h-3 w-3 mr-1" />
                                      Согласовать
                                    </Button>
                                  )}

                                  {isPending && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-[10px] px-2 text-slate-600 hover:text-slate-900"
                                      onClick={() => handleOmsuRecall(r.id)}
                                      title="Отозвать на редактирование комментария"
                                    >
                                      <Undo2 className="h-3 w-3 mr-1" />
                                      Отозвать
                                    </Button>
                                  )}
                                </>
                              )}

                              {/* Кнопки ЦИО / МЭФ */}
                              {(role === 'cio' || role === 'mef' || role === 'admin') && (
                                <div className="flex items-center gap-1">
                                  {!isApproved && (
                                    <Button
                                      size="icon-sm"
                                      variant="outline"
                                      className="h-7 w-7 text-green-700 hover:bg-green-50 border-green-200"
                                      onClick={() => handleCioApprove(r.id)}
                                      title="Согласовать методику"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                  )}

                                  <Button
                                    size="icon-sm"
                                    variant="outline"
                                    className="h-7 w-7 text-red-600 hover:bg-red-50 border-red-200"
                                    onClick={() => setReturnTarget({ rowId: r.id, rowName: `${r.num} ${r.name}` })}
                                    title="Вернуть на доработку с замечанием"
                                  >
                                    <Undo2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}

                              {isApproved && (
                                <span className="text-[10px] text-green-700 flex items-center gap-0.5" title="Методика утверждена">
                                  <Lock className="h-3 w-3 text-green-600" />
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Диалог подписания ЭЦП для ОМСУ ──────────────────────────────────── */}
      <SignDialog
        open={!!signTargetRowId || batchSignConfirm}
        onOpenChange={(v) => {
          if (!v) {
            setSignTargetRowId(null);
            setBatchSignConfirm(false);
          }
        }}
        title={
          batchSignConfirm
            ? `Согласование всех методик территории ${selectedMunName} с применением ЭЦП`
            : `Согласование методики показателя ${
                METHODOLOGY_ROWS.find((r) => r.id === signTargetRowId)?.num || ''
              } с направлением в ЦИО`
        }
        onSigned={() => {
          if (batchSignConfirm) {
            handleBatchSign();
            setBatchSignConfirm(false);
          } else if (signTargetRowId) {
            handleOmsuSignAndSend(signTargetRowId);
            setSignTargetRowId(null);
          }
        }}
      />

      {/* ── Диалог возврата на доработку с замечанием ЦИО ───────────────────── */}
      <Dialog open={!!returnTarget} onOpenChange={(v) => !v && setReturnTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Возврат методики на доработку ({returnTarget?.rowName})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-slate-600">
              Укажите причину возврата и замечания отраслевого ведомства для муниципалитета <b>{selectedMunName}</b>:
            </p>
            <Textarea
              placeholder="Подробный комментарий ЦИО для ОМСУ..."
              value={returnComment}
              onChange={(e) => setReturnComment(e.target.value)}
              rows={4}
              className="text-xs"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setReturnTarget(null)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!returnComment.trim()}
              onClick={handleCioReturn}
            >
              Вернуть с замечанием
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Модальное окно паспорта / предпросмотра методики ────────────────── */}
      <Dialog open={!!previewFile} onOpenChange={(v) => !v && setPreviewFile(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {previewFile && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#1e5c8f] text-white text-[10px]">
                    {previewFile.num}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {previewFile.cioName}
                  </Badge>
                </div>
                <DialogTitle className="text-base font-bold text-slate-900 mt-1">
                  {previewFile.title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs leading-relaxed">
                <div className="rounded-lg border bg-slate-50 p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Файл документа:</span>
                      <span className="font-mono font-semibold text-sky-800">{previewFile.fileName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Размер:</span>
                      <span>{previewFile.fileSize}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Нормативный акт:</span>
                      <span className="font-medium">{previewFile.orderNum}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Дата утверждения:</span>
                      <span>{previewFile.approvedDate} ({previewFile.revision})</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-1">
                    Математическая формула расчета:
                  </h4>
                  <div className="p-3 bg-blue-50/60 rounded border border-blue-200 font-mono text-xs text-blue-950">
                    {previewFile.formula}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-1">
                    Критерий оценки и целевое значение:
                  </h4>
                  <p className="text-slate-700 bg-amber-50/40 p-2.5 rounded border border-amber-200">
                    {previewFile.targetCriteria || 'Положительная динамика относительно базового значения.'}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-1">
                    Порядок сбора и верификации:
                  </h4>
                  <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {previewFile.description}
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewFile(null)}
                >
                  Закрыть
                </Button>
                <Button
                  size="sm"
                  className="bg-[#1e5c8f] hover:bg-[#16486f] text-white gap-1.5"
                  onClick={() => handleDownloadFile(previewFile)}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Скачать файл ({previewFile.fileSize})</span>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Модальное окно добавления файла методики (Admin / MEF) ──────────── */}
      <Dialog open={addFileOpen} onOpenChange={setAddFileOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Добавление новой методики в реестр
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Номер / шифр показателя
              </label>
              <Input
                placeholder="например: 3.6."
                value={newFileForm.num}
                onChange={(e) => setNewFileForm({ ...newFileForm, num: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Наименование методики *
              </label>
              <Input
                placeholder="Методика расчета показателя..."
                value={newFileForm.title}
                onChange={(e) => setNewFileForm({ ...newFileForm, title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Имя прикрепленного файла *
                </label>
                <Input
                  placeholder="Методика_название.pdf"
                  value={newFileForm.fileName}
                  onChange={(e) => setNewFileForm({ ...newFileForm, fileName: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Отраслевой ЦИО
                </label>
                <Input
                  placeholder="Минтер, Минспорт..."
                  value={newFileForm.cioName}
                  onChange={(e) => setNewFileForm({ ...newFileForm, cioName: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Реквизиты нормативного акта
              </label>
              <Input
                placeholder="Распоряжение МЭФ МО № ... от ..."
                value={newFileForm.orderNum}
                onChange={(e) => setNewFileForm({ ...newFileForm, orderNum: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Формула расчета
              </label>
              <Input
                placeholder="Формула..."
                value={newFileForm.formula}
                onChange={(e) => setNewFileForm({ ...newFileForm, formula: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Краткое описание методики
              </label>
              <Textarea
                placeholder="Порядок расчета и верификации..."
                value={newFileForm.description}
                onChange={(e) => setNewFileForm({ ...newFileForm, description: e.target.value })}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setAddFileOpen(false)}>
              Отмена
            </Button>
            <Button
              size="sm"
              className="bg-[#1e5c8f] hover:bg-[#16486f] text-white"
              disabled={!newFileForm.title.trim() || !newFileForm.fileName.trim()}
              onClick={handleCreateMethodFile}
            >
              Добавить в реестр
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
