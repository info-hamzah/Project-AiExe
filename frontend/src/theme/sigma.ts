import { brand, neutral, status } from "./tokens"

/**
 * Sigma relationship-graph palette (PA-23).
 * Node/edge types are extensible metadata — register new types here, not in render code.
 */
export const graphNodeColors: Record<string, string> = {
  company: brand.navy.to,
  person: brand.cyan,
  llp: brand.blue,
  foreign_entity: brand.purple,
  flagged: status.error, // sanctions/litigation-flagged entities
}

export const graphEdgeColors: Record<string, string> = {
  shareholding: neutral.textMuted,
  directorship: brand.cyan,
  beneficial_ownership: brand.purple, // BO edges highlighted — the compliance hook (PA-12)
  bo_changed: status.warning, // recent BO change — deep-link target state
}

export const graphDefaults = {
  labelColor: neutral.textPrimary,
  labelSize: 12,
  nodeSize: { min: 4, default: 8, max: 20 },
  edgeSize: { default: 1.5, highlighted: 3 },
  background: neutral.bgCard,
  /** Mobile perf budget helpers (PA-11): cap first paint, expand progressively. */
  neighborhood: { initialCap: 150, expandStep: 50 },
} as const
