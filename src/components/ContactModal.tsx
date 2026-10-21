import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Phone,
  Smartphone,
  Plus,
  Trash2,
  Mail,
  Building,
  User,
  Briefcase,
  Hash,
  Layers,
  Save,
  AlertCircle,
  Landmark,
  Users,
  Building2,
} from 'lucide-react';
import type { ContactItem, AdditionalPhone } from '@/lib/contactsData';

export interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Partial<ContactItem> | null;
  onSave: (item: ContactItem) => void;
  orgTitleLabel?: string;
  defaultOrgNames?: string[];
  roleOptions?: string[];
  tabType?: 'contacts-omsu' | 'contacts-cio' | 'contacts-mef';
  isCioTab?: boolean;
  allContacts?: ContactItem[];
}

/** Автоматическая маска форматирования телефонного номера (+7 / 8) */
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

const DEFAULT_DISTRICTS = [
  'Балашиха',
  'Бронницы',
  'Власиха (ЗАТО)',
  'Воскресенск',
  'Дзержинский',
  'Дмитровский',
  'Долгопрудный',
  'Домодедово',
  'Дубна',
  'Егорьевск',
  'Жуковский',
  'Зарайск',
  'Истра',
  'Кашира',
  'Клин',
  'Коломна',
  'Королёв',
  'Котельники',
  'Красногорск',
  'Краснознаменск',
  'Ленинский',
  'Лобня',
  'Лосино-Петровский',
  'Луховицы',
  'Лыткарино',
  'Люберцы',
  'Можайский',
  'Мытищи',
  'Наро-Фоминский',
  'Богородский',
  'Одинцовский',
  'Орехово-Зуевский',
  'Павловский Посад',
  'Подольск',
  'Протвино',
  'Пушкинский',
  'Пущино',
  'Раменский',
  'Реутов',
  'Рузский',
  'Сергиево-Посадский',
  'Серебряные Пруды',
  'Серпухов',
  'Солнечногорск',
  'Ступино',
  'Талдомский',
  'Фрязино',
  'Химки',
  'Черноголовка',
  'Чехов',
  'Шатура',
  'Шаховская',
  'Щёлково',
  'Электросталь',
];

