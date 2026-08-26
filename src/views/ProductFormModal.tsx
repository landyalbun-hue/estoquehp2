import { useEffect, useState } from 'react';
import { Plus, X, Tag, Palette, Ruler } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useData } from '@/store';
import { useToast } from '@/components/Toast';
import { ColorDot } from '@/components/Badges';
import { COMMON_COLORS, COMMON_SIZES, CATEGORY_PALETTE } from '@/types';
import type { Product, Variation } from '@/types';

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  editProduct?: Product | null;
}

export function ProductFormModal({ open, onClose, editProduct }: ProductFormModalProps) {
  const { categories, addCategory, addProduct, updateProduct } = useData();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [colors, setColors] = useState<string[]>(['Preto']);
  const [sizes, setSizes] = useState<string[]>(['P', 'M', 'G']);
  const [initStock, setInitStock] = useState('0');
  const [lowThreshold, setLowThreshold] = useState('5');

  // new category
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(CATEGORY_PALETTE[categories.length % CATEGORY_PALETTE.length]);

  // new color / size
  const [newColor, setNewColor] = useState('');
  const [newSize, setNewSize] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editProduct) {
      setName(editProduct.name);
      setCategoryId(editProduct.categoryId);
      setSku(editProduct.sku);
      setPrice(String(editProduct.price));
      setCost(String(editProduct.cost));
      const cs = Array.from(new Set(editProduct.variations.map((v) => v.color)));
      const ss = Array.from(new Set(editProduct.variations.map((v) => v.size)));
      setColors(cs);
      setSizes(ss);
      setInitStock('');
      setLowThreshold(String(editProduct.variations[0]?.lowStockThreshold ?? 5));
    } else {
      setName('');
      setCategoryId(categories[0]?.id ?? '');
      setSku('');
      setPrice('');
      setCost('');
      setColors(['Preto']);
      setSizes(['P', 'M', 'G']);
      setInitStock('0');
      setLowThreshold('5');
    }
    setShowNewCat(false);
    setNewCatName('');
    setNewColor('');
    setNewSize('');
  }, [open, editProduct, categories]);

  const addColor = (c: string) => {
    const t = c.trim();
    if (t && !colors.includes(t)) setColors([...colors, t]);
    setNewColor('');
  };
  const addSize = (s: string) => {
    const t = s.trim();
    if (t && !sizes.includes(t)) setSizes([...sizes, t]);
    setNewSize('');
  };

  const createCategory = () => {
    const t = newCatName.trim();
    if (!t) return;
    const c = addCategory(t, newCatColor);
    setCategoryId(c.id);
    setShowNewCat(false);
    setNewCatName('');
    toast(`Categoria "${t}" criada`, 'success');
  };

  const variationCount = colors.length * sizes.length;

  const save = () => {
    if (!name.trim()) {
      toast('Informe o nome do produto', 'error');
      return;
    }
    if (!categoryId) {
      toast('Escolha ou crie uma categoria', 'error');
      return;
    }
    if (colors.length === 0 || sizes.length === 0) {
      toast('Adicione pelo menos uma cor e um tamanho', 'error');
      return;
    }
    const priceN = parseFloat(price) || 0;
    const costN = parseFloat(cost) || 0;
    const stockN = Math.max(0, parseInt(initStock) || 0);
    const threshN = Math.max(0, parseInt(lowThreshold) || 5);

    if (editProduct) {
      // rebuild variations preserving existing stock where (color,size) match
      const existing = new Map<string, Variation>();
      editProduct.variations.forEach((v) => existing.set(`${v.color}|${v.size}`, v));
      const newVars: Variation[] = [];
      for (const c of colors) {
        for (const s of sizes) {
          const ex = existing.get(`${c}|${s}`);
          if (ex) {
            newVars.push({ ...ex, color: c, size: s, lowStockThreshold: threshN });
          } else {
            newVars.push({
              id: 'v-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
              color: c,
              size: s,
              stock: stockN,
              lowStockThreshold: threshN,
            });
          }
        }
      }
      updateProduct(editProduct.id, {
        name: name.trim(),
        categoryId,
        sku: sku.trim() || `SKU-${Date.now().toString(36).toUpperCase()}`,
        price: priceN,
        cost: costN,
        variations: newVars,
      });
      toast('Produto atualizado', 'success');
    } else {
      const variations: Variation[] = [];
      for (const c of colors) {
        for (const s of sizes) {
          variations.push({
            id: 'v-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + c.slice(0, 2) + s.slice(0, 2),
            color: c,
            size: s,
            stock: stockN,
            lowStockThreshold: threshN,
          });
        }
      }
      addProduct({
        name: name.trim(),
        categoryId,
        sku: sku.trim() || `SKU-${Date.now().toString(36).toUpperCase()}`,
        price: priceN,
        cost: costN,
        variations,
      });
      toast(`Produto criado com ${variationCount} variação${variationCount > 1 ? 'ões' : ''}`, 'success');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editProduct ? 'Editar produto' : 'Novo produto'}
      subtitle={editProduct ? editProduct.name : 'Adicione um item de roupa com suas variações'}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={save}>
            {editProduct ? 'Salvar alterações' : 'Criar produto'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Basic info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Nome do produto</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Moletom Clássico" />
          </div>
          <div>
            <label className="label">Categoria</label>
            <div className="flex gap-2">
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCat((s) => !s)}
                className="btn-secondary px-3"
                title="Nova categoria"
              >
                <Tag size={16} />
              </button>
            </div>
            {showNewCat && (
              <div className="mt-2 p-3 rounded-lg border border-ink-100 bg-ink-50 space-y-2 animate-fade-in">
                <input
                  className="input"
                  placeholder="Nome da categoria (ex.: Camisetas)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  autoFocus
                />
                <div className="flex items-center gap-2 flex-wrap">
                  {CATEGORY_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCatColor(c)}
                      className="h-7 w-7 rounded-full ring-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        boxShadow: newCatColor === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                      }}
                    />
                  ))}
                </div>
                <button type="button" className="btn-primary w-full" onClick={createCategory}>
                  Criar categoria
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="label">SKU</label>
            <input className="input" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Gerado automaticamente se vazio" />
          </div>
          <div>
            <label className="label">Preço de varejo (R$)</label>
            <input className="input" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="label">Custo unitário (R$)</label>
            <input className="input" type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        {/* Colors */}
        <div>
          <label className="label flex items-center gap-1.5">
            <Palette size={13} /> Cores
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {colors.map((c) => (
              <span key={c} className="chip bg-ink-100 text-ink-700 pr-1.5">
                <ColorDot color={c} size={14} />
                {c}
                <button
                  onClick={() => setColors(colors.filter((x) => x !== c))}
                  className="ml-0.5 text-ink-400 hover:text-red-600"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
            {colors.length === 0 && <p className="text-xs text-ink-500">Nenhuma cor adicionada ainda.</p>}
          </div>
          <div className="flex gap-2">
            <input
              className="input"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addColor(newColor)}
              placeholder="Digite uma cor e pressione Enter"
              list="color-suggestions"
            />
            <datalist id="color-suggestions">
              {COMMON_COLORS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <button type="button" className="btn-secondary" onClick={() => addColor(newColor)}>
              <Plus size={16} /> Adicionar
            </button>
          </div>
        </div>

        {/* Sizes */}
        <div>
          <label className="label flex items-center gap-1.5">
            <Ruler size={13} /> Tamanhos
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {sizes.map((s) => (
              <span key={s} className="chip bg-ink-100 text-ink-700 pr-1.5">
                {s}
                <button
                  onClick={() => setSizes(sizes.filter((x) => x !== s))}
                  className="ml-0.5 text-ink-400 hover:text-red-600"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
            {sizes.length === 0 && <p className="text-xs text-ink-500">Nenhum tamanho adicionado ainda.</p>}
          </div>
          <div className="flex gap-2">
            <input
              className="input"
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSize(newSize)}
              placeholder="Ex.: PP, P, M, G, GG, 38, 40, XL"
              list="size-suggestions"
            />
            <datalist id="size-suggestions">
              {COMMON_SIZES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <button type="button" className="btn-secondary" onClick={() => addSize(newSize)}>
              <Plus size={16} /> Adicionar
            </button>
          </div>
        </div>

        {/* Stock defaults */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{editProduct ? 'Estoque para novas variações' : 'Estoque inicial (por variação)'}</label>
            <input className="input" type="number" min={0} value={initStock} onChange={(e) => setInitStock(e.target.value)} />
          </div>
          <div>
            <label className="label">Limite de estoque baixo</label>
            <input className="input" type="number" min={0} value={lowThreshold} onChange={(e) => setLowThreshold(e.target.value)} />
          </div>
        </div>

        <div className="rounded-lg bg-brand-50 border border-brand-100 px-4 py-3 text-sm text-brand-800">
          Isso criará <span className="font-semibold">{variationCount}</span> variação{variationCount !== 1 ? 'ões' : ''} única{variationCount !== 1 ? 's' : ''} ({colors.length} cor{colors.length !== 1 ? 'es' : ''} × {sizes.length} tamanho{sizes.length !== 1 ? 's' : ''}), cada uma com sua própria contagem de estoque.
        </div>
      </div>
    </Modal>
  );
}
