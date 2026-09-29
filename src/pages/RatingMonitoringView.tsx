import { useState, useMemo } from 'react';
import type { RoleId } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel,
} from '@/components/ui/select';
import {
  Calendar, Search, FileSpreadsheet,
  Building2, MapPin, CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown,
  Info
} from 'lucide-react';

export interface TerritoryMonitoringRow {
  id: string;
  name: string;
  type?: 'omsu' | 'go' | 'mr' | 'zato'; // ОМСУ (общее), ЗАТО
  isZato?: boolean;
  totalIndicators: number;
  // 3 квартал 2026: Данные МО
  moEnteredPct: number;
  moApprovedPct: number | null; // null => "—"
  // 3 квартал 2026: Ведомственные данные
  cioEnteredPct: number;
  cioApprovedPct: number | null; // null => "—"
  // Дополнительная детализация по сферам
  breakdown?: {
    direction: string;
    cio: string;
    moEntered: number;
    moApproved: number;
    cioEntered: number;
    cioApproved: number;
  }[];
}

export interface DepartmentMonitoringRow {
  id: string;
  code: string;
  name: string;
  shortName: string;
  curatedIndicatorsCount: number;
  // 3 квартал 2026: Данные МО
  moEnteredPct: number;
  moApprovedPct: number | null;
  // 3 квартал 2026: Ведомственные данные
  cioEnteredPct: number;
  cioApprovedPct: number | null;
  status: 'active' | 'completed' | 'warning';
}

