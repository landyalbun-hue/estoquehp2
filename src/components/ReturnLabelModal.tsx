import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { Download, Printer } from 'lucide-react';
import type { ReturnItem } from '@/types';
import { QUALITY_LABELS } from '@/types';
import { buildReturnPayload } from '@/returnsStorage';

interface ReturnLabelModalProps {
  open: boolean;
  onClose: () => void;
  item: ReturnItem | null;
}

export function ReturnLabelModal({ open, onClose, item }: ReturnLabelModalProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState('');

  const payload = item ? buildReturnPayload(item) : '';

  useEffect(() => {
    if (!open || !payload || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, payload, { width: 180, margin: 1, color: { dark: '#1a1a1a', light: '#ffffff' } }, () => {});
    QRCode.toDataURL(payload, { width: 200, margin: 1 }).then(setDataUrl).catch(() => {});
  }, [open, payload]);

  if (!item) return null;

  const downloadQR = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `etiqueta-${item.id}.png`;
    a.click();
    toast('Etiqueta baixada com sucesso', 'success');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Etiqueta de Devolução"
      subtitle={item.id}
      size="lg"
      footer={
        <>
          <button className="btn-secondary no-print" onClick={onClose}>
            Fechar
          </button>
          <button className="btn-secondary no-print" onClick={downloadQR} disabled={!dataUrl}>
            <Download size={16} /> Baixar QR
          </button>
          <button className="btn-primary no-print" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </button>
        </>
      }
    >
      {/* Label layout: left = info, right = QR */}
      <div className="print-area flex justify-center">
        <div className="flex border-2 border-ink-900 rounded-lg overflow-hidden bg-white shadow-card" style={{ width: '480px', minHeight: '200px' }}>
          {/* Left side: info */}
          <div className="flex-1 p-4 flex flex-col justify-center gap-1.5 border-r-2 border-ink-900">
            <p className="text-lg font-bold tracking-wide text-ink-900 uppercase leading-tight">
              {item.productName.toUpperCase()}
            </p>
            <div className="space-y-0.5 mt-1">
              <p className="text-xs text-ink-500 uppercase tracking-wide">Modelo</p>
              <p className="text-sm font-semibold text-ink-800">{item.sku}</p>
            </div>
            {item.dtfCode && (
              <div className="space-y-0.5 mt-1">
                <p className="text-xs text-ink-500 uppercase tracking-wide">Estampa DTF</p>
                <p className="text-sm font-semibold text-ink-800">{item.dtfCode}</p>
              </div>
            )}
            <div className="flex gap-4 mt-1">
              <div>
                <p className="text-xs text-ink-500 uppercase tracking-wide">Tam</p>
                <p className="text-sm font-semibold text-ink-800">{item.size}</p>
              </div>
              <div>
                <p className="text-xs text-ink-500 uppercase tracking-wide">Cor</p>
                <p className="text-sm font-semibold text-ink-800">{item.color}</p>
              </div>
            </div>
            <div className="mt-1">
              <p className="text-xs text-ink-500 uppercase tracking-wide">Estado</p>
              <p className="text-sm font-semibold text-ink-800">{QUALITY_LABELS[item.quality]}</p>
            </div>
            <div className="mt-1">
              <p className="text-xs text-ink-500 uppercase tracking-wide">Qtd</p>
              <p className="text-sm font-semibold text-ink-800">{item.quantity}</p>
            </div>
          </div>

          {/* Right side: QR code */}
          <div className="flex flex-col items-center justify-center p-4 bg-white">
            <canvas ref={canvasRef} className="block" />
            <p className="mt-2 font-mono text-xs font-semibold text-ink-700">{item.id}</p>
          </div>
        </div>
      </div>
      {dataUrl && <img src={dataUrl} className="hidden" alt="" />}
    </Modal>
  );
}
