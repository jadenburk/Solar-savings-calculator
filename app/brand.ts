/**
 * Branding & disclosure constants.
 *
 * Every user-facing reference to the solar provider, the utility, and the
 * disclosure copy reads from this file. To swap or neutralize the brand for
 * a different market, edit values here only.
 */

export const BRAND = {
  /** Solar provider name (e.g. "Sunrun") */
  provider: "Sunrun",
  /** Solar provider stock ticker, used only in the FAQ. Leave empty to omit. */
  providerTicker: "RUN",
  /** Utility name (e.g. "Edison") */
  utility: "Edison",
  /** Short utility identifier used by regulators (e.g. "SCE") */
  utilityShort: "SCE",
} as const;

/** Persistent footer disclaimer shown on every view. */
export const DISCLAIMER =
  "Estimates only — not a guarantee of savings. Tap to view assumptions and sources.";

/** Long-form disclosure used inside the Assumptions modal. */
export const DISCLAIMER_FULL =
  "Projections are based on the inputs and assumptions shown and on publicly available utility data. Actual costs vary by system performance, household usage, future rate changes, and signed contract terms. Review your agreement for binding figures.";

/** Header pill shown until this tool is compliance-reviewed. */
export const COMPLIANCE_NOTE =
  "Illustrative discussion only — not individually compliance-reviewed.";

/** Cited sources, surfaced in the Assumptions and Historical look-back views. */
export const SOURCES = {
  cpucPao: {
    label: "CPUC Public Advocates Office — Quarterly Electric Rate Reports",
    short: "CPUC Public Advocates Office",
    url: "https://www.publicadvocates.cpuc.ca.gov",
  },
  sceGrc: {
    label: "SCE 2025 General Rate Case decision (CPUC)",
    short: "SCE 2025 GRC decision",
    url: "https://www.cpuc.ca.gov/industries-and-topics/electrical-energy/electric-rates/general-rate-case/southern-california-edison-grc-proceedings",
  },
  sceTariff: {
    label: "SCE Historical Prices & Rates (tariff books)",
    short: "SCE historical tariff books",
    url: "https://www.sce.com/regulatory/tariff-books/historical-rates",
  },
  sceRateAdvisory: {
    label: "SCE Rate Advisory (current rates)",
    short: "SCE Rate Advisory",
    url: "https://www.sce.com/save-money/rates-financing/sce-rate-advisory",
  },
} as const;

/**
 * Anchor points for SCE residential average rate ($/kWh).
 * Sourced from CPUC Public Advocates Office quarterly reports, excluding the
 * California Climate Credit. Used for the historical look-back tool.
 *
 * The Jun 2016 anchor is set so that the published 10-year change from
 * mid-2016 to mid-2026 (Oct 2025 most-recent published rate) is ~+110%,
 * matching CPUC's stated 10-year residential rate increase.
 */
export const SCE_RATE_ANCHORS: { year: number; month: number; rate: number; label: string }[] = [
  { year: 2016, month: 6, rate: 0.168, label: "Jun 2016" },
  { year: 2022, month: 1, rate: 0.250, label: "Jan 2022" },
  { year: 2025, month: 2, rate: 0.316, label: "Feb 2025" },
  { year: 2025, month: 10, rate: 0.353, label: "Oct 2025" },
];

/** Bill composition (CPUC Public Advocates Office). */
export const BILL_COMPOSITION = {
  generationPct: 30,
  deliveryPct: 70,
} as const;

/**
 * Self-consumption assumptions for the NEM 3.0 battery toggle.
 * "Residual" is the share of the customer's pre-solar utility bill that they
 * still pay the utility after going solar, due to imperfect self-consumption
 * under NEM 3.0 (exports are credited well below retail). Rough industry
 * averages — labeled as such in the UI.
 */
export const SELF_CONSUMPTION = {
  solarOnlyResidualPct: 30,
  solarBatteryResidualPct: 5,
} as const;
