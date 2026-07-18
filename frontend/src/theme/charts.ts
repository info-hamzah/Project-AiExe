import { categorical, fontFamily, neutral } from "./tokens"

/**
 * Shared chart theming for Chart.js and Recharts widgets.
 * Widget renderers (PA-22) read from here so every chart matches the brand
 * without per-chart color choices.
 */
export const chartPalette = [...categorical]

/** Chart.js global defaults — call once at app start (or in the widget registry). */
export const chartJsDefaults = {
  font: { family: fontFamily, size: 12 },
  color: neutral.textSecondary,
  borderColor: neutral.border,
  plugins: {
    legend: { labels: { color: neutral.textSecondary, usePointStyle: true } },
    tooltip: {
      backgroundColor: neutral.textPrimary,
      titleColor: "#FFFFFF",
      bodyColor: "#FFFFFF",
      cornerRadius: 8,
    },
  },
  scales: {
    x: { grid: { color: neutral.borderSoft }, ticks: { color: neutral.textMuted } },
    y: { grid: { color: neutral.borderSoft }, ticks: { color: neutral.textMuted } },
  },
} as const

/** Recharts common props — spread into components. */
export const rechartsTheme = {
  gridStroke: neutral.borderSoft,
  axisStroke: neutral.border,
  tickFill: neutral.textMuted,
  tooltipStyle: {
    backgroundColor: neutral.bgCard,
    border: `1px solid ${neutral.border}`,
    borderRadius: 8,
    fontFamily,
  },
} as const

export const seriesColor = (index: number): string =>
  chartPalette[index % chartPalette.length]
