import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Undo,
  Redo,
  Code,
  Palette,
  RemoveFormatting,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WysiwygEditorProps {
  value: string;
  onChange: (htmlContent: string) => void;
  placeholder?: string;
  minHeight?: string;
  readOnly?: boolean;
}

const FONT_COLORS = [
  '#000000', '#333333', '#666666', '#999999',
  '#1e40af', '#2563eb', '#0284c7', '#0d9488',
  '#15803d', '#16a34a', '#ca8a04', '#d97706',
  '#dc2626', '#b91c1c', '#7c3aed', '#9333ea',
];

const BG_COLORS = [
  '#ffffff', '#f1f5f9', '#fef08a', '#bbf7d0',
  '#bae6fd', '#fed7aa', '#fecdd3', '#e9d5ff',
];

export const WysiwygEditor: React.FC<WysiwygEditorProps> = ({
  value,
  onChange,
  placeholder = 'Введите текст новости...',
  minHeight = '320px',
  readOnly = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [sourceCode, setSourceCode] = useState(value);
  const [activeHeading, setActiveHeading] = useState<string>('p');
  const [activeFontSize, setActiveFontSize] = useState<string>('3'); // 3 corresponds to ~16px in execCommand fontSize

  // Modal states
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // Sync editor content from value prop
  useEffect(() => {
    if (editorRef.current && !isSourceMode) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
    setSourceCode(value);
  }, [value, isSourceMode]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setSourceCode(html);
      onChange(html);
    }
  };

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (readOnly || isSourceMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, value);
    handleInput();
  };

  const handleHeadingChange = (tag: string) => {
    setActiveHeading(tag);
    if (tag === 'p') {
      executeCommand('formatBlock', '<p>');
    } else {
      executeCommand('formatBlock', `<${tag}>`);
    }
  };

  const handleFontSizeChange = (size: string) => {
    setActiveFontSize(size);
    executeCommand('fontSize', size);
  };

  const handleInsertLink = () => {
    if (!linkUrl.trim()) return;
    if (editorRef.current) editorRef.current.focus();
    
    if (linkText.trim()) {
      const html = `<a href="${linkUrl.trim()}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">${linkText.trim()}</a>`;
      executeCommand('insertHTML', html);
    } else {
      executeCommand('createLink', linkUrl.trim());
    }
    
    setLinkUrl('');
    setLinkText('');
    setIsLinkModalOpen(false);
  };

  const handleInsertImage = () => {
    if (!imageUrl.trim()) return;
    if (editorRef.current) editorRef.current.focus();
    const html = `<img src="${imageUrl.trim()}" alt="${imageAlt.trim() || 'Изображение'}" class="max-w-full h-auto rounded my-2 border border-slate-200" />`;
    executeCommand('insertHTML', html);
    setImageUrl('');
    setImageAlt('');
    setIsImageModalOpen(false);
  };

  const handleInsertTable = () => {
    const rows = Math.max(1, tableRows);
    const cols = Math.max(1, tableCols);
    
    let tableHtml = '<table class="w-full border-collapse border border-slate-300 my-3 text-sm">\n  <thead>\n    <tr class="bg-slate-100">\n';
    for (let c = 0; c < cols; c++) {
      tableHtml += `      <th class="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700">Заголовок ${c + 1}</th>\n`;
    }
    tableHtml += '    </tr>\n  </thead>\n  <tbody>\n';
    for (let r = 0; r < rows; r++) {
      tableHtml += '    <tr>\n';
      for (let c = 0; c < cols; c++) {
        tableHtml += `      <td class="border border-slate-300 px-3 py-1.5 text-slate-600">Ячейка ${r + 1}.${c + 1}</td>\n`;
      }
      tableHtml += '    </tr>\n';
    }
    tableHtml += '  </tbody>\n</table>';

    if (editorRef.current) editorRef.current.focus();
    executeCommand('insertHTML', tableHtml);
    setIsTableModalOpen(false);
  };

  const toggleSourceMode = () => {
    if (isSourceMode) {
      // Switching from code to WYSIWYG
      onChange(sourceCode);
      setIsSourceMode(false);
    } else {
      // Switching from WYSIWYG to code
      if (editorRef.current) {
        setSourceCode(editorRef.current.innerHTML);
      }
      setIsSourceMode(true);
    }
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSourceCode(e.target.value);
    onChange(e.target.value);
  };

  // Quick word & char stats
  const cleanText = (sourceCode || '').replace(/<[^>]*>/g, '').trim();
  const wordCount = cleanText ? cleanText.split(/\s+/).length : 0;
  const charCount = cleanText.length;

  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
      {/* WYSIWYG Toolbar */}
      {!readOnly && (
        <div className="bg-slate-50 border-b border-slate-200 p-1.5 flex flex-wrap items-center gap-1 text-slate-700 select-none">
          {/* Undo / Redo */}
          <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => executeCommand('undo')}
              title="Отменить (Ctrl+Z)"
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Undo className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('redo')}
              title="Повторить (Ctrl+Y)"
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Redo className="h-4 w-4" />
            </button>
          </div>

          <div className="h-5 w-px bg-slate-300 mx-0.5" />

          {/* Heading Selector */}
          <div className="w-32">
            <Select value={activeHeading} onValueChange={handleHeadingChange} disabled={isSourceMode}>
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                <SelectValue placeholder="Стиль" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="p">Обычный текст</SelectItem>
                <SelectItem value="h1" className="font-bold text-base">Заголовок 1 (H1)</SelectItem>
                <SelectItem value="h2" className="font-bold text-sm">Заголовок 2 (H2)</SelectItem>
                <SelectItem value="h3" className="font-semibold text-sm">Заголовок 3 (H3)</SelectItem>
                <SelectItem value="h4" className="font-semibold text-xs">Заголовок 4 (H4)</SelectItem>
                <SelectItem value="h5" className="font-medium text-xs">Заголовок 5 (H5)</SelectItem>
                <SelectItem value="h6" className="font-medium text-xs">Заголовок 6 (H6)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Font Size Selector */}
          <div className="w-24">
            <Select value={activeFontSize} onValueChange={handleFontSizeChange} disabled={isSourceMode}>
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                <SelectValue placeholder="Размер" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">10 pt</SelectItem>
                <SelectItem value="2">12 pt</SelectItem>
                <SelectItem value="3">14 pt</SelectItem>
                <SelectItem value="4">16 pt</SelectItem>
                <SelectItem value="5">18 pt</SelectItem>
                <SelectItem value="6">24 pt</SelectItem>
                <SelectItem value="7">32 pt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-5 w-px bg-slate-300 mx-0.5" />

          {/* Text formatting: B, I, U, S */}
          <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => executeCommand('bold')}
              title="Жирный (Ctrl+B)"
              disabled={isSourceMode}
              className="p-1.5 hover:bg-slate-100 rounded font-bold text-slate-700 hover:text-slate-900 transition-colors"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('italic')}
              title="Курсив (Ctrl+I)"
              disabled={isSourceMode}
              className="p-1.5 hover:bg-slate-100 rounded italic text-slate-700 hover:text-slate-900 transition-colors"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('underline')}
              title="Подчёркивание (Ctrl+U)"
              disabled={isSourceMode}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition-colors"
            >
              <Underline className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('strikeThrough')}
              title="Зачёркивание"
              disabled={isSourceMode}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition-colors"
            >
              <Strikethrough className="h-4 w-4" />
            </button>
          </div>

          {/* Font Color Picker Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Цвет текста"
                disabled={isSourceMode}
                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700 transition-colors shadow-2xs flex items-center gap-1"
              >
                <Palette className="h-4 w-4 text-blue-600" />
                <span className="text-[10px] font-bold">A</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 bg-white border shadow-md" align="start">
              <div className="text-xs font-semibold text-slate-700 mb-1.5">Цвет шрифта</div>
              <div className="grid grid-cols-8 gap-1 mb-3">
                {FONT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    style={{ backgroundColor: color }}
                    onClick={() => executeCommand('foreColor', color)}
                    className="h-5 w-5 rounded border border-slate-300 hover:scale-110 transition-transform"
                    title={color}
                  />
                ))}
              </div>
              <div className="text-xs font-semibold text-slate-700 mb-1.5">Цвет фона (выделение)</div>
              <div className="grid grid-cols-8 gap-1">
                {BG_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    style={{ backgroundColor: color }}
                    onClick={() => executeCommand('hiliteColor', color)}
                    className="h-5 w-5 rounded border border-slate-300 hover:scale-110 transition-transform"
                    title={color}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="h-5 w-px bg-slate-300 mx-0.5" />

          {/* Text Alignment */}
          <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => executeCommand('justifyLeft')}
              title="По левому краю"
              disabled={isSourceMode}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
            >
              <AlignLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('justifyCenter')}
              title="По центру"
              disabled={isSourceMode}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
            >
              <AlignCenter className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('justifyRight')}
              title="По правому краю"
              disabled={isSourceMode}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
            >
              <AlignRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('justifyFull')}
              title="По ширине"
              disabled={isSourceMode}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
            >
              <AlignJustify className="h-4 w-4" />
            </button>
          </div>

          <div className="h-5 w-px bg-slate-300 mx-0.5" />

          {/* Lists & Indents */}
          <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => executeCommand('insertUnorderedList')}
              title="Маркированный список"
              disabled={isSourceMode}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('insertOrderedList')}
              title="Нумерованный список"
              disabled={isSourceMode}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
            >
              <ListOrdered className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('outdent')}
              title="Уменьшить отступ"
              disabled={isSourceMode}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
            >
              <Outdent className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('indent')}
              title="Увеличить отступ"
              disabled={isSourceMode}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
            >
              <Indent className="h-4 w-4" />
            </button>
          </div>

          <div className="h-5 w-px bg-slate-300 mx-0.5" />

          {/* Insert Tools: Link, Image, Table */}
          <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-2xs">
            {/* Link Modal Trigger */}
            <Popover open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="Вставить ссылку"
                  disabled={isSourceMode}
                  className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
                >
                  <LinkIcon className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3 bg-white shadow-lg border" align="start">
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-800">Вставить гиперссылку</div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Адрес ссылки (URL)</Label>
                    <Input
                      placeholder="https://..."
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Текст ссылки (необязательно)</Label>
                    <Input
                      placeholder="Текст для отображения"
                      value={linkText}
                      onChange={(e) => setLinkText(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsLinkModalOpen(false)}
                      className="h-7 text-xs"
                    >
                      Отмена
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleInsertLink}
                      className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Вставить
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Image Modal Trigger */}
            <Popover open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="Вставить изображение"
                  disabled={isSourceMode}
                  className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
                >
                  <ImageIcon className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3 bg-white shadow-lg border" align="start">
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-800">Вставить изображение</div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">URL изображения</Label>
                    <Input
                      placeholder="https://example.com/image.png"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Подпись / Alt текст</Label>
                    <Input
                      placeholder="Описание изображения"
                      value={imageAlt}
                      onChange={(e) => setImageAlt(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsImageModalOpen(false)}
                      className="h-7 text-xs"
                    >
                      Отмена
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleInsertImage}
                      className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Вставить
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Table Modal Trigger */}
            <Popover open={isTableModalOpen} onOpenChange={setIsTableModalOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="Вставить таблицу"
                  disabled={isSourceMode}
                  className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
                >
                  <TableIcon className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 bg-white shadow-lg border" align="start">
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-800">Параметры таблицы</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">Строк</Label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={tableRows}
                        onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">Столбцов</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={tableCols}
                        onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsTableModalOpen(false)}
                      className="h-7 text-xs"
                    >
                      Отмена
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleInsertTable}
                      className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Создать
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Clean Formatting */}
            <button
              type="button"
              onClick={() => executeCommand('removeFormat')}
              title="Очистить форматирование"
              disabled={isSourceMode}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
            >
              <RemoveFormatting className="h-4 w-4 text-rose-600" />
            </button>
          </div>

          <div className="h-5 w-px bg-slate-300 mx-0.5" />

          {/* Source Code Toggle */}
          <button
            type="button"
            onClick={toggleSourceMode}
            title={isSourceMode ? 'Перейти в визуальный режим' : 'Просмотр исходного HTML-кода'}
            className={`p-1.5 rounded flex items-center gap-1.5 text-xs font-medium transition-colors ${
              isSourceMode
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs'
            }`}
          >
            <Code className="h-4 w-4" />
            <span>{isSourceMode ? 'Визуальный редактор' : 'Исходный код'}</span>
          </button>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="relative">
        {isSourceMode ? (
          <textarea
            value={sourceCode}
            onChange={handleSourceChange}
            placeholder="Введите HTML-разметку новости..."
            style={{ minHeight }}
            className="w-full p-4 font-mono text-xs bg-slate-900 text-emerald-400 border-0 focus:outline-none resize-y leading-relaxed"
            disabled={readOnly}
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable={!readOnly}
            onInput={handleInput}
            onBlur={handleInput}
            style={{ minHeight }}
            data-placeholder={placeholder}
            className="p-4 focus:outline-none prose prose-slate max-w-none text-slate-800 text-sm leading-relaxed overflow-auto empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
          />
        )}
      </div>

      {/* Footer bar with stats */}
      <div className="bg-slate-50 border-t border-slate-200 px-3 py-1 text-[11px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span>Слов: <b>{wordCount}</b></span>
          <span>Символов: <b>{charCount}</b></span>
        </div>
        <div className="text-slate-400">
          {readOnly ? 'Режим просмотра' : isSourceMode ? 'HTML-код' : 'WYSIWYG редактор'}
        </div>
      </div>
    </div>
  );
};
