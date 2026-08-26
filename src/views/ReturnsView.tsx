import { useMemo, useState } from 'react';
import {
  Plus, QrCode, RotateCcw, Trash2, Package, HeartHandshake, CheckCircle2, Boxes,
  ArrowDownToLine, ArrowUpFromLine, AlertTriangle, TrendingUp, PieChart, BarChart3, Calendar,
  ScanLine, Tag, Search, X, Layers,
} from 'lucide-react';
import { useReturns } from '@/useReturns';
import { useData } from '@/store';
import { useToast } from '@/components/Toast';
import { ColorDot } from '@/components/Badges';
import { QualityBadge, StatusBadge } from '@/components/ReturnBadges';
import { ReturnFormModal } from '@/components/ReturnFormModal';
import { ReturnQRModal } from '@/components/ReturnQRModal';
import { ReturnScannerModal } from '@/components/ReturnScannerModal';
import { ReturnLabelModal } from '@/components/ReturnLabelModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { QualityState, ReturnItem } from '@/types';
import { QUALITY_LABELS, QUALITY_STYLES } from '@/types';

const QUALITY_FILTERS: { value: QualityState | ''; label: string }[] = [
  { value: '', label: 'Todos os estados' },
  { value: 'bom', label: 'Bom' },
  { value: 'reconstituido', label: 'Reconstituído' },
  { value: 'ruim', label: 'Ruim' },
  { value: 'doacao', label: 'Doação' },
];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

