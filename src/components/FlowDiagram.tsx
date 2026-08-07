// Простая вертикальная блок-схема (SVG): start/end — стадион, task — прямоугольник, decision — ромб
// петли возврата — справа, примечания — пунктиром

export interface FlowStep {
  kind: 'start' | 'task' | 'decision' | 'end';
  text: string;
  actor?: string;
}

export interface FlowLoop {
  from: number;   // индекс decision
  to: number;     // индекс шага, куда возвращаемся
  label: string;
}

export interface FlowNote {
  at: number;     // индекс шага
  text: string;
}

const ACTOR_COLOR: Record<string, string> = {
  'МЭФ': '#7c3aed',
  'Администратор КФ': '#475569',
  'КФ': '#1d4ed8',
  'ОМСУ': '#0f766e',
  'ЦИО': '#c2410c',
};

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  words.forEach((w) => {
    if ((cur + ' ' + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  });
  if (cur) lines.push(cur);
  return lines;
}

export function FlowDiagram({ steps, loops = [], notes = [] }: { steps: FlowStep[]; loops?: FlowLoop[]; notes?: FlowNote[] }) {
  const CX = 250;
  const STEP_H = 92;
  const TOP = 30;
  const NODE_W = 330;
  const NODE_H = 56;
  const DEC_H = 78;
  const SIDE_X = 640;
  const W = 760;
  const H = steps.length * STEP_H + TOP + 20;

  const cy = (i: number) => TOP + i * STEP_H + NODE_H / 2;
  const topY = (i: number) => TOP + i * STEP_H;
  const botY = (i: number) => TOP + i * STEP_H + (steps[i].kind === 'decision' ? DEC_H : NODE_H);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[860px] mx-auto" role="img">
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="#64748b" />
        </marker>
        <marker id="arrRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="#dc2626" />
        </marker>
      </defs>

      {/* основные стрелки вниз */}
      {steps.slice(0, -1).map((_, i) => (
        <g key={`e${i}`}>
          <line x1={CX} y1={botY(i)} x2={CX} y2={topY(i + 1) - 4} stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arr)" />
          {steps[i].kind === 'decision' && (
            <text x={CX + 8} y={(botY(i) + topY(i + 1)) / 2 + 4} fontSize="11" fill="#15803d" fontWeight="600">да</text>
          )}
        </g>
      ))}

      {/* петли возврата */}
      {loops.map((l, k) => {
        const y1 = cy(l.from);
        const y2 = cy(l.to);
        const lines = wrap(l.label, 20).slice(0, 4);
        const bh = lines.length * 13 + 12;
        return (
          <g key={`l${k}`}>
            <path
              d={`M ${CX + NODE_W / 2 + 6} ${y1} L ${SIDE_X - 40} ${y1} L ${SIDE_X - 40} ${y2} L ${CX + NODE_W / 2 + 10} ${y2}`}
              fill="none" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="5 3" markerEnd="url(#arrRed)"
            />
            <rect x={SIDE_X - 38} y={(y1 + y2) / 2 - bh / 2} width="130" height={bh} rx="6" fill="#fef2f2" stroke="#fecaca" />
            {lines.map((t, li) => (
              <text key={li} x={SIDE_X + 27} y={(y1 + y2) / 2 - bh / 2 + 17 + li * 13} fontSize="10.5" fill="#b91c1c" textAnchor="middle">{t}</text>
            ))}
          </g>
        );
      })}

      {/* примечания */}
      {notes.map((n, k) => {
        const y = cy(n.at);
        const lines = wrap(n.text, 20).slice(0, 4);
        const bh = lines.length * 13 + 12;
        return (
          <g key={`n${k}`}>
            <line x1={CX + NODE_W / 2 + 6} y1={y} x2={SIDE_X - 40} y2={y} stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 3" />
            <rect x={SIDE_X - 38} y={y - bh / 2} width="130" height={bh} rx="6" fill="#eff6ff" stroke="#bfdbfe" />
            {lines.map((t, li) => (
              <text key={li} x={SIDE_X + 27} y={y - bh / 2 + 17 + li * 13} fontSize="10.5" fill="#1e40af" textAnchor="middle">{t}</text>
            ))}
          </g>
        );
      })}

      {/* узлы */}
      {steps.map((s, i) => {
        const y = topY(i);
        const cyc = cy(i);
        const lines = wrap(s.text, 40);
        const actorColor = s.actor ? ACTOR_COLOR[s.actor] ?? '#64748b' : undefined;
        return (
          <g key={`s${i}`}>
            {s.kind === 'decision' ? (
              <polygon
                points={`${CX},${y} ${CX + NODE_W / 2 + 20},${cyc} ${CX},${y + DEC_H} ${CX - NODE_W / 2 - 20},${cyc}`}
                fill="#fffbeb" stroke="#d97706" strokeWidth="1.5"
              />
            ) : (
              <rect
                x={CX - NODE_W / 2} y={y} width={NODE_W} height={NODE_H}
                rx={s.kind === 'start' || s.kind === 'end' ? NODE_H / 2 : 8}
                fill={s.kind === 'start' ? '#f0fdf4' : s.kind === 'end' ? '#f0fdf4' : '#ffffff'}
                stroke={s.kind === 'start' || s.kind === 'end' ? '#16a34a' : actorColor ?? '#64748b'}
                strokeWidth="1.5"
              />
            )}
            {actorColor && s.kind !== 'decision' && (
              <rect x={CX - NODE_W / 2} y={y} width="6" height={NODE_H} rx="3" fill={actorColor} />
            )}
            {lines.map((t, li) => (
              <text
                key={li}
                x={CX}
                y={cyc + (li - (lines.length - 1) / 2) * 13 + (s.actor ? -2 : 4)}
                fontSize="12" fill="#1e293b" textAnchor="middle"
              >
                {t}
              </text>
            ))}
            {s.actor && (
              <text x={CX} y={cyc + ((lines.length - 1) / 2) * 13 + 14} fontSize="10" fill={ACTOR_COLOR[s.actor] ?? '#64748b'} textAnchor="middle" fontWeight="600">
                {s.actor}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function FlowLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground justify-center">
      {Object.entries(ACTOR_COLOR).map(([a, c]) => (
        <span key={a} className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} /> {a}
        </span>
      ))}
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2.5 w-2.5 rotate-45 border border-amber-600 bg-amber-50" /> решение
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-0 w-6 border-t border-dashed border-red-600" /> возврат
      </span>
    </div>
  );
}
