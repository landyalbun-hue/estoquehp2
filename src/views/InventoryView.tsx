import { useState, useMemo, useEffect } from 'react';
import {
  Search, AlertTriangle, Edit2, X, ShoppingBag, RefreshCw
} from 'lucide-react';
import { useData } from '../store';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { UpSellerImportModal } from '../components/UpSellerImportModal';

interface Props {
  search: string;
  filterCategory: string;
  filterLowStock: boolean;
  onSearch: (v: string) => void;
  onFilterCategory: (v: string) => void;
  onFilterLowStock: (v: boolean) => void;
}

export function InventoryView({
  search,
  filterCategory,
  filterLowStock,
  onSearch,
  onFilterCategory,
  onFilterLowStock,
}: Props) {
  const data = useData() as any;
  const categories: string[] = data?.categories || [];
  const toast = useToast() as any;

  const [isUpSellerOpen, setIsUpSellerOpen] = useState(false);
  const [editingVar, setEditingVar] = useState<{ product: any; variation: any } | null>(null);
  const [editQty, setEditQty] = useState('');
  const [saving, setSaving] = useState(false);

  // Recarrega os dados globais ao entrar na tela
  useEffect(() => {
    if (data?.fetchData) data.fetchData();
    if (data?.refresh) data.refresh();
  }, []);

  // Usa EXCLUSIVAMENTE a lista oficial do Store (a mesma usada na tela 'Produtos Virgens')
  const productsList = data?.products || [];

  // Monta a tabela utilizando os exatos saldos da tela 'Produtos Virgens'
  const inventoryRows = useMemo(() => {
    const rows: any[] = [];

    productsList.forEach((prod: any) => {
      const matchCategory = !filterCategory || prod.category === filterCategory;
      const matchSearch =
        !search ||
        (prod.name || prod.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (prod.sku || prod.code || '').toLowerCase().includes(search.toLowerCase());

      if (!matchCategory || !matchSearch) return;

      const vars = prod.variations || prod.product_variations || [];

      if (vars.length > 0) {
        vars.forEach((v: any) => {
          // Captura a quantidade exata mantida pelo sistema
          const qty = Number(v.quantity ?? v.stock ?? v.qty ?? 0);
          const minQty = Number(v.minQuantity ?? v.min_quantity ?? v.minStock ?? 1);
          const isLow = qty <= minQty;

          if (!filterLowStock || isLow) {
            rows.push({
              id: v.id || `${prod.id}-${v.size}-${v.color}`,
              product: prod,
              variation: v,
              name: prod.name || prod.title,
              sku: prod.sku || prod.code || '-',
              category: prod.category || 'Geral',
              color: v.color || prod.color || 'PRETO',
              size: v.size || 'M',
              quantity: qty,
              isLow,
            });
          }
        });
      } else {
        const qty = Number(prod.quantity ?? prod.stock ?? prod.qty ?? 0);
        const minQty = Number(prod.minQuantity ?? prod.min_quantity ?? 1);
        const isLow = qty <= minQty;

        if (!filterLowStock || isLow) {
          rows.push({
            id: prod.id,
            product: prod,
            variation: prod,
            name: prod.name || prod.title,
            sku: prod.sku || prod.code || '-',
            category: prod.category || 'Geral',
            color: prod.color || 'Padrão',
            size: prod.size || 'M',
            quantity: qty,
            isLow,
          });
        }
      }
    });

    return rows;
  }, [productsList, filterCategory, search, filterLowStock]);

  const handleSaveQty = async () => {
    if (!editingVar) return;
    setSaving(true);
    const newQty = parseInt(editQty, 10) || 0;

    try {
      const varId = editingVar.variation?.id;
      const prodId = editingVar.product?.id;

      if (varId && varId !== prodId) {
        // Atualiza tanto 'quantity' quanto 'stock' na tabela 'product_variations'
        await supabase
          .from('product_variations')
          .update({ quantity: newQty, stock: newQty })
          .eq('id', varId);
      } else if (prodId) {
        await supabase
          .from('products')
          .update({ quantity: newQty, stock: newQty })
          .eq('id', prodId);
      }

      if (typeof toast === 'function') {
        toast('Estoque atualizado!', 'success');
      } else if (toast?.showToast) {
        toast.showToast('Estoque atualizado!', 'success');
      }

      setEditingVar(null);
      if (data?.fetchData) await data.fetchData();
      if (data?.refresh) await data.refresh();
    } catch (err: any) {
      if (typeof toast === 'function') {
        toast(err.message || 'Erro ao atualizar estoque', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Estoque Virgem</h1>
          <p className="text-sm text-slate-500">Saldo por tamanho e cor das peças brutas/lisas</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (data?.fetchData) await data.fetchData();
              if (data?.refresh) await data.refresh();
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>

          <button
            onClick={() => setIsUpSellerOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600"
          >
            <ShoppingBag className="h-4 w-4" />
            Importar UpSeller
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por peça ou SKU..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => onFilterCategory(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white p-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <option value="">Todas as Categorias</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <button
          onClick={() => onFilterLowStock(!filterLowStock)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
            filterLowStock
              ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300'
              : 'border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Estoque Baixo
        </button>
      </div>

      {/* Tabela de Produtos/Variações */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {inventoryRows.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Nenhum item encontrado no estoque virgem.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Peça Virgem / SKU</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Cor / Tamanho</th>
                  <th className="px-4 py-3">Qtd em Estoque</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {inventoryRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{row.name}</div>
                      <div className="text-xs text-slate-400">SKU: {row.sku}</div>
                    </td>
                    <td className="px-4 py-3">{row.category}</td>
                    <td className="px-4 py-3">
                      {row.color} / <strong className="text-slate-800 dark:text-slate-200">{row.size}</strong>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${row.isLow ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {row.quantity} un.
                      </span>
                      {row.isLow && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Baixo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setEditingVar({ product: row.product, variation: row.variation });
                          setEditQty(String(row.quantity));
                        }}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        title="Ajustar Quantidade"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Ajuste Manual */}
      {editingVar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-white">Ajustar Estoque Virgem</h3>
              <button onClick={() => setEditingVar(null)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-3 text-xs text-slate-500">
              {editingVar.product.name} ({editingVar.variation?.color || 'PRETO'} / {editingVar.variation?.size || 'M'})
            </p>

            <input
              type="number"
              value={editQty}
              onChange={(e) => setEditQty(e.target.value)}
              className="mb-4 w-full rounded-xl border border-slate-300 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setEditingVar(null)}
                className="w-full rounded-xl border border-slate-300 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveQty}
                disabled={saving}
                className="w-full rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal do UpSeller */}
      <UpSellerImportModal
        open={isUpSellerOpen}
        onClose={() => setIsUpSellerOpen(false)}
        onSuccess={async () => {
          if (data?.fetchData) await data.fetchData();
          if (data?.refresh) await data.refresh();
        }}
      />
    </div>
  );
}
