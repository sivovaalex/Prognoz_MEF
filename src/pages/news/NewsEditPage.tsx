import React, { useState, useEffect, useRef } from 'react';
import { useNews } from '@/context/NewsContext';
import { WysiwygEditor } from '@/components/news/WysiwygEditor';
import type { AttachedFile } from '@/types/news';
import {
  Calendar,
  Save,
  Plus,
  ArrowLeft,
  Paperclip,
  Upload,
  X,
  FileText,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NewsEditPageProps {
  newsId?: string | null; // null or undefined means Create Mode, otherwise Edit Mode
  onNavigateBack: () => void;
}

// Convert YYYY-MM-DD to DD.MM.YYYY and vice versa
const toInputDateFormat = (dmyString: string): string => {
  if (!dmyString) return '';
  const parts = dmyString.split('.');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dmyString;
};

const toDisplayDateFormat = (ymdString: string): string => {
  if (!ymdString) return '';
  const parts = ymdString.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}.${month}.${year}`;
  }
  return ymdString;
};

const getTodayInputDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const NewsEditPage: React.FC<NewsEditPageProps> = ({
  newsId,
  onNavigateBack,
}) => {
  const { getNewsById, addNews, updateNews, hasFullAccess, currentRoleInfo } = useNews();
  const isEditMode = Boolean(newsId);

  const existingNews = newsId ? getNewsById(newsId) : null;

  // Form states
  const [dateInput, setDateInput] = useState<string>(() => {
    if (existingNews) {
      return toInputDateFormat(existingNews.date);
    }
    return getTodayInputDate();
  });

  const [title, setTitle] = useState<string>(() => existingNews?.title || '');
  const [content, setContent] = useState<string>(() => existingNews?.content || '');
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(() => existingNews?.attachedFile || null);

  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if newsId changes or existing news loads
  useEffect(() => {
    if (existingNews) {
      setDateInput(toInputDateFormat(existingNews.date));
      setTitle(existingNews.title);
      setContent(existingNews.content);
      setAttachedFile(existingNews.attachedFile || null);
    } else if (!isEditMode) {
      setDateInput(getTodayInputDate());
      setTitle('');
      setContent('');
      setAttachedFile(null);
    }
  }, [existingNews, isEditMode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      const sizeStr = parseFloat(sizeInMB) > 0.1 ? `${sizeInMB} МБ` : `${(file.size / 1024).toFixed(1)} КБ`;

      setAttachedFile({
        name: file.name,
        size: sizeStr,
        type: file.type,
      });
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: { title?: string; content?: string } = {};
    if (!title.trim()) {
      newErrors.title = 'Пожалуйста, введите заголовок новости';
    }
    if (!content.trim() || content === '<p></p>' || content === '<p><br></p>') {
      newErrors.content = 'Пожалуйста, введите текст новости';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const formattedDate = toDisplayDateFormat(dateInput);

    if (isEditMode && newsId) {
      updateNews(newsId, {
        title,
        date: formattedDate,
        content,
        attachedFile,
      });
    } else {
      addNews({
        title,
        date: formattedDate,
        content,
        attachedFile,
      });
    }

    setSaveSuccess(true);
    setTimeout(() => {
      onNavigateBack();
    }, 1000);
  };

  // If user role does NOT have full access (OMSU or CIO)
  if (!hasFullAccess) {
    return (
      <div className="w-full space-y-4">
        <nav className="text-xs text-slate-500 font-medium flex items-center gap-1.5 px-1 pt-1">
          <span>Московская область</span>
          <span className="text-slate-400">/</span>
          <span>Раздел новостей</span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-800 font-semibold">{isEditMode ? 'Редактирование новости' : 'Создание новости'}</span>
        </nav>

        <div className="w-full bg-white border border-rose-200 rounded-lg p-8 shadow-xs text-center max-w-2xl mx-auto my-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3">
            <ShieldAlert className="h-7 w-7" />
          </div>

          <h2 className="text-lg font-bold text-slate-900 mb-1.5">
            Доступ запрещён
          </h2>
          <p className="text-xs text-slate-600 mb-5">
            У вашей текущей роли (<b>{currentRoleInfo.name}</b>) доступ только на просмотр. Создание и редактирование новостей доступны только для ролей Администратор и МЭФ.
          </p>

          <Button
            onClick={onNavigateBack}
            className="bg-[#1e5c8f] hover:bg-[#16486f] text-white text-xs h-9 px-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            К списку новостей
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Хлебные крошки */}
      <nav className="text-xs text-slate-500 font-medium flex items-center gap-1.5 px-1 pt-1">
        <span>Московская область</span>
        <span className="text-slate-400">/</span>
        <span>Раздел новостей</span>
        <span className="text-slate-400">/</span>
        <span className="text-slate-800 font-semibold">
          {isEditMode ? 'Редактирование новости' : 'Создание новости'}
        </span>
      </nav>

      {/* Toast Notification */}
      {saveSuccess && (
        <div className="fixed top-24 right-6 z-50 flex items-center gap-2 bg-[#1e5c8f] text-white px-4 py-3 rounded-lg shadow-xl animate-in slide-in-from-top-5">
          <CheckCircle2 className="h-5 w-5 text-emerald-300" />
          <span className="text-sm font-medium">
            {isEditMode ? 'Новость сохранена' : 'Новость добавлена'}
          </span>
        </div>
      )}

      {/* Основная карточка формы */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm uppercase tracking-wide">
            <FileText className="h-4 w-4 text-[#1e5c8f]" />
            <span>{isEditMode ? 'Редактирование новости' : 'Создание новости'}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateBack}
            className="text-xs text-slate-600 hover:text-slate-900 h-8"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Назад
          </Button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Дата создания и Заголовок */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Дата создания — поле ввода даты */}
            <div className="sm:col-span-1 space-y-1.5">
              <Label htmlFor="news-date" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#1e5c8f]" />
                <span>Дата создания <span className="text-rose-500">*</span></span>
              </Label>
              <Input
                id="news-date"
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="h-9 text-xs bg-slate-50 border-slate-300 focus:bg-white"
                required
              />
              <div className="text-[10px] text-slate-400">Формат: {toDisplayDateFormat(dateInput)}</div>
            </div>

            {/* Заголовок — текстовое поле */}
            <div className="sm:col-span-3 space-y-1.5">
              <Label htmlFor="news-title" className="text-xs font-semibold text-slate-700">
                Заголовок <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="news-title"
                type="text"
                placeholder="Введите заголовок новости (например: Рейтинг-2026)"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                className={`h-9 text-xs bg-slate-50 border-slate-300 focus:bg-white font-medium ${
                  errors.title ? 'border-rose-400' : ''
                }`}
                required
              />
              {errors.title && (
                <div className="text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{errors.title}</span>
                </div>
              )}
            </div>
          </div>

          {/* Текст новости — WYSIWYG-редактор */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Текст новости <span className="text-rose-500">*</span>
            </Label>
            <WysiwygEditor
              value={content}
              onChange={(html) => {
                setContent(html);
                if (errors.content) setErrors((prev) => ({ ...prev, content: undefined }));
              }}
              placeholder="Введите текст новости..."
              minHeight="260px"
            />
            {errors.content && (
              <div className="text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{errors.content}</span>
              </div>
            )}
          </div>

          {/* Выбрать файлы */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5 text-[#1e5c8f]" />
              <span>Прикрепить файл</span>
            </Label>

            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 shadow-2xs flex items-center gap-1.5"
              >
                <Upload className="h-3.5 w-3.5 text-[#1e5c8f]" />
                <span>Выбрать файлы</span>
              </Button>

              <span className="text-xs text-slate-500">
                {attachedFile ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Файл выбран
                  </span>
                ) : (
                  'Файл не выбран'
                )}
              </span>
            </div>

            {/* Поле для отображения имени выбранного файла */}
            {attachedFile && (
              <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between gap-3 max-w-md">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-[#1e5c8f] shrink-0" />
                  <div className="text-xs font-medium text-slate-800 truncate" title={attachedFile.name}>
                    {attachedFile.name}
                  </div>
                  <div className="text-[10px] text-slate-500 shrink-0">
                    ({attachedFile.size})
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  title="Удалить прикреплённый файл"
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Кнопка Добавить / Сохранить и Ссылка «К списку новостей» */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="submit"
              className="bg-[#1e5c8f] hover:bg-[#16486f] text-white text-xs h-9 px-5 shadow-xs flex items-center gap-1.5"
            >
              {isEditMode ? (
                <>
                  <Save className="h-4 w-4" />
                  <span>Сохранить</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Добавить</span>
                </>
              )}
            </Button>

            {/* Ссылка «К списку новостей» под формой */}
            <button
              type="button"
              onClick={onNavigateBack}
              className="text-xs text-[#1e5c8f] hover:text-[#16486f] hover:underline flex items-center gap-1 font-medium transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>К списку новостей</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
