export interface Variation {
  id: string;
  color: string;
  size: string;
  stock: number;
  lowStockThreshold: number;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  sku: string;
  price: number;
  cost: number;
  variations: Variation[];
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface StockMovement {
  id: string;
  variationId: string;
  productId: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  timestamp: number;
}

export interface AppData {
  products: Product[];
  categories: Category[];
  movements: StockMovement[];
  settings: {
    lowStockDefault: number;
  };
}

export type QualityState = 'bom' | 'reconstituido' | 'ruim' | 'doacao';

export type ReturnStatus = 'triagem' | 'reincorporado' | 'destinado';

export interface ReturnItem {
  id: string;
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
  status: ReturnStatus;
  createdAt: number;
  processedAt?: number;
}

export const QUALITY_LABELS: Record<QualityState, string> = {
  bom: 'Bom',
  reconstituido: 'Reconstituído',
  ruim: 'Ruim',
  doacao: 'Doação',
};

export const QUALITY_DESCRIPTIONS: Record<QualityState, string> = {
  bom: 'Item intacto',
  reconstituido: 'Pequenos reparos',
  ruim: 'Avariado / Defeituoso',
  doacao: 'Sem condições de venda',
};

export const QUALITY_STYLES: Record<QualityState, { bg: string; text: string; border: string; dot: string }> = {
  bom: { bg: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-200', dot: 'bg-brand-500' },
  reconstituido: { bg: 'bg-accent-50', text: 'text-accent-700', border: 'border-accent-200', dot: 'bg-accent-500' },
  ruim: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  doacao: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
};

export const STATUS_LABELS: Record<ReturnStatus, string> = {
  triagem: 'Em Triagem',
  reincorporado: 'Reincorporado ao Estoque',
  destinado: 'Processado e Destinado',
};

export const CATEGORY_PALETTE = [
  '#2a9c6a',
  '#f98a06',
  '#3b82f6',
  '#db2777',
  '#8b5cf6',
  '#0891b2',
  '#e11d48',
  '#65a30d',
  '#ea580c',
  '#0d9488',
];

export const COMMON_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XGG'];
export const COMMON_COLORS = [
  'Preto',
  'Branco',
  'Marinho',
  'Cinza',
  'Oliva',
  'Chumbo',
  'Creme',
  'Bordô',
  'Verde',
  'Jeans',
];

export const COLOR_SWATCHES: Record<string, string> = {
  Preto: '#1a1a1a',
  Branco: '#f8f8f8',
  Marinho: '#1e3a5f',
  Cinza: '#8a8a8a',
  Oliva: '#6b6b3a',
  Chumbo: '#36454f',
  Creme: '#f5ebd6',
  Bordô: '#5d1a26',
  Verde: '#2d4a2b',
  Jeans: '#4a7ba6',
  Vermelho: '#dc3c3e',
  Azul: '#3b82f6',
  VerdeClaro: '#2a9c6a',
  Amarelo: '#f2c200',
  Rosa: '#ec4899',
  Marrom: '#7a4f2a',
  Bege: '#d9c5a0',
  Roxo: '#8b5cf6',
  Laranja: '#f98a06',
  Black: '#1a1a1a',
  White: '#f8f8f8',
  Navy: '#1e3a5f',
  Gray: '#8a8a8a',
  Olive: '#6b6b3a',
  Charcoal: '#36454f',
  Cream: '#f5ebd6',
  Burgundy: '#5d1a26',
  Forest: '#2d4a2b',
  Denim: '#4a7ba6',
  Red: '#dc3c3e',
  Blue: '#3b82f6',
  Green: '#2a9c6a',
  Yellow: '#f2c200',
  Pink: '#ec4899',
  Brown: '#7a4f2a',
  Beige: '#d9c5a0',
  Purple: '#8b5cf6',
  Orange: '#f98a06',
};

export function colorToHex(name: string): string {
  return COLOR_SWATCHES[name] || '#9ca3af';
}
