import { useState, useMemo, useEffect } from 'react';
import type { RoleId } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Users, Building2, Landmark, Phone, Mail, Search,
  Plus, ShieldAlert, Pencil, Trash2, FileSpreadsheet,
  Printer
} from 'lucide-react';
import {
  type ContactItem,
  INITIAL_OMSU_CONTACTS,
  INITIAL_CIO_CONTACTS,
  INITIAL_MEF_CONTACTS,
} from '@/lib/contactsData';
import { ContactModal } from '@/components/ContactModal';

export type ContactsTabType = 'contacts-omsu' | 'contacts-cio' | 'contacts-mef';

interface ContactsViewProps {
  activeTab: ContactsTabType;
  role: RoleId;
}

export function ContactsView({ activeTab, role }: ContactsViewProps) {
  // Проверка прав доступа к вкладке
  const isOmsuAllowed = role === 'admin' || role === 'mef' || role === 'omsu';
  const isCioAllowed = role === 'admin' || role === 'mef' || role === 'cio';
  const isMefAllowed = role === 'admin' || role === 'mef';

  const isCurrentTabAllowed =
    (activeTab === 'contacts-omsu' && isOmsuAllowed) ||
    (activeTab === 'contacts-cio' && isCioAllowed) ||
    (activeTab === 'contacts-mef' && isMefAllowed);

  // Права на редактирование: только Администратор и МЭФ
  const canEdit = role === 'admin' || role === 'mef';

  // Хранилище контактов для каждой вкладки в localStorage
  const storageKey = `contacts_rating_${activeTab}`;

  const [contacts, setContacts] = useState<ContactItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    if (activeTab === 'contacts-omsu') return INITIAL_OMSU_CONTACTS;
    if (activeTab === 'contacts-cio') return INITIAL_CIO_CONTACTS;
    return INITIAL_MEF_CONTACTS;
  });

  // При смене активной вкладки подгружаем соответствующие данные
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setContacts(JSON.parse(saved));
        return;
      }
    } catch (e) {
      console.error(e);
    }
    if (activeTab === 'contacts-omsu') setContacts(INITIAL_OMSU_CONTACTS);
    else if (activeTab === 'contacts-cio') setContacts(INITIAL_CIO_CONTACTS);
    else setContacts(INITIAL_MEF_CONTACTS);
  }, [activeTab, storageKey]);

  // Сохранение в localStorage
  const saveContacts = (items: ContactItem[]) => {
    setContacts(items);
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
      console.error(e);
    }
  };

  // Фильтры и поиск
  const [search, setSearch] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [selectedRoleCat, setSelectedRoleCat] = useState<string>('all');

  // Модальное окно добавления/редактирования
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactItem | null>(null);

  // Конфигурация для текущей вкладки
  const tabConfig = {
    'contacts-omsu': {
      title: 'Список ответственных сотрудников ОМСУ городских округов Московской области за Рейтинг-2026',
      shortTitle: 'Контакты ОМСУ по Рейтингу',
      orgColTitle: 'Наименование городского округа',
      badge: 'ОМСУ МО',
      icon: Users,
      iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      allowedRoles: ['Администратор', 'МЭФ', 'ОМСУ'],
      defaultOrgs: Array.from(new Set(INITIAL_OMSU_CONTACTS.map((c) => c.orgName))),
      roleOptions: [
        'Руководитель, курирующий данное направление',
        'Руководитель структурного подразделения, курирующий данное направление',
        'Ответственный исполнитель (ввод значений показателя в систему ГАС «Управление»)',
      ],
    },
    'contacts-cio': {
      title: 'Список кураторов и ответственных сотрудников ЦИО Московской области за Рейтинг-2026',
      shortTitle: 'Контакты ЦИО по Рейтингу',
      orgColTitle: 'Наименование ЦИО',
      badge: 'ЦИО МО',
      icon: Building2,
      iconBg: 'bg-blue-50 text-blue-700 border-blue-200',
      allowedRoles: ['Администратор', 'МЭФ', 'ЦИО'],
      defaultOrgs: Array.from(new Set(INITIAL_CIO_CONTACTS.map((c) => c.orgName))),
      roleOptions: [
        'Руководитель, курирующий данное направление',
        'Руководитель структурного подразделения, курирующий данное направление',
        'Ответственный исполнитель (ввод и верификация ведомственных значений)',
      ],
    },
    'contacts-mef': {
      title: 'Список сотрудников Министерства экономики и финансов Московской области, курирующих Рейтинг-2026',
      shortTitle: 'Контакты МЭФ',
      orgColTitle: 'Управление / Отдел / Служба',
      badge: 'МЭФ МО',
      icon: Landmark,
      iconBg: 'bg-purple-50 text-purple-700 border-purple-200',
      allowedRoles: ['Администратор', 'МЭФ'],
      defaultOrgs: Array.from(new Set(INITIAL_MEF_CONTACTS.map((c) => c.orgName))),
      roleOptions: [
        'Руководитель, курирующий данное направление',
        'Руководитель структурного подразделения, курирующий данное направление',
        'Ответственный исполнитель (куратор расчета и валидации Рейтинга)',
        'Ответственный исполнитель (методологическое сопровождение формул и показателей)',
        'Ответственный исполнитель (технический администратор системы)',
        'Служба технической поддержки',
      ],
    },
  }[activeTab];

  // Список всех организаций для селекта
  const allOrgNames = useMemo(() => {
    return Array.from(new Set(contacts.map((c) => c.orgName))).filter(Boolean);
  }, [contacts]);

  // Фильтрация контактов
  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      const matchSearch =
        !q ||
        c.orgName.toLowerCase().includes(q) ||
        c.fio.toLowerCase().includes(q) ||
        c.position.toLowerCase().includes(q) ||
        c.roleCategory.toLowerCase().includes(q) ||
        c.phones.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q));

      const matchOrg = selectedOrg === 'all' || c.orgName === selectedOrg;
      const matchRole = selectedRoleCat === 'all' || c.roleCategory === selectedRoleCat;

      return matchSearch && matchOrg && matchRole;
    });
  }, [contacts, search, selectedOrg, selectedRoleCat]);

  // Группировка по организациям с сохранением порядка и сквозной нумерацией
  const groupedOrgs = useMemo(() => {
    const map = new Map<string, ContactItem[]>();
    filteredContacts.forEach((c) => {
      if (!map.has(c.orgName)) {
        map.set(c.orgName, []);
      }
      map.get(c.orgName)!.push(c);
    });

    let index = 1;
    const result: { num: number; orgName: string; contacts: ContactItem[] }[] = [];
    map.forEach((items, orgName) => {
      result.push({
        num: index++,
        orgName,
        contacts: items,
      });
    });
    return result;
  }, [filteredContacts]);

  // Обработчики CRUD
  const handleAddClick = () => {
    setEditingContact(null);
    setModalOpen(true);
  };

  const handleEditClick = (c: ContactItem) => {
    setEditingContact(c);
    setModalOpen(true);
  };

  const handleDeleteClick = (id: string, fio: string) => {
    if (confirm(`Вы действительно хотите удалить контакт ${fio || 'этого сотрудника'}?`)) {
      const updated = contacts.filter((c) => c.id !== id);
      saveContacts(updated);
    }
  };

  const handleSaveContact = (item: ContactItem) => {
    if (editingContact) {
      const updated = contacts.map((c) => (c.id === item.id ? item : c));
      saveContacts(updated);
    } else {
      saveContacts([...contacts, item]);
    }
  };

  // Экспорт в CSV / Excel
  const handleExportCsv = () => {
    const header = ['№', tabConfig.orgColTitle, 'Роль', 'ФИО', 'Должность', 'Контактный телефон', 'Email'];
    const rows: string[][] = [];

    groupedOrgs.forEach((group) => {
      group.contacts.forEach((c, idx) => {
        rows.push([
          idx === 0 ? String(group.num) : '',
          group.orgName,
          c.roleCategory,
          c.fio,
          c.position,
          c.phones.replace(/\n/g, '; '),
          c.email || '',
        ]);
      });
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [tabConfig.title, '', header.join(';'), ...rows.map((e) => e.map((val) => `"${val.replace(/"/g, '""')}"`).join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeTab}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isCurrentTabAllowed) {
    return (
      <div className="pt-6">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 mb-4">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Доступ ограничен</h3>
            <p className="mt-1 max-w-md text-sm text-slate-600">
              Данная вкладка недоступна для вашей текущей роли ({role.toUpperCase()}).
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = tabConfig.icon;

  return (
    <div className="space-y-4 pt-4 print:pt-0">
      {/* Верхняя информационная плашка */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg border shrink-0 ${tabConfig.iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-sm sm:text-base">
                {tabConfig.shortTitle}
              </span>
              <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700">
                {tabConfig.badge}
              </Badge>
              {canEdit && (
                <Badge className="text-[10px] bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-100">
                  Режим редактирования (Админ / МЭФ)
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Всего организаций: <b className="text-slate-700">{allOrgNames.length}</b> · Контактов в базе: <b className="text-slate-700">{contacts.length}</b>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 text-xs gap-1.5 text-slate-700 hover:text-slate-900"
            title="Выгрузить справочник в CSV/Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Экспорт</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 text-xs gap-1.5 text-slate-700 hover:text-slate-900"
            title="Распечатать таблицу контактов"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            <span>Печать</span>
          </Button>

          {canEdit && (
            <Button
              size="sm"
              onClick={handleAddClick}
              className="h-8 text-xs bg-[#1e5c8f] hover:bg-[#16486f] text-white gap-1.5 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Добавить контакт</span>
            </Button>
          )}
        </div>
      </div>

      {/* Панель поиска и фильтрации */}
      <div className="flex flex-wrap items-center gap-2.5 bg-white p-3 rounded-lg border shadow-sm print:hidden">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Поиск по ФИО, организации, должности, телефону или email..."
            className="pl-8 h-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="w-full sm:w-[220px]">
          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Все организации" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="all">Все ({allOrgNames.length})</SelectItem>
              {allOrgNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-[240px]">
          <Select value={selectedRoleCat} onValueChange={setSelectedRoleCat}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Все роли" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="all">Все роли</SelectItem>
              {tabConfig.roleOptions.map((roleOpt) => (
                <SelectItem key={roleOpt} value={roleOpt}>
                  {roleOpt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(search || selectedOrg !== 'all' || selectedRoleCat !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setSelectedOrg('all');
              setSelectedRoleCat('all');
            }}
            className="h-8 text-xs text-slate-500 hover:text-slate-800"
          >
            Сбросить фильтры
          </Button>
        )}
      </div>

      {/* Основная таблица контактов в стиле документа / отчёта */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {/* Заголовок документа по центру над таблицей (как на скриншоте) */}
        <div className="py-3 px-4 text-center border-b bg-slate-50/50">
          <h2 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 leading-snug tracking-tight">
            {tabConfig.title}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-sm">
            {/* Шапка таблицы (оливково-зеленоватый фон по скриншоту) */}
            <thead>
              <tr className="bg-[#dce6c8] border-b border-slate-400 text-slate-900 font-semibold text-center divide-x divide-slate-300">
                <th className="py-2.5 px-2 w-10 sm:w-12 text-center">№</th>
                <th className="py-2.5 px-3 w-[28%] text-center">
                  {tabConfig.orgColTitle}
                </th>
                <th className="py-2.5 px-3 w-[24%] text-center">ФИО</th>
                <th className="py-2.5 px-3 w-[24%] text-center">Должность</th>
                <th className="py-2.5 px-3 w-[20%] text-center">Контактный телефон</th>
                {canEdit && (
                  <th className="py-2.5 px-2 w-20 text-center print:hidden">Действия</th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-300">
              {groupedOrgs.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 6 : 5}
                    className="py-12 px-4 text-center text-slate-400 bg-white"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="h-8 w-8 text-slate-300" />
                      <span className="text-sm font-medium text-slate-600">Контакты не найдены</span>
                      <span className="text-xs text-slate-400">Попробуйте изменить параметры поиска или фильтрации</span>
                    </div>
                  </td>
                </tr>
              ) : (
                groupedOrgs.map((group) => (
                  <GroupRows
                    key={group.orgName}
                    group={group}
                    canEdit={canEdit}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно редактирования / создания */}
      {modalOpen && (
        <ContactModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          contact={editingContact}
          onSave={handleSaveContact}
          orgTitleLabel={tabConfig.orgColTitle}
          defaultOrgNames={tabConfig.defaultOrgs}
          roleOptions={tabConfig.roleOptions}
        />
      )}
    </div>
  );
}

// Компонент отрисовки группы организации и строк сотрудников
function GroupRows({
  group,
  canEdit,
  onEdit,
  onDelete,
}: {
  group: { num: number; orgName: string; contacts: ContactItem[] };
  canEdit: boolean;
  onEdit: (c: ContactItem) => void;
  onDelete: (id: string, fio: string) => void;
}) {
  return (
    <>
      {/* Строка-заголовок организации (№ и Наименование городского округа / ЦИО на голубовато-сером фоне) */}
      <tr className="bg-[#dbe5f1] border-t-2 border-b border-slate-400 font-bold text-slate-900 divide-x divide-slate-300">
        <td className="py-1.5 px-2 text-center align-middle font-bold text-xs sm:text-sm">
          {group.num}
        </td>
        <td
          colSpan={canEdit ? 5 : 4}
          className="py-1.5 px-3 text-left align-middle font-bold text-xs sm:text-sm tracking-wide text-slate-900"
        >
          {group.orgName}
        </td>
      </tr>

      {/* Строки сотрудников внутри организации */}
      {group.contacts.map((contact, idx) => {
        const phoneLines = contact.phones ? contact.phones.split('\n').filter(Boolean) : [];

        return (
          <tr
            key={contact.id || idx}
            className="hover:bg-sky-50/40 transition-colors border-b border-slate-300 divide-x divide-slate-300 text-xs sm:text-sm text-slate-800"
          >
            {/* Пустая ячейка номера (в строке сотрудника) */}
            <td className="py-2 px-2 text-center align-top text-slate-400 font-mono text-[11px]">
              {/* пусто либо маркер */}
            </td>

            {/* Роль в направлении */}
            <td className="py-2 px-3 align-top leading-snug">
              <span className="font-medium text-slate-800">{contact.roleCategory}</span>
              {contact.notes && (
                <div className="text-[11px] text-slate-500 mt-1 italic">
                  {contact.notes}
                </div>
              )}
            </td>

            {/* ФИО */}
            <td className="py-2 px-3 align-top font-medium text-slate-900 leading-snug">
              {contact.fio || <span className="text-slate-400 italic">—</span>}
            </td>

            {/* Должность */}
            <td className="py-2 px-3 align-top text-slate-700 leading-snug">
              {contact.position || <span className="text-slate-400 italic">—</span>}
            </td>

            {/* Контактные телефоны и email */}
            <td className="py-2 px-3 align-top leading-tight text-slate-800">
              <div className="space-y-1">
                {phoneLines.length > 0 ? (
                  phoneLines.map((ph, pIdx) => (
                    <div key={pIdx} className="font-mono text-xs text-slate-800 flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-slate-400 shrink-0 print:hidden" />
                      <span>{ph}</span>
                    </div>
                  ))
                ) : (
                  !contact.email && <span className="text-slate-400 italic">—</span>
                )}

                {contact.email && (
                  <div className="pt-0.5">
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-xs text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1.5 font-sans"
                    >
                      <Mail className="h-3 w-3 text-blue-600 shrink-0 print:hidden" />
                      <span>{contact.email}</span>
                    </a>
                  </div>
                )}
              </div>
            </td>

            {/* Кнопки действий (только для Админа и МЭФ) */}
            {canEdit && (
              <td className="py-2 px-2 text-center align-middle print:hidden">
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(contact)}
                    title="Редактировать контакт"
                    className="h-7 w-7 text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(contact.id, contact.fio)}
                    title="Удалить контакт"
                    className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            )}
          </tr>
        );
      })}
    </>
  );
}
