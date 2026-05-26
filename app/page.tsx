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
        a: "No. This is a Power Purchase Agreement (PPA). Sunrun owns and maintains the system; you pay only for the power it produces, at a rate set below your current Edison rate. There is no upfront cost.",
      },
      {
        q: "How does this actually save me money?",
        a: "Your Sunrun rate is locked in and rises by a small, contractually defined escalator each year — typically 0% or 2.9%. Edison's rates have historically risen around 6% per year. The gap compounds over time. The number at the top of this page is that compounded difference over 25 years.",
      },
      {
        q: "What about cloudy days or nighttime?",
        a: "You stay connected to the grid. When the panels aren't producing enough, you pull from Edison as usual. The PPA only charges you for the energy the panels actually generate.",
      },
      {
        q: "Is there really nothing down?",
        a: "Correct. Standard Sunrun PPAs are $0 down. Your first payment begins only after the system is installed, inspected by the city, and turned on.",
      },
    ],
  },
  {
    id: "cost",
    label: "Cost & savings",
    items: [
      {
        q: "Why not just buy panels outright?",
        a: "Purchasing offers the best long-term return if you have the cash (typically $25k–$40k) and can use the 30% federal tax credit. The PPA exists for homeowners who'd rather skip the upfront cost and start saving immediately. Many people compare both — there's no wrong answer.",
      },
      {
        q: "What if Edison's rates don't keep going up?",
        a: "Move the rate-increase slider above to test it. Even at 3–4% annual increases, most homes still come out ahead. Edison rates have climbed steadily for over a decade, but you can model any assumption you want here.",
      },
      {
        q: "Will my Sunrun payment go up?",
        a: "Yes — by the escalator written into your agreement, typically 0% or 2.9%. Whatever it is, it's locked in writing and is far smaller than Edison's annual increases.",
      },
      {
        q: "What's the catch?",
        a: "The honest tradeoff: you don't own the panels, you don't get the 30% federal tax credit, and you commit for 20–25 years (the agreement transfers if you move). In exchange, you pay nothing upfront and lock in a lower rate for the life of the system.",
      },
    ],
  },
  {
    id: "move",
    label: "Moving & resale",
    items: [
      {
        q: "What if I sell my home?",
        a: "The agreement transfers to the new owner — Sunrun handles the paperwork at no cost to you. Most buyers view the below-Edison rate as a benefit.",
      },
      {
        q: "Will solar hurt my resale value?",
        a: "Independent studies of California homes have shown solar homes — both owned and leased — generally sell for the same or more than comparable non-solar homes. The new owner inherits the same low rate you locked in.",
      },
      {
        q: "What if I move in just a few years?",
        a: "Three options when you sell: transfer the agreement to the buyer (most common), prepay the remainder, or in some cases relocate the system. Sunrun handles the transfer process.",
      },
    ],
  },
  {
    id: "maintenance",
    label: "Maintenance",
    items: [
      {
        q: "Who fixes things if they break?",
        a: "Sunrun. Because they own the system, they cover all repairs, inverter replacement, system monitoring, and roof-penetration warranties for the entire 25 years. No out-of-pocket cost to you.",
      },
      {
        q: "What about storm or hail damage?",
        a: "Panels are tested to industry hail and wind standards. Major weather damage is covered by your homeowner's insurance; Sunrun coordinates repairs on the system itself.",
      },
      {
        q: "Don't panels lose efficiency over time?",
        a: "Yes — about 0.5% per year. Sunrun's production guarantee covers underperformance, so if the system produces less than promised, they compensate the difference.",
      },
    ],
  },
  {
    id: "company",
    label: "The company",
    items: [
      {
        q: "What if Sunrun goes out of business?",
        a: "Sunrun is publicly traded on NASDAQ (ticker: RUN). If the company were ever sold or restructured, your agreement would transfer to the new operator. The panels and your locked rate would not change.",
      },
      {
        q: "Why do you need my Edison bill?",
        a: "Only to model real numbers using your actual usage. Nothing is sent anywhere — this tool runs entirely on this device and stores no customer information.",
      },
      {
        q: "Why is the escalator 2.9% by default?",
        a: "That's Sunrun's standard PPA escalator. Some agreements are offered at 0% — adjust the slider above to match the specific offer in front of you.",
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
  const [edisonBill, setEdisonBill] = useState(250);
  const [ppaPayment, setPpaPayment] = useState(180);
  const [edisonRate, setEdisonRate] = useState(6);
  const [ppaEsc, setPpaEsc] = useState(2.9);
  const [modalOpen, setModalOpen] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);

  const { edisonCumArr, ppaCumArr } = useMemo(() => {
    const ed: number[] = [];
    const sr: number[] = [];
    let edCum = 0;
    let srCum = 0;
    for (let i = 0; i < 25; i++) {
      const y = i + 1;
      edCum += edisonBill * 12 * Math.pow(1 + edisonRate / 100, y - 1);
      srCum += ppaPayment * 12 * Math.pow(1 + ppaEsc / 100, y - 1);
      ed.push(edCum);
      sr.push(srCum);
    }
    return { edisonCumArr: ed, ppaCumArr: sr };
  }, [edisonBill, ppaPayment, edisonRate, ppaEsc]);

  const savingsAt = (y: number) => edisonCumArr[y - 1] - ppaCumArr[y - 1];
  const total = savingsAt(25);
  const edisonTotal = edisonCumArr[24];
  const sunrunTotal = ppaCumArr[24];

  const headlineRef = useBumpOnChange(total, "pulse");

  useEffect(() => {
    if (!modalOpen && !qaOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalOpen(false);
        setQaOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [modalOpen, qaOpen]);

  const chartData = useMemo(
    () => ({
      labels: YEARS,
      datasets: [
        {
          label: "Edison",
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
          label: "Sunrun",
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
                  items.find((i) => i.dataset.label === "Edison")?.parsed.y ??
                  0;
                const sr =
                  items.find((i) => i.dataset.label === "Sunrun")?.parsed.y ??
                  0;
                return "\n Savings: " + fmt(ed - sr);
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
      <div className="flex items-center justify-between mb-12 md:mb-16">
        <div className="text-[13px] font-semibold tracking-[0.18em] uppercase text-slate-300">
          Solar <span className="text-slate-600 mx-1.5">/</span> Edison
        </div>
        <button onClick={() => setQaOpen(true)} className="btn-ghost">
          <QuestionIcon />
          <span>Common Questions</span>
        </button>
      </div>

      {/* Headline */}
      <section className="text-center mb-12 md:mb-16">
        <div className="eyebrow mb-5">Projected 25-Year Savings</div>
        <div ref={headlineRef} className="headline">
          {fmt(total)}
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <div className="stat-pill">
            <span className="dot-red" />
            <span className="label">Edison</span>
            <span className="value">{fmt(edisonTotal)}</span>
          </div>
          <div className="text-slate-600 text-xs font-semibold tracking-wider uppercase hidden sm:block">
            vs
          </div>
          <div className="stat-pill">
            <span className="dot-green" />
            <span className="label">Sunrun</span>
            <span className="value">{fmt(sunrunTotal)}</span>
          </div>
        </div>
      </section>

      {/* Inputs */}
      <section className="panel p-5 md:p-7 mb-6 md:mb-7">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-7">
          <div>
            <div className="input-label mb-2.5">Current Edison bill</div>
            <div className="input-shell relative">
              <span className="money-prefix">$</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={1}
                value={edisonBill}
                onChange={(e) =>
                  setEdisonBill(Math.max(0, Number(e.target.value) || 0))
                }
                onFocus={(e) => e.currentTarget.select()}
                className="money-input"
              />
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium tracking-wide">
              per month
            </div>
          </div>

          <div>
            <div className="input-label mb-2.5">Sunrun PPA payment</div>
            <div className="input-shell relative">
              <span className="money-prefix">$</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={1}
                value={ppaPayment}
                onChange={(e) =>
                  setPpaPayment(Math.max(0, Number(e.target.value) || 0))
                }
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
              <div className="input-label">Edison rate increase</div>
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
            />
            <div className="flex justify-between text-[11px] text-slate-600 mt-2.5 font-medium">
              <span>3%</span>
              <span className="text-slate-500">per year</span>
              <span>10%</span>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-3">
              <div className="input-label">PPA annual escalator</div>
              <div className="slider-value">
                {ppaEsc.toFixed(1)}
                <span className="text-slate-500 font-medium">%</span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={3.5}
              step={0.1}
              value={ppaEsc}
              onChange={(e) => setPpaEsc(Number(e.target.value))}
            />
            <div className="flex justify-between text-[11px] text-slate-600 mt-2.5 font-medium">
              <span>0%</span>
              <span className="text-slate-500">per year</span>
              <span>3.5%</span>
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
              Edison
            </span>
            <span className="text-slate-300 font-medium flex items-center gap-2">
              <span className="dot-green" />
              Sunrun
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

      {/* Footer */}
      <footer className="flex items-center justify-center gap-6 pb-8 text-[13px] text-slate-500">
        <button
          onClick={() => setModalOpen(true)}
          className="hover:text-slate-200 transition"
        >
          Assumptions
        </button>
        <span className="text-slate-700">·</span>
        <button
          onClick={() => setQaOpen(true)}
          className="hover:text-slate-200 transition"
        >
          Common questions
        </button>
      </footer>

      {/* Assumptions Modal */}
      {modalOpen && (
        <ModalShell onClose={() => setModalOpen(false)} maxWidthClass="max-w-xl">
          <div className="eyebrow mb-3">Methodology</div>
          <h2 className="text-2xl md:text-[28px] font-semibold text-slate-50 mb-5 tracking-tight">
            How the math works
          </h2>
          <div className="space-y-5 text-slate-300 leading-relaxed text-[15px]">
            <p>
              We model each year of cost independently, then add them up to
              get a running total.
            </p>
            <div>
              <div className="font-semibold text-slate-100 mb-1.5">
                Edison cost in year N
              </div>
              <p className="text-slate-400">
                Your current monthly bill &times; 12, then compounded by the
                Edison rate increase for each year. A $250/mo bill with 6%
                annual increases costs $3,000 in year 1 and roughly $3,180 in
                year 2.
              </p>
            </div>
            <div>
              <div className="font-semibold text-slate-100 mb-1.5">
                Sunrun PPA cost in year N
              </div>
              <p className="text-slate-400">
                Your locked-in PPA payment &times; 12, compounded by the PPA
                escalator. Sunrun&apos;s standard escalator is 2.9%; many
                agreements are offered at 0%. Adjust the slider to match the
                offer in front of you.
              </p>
            </div>
            <div>
              <div className="font-semibold text-slate-100 mb-1.5">
                Cumulative savings
              </div>
              <p className="text-slate-400">
                The difference between the running totals at each year. This
                is the green area on the chart.
              </p>
            </div>
            <div className="border-t border-white/10 pt-5 text-[13px] text-slate-500">
              <p className="font-semibold text-slate-300 mb-2">
                What this tool does not include
              </p>
              <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-600">
                <li>Time-of-use rate differences or NEM credits</li>
                <li>System production changes from weather or degradation</li>
                <li>Federal tax credits (PPAs are not owned by the customer)</li>
                <li>Home resale impact</li>
              </ul>
              <p className="mt-4">
                Numbers are illustrative — your signed agreement governs
                actual payments.
              </p>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Q&A Modal */}
      {qaOpen && <QAModal onClose={() => setQaOpen(false)} />}
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

function QuestionIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle
        cx="7"
        cy="7"
        r="6"
        stroke="currentColor"
        strokeWidth="1.3"
        opacity="0.7"
      />
      <path
        d="M5.25 5.2c0-.97.78-1.7 1.75-1.7s1.75.73 1.75 1.7c0 .54-.27 1-.71 1.27-.45.28-1.04.61-1.04 1.23v.45"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="7" cy="10.2" r="0.7" fill="currentColor" />
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
