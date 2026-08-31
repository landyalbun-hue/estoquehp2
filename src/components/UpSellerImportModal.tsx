import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X, ShoppingBag, Link, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useData } from '../store';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ComponentToDeduct {
  productId: string;
  variationId: string | null;
  productName: string;
  color: string;
  size: string;
  quantityToDeduct: number;
}

interface ParsedSaleItem {
  id: string;
  platform: string;
  announcementName: string;
  sku: string;
  variationStr: string;
  quantity: number;
  components: ComponentToDeduct[];
  status: 'matched' | 'not_found';
}

const loadXLSX = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).XLSX) return resolve((window as any).XLSX);
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
    script.onload = () => resolve((window as any).XLSX);
    script.onerror = () => reject(new Error('Erro ao carregar leitor de Excel.'));
    document.head.appendChild(script);
  });
};

function extractSize(text: string): string {
  const upper = text.toUpperCase();
  const match = upper.match(/\b(XGG|EXG|GG|PP|P|M|G|\d{2})\b/);
  return match ? match[1] : 'M';
}

function extractColor(text: string): string {
  const upper = text.toUpperCase();
  if (upper.includes('PRETO') || upper.includes('PRETA')) return 'Preto';
  if (upper.includes('BRANCO') || upper.includes('BRANCA')) return 'Branco';
  if (upper.includes('CINZA')) return 'Cinza';
  if (upper.includes('AZUL')) return 'Azul';
  if (upper.includes('ROSA')) return 'Rosa';
  if (upper.includes('VERMELHO') || upper.includes('VERMELHA')) return 'Vermelho';
  if (upper.includes('VERDE')) return 'Verde';
  if (upper.includes('MARROM')) return 'Marrom';
  return 'Preto';
}

