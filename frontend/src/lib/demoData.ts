/**
 * Demo corporate registry (PA-24 dummy-data slice): Malaysian-flavored companies,
 * people, and typed relationship edges feeding search, reports, and the Sigma graph.
 * Deterministic fixture — the real SSM integration replaces this module.
 */

export interface DemoEntity {
  key: string
  type: "company" | "person" | "llp" | "foreign_entity"
  name: string
  regNo?: string
  incorporated?: string
  status?: "Active" | "Winding Up" | "Dormant"
  msic?: string
  paidUpCapital?: number // RM
  address?: string
  flagged?: boolean
}

export interface DemoEdge {
  source: string
  target: string
  type: "shareholding" | "directorship" | "beneficial_ownership" | "bo_changed"
  label: string
}

export const ENTITIES: DemoEntity[] = [
  { key: "whb", type: "company", name: "Wai Hong Brothers Sdn Bhd", regNo: "197501002345 (23456-A)", incorporated: "1975-03-12", status: "Active", msic: "41001 — Residential building construction", paidUpCapital: 5_000_000, address: "Lot 12, Jalan Ampang, 50450 Kuala Lumpur" },
  { key: "turbo", type: "company", name: "Turbo Jewellery Sdn Bhd", regNo: "199801007891 (456789-K)", incorporated: "1998-06-02", status: "Active", msic: "47733 — Retail of jewellery", paidUpCapital: 2_000_000, address: "88, Jalan Bukit Bintang, 55100 Kuala Lumpur" },
  { key: "kslim", type: "company", name: "KS Lim Holdings Bhd", regNo: "200001012233 (528844-T)", incorporated: "2000-04-18", status: "Active", msic: "64200 — Holding companies", paidUpCapital: 25_000_000, address: "Level 21, Menara KS, Jalan Sultan Ismail, KL" },
  { key: "nusantara", type: "company", name: "Nusantara Agri Ventures Sdn Bhd", regNo: "201501033445 (1140022-P)", incorporated: "2015-09-30", status: "Active", msic: "01262 — Oil palm estates", paidUpCapital: 8_500_000, address: "Km 12, Jalan Kuantan, Pahang" },
  { key: "cyberlink", type: "company", name: "Cyberlink Data Systems Sdn Bhd", regNo: "201801044556 (1291837-X)", incorporated: "2018-02-14", status: "Active", msic: "62010 — Computer programming", paidUpCapital: 1_000_000, address: "Suite 3A, Cyberjaya, Selangor" },
  { key: "goldenharvest", type: "company", name: "Golden Harvest Trading Sdn Bhd", regNo: "199201005566 (238899-M)", incorporated: "1992-11-05", status: "Winding Up", msic: "46319 — Wholesale of foodstuffs", paidUpCapital: 500_000, address: "12, Jalan Pasar, Ipoh, Perak", flagged: true },
  { key: "pinnacle_llp", type: "llp", name: "Pinnacle Advisory PLT", regNo: "LLP0012345-LGN", incorporated: "2019-07-22", status: "Active", msic: "70201 — Management consultancy", address: "Bangsar South, KL" },
  { key: "sg_meridian", type: "foreign_entity", name: "Meridian Capital Pte Ltd (SG)", regNo: "201900123N", incorporated: "2019-01-08", status: "Active", address: "Raffles Place, Singapore" },
  { key: "tan_ah_kow", type: "person", name: "Tan Ah Kow" },
  { key: "lim_kim_seng", type: "person", name: "Dato' Lim Kim Seng" },
  { key: "siti_aminah", type: "person", name: "Siti Aminah binti Hassan" },
  { key: "wong_mei_ling", type: "person", name: "Wong Mei Ling" },
  { key: "raj_kumar", type: "person", name: "Raj Kumar a/l Subramaniam" },
  { key: "chen_wei", type: "person", name: "Chen Wei (SG)", flagged: false },
  { key: "ahmad_faizal", type: "person", name: "Ahmad Faizal bin Omar" },
]

export const EDGES: DemoEdge[] = [
  { source: "tan_ah_kow", target: "whb", type: "shareholding", label: "40% shareholder" },
  { source: "lim_kim_seng", target: "whb", type: "directorship", label: "Managing Director" },
  { source: "lim_kim_seng", target: "kslim", type: "beneficial_ownership", label: "UBO 65%" },
  { source: "kslim", target: "whb", type: "shareholding", label: "35% corporate shareholder" },
  { source: "kslim", target: "turbo", type: "shareholding", label: "51% corporate shareholder" },
  { source: "wong_mei_ling", target: "turbo", type: "directorship", label: "Director" },
  { source: "wong_mei_ling", target: "goldenharvest", type: "directorship", label: "Director (resigned 2025)" },
  { source: "siti_aminah", target: "nusantara", type: "beneficial_ownership", label: "UBO 55%" },
  { source: "siti_aminah", target: "pinnacle_llp", type: "directorship", label: "Partner" },
  { source: "raj_kumar", target: "cyberlink", type: "shareholding", label: "70% founder" },
  { source: "raj_kumar", target: "pinnacle_llp", type: "directorship", label: "Partner" },
  { source: "sg_meridian", target: "cyberlink", type: "shareholding", label: "30% foreign shareholder" },
  { source: "chen_wei", target: "sg_meridian", type: "beneficial_ownership", label: "UBO 80%" },
  { source: "ahmad_faizal", target: "nusantara", type: "bo_changed", label: "NEW UBO 20% (filed 3d ago)" },
  { source: "goldenharvest", target: "turbo", type: "shareholding", label: "5% legacy stake" },
  { source: "tan_ah_kow", target: "goldenharvest", type: "shareholding", label: "60% shareholder" },
]

export const entityByKey = (key: string) => ENTITIES.find((e) => e.key === key)

export function searchEntities(q: string): DemoEntity[] {
  const needle = q.trim().toLowerCase()
  if (!needle) return ENTITIES.filter((e) => e.type !== "person")
  return ENTITIES.filter(
    (e) => e.name.toLowerCase().includes(needle) || e.regNo?.toLowerCase().includes(needle),
  )
}

/** BFS neighborhood for the graph view (depth 2 — full fixture is small). */
export function neighborhood(rootKey: string): { nodes: DemoEntity[]; edges: DemoEdge[] } {
  const keep = new Set<string>([rootKey])
  for (let depth = 0; depth < 2; depth++) {
    for (const e of EDGES) {
      if (keep.has(e.source) || keep.has(e.target)) {
        keep.add(e.source)
        keep.add(e.target)
      }
    }
  }
  return {
    nodes: ENTITIES.filter((e) => keep.has(e.key)),
    edges: EDGES.filter((e) => keep.has(e.source) && keep.has(e.target)),
  }
}

/** Dummy financials for the report view — deterministic per company. */
export function demoFinancials(key: string) {
  const seed = [...key].reduce((a, c) => a + c.charCodeAt(0), 0)
  const base = (seed % 7) + 2
  const years = [2023, 2024, 2025]
  return years.map((year, i) => ({
    year,
    revenue: Math.round(base * 1_000_000 * (1 + 0.12 * i)),
    profit: Math.round(base * 140_000 * (1 + 0.2 * i) * (key === "goldenharvest" ? -0.4 : 1)),
    currentRatio: Number((1.1 + (seed % 10) / 20 + i * 0.08).toFixed(2)),
    gearing: Number((0.8 - i * 0.06 + (seed % 5) / 25).toFixed(2)),
  }))
}
