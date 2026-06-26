"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  type ScriptableContext,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  BRAND,
  DISCLAIMER_FULL,
  COMPLIANCE_NOTE,
  SOURCES,
  SCE_RATE_ANCHORS,
} from "./brand";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

ChartJS.defaults.font.family =
  'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif';
ChartJS.defaults.font.size = 13;
ChartJS.defaults.color = "#94A3B8";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const YEARS = Array.from({ length: 25 }, (_, i) => i + 1);
const CARD_YEARS = [1, 5, 10, 20, 25] as const;
const PPA_OPTIONS = [0, 3.5] as const;
const LOOKBACK_MAX_YEARS = 12;

/**
 * Linear-interpolate the SCE residential average rate at a given year/month
 * using the published anchor points in app/brand.ts. We do not extrapolate
 * past the most recent anchor (rates outside the published window are
 * unreliable, especially toward longer look-backs where electricity actually
 * got cheaper in real terms).
 */
function interpolateRate(year: number, month: number): number {
  const target = year * 12 + (month - 1);
  const anchors = [...SCE_RATE_ANCHORS]
    .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month))
    .map((a) => ({ idx: a.year * 12 + (a.month - 1), rate: a.rate }));

  if (target <= anchors[0].idx) return anchors[0].rate;
  if (target >= anchors[anchors.length - 1].idx)
    return anchors[anchors.length - 1].rate;

  for (let i = 0; i < anchors.length - 1; i++) {
    const lo = anchors[i];
    const hi = anchors[i + 1];
    if (target >= lo.idx && target <= hi.idx) {
      const t = (target - lo.idx) / (hi.idx - lo.idx);
      return lo.rate + (hi.rate - lo.rate) * t;
    }
  }
  return anchors[anchors.length - 1].rate;
}

/* ----------------------------- Q&A content ----------------------------- */

type QA = { q: string; a: string };
type Category = { id: string; label: string; items: QA[] };

const CATEGORIES: Category[] = [
  {
    id: "how",
    label: "How it works",
    items: [
      {
        q: "Do I own the panels?",
        a: `No. This is a Power Purchase Agreement (PPA). ${BRAND.provider} owns and maintains the system; you pay only for the power it produces, at a rate set below your current ${BRAND.utility} rate. There is no upfront cost.`,
      },
      {
        q: "How does this estimate savings?",
        a: `Your ${BRAND.provider} rate is locked in and rises by either 0% or 3.5% per year (the only two contract options). ${BRAND.utility} rates have historically risen around 6% per year. The gap compounds over time. The figure at the top of this page is the estimated compounded difference over 25 years, based on the inputs you entered.`,
      },
      {
        q: "Does the system include batteries?",
        a: `Yes. Under California's NEM 3.0 rules, every new ${BRAND.provider} system includes 1 to 4 home batteries sized to your usage. The batteries store the energy your panels produce during the day so you can use it at night and during peak-rate hours — meaning you pull very little from the grid.`,
      },
      {
        q: "What about cloudy days or nighttime?",
        a: `Your batteries cover most of it. The system stores the energy your panels produce during the day and runs your home off the battery at night, during cloudy stretches, and during ${BRAND.utility}'s most expensive peak hours. You stay connected to the grid as a backup, but most homes draw very little from ${BRAND.utility} once the system is on.`,
      },
      {
        q: "Is there really nothing down?",
        a: `Correct. Standard ${BRAND.provider} PPAs are $0 down. Your first payment begins only after the system is installed, inspected by the city, and turned on.`,
      },
    ],
  },
  {
    id: "cost",
    label: "Cost & savings",
    items: [
      {
        q: "Why not just buy panels outright?",
        a: `Purchasing requires $25k–$40k in cash upfront and several years of payback before you break even. The federal solar tax credit was eliminated at the end of 2025, so buying no longer comes with the 30% rebate it used to. The PPA exists for homeowners who'd rather skip the upfront cost and begin offsetting their utility bill on day one.`,
      },
      {
        q: `What if ${BRAND.utility}'s rates just stop going up?`,
        a: `It's the fair question to ask, but California has several structural reasons rates keep climbing. ${BRAND.utility} is paying out billions in wildfire-related settlements and is required by state law to underground lines, expand vegetation management, and harden the grid through the late 2020s — and the CPUC lets those costs flow into rates. On top of that, AI and data center demand is the fastest-growing load in the state, EVs and heat pumps are shifting more energy onto the grid, and California's 2045 clean-energy mandate requires a massive transmission and storage buildout. ${BRAND.utilityShort} residential rates have climbed about 110% over the past 10 years, and the CPUC has already approved further increases through 2027. Even if you assume only 3–4% per year going forward (well below the actual trend), the math still favors solar.`,
      },
      {
        q: `Will my ${BRAND.provider} payment go up?`,
        a: `Yes — by either 0% or 3.5% per year, depending on which contract you sign. Both are locked in writing for 25 years and are well below ${BRAND.utility}'s typical annual increases.`,
      },
      {
        q: "What's the catch?",
        a: `The honest tradeoff: you don't own the panels, and you commit for 25 years (the agreement transfers if you move). In exchange, you pay nothing upfront, lock in a rate below ${BRAND.utility}'s for the life of the system, and ${BRAND.provider} handles all maintenance.`,
      },
    ],
  },
  {
    id: "move",
    label: "Moving & resale",
    items: [
      {
        q: "What if I sell my home?",
        a: `The agreement transfers to the new owner — ${BRAND.provider} handles the paperwork at no cost to you. Most buyers view the below-${BRAND.utility} rate as a benefit.`,
      },
      {
        q: "Will solar hurt my resale value?",
        a: `Independent studies of California homes have shown solar homes — both owned and leased — generally sell for the same or more than comparable non-solar homes. The new owner inherits the same locked-in rate.`,
      },
      {
        q: "What if I move in just a few years?",
        a: `Three options when you sell: transfer the agreement to the buyer (most common), prepay the remainder, or in some cases relocate the system. ${BRAND.provider} handles the transfer process.`,
      },
    ],
  },
  {
    id: "maintenance",
    label: "Maintenance",
    items: [
      {
        q: "Who fixes things if they break?",
        a: `${BRAND.provider}. Because they own the system, they cover all repairs, inverter and battery replacement, system monitoring, and roof-penetration warranties for the entire 25 years. No out-of-pocket cost to you.`,
      },
      {
        q: "What about storm or hail damage?",
        a: `Panels and batteries are tested to industry hail and wind standards. Major weather damage is covered by your homeowner's insurance; ${BRAND.provider} coordinates repairs on the system itself.`,
      },
      {
        q: "Don't panels lose efficiency over time?",
        a: `Yes — about 0.5% per year. ${BRAND.provider}'s production guarantee covers underperformance, so if the system produces less than promised, they compensate the difference.`,
      },
    ],
  },
  {
    id: "company",
    label: "The company",
    items: [
      {
        q: `What if ${BRAND.provider} goes out of business?`,
        a: `${BRAND.provider} is publicly traded on NASDAQ${
          BRAND.providerTicker ? ` (ticker: ${BRAND.providerTicker})` : ""
        }. If the company were ever sold or restructured, your agreement would transfer to the new operator. The panels, batteries, and your locked rate would not change.`,
      },
      {
        q: `Why do you need my ${BRAND.utility} bill?`,
        a: `Only to model real numbers using your actual usage. Nothing is sent anywhere — this tool runs entirely on this device and stores no customer information.`,
      },
      {
        q: "Why does the calculator only show 0% and 3.5%?",
        a: `Those are the only two escalators ${BRAND.provider} writes into new PPAs — there's no other value to choose. 3.5% is the standard option; 0% (flat for 25 years) is offered to qualifying homes. Toggle between them above to see how each plays out.`,
      },
    ],
  },
];

