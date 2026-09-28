import React, { useState, useMemo } from 'react';
import { useNews } from '@/context/NewsContext';
import type { NewsItem } from '@/types/news';
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Paperclip,
  Search,
  FileText,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface NewsListPageProps {
  onNavigateCreate: () => void;
  onNavigateEdit: (newsId: string) => void;
}

export const NewsListPage: React.FC<NewsListPageProps> = ({
  onNavigateCreate,
  onNavigateEdit,
}) => {
  const { news, hasFullAccess, deleteNews, resetNewsToDefaults } = useNews();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');
  const [newsToDelete, setNewsToDelete] = useState<NewsItem | null>(null);
  const [deleteSuccessToast, setDeleteSuccessToast] = useState<string | null>(null);

  // Filter news
  const filteredNews = useMemo(() => {
    return news.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.attachedFile?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDate =
        selectedDateFilter === '' || item.date === selectedDateFilter;

      return matchesSearch && matchesDate;
    });
  }, [news, searchQuery, selectedDateFilter]);

  const uniqueDates = useMemo(() => {
    return Array.from(new Set(news.map((n) => n.date)));
  }, [news]);

  const handleDeleteConfirm = () => {
    if (newsToDelete) {
      const deletedTitle = newsToDelete.title;
      deleteNews(newsToDelete.id);
      setNewsToDelete(null);
      setDeleteSuccessToast(`Новость «${deletedTitle}» успешно удалена`);
      setTimeout(() => setDeleteSuccessToast(null), 3500);
    }
  };

  const handleDownloadFile = (fileName: string) => {
    const blob = new Blob([`Демонстрационный файл: ${fileName}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-4 py-2">
      {/* Хлебные крошки */}
      <nav className="text-xs text-slate-500 font-medium flex items-center gap-1.5 px-1 pt-1">
        <span>Московская область</span>
        <span className="text-slate-400">/</span>
        <span>Раздел новостей</span>
        <span className="text-slate-400">/</span>
        <span className="text-slate-800 font-semibold">Новостная страница</span>
      </nav>

      {/* Toast Notification */}
      {deleteSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#1e5c8f] text-white px-4 py-3 rounded-lg shadow-xl animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-5 w-5 text-emerald-300" />
          <span className="text-sm font-medium">{deleteSuccessToast}</span>
        </div>
      )}

      {/* Панель управления и фильтрации */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Поиск */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Поиск по новостям..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-slate-50 border-slate-300"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {/* Фильтр по дате */}
            {uniqueDates.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                  className="h-9 px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-700"
                >
                  <option value="">Все даты ({news.length})</option>
                  {uniqueDates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {news.length < 6 && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetNewsToDefaults}
                className="text-xs h-9 border-slate-300 text-slate-600 hover:text-slate-800"
                title="Сбросить к исходным 6 новостям"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Сбросить
              </Button>
            )}

            {/* Кнопка «Добавить новость» (только для Администратора и МЭФ) */}
            {hasFullAccess && (
              <Button
                onClick={onNavigateCreate}
                className="bg-[#1e5c8f] hover:bg-[#16486f] text-white text-xs h-9 shadow-xs flex items-center gap-1.5 px-3.5"
              >
                <Plus className="h-4 w-4" />
                <span>Добавить новость</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Список новостей — карточки */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm uppercase tracking-wide">
            <FileText className="h-4 w-4 text-[#1e5c8f]" />
            <span>Список новостей</span>
          </div>
          <div className="text-xs text-slate-500">
            Всего публикаций: <b className="text-slate-700">{filteredNews.length}</b>
          </div>
        </div>

        {filteredNews.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <AlertCircle className="h-8 w-8 mx-auto text-slate-400 mb-2" />
            <div className="text-sm font-semibold text-slate-700">Новости не найдены</div>
            <p className="text-xs text-slate-400 mt-1">Попробуйте изменить поисковый запрос.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredNews.map((item) => (
              <article
                key={item.id}
                className="p-5 transition-colors hover:bg-slate-50/60 group"
              >
                {/* Верхняя строка: Заголовок (жирный) и Дата справа в формате ДД.ММ.ГГГГ */}
                <div className="flex items-start justify-between gap-4 mb-2.5">
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {item.title}
                  </h3>
                  <div className="shrink-0 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                    {item.date}
                  </div>
                </div>

                {/* Текст новости */}
                <div
                  className="text-sm text-slate-700 leading-relaxed mb-3 prose prose-slate max-w-none"
                  dangerouslySetInnerHTML={{ __html: item.content }}
                />

                {/* Прикрепленный файл (если есть) */}
                {item.attachedFile && (
                  <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded text-xs text-slate-700">
                    <Paperclip className="h-3.5 w-3.5 text-[#1e5c8f] shrink-0" />
                    <span className="font-medium truncate max-w-sm">{item.attachedFile.name}</span>
                    <span className="text-[11px] text-slate-500">({item.attachedFile.size})</span>
                    <button
                      onClick={() => handleDownloadFile(item.attachedFile!.name)}
                      title="Скачать файл"
                      className="ml-1 p-1 text-[#1e5c8f] hover:text-[#16486f] rounded"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Иконки действий внизу справа: корзина (удалить) и карандаш (редактировать) */}
                {hasFullAccess && (
                  <div className="flex items-center justify-end gap-1.5 pt-2">
                    <button
                      onClick={() => onNavigateEdit(item.id)}
                      title="Редактировать новость"
                      className="p-1.5 rounded text-slate-500 hover:text-[#1e5c8f] hover:bg-blue-50 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setNewsToDelete(item)}
                      title="Удалить новость"
                      className="p-1.5 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Диалог подтверждения удаления */}
      <Dialog open={!!newsToDelete} onOpenChange={(open) => !open && setNewsToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-white border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <span>Удаление новости</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2">
              Вы уверены, что хотите удалить новость{' '}
              <b className="text-slate-800">«{newsToDelete?.title}»</b> от {newsToDelete?.date}?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex items-center justify-end gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewsToDelete(null)}
              className="text-xs h-8"
            >
              Отмена
            </Button>
            <Button
              size="sm"
              onClick={handleDeleteConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
