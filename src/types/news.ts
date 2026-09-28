export type NewsRoleId = 'admin' | 'mef' | 'omsu' | 'cio';

export interface NewsRoleInfo {
  id: NewsRoleId;
  name: string;
  fullName: string;
  organization: string;
  description: string;
  hasFullAccess: boolean; // true for Admin and MEF, false for OMSU and CIO
}

export const NEWS_ROLES: NewsRoleInfo[] = [
  {
    id: 'admin',
    name: 'Администратор',
    fullName: 'Администратор системы',
    organization: 'ГУ МО «ЦИОГВ»',
    description: 'Полный доступ: просмотр, создание, редактирование и удаление новостей',
    hasFullAccess: true,
  },
  {
    id: 'mef',
    name: 'МЭФ',
    fullName: 'Министерство экономики и финансов МО',
    organization: 'МЭФ Московской области',
    description: 'Полный доступ: просмотр, создание, редактирование и удаление новостей',
    hasFullAccess: true,
  },
  {
    id: 'omsu',
    name: 'ОМСУ',
    fullName: 'Орган местного самоуправления',
    organization: 'Администрация городского округа Балашиха',
    description: 'Доступ только на просмотр списка и текста новостей',
    hasFullAccess: false,
  },
  {
    id: 'cio',
    name: 'ЦИО',
    fullName: 'Центральный исполнительный орган',
    organization: 'Министерство инвестиций, промышленности и науки МО',
    description: 'Доступ только на просмотр списка и текста новостей',
    hasFullAccess: false,
  },
];

export interface AttachedFile {
  name: string;
  size: string; // e.g. "2.4 МБ"
  type?: string;
  url?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  date: string; // Формат ДД.ММ.ГГГГ, например: "11.08.2026"
  content: string; // HTML-содержимое или форматированный текст
  attachedFile?: AttachedFile | null;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** 6 обязательных моковых новостей по ТЗ */
export const INITIAL_NEWS: NewsItem[] = [
  {
    id: 'news-1',
    title: 'Рейтинг-2026',
    date: '11.08.2026',
    content: '<p>Добрый день, уважаемые коллеги, для дальнейшей организации работы размещаем презентацию по итогам Рейтинга-2026 за 1 полугодие !!! Функционал в системе ГАСУ для загрузки итогов за 1 п/г 2026 года в разрезе ОМСУ и ЦИО открыт.</p>',
    attachedFile: {
      name: 'Презентация_Итоги_Рейтинга-2026_1ПГ.pptx',
      size: '4.8 МБ',
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    },
    author: 'Министерство экономики и финансов МО',
    createdAt: '11.08.2026 09:30',
  },
  {
    id: 'news-2',
    title: 'Рейтинг-2026',
    date: '03.08.2026',
    content: '<p>Добрый день! Коллеги из ОМСУ, в соответствии с поручением Губернатора Московской области № ПР-136/03-06/09 от 22.07.26, в методику "Мой Дом и Двор" внесены изменения. В системе ГАСУ МО в разделе Методики, подразделе Согласование размещены изменения к методике, просьба ознакомиться, согласовать и проставить флагми до 04.08.26 включительно.</p>',
    attachedFile: {
      name: 'Изменения_в_методику_Мой_Дом_и_Двор_ПР-136.pdf',
      size: '1.2 МБ',
      type: 'application/pdf',
    },
    author: 'Администратор системы',
    createdAt: '03.08.2026 11:15',
  },
  {
    id: 'news-3',
    title: 'Рейтинг-2026',
    date: '16.07.2026',
    content: '<p>🔥🔥Уважаемые коллеги, расчеты в ГАСУ корректны!🟥🟥</p>',
    attachedFile: null,
    author: 'Министерство экономики и финансов МО',
    createdAt: '16.07.2026 15:42',
  },
  {
    id: 'news-4',
    title: 'Рейтинг-2026',
    date: '10.07.2026',
    content: '<p>Добрый день, коллеги. Прошу всех отфлаговать показатель 2 квартала по демонтажу и обновлению облика (показатель 9). Данные внесены, согласно МОЙ АПК "трансформация НТО".</p>',
    attachedFile: null,
    author: 'Министерство экономики и финансов МО',
    createdAt: '10.07.2026 14:05',
  },
  {
    id: 'news-5',
    title: 'Рейтинг-2026',
    date: '10.07.2026',
    content: '<p>Добрый день, коллеги. Прошу всех отфлаговать показатель 2 квартала по демонтажу и обновлению облика (показатель 9). Данные внесены, согласно МОЙ АПК "трансформация НТО".</p>',
    attachedFile: null,
    author: 'Администратор системы',
    createdAt: '10.07.2026 10:20',
  },
  {
    id: 'news-6',
    title: 'Рейтинг-2026',
    date: '09.07.2026',
    content: '<p>Уважаемые коллеги, добрый день.</p>',
    attachedFile: null,
    author: 'Администратор системы',
    createdAt: '09.07.2026 08:50',
  },
];
