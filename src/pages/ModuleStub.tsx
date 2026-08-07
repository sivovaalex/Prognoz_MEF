import { ArrowLeft, Hammer } from 'lucide-react';

export function ModuleStub({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f9fd] via-[#eef3f9] to-[#e6edf6] flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200">
          <Hammer className="h-8 w-8 text-slate-400" />
        </div>
        <h1 className="mt-6 max-w-2xl text-lg md:text-2xl font-bold uppercase leading-snug tracking-wide text-[#1b3a5c]">
          {title}
        </h1>
        <p className="mt-3 max-w-md text-sm text-slate-500">
          Модуль находится в разработке. Функциональность будет доступна в следующих версиях прототипа.
        </p>
        <button
          onClick={onBack}
          className="mt-8 flex items-center gap-2 rounded-md bg-[#1e5c8f] px-4 py-2 text-sm font-medium text-white shadow hover:bg-[#16486f] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          К списку модулей
        </button>
      </main>
    </div>
  );
}
