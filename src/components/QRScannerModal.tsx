import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Modal } from './Modal';
import { useData } from '@/store';
import { useReturns } from '@/useReturns';
import { useToast } from './Toast';
import { parseReturnPayload } from '@/returnsStorage';
import { Camera, ScanLine, Keyboard, AlertCircle } from 'lucide-react';
import type { Product, Variation, ReturnItem } from '@/types';

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onFound: (product: Product, variation: Variation) => void;
  onReturnFound: (item: ReturnItem) => void;
}

export function QRScannerModal({ open, onClose, onFound, onReturnFound }: QRScannerModalProps) {
  const { findVariationByCode } = useData();
  const { findReturnById } = useReturns();
  const { toast } = useToast();
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-reader-container';

  const handleCode = (code: string): boolean => {
    // First try to parse as a DEVOLUCAO payload
    const returnPayload = parseReturnPayload(code);
    if (returnPayload) {
      const ret = findReturnById(returnPayload.id);
      if (ret) {
        toast(`Devolução encontrada: ${ret.id} (${ret.productName})`, 'success');
        onReturnFound(ret);
        return true;
      }
      toast('Devolução não encontrada no sistema', 'error');
      return true;
    }

    // Otherwise try inventory variation code
    const found = findVariationByCode(code);
    if (found) {
      toast(`Encontrado: ${found.product.name} (${found.variation.color}/${found.variation.size})`, 'success');
      onFound(found.product, found.variation);
      return true;
    }
    return false;
  };

  // start camera
  useEffect(() => {
    if (!open || mode !== 'camera') return;
    let cancelled = false;
    setError('');

    const start = async () => {
      try {
        // Explicitly request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        // Stop the permission stream — html5-qrcode will start its own
        stream.getTracks().forEach((t) => t.stop());

        const el = document.getElementById(containerId);
        if (!el) return;
        const scanner = new Html5Qrcode(containerId, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            if (cancelled) return;
            if (handleCode(decoded)) {
              stopCamera();
            }
          },
          () => {},
        );
        if (!cancelled) setScanning(true);
      } catch (e) {
        if (!cancelled) {
          setError('Câmera indisponível. Use a entrada manual para digitar ou colar um código.');
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  // cleanup on close
  useEffect(() => {
    if (!open) {
      stopCamera();
      setManualCode('');
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submitManual = () => {
    if (!manualCode.trim()) return;
    if (!handleCode(manualCode.trim())) {
      toast('Nenhum item corresponde a este código', 'error');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Escanear QR Code" size="sm">
      <div className="flex gap-2 mb-4 p-1 bg-ink-100 rounded-lg">
        <button
          onClick={() => setMode('camera')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
            mode === 'camera' ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500'
          }`}
        >
          <Camera size={16} /> Câmera
        </button>
        <button
          onClick={() => {
            setMode('manual');
            stopCamera();
          }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
            mode === 'manual' ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500'
          }`}
        >
          <Keyboard size={16} /> Manual
        </button>
      </div>

      {mode === 'camera' ? (
        <div>
          <div
            id={containerId}
            className="relative w-full aspect-square rounded-xl overflow-hidden bg-ink-950 border border-ink-200"
          >
            {!scanning && !error && (
              <div className="absolute inset-0 flex items-center justify-center text-ink-400 text-sm">
                Iniciando câmera…
              </div>
            )}
            {scanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-60 h-60 border-2 border-white/80 rounded-2xl relative">
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-brand-400 rounded-tl-xl" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-brand-400 rounded-tr-xl" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-brand-400 rounded-bl-xl" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-brand-400 rounded-br-xl" />
                </div>
              </div>
            )}
          </div>
          {error ? (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-accent-50 border border-accent-200 px-3 py-2.5 text-sm text-accent-800">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <p className="mt-3 text-xs text-ink-500 flex items-center gap-1.5">
              <ScanLine size={14} /> Aponte a câmera para um QR Code de variação ou devolução. A leitura é automática.
            </p>
          )}
        </div>
      ) : (
        <div>
          <label className="label">Código</label>
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitManual()}
            placeholder="TF-XXXXX-XXXXX ou payload JSON de devolução"
            className="input font-mono"
            autoFocus
          />
          <p className="text-xs text-ink-500 mt-2">
            Dica: cole o payload JSON de uma devolução para simular a leitura do QR Code.
          </p>
          <button className="btn-primary w-full mt-4" onClick={submitManual}>
            <ScanLine size={16} /> Buscar código
          </button>
        </div>
      )}
    </Modal>
  );
}
