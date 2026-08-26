export type ThemeId = 'verde' | 'azul' | 'roxo' | 'escuro';

export interface ThemeDef {
  id: ThemeId;
  label: string;
  swatch: string;
  isDark: boolean;
  vars: Record<string, string>;
}

const themes: Record<ThemeId, ThemeDef> = {
  verde: {
    id: 'verde',
    label: 'Verde Padrão',
    swatch: '#2a9c6a',
    isDark: false,
    vars: {
      '--brand-50': '#eef9f4',
      '--brand-100': '#d6f1e3',
      '--brand-200': '#aee3c9',
      '--brand-300': '#7ccfa8',
      '--brand-400': '#48b485',
      '--brand-500': '#2a9c6a',
      '--brand-600': '#1d7d54',
      '--brand-700': '#1a6445',
      '--brand-800': '#175038',
      '--brand-900': '#13422f',
      '--brand-950': '#0a261c',
      '--ink-50': '#f6f7f9',
      '--ink-100': '#eceef2',
      '--ink-200': '#d5dae3',
      '--ink-300': '#b0bac9',
      '--ink-400': '#8593a9',
      '--ink-500': '#677591',
      '--ink-600': '#525d77',
      '--ink-700': '#434c61',
      '--ink-800': '#3a4251',
      '--ink-900': '#343945',
      '--ink-950': '#22252e',
      '--bg-body': '#f6f7f9',
      '--bg-card': '#ffffff',
      '--text-primary': '#343945',
      '--text-muted': '#677591',
      '--border-color': '#d5dae3',
    },
  },
  azul: {
    id: 'azul',
    label: 'Azul Profissional',
    swatch: '#2563eb',
    isDark: false,
    vars: {
      '--brand-50': '#eff6ff',
      '--brand-100': '#dbeafe',
      '--brand-200': '#bfdbfe',
      '--brand-300': '#93c5fd',
      '--brand-400': '#60a5fa',
      '--brand-500': '#3b82f6',
      '--brand-600': '#2563eb',
      '--brand-700': '#1d4ed8',
      '--brand-800': '#1e40af',
      '--brand-900': '#1e3a8a',
      '--brand-950': '#172554',
      '--ink-50': '#f6f7f9',
      '--ink-100': '#eceef2',
      '--ink-200': '#d5dae3',
      '--ink-300': '#b0bac9',
      '--ink-400': '#8593a9',
      '--ink-500': '#677591',
      '--ink-600': '#525d77',
      '--ink-700': '#434c61',
      '--ink-800': '#3a4251',
      '--ink-900': '#343945',
      '--ink-950': '#22252e',
      '--bg-body': '#f6f7f9',
      '--bg-card': '#ffffff',
      '--text-primary': '#343945',
      '--text-muted': '#677591',
      '--border-color': '#d5dae3',
    },
  },
  roxo: {
    id: 'roxo',
    label: 'Roxo',
    swatch: '#7c3aed',
    isDark: false,
    vars: {
      '--brand-50': '#f5f3ff',
      '--brand-100': '#ede9fe',
      '--brand-200': '#ddd6fe',
      '--brand-300': '#c4b5fd',
      '--brand-400': '#a78bfa',
      '--brand-500': '#8b5cf6',
      '--brand-600': '#7c3aed',
      '--brand-700': '#6d28d9',
      '--brand-800': '#5b21b6',
      '--brand-900': '#4c1d95',
      '--brand-950': '#2e1065',
      '--ink-50': '#f6f7f9',
      '--ink-100': '#eceef2',
      '--ink-200': '#d5dae3',
      '--ink-300': '#b0bac9',
      '--ink-400': '#8593a9',
      '--ink-500': '#677591',
      '--ink-600': '#525d77',
      '--ink-700': '#434c61',
      '--ink-800': '#3a4251',
      '--ink-900': '#343945',
      '--ink-950': '#22252e',
      '--bg-body': '#f6f7f9',
      '--bg-card': '#ffffff',
      '--text-primary': '#343945',
      '--text-muted': '#677591',
      '--border-color': '#d5dae3',
    },
  },
  escuro: {
    id: 'escuro',
    label: 'Escuro / Dark Mode',
    swatch: '#1e293b',
    isDark: true,
    vars: {
      '--brand-50': '#1a2e1f',
      '--brand-100': '#1d3a26',
      '--brand-200': '#224d33',
      '--brand-300': '#2a9c6a',
      '--brand-400': '#34b07a',
      '--brand-500': '#48b485',
      '--brand-600': '#5cc99a',
      '--brand-700': '#7ccfa8',
      '--brand-800': '#aee3c9',
      '--brand-900': '#d6f1e3',
      '--brand-950': '#eef9f4',
      '--ink-50': '#1a1d24',
      '--ink-100': '#22252e',
      '--ink-200': '#2a2e38',
      '--ink-300': '#3a4251',
      '--ink-400': '#525d77',
      '--ink-500': '#677591',
      '--ink-600': '#8593a9',
      '--ink-700': '#b0bac9',
      '--ink-800': '#d5dae3',
      '--ink-900': '#eceef2',
      '--ink-950': '#f6f7f9',
      '--bg-body': '#16181d',
      '--bg-card': '#22252e',
      '--text-primary': '#eceef2',
      '--text-muted': '#8593a9',
      '--border-color': '#3a4251',
    },
  },
};

export function getTheme(id: ThemeId): ThemeDef {
  return themes[id];
}

export function getAllThemes(): ThemeDef[] {
  return Object.values(themes);
}

export function applyTheme(id: ThemeId): void {
  const theme = themes[id];
  if (!theme) return;
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });
  root.setAttribute('data-theme', id);
  if (theme.isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

const THEME_STORAGE_KEY = 'app_tema';

export function loadTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw && raw in themes) return raw as ThemeId;
  } catch {
    // ignore
  }
  return 'verde';
}

export function saveTheme(id: ThemeId): void {
  localStorage.setItem(THEME_STORAGE_KEY, id);
}
