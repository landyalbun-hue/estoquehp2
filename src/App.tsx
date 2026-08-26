import { useEffect, useState } from 'react';
import { LayoutDashboard, Boxes, Package, QrCode, Search, X, Shirt, RotateCcw, ScanLine, Settings, Menu } from 'lucide-react';
import { DataProvider } from '@/store';
import { ToastProvider } from '@/components/Toast';
import { Dashboard } from '@/views/Dashboard';
import { ProductsView } from '@/views/ProductsView';
import { InventoryView } from '@/views/InventoryView';
import { ReturnsView } from '@/views/ReturnsView';
import { SettingsView } from '@/views/SettingsView';
import { QRScannerModal } from '@/components/QRScannerModal';
import { StockAdjustModal } from '@/components/StockAdjustModal';
import { ReturnScanConfirmModal } from '@/components/ReturnScanConfirmModal';
import { ReturnScannerModal } from '@/components/ReturnScannerModal';
import { loadTheme, applyTheme } from '@/theme';
import type { Product, Variation, ReturnItem } from '@/types';

type View = 'dashboard' | 'products' | 'inventory' | 'returns' | 'settings';

const NAV: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'products', label: 'Produtos', icon: Package },
  { id: 'inventory', label: 'Estoque', icon: Boxes },
  { id: 'returns', label: 'Devoluções', icon: RotateCcw },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

function AppInner() {
  const [view, setView] = useState<View>('dashboard');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [returnScannerOpen, setReturnScannerOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState<{ product: Product; variation: Variation } | null>(null);
  const [returnScanTarget, setReturnScanTarget] = useState<ReturnItem | null>(null);

  useEffect(() => {
    applyTheme(loadTheme());
  }, []);

  const handleScanFound = (product: Product, variation: Variation) => {
    setScanTarget({ product, variation });
    setScannerOpen(false);
  };

  const handleReturnScanFound = (item: ReturnItem) => {
    setReturnScanTarget(item);
    setScannerOpen(false);
  };

  const navigate = (v: View) => {
    setView(v);
    setDrawerOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-ink-50">
      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 flex flex-col bg-white border-r border-ink-200 shadow-pop transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5 flex items-center justify-between border-b border-ink-100">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <Shirt size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-ink-900 leading-tight">ThreadFlow</p>
              <p className="text-xs text-ink-500">Controle de Estoque</p>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="btn-icon h-9 w-9 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = view === n.id;
            return (
              <button
                key={n.id}
                onClick={() => navigate(n.id)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-100'
                    : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                }`}
              >
                <Icon size={18} />
                {n.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-ink-100 space-y-1">
          <button
            onClick={() => {
              setReturnScannerOpen(true);
              setDrawerOpen(false);
            }}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-100 hover:text-ink-900 transition-all"
          >
            <ScanLine size={18} />
            Escanear Devolução
          </button>
          <button
            onClick={() => {
              setScannerOpen(true);
              setDrawerOpen(false);
            }}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-100 hover:text-ink-900 transition-all"
          >
            <QrCode size={18} />
            Escanear QR
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-ink-200">
          <div className="px-4 sm:px-6 py-3 flex items-center gap-3">
            {/* Hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="btn-icon h-10 w-10 text-ink-700 hover:bg-ink-100 shrink-0"
              title="Abrir menu"
            >
              <Menu size={22} />
            </button>

            {/* Search */}
            <div className="relative flex-1 max-w-xl">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                className="input pl-9 pr-9"
                placeholder="Buscar produtos, categorias, cores, tamanhos…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon h-7 w-7 text-ink-400 hover:text-ink-700"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <button
              onClick={() => setReturnScannerOpen(true)}
              className="btn-secondary hidden sm:inline-flex"
            >
              <ScanLine size={16} /> <span className="hidden md:inline">Escanear Devolução</span>
            </button>
            <button
              onClick={() => setScannerOpen(true)}
              className="btn-primary hidden sm:inline-flex"
            >
              <QrCode size={16} /> <span className="hidden md:inline">Escanear</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {view === 'dashboard' && <Dashboard onNavigate={(v) => setView(v as View)} onScan={() => setScannerOpen(true)} search={search} />}
          {view === 'products' && (
            <ProductsView
              search={search}
              filterCategory={filterCategory}
              filterLowStock={filterLowStock}
              onSearch={setSearch}
              onFilterCategory={setFilterCategory}
              onFilterLowStock={setFilterLowStock}
            />
          )}
          {view === 'inventory' && (
            <InventoryView
              search={search}
              filterCategory={filterCategory}
              filterLowStock={filterLowStock}
              onSearch={setSearch}
              onFilterCategory={setFilterCategory}
              onFilterLowStock={setFilterLowStock}
            />
          )}
          {view === 'returns' && <ReturnsView />}
          {view === 'settings' && <SettingsView />}
        </main>
      </div>

      <QRScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onFound={handleScanFound}
        onReturnFound={handleReturnScanFound}
      />
      <StockAdjustModal
        open={!!scanTarget}
        onClose={() => setScanTarget(null)}
        product={scanTarget?.product ?? null}
        variation={scanTarget?.variation ?? null
        }
      />
      <ReturnScanConfirmModal
        open={!!returnScanTarget}
        onClose={() => setReturnScanTarget(null)}
        item={returnScanTarget}
      />
      <ReturnScannerModal
        open={returnScannerOpen}
        onClose={() => setReturnScannerOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <DataProvider>
        <AppInner />
      </DataProvider>
    </ToastProvider>
  );
}
