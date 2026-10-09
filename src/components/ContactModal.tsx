import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Smartphone, Plus, Trash2, Mail, Building, User, Briefcase, PhoneCall, Hash, Layers } from 'lucide-react';
import type { ContactItem, AdditionalPhone } from '@/lib/contactsData';

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Partial<ContactItem> | null;
  onSave: (item: ContactItem) => void;
  orgTitleLabel: string;
  defaultOrgNames?: string[];
  roleOptions?: string[];
  tabType?: 'contacts-omsu' | 'contacts-cio' | 'contacts-mef';
  isCioTab?: boolean;
}

/** Маска форматирования телефонного номера (+7 / 8) */
export function formatPhoneMask(input: string): string {
  if (!input) return '';
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';

  let prefix = '+7 ';
  let rest = '';

  if (digits[0] === '8') {
    prefix = '8 ';
    rest = digits.slice(1);
  } else if (digits[0] === '7') {
    prefix = '+7 ';
    rest = digits.slice(1);
  } else if (digits[0] === '9' || digits[0] === '4') {
    prefix = '+7 ';
    rest = digits;
  } else {
    prefix = `+${digits[0]} `;
    rest = digits.slice(1);
  }

  let formatted = prefix;
  if (rest.length > 0) {
    formatted += `(${rest.slice(0, 3)}`;
  }
  if (rest.length >= 3) {
    formatted += `) ${rest.slice(3, 6)}`;
  }
  if (rest.length >= 6) {
    formatted += `-${rest.slice(6, 8)}`;
  }
  if (rest.length >= 8) {
    formatted += `-${rest.slice(8, 10)}`;
  }
  return formatted;
}

/** Разбор строки телефонов в раздельные структурированные поля */
function parseInitialPhones(c: Partial<ContactItem> | null): {
  workPhone: string;
  workPhoneExt: string;
  mobilePhone: string;
  additionalPhones: AdditionalPhone[];
} {
  if (!c) {
    return { workPhone: '', workPhoneExt: '', mobilePhone: '', additionalPhones: [] };
  }

  // Если уже есть явные структурированные поля
  if (c.workPhone || c.mobilePhone || (c.additionalPhones && c.additionalPhones.length > 0)) {
    return {
      workPhone: c.workPhone ? formatPhoneMask(c.workPhone) || c.workPhone : '',
      workPhoneExt: c.workPhoneExt || '',
      mobilePhone: c.mobilePhone ? formatPhoneMask(c.mobilePhone) || c.mobilePhone : '',
      additionalPhones: (c.additionalPhones || []).map((ap) => ({
        id: ap.id || `add-phone-${Math.random().toString(36).substring(2, 6)}`,
        label: ap.label || '',
        phone: formatPhoneMask(ap.phone) || ap.phone,
        ext: ap.ext || '',
      })),
    };
  }

  // Если есть только строка phones (обратная совместимость)
  if (!c.phones) {
    return { workPhone: '', workPhoneExt: '', mobilePhone: '', additionalPhones: [] };
  }

  const lines = c.phones.split(/[\n;]/).map((l) => l.trim()).filter(Boolean);
  let workPhone = '';
  let workPhoneExt = '';
  let mobilePhone = '';
  const additionalPhones: AdditionalPhone[] = [];

  lines.forEach((line, idx) => {
    const dobMatch = line.match(/(?:доб\.?|ext\.?)\s*(\d+)/i);
    let ext = '';
    let main = line;
    if (dobMatch) {
      ext = dobMatch[1];
      main = line.replace(/(?:доб\.?|ext\.?)\s*\d+/i, '').trim();
    }
    const cleanNumber = formatPhoneMask(main) || main;

    if (idx === 0) {
      workPhone = cleanNumber;
      workPhoneExt = ext;
    } else if (idx === 1 && !mobilePhone && (cleanNumber.includes('9') || lines.length === 2)) {
      mobilePhone = cleanNumber;
    } else {
      additionalPhones.push({
        id: `add-phone-${idx}-${Date.now()}`,
        label: 'Доп. телефон',
        phone: cleanNumber,
        ext,
      });
    }
  });

  return { workPhone, workPhoneExt, mobilePhone, additionalPhones };
}

