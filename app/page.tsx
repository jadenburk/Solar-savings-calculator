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

export default function Page() {
  const [edisonBill, setEdisonBill] = useState(250);
  const [ppaPayment, setPpaPayment] = useState(180);
  const [edisonRate, setEdisonRate] = useState(6);
  const [ppaEsc, setPpaEsc] = useState(2.9);
  const [modalOpen, setModalOpen] = useState(false);

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
    if (!modalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [modalOpen]);

  const chartData = useMemo(
    () => ({
      labels: YEARS,
      datasets: [
        {
          label: "Edison",
          data: edisonCumArr,
          borderColor: "#FB7185",
          backgroundColor: "rgba(251, 113, 133, 0)",
          borderWidth: 3,
          tension: 0.28,
          pointRadius: 0,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: "#FB7185",
          pointHoverBorderColor: "#0F1626",
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
            g.addColorStop(0, "rgba(16, 185, 129, 0.05)");
            g.addColorStop(0.6, "rgba(16, 185, 129, 0.22)");
            g.addColorStop(1, "rgba(16, 185, 129, 0.35)");
            return g;
          },
          borderWidth: 3,
          tension: 0.28,
          pointRadius: 0,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: "#10B981",
          pointHoverBorderColor: "#0F1626",
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
            backgroundColor: "rgba(7, 10, 20, 0.96)",
            titleColor: "#F1F5F9",
            bodyColor: "#F1F5F9",
            padding: 14,
            borderColor: "rgba(255,255,255,0.10)",
            borderWidth: 1,
            cornerRadius: 12,
            titleFont: { weight: 700, size: 13 },
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
              font: { weight: 700 as const, size: 11 },
              padding: { top: 10 },
            },
            grid: { display: false },
            border: { color: "rgba(255,255,255,0.08)" },
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
              font: { weight: 700 as const, size: 11 },
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
    <main className="max-w-[1400px] mx-auto px-5 md:px-8 py-8 md:py-12 min-h-screen">
      {/* Top mark */}
      <div className="flex items-center justify-between mb-10 md:mb-14">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
          <div className="text-[13px] font-semibold tracking-[0.18em] uppercase text-slate-300">
            Solar vs Edison
          </div>
        </div>
        <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500 hidden sm:block">
          25-Year Projection
        </div>
      </div>

      {/* Headline */}
      <section className="text-center mb-10 md:mb-14">
        <div className="eyebrow mb-4">Your 25-Year Savings</div>
        <div className="headline-wrap">
          <div ref={headlineRef} className="headline">
            {fmt(total)}
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <div className="stat-pill">
            <span className="dot-red" />
            <span className="label">Edison</span>
            <span className="value">{fmt(edisonTotal)}</span>
          </div>
          <div className="text-slate-600 text-sm font-medium hidden sm:block">
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
      <section className="panel p-5 md:p-7 mb-7 md:mb-8">
        <div className="flex items-center justify-between mb-5">
          <div className="text-[15px] font-semibold text-slate-200">
            Your Numbers
          </div>
          <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500">
            Adjust live
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          <div>
            <div className="input-label mb-2.5">Current Edison Bill</div>
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
            <div className="text-[11px] text-slate-500 mt-2 font-medium tracking-wide uppercase">
              per month
            </div>
          </div>

          <div>
            <div className="input-label mb-2.5">Sunrun PPA Payment</div>
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
            <div className="text-[11px] text-slate-500 mt-2 font-medium tracking-wide uppercase">
              per month
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-3">
              <div className="input-label">Edison Rate Increase</div>
              <div className="slider-value">
                {edisonRate.toFixed(1)}
                <span className="text-slate-500 font-semibold">%</span>
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
            <div className="flex justify-between text-[11px] text-slate-600 mt-2.5 font-medium tracking-wide uppercase">
              <span>3%</span>
              <span className="text-slate-500">per year</span>
              <span>10%</span>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-3">
              <div className="input-label">PPA Annual Escalator</div>
              <div className="slider-value">
                {ppaEsc.toFixed(1)}
                <span className="text-slate-500 font-semibold">%</span>
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
            <div className="flex justify-between text-[11px] text-slate-600 mt-2.5 font-medium tracking-wide uppercase">
              <span>0%</span>
              <span className="text-slate-500">per year</span>
              <span>3.5%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Chart */}
      <section className="panel p-5 md:p-7 mb-7 md:mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <div className="text-[15px] font-semibold text-slate-200">
              Cumulative Cost Over 25 Years
            </div>
            <div className="text-[12px] text-slate-500 mt-0.5">
              The green area is what stays in your pocket
            </div>
          </div>
          <div className="flex items-center gap-5 text-[13px]">
            <span className="text-slate-300 font-semibold">
              <span
                className="legend-dot"
                style={{
                  background: "#FB7185",
                  boxShadow: "0 0 10px rgba(251, 113, 133, 0.5)",
                }}
              />
              Edison
            </span>
            <span className="text-slate-300 font-semibold">
              <span
                className="legend-dot"
                style={{
                  background: "#10B981",
                  boxShadow: "0 0 10px rgba(16, 185, 129, 0.5)",
                }}
              />
              Sunrun
            </span>
            <span className="text-slate-300 font-semibold hidden sm:inline">
              <span
                className="legend-dot"
                style={{
                  background: "rgba(16, 185, 129, 0.25)",
                  border: "1px solid rgba(16, 185, 129, 0.6)",
                }}
              />
              Savings
            </span>
          </div>
        </div>
        <div className="chart-shell">
          <Line data={chartData} options={chartOptions} />
        </div>
      </section>

      {/* Savings Cards */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-[11px] font-bold tracking-[0.22em] uppercase text-slate-400">
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
      <footer className="text-center pb-8">
        <button
          onClick={() => setModalOpen(true)}
          className="text-[13px] text-slate-500 hover:text-slate-200 underline underline-offset-4 decoration-slate-700 hover:decoration-slate-400 transition"
        >
          Assumptions &amp; methodology
        </button>
      </footer>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="modal-card rounded-2xl max-w-xl w-full p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              aria-label="Close"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 text-2xl leading-none w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5 transition"
            >
              &times;
            </button>
            <div className="eyebrow mb-3">Transparency</div>
            <h2 className="text-2xl md:text-[28px] font-bold text-slate-100 mb-5 tracking-tight">
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
                  Edison rate increase for each year you&apos;re a customer.
                  So a $250/mo bill with 6% annual increases costs $3,000 in
                  year 1 and roughly $3,180 in year 2.
                </p>
              </div>
              <div>
                <div className="font-semibold text-slate-100 mb-1.5">
                  Sunrun PPA cost in year N
                </div>
                <p className="text-slate-400">
                  Your locked-in PPA payment &times; 12, compounded by the PPA
                  escalator. Sunrun&apos;s standard escalator is 2.9%, but
                  many agreements offer 0% — adjust the slider to match the
                  offer on the table.
                </p>
              </div>
              <div>
                <div className="font-semibold text-slate-100 mb-1.5">
                  Cumulative savings
                </div>
                <p className="text-slate-400">
                  The difference between the running total of Edison costs and
                  the running total of PPA costs at each year. This is what
                  fills the green area on the chart.
                </p>
              </div>
              <div className="border-t border-white/10 pt-5 text-[13px] text-slate-500">
                <p className="font-semibold text-slate-300 mb-2">
                  What this tool does not include
                </p>
                <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-600">
                  <li>Time-of-use rate differences or NEM credits</li>
                  <li>System production changes due to weather or degradation</li>
                  <li>Federal tax credits (PPAs are not owned by the customer)</li>
                  <li>Home resale impact</li>
                </ul>
                <p className="mt-4">
                  Numbers are illustrative — your signed agreement governs
                  actual payments.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SavingsCard({ year, amount }: { year: number; amount: number }) {
  const ref = useBumpOnChange(amount, "bump");
  return (
    <div ref={ref} className="savings-card">
      <div className="card-year">Year {year}</div>
      <div className="card-amount">{fmt(amount)}</div>
    </div>
  );
}
