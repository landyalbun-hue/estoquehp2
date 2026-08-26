import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/Modal';
import { useData } from '@/store';
import { useToast } from '@/components/Toast';
import { ColorDot } from '@/components/Badges';
import type { QualityState } from '@/types';
import { QUALITY_LABELS, QUALITY_DESCRIPTIONS, QUALITY_STYLES } from '@/types';
import { useReturns } from '@/useReturns';

interface ReturnFormModalProps {
  open: boolean;
  onClose: () => void;
}

const QUALITY_OPTIONS: QualityState[] = ['bom', 'reconstituido', 'ruim', 'doacao'];

export function ReturnFormModal({ open, onClose }: ReturnFormModalProps) {
  const { products } = useData();
  const { addReturn } = useReturns();
  const { toast } = useToast();

  const [productId, setProductId] = useState('');
  const [variationId, setVariationId] = useState('');
  const [dtfCode, setDtfCode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [quality, setQuality] = useState<QualityState>('bom');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setProductId('');
      setVariationId('');
      setDtfCode('');
      setQuantity(1);
      setQuality('bom');
      setReason('');
    }
  }, [open]);

  const selectedProduct = useMemo(() => products.find((p) => p.id === productId), [products, productId]);
  const selectedVariation = useMemo(
    () => selectedProduct?.variations.find((v) => v.id === variationId),
    [selectedProduct, variationId],
  );

  const handleProductChange = (id: string) => {
    setProductId(id);
    setVariationId('');
  };

  const submit = () => {
    if (!selectedProduct || !selectedVariation) {
      toast('Selecione um produto e uma variação', 'error');
      return;
    }
    if (!dtfCode.trim()) {
      toast('Informe o código/nome da Estampa DTF', 'error');
      return;
    }
    if (quantity < 1) {
      toast('A quantidade deve ser maior que zero', 'error');
      return;
    }
    addReturn({
      productId: selectedProduct.id,
      variationId: selectedVariation.id,
      sku: selectedProduct.sku,
      dtfCode: dtfCode.trim(),
      productName: selectedProduct.name,
      color: selectedVariation.color,
      size: selectedVariation.size,
      quantity,
      quality,
      reason: reason.trim(),
    });
    toast('Devolução registrada com sucesso', 'success');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar Devolução"
      subtitle="Cadastre um item devolvido pelo cliente"
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={submit}>
            Registrar Devolução
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Product + Variation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Produto</label>
            <select className="input" value={productId} onChange={(e) => handleProductChange(e.target.value)}>
              <option value="">Selecione um produto…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Variação (SKU, Cor, Tamanho)</label>
            <select
              className="input"
              value={variationId}
              onChange={(e) => setVariationId(e.target.value)}
              disabled={!selectedProduct}
            >
              <option value="">{selectedProduct ? 'Selecione uma variação…' : 'Escolha um produto primeiro'}</option>
              {selectedProduct?.variations.map((v) => (
                <option key={v.id} value={v.id}>
                  {selectedProduct.sku} · {v.color} · {v.size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SKU + DTF fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">SKU do Produto</label>
            <input
              className="input font-mono"
              value={selectedProduct?.sku ?? ''}
              readOnly
              placeholder="Selecione um produto"
            />
          </div>
          <div>
            <label className="label">Código / Nome da Estampa DTF *</label>
            <input
              className="input font-mono"
              value={dtfCode}
              onChange={(e) => setDtfCode(e.target.value)}
              placeholder="Ex: DTF-001, Estampa Logo Front"
              autoFocus
            />
          </div>
        </div>

        {/* Selected variation preview */}
        {selectedVariation && (
          <div className="flex items-center gap-3 rounded-xl bg-ink-50 border border-ink-100 p-3">
            <ColorDot color={selectedVariation.color} size={28} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-900 truncate">
                {selectedVariation.color} · Tamanho {selectedVariation.size}
              </p>
              <p className="text-xs text-ink-500">SKU {selectedProduct?.sku}{dtfCode ? ` · DTF ${dtfCode}` : ''}</p>
            </div>
          </div>
        )}

        {/* Quantity */}
        <div>
          <label className="label">Quantidade</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="input"
          />
        </div>

        {/* Quality */}
        <div>
          <label className="label">Estado de Qualidade</label>
          <div className="grid grid-cols-2 gap-2">
            {QUALITY_OPTIONS.map((q) => {
              const s = QUALITY_STYLES[q];
              const active = quality === q;
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuality(q)}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all ${
                    active
                      ? `${s.bg} ${s.border} ring-2 ring-offset-1 ring-current ${s.text}`
                      : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  <span className={`inline-block h-3 w-3 rounded-full ${s.dot} shrink-0`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{QUALITY_LABELS[q]}</p>
                    <p className="text-xs text-ink-500">{QUALITY_DESCRIPTIONS[q]}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="label">Motivo / Observação</label>
          <textarea
            className="input min-h-[80px] resize-y"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Descreva o motivo da devolução…"
          />
        </div>
      </div>
    </Modal>
  );
}
