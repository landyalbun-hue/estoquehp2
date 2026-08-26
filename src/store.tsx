import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppData, Category, Product, Variation, StockMovement } from '@/types';
import { loadData, saveData, recordMovement, uid } from '@/storage';

interface DataContextValue {
  data: AppData;
  categories: Category[];
  products: Product[];
  movements: StockMovement[];
  // products
  addProduct: (p: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  // categories
  addCategory: (name: string, color: string) => Category;
  deleteCategory: (id: string) => void;
  // variations
  addVariation: (productId: string, v: Omit<Variation, 'id'>) => Variation;
  updateVariation: (productId: string, variationId: string, patch: Partial<Variation>) => void;
  deleteVariation: (productId: string, variationId: string) => void;
  // stock
  adjustStock: (productId: string, variationId: string, delta: number, reason: string) => void;
  setStock: (productId: string, variationId: string, stock: number, reason: string) => void;
  // lookups
  getProduct: (id: string) => Product | undefined;
  getCategory: (id: string) => Category | undefined;
  findVariationByCode: (code: string) => { product: Product; variation: Variation } | null;
  variationCode: (productId: string, v: Variation) => string;
  // restore
  replaceData: (newData: AppData) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());

  useEffect(() => {
    saveData(data);
  }, [data]);

  const mutate = useCallback((fn: (d: AppData) => AppData) => {
    setData((prev) => fn(structuredClone(prev)));
  }, []);

  const replaceData = useCallback((newData: AppData) => {
    setData(newData);
  }, []);

  const addProduct = useCallback(
    (p: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product => {
      const now = Date.now();
      const product: Product = { ...p, id: uid('prod-'), createdAt: now, updatedAt: now };
      mutate((d) => {
        d.products.push(product);
        return d;
      });
      return product;
    },
    [mutate],
  );

  const updateProduct = useCallback(
    (id: string, patch: Partial<Product>) => {
      mutate((d) => {
        const p = d.products.find((x) => x.id === id);
        if (p) Object.assign(p, patch, { updatedAt: Date.now() });
        return d;
      });
    },
    [mutate],
  );

  const deleteProduct = useCallback(
    (id: string) => {
      mutate((d) => {
        d.products = d.products.filter((x) => x.id !== id);
        d.movements = d.movements.filter((m) => m.productId !== id);
        return d;
      });
    },
    [mutate],
  );

  const addCategory = useCallback(
    (name: string, color: string): Category => {
      const cat: Category = { id: uid('cat-'), name, color };
      mutate((d) => {
        d.categories.push(cat);
        return d;
      });
      return cat;
    },
    [mutate],
  );

  const deleteCategory = useCallback(
    (id: string) => {
      mutate((d) => {
        d.categories = d.categories.filter((c) => c.id !== id);
        return d;
      });
    },
    [mutate],
  );

  const addVariation = useCallback(
    (productId: string, v: Omit<Variation, 'id'>): Variation => {
      const variation: Variation = { ...v, id: uid('v-') };
      mutate((d) => {
        const p = d.products.find((x) => x.id === productId);
        if (p) {
          p.variations.push(variation);
          p.updatedAt = Date.now();
        }
        return d;
      });
      return variation;
    },
    [mutate],
  );

  const updateVariation = useCallback(
    (productId: string, variationId: string, patch: Partial<Variation>) => {
      mutate((d) => {
        const p = d.products.find((x) => x.id === productId);
        if (p) {
          const v = p.variations.find((x) => x.id === variationId);
          if (v) Object.assign(v, patch);
          p.updatedAt = Date.now();
        }
        return d;
      });
    },
    [mutate],
  );

  const deleteVariation = useCallback(
    (productId: string, variationId: string) => {
      mutate((d) => {
        const p = d.products.find((x) => x.id === productId);
        if (p) {
          p.variations = p.variations.filter((v) => v.id !== variationId);
          p.updatedAt = Date.now();
        }
        d.movements = d.movements.filter((m) => m.variationId !== variationId);
        return d;
      });
    },
    [mutate],
  );

  const adjustStock = useCallback(
    (productId: string, variationId: string, delta: number, reason: string) => {
      mutate((d) => {
        const p = d.products.find((x) => x.id === productId);
        if (!p) return d;
        const v = p.variations.find((x) => x.id === variationId);
        if (!v) return d;
        v.stock = Math.max(0, v.stock + delta);
        p.updatedAt = Date.now();
        recordMovement(d, productId, variationId, delta > 0 ? 'in' : 'out', Math.abs(delta), reason);
        return d;
      });
    },
    [mutate],
  );

  const setStock = useCallback(
    (productId: string, variationId: string, stock: number, reason: string) => {
      mutate((d) => {
        const p = d.products.find((x) => x.id === productId);
        if (!p) return d;
        const v = p.variations.find((x) => x.id === variationId);
        if (!v) return d;
        const delta = stock - v.stock;
        v.stock = Math.max(0, stock);
        p.updatedAt = Date.now();
        if (delta !== 0) {
          recordMovement(d, productId, variationId, delta > 0 ? 'in' : 'out', Math.abs(delta), reason);
        }
        return d;
      });
    },
    [mutate],
  );

  const getProduct = useCallback((id: string) => data.products.find((p) => p.id === id), [data.products]);
  const getCategory = useCallback((id: string) => data.categories.find((c) => c.id === id), [data.categories]);

  const variationCode = useCallback((productId: string, v: Variation) => {
    return `TF-${productId.slice(-5).toUpperCase()}-${v.id.slice(-5).toUpperCase()}`;
  }, []);

  const findVariationByCode = useCallback(
    (code: string) => {
      const m = code.trim().match(/^TF-([A-Za-z0-9]{5})-([A-Za-z0-9]{5})$/i);
      if (!m) return null;
      const pidSuffix = m[1].toLowerCase();
      const vidSuffix = m[2].toLowerCase();
      for (const p of data.products) {
        if (p.id.slice(-5) === pidSuffix) {
          const v = p.variations.find((x) => x.id.slice(-5) === vidSuffix);
          if (v) return { product: p, variation: v };
        }
      }
      return null;
    },
    [data.products],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      data,
      categories: data.categories,
      products: data.products,
      movements: data.movements,
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      deleteCategory,
      addVariation,
      updateVariation,
      deleteVariation,
      adjustStock,
      setStock,
      getProduct,
      getCategory,
      findVariationByCode,
      variationCode,
      replaceData,
    }),
    [
      data,
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      deleteCategory,
      addVariation,
      updateVariation,
      deleteVariation,
      adjustStock,
      setStock,
      getProduct,
      getCategory,
      findVariationByCode,
      variationCode,
      replaceData,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
