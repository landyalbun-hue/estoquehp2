import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Modal } from './Modal';
import { useReturns } from '@/useReturns';
import { useData } from '@/store';
import { useToast } from './Toast';
import { parseReturnPayload } from '@/returnsStorage';
import { Camera, ScanLine, Keyboard, AlertCircle, CheckCircle2, X } from 'lucide-react';
import type { ReturnItem } from '@/types';

interface ReturnScannerModalProps {
  open: boolean;
  onClose: () => void;
}

export function ReturnScannerModal({ open, onClose }: ReturnScannerModalProps) {
  const { findReturnById, reincorporateReturn, processReturn } = useReturns();
  const { adjustStock } = useData();
  const { toast } = useToast();
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<{ item: ReturnItem; action: string } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'return-qr-reader';

  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // ignore audio errors
    }
  }, []);

  const autoProcess = useCallback(
    (item: ReturnItem) => {
      if (item.status !== 'triagem') {
        toast(`Devolução ${item.id} já foi processada anteriormente`, 'info');
        setLastResult({ item, action: 'já processada' });
        return;
      }

      if (item.quality === 'bom') {
        adjustStock(item.productId, item.variationId, item.quantity, `Reincorporação automática de devolução ${item.id}`);
        reincorporateReturn(item.id);
        toast(`Baixa realizada com sucesso no modelo ${item.productName}!`, 'success');
        setLastResult({ item, action: 'reincorporada ao estoque' });
      } else {
        processReturn(item.id);
        toast(`Baixa realizada com sucesso no modelo ${item.productName}!`, 'success');
        setLastResult({ item, action: 'processada e destinada' });
      }
      playBeep();
    },
    [adjustStock, reincorporateReturn, processReturn, toast, playBeep],
  );

  const handleCode = useCallback(
    (code: string): boolean => {
      const payload = parseReturnPayload(code);
      if (!payload) {
        return false;
      }
      const ret = findReturnById(payload.id);
      if (ret) {
        autoProcess(ret);
        return true;
      }
      toast('Devolução não encontrada no sistema', 'error');
      return true;
    },
    [findReturnById, autoProcess, toast],
  );

  useEffect(() => {
    if (!open || mode !== 'camera') return;
    let cancelled = false;
    setError('');

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
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
      } catch {
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

  useEffect(() => {
    if (!open) {
      stopCamera();
      setManualCode('');
      setError('');
      setLastResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submitManual = () => {
    if (!manualCode.trim()) return;
    if (!handleCode(manualCode.trim())) {
      toast('Código inválido ou não corresponde a uma devolução', 'error');
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Escanear Devolução" size="sm">
      {lastResult ? (
        <div className="flex flex-col items-center text-center py-4">
          <div className="h-16 w-16 rounded-full bg-brand-100 flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-brand-600" />
          </div>
          <p className="text-base font-bold text-brand-700">
            Baixa realizada com sucesso!
          </p>
          <p className="text-sm text-ink-600 mt-1">
            Modelo: <strong>{lastResult.item.productName}</strong>
          </p>
          <p className="text-xs text-ink-500 mt-0.5">
            {lastResult.item.color} · Tam {lastResult.item.size} · Qtd {lastResult.item.quantity}
          </p>
          <p className="text-xs text-ink-400 mt-2">
            Ação: {lastResult.action}
          </p>
          <div className="flex gap-2 mt-5 w-full">
            <button
              className="btn-secondary flex-1"
              onClick={() => {
                setLastResult(null);
                setMode('camera');
              }}
            >
              <Camera size={16} /> Escanear outra
            </button>
            <button className="btn-primary flex-1" onClick={handleClose}>
              Concluir
            </button>
          </div>
        </div>
      ) : (
        <>
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
                  <ScanLine size={14} /> Aponte a câmera para o QR Code da etiqueta de devolução. A baixa é automática.
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="label">Código da devolução</label>
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitManual()}
                placeholder='{"id":"DEV-...","tipo":"DEVOLUCAO"}'
                className="input font-mono text-xs"
                autoFocus
              />
              <p className="text-xs text-ink-500 mt-2">
                Dica: cole o payload JSON da etiqueta de devolução para simular a leitura.
              </p>
              <button className="btn-primary w-full mt-4" onClick={submitManual}>
                <ScanLine size={16} /> Processar devolução
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
