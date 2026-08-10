import { useState } from 'react';
import { DictsTab } from '@/components/DictsTab';

export function DictsManagement() {
  const [tab, setTab] = useState<'cios' | 'omsus' | 'units'>('cios');

  return (
    <div className="space-y-4 pt-4">
      <div className="border-b">
        <div className="flex gap-6">
          <button
            onClick={() => setTab('cios')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${tab === 'cios' ? 'border-[#1e5c8f] text-[#1e5c8f]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            ЦИО
          </button>
          <button
            onClick={() => setTab('omsus')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${tab === 'omsus' ? 'border-[#1e5c8f] text-[#1e5c8f]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            ОМСУ
          </button>
          <button
            onClick={() => setTab('units')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${tab === 'units' ? 'border-[#1e5c8f] text-[#1e5c8f]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Единицы измерения
          </button>
        </div>
      </div>

      <DictsTab activeDict={tab} />
    </div>
  );
}
