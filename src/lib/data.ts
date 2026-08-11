import { emptyValueFields } from './types';
import type {
  AppState, Cio, CioValue, Direction, Indicator,
  Municipality, OmsuValue, Role,
} from './types';

// ─────────────────────────────────────────────────────────────
// Демонстрационные данные прототипа (in-memory, без бэкенда)
// Структура показателей Муниципального прогноза — по файлу
// «Показатели Мунпрогноза.xlsx» (разделы 1, 3, 7, 8, 9, 11, 13)
// ─────────────────────────────────────────────────────────────

// Роли прототипа
export const ROLES: Role[] = [
  {
    id: 'admin',
    name: 'Администратор',
    org: 'ГУ МО «ЦИОГВ»',
    description: 'Настройка показателей, справочников и кампаний сбора данных',
  },
  {
    id: 'mef',
    name: 'Министерство экономики и финансов',
    org: 'МЭФ Московской области',
    description: 'Запуск кампании, контроль хода сбора, согласование данных ЦИО, областной прогноз',
  },
  {
    id: 'cio',
    name: 'Пользователь ЦИО',
    org: 'Министерство инвестиций, промышленности и науки Московской области',
    description: 'Согласование форм ОМСУ и внесение собственных значений по закреплённым показателям',
  },
  {
    id: 'omsu',
    name: 'Пользователь ОМСУ',
    org: 'Администрация городского округа Балашиха',
    description: 'Заполнение показателей муниципального прогноза, подписание ЭЦП, отправка на согласование',
  },
];

// Сферы (разделы Муниципального прогноза)
//   1. Демографические показатели
//   3. Промышленное производство
//   7. Малое и среднее предпринимательство
//   8. Инвестиции
//   9. Строительство
//   11. Труд и заработная плата
//   13. Торговля и услуги
export const DIRECTIONS: Direction[] = [
  { id: 'd1', name: '1. Демографические показатели' },
  { id: 'd2', name: '3. Промышленное производство' },
  { id: 'd3', name: '7. Малое и среднее предпринимательство' },
  { id: 'd4', name: '8. Инвестиции' },
  { id: 'd5', name: '9. Строительство' },
  { id: 'd6', name: '11. Труд и заработная плата' },
  { id: 'd7', name: '13. Торговля и услуги' },];

// Ответственные ЦИО (по файлу показателей)
export const CIOS: Cio[] = [
  { id: 'c1', name: 'Министерство экономики и финансов Московской области', short: 'МЭФ' },
  { id: 'c2', name: 'Министерство инвестиций, промышленности и науки Московской области', short: 'Мининвест' },
  { id: 'c3', name: 'Министерство жилищной политики Московской области', short: 'Минжилпол' },
  { id: 'c4', name: 'Министерство социального развития Московской области', short: 'Минсоц' },
  { id: 'c5', name: 'Министерство сельского хозяйства и продовольствия Московской области', short: 'Минсельхоз' },];

// Текущий пользователь-ЦИО (для демо)
export const CURRENT_CIO = 'c2'; // Мининвест
// МЭФ как отраслевой ЦИО по закреплённым за ним показателям
export const MEF_CIO = 'c1'; // Министерство экономики и финансов
// Текущий пользователь-ОМСУ (для демо)
export const CURRENT_OMSU = 'm1'; // Балашиха

export const MUNICIPALITIES: Municipality[] = [
  { id: 'm1', name: 'Балашиха' },
  { id: 'm2', name: 'Химки' },
  { id: 'm3', name: 'Подольск' },
  { id: 'm4', name: 'Красногорск' },
  { id: 'm5', name: 'Мытищи' },
  { id: 'm6', name: 'Одинцовский' },
  { id: 'm7', name: 'Люберцы' },
  { id: 'm8', name: 'Королёв' },
  { id: 'm9', name: 'Домодедово' },
  { id: 'm10', name: 'Сергиево-Посадский' },
  { id: 'm11', name: 'Раменский' },
  { id: 'm12', name: 'Долгопрудный' },
];