// Эталонные данные из спецификации + полная база муниципалитетов МО
const INITIAL_TERRITORY_DATA: TerritoryMonitoringRow[] = [
  { id: 'm1', name: 'Балашиха', type: 'go', totalIndicators: 339, moEnteredPct: 2.61, moApprovedPct: 0.33, cioEnteredPct: 2.61, cioApprovedPct: 0.65 },
  { id: 'm2', name: 'Богородский', type: 'go', totalIndicators: 339, moEnteredPct: 2.70, moApprovedPct: 0.24, cioEnteredPct: 2.70, cioApprovedPct: 0.68 },
  { id: 'm3', name: 'Бронницы', type: 'go', totalIndicators: 339, moEnteredPct: 2.74, moApprovedPct: 0.34, cioEnteredPct: 2.74, cioApprovedPct: 0.68 },
  { id: 'm52', name: 'Власиха', type: 'zato', isZato: true, totalIndicators: 182, moEnteredPct: 0.93, moApprovedPct: 0.34, cioEnteredPct: 0.93, cioApprovedPct: 0.93 },
  { id: 'm4', name: 'Волоколамский', type: 'go', totalIndicators: 339, moEnteredPct: 2.59, moApprovedPct: 0.32, cioEnteredPct: 2.59, cioApprovedPct: 0.65 },
  { id: 'm5', name: 'Воскресенск', type: 'go', totalIndicators: 339, moEnteredPct: 2.87, moApprovedPct: 0.36, cioEnteredPct: 2.87, cioApprovedPct: 0.72 },
  { id: 'm53', name: 'Восход', type: 'zato', isZato: true, totalIndicators: 182, moEnteredPct: 0.93, moApprovedPct: null, cioEnteredPct: 0.93, cioApprovedPct: 0.93 },
  { id: 'm7', name: 'Дмитровский', type: 'go', totalIndicators: 339, moEnteredPct: 2.94, moApprovedPct: 0.25, cioEnteredPct: 2.94, cioApprovedPct: 0.71 },
  { id: 'm11', name: 'Долгопрудный', type: 'go', totalIndicators: 339, moEnteredPct: 2.68, moApprovedPct: 0.33, cioEnteredPct: 2.68, cioApprovedPct: 0.67 },
  { id: 'm8', name: 'Домодедово', type: 'go', totalIndicators: 339, moEnteredPct: 2.68, moApprovedPct: 0.29, cioEnteredPct: 2.68, cioApprovedPct: 0.67 },
  { id: 'm10', name: 'Дубна', type: 'go', totalIndicators: 339, moEnteredPct: 2.81, moApprovedPct: 0.35, cioEnteredPct: 2.81, cioApprovedPct: 0.70 },
  { id: 'm44', name: 'Егорьевск', type: 'go', totalIndicators: 339, moEnteredPct: 2.63, moApprovedPct: 0.33, cioEnteredPct: 2.63, cioApprovedPct: 0.66 },
  { id: 'm56', name: 'Жуковский', type: 'go', totalIndicators: 339, moEnteredPct: 2.76, moApprovedPct: 0.34, cioEnteredPct: 2.76, cioApprovedPct: 0.69 },
  { id: 'm49', name: 'Зарайск', type: 'go', totalIndicators: 339, moEnteredPct: 2.67, moApprovedPct: 0.33, cioEnteredPct: 2.67, cioApprovedPct: 0.67 },
  { id: 'm54', name: 'Звёздный городок', type: 'zato', isZato: true, totalIndicators: 182, moEnteredPct: 0.93, moApprovedPct: 0.33, cioEnteredPct: 0.93, cioApprovedPct: 0.93 },
  { id: 'm14', name: 'Истра', type: 'go', totalIndicators: 339, moEnteredPct: 2.61, moApprovedPct: 0.33, cioEnteredPct: 2.61, cioApprovedPct: 0.65 },
  { id: 'm50', name: 'Кашира', type: 'go', totalIndicators: 339, moEnteredPct: 2.60, moApprovedPct: 0.32, cioEnteredPct: 2.60, cioApprovedPct: 0.65 },
  { id: 'm16', name: 'Клин', type: 'go', totalIndicators: 339, moEnteredPct: 2.69, moApprovedPct: 0.34, cioEnteredPct: 2.69, cioApprovedPct: 0.67 },
  { id: 'm57', name: 'Коломна', type: 'go', totalIndicators: 339, moEnteredPct: 2.54, moApprovedPct: 0.32, cioEnteredPct: 2.54, cioApprovedPct: 0.63 },
  { id: 'm20', name: 'Королёв', type: 'go', totalIndicators: 339, moEnteredPct: 2.67, moApprovedPct: 0.33, cioEnteredPct: 2.67, cioApprovedPct: 0.67 },
  { id: 'm58', name: 'Котельники', type: 'go', totalIndicators: 339, moEnteredPct: 2.80, moApprovedPct: 0.35, cioEnteredPct: 2.80, cioApprovedPct: 0.70 },
  { id: 'm17', name: 'Красногорск', type: 'go', totalIndicators: 339, moEnteredPct: 2.59, moApprovedPct: 0.32, cioEnteredPct: 2.59, cioApprovedPct: 0.65 },
  { id: 'm18', name: 'Краснознаменск', type: 'zato', isZato: true, totalIndicators: 182, moEnteredPct: 0.93, moApprovedPct: null, cioEnteredPct: 0.93, cioApprovedPct: 0.93 },
  { id: 'm22', name: 'Люберцы', type: 'go', totalIndicators: 339, moEnteredPct: 2.65, moApprovedPct: 0.31, cioEnteredPct: 2.65, cioApprovedPct: 0.66 },
  { id: 'm25', name: 'Мытищи', type: 'go', totalIndicators: 339, moEnteredPct: 2.72, moApprovedPct: 0.35, cioEnteredPct: 2.72, cioApprovedPct: 0.68 },
  { id: 'm26', name: 'Наро-Фоминск', type: 'go', totalIndicators: 339, moEnteredPct: 2.62, moApprovedPct: 0.32, cioEnteredPct: 2.62, cioApprovedPct: 0.65 },
  { id: 'm28', name: 'Одинцовский', type: 'go', totalIndicators: 339, moEnteredPct: 2.78, moApprovedPct: 0.34, cioEnteredPct: 2.78, cioApprovedPct: 0.70 },
  { id: 'm29', name: 'Орехово-Зуево', type: 'go', totalIndicators: 339, moEnteredPct: 2.64, moApprovedPct: 0.30, cioEnteredPct: 2.64, cioApprovedPct: 0.66 },
  { id: 'm31', name: 'Подольск', type: 'go', totalIndicators: 339, moEnteredPct: 2.85, moApprovedPct: 0.36, cioEnteredPct: 2.85, cioApprovedPct: 0.72 },
  { id: 'm32', name: 'Пушкинский', type: 'go', totalIndicators: 339, moEnteredPct: 2.68, moApprovedPct: 0.33, cioEnteredPct: 2.68, cioApprovedPct: 0.67 },
  { id: 'm33', name: 'Раменский', type: 'go', totalIndicators: 339, moEnteredPct: 2.64, moApprovedPct: 0.30, cioEnteredPct: 2.64, cioApprovedPct: 0.66 },
  { id: 'm34', name: 'Реутов', type: 'go', totalIndicators: 339, moEnteredPct: 2.82, moApprovedPct: 0.37, cioEnteredPct: 2.82, cioApprovedPct: 0.71 },
  { id: 'm36', name: 'Серпухов', type: 'go', totalIndicators: 339, moEnteredPct: 2.62, moApprovedPct: 0.32, cioEnteredPct: 2.62, cioApprovedPct: 0.65 },
  { id: 'm37', name: 'Сергиево-Посадский', type: 'go', totalIndicators: 339, moEnteredPct: 2.58, moApprovedPct: 0.30, cioEnteredPct: 2.58, cioApprovedPct: 0.64 },
  { id: 'm45', name: 'Солнечногорск', type: 'go', totalIndicators: 339, moEnteredPct: 2.56, moApprovedPct: 0.31, cioEnteredPct: 2.56, cioApprovedPct: 0.64 },
  { id: 'm39', name: 'Ступино', type: 'go', totalIndicators: 339, moEnteredPct: 2.66, moApprovedPct: 0.33, cioEnteredPct: 2.66, cioApprovedPct: 0.67 },
  { id: 'm40', name: 'Талдомский', type: 'go', totalIndicators: 339, moEnteredPct: 2.55, moApprovedPct: 0.31, cioEnteredPct: 2.55, cioApprovedPct: 0.64 },
  { id: 'm41', name: 'Химки', type: 'go', totalIndicators: 339, moEnteredPct: 2.83, moApprovedPct: 0.36, cioEnteredPct: 2.83, cioApprovedPct: 0.71 },
  { id: 'm42', name: 'Чехов', type: 'go', totalIndicators: 339, moEnteredPct: 2.60, moApprovedPct: 0.32, cioEnteredPct: 2.60, cioApprovedPct: 0.65 },
  { id: 'm38', name: 'Шатура', type: 'go', totalIndicators: 339, moEnteredPct: 2.58, moApprovedPct: 0.31, cioEnteredPct: 2.58, cioApprovedPct: 0.65 },
  { id: 'm43', name: 'Щёлково', type: 'go', totalIndicators: 339, moEnteredPct: 2.68, moApprovedPct: 0.33, cioEnteredPct: 2.68, cioApprovedPct: 0.67 },
  { id: 'm12', name: 'Электросталь', type: 'go', totalIndicators: 339, moEnteredPct: 2.71, moApprovedPct: 0.34, cioEnteredPct: 2.71, cioApprovedPct: 0.68 },
  { id: 'm55', name: 'Молодёжный', type: 'zato', isZato: true, totalIndicators: 182, moEnteredPct: 0.93, moApprovedPct: 0.33, cioEnteredPct: 0.93, cioApprovedPct: 0.93 },
  { id: 'm48', name: 'Шаховская', type: 'go', totalIndicators: 339, moEnteredPct: 2.57, moApprovedPct: 0.30, cioEnteredPct: 2.57, cioApprovedPct: 0.64 },
  { id: 'm23', name: 'Лотошино', type: 'go', totalIndicators: 339, moEnteredPct: 2.55, moApprovedPct: 0.30, cioEnteredPct: 2.55, cioApprovedPct: 0.63 },
  { id: 'm24', name: 'Луховицы', type: 'go', totalIndicators: 339, moEnteredPct: 2.60, moApprovedPct: 0.32, cioEnteredPct: 2.60, cioApprovedPct: 0.65 },
  { id: 'm51', name: 'Серебряные Пруды', type: 'go', totalIndicators: 339, moEnteredPct: 2.56, moApprovedPct: 0.31, cioEnteredPct: 2.56, cioApprovedPct: 0.64 },
  { id: 'm59', name: 'Лобня', type: 'go', totalIndicators: 339, moEnteredPct: 2.73, moApprovedPct: 0.34, cioEnteredPct: 2.73, cioApprovedPct: 0.69 },
  { id: 'm60', name: 'Лыткарино', type: 'go', totalIndicators: 339, moEnteredPct: 2.70, moApprovedPct: 0.33, cioEnteredPct: 2.70, cioApprovedPct: 0.68 },
  { id: 'm61', name: 'Павловский Посад', type: 'go', totalIndicators: 339, moEnteredPct: 2.65, moApprovedPct: 0.32, cioEnteredPct: 2.65, cioApprovedPct: 0.66 },
  { id: 'm62', name: 'Фрязино', type: 'go', totalIndicators: 339, moEnteredPct: 2.75, moApprovedPct: 0.34, cioEnteredPct: 2.75, cioApprovedPct: 0.69 },
  { id: 'm63', name: 'Черноголовка', type: 'go', totalIndicators: 339, moEnteredPct: 2.79, moApprovedPct: 0.35, cioEnteredPct: 2.79, cioApprovedPct: 0.70 },
  { id: 'm64', name: 'Ленинский', type: 'go', totalIndicators: 339, moEnteredPct: 2.77, moApprovedPct: 0.34, cioEnteredPct: 2.77, cioApprovedPct: 0.69 },
  { id: 'm65', name: 'Рузский', type: 'go', totalIndicators: 339, moEnteredPct: 2.58, moApprovedPct: 0.31, cioEnteredPct: 2.58, cioApprovedPct: 0.65 },
];

