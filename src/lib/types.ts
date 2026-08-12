// ===== Доменные типы прототипа КФ «Рейтинг ОМСУ» =====

export type RoleId = 'admin' | 'mef' | 'cio' | 'omsu';

export interface Role {
  id: RoleId;
  name: string;
  org: string;
  description: string;
}

/** Статус значения показателя ОМСУ */
export type OmsuStatus =
  | 'not_filled'   // не заполнен
  | 'draft'        // черновик (заполнен, не подписан)
  | 'pending_cio'  // подписан ЭЦП, на согласовании у ЦИО
  | 'approved'     // согласован ЦИО (изменение заблокировано)
  | 'returned';    // возвращён ЦИО на доработку

/** Статус собственного показателя ЦИО */
export type CioStatus =
  | 'not_filled'
  | 'draft'
  | 'pending_mef'  // подписан ЭЦП, на согласовании у МЭФ
  | 'approved'     // согласован МЭФ
  | 'returned';

export interface Direction {
  id: string;
  name: string;
  cioIds: string[];
  actualFrom: string;
  actualTo?: string | null;
}

export interface Cio {
  id: string;
  name: string;
  short: string;
  isActive?: boolean;
}

export interface Municipality {
  id: string;
  name: string;
  isActive?: boolean;
}

export interface Unit {
  id: string;
  name: string;
  isActive?: boolean;
}

export interface Indicator {
  id: string;
  num: string;           // иерархический номер, напр. "1.1.12.3"
  name: string;
  directionId: string;
  cioId: string;         // отраслевой ЦИО, к которому привязан показатель
  unit: string;
  optimum: 'max' | 'min'; // что лучше: больше или меньше
  weight: number;
  formula?: string;        // формула базового прогноза
  consCoeff?: string;     // коэффициент консервативного прогноза
  formulaReport?: string;
  formulaEstimate?: string;
  level: number;          // уровень в иерархии: 1 — верхний, 2+ — вложенные (по отступу в файле показателей)
  parentId: string | null;
  isGroup?: boolean;      // строка-группа (без единицы измерения): не заполняется и не участвует в рейтинге
  actualFrom: string;
  actualTo?: string | null;
}

/** Заполняемый показатель (не группа) */
export const isFillable = (i: Indicator): boolean => !i.isGroup;

/** Набор заполняемых полей показателя: отчёт 2023–2025, оценка 2026, прогнозы 2027–2029 (2 варианта) */
export const VALUE_FIELDS = [
  { key: 'v2023', group: 'y2023', label: 'Отчёт', _bg: 'report' },
  { key: 'v2024', group: 'y2024', label: 'Отчёт', _bg: 'report' },
  { key: 'v2025', group: 'y2025', label: 'Отчёт', _bg: 'report' },
  { key: 'v2026', group: 'y2026', label: 'Оценка', _bg: 'estimate' },
  { key: 'cons2027', group: 'y2027', label: 'Прогноз вариант 1 (консервативный)', _bg: 'y2027' },
  { key: 'base2027', group: 'y2027', label: 'Прогноз вариант 2 (базовый)', _bg: 'y2027' },
  { key: 'cons2028', group: 'y2028', label: 'Прогноз вариант 1 (консервативный)', _bg: 'y2028' },
  { key: 'base2028', group: 'y2028', label: 'Прогноз вариант 2 (базовый)', _bg: 'y2028' },
  { key: 'cons2029', group: 'y2029', label: 'Прогноз вариант 1 (консервативный)', _bg: 'y2029' },
  { key: 'base2029', group: 'y2029', label: 'Прогноз вариант 2 (базовый)', _bg: 'y2029' },
] as const;

export type ValueFieldKey = (typeof VALUE_FIELDS)[number]['key'];

/** Группы верхнего уровня шапки таблицы значений */
export const VALUE_GROUPS = [
  { key: 'y2023', label: '2023', span: 1, _bg: 'report' },
  { key: 'y2024', label: '2024', span: 1, _bg: 'report' },
  { key: 'y2025', label: '2025', span: 1, _bg: 'report' },
  { key: 'y2026', label: '2026', span: 1, _bg: 'estimate' },
  { key: 'y2027', label: '2027', span: 2, _bg: 'y2027' },
  { key: 'y2028', label: '2028', span: 2, _bg: 'y2028' },
  { key: 'y2029', label: '2029', span: 2, _bg: 'y2029' },
] as const;

/** Пустой набор значений показателя */
export function emptyValueFields(): Record<ValueFieldKey, null> {
  return {
    v2023: null, v2024: null, v2025: null, v2026: null,
    cons2027: null, base2027: null, cons2028: null, base2028: null, cons2029: null, base2029: null,
  };
}

/** Значения показателя по годам/вариантам */
export interface IndicatorValues {
  v2023: number | null;    // отчёт 2023
  v2024: number | null;    // отчёт 2024
  v2025: number | null;    // отчёт 2025
  v2026: number | null;    // оценка 2026 (рейтинговый год)
  cons2027: number | null; // 2027, вариант 1 (консервативный)
  base2027: number | null; // 2027, вариант 2 (базовый)
  cons2028: number | null; // 2028, вариант 1 (консервативный)
  base2028: number | null; // 2028, вариант 2 (базовый)
  cons2029: number | null; // 2029, вариант 1 (консервативный)
  base2029: number | null; // 2029, вариант 2 (базовый)
}

export interface OmsuValue extends IndicatorValues {
  status: OmsuStatus;
  updatedAt: string | null;
  comment?: string;      // комментарий при возврате
  signedBy?: string;
}

export interface SysUser {
  id: string;
  login: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  email: string;
  position: string;
  phone?: string;
  telegram?: string;
  birthDate?: string;
  city?: string;
  organization?: string;
  department?: string;
  isLocked: boolean;
  roleId?: RoleId;
  perms?: {
    isCio: boolean;
    isOmsu: boolean;
    isMef: boolean;
    isAdmin: boolean;
    cioIds: string[];
    cioBlocks: string[];
    omsuId: string;
    modules?: string[];
  };
}

export interface CioValue extends IndicatorValues {
  status: CioStatus;
  updatedAt: string | null;
  comment?: string;
  signedBy?: string;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'collecting' | 'completed';

export interface BlockSettings {
  approvers: ('omsu' | 'cio' | 'mef')[];
}


export interface Campaign {
  module: string;
  name: string;
  period: string;
  status: CampaignStatus;
  startDate: string | null;   // дата запуска сбора
  deadlineOmsu: string;       // срок заполнения ОМСУ
  deadlineCio: string;        // срок согласования ЦИО
  deadlineMef: string;        // срок согласования МЭФ
  launchedAt: string | null;
}

export interface NotificationItem {
  id: number;
  at: string;
  text: string;
  forRoles: RoleId[];
}

export interface HistoryItem {
  at: string;
  actor: string;
  action: string;
}

export interface AppState {
  campaign: Campaign;
  indicators: Indicator[];
  directions: Direction[];
  cios: Cio[];
  omsus: Municipality[];
  units: Unit[];
  blockSettings: Record<string, BlockSettings>; // module_block -> BlockSettings
  omsuValues: Record<string, Record<string, OmsuValue>>; // munId -> indId -> value
  cioValues: Record<string, Record<string, CioValue>>;   // indId -> cioId -> собственное значение ЦИО по тому же показателю
  cioTerritoryValues: Record<string, Record<string, Record<string, CioValue>>>; // cioId -> indId -> omsuId -> value
  history: HistoryItem[];
  notifications: NotificationItem[];
  ratingMode: 'preview' | 'final';
  finalPublished: boolean;
}
