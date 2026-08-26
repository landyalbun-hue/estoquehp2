import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReturnItem, QualityState } from '@/types';
import { loadReturns, saveReturns, loadHistory, saveHistory, currentMonthKey, buildMonthlySummary, archiveMonthIfNeeded, type MonthlySummary } from './returnsStorage';

export interface NewReturnInput {
  productId: string;
  variationId: string;
  sku: string;
  dtfCode: string;
  productName: string;
  color: string;
  size: string;
  quantity: number;
  quality: QualityState;
  reason: string;
}

export function useReturns() {
  const [returns, setReturns] = useState<ReturnItem[]>(() => loadReturns());
  const [history, setHistory] = useState<Record<string, MonthlySummary>>(() => loadHistory());

  useEffect(() => {
    saveReturns(returns);
  }, [returns]);

  useEffect(() => {
    const updated = archiveMonthIfNeeded(returns, history);
    saveHistory(updated);
    setHistory(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returns]);

  const currentMonth = currentMonthKey();
  const monthlySummary = useMemo(() => buildMonthlySummary(returns, currentMonth), [returns, currentMonth]);

  const addReturn = useCallback((input: NewReturnInput): ReturnItem => {
    const item: ReturnItem = {
      id: `DEV-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      productId: input.productId,
      variationId: input.variationId,
      sku: input.sku,
      dtfCode: input.dtfCode,
      productName: input.productName,
      color: input.color,
      size: input.size,
      quantity: input.quantity,
      quality: input.quality,
      reason: input.reason,
      status: 'triagem',
      createdAt: Date.now(),
    };
    setReturns((prev) => [item, ...prev]);
    return item;
  }, []);

  const reincorporateReturn = useCallback((id: string) => {
    setReturns((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'reincorporado', processedAt: Date.now() } : r)),
    );
  }, []);

  const processReturn = useCallback((id: string) => {
    setReturns((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'destinado', processedAt: Date.now() } : r)),
    );
  }, []);

  const deleteReturn = useCallback((id: string) => {
    setReturns((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const findReturnById = useCallback(
    (id: string) => returns.find((r) => r.id === id),
    [returns],
  );

  return {
    returns,
    addReturn,
    reincorporateReturn,
    processReturn,
    deleteReturn,
    findReturnById,
    monthlySummary,
    history,
  };
}
