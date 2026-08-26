import { Modal } from './Modal';
import { ColorDot } from './Badges';
import { QualityBadge, StatusBadge } from './ReturnBadges';
import { useData } from '@/store';
import { useReturns } from '@/useReturns';
import { useToast } from './Toast';
import { CheckCircle2, Package } from 'lucide-react';
import type { ReturnItem } from '@/types';

interface ReturnScanConfirmModalProps {
  open: boolean;
  onClose: () => void;
  item: ReturnItem | null;
}

export function ReturnScanConfirmModal({ open, onClose, item }: ReturnScanConfirmModalProps) {
  const { adjustStock } = useData();
  const { reincorporateReturn, processReturn } = useReturns();
  const { toast } = useToast();

  if (!item) return null;

  const isBom = item.quality === 'bom';

  const handleReincorporate = () => {
    adjustStock(item.productId, item.variationId, item.quantity, `Reincorporação de devolução ${item.id}`);
    reincorporateReturn(item.id);
    toast(`Devolução ${item.id} reincorporada ao estoque (+${item.quantity})`, 'success');
    onClose();
  };

  const handleProcess = () => {
    processReturn(item.id);
    toast(`Devolução ${item.id} processada e destinada`, 'success');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Item Devolvido Encontrado"
      subtitle={item.id}
      size="sm"
      footer={
        isBom ? (
          <button className="btn-primary" onClick={handleReincorporate}>
            <CheckCircle2 size={16} /> Dar Baixa e Retornar ao Estoque (+{item.quantity})
          </button>
        ) : (
          <button className="btn-primary" onClick={handleProcess}>
            <Package size={16} /> Processar e Destinar Item
          </button>
        )
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-ink-50 border border-ink-100 p-3">
          <ColorDot color={item.color} size={28} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-900 truncate">{item.productName}</p>
            <p className="text-xs text-ink-500">
              {item.color} · Tamanho {item.size} · SKU {item.sku}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-500">Qtd</p>
            <p className="text-lg font-bold text-ink-900">{item.quantity}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-ink-500 mb-1">Qualidade</p>
            <QualityBadge quality={item.quality} />
          </div>
          <div>
            <p className="text-xs text-ink-500 mb-1">Status atual</p>
            <StatusBadge status={item.status} />
          </div>
        </div>

        {item.reason && (
          <div className="rounded-lg border border-ink-100 bg-ink-50 px-3 py-2">
            <p className="text-xs text-ink-500 mb-0.5">Motivo</p>
            <p className="text-sm text-ink-700">{item.reason}</p>
          </div>
        )}

        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            isBom
              ? 'bg-brand-50 border-brand-200 text-brand-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {isBom ? (
            <p>
              O item está em <strong>bom estado</strong>. Ao confirmar, a devolução será baixada e{' '}
              <strong>{item.quantity} unidade(s)</strong> retornarão ao estoque principal.
            </p>
          ) : (
            <p>
              O item está classificado como <strong>{item.quality}</strong>. Ao confirmar, a devolução será
              processada e destinada, dando baixa apenas no estoque de devoluções.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