export function UpSellerImportModal({ open, onClose, onSuccess }: Props) {
  const data = useData() as any;
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [items, setItems] = useState<ParsedSaleItem[]>([]);
  const [dbProductsList, setDbProductsList] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [successCount, setSuccessCount] = useState(0);

  const [mappingItem, setMappingItem] = useState<ParsedSaleItem | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVarId, setSelectedVarId] = useState('');

  if (!open) return null;

  const resetState = () => {
    setFile(null);
    setReading(false);
    setProcessing(false);
    setItems([]);
    setError(null);
    setStep('upload');
    setSuccessCount(0);
    setMappingItem(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setReading(true);
    setError(null);

    try {
      const XLSX = await loadXLSX();
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rawData || rawData.length === 0) throw new Error('A planilha selecionada está vazia.');

      const { data: dbProds, error: dbErr } = await supabase
        .from('products')
        .select('*, product_variations(*)');

      if (dbErr) throw dbErr;
      const productsList = dbProds || [];
      setDbProductsList(productsList);

      const parsedList: ParsedSaleItem[] = rawData.map((row, index) => {
        const platform = String(row['Plataformas'] || row['Plataforma'] || 'Geral').trim();
        const announcementName = String(row['Nome do Anúncio'] || row['Nome do Anuncio'] || row['Produto'] || '').trim();
        const sku = String(row['SKU'] || row['sku'] || '').trim();
        const variationStr = String(row['Variação'] || row['Variacao'] || '').trim();
        const qtyRaw = row['Qtd. do Produto'] || row['Qtd do Produto'] || row['Qtd'] || '1';
        const saleQty = parseInt(String(qtyRaw).replace(/[^0-9]/g, ''), 10) || 1;

        const sizeExtracted = extractSize(`${variationStr} ${announcementName}`);
        const colorExtracted = extractColor(`${variationStr} ${announcementName}`);

        const componentsToDeduct: ComponentToDeduct[] = [];
        const titleUpper = announcementName.toUpperCase();

        const isConjuntoMoletom = titleUpper.includes('CONJUNTO') && titleUpper.includes('MOLETOM');
        const isKitMoletomBermuda = titleUpper.includes('KIT MOLETOM') && (titleUpper.includes('BERMUDA') || titleUpper.includes('SHORT'));
        const isKit3Shorts = titleUpper.includes('KIT 3') && (titleUpper.includes('SHORT') || titleUpper.includes('BERMUDA'));

        const findRawStockItem = (productCategoryOrName: string) => {
          for (const p of productsList) {
            const pName = (p.name || '').toUpperCase();
            const pCat = (p.category || '').toUpperCase();
            const target = productCategoryOrName.toUpperCase();

            if (pName.includes(target) || pCat.includes(target)) {
              const vars = p.product_variations || p.variations || [];
              const matchedVar = vars.find(
                (v: any) =>
                  (v.size || '').toUpperCase() === sizeExtracted.toUpperCase() &&
                  (v.color || '').toUpperCase().includes(colorExtracted.toUpperCase())
              ) || vars[0];

              if (matchedVar) {
                return {
                  productId: p.id,
                  variationId: matchedVar.id,
                  productName: p.name,
                  color: matchedVar.color || colorExtracted,
                  size: matchedVar.size || sizeExtracted,
                };
              }
            }
          }
          return null;
        };

        if (isConjuntoMoletom) {
          const blusa = findRawStockItem('MOLETOM') || findRawStockItem('BLUSA');
          if (blusa) componentsToDeduct.push({ ...blusa, quantityToDeduct: saleQty });

          const calca = findRawStockItem('CALÇA') || findRawStockItem('CALCA');
          if (calca) componentsToDeduct.push({ ...calca, quantityToDeduct: saleQty });
        } else if (isKitMoletomBermuda) {
          const blusa = findRawStockItem('MOLETOM') || findRawStockItem('BLUSA');
          if (blusa) componentsToDeduct.push({ ...blusa, quantityToDeduct: saleQty });

          const bermuda = findRawStockItem('BERMUDA') || findRawStockItem('SHORT');
          if (bermuda) componentsToDeduct.push({ ...bermuda, quantityToDeduct: saleQty });
        } else if (isKit3Shorts) {
          const short = findRawStockItem('SHORT') || findRawStockItem('BERMUDA') || findRawStockItem('TACTEL');
          if (short) componentsToDeduct.push({ ...short, quantityToDeduct: saleQty * 3 });
        } else {
          let singleMatch: any = null;

          for (const p of productsList) {
            if ((p.sku || '').toLowerCase() === sku.toLowerCase()) {
              const vars = p.product_variations || p.variations || [];
              const v = vars.find((item: any) => (item.size || '').toUpperCase() === sizeExtracted.toUpperCase()) || vars[0];
              singleMatch = {
                productId: p.id,
                variationId: v ? v.id : null,
                productName: p.name,
                color: v ? v.color : colorExtracted,
                size: v ? v.size : sizeExtracted,
              };
              break;
            }
          }

          if (!singleMatch) {
            const generic = findRawStockItem('CAMISET') || findRawStockItem('MOLETOM') || findRawStockItem('BERMUDA') || findRawStockItem('SHORT');
            if (generic) singleMatch = generic;
          }

          if (singleMatch) {
            componentsToDeduct.push({ ...singleMatch, quantityToDeduct: saleQty });
          }
        }

        return {
          id: `item-${index}`,
          platform,
          announcementName,
          sku,
          variationStr,
          quantity: saleQty,
          components: componentsToDeduct,
          status: componentsToDeduct.length > 0 ? 'matched' : 'not_found',
        };
      });

      setItems(parsedList);
      setStep('preview');
    } catch (err: any) {
      console.error('Erro ao ler planilha:', err);
      setError(err.message || 'Falha ao processar arquivo.');
    } finally {
      setReading(false);
    }
  };

  const handleSaveManualLink = () => {
    if (!mappingItem || !selectedProductId) return;

    const selectedProd = dbProductsList.find((p) => p.id === selectedProductId);
    if (!selectedProd) return;

    const vars = selectedProd.product_variations || selectedProd.variations || [];
    const selectedVar = vars.find((v: any) => v.id === selectedVarId) || vars[0];

    const newComponent: ComponentToDeduct = {
      productId: selectedProd.id,
      variationId: selectedVar ? selectedVar.id : null,
      productName: selectedProd.name,
      color: selectedVar ? selectedVar.color : 'Padrão',
      size: selectedVar ? selectedVar.size : 'M',
      quantityToDeduct: mappingItem.quantity,
    };

    setItems((prev) =>
      prev.map((item) =>
        item.id === mappingItem.id
          ? {
              ...item,
              components: [newComponent],
              status: 'matched',
            }
          : item
      )
    );

    setMappingItem(null);
    setSelectedProductId('');
    setSelectedVarId('');
  };

  const handleConfirmDeduction = async () => {
    setProcessing(true);
    setError(null);

    try {
      const validSales = items.filter((i) => i.status === 'matched' && i.components.length > 0);
      let totalDeductions = 0;

      for (const sale of validSales) {
        for (const comp of sale.components) {
          if (comp.variationId) {
            const { data: varData } = await supabase
              .from('product_variations')
              .select('quantity, stock')
              .eq('id', comp.variationId)
              .single();

            const currentQty = varData?.quantity ?? varData?.stock ?? 0;
            const newQty = Math.max(0, currentQty - comp.quantityToDeduct);

            await supabase
              .from('product_variations')
              .update({ quantity: newQty, stock: newQty })
              .eq('id', comp.variationId);
          } else if (comp.productId) {
            const { data: prodData } = await supabase
              .from('products')
              .select('quantity, stock')
              .eq('id', comp.productId)
              .single();

            const currentQty = prodData?.quantity ?? prodData?.stock ?? 0;
            const newQty = Math.max(0, currentQty - comp.quantityToDeduct);

            await supabase
              .from('products')
              .update({ quantity: newQty, stock: newQty })
              .eq('id', comp.productId);
          }

          try {
            await supabase.from('stock_movements').insert([
              {
                product_id: comp.productId,
                type: 'saida',
                quantity: comp.quantityToDeduct,
                description: `Venda UpSeller [${sale.platform}] - ${comp.productName} (${comp.color}/${comp.size}) - Ref Anúncio: ${sale.announcementName}`,
                created_at: new Date().toISOString(),
              },
            ]);
          } catch (mErr) {
            console.warn('Aviso sobre histórico:', mErr);
          }

          totalDeductions++;
        }
      }

      setSuccessCount(totalDeductions);
      setStep('success');

      if (data?.refresh) await data.refresh();
      if (data?.fetchData) await data.fetchData();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Erro ao dar baixa em lote:', err);
      setError(err.message || 'Erro ao atualizar o estoque no Supabase.');
    } finally {
      setProcessing(false);
    }
  };

  const matchedCount = items.filter((i) => i.status === 'matched').length;
  const missingCount = items.filter((i) => i.status === 'not_found').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Importar Vendas UpSeller</h2>
              <p className="text-xs text-slate-500">Desmembramento automático de Kits e baixa no Estoque Virgem</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
              <FileSpreadsheet className="mb-3 h-12 w-12 text-amber-500" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Selecione a planilha de vendas do UpSeller
              </p>
              <p className="mt-1 text-xs text-slate-400">Suporta arquivos .xlsx ou .csv</p>

              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600">
                <Upload className="h-4 w-4" />
                {reading ? 'Analisando e Desmembrando...' : 'Selecionar Planilha'}
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} disabled={reading} className="hidden" />
              </label>
            </div>
            {error && <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40">{error}</div>}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Linhas na Planilha</span>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{items.length} vendas</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Reconhecidos</span>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{matchedCount} vendas</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30">
                <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Não Mapeados</span>
                <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{missingCount} vendas</p>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="sticky top-0 bg-slate-100 uppercase text-[10px] text-slate-400 dark:bg-slate-800">
                  <tr>
                    <th className="p-2.5">Plataforma / Anúncio</th>
                    <th className="p-2.5">Peças a Baixar do Estoque Virgem</th>
                    <th className="p-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 max-w-xs">
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {item.platform}
                        </span>
                        <div className="font-bold text-slate-900 dark:text-white truncate mt-1">{item.announcementName}</div>
                        <div className="text-[10px] text-slate-400">Var: {item.variationStr || '-'} | Qtd Vendida: {item.quantity}</div>
                      </td>
                      <td className="p-2.5">
                        {item.status === 'matched' ? (
                          <div className="space-y-1">
                            {item.components.map((comp, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                                <Layers className="h-3 w-3" />
                                {comp.quantityToDeduct}x {comp.productName} ({comp.color} / {comp.size})
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <AlertTriangle className="h-3 w-3" /> Não Mapeado
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-right">
                        {item.status === 'not_found' && (
                          <button
                            onClick={() => {
                              setMappingItem(item);
                              setSelectedProductId('');
                              setSelectedVarId('');
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-600"
                          >
                            <Link className="h-3 w-3" /> Vincular Peça
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={resetState}
                className="w-full rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Trocar Planilha
              </button>
              <button
                type="button"
                onClick={handleConfirmDeduction}
                disabled={processing || matchedCount === 0}
                className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {processing ? 'Dando Baixa...' : `Confirmar Baixa de ${matchedCount} Vendas`}
              </button>
            </div>
          </div>
        )}

        {mappingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2">
                Vincular Peça ao Anúncio
              </h3>
              <p className="text-xs text-slate-500 mb-4">{mappingItem.announcementName}</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Selecione o Produto Virgem</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      setSelectedVarId('');
                    }}
                    className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Selecione...</option>
                    {dbProductsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProductId && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Selecione o Tamanho/Cor</label>
                    <select
                      value={selectedVarId}
                      onChange={(e) => setSelectedVarId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Padrão / Todos</option>
                      {(
                        dbProductsList.find((p) => p.id === selectedProductId)?.product_variations || []
                      ).map((v: any) => (
                        <option key={v.id} value={v.id}>
                          {v.color || 'Padrão'} - Tam: {v.size} (Estoque: {v.quantity ?? v.stock ?? 0})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMappingItem(null)}
                  className="w-full rounded-xl border border-slate-300 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveManualLink}
                  disabled={!selectedProductId}
                  className="w-full rounded-xl bg-amber-500 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  Vincular e Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Baixa Concluída com Sucesso!</h3>
            <p className="text-sm text-slate-500">
              Foram baixadas <strong>{successCount} peças virgens</strong> do estoque.
            </p>
            <button onClick={handleClose} className="mt-4 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
              Concluir
            </button>
          </div>
        )}

      </div>
    </div>
  );
}