import { useMemo, useState } from 'react';
import {
  Package,
  Boxes,
  AlertTriangle,
  TrendingDown,
  Search,
  Plus,
  QrCode,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
} from 'lucide-react';
import { useData } from '@/store';
import { useToast } from '@/components/Toast';
import { ColorDot, StockBadge } from '@/components/Badges';
import { StockAdjustModal } from '@/components/StockAdjustModal';
import { QRModal } from '@/components/QRModal';
import type { Product, Variation } from '@/types';

interface DashboardProps {
  onNavigate: (view: string) => void;
  onScan: () => void;
  search: string;
}

interface FlatVariation {
  product: Product;
  variation: Variation;
  category: string;
  categoryColor: string;
  totalUnits: number;
  totalValue: number;
}

export function Dashboard({ onNavigate, onScan, search }: DashboardProps) {
  const { products, categories, movements, getCategory } = useData();
  const { toast } = useToast();
  const [adjustTarget, setAdjustTarget] = useState<{ product: Product; variation: Variation } | null>(null);
  const [qrTarget, setQrTarget] = useState<{ product: Product; variation: Variation } | null>(null);

  const flat = useMemo<FlatVariation[]>(() => {
    const out: FlatVariation[] = [];
    for (const p of products) {
      const cat = getCategory(p.categoryId);
      for (const v of p.variations) {
        out.push({
          product: p,
          variation: v,
          category: cat?.name ?? 'Uncategorized',
          categoryColor: cat?.color ?? '#9ca3af',
          totalUnits: v.stock,
          totalValue: v.stock * p.price,
        });
      }
    }
    return out;
  }, [products, getCategory]);

  const stats = useMemo(() => {
    const totalUnits = flat.reduce((s, x) => s + x.totalUnits, 0);
    const totalValue = flat.reduce((s, x) => s + x.totalValue, 0);
    const lowStock = flat.filter((x) => x.variation.stock > 0 && x.variation.stock <= x.variation.lowStockThreshold);
    const outStock = flat.filter((x) => x.variation.stock <= 0);
    return {
      totalProducts: products.length,
      totalVariations: flat.length,
      totalUnits,
      totalValue,
      lowStock,
      outStock,
    };
  }, [flat, products.length]);

  const recentMovements = movements.slice(0, 6);

  const filteredFlat = useMemo(() => {
    if (!search.trim()) return flat;
    const q = search.toLowerCase();
    return flat.filter(
      (x) =>
        x.product.name.toLowerCase().includes(q) ||
        x.category.toLowerCase().includes(q) ||
        x.variation.color.toLowerCase().includes(q) ||
        x.variation.size.toLowerCase().includes(q),
    );
  }, [flat, search]);

  const lowStockItems = [...stats.lowStock, ...stats.outStock]
    .sort((a, b) => a.variation.stock - b.variation.stock)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Package size={20} />}
          label="Produtos"
          value={stats.totalProducts.toString()}
          tint="brand"
          sub={`${stats.totalVariations} variações`}
        />
        <StatCard
          icon={<Boxes size={20} />}
          label="Total de unidades"
          value={stats.totalUnits.toLocaleString()}
          tint="blue"
          sub={`R$ ${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} em valor de varejo`}
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="Estoque baixo"
          value={stats.lowStock.length.toString()}
          tint="accent"
          sub={`${stats.outStock.length} sem estoque`}
          alert={stats.lowStock.length + stats.outStock.length > 0}
        />
        <StatCard
          icon={<TrendingDown size={20} />}
          label="Movimentações"
          value={movements.length.toString()}
          tint="ink"
          sub="registros"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink-900 mb-4">Ações rápidas</h3>
          <div className="space-y-2.5">
            <QuickAction
              icon={<Plus size={18} />}
              label="Adicionar produto"
              desc="Criar um novo item de roupa"
              onClick={() => onNavigate('products')}
              tint="brand"
            />
            <QuickAction
              icon={<QrCode size={18} />}
              label="Escanear QR Code"
              desc="Acesse uma variação pela leitura"
              onClick={onScan}
              tint="blue"
            />
            <QuickAction
              icon={<Layers size={18} />}
              label="Ver estoque"
              desc="Visualizar e gerenciar todas as variações"
              onClick={() => onNavigate('inventory')}
              tint="accent"
            />
          </div>
        </div>

        {/* Low stock alerts */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-ink-900">Alertas de estoque</h3>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Ver tudo →
            </button>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-brand-50 flex items-center justify-center mb-3">
                <Package size={20} className="text-brand-600" />
              </div>
              <p className="text-sm font-medium text-ink-700">Tudo abastecido</p>
              <p className="text-xs text-ink-500 mt-0.5">Nenhuma variação precisa de atenção no momento.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockItems.map((x) => (
                <div
                  key={x.variation.id}
                  className="flex items-center gap-3 rounded-lg border border-ink-100 px-3 py-2.5 hover:bg-ink-50 transition-colors"
                >
                  <ColorDot color={x.variation.color} size={22} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900 truncate">{x.product.name}</p>
                    <p className="text-xs text-ink-500">
                      {x.category} · {x.variation.color} · {x.variation.size}
                    </p>
                  </div>
                  <StockBadge stock={x.variation.stock} threshold={x.variation.lowStockThreshold} />
                  <button
                    onClick={() => setAdjustTarget({ product: x.product, variation: x.variation })}
                    className="btn-icon h-8 w-8 bg-brand-50 text-brand-700 hover:bg-brand-100"
                    title="Ajustar estoque"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent movements */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-ink-900 mb-4">Movimentações recentes</h3>
          {recentMovements.length === 0 ? (
            <p className="text-sm text-ink-500 py-6 text-center">Nenhuma movimentação ainda.</p>
          ) : (
            <div className="space-y-1">
              {recentMovements.map((m) => {
                const p = products.find((x) => x.id === m.productId);
                const v = p?.variations.find((x) => x.id === m.variationId);
                if (!p || !v) return null;
                const in_ = m.type === 'in';
                return (
                  <div key={m.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-ink-50">
                    <div
                      className={`btn-icon h-8 w-8 ${in_ ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700'}`}
                    >
                      {in_ ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-900 truncate">{p.name}</p>
                      <p className="text-xs text-ink-500">
                        {v.color} · {v.size} · {m.reason}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold ${in_ ? 'text-brand-700' : 'text-red-700'}`}>
                      {in_ ? '+' : '−'}
                      {m.quantity}
                    </span>
                    <span className="text-xs text-ink-400 w-20 text-right">
                      {new Date(m.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Search results preview */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-ink-900">Resumo do estoque</h3>
            <Search size={16} className="text-ink-400" />
          </div>
          {filteredFlat.length === 0 ? (
            <p className="text-sm text-ink-500 py-6 text-center">Nenhum resultado para "{search}".</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {filteredFlat.slice(0, 8).map((x) => (
                <div key={x.variation.id} className="flex items-center gap-2.5 py-1.5">
                  <ColorDot color={x.variation.color} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-ink-900 truncate">{x.product.name}</p>
                    <p className="text-[11px] text-ink-500">
                      {x.variation.color} · {x.variation.size}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-ink-900">{x.variation.stock}</span>
                  <button
                    onClick={() => setQrTarget({ product: x.product, variation: x.variation })}
                    className="btn-icon h-7 w-7 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                    title="Ver QR"
                  >
                    <QrCode size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <StockAdjustModal
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        product={adjustTarget?.product ?? null}
        variation={adjustTarget?.variation ?? null}
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

const TINTS: Record<string, { bg: string; text: string; ring: string }> = {
  brand: { bg: 'bg-brand-50', text: 'text-brand-700', ring: 'ring-brand-500/20' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-500/20' },
  accent: { bg: 'bg-accent-50', text: 'text-accent-700', ring: 'ring-accent-500/20' },
  ink: { bg: 'bg-ink-100', text: 'text-ink-700', ring: 'ring-ink-500/20' },
};

function StatCard({
  icon,
  label,
  value,
  sub,
  tint,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tint: keyof typeof TINTS;
  alert?: boolean;
}) {
  const t = TINTS[tint];
  return (
    <div className={`card p-5 relative overflow-hidden ${alert ? 'ring-2 ring-accent-500/20' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-ink-900 mt-1">{value}</p>
          <p className="text-xs text-ink-500 mt-1">{sub}</p>
        </div>
        <div className={`btn-icon h-10 w-10 ${t.bg} ${t.text}`}>{icon}</div>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  desc,
  onClick,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  onClick: () => void;
  tint: keyof typeof TINTS;
}) {
  const t = TINTS[tint];
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-lg border border-ink-100 px-3 py-2.5 text-left hover:bg-ink-50 hover:border-ink-200 transition-all group"
    >
      <div className={`btn-icon h-9 w-9 ${t.bg} ${t.text} group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-900">{label}</p>
        <p className="text-xs text-ink-500">{desc}</p>
      </div>
    </button>
  );
}
