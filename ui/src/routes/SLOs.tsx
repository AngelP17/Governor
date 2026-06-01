import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartLine, ClockClockwise } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { ApiOfflineState, LoadingState } from "../components/shared/States";
import { SectionHeader } from "../components/shared/SectionHeader";
import { StatusBadge } from "../components/shared/StatusBadge";
import { api } from "../lib/api";
import { demoSLOs } from "../lib/demo-data";
import type { SLOTimeSeries, TimeRange } from "../lib/types";

interface SLOItem {
  name: string;
  target: string;
  current: string;
  status: boolean;
  why: string;
  data: number[];
}

const RANGES: { id: TimeRange; label: string }[] = [
  { id: "1h", label: "Last 1h" },
  { id: "24h", label: "Last 24h" },
  { id: "7d", label: "Last 7d" },
];

const tooltipStyle = { background: "#0D1117", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 12, fontSize: 12 } as const;

export function SLOs() {
  const [slos, setSlos] = useState<SLOItem[]>(demoSLOs);
  const [mode, setMode] = useState<"live" | "demo">("demo");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>("24h");
  const [series, setSeries] = useState<SLOTimeSeries | null>(null);
  const [seriesLoading, setSeriesLoading] = useState(false);

  useEffect(() => {
    api.slos().then((result) => {
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        setSlos(result.data);
      }
      setMode(result.mode);
      setError(result.error);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSeriesLoading(true);
    api.sloTimeSeries(range).then((res) => {
      if (!cancelled) {
        setSeries(res.data);
        setSeriesLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [range]);

  if (loading) return <LoadingState />;

  const latest = series && series.points.length > 0 ? series.points[series.points.length - 1] : undefined;

  return (
    <div className="mx-auto max-w-[1400px]">
      <SectionHeader
        eyebrow="SLO and Error Budget"
        title="Reliability contract"
        description="These indicators keep the demo tied to SRE outcomes: reachability, recovery speed, correctness, and responsiveness."
      />
      {error ? <div className="mb-5"><ApiOfflineState /></div> : null}

      <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel/80 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <ChartLine size={18} className="text-sky-200" />
          <span>Trend window</span>
          <StatusBadge status="observing">{String(mode).toUpperCase()}</StatusBadge>
        </div>
        <div className="inline-flex rounded-xl border border-line bg-slate-950/45 p-1" role="tablist" aria-label="SLO trend time range">
          {RANGES.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={range === option.id}
              onClick={() => setRange(option.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${range === option.id ? "bg-sky-300/20 text-sky-100" : "text-slate-400 hover:text-white"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {slos.map((slo) => (
          <article key={slo.name} className="rounded-2xl border border-line bg-panel/80 p-5">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-white">{slo.name}</h2>
              <StatusBadge status={slo.status} />
            </div>
            <p className="mt-4 font-mono text-3xl font-semibold text-white">{slo.current}</p>
            <p className="mt-2 text-sm text-slate-500">Target {slo.target}</p>
            <div className="mt-5 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={slo.data.map((value, index) => ({ index, value }))}>
                  <XAxis dataKey="index" hide />
                  <YAxis hide domain={["dataMin", "dataMax"]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="value" stroke="#38BDF8" fill="rgba(56,189,248,0.13)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">{slo.why}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-line bg-panel/80 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-white"><ClockClockwise size={20} className="text-sky-200" />MTTR trend</h2>
              <p className="mt-1 text-sm text-slate-400">Recovery time in seconds across the selected window. Points tagged with an incident ID mark real recovery events.</p>
            </div>
            {latest ? (
              <div className="text-right">
                <p className="font-mono text-2xl font-semibold text-white">{latest.mttr_seconds.toFixed(1)}s</p>
                <p className="text-xs text-slate-500">latest MTTR</p>
              </div>
            ) : null}
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series?.points ?? []}>
                <CartesianGrid stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="bucket" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} unit="s" domain={[0, "dataMax + 5"]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="mttr_seconds" stroke="#34D399" strokeWidth={2.5} dot={{ r: 3, fill: "#34D399" }} isAnimationActive={!seriesLoading} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="rounded-2xl border border-line bg-panel/80 p-6">
          <h2 className="text-xl font-semibold text-white">Availability and error rate</h2>
          <p className="mt-1 text-sm text-slate-400">Reachability and request correctness across the same window. Targets are 99.5 percent and under 0.5 percent error rate.</p>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series?.points ?? []}>
                <CartesianGrid stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="bucket" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} domain={[99.4, 100]} unit="%" />
                <YAxis yAxisId="right" orientation="right" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line yAxisId="left" type="monotone" dataKey="availability" stroke="#38BDF8" strokeWidth={2.5} dot={false} name="Availability" isAnimationActive={!seriesLoading} />
                <Line yAxisId="right" type="monotone" dataKey="error_rate" stroke="#FB7185" strokeWidth={2.5} dot={false} name="Error rate" isAnimationActive={!seriesLoading} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-300" />Availability</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-300" />Error rate</span>
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <article className="rounded-2xl border border-line bg-panel/80 p-6">
          <h2 className="text-xl font-semibold text-white">P95 latency trend</h2>
          <p className="mt-1 text-sm text-slate-400">User-facing responsiveness stays under the 500 ms latency budget across the selected window.</p>
          <div className="mt-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series?.points ?? []}>
                <defs>
                  <linearGradient id="p95fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#A78BFA" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="bucket" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} unit="ms" />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="p95_latency_ms" stroke="#A78BFA" fill="url(#p95fill)" strokeWidth={2.5} isAnimationActive={!seriesLoading} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="rounded-2xl border border-line bg-panel/80 p-6">
          <h2 className="text-xl font-semibold text-white">Burn-rate alerts</h2>
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-line bg-slate-950/45 p-4">
              <div className="flex justify-between gap-3"><p className="font-semibold text-white">Fast burn</p><StatusBadge status="configured" /></div>
              <p className="mt-2 text-sm text-slate-400">Critical when error rate exceeds 10 percent over 2 minutes.</p>
            </div>
            <div className="rounded-xl border border-line bg-slate-950/45 p-4">
              <div className="flex justify-between gap-3"><p className="font-semibold text-white">Slow burn</p><StatusBadge status="configured" /></div>
              <p className="mt-2 text-sm text-slate-400">Warning when error rate exceeds 2 percent over 30 minutes.</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
