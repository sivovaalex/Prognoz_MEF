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

/** Статус значения МЭФ */
export type MefStatus =
  | 'not_filled'
  | 'draft'
  | 'sent'
  | 'approved';

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
  isZato?: boolean; // ЗАТО (закрытое административно-территориальное образование)
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
  // ── Параметры рейтинга ─────────────────────────────────────────────
  closed?: boolean;            // закрыт от ввода и согласования
  zato?: boolean;              // показатель для ОМСУ-ЗАТО (виден только ОМСУ с ЗАТО=1)
  closedForOmsuIds?: string[]; // ОМСУ, которым закрыт ввод показателя (ячейки заблокированы)
  calcException?: string;      // исключения расчёта: доп. правило присвоения баллов или мест
  isReference?: boolean;       // Справочно
  hasRatingParams?: boolean;   // Параметры рейтинга включены
  ratingFormula?: string;      // Формула рейтинга
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

export interface MefValue extends IndicatorValues {
  status: MefStatus;
  updatedAt: string | null;
  signedBy?: string;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'collecting' | 'completed';

export interface BlockSettings {
  approvers: ('omsu' | 'cio' | 'mef')[];
  reportingPeriods: string[];
  estimatedPeriods: string[];
  forecastPeriods: string[];
  hasNote: boolean;
}

// ===== Пояснительная записка (ПЗ) — подраздел «Муниципальный прогноз» =====

/** ПЗ: столбец данных, заполняемых ОМСУ (напр. «Отчёт», «Оценка», «Прогноз») */
export interface NoteColumn {
  id: string;
  name: string;
}

/** ПЗ: строка шаблона показателя: наименование + ячейки для ввода ОМСУ (по умолчанию 1) */
export interface NoteRow {
  id: string;
  name: string;
  cellCount?: number; // кол-во ячеек строки (по умолчанию 1); ячейки равномерно занимают данные столбцы
}

/** ПЗ: шаблон показателя пояснительной записки (привязан к показателю общего дерева) */
export interface NoteTemplate {
  id: string;
  indicatorId: string;   // показатель из общего дерева «Настройка показателей»
  sectionId: string;     // раздел (direction)
  columns: NoteColumn[]; // столбцы данных (подшапка со столбцами всегда видна в документе)
  rows: NoteRow[];       // строки блока под строкой показателя
  label?: string;        // отображаемое наименование в документе (перекрывает имя показателя)
  isActive?: boolean;
}

/** ПЗ: статус данных ОМСУ по шаблону (выводится из статусов ячеек) */
export type NoteStatus =
  | 'not_filled'   // не заполнен
  | 'draft'        // черновик (есть ячейки, не отправленные на согласование)
  | 'pending_cio'  // есть ячейки, подписанные ЭЦП, на согласовании у ЦИО
  | 'approved'     // все заполненные ячейки согласованы ЦИО
  | 'returned';    // есть ячейки, возвращённые ЦИО на доработку

/** ПЗ: статус отдельной ячейки шаблона (поячеечная отправка и согласование) */
export type NoteCellStatus =
  | 'draft'        // заполнена, не отправлена на согласование
  | 'pending_cio'  // подписана ЭЦП, на согласовании у ЦИО
  | 'approved'     // согласована ЦИО (изменение заблокировано)
  | 'returned';    // возвращена ЦИО на доработку

/** ПЗ: данные ОМСУ по шаблону (значения и статусы всех ячеек) */
export interface NoteOmsuData {
  cells: Record<string, string>;               // key: `${rowId}:${subIdx}:${colIdx}`
  cellStatus: Record<string, NoteCellStatus>;  // key -> статус ячейки (отсутствует = не заполнена)
  cellComments: Record<string, string>;        // key -> комментарий ЦИО при возврате ячейки
  status: NoteStatus;
  updatedAt: string | null;
  signedBy?: string;
}

/** ПЗ: данные ЦИО по шаблону и территории (статус согласования) */
export interface NoteCioData {
  status: 'none' | 'approved' | 'returned';
  updatedAt: string | null;
}

/** ПЗ: кампания сбора пояснительной записки */
export interface NoteCampaign {
  status: 'draft' | 'collecting' | 'completed';
  period: string;         // период сбора
  startDate: string;      // дата запуска сбора (datetime)
  deadline: string;       // дата окончания сбора (datetime)
  deadlineOmsu: string;   // срок заполнения ОМСУ
  deadlineCio: string;    // срок согласования ЦИО
  launchedAt: string | null;
}

export interface CollectionPeriodOption {
  id: string;
  name: string;
  year: number;
  quarter?: number;
  isCurrent?: boolean;
}

/** ПЗ: ключ ячейки шаблона */
export const noteCellKey = (rowId: string, subIdx: number, colIdx: number) =>
  `${rowId}:${subIdx}:${colIdx}`;

/** ПЗ: вывод статуса шаблона из статусов ячеек */
export function deriveNoteStatus(cellStatus: Record<string, NoteCellStatus>): NoteStatus {
  const sts = Object.values(cellStatus);
  if (sts.length === 0) return 'not_filled';
  if (sts.includes('returned')) return 'returned';
  if (sts.includes('pending_cio')) return 'pending_cio';
  if (sts.every((s) => s === 'approved')) return 'approved';
  return 'draft';
}

/** ПЗ: отображаемое наименование шаблона в документе (label или имя показателя без префикса «Справочно:») */
export function noteTemplateName(t: NoteTemplate, indById: Map<string, Indicator>): string {
  if (t.label && t.label.trim()) return t.label;
  const ind = indById.get(t.indicatorId);
  if (!ind) return t.id;
  return ind.name.replace(/^Справочно:\s*/, '');
}

/** ПЗ: эффективное кол-во ячеек строки (по умолчанию — по одной на каждый столбец; не более числа столбцов) */
export function noteRowCellCount(t: NoteTemplate, r: NoteRow): number {
  const m = t.columns.length;
  return Math.max(1, Math.min(r.cellCount ?? m, Math.max(1, m)));
}

/** ПЗ: colSpan каждой ячейки строки (ячейки равномерно занимают все данные столбцы) */
export function noteRowCellSpans(t: NoteTemplate, r: NoteRow): number[] {
  const m = t.columns.length;
  if (m === 0) return [];
  const n = noteRowCellCount(t, r);
  const base = Math.floor(m / n);
  const rem = m % n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

/** ПЗ: список всех ключей ячеек шаблона (строка показателя — только подшапка столбцов, ячеек нет) */
export function noteTemplateCellKeys(t: NoteTemplate): string[] {
  const keys: string[] = [];
  t.rows.forEach((r) => {
    const n = noteRowCellCount(t, r);
    for (let i = 0; i < n; i++) keys.push(noteCellKey(r.id, 0, i));
  });
  return keys;
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
  omsuValues: Record<string, Record<string, OmsuValue>>;  // данные ЦИО (инд -> цио)
  cioValues: Record<string, Record<string, CioValue>>;
  // данные МЭФ (инд -> цио)
  mefValues: Record<string, Record<string, MefValue>>;
  // данные ЦИО в разрезе ОМСУ (цио -> инд -> омсу)
  cioTerritoryValues: Record<string, Record<string, Record<string, CioValue>>>;
  // данные МЭФ в разрезе ОМСУ (цио -> инд -> омсу)
  mefTerritoryValues: Record<string, Record<string, Record<string, MefValue>>>; // cioId -> indId -> omsuId -> value
  history: HistoryItem[];
  notifications: NotificationItem[];
  ratingMode: 'preview' | 'final';
  finalPublished: boolean;
  // ── Пояснительная записка (ПЗ) ──────────────────────────────────────
  noteTemplates: NoteTemplate[];
  noteOmsuValues: Record<string, Record<string, NoteOmsuData>>; // munId -> templateId -> data
  noteCioValues: Record<string, Record<string, NoteCioData>>;   // templateId -> munId -> data
  noteCampaign: NoteCampaign;
}
