import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { CURRENT_OMSU } from '@/lib/data';
import { NoteTable } from '@/components/note/NoteTable';
import { SignDialog } from '@/components/SignDialog';
import { noteTemplateCellKeys, isNoteCellFilled } from '@/lib/types';
import { Flag, ShieldCheck } from 'lucide-react';

export function NoteOmsuWorkspace() {
  const { state, dispatch } = useStore();
  const munId = CURRENT_OMSU;
  const mun = state.omsus.find((m) => m.id === munId) || state.omsus[0];
  const [signTarget, setSignTarget] = useState<{ tplId: string; cellKeys: string[] } | null>(null);

  const active = state.noteTemplates.filter((t) => t.isActive);
  const myData = state.noteOmsuValues[munId] ?? {};
  const deadline = state.noteCampaign.deadlineOmsu.split('-').reverse().join('.');

  // Общая статистика по форме пояснительной записки
  const stats = useMemo(() => {
    let totalCells = 0;
    let filledCells = 0;
    let agreedCells = 0;
    let greenCells = 0;
    let blueCells = 0;

    active.forEach((t) => {
      const keys = noteTemplateCellKeys(t);
      const data = myData[t.id];
      const cells = data?.cells || {};
      const cst = data?.cellStatus || {};
      const comments = data?.cellComments || {};
      const omsuApp = data?.omsuApproved || {};
      const cioApp = data?.cioApproved || {};

      keys.forEach((k) => {
        totalCells++;
        if (isNoteCellFilled(cells[k])) filledCells++;
        if (cst[k] === 'agreed' || cst[k] === 'approved' || comments[k]?.includes('Согласовано')) agreedCells++;
        if (omsuApp[k]) greenCells++;
        if (cioApp[k]) blueCells++;
      });
    });

    return { totalCells, filledCells, agreedCells, greenCells, blueCells };
  }, [active, myData]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Пояснительная записка — {mun.name}</h2>
          <p className="text-sm text-slate-500">
            Форма ввода, контроля и утверждения показателей пояснительной записки · Срок заполнения: <span className="font-medium text-slate-700">{deadline}</span>
          </p>
        </div>

        {/* Сводные показатели формы */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="rounded-md border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <span className="text-slate-500">Заполнено:</span>{' '}
            <span className="font-bold text-slate-800">{stats.filledCells} / {stats.totalCells}</span>
          </div>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-900 shadow-sm flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5 fill-emerald-600 text-emerald-600" />
            <span>Утверждено ОМСУ (зелёный флажок):</span>
            <span className="font-bold">{stats.greenCells} / {stats.totalCells}</span>
          </div>
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-900 shadow-sm flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5 fill-blue-600 text-blue-600" />
            <span>Утверждено ЦИО/МЭФ (синий флажок):</span>
            <span className="font-bold">{stats.blueCells} / {stats.totalCells}</span>
          </div>
        </div>
      </div>

      {/* Регламентный баннер механизма согласования и утверждения */}
      <div className="rounded-md border border-blue-200 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 p-3 text-xs text-blue-950 shadow-sm">
        <div className="font-semibold text-blue-900 mb-1 flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          Регламент согласования, контроля и утверждения:
        </div>
        <ol className="list-decimal list-inside space-y-0.5 text-slate-700 leading-relaxed">
          <li>Все доступные ячейки открыты для внесения текстовых данных и редактирования.</li>
          <li>После внесения данных ячейки направляются на согласование вышестоящему лицу (ЦИО/МЭФ).</li>
          <li>Вышестоящее лицо согласовывает ячейку (пишет «Согласовано» в поле комментарий) либо указывает замечания.</li>
          <li>
            После согласования ОМСУ осуществляет <strong className="text-slate-900">контроль на пустые ячейки (пустых ячеек быть не должно!)</strong>.
          </li>
          <li>
            Если контроль пройден успешно, активируется возможность <strong className="text-emerald-700">«Утвердить данные» (зелёные флажки 🟢)</strong> как по отдельным ячейкам, так и по целым блокам.
          </li>
          <li>
            После проставления зелёных флажков вышестоящий уровень проводит контроль и утверждение <strong className="text-blue-700">(синие флажки 🔵)</strong>.
          </li>
          <li>Снять утверждение может только ответственное лицо вышестоящего уровня.</li>
          <li>В итоговых выходных таблицах отображаются только ячейки с синими флажками; без синего флажка ячейка остаётся пустой.</li>
        </ol>
      </div>

      <NoteTable
        templates={active}
        directions={state.directions}
        indicators={state.indicators}
        mode="edit"
        omsuData={myData}
        onCellChange={(tplId, key, value) =>
          dispatch({ type: 'NOTE_SET_CELL', munId, templateId: tplId, cellKey: key, value })
        }
        onSendCell={(tplId, cellKey) => setSignTarget({ tplId, cellKeys: [cellKey] })}
        onSendBlock={(tplId, cellKeys) => setSignTarget({ tplId, cellKeys })}
        onRecallCell={(tplId, cellKey) =>
          dispatch({ type: 'NOTE_RECALL', munId, templateId: tplId, cellKeys: [cellKey], actor: mun.name })
        }
        onOmsuApproveCell={(tplId, cellKey) =>
          dispatch({ type: 'NOTE_OMSU_APPROVE', munId, templateId: tplId, cellKeys: [cellKey], actor: mun.name })
        }
        onOmsuApproveBlock={(tplId, cellKeys) =>
          dispatch({ type: 'NOTE_OMSU_APPROVE', munId, templateId: tplId, cellKeys, actor: mun.name })
        }
      />

      <SignDialog
        open={!!signTarget}
        onOpenChange={(v) => !v && setSignTarget(null)}
        title="Подписание ЭЦП и направление на согласование"
        onSigned={() => {
          if (signTarget) {
            dispatch({
              type: 'NOTE_SIGN_SEND',
              munId,
              templateId: signTarget.tplId,
              cellKeys: signTarget.cellKeys,
              actor: `${mun.name} (ЭЦП)`,
            });
            setSignTarget(null);
          }
        }}
      />
    </div>
  );
}
