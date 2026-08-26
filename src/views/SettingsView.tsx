import { useRef, useState } from 'react';
import { Palette, Download, Upload, Check, AlertCircle, Settings, Moon, Sun } from 'lucide-react';
import { useData } from '@/store';
import { useReturns } from '@/useReturns';
import { useToast } from '@/components/Toast';
import { getAllThemes, applyTheme, saveTheme, loadTheme, type ThemeId } from '@/theme';
import { buildBackup, restoreBackup, type BackupPayload } from '@/storage';
import { loadReturns, loadHistory, restoreReturns, restoreHistory, type MonthlySummary } from '@/returnsStorage';
import type { ReturnItem } from '@/types';

export function SettingsView() {
  const { replaceData } = useData();
  const { returns } = useReturns();
  const { toast } = useToast();
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(() => loadTheme());
  const [restoring, setRestoring] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const themes = getAllThemes();

  const handleThemeChange = (id: ThemeId) => {
    setSelectedTheme(id);
    applyTheme(id);
    saveTheme(id);
    toast('Tema aplicado com sucesso', 'success');
  };

  const handleExport = () => {
    const returnsData = loadReturns();
    const historyData = loadHistory();
    const backup = buildBackup(returnsData, historyData);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threadflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup exportado com sucesso', 'success');
  };

  const handleImportClick = () => {
    fileRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoring(true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result as string) as BackupPayload;
        if (!payload.appData) throw new Error('Arquivo de backup inválido');
        restoreBackup(payload);
        replaceData(payload.appData);
        if (payload.returns && Array.isArray(payload.returns)) {
          restoreReturns(payload.returns as ReturnItem[]);
        }
        if (payload.returnsHistory && typeof payload.returnsHistory === 'object') {
          restoreHistory(payload.returnsHistory as Record<string, MonthlySummary>);
        }
        toast('Dados restaurados com sucesso! Recarregue a página para ver tudo atualizado.', 'success');
      } catch {
        toast('Erro ao restaurar: arquivo de backup inválido', 'error');
      }
      setRestoring(false);
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.onerror = () => {
      toast('Erro ao ler o arquivo', 'error');
      setRestoring(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-ink-900 flex items-center gap-2">
          <Settings size={22} /> Configurações
        </h2>
        <p className="text-sm text-ink-500 mt-0.5">Personalize o tema e gerencie seus dados</p>
      </div>

      {/* Theme picker */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Palette size={18} className="text-brand-600" />
          <h3 className="text-sm font-semibold text-ink-900">Personalização de Tema</h3>
        </div>
        <p className="text-xs text-ink-500 mb-4">
          Escolha a paleta de cores da interface. A mudança é aplicada imediatamente em todo o aplicativo.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {themes.map((t) => {
            const active = selectedTheme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                  active
                    ? 'border-brand-500 ring-2 ring-brand-500/20'
                    : 'border-ink-200 hover:border-ink-300'
                }`}
              >
                {active && (
                  <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-brand-600 flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </span>
                )}
                <div
                  className="h-12 w-12 rounded-full border-2 border-white shadow-soft"
                  style={{ backgroundColor: t.swatch }}
                />
                <div className="flex items-center gap-1.5">
                  {t.isDark ? <Moon size={14} className="text-ink-500" /> : <Sun size={14} className="text-ink-500" />}
                  <span className="text-sm font-medium text-ink-800">{t.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Download size={18} className="text-brand-600" />
          <h3 className="text-sm font-semibold text-ink-900">Backup e Restauração de Dados</h3>
        </div>
        <p className="text-xs text-ink-500 mb-4">
          Exporte todos os dados do sistema (produtos, variações, estoque e devoluções) em um arquivo JSON,
          ou restaure a partir de um backup salvo anteriormente.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button className="btn-primary" onClick={handleExport}>
            <Download size={16} /> Fazer Backup (Exportar JSON)
          </button>
          <button className="btn-secondary" onClick={handleImportClick} disabled={restoring}>
            <Upload size={16} /> {restoring ? 'Restaurando…' : 'Restaurar Dados (Importar JSON)'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-accent-50 border border-accent-200 px-3 py-2.5 text-xs text-accent-800">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>
            Atenção: restaurar dados substitui completamente as informações atuais. Faça um backup antes de restaurar, se necessário.
          </span>
        </div>
      </div>

      {/* About */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-ink-900 mb-2">Sobre o Sistema</h3>
        <p className="text-xs text-ink-500">
          ThreadFlow — Controle de Estoque e Devoluções. Versão 1.0. Dados armazenados localmente no seu dispositivo.
          {returns.length > 0 && ` · ${returns.length} devoluções registradas.`}
        </p>
      </div>
    </div>
  );
}
