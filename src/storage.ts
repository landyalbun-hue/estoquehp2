import type { AppData, Product, Category, Variation, StockMovement } from './types';

const STORAGE_KEY = 'threadflow-inventory-v1';

export function uid(prefix = ''): string {
  return (
    prefix +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

export function variationCode(productId: string, variation: Variation): string {
  return `TF-${productId.slice(-5).toUpperCase()}-${variation.id.slice(-5).toUpperCase()}`;
}

export function parseVariationCode(code: string): { productId: string; variationId: string } | null {
  const m = code.trim().match(/^TF-([A-Z0-9]{5})-([A-Z0-9]{5})$/i);
  if (!m) return null;
  return { productId: m[1], variationId: m[2] };
}

const defaultData: AppData = {
  products: [],
  categories: [
    { id: 'cat-hoodies', name: 'Moletom', color: '#2a9c6a' },
    { id: 'cat-shirts', name: 'Camisas', color: '#3b82f6' },
    { id: 'cat-pants', name: 'Calças', color: '#f98a06' },
    { id: 'cat-jackets', name: 'Jaquetas', color: '#8b5cf6' },
  ],
  movements: [],
  settings: { lowStockDefault: 5 },
};

function seedData(): AppData {
  const data: AppData = JSON.parse(JSON.stringify(defaultData));
  const now = Date.now();

  const mkVar = (color: string, size: string, stock: number, threshold = 5): Variation => ({
    id: uid('v-'),
    color,
    size,
    stock,
    lowStockThreshold: threshold,
  });

  const hoodie: Product = {
    id: 'prod-hoodie01',
    name: 'Moletom Clássico',
    categoryId: 'cat-hoodies',
    sku: 'HD-CL-001',
    price: 79.9,
    cost: 32.0,
    createdAt: now,
    updatedAt: now,
    variations: [
      mkVar('Black', 'P', 12),
      mkVar('Black', 'M', 8),
      mkVar('Black', 'G', 3),
      mkVar('Charcoal', 'M', 6),
      mkVar('Cream', 'G', 2),
    ],
  };

  const shirt: Product = {
    id: 'prod-shirt01',
    name: 'Camisa Oxford',
    categoryId: 'cat-shirts',
    sku: 'SH-OX-002',
    price: 54.0,
    cost: 19.5,
    createdAt: now,
    updatedAt: now,
    variations: [
      mkVar('White', 'P', 20),
      mkVar('White', 'M', 15),
      mkVar('Navy', 'M', 4),
      mkVar('Navy', 'G', 7),
      mkVar('Blue', 'GG', 1),
    ],
  };

  const pants: Product = {
    id: 'prod-pants01',
    name: 'Calça Slim Tailored',
    categoryId: 'cat-pants',
    sku: 'PT-SL-003',
    price: 89.0,
    cost: 34.0,
    createdAt: now,
    updatedAt: now,
    variations: [
      mkVar('Charcoal', '40', 9),
      mkVar('Charcoal', '42', 5),
      mkVar('Navy', '38', 0),
      mkVar('Black', '38', 6),
      mkVar('Black', '40', 3),
    ],
  };

  const jacket: Product = {
    id: 'prod-jacket01',
    name: 'Jaqueta Bomber Field',
    categoryId: 'cat-jackets',
    sku: 'JK-BM-004',
    price: 149.0,
    cost: 58.0,
    createdAt: now,
    updatedAt: now,
    variations: [
      mkVar('Olive', 'M', 4),
      mkVar('Olive', 'G', 2),
      mkVar('Black', 'M', 6),
      mkVar('Burgundy', 'G', 0),
    ],
  };

  data.products = [hoodie, shirt, pants, jacket];
  return data;
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedData();
      saveData(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed.categories) parsed.categories = defaultData.categories;
    if (!parsed.movements) parsed.movements = [];
    if (!parsed.settings) parsed.settings = { lowStockDefault: 5 };
    return parsed;
  } catch {
    return seedData();
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export interface BackupPayload {
  version: number;
  exportedAt: number;
  appData: AppData;
  returns: unknown[];
  returnsHistory: Record<string, unknown>;
}

export function buildBackup(returns: unknown[], returnsHistory: Record<string, unknown>): BackupPayload {
  const data = loadData();
  return {
    version: 1,
    exportedAt: Date.now(),
    appData: data,
    returns,
    returnsHistory,
  };
}

export function restoreBackup(payload: BackupPayload): void {
  if (!payload || typeof payload !== 'object') throw new Error('Arquivo inválido');
  if (!payload.appData) throw new Error('Backup não contém dados do aplicativo');
  saveData(payload.appData);
}

export function recordMovement(
  data: AppData,
  productId: string,
  variationId: string,
  type: 'in' | 'out',
  quantity: number,
  reason: string,
): StockMovement {
  const m: StockMovement = {
    id: uid('m-'),
    variationId,
    productId,
    type,
    quantity,
    reason,
    timestamp: Date.now(),
  };
  data.movements.unshift(m);
  if (data.movements.length > 500) data.movements = data.movements.slice(0, 500);
  return m;
}