export function ReturnsView() {
  const { returns, reincorporateReturn, processReturn, deleteReturn, monthlySummary, history } = useReturns();
  const { adjustStock } = useData();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [qrTarget, setQrTarget] = useState<ReturnItem | null>(null);
  const [labelTarget, setLabelTarget] = useState<ReturnItem | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReturnItem | null>(null);
  const [filterQuality, setFilterQuality] = useState<QualityState | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  const stats = useMemo(() => {
    const total = returns.reduce((s, r) => s + r.quantity, 0);
    const triagem = returns.filter((r) => r.status === 'triagem').reduce((s, r) => s + r.quantity, 0);
    const doacoes = returns.filter((r) => r.quality === 'doacao').reduce((s, r) => s + r.quantity, 0);
    const reincorporados = returns.filter((r) => r.status === 'reincorporado').reduce((s, r) => s + r.quantity, 0);
    return { total, triagem, doacoes, reincorporados };
  }, [returns]);

  const entradasMes = monthlySummary.entradas;
  const saidasMes = monthlySummary.saidas;
  const taxaRetorno = entradasMes > 0 ? (saidasMes / entradasMes) * 100 : 0;

  const volumeStatus = useMemo(() => {
    if (entradasMes === 0) return 'normal';
    if (entradasMes >= 20) return 'alerta';
    if (entradasMes >= 10) return 'atencao';
    return 'normal';
  }, [entradasMes]);

  const filtered = useMemo(() => {
    let result = returns;
    if (filterQuality) {
      result = result.filter((r) => r.quality === filterQuality);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.sku.toLowerCase().includes(q) ||
          (r.dtfCode || '').toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.color.toLowerCase().includes(q) ||
          r.size.toLowerCase().includes(q),
      );
    }
    return result;
  }, [returns, filterQuality, searchQuery]);

  const skuDtfSummary = useMemo(() => {
    const groups: Record<string, { sku: string; dtfCode: string; productName: string; count: number; triagem: number }> = {};
    returns.forEach((r) => {
      const key = `${r.sku}||${r.dtfCode || ''}`;
      if (!groups[key]) {
        groups[key] = { sku: r.sku, dtfCode: r.dtfCode || '', productName: r.productName, count: 0, triagem: 0 };
      }
      groups[key].count += r.quantity;
      if (r.status === 'triagem') groups[key].triagem += r.quantity;
    });
    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [returns]);

  const qualityBreakdown = useMemo(() => {
    const q: Record<QualityState, number> = { bom: 0, reconstituido: 0, ruim: 0, doacao: 0 };
    returns.forEach((r) => {
      q[r.quality] += r.quantity;
    });
    const total = Object.values(q).reduce((s, v) => s + v, 0);
    return { counts: q, total };
  }, [returns]);

  const last6Months = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; entradas: number; saidas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const h = history[k] || buildMonthlySummary(returns, k);
      months.push({
        key: k,
        label: MONTH_NAMES[d.getMonth()].slice(0, 3),
        entradas: h.entradas,
        saidas: h.saidas,
      });
    }
    return months;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, returns]);

  const handleReincorporate = (item: ReturnItem) => {
    adjustStock(item.productId, item.variationId, item.quantity, `Reincorporação de devolução ${item.id}`);
    reincorporateReturn(item.id);
    toast(`Devolução ${item.id} reincorporada ao estoque (+${item.quantity})`, 'success');
  };

  const handleProcess = (item: ReturnItem) => {
    processReturn(item.id);
    toast(`Devolução ${item.id} processada e destinada`, 'success');
  };

  const handleManualBaixa = (item: ReturnItem) => {
    if (item.quality === 'bom') {
      adjustStock(item.productId, item.variationId, item.quantity, `Baixa manual - reincorporação ${item.id}`);
      reincorporateReturn(item.id);
      toast(`Baixa manual realizada: ${item.productName} retornou ao estoque (+${item.quantity})`, 'success');
    } else {
      processReturn(item.id);
      toast(`Baixa manual realizada: ${item.productName} destinado como ${QUALITY_LABELS[item.quality]}`, 'success');
    }
  };

  const maxBarValue = Math.max(...last6Months.map((m) => Math.max(m.entradas, m.saidas)), 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Devoluções</h2>
          <p className="text-sm text-ink-500">{returns.length} registros · gerencie itens devolvidos</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button className="btn-secondary" onClick={() => setScannerOpen(true)}>
            <ScanLine size={16} /> Escanear Devolução
          </button>
          <button className="btn-primary" onClick={() => setFormOpen(true)}>
            <Plus size={16} /> Registrar Devolução
          </button>
        </div>
      </div>

      {/* Monthly metrics */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-brand-600" />
          <h3 className="text-sm font-semibold text-ink-900">
            Métricas de {formatMonthLabel(monthlySummary.monthKey)}
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MonthlyMetric
            icon={<ArrowDownToLine size={20} />}
            label="Entradas (Recebidas)"
            value={entradasMes}
            tint="brand"
          />
          <MonthlyMetric
            icon={<ArrowUpFromLine size={20} />}
            label="Saídas (Enviadas/Destinadas)"
            value={saidasMes}
            tint="blue"
          />
          <MonthlyMetric
            icon={<TrendingUp size={20} />}
            label="Taxa de Processamento"
            value={`${taxaRetorno.toFixed(0)}%`}
            tint="accent"
          />
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">Volume de Devoluções</p>
            <VolumeIndicator status={volumeStatus} />
          </div>
        </div>
        {volumeStatus === 'alerta' && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            <AlertTriangle size={18} className="shrink-0" />
            <span className="font-semibold">Alerta: Alto volume de devoluções neste mês!</span>
          </div>
        )}
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<RotateCcw size={20} />} label="Total Devolvido" value={stats.total} tint="brand" />
        <StatCard icon={<Package size={20} />} label="Em Triagem" value={stats.triagem} tint="accent" />
        <StatCard icon={<HeartHandshake size={20} />} label="Doações" value={stats.doacoes} tint="blue" />
        <StatCard icon={<CheckCircle2 size={20} />} label="Reincorporados" value={stats.reincorporados} tint="brand" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Entradas vs Saídas bar chart */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-brand-600" />
            <h3 className="text-sm font-semibold text-ink-900">Entradas vs. Saídas (6 meses)</h3>
          </div>
          <div className="flex items-end justify-between gap-3 h-44">
            {last6Months.map((m) => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="flex items-end gap-1 h-32 w-full justify-center">
                  <div
                    className="w-3.5 rounded-t bg-brand-500 transition-all duration-500"
                    style={{ height: `${(m.entradas / maxBarValue) * 100}%`, minHeight: m.entradas > 0 ? '4px' : '0' }}
                    title={`Entradas: ${m.entradas}`}
                  />
                  <div
                    className="w-3.5 rounded-t bg-blue-500 transition-all duration-500"
                    style={{ height: `${(m.saidas / maxBarValue) * 100}%`, minHeight: m.saidas > 0 ? '4px' : '0' }}
                    title={`Saídas: ${m.saidas}`}
                  />
                </div>
                <span className="text-[10px] text-ink-500 font-medium">{m.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-ink-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" /> Entradas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> Saídas
            </span>
          </div>
        </div>

        {/* Quality breakdown */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={18} className="text-brand-600" />
            <h3 className="text-sm font-semibold text-ink-900">Distribuição por Qualidade</h3>
          </div>
          {qualityBreakdown.total === 0 ? (
            <p className="text-sm text-ink-500 text-center py-8">Sem dados para exibir.</p>
          ) : (
            <>
              {/* Stacked bar */}
              <div className="flex h-6 rounded-lg overflow-hidden border border-ink-100 mb-4">
                {(Object.keys(qualityBreakdown.counts) as QualityState[]).map((q) => {
                  const pct = (qualityBreakdown.counts[q] / qualityBreakdown.total) * 100;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={q}
                      className={QUALITY_STYLES[q].dot}
                      style={{ width: `${pct}%` }}
                      title={`${QUALITY_LABELS[q]}: ${qualityBreakdown.counts[q]}`}
                    />
                  );
                })}
              </div>
              {/* Legend with counts */}
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(qualityBreakdown.counts) as QualityState[]).map((q) => {
                  const s = QUALITY_STYLES[q];
                  const count = qualityBreakdown.counts[q];
                  const pct = qualityBreakdown.total > 0 ? (count / qualityBreakdown.total) * 100 : 0;
                  return (
                    <div key={q} className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${s.dot} shrink-0`} />
                      <span className="text-sm text-ink-700">{QUALITY_LABELS[q]}</span>
                      <span className="text-xs text-ink-400 ml-auto">{count} ({pct.toFixed(0)}%)</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="card p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9 pr-9"
            placeholder="Pesquisar por SKU, Estampa DTF, Modelo ou Código…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon h-7 w-7 text-ink-400 hover:text-ink-700"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* SKU/DTF summary */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={18} className="text-brand-600" />
          <h3 className="text-sm font-semibold text-ink-900">Devoluções por Modelo SKU/DTF</h3>
        </div>
        {skuDtfSummary.length === 0 ? (
          <p className="text-sm text-ink-500 text-center py-6">Nenhuma devolução registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {skuDtfSummary.map((g, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-ink-100 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900 truncate">{g.productName}</p>
                  <p className="text-xs text-ink-500 font-mono">
                    {g.sku}{g.dtfCode ? ` · DTF: ${g.dtfCode}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-ink-900">{g.count}</p>
                  <p className="text-xs text-ink-400">
                    {g.triagem > 0 ? `${g.triagem} em triagem` : 'processado'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex items-center gap-2 text-sm text-ink-500 shrink-0">
          <Boxes size={16} /> Filtrar por estado:
        </div>
        <div className="flex flex-wrap gap-2">
          {QUALITY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterQuality(f.value)}
              className={`chip border transition-all ${
                filterQuality === f.value
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-ink-600 border-ink-200 hover:bg-ink-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Detailed movements table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-ink-100">
          <h3 className="text-sm font-semibold text-ink-900">Movimentações Detalhadas</h3>
        </div>
        {filtered.length === 0 ? (
          <div className="p-12 flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-ink-100 flex items-center justify-center mb-4">
              <RotateCcw size={26} className="text-ink-400" />
            </div>
            <p className="text-base font-semibold text-ink-900">Nenhuma devolução registrada</p>
            <p className="text-sm text-ink-500 mt-1 max-w-sm">
              {returns.length === 0
                ? 'Registre a primeira devolução para começar.'
                : 'Nenhuma devolução corresponde ao filtro selecionado.'}
            </p>
            {returns.length === 0 && (
              <button className="btn-primary mt-4" onClick={() => setFormOpen(true)}>
                <Plus size={16} /> Registrar Devolução
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="overflow-x-auto hidden lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wide">
                    <th className="text-left font-semibold px-4 py-3">Data</th>
                    <th className="text-left font-semibold px-4 py-3">ID</th>
                    <th className="text-left font-semibold px-4 py-3">SKU</th>
                    <th className="text-left font-semibold px-4 py-3">Modelo</th>
                    <th className="text-left font-semibold px-4 py-3">Tipo</th>
                    <th className="text-left font-semibold px-4 py-3">Estado</th>
                    <th className="text-left font-semibold px-4 py-3">Status</th>
                    <th className="text-right font-semibold px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {filtered.map((r) => {
                    const isSaida = r.status !== 'triagem';
                    return (
                      <tr key={r.id} className="table-row-hover">
                        <td className="px-4 py-3 text-xs text-ink-500 whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-ink-600">{r.id}</td>
                        <td className="px-4 py-3 text-xs text-ink-500">
                          {r.sku}
                          {r.dtfCode && <div className="text-[10px] text-brand-600 font-mono">DTF: {r.dtfCode}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ColorDot color={r.color} />
                            <div className="min-w-0">
                              <div className="font-medium text-ink-900 truncate max-w-[160px]">{r.productName}</div>
                              <div className="text-xs text-ink-400">{r.color} · {r.size} · Qtd: {r.quantity}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isSaida ? (
                            <span className="chip bg-blue-50 text-blue-700 border border-blue-200">
                              <ArrowUpFromLine size={12} /> Saída
                            </span>
                          ) : (
                            <span className="chip bg-brand-50 text-brand-700 border border-brand-200">
                              <ArrowDownToLine size={12} /> Entrada
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3"><QualityBadge quality={r.quality} /></td>
                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {r.status === 'triagem' && (
                              <button
                                onClick={() => handleManualBaixa(r)}
                                className="btn-icon h-8 px-2.5 bg-accent-50 text-accent-700 hover:bg-accent-100 text-xs font-medium gap-1"
                                title="Dar Baixa Manual"
                              >
                                <CheckCircle2 size={14} /> Baixa Manual
                              </button>
                            )}
                            {r.status === 'triagem' && r.quality === 'bom' && (
                              <button
                                onClick={() => handleReincorporate(r)}
                                className="btn-icon h-8 px-2.5 bg-brand-50 text-brand-700 hover:bg-brand-100 text-xs font-medium gap-1"
                                title="Dar baixa e retornar ao estoque"
                              >
                                <CheckCircle2 size={14} /> Reincorporar
                              </button>
                            )}
                            {r.status === 'triagem' && r.quality !== 'bom' && (
                              <button
                                onClick={() => handleProcess(r)}
                                className="btn-icon h-8 px-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium gap-1"
                                title="Processar e destinar item"
                              >
                                <Package size={14} /> Processar
                              </button>
                            )}
                            <button
                              onClick={() => setLabelTarget(r)}
                              className="btn-icon h-8 px-2.5 bg-accent-50 text-accent-700 hover:bg-accent-100 text-xs font-medium gap-1"
                              title="Gerar Etiqueta"
                            >
                              <Tag size={14} /> Etiqueta
                            </button>
                            <button
                              onClick={() => setQrTarget(r)}
                              className="btn-icon h-8 w-8 bg-ink-100 text-ink-700 hover:bg-ink-200"
                              title="Ver QR Code"
                            >
                              <QrCode size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(r)}
                              className="btn-icon h-8 w-8 text-ink-500 hover:bg-red-50 hover:text-red-600"
                              title="Excluir"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-ink-100">
              {filtered.map((r) => {
                const isSaida = r.status !== 'triagem';
                return (
                  <div key={r.id} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-ink-500">{r.id}</p>
                        <p className="font-semibold text-ink-900 truncate">{r.productName}</p>
                        <p className="text-xs text-ink-500">
                          {r.sku}{r.dtfCode ? ` · DTF: ${r.dtfCode}` : ''} · {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <ColorDot color={r.color} />
                      <span className="text-sm text-ink-700">{r.color} · {r.size}</span>
                      <span className="text-ink-300">·</span>
                      <span className="text-sm font-semibold text-ink-900">Qtd: {r.quantity}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      {isSaida ? (
                        <span className="chip bg-blue-50 text-blue-700 border border-blue-200">
                          <ArrowUpFromLine size={12} /> Saída
                        </span>
                      ) : (
                        <span className="chip bg-brand-50 text-brand-700 border border-brand-200">
                          <ArrowDownToLine size={12} /> Entrada
                        </span>
                      )}
                      <QualityBadge quality={r.quality} />
                    </div>
                    {r.reason && <p className="text-xs text-ink-500 mb-3">{r.reason}</p>}
                    <div className="flex items-center gap-2">
                      {r.status === 'triagem' && (
                        <button
                          onClick={() => handleManualBaixa(r)}
                          className="btn-icon flex-1 h-9 bg-accent-50 text-accent-700 hover:bg-accent-100 text-sm font-medium gap-1.5"
                        >
                          <CheckCircle2 size={15} /> Baixa Manual
                        </button>
                      )}
                      {r.status === 'triagem' && r.quality === 'bom' && (
                        <button
                          onClick={() => handleReincorporate(r)}
                          className="btn-icon flex-1 h-9 bg-brand-50 text-brand-700 hover:bg-brand-100 text-sm font-medium gap-1.5"
                        >
                          <CheckCircle2 size={15} /> Reincorporar
                        </button>
                      )}
                      {r.status === 'triagem' && r.quality !== 'bom' && (
                        <button
                          onClick={() => handleProcess(r)}
                          className="btn-icon flex-1 h-9 bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium gap-1.5"
                        >
                          <Package size={15} /> Processar
                        </button>
                      )}
                      <button
                        onClick={() => setLabelTarget(r)}
                        className="btn-icon h-9 px-2.5 bg-accent-50 text-accent-700 hover:bg-accent-100 text-sm font-medium gap-1.5"
                      >
                        <Tag size={15} /> Etiqueta
                      </button>
                      <button
                        onClick={() => setQrTarget(r)}
                        className="btn-icon h-9 w-9 bg-ink-100 text-ink-700 hover:bg-ink-200"
                      >
                        <QrCode size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(r)}
                        className="btn-icon h-9 w-9 text-ink-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <ReturnFormModal open={formOpen} onClose={() => setFormOpen(false)} />
      <ReturnQRModal open={!!qrTarget} onClose={() => setQrTarget(null)} item={qrTarget} />
      <ReturnScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} />
      <ReturnLabelModal open={!!labelTarget} onClose={() => setLabelTarget(null)} item={labelTarget} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir devolução"
        message={`Excluir o registro de devolução ${deleteTarget?.id}? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteReturn(deleteTarget.id);
            toast('Devolução excluída', 'success');
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function buildMonthlySummary(returns: ReturnItem[], key: string) {
  const inMonth = returns.filter((r) => {
    const d = new Date(r.createdAt);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === key;
  });
  const entradas = inMonth.reduce((s, r) => s + r.quantity, 0);
  const saidas = inMonth.filter((r) => r.status !== 'triagem').reduce((s, r) => s + r.quantity, 0);
  return { monthKey: key, entradas, saidas, porQualidade: {} };
}

function VolumeIndicator({ status }: { status: 'normal' | 'atencao' | 'alerta' }) {
  const config = {
    normal: { bg: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-200', dot: 'bg-brand-500', label: 'Normal' },
    atencao: { bg: 'bg-accent-50', text: 'text-accent-700', border: 'border-accent-200', dot: 'bg-accent-500', label: 'Atenção' },
    alerta: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', label: 'Alerta' },
  };
  const c = config[status];
  return (
    <div className={`flex items-center gap-2 rounded-lg border ${c.border} ${c.bg} px-3 py-2.5 ${c.text}`}>
      <span className={`h-3 w-3 rounded-full ${c.dot}`} />
      <span className="text-sm font-semibold">{c.label}</span>
    </div>
  );
}

const TINTS: Record<string, { bg: string; text: string }> = {
  brand: { bg: 'bg-brand-50', text: 'text-brand-700' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700' },
  accent: { bg: 'bg-accent-50', text: 'text-accent-700' },
  ink: { bg: 'bg-ink-100', text: 'text-ink-700' },
};

function StatCard({
  icon, label, value, tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tint: keyof typeof TINTS;
}) {
  const t = TINTS[tint];
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-ink-900 mt-1">{value}</p>
        </div>
        <div className={`btn-icon h-10 w-10 ${t.bg} ${t.text}`}>{icon}</div>
      </div>
    </div>
  );
}

function MonthlyMetric({
  icon, label, value, tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tint: keyof typeof TINTS;
}) {
  const t = TINTS[tint];
  return (
    <div className="flex items-center gap-3">
      <div className={`btn-icon h-12 w-12 shrink-0 ${t.bg} ${t.text}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-500 uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-bold text-ink-900">{value}</p>
      </div>
    </div>
  );
}