// Показатели Муниципального прогноза — по файлу «Показатели Мунпрогноза.xlsx».
// Иерархия задана отступом в файле: level 1 — верхний уровень, 2+ — вложенные;
// parentId — родительская строка. Строки без единицы измерения — группы (isGroup):
// не заполняются и не участвуют в расчёте рейтинга.
// Нумерация иерархическая: «раздел.номер.подномер…».
// Показатели с префиксом «Справочно:» — справочные.
export const INDICATORS: Indicator[] = [
  { id: 'i1', num: '1.1', name: 'Справочно: Численность постоянного населения (на конец года)', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 1, parentId: null },
  { id: 'i2', num: '1.1.1', name: 'Справочно: Число родившихся', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i1' },
  { id: 'i3', num: '1.1.2', name: 'Справочно: Общий коэффициент рождаемости', directionId: 'd1', cioId: 'c1', unit: 'число родившихся на 1000 человек населения', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i1' },
  { id: 'i4', num: '1.1.3', name: 'Справочно: Число умерших', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'min', weight: 1, formula: '—', level: 2, parentId: 'i1' },
  { id: 'i5', num: '1.1.4', name: 'Справочно: Общий коэффициент смертности', directionId: 'd1', cioId: 'c1', unit: 'число умерших на 1000 человек населения', optimum: 'min', weight: 1, formula: '—', level: 2, parentId: 'i1' },
  { id: 'i6', num: '1.1.5', name: 'Справочно: Естественный прирост (убыль) населения', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i1' },
  { id: 'i7', num: '1.1.6', name: 'Справочно: Коэффициент естественного прироста (убыли) населения', directionId: 'd1', cioId: 'c1', unit: 'на 1000 человек населения', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i1' },
  { id: 'i8', num: '1.1.7', name: 'Справочно: Миграционный прирост (убыль) населения', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i1' },
  { id: 'i9', num: '1.1.8', name: 'Справочно: Миграционный прирост (убыль) населения с учетом ввода МКД', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i1' },
  { id: 'i10', num: '1.1.9', name: 'Справочно: Уровень обеспеченности населения жильем (на конец года) (за 2024 год)', directionId: 'd1', cioId: 'c1', unit: 'кв.метров на человека', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i1' },
  { id: 'i11', num: '1.1.10', name: 'Справочно: Общий прирост населения', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i1' },
  { id: 'i12', num: '1.1.11', name: 'Справочно: Численность постоянного населения (среднегодовая)', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i1' },
  { id: 'i13', num: '1.1.12', name: 'по численности постоянного населения, в том числе в возрасте:', directionId: 'd1', cioId: 'c1', unit: '—', optimum: 'max', weight: 0, formula: '—', level: 2, parentId: 'i1', isGroup: true },
  { id: 'i14', num: '1.1.12.1', name: 'до 3 лет', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 3, parentId: 'i13' },
  { id: 'i15', num: '1.1.12.2', name: 'от 3 до 7 лет', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 3, parentId: 'i13' },
  { id: 'i16', num: '1.1.12.3', name: 'от 7 до 17 лет', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 3, parentId: 'i13' },
  { id: 'i17', num: '1.1.12.3.1', name: 'Справочно: численность постоянного населения в возрасте 0 лет', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 4, parentId: 'i16' },
  { id: 'i18', num: '1.1.12.3.2', name: 'Справочно: численность постоянного населения в возрасте 1 года', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 4, parentId: 'i16' },
  { id: 'i19', num: '1.1.12.3.3', name: 'Справочно: численность постоянного населения в возрасте 2 года', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 4, parentId: 'i16' },
  { id: 'i20', num: '1.1.12.3.4', name: 'Справочно: численность постоянного населения в возрасте 3 года', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 4, parentId: 'i16' },
  { id: 'i21', num: '1.1.12.3.5', name: 'Справочно: численность постоянного населения в возрасте 4 года', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 4, parentId: 'i16' },
  { id: 'i22', num: '1.1.12.3.6', name: 'Справочно: численность постоянного населения в возрасте 5 лет', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 4, parentId: 'i16' },
  { id: 'i23', num: '1.1.12.3.7', name: 'Справочно: численность постоянного населения в возрасте 6 лет', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 4, parentId: 'i16' },
  { id: 'i24', num: '1.1.12.3.8', name: 'Справочно: численность постоянного населения в возрасте 7 лет', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 4, parentId: 'i16' },
  { id: 'i25', num: '1.1.12.3.9', name: 'Справочно: численность постоянного населения в возрасте 8 лет', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 4, parentId: 'i16' },
  { id: 'i26', num: '1.1.12.3.10', name: 'Справочно: численность постоянного населения в возрасте 9 лет', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 4, parentId: 'i16' },
  { id: 'i27', num: '1.1.12.3.11', name: 'Справочно: численность постоянного населения в возрасте 10 лет', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 4, parentId: 'i16' },
  { id: 'i28', num: '1.1.12.3.12', name: 'Справочно: численность постоянного населения в возрасте 11 лет', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 4, parentId: 'i16' },
  { id: 'i29', num: '1.1.12.3.13', name: 'Справочно: численность постоянного населения в возрасте 12 лет', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 4, parentId: 'i16' },
  { id: 'i30', num: '1.1.12.3.14', name: 'Справочно: численность постоянного населения в возрасте 13 лет', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 4, parentId: 'i16' },
  { id: 'i31', num: '1.1.12.3.15', name: 'Справочно: численность постоянного населения в возрасте 14 лет', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 4, parentId: 'i16' },
  { id: 'i32', num: '1.1.12.3.16', name: 'Справочно: численность постоянного населения в возрасте 15 лет', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 4, parentId: 'i16' },
  { id: 'i33', num: '1.1.12.3.17', name: 'Справочно: численность постоянного населения в возрасте 16 лет', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 4, parentId: 'i16' },
  { id: 'i34', num: '1.1.12.3.18', name: 'Справочно: численность постоянного населения в возрасте 17 лет', directionId: 'd1', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 4, parentId: 'i16' },
  { id: 'i35', num: '3.1', name: 'Объем отгруженных товаров собственного производства, выполненных работ и услуг собственными силами по промышленным видам деятельности по крупным и средним организациям (без организаций с численностью работающих менее 15 человек)', directionId: 'd2', cioId: 'c2', unit: 'млн.руб.в ценах соответствующих лет', optimum: 'max', weight: 1, formula: '—', level: 1, parentId: null },
  { id: 'i36', num: '3.2', name: 'Справочно: Темп роста объема отгруженных товаров собственного производства, выполненных работ и услуг собственными силами по промышленным видам деятельности по крупным и средним организациям (без организаций с численностью работающих менее 15 человек)', directionId: 'd2', cioId: 'c2', unit: 'процент к предыдущему году', optimum: 'max', weight: 1, formula: '—', level: 1, parentId: null },
  { id: 'i37', num: '3.2.1', name: 'Справочно: Индекс промышленного производства по крупным и средним организациям (без организаций с численностью работающих менее 15 человек)', directionId: 'd2', cioId: 'c2', unit: 'процент к предыдущему году', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i36' },
  { id: 'i38', num: '3.2.2', name: 'Справочно: индекс-дефлятор цен', directionId: 'd2', cioId: 'c2', unit: 'процент к предыдущему году', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i36' },
  { id: 'i39', num: '3.3', name: 'Справочно: Обрабатывающие производства', directionId: 'd2', cioId: 'c2', unit: '—', optimum: 'max', weight: 0, formula: '—', level: 1, parentId: null, isGroup: true },
  { id: 'i40', num: '3.3.1', name: 'Справочно: Объем отгруженных товаров собственного производства, выполненных работ и услуг собственными силами о крупным и средним организациям (без организаций с численностью работающих менее 15 человек) - раздел C', directionId: 'd2', cioId: 'c2', unit: 'млн.руб.в ценах соответствующих лет', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i39' },
  { id: 'i41', num: '3.3.2', name: 'Справочно: Темп роста - раздел C', directionId: 'd2', cioId: 'c2', unit: 'процент к предыдущему году', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i39' },
  { id: 'i42', num: '7.1', name: 'Число малых и средних предприятий, включая микропредприятия (на конец года)', directionId: 'd3', cioId: 'c2', unit: 'единица', optimum: 'max', weight: 1, formula: '—', level: 1, parentId: null },
  { id: 'i43', num: '7.2', name: 'Справочно: в том числе, малых предприятий (включая микропредприятия)', directionId: 'd3', cioId: 'c2', unit: 'единица', optimum: 'max', weight: 1, formula: '—', level: 1, parentId: null },
  { id: 'i44', num: '8.1', name: 'Инвестиции в основной капитал за счет всех источников финансирования (без субъектов малого предпринимательства и объемов инвестиций, не наблюдаемых прямыми статистическими методами) - всего', directionId: 'd4', cioId: 'c2', unit: 'млн.рублей', optimum: 'max', weight: 1, formula: '—', level: 1, parentId: null },
  { id: 'i45', num: '8.1.1', name: 'Справочно: индекс физического объема', directionId: 'd4', cioId: 'c2', unit: 'процент к предыдущему году', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i44' },
  { id: 'i46', num: '8.1.1.1', name: 'Справочно: индекс-дефлятор цен', directionId: 'd4', cioId: 'c2', unit: 'процент к предыдущему году', optimum: 'max', weight: 1, formula: '—', level: 3, parentId: 'i45' },
  { id: 'i47', num: '8.2', name: 'Справочно: Инвестиции в основной капитал (без субъектов малого предпринимательства и параметров неформальной деятельности) из местных бюджетов', directionId: 'd4', cioId: 'c2', unit: 'млн. рублей', optimum: 'max', weight: 1, formula: '—', level: 1, parentId: null },
  { id: 'i48', num: '9.1', name: 'Объем жилищного строительства', directionId: 'd5', cioId: 'c3', unit: 'тыс. кв. м общей площади', optimum: 'max', weight: 1, formula: '—', level: 1, parentId: null },
  { id: 'i49', num: '9.2', name: 'Справочно: Темп роста объема жилищного строительства', directionId: 'd5', cioId: 'c3', unit: 'процент к предыдущему году', optimum: 'max', weight: 1, formula: '—', level: 1, parentId: null },
  { id: 'i50', num: '9.3', name: 'в том числе:', directionId: 'd5', cioId: 'c3', unit: '—', optimum: 'max', weight: 0, formula: '—', level: 1, parentId: null, isGroup: true },
  { id: 'i51', num: '9.3.1', name: 'Справочно: Ввод общей площади жилых домов, построенных населением', directionId: 'd5', cioId: 'c3', unit: 'тыс. кв. м общей площади', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i50' },
  { id: 'i52', num: '9.3.2', name: 'Справочно: ввод жилья в многоквартирных жилых домах', directionId: 'd5', cioId: 'c3', unit: 'тыс. кв. м общей площади', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i50' },
  { id: 'i53', num: '11.1', name: 'Справочно: Количество созданных рабочих мест всего (на крупных и средних предприятиях, на малых предприятиях (включая микропредприятия) и индивидуальные предприниматели)', directionId: 'd6', cioId: 'c2', unit: 'единица', optimum: 'max', weight: 1, formula: '—', level: 1, parentId: null },
  { id: 'i54', num: '11.2', name: 'Количество созданных рабочих мест', directionId: 'd6', cioId: 'c2', unit: 'единица', optimum: 'max', weight: 1, formula: '—', level: 1, parentId: null },
  { id: 'i55', num: '11.3', name: 'Справочно: Количество созданных рабочих мест на малых предприятиях (включая микропредприятия) и индивидуальные предприниматели', directionId: 'd6', cioId: 'c2', unit: 'единица', optimum: 'max', weight: 1, formula: '—', level: 1, parentId: null },
  { id: 'i56', num: '11.4', name: 'Численность официально зарегистрированных безработных, на конец года', directionId: 'd6', cioId: 'c4', unit: 'человек', optimum: 'min', weight: 1, formula: '—', level: 1, parentId: null },
  { id: 'i57', num: '11.5', name: 'Фонд начисленной заработной платы', directionId: 'd6', cioId: 'c1', unit: 'млн. рублей', optimum: 'max', weight: 1, formula: '—', level: 1, parentId: null },
  { id: 'i58', num: '11.5.1', name: 'Справочно: темп роста фонда заработной платы', directionId: 'd6', cioId: 'c1', unit: 'процент к предыдущему году', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i57' },
  { id: 'i59', num: '11.5.2', name: 'Справочно: Фонд заработной платы по крупным и средним организациям (включая организации с численностью до 15 человек)', directionId: 'd6', cioId: 'c1', unit: 'млн. рублей', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i57' },
  { id: 'i60', num: '11.5.3', name: 'Справочно: Темп роста фонда заработной платы по крупным и средним организациям (включая организации с численностью до 15 человек)', directionId: 'd6', cioId: 'c1', unit: 'процент к предыдущему году', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i57' },
  { id: 'i61', num: '11.5.4', name: 'Справочно: Фонд заработной платы по малым предприятиям (включая микропредприятия)', directionId: 'd6', cioId: 'c1', unit: 'млн. рублей', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i57' },
  { id: 'i62', num: '11.5.5', name: 'Справочно: Темп роста фонда заработной платы по малым предприятиям (включая микропредприятия)', directionId: 'd6', cioId: 'c1', unit: 'процент к предыдущему году', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i57' },
  { id: 'i63', num: '11.6', name: 'Среднемесячная номинальная начисленная заработная плата работников (по полному кругу организаций)', directionId: 'd6', cioId: 'c1', unit: 'рубль', optimum: 'max', weight: 1, formula: '—', level: 1, parentId: null },
  { id: 'i64', num: '11.6.1', name: 'Справочно: темп роста среднемесячной номинальной начисленной заработной платы работников (по полному кругу организаций)', directionId: 'd6', cioId: 'c1', unit: 'процент к предыдущему году', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i63' },
  { id: 'i65', num: '11.6.2', name: 'Справочно: Среднемесячная заработная плата работников по крупным и средним организациям (включая организации с численностью до 15 человек)', directionId: 'd6', cioId: 'c1', unit: 'рублей', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i63' },
  { id: 'i66', num: '11.6.3', name: 'Справочно: Темп роста среднемесячной заработной платы работников по крупным и средним организациям (включая организации с численностью до 15 человек)', directionId: 'd6', cioId: 'c1', unit: 'процент к предыдущему году', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i63' },
  { id: 'i67', num: '11.6.4', name: 'Справочно: Среднемесячная заработная плата работников малых предприятий (включая микропредприятия)', directionId: 'd6', cioId: 'c1', unit: 'рубль', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i63' },
  { id: 'i68', num: '11.6.5', name: 'Справочно: Темп роста среднемесячной заработной платы работников малых предприятий (включая микропредприятия)', directionId: 'd6', cioId: 'c1', unit: 'процент к предыдущему году', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i63' },
  { id: 'i69', num: '11.6.6', name: 'Справочно: Среднесписочная численность работников (без внешних совместителей) по полному кругу организаций', directionId: 'd6', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 2, parentId: 'i63' },
  { id: 'i70', num: '11.6.6.1', name: 'Справочно: Темп роста среднесписочной численности работников (без внешних совместителей) по полному кругу организаций', directionId: 'd6', cioId: 'c1', unit: 'процент к предыдущему году', optimum: 'max', weight: 1, formula: '—', level: 3, parentId: 'i69' },
  { id: 'i71', num: '11.6.6.2', name: 'Справочно: Среднесписочная численность работников организаций по крупным и средним организациям (включая организации с численностью до 15 человек)', directionId: 'd6', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 3, parentId: 'i69' },
  { id: 'i72', num: '11.6.6.3', name: 'Справочно: Темп роста среднесписочной численности работников организаций по крупным и средним организациям (включая организации с численностью до 15 человек)', directionId: 'd6', cioId: 'c1', unit: 'процент к предыдущему году', optimum: 'max', weight: 1, formula: '—', level: 3, parentId: 'i69' },
  { id: 'i73', num: '11.6.6.4', name: 'Справочно: Среднесписочная численность работников малых предприятий (включая микропредприятия)', directionId: 'd6', cioId: 'c1', unit: 'человек', optimum: 'max', weight: 1, formula: '—', level: 3, parentId: 'i69' },
  { id: 'i74', num: '11.6.6.5', name: 'Справочно: Темп роста среднесписочной численности работников малых предприятий (включая микропредприятия)', directionId: 'd6', cioId: 'c1', unit: 'процент к предыдущему году', optimum: 'max', weight: 1, formula: '—', level: 3, parentId: 'i69' },
  { id: 'i75', num: '13.1', name: 'Справочно: Площадь объектов оптовой торговли (складские помещения, оптово-распределительные центры, оптово-логистические центры, торгово-складские комплексы, логистические комплексы, стационарные оптовые рынки, распределительные холодильники и др.)', directionId: 'd7', cioId: 'c5', unit: 'тыс. кв. м', optimum: 'max', weight: 1, formula: '—', level: 1, parentId: null },
  { id: 'i76', num: '13.1.1', name: 'Оборот розничной торговли по крупным и средним организациям (без организаций с численностью работающих менее 15 человек):', directionId: 'd7', cioId: 'c5', unit: '—', optimum: 'max', weight: 0, formula: '—', level: 2, parentId: 'i75', isGroup: true },
  { id: 'i77', num: '13.1.1.1', name: 'в ценах соответствующих лет', directionId: 'd7', cioId: 'c5', unit: 'млн. рублей', optimum: 'max', weight: 1, formula: '—', level: 3, parentId: 'i76' },
  { id: 'i78', num: '13.1.1.2', name: 'Справочно: индекс физического объема', directionId: 'd7', cioId: 'c5', unit: 'процент к предыдущему году', optimum: 'max', weight: 1, formula: '—', level: 3, parentId: 'i76' },
  { id: 'i79', num: '13.1.1.3', name: 'Справочно: индекс-дефлятор цен', directionId: 'd7', cioId: 'c5', unit: 'процент к предыдущему году', optimum: 'max', weight: 1, formula: '—', level: 3, parentId: 'i76' },
];

// ─────────────────────────────────────────────────────────────
// Генерация демо-значений
// ─────────────────────────────────────────────────────────────

function seedRand(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Диапазоны правдоподобных значений по показателям (для демо)
const RANGES: Record<string, [number, number]> = {
  i1: [80000, 270000],
  i2: [1400, 3600],
  i3: [4, 14],
  i4: [1800, 4200],
  i5: [4, 14],
  i6: [80000, 270000],
  i7: [4, 14],
  i8: [-4000, 9000],
  i9: [-4000, 9000],
  i10: [27, 38],
  i11: [80000, 270000],
  i12: [80000, 270000],
  i14: [1500, 22000],
  i15: [1500, 22000],
  i16: [1500, 22000],
  i17: [1500, 22000],
  i18: [1500, 22000],
  i19: [1500, 22000],
  i20: [1500, 22000],
  i21: [1500, 22000],
  i22: [1500, 22000],
  i23: [1500, 22000],
  i24: [1500, 22000],
  i25: [1500, 22000],
  i26: [1500, 22000],
  i27: [1500, 22000],
  i28: [1500, 22000],
  i29: [1500, 22000],
  i30: [1500, 22000],
  i31: [1500, 22000],
  i32: [1500, 22000],
  i33: [1500, 22000],
  i34: [1500, 22000],
  i35: [6000, 120000],
  i36: [96, 106],
  i37: [96, 106],
  i38: [96, 106],
  i40: [6000, 120000],
  i41: [96, 106],
  i42: [900, 26000],
  i43: [900, 26000],
  i44: [8000, 90000],
  i45: [96, 106],
  i46: [96, 106],
  i47: [8000, 90000],
  i48: [120, 1400],
  i49: [96, 106],
  i51: [120, 1400],
  i52: [120, 1400],
  i53: [900, 26000],
  i54: [900, 26000],
  i55: [900, 26000],
  i56: [400, 2400],
  i57: [1500, 45000],
  i58: [96, 106],
  i59: [1500, 45000],
  i60: [96, 106],
  i61: [1500, 45000],
  i62: [96, 106],
  i63: [52000, 98000],
  i64: [96, 106],
  i65: [52000, 98000],
  i66: [96, 106],
  i67: [52000, 98000],
  i68: [96, 106],
  i69: [15000, 95000],
  i70: [96, 106],
  i71: [15000, 95000],
  i72: [96, 106],
  i73: [15000, 95000],
  i74: [96, 106],
  i75: [120, 1400],
  i77: [1500, 45000],
  i78: [96, 106],
  i79: [96, 106],
};
const STATUS_POOL: OmsuValue['status'][] = [
  'approved', 'approved', 'approved',
  'pending_cio', 'pending_cio',
  'draft',
  'not_filled',
];

const r2 = (v: number) => Math.round(v * 100) / 100;

// Формирует поля формы 2П от базового значения v2026
const makeFields = (v2026: number): Pick<OmsuValue,
  'v2023' | 'v2024' | 'v2025' | 'v2026' |
  'cons2027' | 'base2027' | 'cons2028' | 'base2028' | 'cons2029' | 'base2029'
> => ({
  v2023: r2(v2026 * 0.94),
  v2024: r2(v2026 * 0.97),
  v2025: r2(v2026 * 0.99),
  v2026: r2(v2026),
  cons2027: r2(v2026 * 1.0),
  base2027: r2(v2026 * 1.02),
  cons2028: r2(v2026 * 1.01),
  base2028: r2(v2026 * 1.04),
  cons2029: r2(v2026 * 1.02),
  base2029: r2(v2026 * 1.06),
});

function buildOmsuValues(indicators: Indicator[]): Record<string, Record<string, OmsuValue>> {
  const fillable = indicators.filter(i => !i.isGroup);
  const out: Record<string, Record<string, OmsuValue>> = {};
  for (let mi = 0; mi < MUNICIPALITIES.length; mi++) {
    const m = MUNICIPALITIES[mi];
    const rand = seedRand(mi * 997 + 13);
    out[m.id] = {};
    for (let ii = 0; ii < fillable.length; ii++) {
      const ind = fillable[ii];
      const [lo, hi] = RANGES[ind.id] ?? [100, 1000];
      const v = r2(lo + rand() * (hi - lo));

      if (m.id === CURRENT_OMSU) {
        // Демо-сценарий для Балашихи: показываем разные статусы
        const demo: Record<string, Pick<OmsuValue, 'status' | 'updatedAt' | 'comment' | 'signedBy'>> = {
          i1: { status: 'approved', updatedAt: '24.07.2026 11:20', signedBy: 'Иванова А.П. (ЭЦП)' },
          i2: { status: 'pending_cio', updatedAt: '25.07.2026 09:42' },
          i3: {
            status: 'returned',
            updatedAt: '26.07.2026 14:05',
            comment: 'Уточните значение на 2026 год: расходится с оперативной статотчётностью за 1 полугодие',
          },
          i4: { status: 'draft', updatedAt: '26.07.2026 16:31' },
        };
        const d = demo[ind.id];
        out[m.id][ind.id] = {
          ...(d ? makeFields(v) : { ...emptyValueFields() }),
          status: d?.status ?? 'not_filled',
          updatedAt: d?.updatedAt ?? null,
          comment: d?.comment,
          signedBy: d?.signedBy,
        };
      } else {
        const status = STATUS_POOL[Math.floor(rand() * STATUS_POOL.length)];
        out[m.id][ind.id] = {
          ...(status === 'not_filled' ? { ...emptyValueFields() } : makeFields(v)),
          status,
          updatedAt: status === 'not_filled' ? null : `${20 + ((mi + ii) % 6)}.07.2026 ${9 + (ii % 8)}:${10 + mi}`,
        };
      }
    }
  }
  return out;
}

function buildCioValues(indicators: Indicator[]): Record<string, Record<string, CioValue>> {
  const out: Record<string, Record<string, CioValue>> = {};
  const rand = seedRand(4242);
  const fillable = indicators.filter(i => !i.isGroup);
  for (const ind of fillable) {
    const [lo, hi] = RANGES[ind.id] ?? [100, 1000];
    const v = r2((lo + rand() * (hi - lo)) * 8.4); // областной уровень
    
    const status: CioValue['status'] = rand() > 0.4 ? 'approved' : 'pending_mef';
    
    // Оставляем несколько пустых для теста работы самого ЦИО
    if (ind.cioId === CURRENT_CIO && rand() > 0.7) {
      out[ind.id] = {
        [ind.cioId]: { ...emptyValueFields(), status: 'not_filled', updatedAt: null },
      };
    } else {
      out[ind.id] = {
        [ind.cioId]: { ...makeFields(v), status, updatedAt: '23.07.2026 15:30' },
      };
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Начальное состояние хранилища
// ─────────────────────────────────────────────────────────────

export function buildInitialState(moduleId: string): AppState {
  let indicators = INDICATORS;
  let directions = DIRECTIONS;
  if (moduleId === 'ukaz') {
    indicators = UKAZ_INDICATORS;
    directions = UKAZ_DIRECTIONS;
  } else if (moduleId === 'rating') {
    indicators = RATING_INDICATORS;
    directions = RATING_DIRECTIONS;
  }

  const units = Array.from(new Set(indicators.map(i => i.unit).filter(Boolean)));

  return {
    indicators,
    directions,
    cios: CIOS.map(c => ({ ...c, isActive: true })),
    omsus: MUNICIPALITIES.map(m => ({ ...m, isActive: true })),
    units: units.map((u, i) => ({ id: `u${i + 1}`, name: u, isActive: true })),
    blockSettings: {
      mun: { approvers: ['omsu', 'cio', 'mef'] },
      obl: { approvers: ['cio', 'mef'] },
      rating_main: { approvers: ['omsu', 'cio', 'mef'] },
      ukaz_main: { approvers: ['omsu', 'cio', 'mef'] },
      form2p: { approvers: ['cio', 'mef'] },
      long_term: { approvers: ['cio', 'mef'] },
    },
    omsuValues: buildOmsuValues(indicators),
    cioValues: buildCioValues(indicators),
    cioTerritoryValues: {},
    campaign: {
      module: moduleId,
      name: moduleId === 'ukaz' ? 'Указ Президента РФ №607' : moduleId === 'rating' ? 'Рейтинг ОМСУ' : 'Муниципальный прогноз СЭР МО',
      period: moduleId === 'rating' ? 'Оценка за 2026 год' : '2027–2029 годы',
      status: 'collecting',
      startDate: '2026-07-20',
      deadlineOmsu: '2026-07-31',
      deadlineCio: '2026-08-07',
      deadlineMef: '2026-08-14',
      launchedAt: '20.07.2026 09:00',
    },
    history: [
      { at: '20.07.2026 09:00', actor: 'МЭФ', action: `Запущена кампания «${moduleId === 'ukaz' ? 'Указ Президента РФ №607' : moduleId === 'rating' ? 'Рейтинг ОМСУ' : 'Муниципальный прогноз СЭР МО'}»: уведомления направлены 12 ОМСУ и 5 ЦИО` },
      { at: '22.07.2026 14:12', actor: 'г.о. Балашиха', action: 'Заполнена форма по показателю «Численность постоянного населения»: направлена на согласование ЦИО' },
      { at: '23.07.2026 10:45', actor: 'Мининвест', action: 'Форма ЦИО подписана ЭЦП и передана в МЭФ' },
      { at: '24.07.2026 16:03', actor: 'МЭФ', action: 'Сформирован проект прогноза. Полнота данных: 71%' },
    ],
    notifications: [
      { id: 1, at: '26.07.2026 14:05', text: 'Форма по показателю возвращена на доработку: уточните значение на 2026 год', forRoles: ['omsu'] },
      { id: 2, at: '25.07.2026 09:00', text: 'Напоминание: срок представления форм ОМСУ — 31.07.2026', forRoles: ['omsu', 'cio'] },
    ],
    ratingMode: 'preview',
    finalPublished: false,
  };
}

export const OMSU_STATUS_META: Record<OmsuValue['status'], { label: string; color: string; bg: string }> = {
  not_filled: { label: 'Не заполнена', color: '#64748b', bg: '#f1f5f9' },
  draft: { label: 'Черновик', color: '#0369a1', bg: '#e0f2fe' },
  pending_cio: { label: 'На согласовании у ЦИО', color: '#b45309', bg: '#fef3c7' },
  returned: { label: 'Возвращена на доработку', color: '#be123c', bg: '#ffe4e6' },
  approved: { label: 'Согласована ЦИО', color: '#047857', bg: '#d1fae5' },
};

export const CIO_STATUS_META: Record<CioValue['status'], { label: string; color: string; bg: string }> = {
  not_filled: { label: 'Не заполнена', color: '#64748b', bg: '#f1f5f9' },
  draft: { label: 'Черновик', color: '#0369a1', bg: '#e0f2fe' },
  pending_mef: { label: 'Передана в МЭФ', color: '#b45309', bg: '#fef3c7' },
  returned: { label: 'Возвращена МЭФ', color: '#be123c', bg: '#ffe4e6' },
  approved: { label: 'Согласована МЭФ', color: '#047857', bg: '#d1fae5' },
};

import type { SysUser } from './types';

export const MOCK_USERS: SysUser[] = [
  {
    id: 'u1',
    login: 'exception',
    lastName: 'Иванов',
    firstName: 'Иван',
    email: 'AleksandrovAA@mosreg.ru',
    position: 'Администратор',
    isLocked: false,
    roleId: 'admin'
  },
  {
    id: 'u0',
    login: 'mef',
    lastName: 'Петров',
    firstName: 'Петр',
    email: 'mef@mosreg.ru',
    position: 'Сотрудник МЭФ',
    isLocked: false,
    roleId: 'mef'
  },
  {
    id: 'u2',
    login: 'test1',
    lastName: 'Петров',
    firstName: 'Петр',
    email: 'test555@mail.ru',
    position: 'Сотрудник ЦИО',
    isLocked: false,
    roleId: 'cio'
  },
  {
    id: 'u3',
    login: 'autotest',
    lastName: 'Сидоров',
    firstName: 'Сидор',
    email: 'SidorovAZ@mosreg.ru',
    position: 'Тестировщик',
    isLocked: true,
    roleId: 'mef'
  },
  {
    id: 'u4',
    login: 'kkp_user',
    lastName: 'Михайлов',
    firstName: 'Михаил',
    email: 'kkpuser1@mosreg.ru',
    position: 'Сотрудник ОМСУ',
    isLocked: false,
    roleId: 'omsu'
  }
];

export const UKAZ_DIRECTIONS: Direction[] = [
  { id: 'd_ukaz', name: '1. Указ Президента РФ №607' },
];

export const UKAZ_INDICATORS: Indicator[] = [
  {
    id: 'u1',
    num: '1',
    name: 'Число субъектов малого и среднего предпринимательства в расчете на 10 тыс. человек населения.',
    unit: 'ед.',
    directionId: 'd_ukaz',
    cioId: 'cio1',
    formula: 'X / Y * 10000',
    optimum: 'max',
    weight: 1,
    level: 1,
    parentId: null,
  },
  {
    id: 'u2',
    num: '2',
    name: 'Доля среднесписочной численности работников малых и средних предприятий в среднесписочной численности работников всех предприятий.',
    unit: '%',
    directionId: 'd_ukaz',
    cioId: 'cio1',
    formula: 'X / Y * 100',
    optimum: 'max',
    weight: 1,
    level: 1,
    parentId: null,
  },
  {
    id: 'u3',
    num: '3',
    name: 'Доля протяженности автомобильных дорог общего пользования местного значения, не отвечающих нормативным требованиям.',
    unit: '%',
    directionId: 'd_ukaz',
    cioId: 'cio2',
    formula: 'X / Y * 100',
    optimum: 'max',
    weight: 1,
    level: 1,
    parentId: null,
  },
  {
    id: 'u4',
    num: '4',
    name: 'Доля населения, проживающего в населенных пунктах, не имеющих регулярного автобусного и (или) железнодорожного сообщения с административным центром.',
    unit: '%',
    directionId: 'd_ukaz',
    cioId: 'cio2',
    formula: 'X / Y * 100',
    optimum: 'max',
    weight: 1,
    level: 1,
    parentId: null,
  },
  {
    id: 'u5',
    num: '5',
    name: 'Доля площади земельных участков, являющихся объектами налогообложения земельным налогом, в общей площади территории.',
    unit: '%',
    directionId: 'd_ukaz',
    cioId: 'cio3',
    formula: 'X / Y * 100',
    optimum: 'max',
    weight: 1,
    level: 1,
    parentId: null,
  },
  {
    id: 'u6',
    num: '6',
    name: 'Доля детей в возрасте от одного года до шести лет, состоящих на учете для определения в ДОУ.',
    unit: '%',
    directionId: 'd_ukaz',
    cioId: 'cio4',
    formula: 'X / Y * 100',
    optimum: 'max',
    weight: 1,
    level: 1,
    parentId: null,
  },
  {
    id: 'u8',
    num: '8',
    name: 'Общая площадь жилых помещений, приходящаяся в среднем на одного жителя, - всего, в том числе введенная в действие за один год.',
    unit: 'кв. м',
    directionId: 'd_ukaz',
    cioId: 'cio3',
    formula: 'X / Y',
    optimum: 'max',
    weight: 1,
    level: 1,
    parentId: null,
  },
  {
    id: 'u9',
    num: '9',
    name: 'Доля организаций коммунального комплекса, использующих объекты коммунальной инфраструктуры на праве частной собственности, по договору аренды или концессии.',
    unit: '%',
    directionId: 'd_ukaz',
    cioId: 'cio3',
    formula: 'X / Y * 100',
    optimum: 'max',
    weight: 1,
    level: 1,
    parentId: null,
  },
  {
    id: 'u10',
    num: '10',
    name: 'Доля многоквартирных домов, расположенных на земельных участках, в отношении которых осуществлен государственный кадастровый учет.',
    unit: '%',
    directionId: 'd_ukaz',
    cioId: 'cio3',
    formula: 'X / Y * 100',
    optimum: 'max',
    weight: 1,
    level: 1,
    parentId: null,
  },
  {
    id: 'u11',
    num: '11',
    name: 'Удельная величина потребления энергетических ресурсов в многоквартирных домах.',
    unit: 'ед.',
    directionId: 'd_ukaz',
    cioId: 'cio3',
    formula: 'X / Y',
    optimum: 'max',
    weight: 1,
    level: 1,
    parentId: null,
  },
  {
    id: 'u12',
    num: '12',
    name: 'Удельная величина потребления энергетических ресурсов муниципальными бюджетными учреждениями.',
    unit: 'ед.',
    directionId: 'd_ukaz',
    cioId: 'cio3',
    formula: 'X / Y',
    optimum: 'max',
    weight: 1,
    level: 1,
    parentId: null,
  },
  {
    id: 'u13',
    num: '13',
    name: 'Удовлетворенность населения деятельностью органов местного самоуправления (процент от числа опрошенных).',
    unit: '%',
    directionId: 'd_ukaz',
    cioId: 'cio1',
    formula: 'X',
    optimum: 'max',
    weight: 1,
    level: 1,
    parentId: null,
  },
  {
    id: 'u14',
    num: '14',
    name: 'Результаты независимой оценки качества условий оказания услуг муниципальными организациями.',
    unit: 'балл',
    directionId: 'd_ukaz',
    cioId: 'cio4',
    formula: 'X',
    optimum: 'max',
    weight: 1,
    level: 1,
    parentId: null,
  },
];

export const RATING_DIRECTIONS: Direction[] = [
  { id: 'd_rating', name: 'Рейтинг 45 показателей' },
];

export const RATING_INDICATORS: Indicator[] = [
  {
    id: 'r1',
    num: '1',
    name: 'Доверие к власти',
    unit: '%',
    directionId: 'd_rating',
    cioId: 'cio1',
    formula: 'X / Y * 100',
    optimum: 'max',
    weight: 1,
    level: 1,
    parentId: null,
  },
  {
    id: 'r2',
    num: '2',
    name: 'Качество дорог',
    unit: '%',
    directionId: 'd_rating',
    cioId: 'cio2',
    formula: 'X / Y * 100',
    optimum: 'max',
    weight: 1,
    level: 1,
    parentId: null,
  },
  {
    id: 'r3',
    num: '3',
    name: 'Жалобы жителей (Добродел)',
    unit: 'шт',
    directionId: 'd_rating',
    cioId: 'cio3',
    formula: 'X',
    optimum: 'min',
    weight: 1,
    level: 1,
    parentId: null,
  },
];
