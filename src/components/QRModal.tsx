import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Modal } from './Modal';
import { ColorDot } from './Badges';
import { useData } from '@/store';
import { useToast } from './Toast';
import { Printer, Copy } from 'lucide-react';
import type { Product, Variation } from '@/types';

interface QRModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  variation: Variation | null;
}

export function QRModal({ open, onClose, product, variation }: QRModalProps) {
  const { variationCode, getCategory } = useData();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState('');

  const code = product && variation ? variationCode(product.id, variation) : '';
  const category = product ? getCategory(product.categoryId) : null;

  useEffect(() => {
    if (!open || !code || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, code, { width: 220, margin: 1, color: { dark: '#1a1a1a', light: '#ffffff' } }, () => {});
    QRCode.toDataURL(code, { width: 220, margin: 1 }).then(setDataUrl).catch(() => {});
  }, [open, code]);

  if (!product || !variation) return null;

  const copyCode = () => {
    navigator.clipboard?.writeText(code);
    toast('Código copiado para a área de transferência', 'success');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="QR Code da variação"
      subtitle={product.name}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={copyCode}>
            <Copy size={16} /> Copiar código
          </button>
          <button className="btn-primary no-print" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </button>
        </>
      }
    >
      <div className="print-area flex flex-col items-center">
        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
          <canvas ref={canvasRef} className="block" />
        </div>
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <ColorDot color={variation.color} />
            <span className="text-sm font-semibold text-ink-900">
              {variation.color} · Tamanho {variation.size}
            </span>
          </div>
          <p className="text-xs text-ink-500">{category?.name}</p>
          <p className="mt-2 font-mono text-sm font-semibold tracking-wider text-ink-700 bg-ink-50 border border-ink-100 rounded-lg px-3 py-1.5 inline-block">
            {code}
          </p>
          <p className="mt-2 text-[11px] text-ink-400">Escaneie com o leitor do app para acessar este item</p>
        </div>
      </div>
      {dataUrl && <img src={dataUrl} className="hidden" alt="" />}
    </Modal>
  );
}