// =========================================================================
// ОБЩИЙ БЛОК ВВОДА ТЕЛЕФОНОВ
// =========================================================================
function PhoneSection({
  workPhone,
  workPhoneExt,
  setWorkPhoneExt,
  mobilePhone,
  additionalPhones,
  setAdditionalPhones,
  handleWorkPhoneChange,
  handleMobilePhoneChange,
}: {
  workPhone: string;
  workPhoneExt: string;
  setWorkPhoneExt: (v: string) => void;
  mobilePhone: string;
  additionalPhones: AdditionalPhone[];
  setAdditionalPhones: React.Dispatch<React.SetStateAction<AdditionalPhone[]>>;
  handleWorkPhoneChange: (v: string) => void;
  handleMobilePhoneChange: (v: string) => void;
}) {
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

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-200/90 pb-2">
        <span className="font-semibold text-slate-800 text-xs sm:text-sm">
          Контактный телефон
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddAdditionalPhone}
          className="h-7 text-xs bg-white text-[#1e5c8f] border-blue-200 hover:bg-blue-50 hover:text-blue-900 gap-1.5 font-medium shadow-2xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Добавить телефон</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
        <div className="sm:col-span-2 space-y-1">
          <Label htmlFor="workPhone" className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
            <Phone className="h-3 w-3 text-slate-500" />
            <span>Контактный телефон</span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <Input
              id="workPhone"
              type="tel"
              placeholder="+7 (___) ___-__-__"
              value={workPhone}
              onChange={(e) => handleWorkPhoneChange(e.target.value)}
              className="pl-8 h-9 text-xs font-mono bg-white"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="workPhoneExt" className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
            <Hash className="h-3 w-3 text-slate-400" />
            <span>доб.</span>
          </Label>
          <Input
            id="workPhoneExt"
            placeholder="доб."
            value={workPhoneExt ? `доб. ${workPhoneExt}` : ''}
            onChange={(e) => setWorkPhoneExt(e.target.value.replace(/^доб\.?\s*/i, '').trim())}
            className="h-9 text-xs font-mono bg-white text-center"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="mobilePhone" className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
          <Smartphone className="h-3 w-3 text-slate-500" />
          <span>Мобильный телефон</span>
        </Label>
        <div className="relative">
          <Smartphone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <Input
            id="mobilePhone"
            type="tel"
            placeholder="+7 (916) 123-45-67"
            value={mobilePhone}
            onChange={(e) => handleMobilePhoneChange(e.target.value)}
            className="pl-8 h-9 text-xs font-mono bg-white"
          />
        </div>
      </div>

      {additionalPhones.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-slate-200/80">
          <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
            <span>Дополнительные телефоны:</span>
            <span className="text-[10px] text-slate-400 font-normal">({additionalPhones.length})</span>
          </div>

          {additionalPhones.map((ap, idx) => (
            <div key={ap.id} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <div className="w-full sm:w-32 shrink-0">
                <Input
                  placeholder={`Метка (тел. ${idx + 1})`}
                  value={ap.label || ''}
                  onChange={(e) => handleUpdateAdditionalPhone(ap.id, 'label', e.target.value)}
                  className="h-8 text-xs bg-slate-50/50"
                />
              </div>

              <div className="relative flex-1 min-w-[160px]">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
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
                  className="h-8 text-xs font-mono text-center bg-slate-50/50"
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveAdditionalPhone(ap.id)}
                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                title="Удалить номер"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="text-[11px] text-slate-500 bg-white/70 p-2 rounded-md border border-slate-200/60 flex items-center gap-1.5">
        <span className="text-sky-600 font-bold">ℹ</span>
        <span>Формат <code className="font-mono bg-white px-1 py-0.5 rounded border text-[10px] text-slate-700">+7 (XXX) XXX-XX-XX</code> применяется автоматически при наборе цифр.</span>
      </div>
    </div>
  );
}

// =========================================================================
// 1. МОДАЛЬНОЕ ОКНО ДЛЯ ВКЛАДКИ ОМСУ
// =========================================================================
function OmsuModal({
  open,
  onOpenChange,
  contact,
  onSave,
  defaultOrgNames = DEFAULT_DISTRICTS,
}: ContactModalProps) {
  const [orgName, setOrgName] = useState('');
  const [roleCategory, setRoleCategory] = useState('Ответственный исполнитель (ввод значений показателя в систему ГАС «Управление»)');
  const [fio, setFio] = useState('');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [workPhone, setWorkPhone] = useState('');
  const [workPhoneExt, setWorkPhoneExt] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [additionalPhones, setAdditionalPhones] = useState<AdditionalPhone[]>([]);

  const [errors, setErrors] = useState<{ orgName?: string; fio?: string }>({});
  const orgInputRef = useRef<HTMLInputElement>(null);
  const fioInputRef = useRef<HTMLInputElement>(null);

  const roleOptions = [
    'Руководитель, курирующий данное направление',
    'Руководитель структурного подразделения, курирующий данное направление',
    'Ответственный исполнитель (ввод значений показателя в систему ГАС «Управление»)',
  ];

  useEffect(() => {
    setErrors({});
    if (contact) {
      setOrgName(contact.orgName || '');
      setRoleCategory(contact.roleCategory || roleOptions[0]);
      setFio(contact.fio || '');
      setPosition(contact.position || '');
      setEmail(contact.email || '');

      const parsed = parseInitialPhones(contact);
      setWorkPhone(parsed.workPhone);
      setWorkPhoneExt(parsed.workPhoneExt);
      setMobilePhone(parsed.mobilePhone);
      setAdditionalPhones(parsed.additionalPhones);
    } else {
      setOrgName(defaultOrgNames[0] || 'Балашиха');
      setRoleCategory(roleOptions[0]);
      setFio('');
      setPosition('');
      setEmail('');
      setWorkPhone('');
      setWorkPhoneExt('');
      setMobilePhone('');
      setAdditionalPhones([]);
    }
  }, [contact, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { orgName?: string; fio?: string } = {};

    if (!orgName.trim()) {
      errs.orgName = 'Пожалуйста, выберите или укажите городской округ';
    }
    if (!fio.trim()) {
      errs.fio = 'Пожалуйста, укажите ФИО сотрудника';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      if (errs.orgName) orgInputRef.current?.focus();
      else if (errs.fio) fioInputRef.current?.focus();
      return;
    }

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

    const orgId = contact?.orgId || orgName.trim().toLowerCase().replace(/[^a-zа-я0-9]/gi, '_');

    const item: ContactItem = {
      id: contact?.id || `omsu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orgId,
      orgName: orgName.trim(),
      roleCategory: roleCategory.trim(),
      fio: fio.trim(),
      position: position.trim(),
      workPhone: workPhone.trim() || undefined,
      workPhoneExt: workPhoneExt.trim() || undefined,
      mobilePhone: mobilePhone.trim() || undefined,
      additionalPhones: additionalPhones.filter((ap) => ap.phone.trim()).length > 0
        ? additionalPhones.filter((ap) => ap.phone.trim())
        : undefined,
      phones: phoneLines.join('\n'),
      email: email.trim() || '',
    };

    onSave(item);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 shadow-xl border border-slate-200">
        <DialogHeader className="p-5 pb-4 border-b bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
                  {contact?.id ? 'Редактирование контакта' : 'Добавление контакта'}
                </DialogTitle>
                <Badge variant="outline" className="text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                  ОМСУ
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="omsu-org" className="text-xs font-medium text-slate-700 flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  <span>Городской округ</span>
                  <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    ref={orgInputRef}
                    id="omsu-org"
                    list="omsu-district-list"
                    placeholder="Выберите или укажите округ..."
                    value={orgName}
                    onChange={(e) => {
                      setOrgName(e.target.value);
                      if (errors.orgName) setErrors((prev) => ({ ...prev, orgName: undefined }));
                    }}
                    className={`pl-8 h-9 text-xs sm:text-sm bg-white font-medium ${
                      errors.orgName ? 'border-red-400 focus-visible:ring-red-300' : ''
                    }`}
                  />
                </div>
                {errors.orgName && (
                  <p className="text-[11px] text-red-600 flex items-center gap-1 font-medium mt-0.5">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{errors.orgName}</span>
                  </p>
                )}
                <datalist id="omsu-district-list">
                  {DEFAULT_DISTRICTS.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1">
                <Label htmlFor="omsu-role" className="text-xs font-medium text-slate-700 flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                  <span>Роль в направлении</span>
                  <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    id="omsu-role"
                    list="omsu-role-options"
                    placeholder="Выберите роль в направлении..."
                    value={roleCategory}
                    onChange={(e) => setRoleCategory(e.target.value)}
                    className="pl-8 h-9 text-xs sm:text-sm bg-white"
                  />
                </div>
                <datalist id="omsu-role-options">
                  {roleOptions.map((role) => (
                    <option key={role} value={role} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="omsu-fio" className="text-xs font-medium text-slate-700 flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>ФИО</span>
                  <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    ref={fioInputRef}
                    id="omsu-fio"
                    placeholder="Шведова Ирина Владимировна"
                    value={fio}
                    onChange={(e) => {
                      setFio(e.target.value);
                      if (errors.fio) setErrors((prev) => ({ ...prev, fio: undefined }));
                    }}
                    className={`pl-8 h-9 text-xs sm:text-sm bg-white ${
                      errors.fio ? 'border-red-400 focus-visible:ring-red-300' : ''
                    }`}
                  />
                </div>
                {errors.fio && (
                  <p className="text-[11px] text-red-600 flex items-center gap-1 font-medium mt-0.5">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{errors.fio}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="omsu-pos" className="text-xs font-medium text-slate-700 flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                  <span>Должность</span>
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    id="omsu-pos"
                    placeholder="Заместитель Главы городского округа..."
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="pl-8 h-9 text-xs sm:text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Секция 3: Телефоны */}
          <PhoneSection
            workPhone={workPhone}
            workPhoneExt={workPhoneExt}
            setWorkPhoneExt={setWorkPhoneExt}
            mobilePhone={mobilePhone}
            additionalPhones={additionalPhones}
            setAdditionalPhones={setAdditionalPhones}
            handleWorkPhoneChange={(val) => setWorkPhone(formatPhoneMask(val) || val)}
            handleMobilePhoneChange={(val) => setMobilePhone(formatPhoneMask(val) || val)}
          />

          {/* Секция 4: Почта */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 shadow-2xs">
            <Label htmlFor="omsu-email" className="text-xs font-medium text-slate-700 flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span>Электронная почта</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <Input
                id="omsu-email"
                type="email"
                placeholder="shvedova@balashiha.ru"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-8 h-9 text-xs sm:text-sm bg-white"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" size="sm" className="bg-[#1e5c8f] hover:bg-[#16486f] text-white gap-1.5 shadow-sm text-xs px-4">
              <Save className="h-4 w-4" />
              <span>Сохранить контакт</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================================
// 2. МОДАЛЬНОЕ ОКНО ДЛЯ ВКЛАДКИ ЦИО
// =========================================================================
function CioModal({
  open,
  onOpenChange,
  contact,
  onSave,
}: ContactModalProps) {
  const [num, setNum] = useState('');
  const [indicatorName, setIndicatorName] = useState('');
  const [cioName, setCioName] = useState('Минтер');
  const [roleCategory, setRoleCategory] = useState('Ответственный исполнитель');
  const [isGroupHeader, setIsGroupHeader] = useState(false);
  const [fio, setFio] = useState('');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [workPhone, setWorkPhone] = useState('');
  const [workPhoneExt, setWorkPhoneExt] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [additionalPhones, setAdditionalPhones] = useState<AdditionalPhone[]>([]);

  const [errors, setErrors] = useState<{ indicatorName?: string; fio?: string; cioName?: string }>({});
  const indInputRef = useRef<HTMLInputElement>(null);
  const cioInputRef = useRef<HTMLInputElement>(null);
  const fioInputRef = useRef<HTMLInputElement>(null);

  const roleOptions = [
    'Ответственный исполнитель',
    'Руководитель, курирующий данное направление',
    'Руководитель структурного подразделения, курирующий данное направление',
  ];

  useEffect(() => {
    setErrors({});
    if (contact) {
      setNum(contact.num || '');
      setIndicatorName(contact.indicatorName || contact.orgName || '');
      const initialCio = contact.cioName !== undefined ? contact.cioName : (contact.isGroupHeader ? '' : (contact.orgName || ''));
      setCioName(initialCio);
      setRoleCategory(contact.roleCategory || roleOptions[0]);
      setIsGroupHeader(contact.isGroupHeader || false);
      setFio(contact.fio || '');
      setPosition(contact.position || '');
      setEmail(contact.email || '');

      const parsed = parseInitialPhones(contact);
      setWorkPhone(parsed.workPhone);
      setWorkPhoneExt(parsed.workPhoneExt);
      setMobilePhone(parsed.mobilePhone);
      setAdditionalPhones(parsed.additionalPhones);
    } else {
      setNum('');
      setIndicatorName('');
      setCioName('');
      setRoleCategory(roleOptions[0]);
      setIsGroupHeader(false);
      setFio('');
      setPosition('');
      setEmail('');
      setWorkPhone('');
      setWorkPhoneExt('');
      setMobilePhone('');
      setAdditionalPhones([]);
    }
  }, [contact, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { indicatorName?: string; fio?: string; cioName?: string } = {};

    if (!indicatorName.trim()) {
      errs.indicatorName = 'Пожалуйста, укажите наименование показателя / критерия';
    }
    // Если чекбокс "Строка-заголовок" прожат, заполнение ЦИО необязательно
    if (!isGroupHeader && !cioName.trim()) {
      errs.cioName = 'Пожалуйста, укажите курирующий ЦИО';
    }
    if (!isGroupHeader && !fio.trim()) {
      errs.fio = 'Пожалуйста, укажите ФИО ответственного исполнителя';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      if (errs.indicatorName) indInputRef.current?.focus();
      else if (errs.cioName) cioInputRef.current?.focus();
      else if (errs.fio) fioInputRef.current?.focus();
      return;
    }

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

    const orgId = (cioName.trim() || indicatorName.trim()).toLowerCase().replace(/[^a-zа-я0-9]/gi, '_');

    const item: ContactItem = {
      id: contact?.id || `cio-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      num: num.trim() || undefined,
      indicatorName: indicatorName.trim(),
      cioName: cioName.trim(),
      orgName: cioName.trim() || indicatorName.trim(),
      orgId,
      roleCategory: roleCategory.trim(),
      isGroupHeader,
      fio: isGroupHeader ? '' : fio.trim(),
      position: isGroupHeader ? '' : position.trim(),
      workPhone: !isGroupHeader && workPhone.trim() ? workPhone.trim() : undefined,
      workPhoneExt: !isGroupHeader && workPhoneExt.trim() ? workPhoneExt.trim() : undefined,
      mobilePhone: !isGroupHeader && mobilePhone.trim() ? mobilePhone.trim() : undefined,
      additionalPhones: !isGroupHeader && additionalPhones.filter((ap) => ap.phone.trim()).length > 0
        ? additionalPhones.filter((ap) => ap.phone.trim())
        : undefined,
      phones: isGroupHeader ? '' : phoneLines.join('\n'),
      email: isGroupHeader ? '' : email.trim(),
    };

    onSave(item);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 shadow-xl border border-slate-200">
        <DialogHeader className="p-5 pb-4 border-b bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shrink-0 shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
                  {contact?.id ? 'Редактирование контакта' : 'Добавление контакта'}
                </DialogTitle>
                <Badge variant="outline" className="text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200">
                  ЦИО
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-1">
                <Label htmlFor="cio-num" className="text-xs font-medium text-slate-700 flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5 text-slate-400" />
                  <span>№</span>
                </Label>
                <Input
                  id="cio-num"
                  placeholder="1. / 3.1."
                  value={num}
                  onChange={(e) => setNum(e.target.value)}
                  className="h-9 text-xs sm:text-sm font-mono text-center bg-white"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cio-name" className="text-xs font-medium text-slate-700 flex items-center gap-1">
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    <span>ЦИО</span>
                    {!isGroupHeader && <span className="text-red-500">*</span>}
                  </Label>
                  {isGroupHeader && (
                    <span className="text-[11px] text-slate-400">необязательно</span>
                  )}
                </div>
                <div className="relative">
                  <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    ref={cioInputRef}
                    id="cio-name"
                    list="cio-name-list"
                    placeholder={isGroupHeader ? 'Необязательно для строки-заголовка' : 'Минтер / ГУРБ / МИМП / Минчистоты...'}
                    value={cioName}
                    onChange={(e) => {
                      setCioName(e.target.value);
                      if (errors.cioName) setErrors((prev) => ({ ...prev, cioName: undefined }));
                    }}
                    className={`pl-8 h-9 text-xs sm:text-sm bg-white font-medium ${
                      errors.cioName ? 'border-red-400 focus-visible:ring-red-300' : ''
                    }`}
                  />
                </div>
                {errors.cioName && (
                  <p className="text-[11px] text-red-600 flex items-center gap-1 font-medium mt-0.5">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{errors.cioName}</span>
                  </p>
                )}
                <datalist id="cio-name-list">
                  {DEFAULT_CIO_LIST.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="cio-ind" className="text-xs font-medium text-slate-700 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                <span>Наименование показателя / критерия</span>
                <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Layers className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  ref={indInputRef}
                  id="cio-ind"
                  placeholder="Доверие к власти / Инфоугрозы / Мой Дом и Двор..."
                  value={indicatorName}
                  onChange={(e) => {
                    setIndicatorName(e.target.value);
                    if (errors.indicatorName) setErrors((prev) => ({ ...prev, indicatorName: undefined }));
                  }}
                  className={`pl-8 h-9 text-xs sm:text-sm bg-white ${
                    errors.indicatorName ? 'border-red-400 focus-visible:ring-red-300' : ''
                  }`}
                />
              </div>
              {errors.indicatorName && (
                <p className="text-[11px] text-red-600 flex items-center gap-1 font-medium mt-0.5">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{errors.indicatorName}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 mt-2">
              <input
                type="checkbox"
                id="cio-group-header"
                checked={isGroupHeader}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsGroupHeader(checked);
                  if (checked && errors.cioName) {
                    setErrors((prev) => ({ ...prev, cioName: undefined }));
                  }
                  if (checked && errors.fio) {
                    setErrors((prev) => ({ ...prev, fio: undefined }));
                  }
                }}
                className="rounded border-slate-300 text-[#1e5c8f] focus:ring-[#1e5c8f] h-4 w-4"
              />
              <Label htmlFor="cio-group-header" className="text-xs text-slate-600 font-normal cursor-pointer select-none">
                Строка-заголовок (без контакта, ЦИО необязателен)
              </Label>
            </div>
          </div>

          {!isGroupHeader && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 shadow-2xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cio-fio" className="text-xs font-medium text-slate-700 flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>ФИО</span>
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <Input
                      ref={fioInputRef}
                      id="cio-fio"
                      placeholder="Прохоров Святослав Игоревич"
                      value={fio}
                      onChange={(e) => {
                        setFio(e.target.value);
                        if (errors.fio) setErrors((prev) => ({ ...prev, fio: undefined }));
                      }}
                      className={`pl-8 h-9 text-xs sm:text-sm bg-white ${
                        errors.fio ? 'border-red-400 focus-visible:ring-red-300' : ''
                      }`}
                    />
                  </div>
                  {errors.fio && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1 font-medium mt-0.5">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{errors.fio}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cio-pos" className="text-xs font-medium text-slate-700 flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                    <span>Должность</span>
                  </Label>
                  <div className="relative">
                    <Briefcase className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <Input
                      id="cio-pos"
                      placeholder="Заведующий отделом мониторинга..."
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="pl-8 h-9 text-xs sm:text-sm bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isGroupHeader && (
            <PhoneSection
              workPhone={workPhone}
              workPhoneExt={workPhoneExt}
              setWorkPhoneExt={setWorkPhoneExt}
              mobilePhone={mobilePhone}
              additionalPhones={additionalPhones}
              setAdditionalPhones={setAdditionalPhones}
              handleWorkPhoneChange={(val) => setWorkPhone(formatPhoneMask(val) || val)}
              handleMobilePhoneChange={(val) => setMobilePhone(formatPhoneMask(val) || val)}
            />
          )}

          {!isGroupHeader && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 shadow-2xs">
              <Label htmlFor="cio-email" className="text-xs font-medium text-slate-700 flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>Электронная почта</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  id="cio-email"
                  type="email"
                  placeholder="ProkhorovSI@mosreg.ru"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-8 h-9 text-xs sm:text-sm bg-white"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" size="sm" className="bg-[#1e5c8f] hover:bg-[#16486f] text-white gap-1.5 shadow-sm text-xs px-4">
              <Save className="h-4 w-4" />
              <span>Сохранить контакт</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================================
// 3. МОДАЛЬНОЕ ОКНО ДЛЯ ВКЛАДКИ МЭФ
// =========================================================================
function MefModal({
  open,
  onOpenChange,
  contact,
  onSave,
  allContacts,
}: ContactModalProps) {
  const [num, setNum] = useState('');
  const [indicatorName, setIndicatorName] = useState('');
  const [cioName, setCioName] = useState('Минтер');
  const [roleCategory, setRoleCategory] = useState('Ответственный сотрудник МЭФ');
  const [fio, setFio] = useState('');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [workPhone, setWorkPhone] = useState('8 (498) 602-85-00');
  const [workPhoneExt, setWorkPhoneExt] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [additionalPhones, setAdditionalPhones] = useState<AdditionalPhone[]>([]);

  const [errors, setErrors] = useState<{ indicatorName?: string; fio?: string; cioName?: string }>({});
  const indInputRef = useRef<HTMLInputElement>(null);
  const cioInputRef = useRef<HTMLInputElement>(null);
  const fioInputRef = useRef<HTMLInputElement>(null);

  const roleOptions = [
    'Ответственный сотрудник МЭФ',
    'Руководитель, курирующий данное направление',
    'Заведующий отделом',
  ];

  const isChildIndicator = Boolean(num.includes('.') || (contact?.num && contact.num.includes('.')));
  const parentNum = num ? num.split('.')[0] : (contact?.num ? contact.num.split('.')[0] : '');
  const parentContact = (allContacts && parentNum) ? allContacts.find((c) => c.num === parentNum) : (
    parentNum === '3' ? { indicatorName: 'Коммуникация и политика', fio: 'Бородулина Елена Владимировна', workPhone: '8 (498) 602-85-00', workPhoneExt: '45-461', phones: '8 (498) 602-85-00, доб. 45-461', email: 'borodulinaEV@mosreg.ru' } :
    parentNum === '4' ? { indicatorName: 'Мой Дом и Двор', fio: 'Бородулина Елена Владимировна', workPhone: '8 (498) 602-85-00', workPhoneExt: '45-461', phones: '8 (498) 602-85-00, доб. 45-461', email: 'borodulinaEV@mosreg.ru' } :
    parentNum === '6' ? { indicatorName: 'Модернизация ЖКХ', fio: 'Копылова Юлия Владимировна', workPhone: '8 (498) 602-85-00', workPhoneExt: '45-582', phones: '8 (498) 602-85-00, доб. 45-582', email: 'kopylovaYV@mosreg.ru' } :
    null
  );

  useEffect(() => {
    setErrors({});
    if (contact) {
      setNum(contact.num || '');
      setIndicatorName(contact.indicatorName || contact.orgName || '');
      setCioName(contact.cioName !== undefined ? contact.cioName : (contact.orgName || ''));
      setRoleCategory(contact.roleCategory || roleOptions[0]);
      setFio(contact.fio || '');
      setPosition(contact.position || '');
      setEmail(contact.email || '');

      const parsed = parseInitialPhones(contact);
      setWorkPhone(parsed.workPhone || '8 (498) 602-85-00');
      setWorkPhoneExt(parsed.workPhoneExt);
      setMobilePhone(parsed.mobilePhone);
      setAdditionalPhones(parsed.additionalPhones);
    } else {
      setNum('');
      setIndicatorName('');
      setCioName('');
      setRoleCategory(roleOptions[0]);
      setFio('');
      setPosition('');
      setEmail('');
      setWorkPhone('8 (498) 602-85-00');
      setWorkPhoneExt('');
      setMobilePhone('');
      setAdditionalPhones([]);
    }
  }, [contact, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { indicatorName?: string; fio?: string; cioName?: string } = {};

    if (!indicatorName.trim()) {
      errs.indicatorName = 'Укажите показатель/критерии';
    }
    if (!cioName.trim()) {
      errs.cioName = 'Укажите отв. ЦИО';
    }
    // Для дочернего показателя ФИО необязательно (наследуется от родителя)
    if (!isChildIndicator && !fio.trim()) {
      errs.fio = 'Укажите ФИО';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      if (errs.cioName) cioInputRef.current?.focus();
      else if (errs.indicatorName) indInputRef.current?.focus();
      else if (errs.fio) fioInputRef.current?.focus();
      return;
    }

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

    const orgId = cioName.trim().toLowerCase().replace(/[^a-zа-я0-9]/gi, '_');

    const item: ContactItem = {
      id: contact?.id || `mef-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      num: num.trim() || undefined,
      indicatorName: indicatorName.trim(),
      cioName: cioName.trim(),
      orgName: cioName.trim(),
      orgId,
      roleCategory: roleCategory.trim(),
      isGroupHeader: false,
      fio: fio.trim(),
      position: position.trim(),
      workPhone: workPhone.trim() ? workPhone.trim() : undefined,
      workPhoneExt: workPhoneExt.trim() ? workPhoneExt.trim() : undefined,
      mobilePhone: mobilePhone.trim() ? mobilePhone.trim() : undefined,
      additionalPhones: additionalPhones.filter((ap) => ap.phone.trim()).length > 0
        ? additionalPhones.filter((ap) => ap.phone.trim())
        : undefined,
      phones: phoneLines.join('\n'),
      email: email.trim(),
    };

    onSave(item);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 shadow-xl border border-slate-200">
        <DialogHeader className="p-5 pb-4 border-b bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-200 shrink-0 shadow-xs">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
                  {contact?.id ? 'Редактирование контакта' : 'Добавление контакта'}
                </DialogTitle>
                <Badge variant="outline" className="text-xs font-semibold bg-purple-50 text-purple-700 border-purple-200">
                  МЭФ
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
          {/* Информационный блок для дочернего показателя */}
          {isChildIndicator && parentContact && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-900 flex items-start gap-2.5 shadow-2xs">
              <span className="font-bold text-blue-600 text-sm leading-none mt-0.5">ℹ</span>
              <div className="space-y-0.5">
                <div className="font-semibold text-blue-950">
                  Дочерний показатель направления № {parentNum} «{parentContact.indicatorName}»
                </div>
                <p className="text-[11px] text-blue-800 leading-normal">
                  Ответственный ЦИО может отличаться от родительского показателя и задается индивидуально для каждой строчки.
                  Ответственные сотрудники МЭФ (ФИО, телефон, email) наследуются от родительского показателя{parentContact.fio ? ` (${parentContact.fio})` : ''}, если оставить их незаполненными.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-1">
                <Label htmlFor="mef-num" className="text-xs font-medium text-slate-700 flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5 text-slate-400" />
                  <span>№</span>
                </Label>
                <Input
                  id="mef-num"
                  placeholder="1 / 3.1"
                  value={num}
                  onChange={(e) => setNum(e.target.value)}
                  className="h-9 text-xs sm:text-sm font-mono text-center bg-white"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="mef-cio" className="text-xs font-medium text-slate-700 flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  <span>отв. ЦИО</span>
                  <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    ref={cioInputRef}
                    id="mef-cio"
                    list="mef-cio-list"
                    placeholder="Минтер / ГУРБ / МИМП / Минчистоты..."
                    value={cioName}
                    onChange={(e) => {
                      setCioName(e.target.value);
                      if (errors.cioName) setErrors((prev) => ({ ...prev, cioName: undefined }));
                    }}
                    className={`pl-8 h-9 text-xs sm:text-sm bg-white font-medium ${
                      errors.cioName ? 'border-red-400 focus-visible:ring-red-300' : ''
                    }`}
                  />
                </div>
                {errors.cioName && (
                  <p className="text-[11px] text-red-600 flex items-center gap-1 font-medium mt-0.5">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{errors.cioName}</span>
                  </p>
                )}
                <datalist id="mef-cio-list">
                  {DEFAULT_CIO_LIST.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="mef-ind" className="text-xs font-medium text-slate-700 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                <span>Показатель/критерии</span>
                <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Layers className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  ref={indInputRef}
                  id="mef-ind"
                  placeholder="Доверие к власти / Инфоугрозы / Мой Дом и Двор..."
                  value={indicatorName}
                  onChange={(e) => {
                    setIndicatorName(e.target.value);
                    if (errors.indicatorName) setErrors((prev) => ({ ...prev, indicatorName: undefined }));
                  }}
                  className={`pl-8 h-9 text-xs sm:text-sm bg-white ${
                    errors.indicatorName ? 'border-red-400 focus-visible:ring-red-300' : ''
                  }`}
                />
              </div>
              {errors.indicatorName && (
                <p className="text-[11px] text-red-600 flex items-center gap-1 font-medium mt-0.5">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{errors.indicatorName}</span>
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="mef-fio" className="text-xs font-medium text-slate-700 flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>ФИО</span>
                  {!isChildIndicator && <span className="text-red-500">*</span>}
                </Label>
                {isChildIndicator && parentContact?.fio && (
                  <span className="text-[11px] text-blue-700 font-medium">
                    По умолчанию: {parentContact.fio}
                  </span>
                )}
              </div>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  ref={fioInputRef}
                  id="mef-fio"
                  placeholder={
                    isChildIndicator && parentContact?.fio
                      ? `Как у родителя (${parentContact.fio})`
                      : 'Бородулина Елена Владимировна'
                  }
                  value={fio}
                  onChange={(e) => {
                    setFio(e.target.value);
                    if (errors.fio) setErrors((prev) => ({ ...prev, fio: undefined }));
                  }}
                  className={`pl-8 h-9 text-xs sm:text-sm bg-white ${
                    errors.fio ? 'border-red-400 focus-visible:ring-red-300' : ''
                  }`}
                />
              </div>
              {errors.fio && (
                <p className="text-[11px] text-red-600 flex items-center gap-1 font-medium mt-0.5">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{errors.fio}</span>
                </p>
              )}
            </div>
          </div>

          <PhoneSection
            workPhone={workPhone}
            workPhoneExt={workPhoneExt}
            setWorkPhoneExt={setWorkPhoneExt}
            mobilePhone={mobilePhone}
            additionalPhones={additionalPhones}
            setAdditionalPhones={setAdditionalPhones}
            handleWorkPhoneChange={(val) => setWorkPhone(formatPhoneMask(val) || val)}
            handleMobilePhoneChange={(val) => setMobilePhone(formatPhoneMask(val) || val)}
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 shadow-2xs">
            <Label htmlFor="mef-email" className="text-xs font-medium text-slate-700 flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span>Электронная почта</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <Input
                id="mef-email"
                type="email"
                placeholder={isChildIndicator && parentContact?.email ? `Как у родителя (${parentContact.email})` : 'borodulinaEV@mosreg.ru'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-8 h-9 text-xs sm:text-sm bg-white"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" size="sm" className="bg-[#1e5c8f] hover:bg-[#16486f] text-white gap-1.5 shadow-sm text-xs px-4">
              <Save className="h-4 w-4" />
              <span>Сохранить контакт</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================================
// ГЛАВНЫЙ ДИСПЕТЧЕР: ВЫЗЫВАЕТ СПЕЦИАЛИЗИРОВАННОЕ МОДАЛЬНОЕ ОКНО ДЛЯ ВКЛАДКИ
// =========================================================================
export function ContactModal(props: ContactModalProps) {
  const { tabType = 'contacts-omsu', isCioTab } = props;

  if (isCioTab || tabType === 'contacts-cio') {
    return <CioModal {...props} />;
  }

  if (tabType === 'contacts-mef') {
    return <MefModal {...props} />;
  }

  return <OmsuModal {...props} />;
}