const INITIAL_DEPARTMENT_DATA: DepartmentMonitoringRow[] = [
  { id: 'c1', code: 'МЭФ', shortName: 'МЭФ', name: 'Министерство экономики и финансов Московской области', curatedIndicatorsCount: 68, moEnteredPct: 2.72, moApprovedPct: 0.34, cioEnteredPct: 2.72, cioApprovedPct: 0.68, status: 'active' },
  { id: 'c2', code: 'Мининвест', shortName: 'Мининвест', name: 'Министерство инвестиций, промышленности и науки Московской области', curatedIndicatorsCount: 54, moEnteredPct: 2.69, moApprovedPct: 0.33, cioEnteredPct: 2.69, cioApprovedPct: 0.67, status: 'active' },
  { id: 'c3', code: 'Минжилпол', shortName: 'Минжилпол', name: 'Министерство жилищной политики Московской области', curatedIndicatorsCount: 38, moEnteredPct: 2.65, moApprovedPct: 0.31, cioEnteredPct: 2.65, cioApprovedPct: 0.66, status: 'active' },
  { id: 'c4', code: 'Минсоц', shortName: 'Минсоц', name: 'Министерство социального развития Московской области', curatedIndicatorsCount: 42, moEnteredPct: 2.75, moApprovedPct: 0.35, cioEnteredPct: 2.75, cioApprovedPct: 0.70, status: 'active' },
  { id: 'c5', code: 'Минсельхоз', shortName: 'Минсельхоз', name: 'Министерство сельского хозяйства и продовольствия Московской области', curatedIndicatorsCount: 26, moEnteredPct: 2.58, moApprovedPct: 0.30, cioEnteredPct: 2.58, cioApprovedPct: 0.64, status: 'active' },
  { id: 'c_mingos', code: 'Мингос', shortName: 'Мингос', name: 'Министерство государственного управления, ИТ и связи Московской области', curatedIndicatorsCount: 24, moEnteredPct: 2.80, moApprovedPct: 0.36, cioEnteredPct: 2.80, cioApprovedPct: 0.71, status: 'active' },
  { id: 'c_gurb', code: 'ГУРБ', shortName: 'ГУРБ', name: 'Главное управление региональной безопасности Московской области', curatedIndicatorsCount: 19, moEnteredPct: 2.61, moApprovedPct: 0.32, cioEnteredPct: 2.61, cioApprovedPct: 0.65, status: 'active' },
  { id: 'c_mimp', code: 'МИМП', shortName: 'МИМП', name: 'Министерство имущественных отношений Московской области', curatedIndicatorsCount: 21, moEnteredPct: 2.63, moApprovedPct: 0.32, cioEnteredPct: 2.63, cioApprovedPct: 0.66, status: 'active' },
  { id: 'c_minsport', code: 'Минспорт', shortName: 'Минспорт', name: 'Министерство физической культуры и спорта Московской области', curatedIndicatorsCount: 17, moEnteredPct: 2.78, moApprovedPct: 0.35, cioEnteredPct: 2.78, cioApprovedPct: 0.69, status: 'active' },
  { id: 'c_mintrans', code: 'Минтранс', shortName: 'Минтранс', name: 'Министерство транспорта и дорожной инфраструктуры Московской области', curatedIndicatorsCount: 16, moEnteredPct: 2.66, moApprovedPct: 0.33, cioEnteredPct: 2.66, cioApprovedPct: 0.67, status: 'active' },
  { id: 'c_minzhkh', code: 'МинЖКХ', shortName: 'МинЖКХ', name: 'Министерство жилищно-коммунального хозяйства Московской области', curatedIndicatorsCount: 14, moEnteredPct: 2.60, moApprovedPct: 0.31, cioEnteredPct: 2.60, cioApprovedPct: 0.65, status: 'active' },
];

