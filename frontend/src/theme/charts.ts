import { categorical, fontFamily, neutral } from "./tokens"

/**
 * Shared chart theming for @ant-design/plots (AntV G2) widgets.
 * Widget renderers (PA-22) read from here so every chart matches the brand
 * without per-chart color choices. Palette is validator-passing (see tokens.ts).
 */
export const chartPalette = [...categorical]

export const seriesColor = (index: number): string =>
  chartPalette[index % chartPalette.length]

/** Base config spread into every @ant-design/plots chart. */
export const plotsBase = {
  height: 200,
  animate: false as const,
  axis: {
    x: {
      title: false,
      labelFill: neutral.textMuted,
      labelFontSize: 12,
      labelFontFamily: fontFamily,
      line: false,
      tick: false,
    },
    y: {
      title: false,
      labelFill: neutral.textMuted,
      labelFontSize: 12,
      labelFontFamily: fontFamily,
      grid: true,
      gridStroke: neutral.borderSoft,
      gridStrokeOpacity: 1,
      line: false,
      tick: false,
    },
  },
}
