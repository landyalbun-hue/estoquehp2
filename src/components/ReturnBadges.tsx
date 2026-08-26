import type { QualityState, ReturnStatus } from '@/types';
import { QUALITY_LABELS, QUALITY_STYLES, STATUS_LABELS } from '@/types';

export function QualityBadge({ quality }: { quality: QualityState }) {
  const s = QUALITY_STYLES[quality];
  return (
    <span className={`chip ${s.bg} ${s.text} border ${s.border}`}>
      <span className={`inline-block h-2 w-2 rounded-full ${s.dot}`} />
      {QUALITY_LABELS[quality]}
    </span>
  );
}

export function StatusBadge({ status }: { status: ReturnStatus }) {
  const styles: Record<ReturnStatus, string> = {
    triagem: 'bg-ink-100 text-ink-700 border border-ink-200',
    reincorporado: 'bg-brand-50 text-brand-700 border border-brand-200',
    destinado: 'bg-blue-50 text-blue-700 border border-blue-200',
  };
  return <span className={`chip ${styles[status]}`}>{STATUS_LABELS[status]}</span>;
}
