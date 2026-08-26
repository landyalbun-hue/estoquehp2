import { useEffect, useState } from 'react';
import { Minus, Plus, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Modal } from './Modal';
import { ColorDot, StockBadge } from './Badges';
import { useData } from '@/store';
import { useToast } from './Toast';
import type { Product, Variation } from '@/types';

interface StockAdjustModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  variation: Variation | null;
  mode?: 'both' | 'in' | 'out';
}

const REASONS_IN = ['Reposição', 'Nova entrega', 'Devolução', 'Correção de inventário', 'Transferência de entrada'];
const REASONS_OUT = ['Venda', 'Pedido online', 'Dano / perda', 'Devolução ao fornecedor', 'Transferência de saída'];

export function StockAdjustModal({
  open,
  onClose,
  product,
  variation,
  mode = 'both',
}: StockAdjustModalProps) {
  const { adjustStock, getCategory } = useData();
  const { toast } = useToast();
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setDirection(mode === 'out' ? 'out' : 'in');
      setAmount(1);
      setReason('');
    }
  }, [open, mode]);

  if (!product || !variation) return null;

  const category = getCategory(product.categoryId);
  const reasons = direction === 'in' ? REASONS_IN : REASONS_OUT;
  const newStock = direction === 'in' ? variation.stock + amount : Math.max(0, variation.stock - amount);

  const submit = () => {
    if (amount <= 0) {
      toast('Informe uma quantidade maior que zero', 'error');
      return;
    }
    const delta = direction === 'in' ? amount : -amount;
    adjustStock(product.id, variation.id, delta, reason || (direction === 'in' ? 'Reposição' : 'Venda'));
    toast(
      `${direction === 'in' ? 'Adicionada' : 'Removida'} ${amount} unidade${amount > 1 ? 's' : ''} · ${product.name} (${variation.color} / ${variation.size})`,
      'success',
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajustar estoque"
      subtitle={`${product.name} · ${category?.name ?? ''}`}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className={direction === 'in' ? 'btn-primary' : 'btn-danger'} onClick={submit}>
            {direction === 'in' ? 'Entrada de estoque' : 'Saída de estoque'}
          </button>
        </>
      }
    >
      <div className="flex items-center gap-3 rounded-xl bg-ink-50 border border-ink-100 p-3 mb-4">
        <ColorDot color={variation.color} size={28} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900 truncate">
            {variation.color} · Tamanho {variation.size}
          </p>
          <p className="text-xs text-ink-500">SKU {product.sku}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-500">Atual</p>
          <p className="text-lg font-bold text-ink-900">{variation.stock}</p>
        </div>
      </div>

      {mode === 'both' && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setDirection('in')}
            className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
              direction === 'in'
                ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20'
                : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
            }`}
          >
            <ArrowUpCircle size={16} /> Entrada
          </button>
          <button
            onClick={() => setDirection('out')}
            className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
              direction === 'out'
                ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-500/20'
                : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
            }`}
          >
            <ArrowDownCircle size={16} /> Saída
          </button>
        </div>
      )}

      <div className="mb-4">
        <label className="label">Quantidade</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAmount((a) => Math.max(1, a - 1))}
            className="btn-icon h-10 w-10 border border-ink-200 text-ink-600 hover:bg-ink-50"
          >
            <Minus size={16} />
          </button>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
            className="input text-center text-lg font-semibold"
          />
          <button
            onClick={() => setAmount((a) => a + 1)}
            className="btn-icon h-10 w-10 border border-ink-200 text-ink-600 hover:bg-ink-50"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="label">Motivo</label>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="input">
          <option value="">Padrão ({direction === 'in' ? 'Reposição' : 'Venda'})</option>
          {reasons.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
        <div>
          <p className="text-xs text-ink-500">Novo nível de estoque</p>
          <div className="mt-1">
            <StockBadge stock={newStock} threshold={variation.lowStockThreshold} />
          </div>
        </div>
        <p className="text-2xl font-bold text-ink-900">{newStock}</p>
      </div>
    </Modal>
  );
}
