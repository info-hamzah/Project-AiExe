# UI Stack & Design System Proposal — AiExe Revamp (PA-15)

**Status:** ✅ Approved as proposed (2026-07-18) — typeface decision: **Inter** (no Neue Haas app license assumed)
**Brand source:** analyzed live CSS of https://www.infomina.ai/ (colors, type, radii extracted from the shipped stylesheets).

## 1. Stack (constraint-aligned, no new frameworks)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 App Router + TS** (existing) | Guardrail: no new UI framework |
| Components | **Ant Design v5 + Pro Components** (existing) | v5's token-based theming lets us encode the Infomina brand once in a `ThemeConfig` and every component inherits it |
| Theming | **AntD Design Tokens** via `ConfigProvider` + `@ant-design/nextjs-registry` (already a dependency) | One `theme/infomina.ts` file is the single source of truth; no scattered CSS overrides |
| Layout/responsive | AntD Grid + breakpoints (`xs 480 / sm 576 / md 768 / lg 992 / xl 1200`) | Desktop-first, usable at 375px (NFR-1 gate) |
| Utility CSS | **clsx + CSS Modules** (existing) — *no Tailwind* | The FE already uses this; adding Tailwind mid-revamp splits the styling idiom |
| Charts | Chart.js/Recharts themed from the same token file | dataviz consistency with brand palette |
| Graph | Sigma with node/edge palette from tokens | brand-consistent graph rendering |

**Recommendation: pure AntD v5 token theming, no new dependencies.** Everything below is configuration, not new packages.

## 2. Design tokens (extracted from infomina.ai)

### Color

| Token | Value | Source / use |
|---|---|---|
| `colorPrimary` | **#00A1E4** | Infomina cyan — primary buttons, links, active nav, focus rings |
| `colorInfo` | #1464BF | Secondary blue — informational accents, secondary CTAs |
| `brand-navy` (custom) | #1A1A2E → #16213E → #0F3460 | The landing page's hero gradient family — sidebar/app-shell dark surfaces, login hero |
| `brand-purple` (custom) | #7E499D | Accent used sparingly: AI features (Mina chat, AI dashboard generation) get the purple identity |
| `colorError` | #ED1C24 | Landing page red — errors, destructive actions only |
| `colorTextBase` | #2D2D2D | Headings/body (landing's text color) |
| `colorTextSecondary` | #4C4C4C / #6B7280 | Secondary text |
| `colorBgLayout` | #F9FAFB | App background (landing's light section bg) |
| `colorBorder` | #E5E7EB / #EAEAEA | Hairlines, card borders |
| Success/Warning | AntD defaults tuned: #16A34A / #F59E0B | No brand equivalents on landing; pick accessible defaults |

Semantic rule: **cyan = action, navy = structure, purple = AI, red = danger.** Charts get a categorical palette derived from these four + neutrals, contrast-validated.

### Typography

- Landing uses **Neue Haas Grotesk Text Pro** (licensed; fallback "Helvetica Neue", Helvetica, Arial).
- **Decision (approved 2026-07-18):** **Inter** via `next/font` as the app face, with the landing's fallback stack (`Inter, "Helvetica Neue", Helvetica, Arial, sans-serif`) — metrically close to Neue Haas, zero licensing risk.
- Scale (AntD tokens): base 14, `fontSizeHeading1..5` = 38/30/24/20/16, line-height 1.5. Landing-style hero sizes stay on marketing pages only.

### Shape & depth

- `borderRadius: 12` (cards/inputs), `borderRadiusLG: 16` (modals/panels), pill (`borderRadius: 9999`) reserved for primary CTAs — mirrors the landing's 12/16/50px pattern.
- Shadows: subtle two-layer (AntD `boxShadowSecondary`) on cards; the landing's dark-gradient hero treatment reserved for the auth screens and the app sidebar.

### Dark surfaces

App shell sidebar + auth pages use the navy gradient (`135deg, #1A1A2E → #16213E → #0F3460`) with white/cyan foreground — this is the most recognizable landing-page element and makes the app instantly "Infomina" without dark-theming every screen. Content area stays light in MVP (full dark mode = V2).

## 3. Implementation shape (PA-15)

```
src/theme/
  tokens.ts        -- the table above as a typed constant (single source of truth)
  antd-theme.ts    -- ThemeConfig mapping tokens → AntD v5 (+ component overrides: Button, Card, Table, Menu)
  charts.ts        -- Chart.js/Recharts theme + categorical palette from tokens
  sigma.ts         -- graph node/edge palette
src/components/shell/
  AppShell.tsx     -- navy sidebar, responsive collapse (drawer < md), breadcrumbs, user menu
  PageHeader.tsx / StatCard.tsx / LockedFeature.tsx (sneak-peek wrapper skin)
```

- Ships behind a feature flag; screens adopt the shell as they're revamped (no big-bang).
- Storybook-lite: a `/design` internal route rendering every themed component state — doubles as the visual regression target and the stakeholder "before/after" demo page.
- Every component reviewed at 375px / 768px / 1280px before merge (NFR-1).

## 4. What I need from you

1. **Approve the direction** (pure AntD token theming, cyan/navy/purple semantic mapping, navy shell).
2. **Font decision:** Neue Haas Grotesk app license — yes (use it) or no (Inter).
3. Optional: any existing brand guideline doc that supersedes what I extracted from the landing page.