const DEFAULT_CIO_LIST = [
  'Минтер',
  'ГУРБ',
  'МИМП',
  'Мингос',
  'Минспорт',
  'Минчистоты',
  'Минтранс',
  'Минжилполитики',
  'Минкульт',
  'Минэкологии',
  'Минсоцразвития',
  'Главгосстройнадзор',
  'Минсельхозпрод',
  'МинЖКХ',
  'Минэнерго',
  'Минздрав',
  'Минобр',
];

export function ContactModal({
  open,
  onOpenChange,
  contact,
  onSave,
  orgTitleLabel,
  defaultOrgNames = [],
  roleOptions = [
    'Руководитель, курирующий данное направление',
    'Руководитель структурного подразделения, курирующий данное направление',
    'Ответственный исполнитель (ввод значений показателя в систему ГАС «Управление»)',
    'Ответственный исполнитель (ввод и верификация ведомственных значений)',
    'Ответственный исполнитель (куратор расчета и валидации Рейтинга)',
    'Служба технической поддержки',
  ],
  tabType = 'contacts-omsu',
  isCioTab = false,
}: ContactModalProps) {
  const isIndicatorMode = isCioTab || tabType === 'contacts-cio' || tabType === 'contacts-mef';
  const isMefTab = tabType === 'contacts-mef';

  const [formData, setFormData] = useState<Partial<ContactItem>>({
    num: '',
    indicatorName: '',
    cioName: '',
    orgName: '',
    roleCategory: roleOptions[0] || 'Ответственный исполнитель',
    fio: '',
    position: '',
    email: '',
    isGroupHeader: false,
  });

  // Раздельные состояния для каждого поля телефона
  const [workPhone, setWorkPhone] = useState('');
  const [workPhoneExt, setWorkPhoneExt] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [additionalPhones, setAdditionalPhones] = useState<AdditionalPhone[]>([]);

  useEffect(() => {
    if (contact) {
      setFormData({
        id: contact.id || '',
        num: contact.num || '',
        indicatorName: contact.indicatorName || contact.orgName || '',
        cioName: contact.cioName || '',
        orgId: contact.orgId || '',
        orgName: contact.orgName || '',
        roleCategory: contact.roleCategory || roleOptions[0] || '',
        fio: contact.fio || '',
        position: contact.position || '',
        email: contact.email || '',
        isGroupHeader: contact.isGroupHeader || false,
      });

      const parsed = parseInitialPhones(contact);
      setWorkPhone(parsed.workPhone);
      setWorkPhoneExt(parsed.workPhoneExt);
      setMobilePhone(parsed.mobilePhone);
      setAdditionalPhones(parsed.additionalPhones);
    } else {
      setFormData({
        id: '',
        num: '',
        indicatorName: '',
        cioName: defaultOrgNames[0] || '',
        orgId: '',
        orgName: defaultOrgNames[0] || '',
        roleCategory: isMefTab ? 'Ответственный сотрудник МЭФ' : (roleOptions[0] || ''),
        fio: '',
        position: '',
        email: '',
        isGroupHeader: false,
      });
      setWorkPhone('');
      setWorkPhoneExt('');
      setMobilePhone('');
      setAdditionalPhones([]);
    }
  }, [contact, open, isMefTab]);

  // Обработчики ввода номеров с маской
  const handleWorkPhoneChange = (val: string) => {
    setWorkPhone(formatPhoneMask(val) || val);
  };

  const handleMobilePhoneChange = (val: string) => {
    setMobilePhone(formatPhoneMask(val) || val);
  };

  const handleAddAdditionalPhone = () => {
    setAdditionalPhones((prev) => [
      ...prev,
      {
        id: `add-phone-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        label: '',
        phone: '',
        ext: '',
      },
    ]);
  };

  const handleUpdateAdditionalPhone = (id: string, field: keyof AdditionalPhone, val: string) => {
    setAdditionalPhones((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === 'phone') {
          return { ...item, phone: formatPhoneMask(val) || val };
        }
        if (field === 'ext') {
          return { ...item, ext: val.replace(/\D/g, '').slice(0, 8) };
        }
        return { ...item, [field]: val };
      })
    );
  };

  const handleRemoveAdditionalPhone = (id: string) => {
    setAdditionalPhones((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isIndicatorMode) {
      if (!formData.indicatorName?.trim()) {
        alert('Пожалуйста, укажите наименование показателя / критерия');
        return;
      }
    } else {
      if (!formData.orgName?.trim()) {
        alert('Пожалуйста, укажите наименование организации / округа');
        return;
      }
    }

    // Собираем сводную строку phones для обратной совместимости
    const phoneLines: string[] = [];
    if (workPhone.trim()) {
      const ext = workPhoneExt.trim() ? ` доб. ${workPhoneExt.trim()}` : '';
      phoneLines.push(`${workPhone.trim()}${ext}`);
    }
    if (mobilePhone.trim()) {
      phoneLines.push(mobilePhone.trim());
    }
    additionalPhones.forEach((ap) => {
      if (ap.phone.trim()) {
        const ext = ap.ext?.trim() ? ` доб. ${ap.ext.trim()}` : '';
        const label = ap.label?.trim() ? ` (${ap.label.trim()})` : '';
        phoneLines.push(`${ap.phone.trim()}${ext}${label}`);
      }
    });

    const orgName = isIndicatorMode
      ? formData.indicatorName?.trim() || ''
      : formData.orgName?.trim() || '';

    const orgId = formData.orgId || orgName.toLowerCase().replace(/[^a-zа-я0-9]/gi, '_');

    const item: ContactItem = {
      id: formData.id || `contact-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      num: formData.num?.trim() || undefined,
      indicatorName: isIndicatorMode ? formData.indicatorName?.trim() : undefined,
      cioName: isIndicatorMode ? formData.cioName?.trim() : undefined,
      isGroupHeader: formData.isGroupHeader || false,
      orgId,
      orgName,
      roleCategory: formData.roleCategory?.trim() || (isMefTab ? 'Ответственный сотрудник МЭФ' : roleOptions[0]),
      fio: formData.fio?.trim() || '',
      position: formData.position?.trim() || '',
      // Раздельные структурированные поля
      workPhone: workPhone.trim() || undefined,
      workPhoneExt: workPhoneExt.trim() || undefined,
      mobilePhone: mobilePhone.trim() || undefined,
      additionalPhones: additionalPhones.filter((ap) => ap.phone.trim()).length > 0
        ? additionalPhones.filter((ap) => ap.phone.trim())
        : undefined,
      phones: phoneLines.join('\n'),
      email: formData.email?.trim() || '',
    };

    onSave(item);
    onOpenChange(false);
  };

  const modalTitle = contact?.id
    ? (isMefTab ? 'Редактирование показателя / контакта МЭФ' : (isCioTab ? 'Редактирование контакта ЦИО' : 'Редактирование контакта'))
    : (isMefTab ? 'Добавление показателя / контакта МЭФ' : (isCioTab ? 'Добавление нового показателя ЦИО' : 'Добавление нового контакта'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg font-semibold text-slate-800 flex items-center gap-2">
            <User className="h-5 w-5 text-[#1e5c8f]" />
            <span>{modalTitle}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Специфические поля для ЦИО и МЭФ: № показателя, Наименование показателя, ЦИО */}
          {isIndicatorMode ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="num" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-slate-500" />
                    <span>№ п/п</span>
                  </Label>
                  <Input
                    id="num"
                    placeholder={isMefTab ? "1 / 3.1" : "1. / 3.1."}
                    value={formData.num || ''}
                    onChange={(e) => setFormData({ ...formData, num: e.target.value })}
                    className="h-9 text-xs sm:text-sm font-mono text-center"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor="indicatorName" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-slate-500" />
                    <span>Показатель / критерии</span>
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="indicatorName"
                    placeholder="Например: Доверие к власти / Инфоугрозы..."
                    value={formData.indicatorName || ''}
                    onChange={(e) => setFormData({ ...formData, indicatorName: e.target.value })}
                    className="h-9 text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cioName" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-slate-500" />
                  <span>{isMefTab ? 'отв. ЦИО' : 'Курирующий ЦИО'}</span>
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cioName"
                  list="cio-list"
                  placeholder="Минтер / ГУРБ / МИМП / Минчистоты / Минэнерго..."
                  value={formData.cioName || ''}
                  onChange={(e) => setFormData({ ...formData, cioName: e.target.value })}
                  className="h-9 text-xs sm:text-sm font-medium"
                  required
                />
                <datalist id="cio-list">
                  {DEFAULT_CIO_LIST.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isGroupHeader"
                  checked={formData.isGroupHeader || false}
                  onChange={(e) => setFormData({ ...formData, isGroupHeader: e.target.checked })}
                  className="rounded border-slate-300 text-[#1e5c8f] focus:ring-[#1e5c8f]"
                />
                <Label htmlFor="isGroupHeader" className="text-xs text-slate-600 font-normal cursor-pointer">
                  Строка-заголовок направления (группы) без ответственного сотрудника
                </Label>
              </div>
            </div>
          ) : (
            /* Поля для ОМСУ: Организация + Роль */
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="orgName" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-slate-500" />
                  <span>{orgTitleLabel}</span>
                  <span className="text-red-500">*</span>
                </Label>
                {defaultOrgNames.length > 0 ? (
                  <div className="space-y-1">
                    <Input
                      id="orgName"
                      list="org-list"
                      placeholder="Выберите из списка или введите наименование..."
                      value={formData.orgName || ''}
                      onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                      className="h-9 text-xs sm:text-sm"
                      required
                    />
                    <datalist id="org-list">
                      {defaultOrgNames.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                ) : (
                  <Input
                    id="orgName"
                    placeholder="Наименование..."
                    value={formData.orgName || ''}
                    onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                    className="h-9 text-xs sm:text-sm"
                    required
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="roleCategory" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                  <span>Роль в направлении / Категория</span>
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="roleCategory"
                  list="role-list"
                  placeholder="Выберите или укажите роль..."
                  value={formData.roleCategory || ''}
                  onChange={(e) => setFormData({ ...formData, roleCategory: e.target.value })}
                  className="h-9 text-xs sm:text-sm"
                  required
                />
                <datalist id="role-list">
                  {roleOptions.map((role) => (
                    <option key={role} value={role} />
                  ))}
                </datalist>
              </div>
            </div>
          )}

          {/* ФИО и Должность (для всех или если не заголовок) */}
          {!formData.isGroupHeader && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fio" className="text-xs font-semibold text-slate-700">
                  {isMefTab
                    ? 'Ответственные сотрудники МЭФ (ФИО)'
                    : isCioTab
                    ? 'Ответственный исполнитель ФИО'
                    : 'ФИО сотрудника'}
                </Label>
                <Input
                  id="fio"
                  placeholder="Иванов Иван Иванович"
                  value={formData.fio || ''}
                  onChange={(e) => setFormData({ ...formData, fio: e.target.value })}
                  className="h-9 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="position" className="text-xs font-semibold text-slate-700">
                  Должность
                </Label>
                <Input
                  id="position"
                  placeholder="Заведующий отделом / Консультант..."
                  value={formData.position || ''}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
            </div>
          )}

          {/* Блок контактных телефонов с отдельными полями ввода */}
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-1.5">
                <PhoneCall className="h-4 w-4 text-[#1e5c8f]" />
                <span className="text-xs font-semibold text-slate-800">
                  Контактный телефон рабочий / мобильный
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddAdditionalPhone}
                className="h-7 text-xs bg-white text-[#1e5c8f] border-blue-200 hover:bg-blue-50 hover:text-blue-900 gap-1 shadow-2xs font-medium"
                title="Добавить дополнительный номер телефона"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Добавить еще телефон</span>
              </Button>
            </div>

            {/* 1. Поле: Рабочий (городской) телефон */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="workPhone" className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-500" />
                  <span>Рабочий телефон</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    id="workPhone"
                    type="tel"
                    placeholder="8 (498) 602-83-70"
                    value={workPhone}
                    onChange={(e) => handleWorkPhoneChange(e.target.value)}
                    className="pl-8 h-8 text-xs font-mono bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="workPhoneExt" className="text-[11px] font-medium text-slate-600">
                  Добавочный номер
                </Label>
                <Input
                  id="workPhoneExt"
                  placeholder="доб. 53-903"
                  value={workPhoneExt ? `доб. ${workPhoneExt}` : ''}
                  onChange={(e) => setWorkPhoneExt(e.target.value.replace(/^доб\.?\s*/i, '').trim())}
                  className="h-8 text-xs font-mono bg-white text-center"
                />
              </div>
            </div>

            {/* 2. Поле: Мобильный телефон */}
            <div className="space-y-1">
              <Label htmlFor="mobilePhone" className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                <Smartphone className="h-3 w-3 text-slate-500" />
                <span>Мобильный телефон</span>
              </Label>
              <div className="relative">
                <Smartphone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  id="mobilePhone"
                  type="tel"
                  placeholder="+7 (962) 965-77-47"
                  value={mobilePhone}
                  onChange={(e) => handleMobilePhoneChange(e.target.value)}
                  className="pl-8 h-8 text-xs font-mono bg-white"
                />
              </div>
            </div>

            {/* 3+. Список дополнительных телефонов (динамический) */}
            {additionalPhones.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-slate-200/80">
                <div className="text-[11px] font-semibold text-slate-700">
                  Дополнительные телефонные номера:
                </div>

                {additionalPhones.map((ap, idx) => (
                  <div key={ap.id} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-2 rounded border border-slate-200">
                    <div className="w-full sm:w-32 shrink-0">
                      <Input
                        placeholder={`Доп. тел. ${idx + 1}`}
                        value={ap.label || ''}
                        onChange={(e) => handleUpdateAdditionalPhone(ap.id, 'label', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="relative flex-1 min-w-[160px]">
                      <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        type="tel"
                        placeholder="+7 (___) ___-__-__"
                        value={ap.phone}
                        onChange={(e) => handleUpdateAdditionalPhone(ap.id, 'phone', e.target.value)}
                        className="pl-8 h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="w-24 shrink-0">
                      <Input
                        placeholder="доб."
                        value={ap.ext ? `доб. ${ap.ext}` : ''}
                        onChange={(e) => handleUpdateAdditionalPhone(ap.id, 'ext', e.target.value)}
                        className="h-8 text-xs font-mono text-center"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAdditionalPhone(ap.id)}
                      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                      title="Удалить этот дополнительный номер"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="text-[11px] text-slate-500">
              Маска <code className="font-mono bg-white px-1 py-0.5 rounded border text-[10px]">+7 (XXX) XXX-XX-XX</code> применяется автоматически при вводе цифр.
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-slate-500" />
              <span>Электронная почта</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="user@mosreg.ru"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="h-9 text-xs sm:text-sm"
            />
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" size="sm" className="bg-[#1e5c8f] hover:bg-[#16486f] text-white">
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
