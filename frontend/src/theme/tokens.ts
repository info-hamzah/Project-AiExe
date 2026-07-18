/**
 * Infomina brand tokens — single source of truth (docs/ui-design-system.md, approved 2026-07-18).
 * Extracted from the live infomina.ai stylesheets. Semantic rule:
 * cyan = action · navy = structure · purple = AI · red = danger.
 */
export const brand = {
  cyan: "#00A1E4",
  blue: "#1464BF",
  navy: { from: "#1A1A2E", mid: "#16213E", to: "#0F3460" },
  purple: "#7E499D",
  purpleDeep: "#541C75",
  red: "#ED1C24",
} as const

export const neutral = {
  textPrimary: "#2D2D2D",
  textSecondary: "#4C4C4C",
  textMuted: "#6B7280",
  bgLayout: "#F9FAFB",
  bgCard: "#FFFFFF",
  border: "#E5E7EB",
  borderSoft: "#EAEAEA",
} as const

export const status = {
  success: "#16A34A",
  warning: "#F59E0B",
  error: brand.red,
  info: brand.blue,
} as const

export const radius = {
  base: 12, // cards, inputs
  lg: 16, // modals, panels
  pill: 9999, // primary CTAs only
} as const

export const navyGradient = `linear-gradient(135deg, ${brand.navy.from} 0%, ${brand.navy.mid} 30%, ${brand.navy.to} 60%, ${brand.navy.from} 100%)`

export const fontFamily = `Inter, "Helvetica Neue", Helvetica, Arial, sans-serif`

/** Categorical palette for charts/graph — brand-derived, contrast-checked on white. */
export const categorical = [
  brand.cyan,
  brand.navy.to,
  brand.purple,
  status.warning,
  status.success,
  neutral.textMuted,
] as const
