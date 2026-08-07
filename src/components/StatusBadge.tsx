import { OMSU_STATUS_META, CIO_STATUS_META } from '@/lib/data';
import type { OmsuStatus, CioStatus } from '@/lib/types';

export function OmsuStatusBadge({ status }: { status: OmsuStatus }) {
  const m = OMSU_STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{ color: m.color, background: m.bg }}
    >
      {m.label}
    </span>
  );
}

export function CioStatusBadge({ status }: { status: CioStatus }) {
  const m = CIO_STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{ color: m.color, background: m.bg }}
    >
      {m.label}
    </span>
  );
}