export const MONITORING_PERIODS = [
  { id: '2026_q3', label: '3 квартал 2026', isCurrent: true, year: 2026, quarter: 3 },
  { id: '2026_q2', label: '2 квартал 2026', isArchive: true, year: 2026, quarter: 2 },
  { id: '2026_q1', label: '1 квартал 2026', isArchive: true, year: 2026, quarter: 1 },
  { id: '2025_q4', label: '4 квартал 2025', isArchive: true, year: 2025, quarter: 4 },
  { id: '2025_q3', label: '3 квартал 2025', isArchive: true, year: 2025, quarter: 3 },
  { id: '2025_q2', label: '2 квартал 2025', isArchive: true, year: 2025, quarter: 2 },
  { id: '2025_q1', label: '1 квартал 2025', isArchive: true, year: 2025, quarter: 1 },
  { id: '2025_year', label: 'Итоговый рейтинг за 2025 год', isArchive: true, year: 2025 },
  { id: '2024_year', label: 'Итоговый рейтинг за 2024 год', isArchive: true, year: 2024 },
  { id: '2023_year', label: 'Итоговый рейтинг за 2023 год', isArchive: true, year: 2023 },
];

export const CIO_OPTIONS = [
  { id: 'all', name: 'Все ЦИО', short: 'Все ОИВ' },
  { id: 'c1', name: 'Министерство экономики и финансов Московской области', short: 'МЭФ' },
  { id: 'c2', name: 'Министерство инвестиций, промышленности и науки Московской области', short: 'Мининвест' },
  { id: 'c3', name: 'Министерство жилищной политики Московской области', short: 'Минжилпол' },
  { id: 'c4', name: 'Министерство социального развития Московской области', short: 'Минсоц' },
  { id: 'c5', name: 'Министерство сельского хозяйства и продовольствия Московской области', short: 'Минсельхоз' },
  { id: 'c_mingos', name: 'Министерство государственного управления, ИТ и связи Московской области', short: 'Мингос' },
  { id: 'c_gurb', name: 'Главное управление региональной безопасности Московской области', short: 'ГУРБ' },
  { id: 'c_mimp', name: 'Министерство имущественных отношений Московской области', short: 'МИМП' },
  { id: 'c_minsport', name: 'Министерство физической культуры и спорта Московской области', short: 'Минспорт' },
  { id: 'c_mintrans', name: 'Министерство транспорта и дорожной инфраструктуры МО', short: 'Минтранс' },
  { id: 'c_minzhkh', name: 'Министерство жилищно-коммунального хозяйства МО', short: 'МинЖКХ' },
];

