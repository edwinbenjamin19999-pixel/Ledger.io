/**
 * Module color map — consistent theming across all modules.
 * Each module has a solid bg, light bg, text color, border, and hex accent.
 */
export const MODULE_COLORS = {
  bokforing:   { solid: 'bg-slate-800',   light: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-300',   accent: '#1e293b', darkBg: 'dark:bg-slate-900/30' },
  fakturering: { solid: 'bg-[#3b82f6]',    light: 'bg-blue-50',    text: 'text-[#3b82f6]',    border: 'border-blue-200',    accent: '#3b82f6', darkBg: 'dark:bg-blue-900/30' },
  lon:         { solid: 'bg-emerald-600',  light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', accent: '#059669', darkBg: 'dark:bg-emerald-900/30' },
  moms:        { solid: 'bg-violet-600',   light: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200',  accent: '#7c3aed', darkBg: 'dark:bg-violet-900/30' },
  skatt:       { solid: 'bg-amber-500',    light: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   accent: '#d97706', darkBg: 'dark:bg-amber-900/30' },
  budget:      { solid: 'bg-indigo-600',   light: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200',  accent: '#4f46e5', darkBg: 'dark:bg-indigo-900/30' },
  rapporter:   { solid: 'bg-rose-600',     light: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    accent: '#e11d48', darkBg: 'dark:bg-rose-900/30' },
  bank:        { solid: 'bg-blue-600',     light: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-200',    accent: '#0d9488', darkBg: 'dark:bg-blue-900/30' },
  bolag:       { solid: 'bg-blue-600',     light: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-200',    accent: '#0052FF', darkBg: 'dark:bg-blue-900/30' },
  hr:          { solid: 'bg-emerald-600',  light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', accent: '#059669', darkBg: 'dark:bg-emerald-900/30' },
  projekt:     { solid: 'bg-orange-600',   light: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-200',  accent: '#ea580c', darkBg: 'dark:bg-orange-900/30' },
} as const;

export type ModuleKey = keyof typeof MODULE_COLORS;