/* ------------------------- Animation helper hook ------------------------ */

function useBumpOnChange<T>(value: T, className: string) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const node = ref.current;
    if (!node) return;
    node.classList.remove(className);
    void node.offsetWidth;
    node.classList.add(className);
  }, [value, className]);
  return ref;
}

/* --------------------------------- Page --------------------------------- */

export default function Page() {
  const [edisonBill, setEdisonBill] = useState<number | null>(250);
  const [ppaPayment, setPpaPayment] = useState<number | null>(180);
  const [edisonRate, setEdisonRate] = useState(6);
  const [ppaEsc, setPpaEsc] = useState<number>(3.5);
  const [modalOpen, setModalOpen] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [lookbackOpen, setLookbackOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // URL state sync (Phase 5)
  const urlMounted = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const b = p.get("b");
    if (b !== null) {
      if (b === "") setEdisonBill(null);
      else {
        const n = Number(b);
        if (Number.isFinite(n) && n >= 0) setEdisonBill(n);
      }
    }
    const pp = p.get("p");
    if (pp !== null) {
      if (pp === "") setPpaPayment(null);
      else {
        const n = Number(pp);
        if (Number.isFinite(n) && n >= 0) setPpaPayment(n);
      }
    }
    const r = p.get("r");
    if (r !== null) {
      const n = Number(r);
      if (Number.isFinite(n)) setEdisonRate(Math.min(10, Math.max(3, n)));
    }
    const e = p.get("e");
    if (e !== null) {
      const n = Number(e);
      if (n === 0 || n === 3.5) setPpaEsc(n);
    }
    // Defer marking "mounted" until after the current task so the encoder's
    // mount-time fire (with default state) does not clobber the URL params
    // we just decoded.
    const id = setTimeout(() => {
      urlMounted.current = true;
    }, 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!urlMounted.current) return;
    if (typeof window === "undefined") return;
    const p = new URLSearchParams();
    if (edisonBill !== null) p.set("b", String(edisonBill));
    if (ppaPayment !== null) p.set("p", String(ppaPayment));
    p.set("r", edisonRate.toString());
    p.set("e", ppaEsc.toString());
    const url = window.location.pathname + "?" + p.toString();
    window.history.replaceState(null, "", url);
  }, [edisonBill, ppaPayment, edisonRate, ppaEsc]);

  const edBillNum = edisonBill ?? 0;
  const ppaPayNum = ppaPayment ?? 0;

  const { edisonCumArr, ppaCumArr } = useMemo(() => {
    const ed: number[] = [];
    const sr: number[] = [];
    let edCum = 0;
    let srCum = 0;
    for (let i = 0; i < 25; i++) {
      const y = i + 1;
      const edYear = edBillNum * 12 * Math.pow(1 + edisonRate / 100, y - 1);
      const ppaYear = ppaPayNum * 12 * Math.pow(1 + ppaEsc / 100, y - 1);
      edCum += edYear;
      srCum += ppaYear;
      ed.push(edCum);
      sr.push(srCum);
    }
    return { edisonCumArr: ed, ppaCumArr: sr };
  }, [edBillNum, ppaPayNum, edisonRate, ppaEsc]);

  const { ppa35Cum, ppa0Cum } = useMemo(() => {
    const a: number[] = [];
    const b: number[] = [];
    let ac = 0;
    let bc = 0;
    for (let i = 0; i < 25; i++) {
      const y = i + 1;
      ac += ppaPayNum * 12 * Math.pow(1.035, y - 1);
      bc += ppaPayNum * 12;
      a.push(ac);
      b.push(bc);
    }
    return { ppa35Cum: a, ppa0Cum: b };
  }, [ppaPayNum]);

  const savingsAt = (y: number) => edisonCumArr[y - 1] - ppaCumArr[y - 1];
  const total = savingsAt(25);
  const edisonTotal = edisonCumArr[24];
  const sunrunTotal = ppaCumArr[24];

  const headlineRef = useBumpOnChange(total, "pulse");

  useEffect(() => {
    if (
      !modalOpen &&
      !qaOpen &&
      !ratesOpen &&
      !compareOpen &&
      !lookbackOpen &&
      !shareOpen
    )
      return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalOpen(false);
        setQaOpen(false);
        setRatesOpen(false);
        setCompareOpen(false);
        setLookbackOpen(false);
        setShareOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [modalOpen, qaOpen, ratesOpen, compareOpen, lookbackOpen, shareOpen]);

  const chartData = useMemo(
    () => ({
      labels: YEARS,
      datasets: [
        {
          label: BRAND.utility,
          data: edisonCumArr,
          borderColor: "#F87171",
          backgroundColor: "rgba(248, 113, 113, 0)",
          borderWidth: 2.5,
          tension: 0.28,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#F87171",
          pointHoverBorderColor: "#0E1320",
          pointHoverBorderWidth: 3,
          fill: false as const,
          order: 1,
        },
        {
          label: BRAND.provider,
          data: ppaCumArr,
          borderColor: "#10B981",
          backgroundColor: (ctx: ScriptableContext<"line">) => {
            const { ctx: c, chartArea } = ctx.chart;
            if (!chartArea) return "rgba(16, 185, 129, 0.18)";
            const g = c.createLinearGradient(
              0,
              chartArea.top,
              0,
              chartArea.bottom
            );
            g.addColorStop(0, "rgba(16, 185, 129, 0.03)");
            g.addColorStop(0.7, "rgba(16, 185, 129, 0.16)");
            g.addColorStop(1, "rgba(16, 185, 129, 0.26)");
            return g;
          },
          borderWidth: 2.5,
          tension: 0.28,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#10B981",
          pointHoverBorderColor: "#0E1320",
          pointHoverBorderWidth: 3,
          fill: "-1" as const,
          order: 2,
        },
      ],
    }),
    [edisonCumArr, ppaCumArr]
  );

  const chartOptions = useMemo(
    () =>
      ({
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350, easing: "easeOutCubic" as const },
        interaction: { mode: "index" as const, intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(7, 9, 15, 0.96)",
            titleColor: "#F8FAFC",
            bodyColor: "#E5EAF2",
            padding: 14,
            borderColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
            cornerRadius: 10,
            titleFont: { weight: 600, size: 12 },
            bodyFont: { size: 13 },
            displayColors: true,
            boxPadding: 6,
            callbacks: {
              title: (items: any[]) => "Year " + items[0].label,
              label: (item: any) =>
                " " + item.dataset.label + ": " + fmt(item.parsed.y),
              afterBody: (items: any[]) => {
                if (items.length < 2) return "";
                const ed =
                  items.find((i) => i.dataset.label === BRAND.utility)?.parsed.y ??
                  0;
                const sr =
                  items.find((i) => i.dataset.label === BRAND.provider)?.parsed.y ??
                  0;
                return "\n Estimated savings: " + fmt(ed - sr);
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "YEAR",
              color: "#64748B",
              font: { weight: 600 as const, size: 10 },
              padding: { top: 10 },
            },
            grid: { display: false },
            border: { color: "rgba(255,255,255,0.06)" },
            ticks: {
              autoSkip: true,
              maxTicksLimit: 13,
              color: "#64748B",
              font: { size: 12 },
            },
          },
          y: {
            title: {
              display: true,
              text: "CUMULATIVE COST",
              color: "#64748B",
              font: { weight: 600 as const, size: 10 },
              padding: { bottom: 10 },
            },
            grid: { color: "rgba(255,255,255,0.04)" },
            border: { display: false },
            ticks: {
              callback: (v: any) => fmt(Number(v)),
              color: "#64748B",
              font: { size: 12 },
              padding: 8,
            },
            beginAtZero: true,
          },
        },
      }) as const,
    []
  );

  return (
    <main className="max-w-[1380px] mx-auto px-5 md:px-10 py-7 md:py-10 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-10 md:mb-14 gap-3">
        <div className="text-[13px] font-semibold tracking-[0.18em] uppercase text-slate-300">
          Solar <span className="text-slate-600 mx-1.5">/</span> {BRAND.utility}
        </div>
        <button
          onClick={() => setShareOpen(true)}
          className="btn-ghost btn-ghost-primary"
          title="Share or text these results"
        >
          <ShareIcon />
          <span>Share</span>
        </button>
      </div>

      {/* Headline */}
      <section className="text-center mb-12 md:mb-16">
        <div className="eyebrow mb-5">Estimated 25-Year Savings</div>
        <div ref={headlineRef} className="headline">
          {fmt(total)}
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <div className="stat-pill">
            <span className="dot-red" />
            <span className="label">{BRAND.utility}</span>
            <span className="value">{fmt(edisonTotal)}</span>
          </div>
          <div className="text-slate-600 text-xs font-semibold tracking-wider uppercase hidden sm:block">
            vs
          </div>
          <div className="stat-pill">
            <span className="dot-green" />
            <span className="label">{BRAND.provider}</span>
            <span className="value">{fmt(sunrunTotal)}</span>
          </div>
        </div>
      </section>

      {/* Inputs */}
      <section className="panel p-5 md:p-7 mb-6 md:mb-7">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-7">
          <div>
            <div className="input-label mb-2.5">Current {BRAND.utility} bill</div>
            <div className="input-shell relative">
              <span className="money-prefix">$</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={1}
                value={edisonBill ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") return setEdisonBill(null);
                  const n = Number(v);
                  if (!isNaN(n) && n >= 0) setEdisonBill(n);
                }}
                onFocus={(e) => e.currentTarget.select()}
                className="money-input"
              />
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium tracking-wide">
              per month
            </div>
          </div>

          <div>
            <div className="input-label mb-2.5">{BRAND.provider} PPA payment</div>
            <div className="input-shell relative">
              <span className="money-prefix">$</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={1}
                value={ppaPayment ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") return setPpaPayment(null);
                  const n = Number(v);
                  if (!isNaN(n) && n >= 0) setPpaPayment(n);
                }}
                onFocus={(e) => e.currentTarget.select()}
                className="money-input"
              />
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium tracking-wide">
              per month
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-3">
              <div className="input-label">{BRAND.utility} rate increase</div>
              <div className="slider-value">
                {edisonRate.toFixed(1)}
                <span className="text-slate-500 font-medium">%</span>
              </div>
            </div>
            <input
              type="range"
              min={3}
              max={10}
              step={0.1}
              value={edisonRate}
              onChange={(e) => setEdisonRate(Number(e.target.value))}
              aria-label={`${BRAND.utility} rate increase, percent per year`}
            />
            <div className="flex justify-between text-[11px] text-slate-600 mt-2.5 font-medium">
              <span>3%</span>
              <span className="text-slate-500">per year</span>
              <span>10%</span>
            </div>
            <button
              onClick={() => setRatesOpen(true)}
              className="mt-3 text-[12px] text-slate-400 hover:text-slate-100 transition inline-flex items-center gap-1.5 font-medium"
            >
              Why are rates climbing?
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path
                  d="M1 5.5h9M6 1l4.5 4.5L6 10"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div>
            <div className="input-label mb-2.5">PPA annual escalator</div>
            <div className="seg">
              {PPA_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPpaEsc(opt)}
                  className={`seg-btn ${ppaEsc === opt ? "active" : ""}`}
                  aria-pressed={ppaEsc === opt}
                >
                  {opt}
                  <span className="seg-unit">%</span>
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium">
              The only two contractual rates {BRAND.provider} offers.
            </div>
          </div>
        </div>

      </section>

      {/* Chart */}
      <section className="panel p-5 md:p-7 mb-6 md:mb-7">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="text-[14px] font-semibold text-slate-200 tracking-tight">
            Cumulative cost, 25 years
          </div>
          <div className="flex items-center gap-5 text-[13px]">
            <span className="text-slate-300 font-medium flex items-center gap-2">
              <span className="dot-red" />
              {BRAND.utility}
            </span>
            <span className="text-slate-300 font-medium flex items-center gap-2">
              <span className="dot-green" />
              {BRAND.provider}
            </span>
          </div>
        </div>
        <div className="chart-shell">
          <Line data={chartData} options={chartOptions} />
        </div>
      </section>

      {/* Savings Cards */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-[11px] font-semibold tracking-[0.22em] uppercase text-slate-500">
            Cumulative savings
          </div>
          <div className="hairline flex-1" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {CARD_YEARS.map((y) => (
            <SavingsCard key={y} year={y} amount={savingsAt(y)} />
          ))}
        </div>
      </section>

      {/* Footer — tools on the left, disclaimers link last */}
      <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-8 pt-2 text-[12px] text-slate-500">
        <button
          onClick={() => setLookbackOpen(true)}
          className="hover:text-slate-200 transition"
        >
          Look-back
        </button>
        <button
          onClick={() => setCompareOpen(true)}
          className="hover:text-slate-200 transition"
        >
          3-way comparison
        </button>
        <button
          onClick={() => setRatesOpen(true)}
          className="hover:text-slate-200 transition"
        >
          Why rates climb
        </button>
        <button
          onClick={() => setQaOpen(true)}
          className="hover:text-slate-200 transition"
        >
          Common questions
        </button>
        <button
          onClick={() => setModalOpen(true)}
          className="hover:text-slate-200 transition"
        >
          Disclaimers
        </button>
      </footer>

      {/* Assumptions Modal */}
      {modalOpen && (
        <ModalShell onClose={() => setModalOpen(false)} maxWidthClass="max-w-xl">
          <div className="eyebrow mb-3">Disclaimers &amp; methodology</div>
          <h2 className="text-2xl md:text-[28px] font-semibold text-slate-50 mb-2 tracking-tight">
            Assumptions, sources &amp; disclaimers
          </h2>
          <p className="text-amber-300/90 text-[13px] mb-5">
            {COMPLIANCE_NOTE}
          </p>
          <div className="space-y-5 text-slate-300 leading-relaxed text-[15px]">
            <p>
              {DISCLAIMER_FULL}
            </p>
            <div>
              <div className="font-semibold text-slate-100 mb-1.5">
                {BRAND.utility} cost in year N
              </div>
              <p className="text-slate-400">
                Your current monthly bill &times; 12, compounded by the
                {" "}{BRAND.utility} rate increase you selected. A $250/mo
                bill with 6% annual increases is about $3,000 in year 1 and
                $3,180 in year 2.
              </p>
            </div>
            <div>
              <div className="font-semibold text-slate-100 mb-1.5">
                {BRAND.provider} PPA cost in year N
              </div>
              <p className="text-slate-400">
                Your PPA payment &times; 12, compounded by whichever
                escalator you select (0% or 3.5% — the only two contractual
                options on a new {BRAND.provider} PPA). No additional bill
                components are layered in — what you enter is what you pay.
              </p>
            </div>
            <div>
              <div className="font-semibold text-slate-100 mb-1.5">
                Estimated cumulative savings
              </div>
              <p className="text-slate-400">
                The difference between the {BRAND.utility} running total and
                the {BRAND.provider} running total at each year. The shaded
                area on the chart is the gap.
              </p>
            </div>
            <div>
              <div className="font-semibold text-slate-100 mb-1.5">
                Historical {BRAND.utilityShort} rate interpolation
              </div>
              <p className="text-slate-400">
                The look-back tool linearly interpolates between published
                anchor points: {SCE_RATE_ANCHORS.map((a) => a.label).join(
                  " → "
                )}. Exact monthly figures are available in {BRAND.utility}&apos;s
                historical tariff books.
              </p>
            </div>
            <div className="border-t border-white/10 pt-5">
              <div className="font-semibold text-slate-100 mb-2.5">
                Cited sources
              </div>
              <ul className="space-y-2 text-[13.5px]">
                {Object.values(SOURCES).map((s) => (
                  <li key={s.url}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-link"
                    >
                      {s.label}
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        className="ml-1.5 inline-block opacity-60"
                      >
                        <path
                          d="M3 1h6v6M9 1L1 9"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                        />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-white/10 pt-5 text-[13px] text-slate-500">
              <p className="font-semibold text-slate-300 mb-2">
                What this tool does not include
              </p>
              <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-600">
                <li>
                  Time-of-use rate differences within {BRAND.utility}&apos;s
                  tariff
                </li>
                <li>System production changes from weather or degradation</li>
                <li>
                  Federal commercial tax credit (Section 48E) — flagged for
                  verification before relying on it
                </li>
                <li>Home resale impact</li>
              </ul>
              <p className="mt-4">{DISCLAIMER_FULL}</p>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Q&A Modal */}
      {qaOpen && <QAModal onClose={() => setQaOpen(false)} />}

      {/* Why Rates Climb Modal */}
      {ratesOpen && <RatesModal onClose={() => setRatesOpen(false)} />}

      {/* 3-Way Comparison Modal */}
      {compareOpen && (
        <CompareModal
          onClose={() => setCompareOpen(false)}
          years={YEARS}
          edisonCumArr={edisonCumArr}
          ppa35Cum={ppa35Cum}
          ppa0Cum={ppa0Cum}
        />
      )}

      {/* Historical Look-Back Modal */}
      {lookbackOpen && <LookbackModal onClose={() => setLookbackOpen(false)} />}

      {/* Share Modal */}
      {shareOpen && (
        <ShareModal
          onClose={() => setShareOpen(false)}
          edisonBill={edBillNum}
          ppaPayment={ppaPayNum}
          edisonRate={edisonRate}
          ppaEsc={ppaEsc}
          totalSavings={total}
        />
      )}
    </main>
  );
}

/* ------------------------------- Components ----------------------------- */

function SavingsCard({ year, amount }: { year: number; amount: number }) {
  const ref = useBumpOnChange(amount, "bump");
  return (
    <div ref={ref} className="savings-card">
      <div className="card-year">Year {year}</div>
      <div className="card-amount">{fmt(amount)}</div>
    </div>
  );
}

function ModalShell({
  onClose,
  children,
  maxWidthClass = "max-w-xl",
}: {
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal-card rounded-2xl ${maxWidthClass} w-full p-6 md:p-8 relative max-h-[88vh] overflow-y-auto`}
      >
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 transition"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 1L13 13M13 1L1 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}

function QAModal({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => {
        const inCat = active === "all" || active === cat.id;
        if (!inCat) return false;
        if (!term) return true;
        return (
          item.q.toLowerCase().includes(term) ||
          item.a.toLowerCase().includes(term)
        );
      }),
    })).filter((cat) => cat.items.length > 0);
  }, [active, search]);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalCount = useMemo(
    () => CATEGORIES.reduce((s, c) => s + c.items.length, 0),
    []
  );

  return (
    <ModalShell onClose={onClose} maxWidthClass="max-w-3xl">
      <div className="eyebrow mb-3">For the homeowner</div>
      <h2 className="text-2xl md:text-[28px] font-semibold text-slate-50 mb-1 tracking-tight">
        Common questions
      </h2>
      <p className="text-slate-400 text-[14px] mb-6">
        Honest answers to the {totalCount} things customers ask most.
      </p>

      {/* Search */}
      <div className="relative mb-4">
        <SearchIcon />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions…"
          className="qa-search"
          autoFocus
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 -mx-1 px-1 no-scrollbar">
        <button
          className={`qa-chip ${active === "all" ? "active" : ""}`}
          onClick={() => setActive("all")}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`qa-chip ${active === cat.id ? "active" : ""}`}
            onClick={() => setActive(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Q&A list */}
      <div>
        {filtered.length === 0 && (
          <div className="text-center text-slate-500 py-12 text-sm">
            No questions match &ldquo;{search}&rdquo;.
          </div>
        )}
        {filtered.map((cat) => (
          <div key={cat.id}>
            {(active === "all" || search) && (
              <div className="qa-cat-label">{cat.label}</div>
            )}
            {cat.items.map((item, idx) => {
              const id = `${cat.id}-${idx}`;
              const isOpen = openIds.has(id);
              return (
                <div key={id} className="qa-item">
                  <button
                    onClick={() => toggle(id)}
                    className={`qa-question ${isOpen ? "expanded" : ""}`}
                    aria-expanded={isOpen}
                  >
                    <span>{item.q}</span>
                    <svg
                      className="qa-chev"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                    >
                      <path
                        d="M7 1V13M1 7H13"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="qa-answer">
                      <div className="qa-answer-inner">{item.a}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

function RatesModal({ onClose }: { onClose: () => void }) {
  const reasons: { h: string; b: string; src?: keyof typeof SOURCES }[] = [
    {
      h: "Wildfire liability and grid hardening",
      b: `Southern California ${BRAND.utility} has paid billions in settlements for past fires and is required by California (AB 1054 and CPUC orders) to underground distribution lines, expand vegetation management, and replace aging substations through the late 2020s. Those costs flow into rates.`,
      src: "sceGrc",
    },
    {
      h: "Data centers and AI",
      b: "California has one of the fastest-growing data center loads in the country. Bringing new generation and transmission online to serve AI infrastructure is a multi-decade investment spread across every ratepayer.",
      src: "cpucPao",
    },
    {
      h: "Electrification of everything",
      b: "EVs, induction cooking, and heat pumps are shifting energy from gas onto the electric grid. Per-home electricity demand is rising even as overall household energy efficiency improves.",
    },
    {
      h: "100% clean energy by 2045",
      b: "California's clean-energy mandate requires a massive buildout of transmission lines, utility-scale solar, and battery storage. The state recovers that cost from customers over time through rate cases.",
    },
    {
      h: "What the numbers have actually done",
      b: `${BRAND.utilityShort} residential average rates climbed about 110% over the past 10 years — from roughly $0.168/kWh in June 2016 to about $0.353/kWh in October 2025 (CPUC Public Advocates Office). The CPUC's 2025 General Rate Case authorizes additional base increases through 2027.`,
      src: "cpucPao",
    },
    {
      h: "Base vs. realized — be honest",
      b: `${BRAND.utility}'s 2025 GRC base bill impacts are modeled at roughly 2.7% / 2.6% / 2.7% for 2026–2028. Realized 2025 increases ran ~10–13% because wildfire surcharges, FERC transmission adjustments, and cost-recovery accounts layer on top of the base. The slider above lets you pick where to anchor your estimate.`,
      src: "sceGrc",
    },
  ];

  return (
    <ModalShell onClose={onClose} maxWidthClass="max-w-2xl">
      <div className="eyebrow mb-3">Rate context</div>
      <h2 className="text-2xl md:text-[28px] font-semibold text-slate-50 mb-2 tracking-tight">
        Why {BRAND.utility} rates keep climbing
      </h2>
      <p className="text-slate-400 text-[14.5px] leading-relaxed mb-6">
        California has structural reasons electricity costs keep rising. Even
        a conservative assumption still shows estimated savings — slide the
        rate to 3–4% to test.
      </p>

      <div className="space-y-5">
        {reasons.map((r, i) => (
          <div key={i} className="flex gap-4">
            <div className="reason-num">{i + 1}</div>
            <div className="flex-1">
              <div className="font-semibold text-slate-100 text-[15px] mb-1.5">
                {r.h}
              </div>
              <div className="text-slate-400 text-[14px] leading-relaxed">
                {r.b}
                {r.src ? (
                  <>
                    {" "}
                    <a
                      href={SOURCES[r.src].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-link text-[12.5px]"
                    >
                      {SOURCES[r.src].short}
                    </a>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7 pt-5 border-t border-white/10 text-slate-400 text-[13.5px] leading-relaxed">
        Want to be conservative? Slide the {BRAND.utility} rate down to 3 or
        4%. The comparison still favors solar in nearly every case — the PPA
        rate starts below today&apos;s bill and grows slower regardless.
      </div>
    </ModalShell>
  );
}

function CompareModal({
  onClose,
  years,
  edisonCumArr,
  ppa35Cum,
  ppa0Cum,
}: {
  onClose: () => void;
  years: number[];
  edisonCumArr: number[];
  ppa35Cum: number[];
  ppa0Cum: number[];
}) {
  const edisonTotal = edisonCumArr[24] ?? 0;
  const ppa35Total = ppa35Cum[24] ?? 0;
  const ppa0Total = ppa0Cum[24] ?? 0;
  const save35 = edisonTotal - ppa35Total;
  const save0 = edisonTotal - ppa0Total;

  const data = useMemo(
    () => ({
      labels: years,
      datasets: [
        {
          label: BRAND.utility,
          data: edisonCumArr,
          borderColor: "#F87171",
          backgroundColor: "rgba(248, 113, 113, 0)",
          borderWidth: 2.5,
          tension: 0.28,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#F87171",
          pointHoverBorderColor: "#0E1320",
          pointHoverBorderWidth: 3,
          fill: false as const,
          order: 1,
        },
        {
          label: `${BRAND.provider} · 3.5% escalator`,
          data: ppa35Cum,
          borderColor: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0)",
          borderWidth: 2.5,
          tension: 0.28,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#10B981",
          pointHoverBorderColor: "#0E1320",
          pointHoverBorderWidth: 3,
          fill: false as const,
          order: 2,
        },
        {
          label: `${BRAND.provider} · 0% escalator`,
          data: ppa0Cum,
          borderColor: "#5EEAD4",
          backgroundColor: "rgba(94, 234, 212, 0)",
          borderWidth: 2.5,
          borderDash: [6, 4],
          tension: 0.28,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#5EEAD4",
          pointHoverBorderColor: "#0E1320",
          pointHoverBorderWidth: 3,
          fill: false as const,
          order: 3,
        },
      ],
    }),
    [years, edisonCumArr, ppa35Cum, ppa0Cum]
  );

  const options = useMemo(
    () =>
      ({
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350, easing: "easeOutCubic" as const },
        interaction: { mode: "index" as const, intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(7, 9, 15, 0.96)",
            titleColor: "#F8FAFC",
            bodyColor: "#E5EAF2",
            padding: 12,
            borderColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
            cornerRadius: 10,
            titleFont: { weight: 600, size: 12 },
            bodyFont: { size: 12 },
            displayColors: true,
            boxPadding: 6,
            callbacks: {
              title: (items: any[]) => "Year " + items[0].label,
              label: (item: any) =>
                " " + item.dataset.label + ": " + fmt(item.parsed.y),
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "YEAR",
              color: "#64748B",
              font: { weight: 600 as const, size: 10 },
              padding: { top: 8 },
            },
            grid: { display: false },
            border: { color: "rgba(255,255,255,0.06)" },
            ticks: {
              autoSkip: true,
              maxTicksLimit: 8,
              color: "#64748B",
              font: { size: 11 },
            },
          },
          y: {
            grid: { color: "rgba(255,255,255,0.04)" },
            border: { display: false },
            ticks: {
              callback: (v: any) => fmt(Number(v)),
              color: "#64748B",
              font: { size: 11 },
              padding: 6,
            },
            beginAtZero: true,
          },
        },
      }) as const,
    []
  );

  return (
    <ModalShell onClose={onClose} maxWidthClass="max-w-3xl">
      <div className="eyebrow mb-3">Side by side</div>
      <h2 className="text-2xl md:text-[28px] font-semibold text-slate-50 mb-2 tracking-tight">
        3-way comparison
      </h2>
      <p className="text-slate-400 text-[14.5px] mb-5">
        Estimated cost paths for all three options over 25 years, based on
        the inputs you entered.
      </p>

      {/* Legend pills */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="cmp-legend">
          <span className="cmp-dot" style={{ background: "#F87171" }} />
          {BRAND.utility}
        </span>
        <span className="cmp-legend">
          <span className="cmp-dot" style={{ background: "#10B981" }} />
          {BRAND.provider} · 3.5%
        </span>
        <span className="cmp-legend">
          <span
            className="cmp-dot"
            style={{
              background: "transparent",
              border: "1.5px dashed #5EEAD4",
            }}
          />
          {BRAND.provider} · 0%
        </span>
      </div>

      {/* Chart */}
      <div className="cmp-chart-shell mb-6">
        <Line data={data} options={options} />
      </div>

      {/* 25-year totals */}
      <div className="qa-cat-label !pt-0 !pb-3">Estimated 25-year totals</div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <TotalsCard color="#F87171" label={BRAND.utility} amount={edisonTotal} />
        <TotalsCard
          color="#10B981"
          label={`${BRAND.provider} · 3.5%`}
          amount={ppa35Total}
        />
        <TotalsCard
          color="#5EEAD4"
          label={`${BRAND.provider} · 0%`}
          amount={ppa0Total}
        />
      </div>

      {/* Savings vs Utility */}
      <div className="qa-cat-label !pt-0 !pb-3">
        Estimated savings vs {BRAND.utility}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="cmp-save-row">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500 mb-1">
              If 3.5% PPA
            </div>
            <div className="cmp-save-amount">{fmt(save35)}</div>
          </div>
          <div className="text-[11px] text-slate-500 text-right leading-snug max-w-[120px]">
            over 25 years
          </div>
        </div>
        <div className="cmp-save-row">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500 mb-1">
              If 0% PPA
            </div>
            <div className="cmp-save-amount cmp-save-amount-light">
              {fmt(save0)}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 text-right leading-snug max-w-[120px]">
            over 25 years
          </div>
        </div>
      </div>

      <div className="mt-5 text-[12.5px] text-slate-500 leading-relaxed">
        Assumes the same starting monthly PPA payment in both scenarios. Real
        agreements with a 0% escalator sometimes start at a slightly higher
        monthly rate to lock in the flat curve. Estimates only — not a
        guarantee.
      </div>
    </ModalShell>
  );
}

function TotalsCard({
  color,
  label,
  amount,
}: {
  color: string;
  label: string;
  amount: number;
}) {
  return (
    <div className="cmp-total-card">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="cmp-dot"
          style={{ background: color, boxShadow: "none" }}
        />
        <div className="text-[10.5px] font-semibold tracking-[0.18em] uppercase text-slate-400">
          {label}
        </div>
      </div>
      <div className="cmp-total-amount" style={{ color }}>
        {fmt(amount)}
      </div>
    </div>
  );
}

function LookbackModal({ onClose }: { onClose: () => void }) {
  const [usage, setUsage] = useState<number | null>(750);
  const [unit, setUnit] = useState<"month" | "year">("month");
  const [yearsBack, setYearsBack] = useState(10);

  const usageNum = usage ?? 0;
  const annualKwh = unit === "month" ? usageNum * 12 : usageNum;

  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const thenYear = nowYear - yearsBack;

  const lastAnchor = SCE_RATE_ANCHORS[SCE_RATE_ANCHORS.length - 1];
  const nowRate = lastAnchor.rate;
  const thenRate = interpolateRate(thenYear, nowMonth);

  const thenCost = annualKwh * thenRate;
  const nowCost = annualKwh * nowRate;
  const delta = nowCost - thenCost;
  const pctChange =
    thenRate > 0 ? ((nowRate - thenRate) / thenRate) * 100 : 0;

  return (
    <ModalShell onClose={onClose} maxWidthClass="max-w-xl">
      <div className="eyebrow mb-3">Historical look-back</div>
      <h2 className="text-2xl md:text-[28px] font-semibold text-slate-50 mb-2 tracking-tight">
        What would this have cost {yearsBack} years ago?
      </h2>
      <p className="text-slate-400 text-[14.5px] mb-6">
        Using your usage and {BRAND.utilityShort}&apos;s actual published
        residential average rates — not a projection, a factual comparison.
      </p>

      {/* Inputs */}
      <div className="space-y-5 mb-6">
        <div>
          <div className="input-label mb-2.5">Your usage</div>
          <div className="flex gap-3 flex-wrap">
            <div className="input-shell relative flex-1 min-w-[180px]">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={usage ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") return setUsage(null);
                  const n = Number(v);
                  if (!isNaN(n) && n >= 0) setUsage(n);
                }}
                onFocus={(e) => e.currentTarget.select()}
                className="lookback-input"
                aria-label="Electricity usage"
              />
              <span className="lookback-unit">kWh</span>
            </div>
            <div className="seg lookback-seg">
              <button
                onClick={() => setUnit("month")}
                className={`seg-btn ${unit === "month" ? "active" : ""}`}
                aria-pressed={unit === "month"}
              >
                /mo
              </button>
              <button
                onClick={() => setUnit("year")}
                className={`seg-btn ${unit === "year" ? "active" : ""}`}
                aria-pressed={unit === "year"}
              >
                /yr
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-3">
            <div className="input-label">Years back</div>
            <div className="slider-value">
              {yearsBack}{" "}
              <span className="text-slate-500 font-medium text-base">
                {yearsBack === 1 ? "year" : "years"}
              </span>
            </div>
          </div>
          <input
            type="range"
            min={1}
            max={LOOKBACK_MAX_YEARS}
            step={1}
            value={yearsBack}
            onChange={(e) => setYearsBack(Number(e.target.value))}
            aria-label="Years back"
          />
          <div className="flex justify-between text-[11px] text-slate-600 mt-2.5 font-medium">
            <span>1 yr</span>
            <span className="text-slate-500">
              capped at {LOOKBACK_MAX_YEARS}
            </span>
            <span>{LOOKBACK_MAX_YEARS} yrs</span>
          </div>
        </div>
      </div>

      {/* Result panel */}
      <div className="lookback-result">
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500 mb-1.5">
              Cost {yearsBack} yr ago
            </div>
            <div className="lookback-amount-then">{fmt(thenCost)}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              at ${thenRate.toFixed(3)}/kWh
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500 mb-1.5">
              Cost today
            </div>
            <div className="lookback-amount-now">{fmt(nowCost)}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              at ${nowRate.toFixed(3)}/kWh
            </div>
          </div>
        </div>
        <div className="hairline mb-5" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500 mb-1.5">
              Annual cost change
            </div>
            <div className="lookback-delta">
              {delta >= 0 ? "+" : ""}
              {fmt(delta)}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500 mb-1.5">
              Rate change
            </div>
            <div className="lookback-delta">
              {pctChange >= 0 ? "+" : ""}
              {pctChange.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-[12.5px] text-slate-500 leading-relaxed">
        Based on {BRAND.utilityShort}&apos;s published residential average
        rates from the{" "}
        <a
          href={SOURCES.cpucPao.url}
          target="_blank"
          rel="noopener noreferrer"
          className="source-link"
        >
          {SOURCES.cpucPao.short}
        </a>
        . The current value uses the most recent published anchor (
        {lastAnchor.label}); historical values are linearly interpolated
        between anchor points:{" "}
        {SCE_RATE_ANCHORS.map((a) => a.label).join(" → ")}. For exact monthly
        values see{" "}
        <a
          href={SOURCES.sceTariff.url}
          target="_blank"
          rel="noopener noreferrer"
          className="source-link"
        >
          {SOURCES.sceTariff.short}
        </a>
        . Look-back is capped at {LOOKBACK_MAX_YEARS} years.
      </div>
    </ModalShell>
  );
}

function ShareModal({
  onClose,
  edisonBill,
  ppaPayment,
  edisonRate,
  ppaEsc,
  totalSavings,
}: {
  onClose: () => void;
  edisonBill: number;
  ppaPayment: number;
  edisonRate: number;
  ppaEsc: number;
  totalSavings: number;
}) {
  const [copied, setCopied] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShareUrl(window.location.href);
    setHasNativeShare(
      typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
    );
  }, []);

  const summary =
    `${BRAND.utility} vs ${BRAND.provider} — estimated 25-year savings: ${fmt(totalSavings)}.\n\n` +
    `Inputs:\n` +
    `  • ${BRAND.utility} bill: $${edisonBill}/mo\n` +
    `  • ${BRAND.provider} PPA: $${ppaPayment}/mo\n` +
    `  • ${BRAND.utility} rate increase: ${edisonRate.toFixed(1)}%/yr\n` +
    `  • PPA escalator: ${ppaEsc}%/yr\n\n` +
    `Estimates only — not a guarantee of savings.`;

  const smsBody = `${summary}\n\n${shareUrl}`;
  const smsHref = `sms:?&body=${encodeURIComponent(smsBody)}`;

  const copyLink = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // ignore
    }
  };

  const nativeShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) return;
    try {
      await navigator.share({
        title: `${BRAND.utility} vs ${BRAND.provider} — estimated savings`,
        text: summary,
        url: shareUrl,
      });
    } catch {
      // user dismissed — ignore
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidthClass="max-w-md">
      <div className="eyebrow mb-3">Leave-behind</div>
      <h2 className="text-2xl font-semibold text-slate-50 mb-2 tracking-tight">
        Take your numbers with you
      </h2>
      <p className="text-slate-400 text-[14px] mb-5">
        A direct link back to this exact scenario. No account, no signup.
      </p>

      <div className="share-summary mb-5">
        <pre className="whitespace-pre-wrap text-[13px] text-slate-300 font-sans leading-relaxed m-0">
          {summary}
        </pre>
      </div>

      <div className="space-y-2.5">
        {hasNativeShare ? (
          <button
            onClick={nativeShare}
            className="share-btn share-btn-primary"
          >
            <ShareIcon />
            Share
          </button>
        ) : null}
        <a href={smsHref} className="share-btn">
          <SmsIcon />
          Text me my numbers
        </a>
        <button
          onClick={copyLink}
          className="share-btn"
          disabled={!shareUrl}
          aria-live="polite"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>

      <div className="mt-5 text-[12px] text-slate-500 leading-relaxed">
        Estimates only — your signed agreement governs actual payments.
      </div>
    </ModalShell>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 7v4.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V7"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M7 1v8M4 3.5L7 1l3 2.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SmsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M2 3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6.5L4 12.5V10H3a1 1 0 0 1-1-1V3z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect
        x="3.5"
        y="3.5"
        width="7"
        height="8"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M5.5 3V2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M2.5 7.5L5.5 10.5L11.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
    >
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M11 11L14 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