function formatPct(val: number | null | undefined): string {
  if (val === null || val === undefined) return '—';
  return val.toFixed(2).replace('.', ',');
}

export function RatingMonitoringView(_props: { role?: RoleId } = {}) {

  // ── Фильтры ─────────────────────────────────────────────────────────────
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('2026_q3');
  const [selectedCioId, setSelectedCioId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'territory' | 'department'>('territory');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [territoryTypeFilter, setTerritoryTypeFilter] = useState<'all' | 'omsu' | 'zato'>('all');

  // Сортировка колонок таблицы
  const [sortField, setSortField] = useState<'name' | 'moEntered' | 'moApproved' | 'cioEntered' | 'cioApproved'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const selectedPeriod = useMemo(
    () => MONITORING_PERIODS.find((p) => p.id === selectedPeriodId) || MONITORING_PERIODS[0],
    [selectedPeriodId]
  );

  const selectedCio = useMemo(
    () => CIO_OPTIONS.find((c) => c.id === selectedCioId) || CIO_OPTIONS[0],
    [selectedCioId]
  );

  // Периодический множитель для симуляции смены данных при переключении архивных периодов
  const periodMultiplier = useMemo(() => {
    if (selectedPeriodId === '2026_q3') return 1;
    if (selectedPeriodId === '2026_q2') return 0.96;
    if (selectedPeriodId === '2026_q1') return 0.91;
    if (selectedPeriodId === '2025_year') return 1.0;
    return 0.88;
  }, [selectedPeriodId]);

  // Фильтрация и сортировка территорий
  const filteredTerritories = useMemo(() => {
    let list = INITIAL_TERRITORY_DATA.map((row) => {
      if (selectedPeriodId === '2026_q3') return row;
      // Масштабирование для архива
      return {
        ...row,
        moEnteredPct: Math.round(row.moEnteredPct * periodMultiplier * 100) / 100,
        moApprovedPct: row.moApprovedPct !== null ? Math.round(row.moApprovedPct * periodMultiplier * 100) / 100 : null,
        cioEnteredPct: Math.round(row.cioEnteredPct * periodMultiplier * 100) / 100,
        cioApprovedPct: row.cioApprovedPct !== null ? Math.round(row.cioApprovedPct * periodMultiplier * 100) / 100 : null,
      };
    });

    if (territoryTypeFilter !== 'all') {
      if (territoryTypeFilter === 'zato') {
        list = list.filter((r) => r.isZato);
      } else {
        list = list.filter((r) => !r.isZato);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      let vA: number | string = a.name;
      let vB: number | string = b.name;

      if (sortField === 'moEntered') {
        vA = a.moEnteredPct;
        vB = b.moEnteredPct;
      } else if (sortField === 'moApproved') {
        vA = a.moApprovedPct ?? -1;
        vB = b.moApprovedPct ?? -1;
      } else if (sortField === 'cioEntered') {
        vA = a.cioEnteredPct;
        vB = b.cioEnteredPct;
      } else if (sortField === 'cioApproved') {
        vA = a.cioApprovedPct ?? -1;
        vB = b.cioApprovedPct ?? -1;
      }

      if (typeof vA === 'string' && typeof vB === 'string') {
        return sortDirection === 'asc' ? vA.localeCompare(vB, 'ru') : vB.localeCompare(vA, 'ru');
      }
      return sortDirection === 'asc' ? (vA as number) - (vB as number) : (vB as number) - (vA as number);
    });
  }, [selectedPeriodId, periodMultiplier, territoryTypeFilter, searchQuery, sortField, sortDirection]);

  // Фильтрация и сортировка ведомств
  const filteredDepartments = useMemo(() => {
    let list = INITIAL_DEPARTMENT_DATA.map((row) => {
      if (selectedPeriodId === '2026_q3') return row;
      return {
        ...row,
        moEnteredPct: Math.round(row.moEnteredPct * periodMultiplier * 100) / 100,
        moApprovedPct: row.moApprovedPct !== null ? Math.round(row.moApprovedPct * periodMultiplier * 100) / 100 : null,
        cioEnteredPct: Math.round(row.cioEnteredPct * periodMultiplier * 100) / 100,
        cioApprovedPct: row.cioApprovedPct !== null ? Math.round(row.cioApprovedPct * periodMultiplier * 100) / 100 : null,
      };
    });

    if (selectedCioId !== 'all') {
      list = list.filter((r) => r.id === selectedCioId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.shortName.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      let vA: number | string = a.name;
      let vB: number | string = b.name;

      if (sortField === 'moEntered') {
        vA = a.moEnteredPct;
        vB = b.moEnteredPct;
      } else if (sortField === 'moApproved') {
        vA = a.moApprovedPct ?? -1;
        vB = b.moApprovedPct ?? -1;
      } else if (sortField === 'cioEntered') {
        vA = a.cioEnteredPct;
        vB = b.cioEnteredPct;
      } else if (sortField === 'cioApproved') {
        vA = a.cioApprovedPct ?? -1;
        vB = b.cioApprovedPct ?? -1;
      }

      if (typeof vA === 'string' && typeof vB === 'string') {
        return sortDirection === 'asc' ? vA.localeCompare(vB, 'ru') : vB.localeCompare(vA, 'ru');
      }
      return sortDirection === 'asc' ? (vA as number) - (vB as number) : (vB as number) - (vA as number);
    });
  }, [selectedPeriodId, periodMultiplier, selectedCioId, searchQuery, sortField, sortDirection]);

  // Сводные значения (Итого по Московской области)
  const summaryMoEntered = useMemo(() => {
    if (!filteredTerritories.length) return 0;
    const sum = filteredTerritories.reduce((acc, t) => acc + t.moEnteredPct, 0);
    return Math.round((sum / filteredTerritories.length) * 100) / 100;
  }, [filteredTerritories]);

  const summaryMoApproved = useMemo(() => {
    const valid = filteredTerritories.filter((t) => t.moApprovedPct !== null);
    if (!valid.length) return 0;
    const sum = valid.reduce((acc, t) => acc + (t.moApprovedPct || 0), 0);
    return Math.round((sum / valid.length) * 100) / 100;
  }, [filteredTerritories]);

  const summaryCioEntered = useMemo(() => {
    if (!filteredTerritories.length) return 0;
    const sum = filteredTerritories.reduce((acc, t) => acc + t.cioEnteredPct, 0);
    return Math.round((sum / filteredTerritories.length) * 100) / 100;
  }, [filteredTerritories]);

  const summaryCioApproved = useMemo(() => {
    const valid = filteredTerritories.filter((t) => t.cioApprovedPct !== null);
    if (!valid.length) return 0;
    const sum = valid.reduce((acc, t) => acc + (t.cioApprovedPct || 0), 0);
    return Math.round((sum / valid.length) * 100) / 100;
  }, [filteredTerritories]);

  const handleSort = (field: 'name' | 'moEntered' | 'moApproved' | 'cioEntered' | 'cioApproved') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: 'name' | 'moEntered' | 'moApproved' | 'cioEntered' | 'cioApproved') => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40 ml-1 inline" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-white ml-1 inline" />
    ) : (
      <ArrowDown className="h-3 w-3 text-white ml-1 inline" />
    );
  };

  const handleExport = (format: 'xlsx' | 'pdf') => {
    setExportNotice(`Файл «Мониторинг_хода_сбора_${selectedPeriod.label.replace(/\s+/g, '_')}.${format}» успешно сформирован.`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  return (
    <div className="space-y-4 text-slate-800">
      {/* ── КОМПАКТНАЯ ПАНЕЛЬ ФИЛЬТРОВ ─────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm px-3.5 py-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* 1. Поле «Период» */}
          <div className="flex items-center gap-1.5 min-w-[210px]">
            <span className="text-xs font-semibold text-slate-700 shrink-0 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-sky-700" />
              Период:
            </span>
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
              <SelectTrigger className="h-8 bg-slate-50 hover:bg-white border-slate-300 font-medium text-xs focus:ring-sky-500 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectGroup>
                  <SelectLabel className="text-[11px] font-semibold text-slate-500 uppercase">
                    Текущая кампания
                  </SelectLabel>
                  <SelectItem value="2026_q3" className="font-semibold text-sky-900 bg-sky-50/50">
                    3 квартал 2026 (текущий)
                  </SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel className="text-[11px] font-semibold text-slate-500 uppercase mt-1">
                    Архивные периоды
                  </SelectLabel>
                  {MONITORING_PERIODS.filter((p) => p.isArchive).map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* 2. Поле «ЦИО» */}
          <div className="flex items-center gap-1.5 min-w-[230px] flex-1">
            <span className="text-xs font-semibold text-slate-700 shrink-0 flex items-center gap-1">
              <Search className="h-3.5 w-3.5 text-sky-700" />
              ЦИО:
            </span>
            <Select value={selectedCioId} onValueChange={setSelectedCioId}>
              <SelectTrigger className="h-8 bg-slate-50 hover:bg-white border-slate-300 font-medium text-xs focus:ring-sky-500 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {CIO_OPTIONS.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Фильтр типа МО */}
          {viewMode === 'territory' && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-semibold text-slate-700 shrink-0 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                Тип:
              </span>
              <div className="flex rounded border border-slate-300 bg-slate-50 p-0.5 h-8">
                <button
                  type="button"
                  onClick={() => setTerritoryTypeFilter('all')}
                  className={`px-2.5 text-[11px] font-medium rounded transition-colors ${
                    territoryTypeFilter === 'all'
                      ? 'bg-[#1e5c8f] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  Все
                </button>
                <button
                  type="button"
                  onClick={() => setTerritoryTypeFilter('omsu')}
                  className={`px-2.5 text-[11px] font-medium rounded transition-colors ${
                    territoryTypeFilter === 'omsu'
                      ? 'bg-[#1e5c8f] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  ОМСУ (49)
                </button>
                <button
                  type="button"
                  onClick={() => setTerritoryTypeFilter('zato')}
                  className={`px-2.5 text-[11px] font-medium rounded transition-colors ${
                    territoryTypeFilter === 'zato'
                      ? 'bg-[#1e5c8f] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  ЗАТО (5)
                </button>
              </div>
            </div>
          )}

          {/* 4. Поиск */}
          <div className="flex items-center gap-1.5 w-52 shrink-0 ml-auto">
            <div className="relative w-full">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <Input
                type="text"
                placeholder={viewMode === 'territory' ? 'Поиск территории...' : 'Поиск ведомства...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-7 text-xs bg-slate-50 hover:bg-white border-slate-300 shadow-none focus:border-sky-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ОСНОВНАЯ ОБЛАСТЬ КОНТЕНТА ────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-4">
        {/* Переключатель отображения «Территория» / «Ведомства» */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 shadow-inner">
            <button
              onClick={() => setViewMode('territory')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'territory'
                  ? 'bg-gradient-to-r from-[#1e5c8f] to-[#2a6ea6] text-white shadow'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              Территория
              <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                viewMode === 'territory' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {filteredTerritories.length}
              </span>
            </button>
            <button
              onClick={() => setViewMode('department')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'department'
                  ? 'bg-gradient-to-r from-[#1e5c8f] to-[#2a6ea6] text-white shadow'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Ведомства
              <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                viewMode === 'department' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {filteredDepartments.length}
              </span>
            </button>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {exportNotice && (
              <div className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-md flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>{exportNotice}</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('xlsx')}
              className="h-8 text-xs font-medium gap-1.5 border-slate-300 hover:bg-slate-50 text-slate-700"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              Экспорт в Excel
            </Button>
          </div>
        </div>

        {/* Заголовок и подзаголовки */}
        <div className="space-y-1.5">
          <h1 className="text-base md:text-lg font-bold text-slate-900 leading-snug">
            Мониторинг хода сбора данных по показателям оценки местного самоуправления муниципальных районов и городских округов Московской области
          </h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600 pt-1">
            <div className="flex items-center gap-1.5 bg-sky-50 text-sky-900 px-2.5 py-1 rounded border border-sky-200 font-medium">
              <Info className="h-3.5 w-3.5 text-sky-700 shrink-0" />
              <span>Показателей для занесения: <b>339 шт. (182 шт. для ЗАТО)</b></span>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 px-2.5 py-1 rounded border border-amber-200 font-medium">
              <Building2 className="h-3.5 w-3.5 text-amber-700 shrink-0" />
              <span>Ведомство: <b>{selectedCio.short}</b> {selectedCio.id !== 'all' ? `(${selectedCio.name})` : ''}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-200">
              <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>Отчётный период: <b>{selectedPeriod.label}</b></span>
            </div>
          </div>
        </div>

        {/* ── ТАБЛИЦА ДАННЫХ ───────────────────────────────────────────────────── */}
        <div className="border border-slate-300 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[620px] relative">
            <table className="w-full text-xs text-left border-collapse">
              {/* Трехуровневая шапка таблицы */}
              <thead className="sticky top-0 z-20 text-white font-semibold">
                {/* Первый уровень шапки */}
                <tr className="bg-[#1e5c8f] border-b border-[#16486f]">
                  <th
                    rowSpan={3}
                    onClick={() => handleSort('name')}
                    className="p-3 border-r border-[#2d6f9f] min-w-[240px] align-middle cursor-pointer select-none hover:bg-[#184e7a] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span>{viewMode === 'territory' ? 'Территории' : 'Ведомства (ОИВ / ЦИО)'}</span>
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th
                    colSpan={4}
                    className="py-2.5 px-4 text-center border-b border-[#2d6f9f] bg-[#1a5280] uppercase tracking-wider text-[12px] font-bold"
                  >
                    {selectedPeriod.label}
                  </th>
                </tr>

                {/* Второй уровень шапки */}
                <tr className="bg-[#24679a] border-b border-[#16486f]">
                  <th
                    colSpan={2}
                    className="py-2 px-3 text-center border-r border-[#3478ab] font-bold text-[11px] uppercase tracking-wide bg-[#205d8b]"
                  >
                    Данные муниципальных образований
                  </th>
                  <th
                    colSpan={2}
                    className="py-2 px-3 text-center font-bold text-[11px] uppercase tracking-wide bg-[#276899]"
                  >
                    Ведомственные данные
                  </th>
                </tr>

                {/* Третий уровень шапки */}
                <tr className="bg-[#2c72a6] text-[11px]">
                  <th
                    onClick={() => handleSort('moEntered')}
                    className="py-2 px-3 text-center border-r border-[#3d83b6] cursor-pointer select-none hover:bg-[#205d8b] transition-colors min-w-[110px]"
                  >
                    <div className="flex items-center justify-center">
                      <span>Занесено, %</span>
                      {getSortIcon('moEntered')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('moApproved')}
                    className="py-2 px-3 text-center border-r border-[#3d83b6] cursor-pointer select-none hover:bg-[#205d8b] transition-colors min-w-[110px]"
                  >
                    <div className="flex items-center justify-center">
                      <span>Утверждено, %</span>
                      {getSortIcon('moApproved')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('cioEntered')}
                    className="py-2 px-3 text-center border-r border-[#3d83b6] cursor-pointer select-none hover:bg-[#205d8b] transition-colors min-w-[110px]"
                  >
                    <div className="flex items-center justify-center">
                      <span>Занесено, %</span>
                      {getSortIcon('cioEntered')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('cioApproved')}
                    className="py-2 px-3 text-center cursor-pointer select-none hover:bg-[#205d8b] transition-colors min-w-[110px]"
                  >
                    <div className="flex items-center justify-center">
                      <span>Утверждено, %</span>
                      {getSortIcon('cioApproved')}
                    </div>
                  </th>
                </tr>
              </thead>

              {/* Тело таблицы */}
              <tbody className="divide-y divide-slate-200 bg-white">
                {viewMode === 'territory' ? (
                  // РЕЖИМ 1: ТЕРРИТОРИИ
                  filteredTerritories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        Муниципальные образования не найдены по заданному фильтру
                      </td>
                    </tr>
                  ) : (
                    filteredTerritories.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-sky-50/50 transition-colors ${
                          idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                        }`}
                      >
                        <td className="py-2.5 px-3.5 border-r border-slate-200 font-medium text-slate-900">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 text-[11px] w-5 text-right font-mono">{idx + 1}.</span>
                              <span>{row.name}</span>
                            </div>
                            {row.isZato && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] px-1.5 py-0">
                                ЗАТО
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono text-slate-800">
                          {formatPct(row.moEnteredPct)}
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono">
                          {row.moApprovedPct === null ? (
                            <span className="text-slate-400 font-bold">—</span>
                          ) : (
                            <span className="text-emerald-700 font-semibold">{formatPct(row.moApprovedPct)}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono text-slate-800">
                          {formatPct(row.cioEnteredPct)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {row.cioApprovedPct === null ? (
                            <span className="text-slate-400 font-bold">—</span>
                          ) : (
                            <span className="text-purple-700 font-semibold">{formatPct(row.cioApprovedPct)}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  // РЕЖИМ 2: ВЕДОМСТВА
                  filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        Ведомства не найдены по заданному фильтру
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-amber-50/50 transition-colors ${
                          idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                        }`}
                      >
                        <td className="py-3 px-3.5 border-r border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-[11px] w-5 text-right font-mono">{idx + 1}.</span>
                            <div>
                              <div className="font-semibold text-slate-900">
                                {row.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                <span className="font-semibold text-sky-700">Код: {row.code}</span>
                                <span>·</span>
                                <span>Закреплено показателей: {row.curatedIndicatorsCount}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center border-r border-slate-200 font-mono text-slate-800 font-medium">
                          {formatPct(row.moEnteredPct)}
                        </td>
                        <td className="py-3 px-3 text-center border-r border-slate-200 font-mono">
                          {row.moApprovedPct === null ? (
                            <span className="text-slate-400 font-bold">—</span>
                          ) : (
                            <span className="text-emerald-700 font-semibold">{formatPct(row.moApprovedPct)}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center border-r border-slate-200 font-mono text-slate-800 font-medium">
                          {formatPct(row.cioEnteredPct)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          {row.cioApprovedPct === null ? (
                            <span className="text-slate-400 font-bold">—</span>
                          ) : (
                            <span className="text-purple-700 font-semibold">{formatPct(row.cioApprovedPct)}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>

              {/* ИТОГОВАЯ СТРОКА ТАБЛИЦЫ */}
              <tfoot className="sticky bottom-0 z-10 font-bold bg-[#edf4fb] text-slate-900 border-t-2 border-[#1e5c8f] shadow-md">
                <tr>
                  <td className="py-3 px-3.5 border-r border-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="uppercase text-[11px] tracking-wider text-[#1e5c8f]">
                        {viewMode === 'territory' ? 'Итого по Московской области' : 'Итого по всем ведомствам'}
                      </span>
                      <span className="text-[10px] bg-sky-200 text-sky-900 font-semibold px-2 py-0.5 rounded">
                        {viewMode === 'territory' ? `${filteredTerritories.length} ОМСУ` : `${filteredDepartments.length} ОИВ`}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center border-r border-slate-300 font-mono text-sm text-[#1e5c8f]">
                    {formatPct(summaryMoEntered)}
                  </td>
                  <td className="py-3 px-3 text-center border-r border-slate-300 font-mono text-sm text-emerald-800">
                    {formatPct(summaryMoApproved)}
                  </td>
                  <td className="py-3 px-3 text-center border-r border-slate-300 font-mono text-sm text-[#1e5c8f]">
                    {formatPct(summaryCioEntered)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-sm text-purple-800">
                    {formatPct(summaryCioApproved)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Подвал таблицы с пояснениями */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-muted-foreground gap-2 pt-1">
          <div className="flex items-center gap-4">
            <span>Всего строк: <b>{viewMode === 'territory' ? filteredTerritories.length : filteredDepartments.length}</b></span>
            <span>·</span>
            <span>Символ «—» означает отсутствие данных / отсутствие согласования на текущем этапе</span>
          </div>
        </div>
      </div>
    </div>
  );
}
