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
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif';
ChartJS.defaults.font.size = 13;
ChartJS.defaults.color = "#475569";

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
          borderColor: "#D32F2F",
          backgroundColor: "rgba(211, 47, 47, 0)",
          borderWidth: 3,
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#D32F2F",
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 2,
          fill: false as const,
          order: 1,
        },
        {
          label: "Sunrun",
          data: ppaCumArr,
          borderColor: "#00A651",
          backgroundColor: "rgba(0, 166, 81, 0.18)",
          borderWidth: 3,
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#00A651",
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 2,
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
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleColor: "#fff",
            bodyColor: "#fff",
            padding: 12,
            borderColor: "rgba(255,255,255,0.05)",
            borderWidth: 1,
            cornerRadius: 10,
            callbacks: {
              title: (items: any[]) => "Year " + items[0].label,
              label: (item: any) =>
                " " + item.dataset.label + ": " + fmt(item.parsed.y),
              afterBody: (items: any[]) => {
                if (items.length < 2) return "";
                const ed =
                  items.find((i) => i.dataset.label === "Edison")?.parsed.y ?? 0;
                const sr =
                  items.find((i) => i.dataset.label === "Sunrun")?.parsed.y ?? 0;
                return "\n Savings: " + fmt(ed - sr);
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Year",
              color: "#64748b",
              font: { weight: 600 as const },
            },
            grid: { display: false },
            ticks: { autoSkip: true, maxTicksLimit: 13 },
          },
          y: {
            title: {
              display: true,
              text: "Cumulative Cost",
              color: "#64748b",
              font: { weight: 600 as const },
            },
            grid: { color: "#f1f5f9" },
            ticks: { callback: (v: any) => fmt(Number(v)) },
            beginAtZero: true,
          },
        },
      }) as const,
    []
  );

  return (
    <main className="max-w-[1400px] mx-auto px-5 md:px-8 py-6 md:py-8 min-h-screen">
      {/* Headline */}
      <section className="text-center mb-6 md:mb-8">
        <div className="text-slate-500 uppercase tracking-widest text-xs md:text-sm font-semibold mb-2">
          Total 25-Year Savings
        </div>
        <div ref={headlineRef} className="headline">
          {fmt(total)}
        </div>
      </section>

      {/* Inputs */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-7">
        <div>
          <div className="input-label">Current Edison Bill</div>
          <div className="relative">
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
          <div className="text-xs text-slate-500 mt-2">Monthly</div>
        </div>

        <div>
          <div className="input-label">Sunrun PPA Payment</div>
          <div className="relative">
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
          <div className="text-xs text-slate-500 mt-2">Monthly</div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="input-label !mb-0">Edison Rate Increase</div>
            <div className="slider-value">
              <span>{edisonRate.toFixed(1)}</span>%
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
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>3%</span>
            <span>per year</span>
            <span>10%</span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="input-label !mb-0">PPA Annual Escalator</div>
            <div className="slider-value">
              <span>{ppaEsc.toFixed(1)}</span>%
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
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>0%</span>
            <span>per year</span>
            <span>3.5%</span>
          </div>
        </div>
      </section>

      {/* Chart */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 mb-7">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="text-sm md:text-base font-semibold text-slate-700">
            Cumulative Cost Over 25 Years
          </div>
          <div className="flex items-center gap-5 text-sm">
            <span className="text-slate-700 font-medium">
              <span
                className="legend-dot"
                style={{ background: "#D32F2F" }}
              ></span>
              Edison
            </span>
            <span className="text-slate-700 font-medium">
              <span
                className="legend-dot"
                style={{ background: "#00A651" }}
              ></span>
              Sunrun
            </span>
            <span className="text-slate-700 font-medium hidden sm:inline">
              <span
                className="legend-dot"
                style={{
                  background: "rgba(0, 166, 81, 0.18)",
                  border: "1px solid #00A651",
                }}
              ></span>
              Savings
            </span>
          </div>
        </div>
        <div className="chart-shell">
          <Line data={chartData} options={chartOptions} />
        </div>
      </section>

      {/* Savings Cards */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-8">
        {CARD_YEARS.map((y) => (
          <SavingsCard key={y} year={y} amount={savingsAt(y)} />
        ))}
      </section>

      {/* Footer */}
      <footer className="text-center pb-6">
        <button
          onClick={() => setModalOpen(true)}
          className="text-sm text-slate-500 hover:text-slate-800 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-600 transition"
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
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              aria-label="Close"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-2xl leading-none"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              How the math works
            </h2>
            <div className="space-y-4 text-slate-700 leading-relaxed text-[15px]">
              <p>
                We model each year of cost independently, then add them up to
                get a running total.
              </p>
              <div>
                <div className="font-semibold text-slate-900 mb-1">
                  Edison cost in year N
                </div>
                <p>
                  Your current monthly bill &times; 12, then compounded by the
                  Edison rate increase for each year you&apos;re a customer. So
                  a $250/mo bill with 6% annual increases costs $3,000 in year
                  1 and roughly $3,180 in year 2.
                </p>
              </div>
              <div>
                <div className="font-semibold text-slate-900 mb-1">
                  Sunrun PPA cost in year N
                </div>
                <p>
                  Your locked-in PPA payment &times; 12, compounded by the PPA
                  escalator. Sunrun&apos;s standard escalator is 2.9%, but many
                  agreements offer 0% — adjust the slider to match the offer on
                  the table.
                </p>
              </div>
              <div>
                <div className="font-semibold text-slate-900 mb-1">
                  Cumulative savings
                </div>
                <p>
                  The difference between the running total of Edison costs and
                  the running total of PPA costs at each year. This is what
                  fills the green area on the chart.
                </p>
              </div>
              <div className="border-t border-slate-200 pt-4 text-sm text-slate-500">
                <p className="font-semibold text-slate-700 mb-1">
                  What this tool does not include
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Time-of-use rate differences or NEM credits</li>
                  <li>System production changes due to weather or degradation</li>
                  <li>Federal tax credits (PPAs are not owned by the customer)</li>
                  <li>Home resale impact</li>
                </ul>
                <p className="mt-3">
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
    <div ref={ref} className="card">
      <div className="card-year">Year {year}</div>
      <div className="card-amount">{fmt(amount)}</div>
    </div>
  );
}
