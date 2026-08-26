import { useMemo, useState } from 'react';
import {
  Plus,
  Minus,
  QrCode,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  SlidersHorizontal,
} from 'lucide-react';
import { useData } from '@/store';
import { useToast } from '@/components/Toast';
import { ColorDot, StockBadge } from '@/components/Badges';
import { StockAdjustModal } from '@/components/StockAdjustModal';
import { QRModal } from '@/components/QRModal';
import type { Product, Variation } from '@/types';

interface InventoryViewProps {
  search: string;
  filterCategory: string;
  filterLowStock: boolean;
  onSearch: (s: string) => void;
  onFilterCategory: (c: string) => void;
  onFilterLowStock: (b: boolean) => void;
}

interface Row {
  product: Product;
  variation: Variation;
  category: string;
  categoryColor: string;
  code: string;
}

export function InventoryView({
  search,
  filterCategory,
  filterLowStock,
  onSearch,
  onFilterCategory,
  onFilterLowStock,
}: InventoryViewProps) {
  const { products, categories, getCategory, variationCode } = useData();
  const { toast } = useToast();
  const [adjustTarget, setAdjustTarget] = useState<{ product: Product; variation: Variation; mode?: 'in' | 'out' } | null>(null);
  const [qrTarget, setQrTarget] = useState<{ product: Product; variation: Variation } | null>(null);
  const [quickQty, setQuickQty] = useState<Record<string, number>>({});

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const p of products) {
      const cat = getCategory(p.categoryId);
      for (const v of p.variations) {
        out.push({
          product: p,
          variation: v,
          category: cat?.name ?? 'Sem categoria',
          categoryColor: cat?.color ?? '#9ca3af',
          code: variationCode(p.id, v),
        });
      }
    }
    return out;
  }, [products, getCategory, variationCode]);

  const filtered = useMemo(() => {
    let out = rows;
    if (filterCategory) out = out.filter((r) => r.product.categoryId === filterCategory);
    if (filterLowStock) out = out.filter((r) => r.variation.stock <= r.variation.lowStockThreshold);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (r) =>
          r.product.name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.variation.color.toLowerCase().includes(q) ||
          r.variation.size.toLowerCase().includes(q) ||
          r.product.sku.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q),
      );
    }
    return out;
  }, [rows, filterCategory, filterLowStock, search]);

  const quickAdjust = (product: Product, variation: Variation, delta: number) => {
    const qty = quickQty[variation.id] ?? 1;
    const amt = Math.max(1, qty);
    // directly adjust without modal
    adjustDelta(product, variation, delta > 0 ? amt : -amt);
  };

  const { adjustStock } = useData();
  const adjustDelta = (product: Product, variation: Variation, delta: number) => {
    adjustStock(product.id, variation.id, delta, delta > 0 ? 'Reposição rápida' : 'Venda rápida');
    toast(
      `${delta > 0 ? 'Adicionada' : 'Removida'} ${Math.abs(delta)} · ${product.name} (${variation.color}/${variation.size})`,
      delta > 0 ? 'success' : 'info',
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-ink-900">Estoque</h2>
        <p className="text-sm text-ink-500">{filtered.length} variações · ajuste o estoque ou abra um QR Code</p>
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Buscar nome, categoria, cor, tamanho, SKU ou QR Code…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <select
            className="input lg:w-44"
            value={filterCategory}
            onChange={(e) => onFilterCategory(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-ink-700 px-3 py-2 rounded-lg border border-ink-200 cursor-pointer hover:bg-ink-50 select-none whitespace-nowrap">
            <SlidersHorizontal size={14} className="text-ink-400" />
            <input
              type="checkbox"
              checked={filterLowStock}
              onChange={(e) => onFilterLowStock(e.target.checked)}
              className="accent-brand-600"
            />
            Estoque baixo
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-full bg-ink-100 flex items-center justify-center mb-4">
            <Boxes size={26} className="text-ink-400" />
          </div>
          <p className="text-base font-semibold text-ink-900">Nenhuma variação encontrada</p>
          <p className="text-sm text-ink-500 mt-1">Ajuste sua busca ou filtros para ver o estoque.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card overflow-hidden hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wide">
                    <th className="text-left font-semibold px-4 py-3">Produto</th>
                    <th className="text-left font-semibold px-4 py-3">Categoria</th>
                    <th className="text-left font-semibold px-4 py-3">Cor</th>
                    <th className="text-left font-semibold px-4 py-3">Tamanho</th>
                    <th className="text-left font-semibold px-4 py-3">Estoque</th>
                    <th className="text-left font-semibold px-4 py-3">Qtd</th>
                    <th className="text-right font-semibold px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {filtered.map((r) => (
                    <tr key={r.variation.id} className="table-row-hover">
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink-900 truncate max-w-[200px]">{r.product.name}</div>
                        <div className="text-xs text-ink-400">{r.product.sku}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="chip text-xs" style={{ backgroundColor: r.categoryColor + '1a', color: r.categoryColor }}>
                          {r.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ColorDot color={r.variation.color} />
                          <span className="text-ink-700">{r.variation.color}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-ink-700">{r.variation.size}</td>
                      <td className="px-4 py-3">
                        <StockBadge stock={r.variation.stock} threshold={r.variation.lowStockThreshold} />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={1}
                          value={quickQty[r.variation.id] ?? 1}
                          onChange={(e) =>
                            setQuickQty((q) => ({ ...q, [r.variation.id]: Math.max(1, parseInt(e.target.value) || 1) }))
                          }
                          className="w-16 rounded-lg border border-ink-200 px-2 py-1 text-sm text-center outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => quickAdjust(r.product, r.variation, 1)}
                            className="btn-icon h-8 w-8 bg-brand-50 text-brand-700 hover:bg-brand-100"
                            title="Entrada de estoque"
                          >
                            <ArrowUpRight size={16} />
                          </button>
                          <button
                            onClick={() => quickAdjust(r.product, r.variation, -1)}
                            className="btn-icon h-8 w-8 bg-red-50 text-red-700 hover:bg-red-100"
                            title="Saída de estoque"
                          >
                            <ArrowDownRight size={16} />
                          </button>
                          <button
                            onClick={() => setAdjustTarget({ product: r.product, variation: r.variation })}
                            className="btn-icon h-8 w-8 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                            title="Ajuste detalhado"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={() => setQrTarget({ product: r.product, variation: r.variation })}
                            className="btn-icon h-8 w-8 bg-ink-100 text-ink-700 hover:bg-ink-200"
                            title="Ver / imprimir QR"
                          >
                            <QrCode size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filtered.map((r) => (
              <div key={r.variation.id} className="card p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900 truncate">{r.product.name}</p>
                    <p className="text-xs text-ink-500">{r.category} · {r.product.sku}</p>
                  </div>
                  <StockBadge stock={r.variation.stock} threshold={r.variation.lowStockThreshold} />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <ColorDot color={r.variation.color} />
                  <span className="text-sm text-ink-700">{r.variation.color}</span>
                  <span className="text-ink-300">·</span>
                  <span className="text-sm font-medium text-ink-700">Tamanho {r.variation.size}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={quickQty[r.variation.id] ?? 1}
                    onChange={(e) =>
                      setQuickQty((q) => ({ ...q, [r.variation.id]: Math.max(1, parseInt(e.target.value) || 1) }))
                    }
                    className="w-16 rounded-lg border border-ink-200 px-2 py-1.5 text-sm text-center outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                  <button
                    onClick={() => quickAdjust(r.product, r.variation, 1)}
                    className="btn-icon flex-1 h-9 bg-brand-50 text-brand-700 hover:bg-brand-100 text-sm font-medium"
                  >
                    <Plus size={15} /> Entrar
                  </button>
                  <button
                    onClick={() => quickAdjust(r.product, r.variation, -1)}
                    className="btn-icon flex-1 h-9 bg-red-50 text-red-700 hover:bg-red-100 text-sm font-medium"
                  >
                    <Minus size={15} /> Sair
                  </button>
                  <button
                    onClick={() => setQrTarget({ product: r.product, variation: r.variation })}
                    className="btn-icon h-9 w-9 bg-ink-100 text-ink-700 hover:bg-ink-200"
                  >
                    <QrCode size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <StockAdjustModal
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        product={adjustTarget?.product ?? null}
        variation={adjustTarget?.variation ?? null}
        mode={adjustTarget?.mode}
      />
      <QRModal
        open={!!qrTarget}
        onClose={() => setQrTarget(null)}
        product={qrTarget?.product ?? null}
        variation={qrTarget?.variation ?? null}
      />
    </div>
  );
}
