import type { ReturnItem } from '@/types';

const STORAGE_KEY = 'app_devolucoes';
const HISTORY_KEY = 'app_devolucoes_historico';

export function loadReturns(): ReturnItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ReturnItem[];
  } catch {
    return [];
  }
}

export function saveReturns(returns: ReturnItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(returns));
}

export function restoreReturns(returns: ReturnItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(returns));
}

export function restoreHistory(history: Record<string, MonthlySummary>): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export interface MonthlySummary {
  monthKey: string;
  entradas: number;
  saidas: number;
  porQualidade: Record<string, number>;
}

export function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonthKey(): string {
  return monthKey(Date.now());
}

export function loadHistory(): Record<string, MonthlySummary> {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, MonthlySummary>;
  } catch {
    return {};
  }
}

export function saveHistory(history: Record<string, MonthlySummary>): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function buildMonthlySummary(returns: ReturnItem[], key: string): MonthlySummary {
  const inMonth = returns.filter((r) => monthKey(r.createdAt) === key);
  const entradas = inMonth.reduce((s, r) => s + r.quantity, 0);
  const saidas = inMonth
    .filter((r) => r.status !== 'triagem')
    .reduce((s, r) => s + r.quantity, 0);
  const porQualidade: Record<string, number> = { bom: 0, reconstituido: 0, ruim: 0, doacao: 0 };
  inMonth.forEach((r) => {
    porQualidade[r.quality] = (porQualidade[r.quality] || 0) + r.quantity;
  });
  return { monthKey: key, entradas, saidas, porQualidade };
}

export function archiveMonthIfNeeded(returns: ReturnItem[], history: Record<string, MonthlySummary>): Record<string, MonthlySummary> {
  const now = new Date();
  const curKey = currentMonthKey();
  const updated = { ...history };

  const pastMonths = new Set<string>();
  returns.forEach((r) => {
    const k = monthKey(r.createdAt);
    if (k !== curKey) pastMonths.add(k);
  });
  Object.keys(history).forEach((k) => {
    if (k !== curKey) pastMonths.add(k);
  });

  pastMonths.forEach((k) => {
    if (!updated[k]) {
      updated[k] = buildMonthlySummary(returns, k);
    }
  });

  updated[curKey] = buildMonthlySummary(returns, curKey);
  return updated;
}

export function returnCode(ret: ReturnItem): string {
  return ret.id;
}

export function buildReturnPayload(ret: ReturnItem): string {
  return JSON.stringify({
    id: ret.id,
    sku: ret.sku,
    dtfCode: ret.dtfCode,
    quantidade: ret.quantity,
    qualidade: ret.quality,
    tipo: 'DEVOLUCAO',
  });
}

export function parseReturnPayload(raw: string): { id: string; sku: string; quantidade: number; qualidade: string; tipo: string } | null {
  try {
    const obj = JSON.parse(raw);
    if (obj && obj.tipo === 'DEVOLUCAO' && typeof obj.id === 'string') {
      return obj;
    }
    return null;
  } catch {
    return null;
  }
}
