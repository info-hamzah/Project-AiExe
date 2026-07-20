import type { ThemeConfig } from "antd"

import { brand, fontFamily, neutral, radius, status } from "./tokens"

/**
 * AntD v5 ThemeConfig mapping the Infomina tokens.
 * Wire up in layout.tsx: <ConfigProvider theme={infominaTheme}> — replaces ad-hoc color usage.
 */
export const infominaTheme: ThemeConfig = {
  token: {
    colorPrimary: brand.cyan,
    colorInfo: status.info,
    colorSuccess: status.success,
    colorWarning: status.warning,
    colorError: status.error,
    colorTextBase: neutral.textPrimary,
    colorTextSecondary: neutral.textSecondary,
    colorBgLayout: neutral.bgLayout,
    colorBgContainer: neutral.bgCard,
    colorBorder: neutral.border,
    colorBorderSecondary: neutral.borderSoft,
    borderRadius: radius.base,
    borderRadiusLG: radius.lg,
    fontFamily,
    fontSize: 14,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    lineHeight: 1.5,
    boxShadow: "0 1px 2px rgba(15, 52, 96, 0.04), 0 4px 16px rgba(15, 52, 96, 0.06)",
    boxShadowSecondary: "0 1px 2px rgba(15, 52, 96, 0.04), 0 8px 24px rgba(15, 52, 96, 0.08)",
    controlOutline: "rgba(0, 161, 228, 0.18)",
  },
  components: {
    Button: {
      borderRadius: radius.base,
      controlHeight: 38,
      fontWeight: 500,
    },
    Card: {
      borderRadiusLG: radius.lg,
      boxShadowTertiary: "0 1px 2px rgba(15, 52, 96, 0.04), 0 4px 16px rgba(15, 52, 96, 0.06)",
      headerFontSize: 15,
    },
    Table: {
      headerBg: neutral.bgLayout,
      headerColor: neutral.textSecondary,
    },
    Menu: {
      // navy shell sidebar (dark menu variant)
      darkItemBg: "transparent",
      darkItemSelectedBg: "rgba(0, 161, 228, 0.16)",
      darkItemSelectedColor: "#FFFFFF",
      darkItemColor: "rgba(255, 255, 255, 0.68)",
      darkGroupTitleColor: "rgba(255, 255, 255, 0.38)",
      itemBorderRadius: 8,
      itemMarginInline: 10,
    },
    Modal: {
      borderRadiusLG: radius.lg,
    },
    Tag: {
      borderRadiusSM: radius.base,
    },
  },
}
