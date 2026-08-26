import { colorToHex } from '@/types';

export function ColorDot({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-full ring-1 ring-ink-200 shrink-0"
      style={{ width: size, height: size, backgroundColor: colorToHex(color) }}
      title={color}
    />
  );
}

export function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  if (stock <= 0) {
    return <span className="chip bg-red-50 text-red-700 border border-red-200">Sem estoque</span>;
  }
  if (stock <= threshold) {
    return (
      <span className="chip bg-accent-50 text-accent-700 border border-accent-200">
        Baixo · {stock} rest.
      </span>
    );
  }
  return <span className="chip bg-brand-50 text-brand-700 border border-brand-200">{stock} em estoque</span>;
}
