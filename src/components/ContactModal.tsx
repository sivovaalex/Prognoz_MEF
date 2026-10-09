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
import { Textarea } from '@/components/ui/textarea';
import type { ContactItem } from '@/lib/contactsData';

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Partial<ContactItem> | null;
  onSave: (item: ContactItem) => void;
  orgTitleLabel: string;
  defaultOrgNames?: string[];
  roleOptions?: string[];
}

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
}: ContactModalProps) {
  const [formData, setFormData] = useState<Partial<ContactItem>>({
    orgName: '',
    roleCategory: roleOptions[0] || 'Руководитель, курирующий данное направление',
    fio: '',
    position: '',
    phones: '',
    email: '',
    notes: '',
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        id: contact.id || '',
        orgId: contact.orgId || '',
        orgName: contact.orgName || '',
        roleCategory: contact.roleCategory || roleOptions[0] || '',
        fio: contact.fio || '',
        position: contact.position || '',
        phones: contact.phones || '',
        email: contact.email || '',
        notes: contact.notes || '',
      });
    } else {
      setFormData({
        id: '',
        orgId: '',
        orgName: defaultOrgNames[0] || '',
        roleCategory: roleOptions[0] || '',
        fio: '',
        position: '',
        phones: '',
        email: '',
        notes: '',
      });
    }
  }, [contact, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orgName?.trim()) {
      alert('Пожалуйста, укажите наименование организации / округа');
      return;
    }

    const orgId = formData.orgId || formData.orgName.toLowerCase().replace(/[^a-zа-я0-9]/gi, '_');
    const item: ContactItem = {
      id: formData.id || `contact-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orgId,
      orgName: formData.orgName.trim(),
      roleCategory: formData.roleCategory?.trim() || roleOptions[0],
      fio: formData.fio?.trim() || '',
      position: formData.position?.trim() || '',
      phones: formData.phones?.trim() || '',
      email: formData.email?.trim() || '',
      notes: formData.notes?.trim() || '',
    };

    onSave(item);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-800">
            {contact?.id ? 'Редактирование контакта' : 'Добавление нового контакта'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="orgName" className="text-xs font-semibold text-slate-700">
              {orgTitleLabel} <span className="text-red-500">*</span>
            </Label>
            {defaultOrgNames.length > 0 ? (
              <div className="space-y-1">
                <Input
                  id="orgName"
                  list="org-list"
                  placeholder="Выберите из списка или введите наименование..."
                  value={formData.orgName || ''}
                  onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                  className="h-9 text-sm"
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
                className="h-9 text-sm"
                required
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="roleCategory" className="text-xs font-semibold text-slate-700">
              Роль в направлении / Категория <span className="text-red-500">*</span>
            </Label>
            <Input
              id="roleCategory"
              list="role-list"
              placeholder="Выберите или укажите роль..."
              value={formData.roleCategory || ''}
              onChange={(e) => setFormData({ ...formData, roleCategory: e.target.value })}
              className="h-9 text-sm"
              required
            />
            <datalist id="role-list">
              {roleOptions.map((role) => (
                <option key={role} value={role} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fio" className="text-xs font-semibold text-slate-700">
                ФИО сотрудника
              </Label>
              <Input
                id="fio"
                placeholder="Иванов Иван Иванович"
                value={formData.fio || ''}
                onChange={(e) => setFormData({ ...formData, fio: e.target.value })}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="position" className="text-xs font-semibold text-slate-700">
                Должность
              </Label>
              <Input
                id="position"
                placeholder="Заместитель Главы / Начальник управления..."
                value={formData.position || ''}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phones" className="text-xs font-semibold text-slate-700">
                Контактные телефоны
              </Label>
              <Textarea
                id="phones"
                placeholder="8(495) 123-45-67 доб. 1234&#10;8(916) 000-00-00"
                value={formData.phones || ''}
                onChange={(e) => setFormData({ ...formData, phones: e.target.value })}
                className="text-xs resize-none h-20"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                Электронная почта (Email)
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@mosreg.ru"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-9 text-sm"
              />

              <div className="pt-1">
                <Label htmlFor="notes" className="text-xs text-slate-500">
                  Примечание
                </Label>
                <Input
                  id="notes"
                  placeholder="Дополнительные сведения..."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="h-8 text-xs text-slate-600"
                />
              </div>
            </div>
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
