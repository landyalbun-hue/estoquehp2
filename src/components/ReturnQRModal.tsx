import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Modal } from './Modal';
import { ColorDot } from './Badges';
import { QualityBadge } from './ReturnBadges';
import { useToast } from './Toast';
import { Download, Copy } from 'lucide-react';
import type { ReturnItem } from '@/types';
import { buildReturnPayload } from '@/returnsStorage';

interface ReturnQRModalProps {
  open: boolean;
  onClose: () => void;
  item: ReturnItem | null;
}

export function ReturnQRModal({ open, onClose, item }: ReturnQRModalProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState('');

  const payload = item ? buildReturnPayload(item) : '';

  useEffect(() => {
    if (!open || !payload || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, payload, { width: 220, margin: 1, color: { dark: '#1a1a1a', light: '#ffffff' } }, () => {});
    QRCode.toDataURL(payload, { width: 240, margin: 1 }).then(setDataUrl).catch(() => {});
  }, [open, payload]);

  if (!item) return null;

  const copyPayload = () => {
    navigator.clipboard?.writeText(payload);
    toast('Payload copiado para a área de transferência', 'success');
  };

  const downloadQR = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qrcode-${item.id}.png`;
    a.click();
    toast('Imagem do QR Code baixada', 'success');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="QR Code da Devolução"
      subtitle={item.id}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={copyPayload}>
            <Copy size={16} /> Copiar payload
          </button>
          <button className="btn-primary" onClick={downloadQR} disabled={!dataUrl}>
            <Download size={16} /> Baixar imagem
          </button>
        </>
      }
    >
      <div className="flex flex-col items-center">
        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
          <canvas ref={canvasRef} className="block" />
        </div>
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <ColorDot color={item.color} />
            <span className="text-sm font-semibold text-ink-900">
              {item.productName}
            </span>
          </div>
          <p className="text-xs text-ink-500">
            {item.color} · Tamanho {item.size} · Qtd: {item.quantity}
          </p>
          <div className="mt-2 flex items-center justify-center">
            <QualityBadge quality={item.quality} />
          </div>
          <div className="mt-3 text-left bg-ink-50 border border-ink-100 rounded-lg px-3 py-2">
            <p className="text-[11px] font-mono text-ink-600 break-all">{payload}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
