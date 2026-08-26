import { useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  QrCode,
  Package,
  Layers,
  Search,
  ArrowDownUp,
} from 'lucide-react';
import { useData } from '@/store';
import { useToast } from '@/components/Toast';
import { ColorDot, StockBadge } from '@/components/Badges';
import { ProductFormModal } from './ProductFormModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { QRModal } from '@/components/QRModal';
import { StockAdjustModal } from '@/components/StockAdjustModal';
import type { Product, Variation } from '@/types';

interface ProductsViewProps {
  search: string;
  filterCategory: string;
  filterLowStock: boolean;
  onSearch: (s: string) => void;
  onFilterCategory: (c: string) => void;
  onFilterLowStock: (b: boolean) => void;
}

export function ProductsView({
  search,
  filterCategory,
  filterLowStock,
  onSearch,
  onFilterCategory,
  onFilterLowStock,
}: ProductsViewProps) {
  const { products, categories, getCategory, deleteProduct } = useData();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [qrTarget, setQrTarget] = useState<{ product: Product; variation: Variation } | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<{ product: Product; variation: Variation } | null>(null);

  const filtered = useMemo(() => {
    let out = products;
    if (filterCategory) out = out.filter((p) => p.categoryId === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.variations.some(
            (v) =>
              v.color.toLowerCase().includes(q) || v.size.toLowerCase().includes(q),
          ) ||
          (getCategory(p.categoryId)?.name.toLowerCase().includes(q) ?? false),
      );
    }
    return out;
  }, [products, filterCategory, search, getCategory]);

  const productPassesLow = (p: Product) =>
    !filterLowStock || p.variations.some((v) => v.stock <= v.lowStockThreshold);

  const visibleProducts = filtered.filter(productPassesLow);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Produtos</h2>
          <p className="text-sm text-ink-500">{visibleProducts.length} produtos · gerencie itens e variações</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditTarget(null);
            setFormOpen(true);
          }}
        >
          <Plus size={16} /> Adicionar produto
        </button>
      </div>

      {/* Filters bar */}
      <div className="card p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Buscar produtos, SKU, cor, tamanho…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-48"
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
        <label className="flex items-center gap-2 text-sm text-ink-700 px-3 py-2 rounded-lg border border-ink-200 cursor-pointer hover:bg-ink-50 select-none">
          <input
            type="checkbox"
            checked={filterLowStock}
            onChange={(e) => onFilterLowStock(e.target.checked)}
            className="accent-brand-600"
          />
          Estoque baixo
        </label>
      </div>

      {visibleProducts.length === 0 ? (
        <div className="card p-12 flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-full bg-ink-100 flex items-center justify-center mb-4">
            <Package size={26} className="text-ink-400" />
          </div>
          <p className="text-base font-semibold text-ink-900">Nenhum produto encontrado</p>
          <p className="text-sm text-ink-500 mt-1 max-w-sm">
            {products.length === 0
              ? 'Adicione seu primeiro produto para começar.'
              : 'Tente ajustar sua busca ou filtros.'}
          </p>
          {products.length === 0 && (
            <button
              className="btn-primary mt-4"
              onClick={() => {
                setEditTarget(null);
                setFormOpen(true);
              }}
            >
              <Plus size={16} /> Adicionar primeiro produto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visibleProducts.map((p) => {
            const cat = getCategory(p.categoryId);
            const totalUnits = p.variations.reduce((s, v) => s + v.stock, 0);
            const lowCount = p.variations.filter((v) => v.stock <= v.lowStockThreshold).length;
            return (
              <div key={p.id} className="card overflow-hidden">
                <div className="p-4 border-b border-ink-100 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: (cat?.color ?? '#9ca3af') + '22' }}
                    >
                      <Layers size={18} style={{ color: cat?.color ?? '#677591' }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-ink-900 truncate">{p.name}</h3>
                      <p className="text-xs text-ink-500">
                        {cat?.name} · SKU {p.sku} · ${p.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditTarget(p);
                        setFormOpen(true);
                      }}
                      className="btn-icon h-8 w-8 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                      title="Editar"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      className="btn-icon h-8 w-8 text-ink-500 hover:bg-red-50 hover:text-red-600"
                      title="Excluir"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="px-4 py-2 flex items-center gap-4 text-xs text-ink-500 bg-ink-50/60 border-b border-ink-100">
                  <span>{p.variations.length} variações</span>
                  <span>{totalUnits} unidades no total</span>
                  {lowCount > 0 && (
                    <span className="text-accent-700 font-medium">{lowCount} baixo / sem estoque</span>
                  )}
                </div>

                <div className="p-2 max-h-64 overflow-y-auto">
                  {p.variations.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-ink-50 group"
                    >
                      <ColorDot color={v.color} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink-900 truncate">
                          {v.color} <span className="text-ink-400">/</span> {v.size}
                        </p>
                      </div>
                      <StockBadge stock={v.stock} threshold={v.lowStockThreshold} />
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setAdjustTarget({ product: p, variation: v })}
                          className="btn-icon h-7 w-7 bg-brand-50 text-brand-700 hover:bg-brand-100"
                          title="Ajustar estoque"
                        >
                          <ArrowDownUp size={13} />
                        </button>
                        <button
                          onClick={() => setQrTarget({ product: p, variation: v })}
                          className="btn-icon h-7 w-7 bg-ink-100 text-ink-700 hover:bg-ink-200"
                          title="Ver / imprimir QR"
                        >
                          <QrCode size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProductFormModal open={formOpen} onClose={() => setFormOpen(false)} editProduct={editTarget} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir produto"
        message={`Excluir "${deleteTarget?.name}" e todas as suas variações? Isso não pode ser desfeito.`}
        confirmLabel="Excluir"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteProduct(deleteTarget.id);
            toast('Produto excluído', 'success');
          }
          setDeleteTarget(null);
        }}
      />
      <QRModal
        open={!!qrTarget}
        onClose={() => setQrTarget(null)}
        product={qrTarget?.product ?? null}
        variation={qrTarget?.variation ?? null}
      />
      <StockAdjustModal
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        product={adjustTarget?.product ?? null}
        variation={adjustTarget?.variation ?? null}
      />
    </div>
  );
}
