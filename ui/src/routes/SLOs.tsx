import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionHeader } from "../components/shared/SectionHeader";
import { StatusBadge } from "../components/shared/StatusBadge";

const slos = [
  { name: "Availability", target: "99.5%", current: "99.982%", status: true, why: "Protects user reachability.", data: [99.8, 99.91, 99.96, 99.94, 99.982] },
  { name: "MTTR", target: "< 30s", current: "12s", status: true, why: "Proves recovery speed after a controlled failure.", data: [22, 19, 16, 14, 12] },
  { name: "Error Rate", target: "< 0.5%", current: "0.14%", status: true, why: "Captures correctness and failed requests.", data: [0.31, 0.26, 0.2, 0.18, 0.14] },
  { name: "P95 Latency", target: "< 500ms", current: "184ms", status: true, why: "Captures user-facing responsiveness.", data: [240, 228, 206, 193, 184] },
];

export function SLOs() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <SectionHeader eyebrow="SLO and Error Budget" title="Reliability contract" description="These indicators keep the demo tied to SRE outcomes: reachability, recovery speed, correctness, and responsiveness." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {slos.map((slo) => (
          <article key={slo.name} className="rounded-2xl border border-line bg-panel/80 p-5">
            <div className="flex items-start justify-between"><h2 className="text-lg font-semibold text-white">{slo.name}</h2><StatusBadge status={slo.status} /></div>
            <p className="mt-4 font-mono text-3xl font-semibold text-white">{slo.current}</p>
            <p className="mt-2 text-sm text-slate-500">Target {slo.target}</p>
            <div className="mt-5 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={slo.data.map((value, index) => ({ index, value }))}>
                  <XAxis dataKey="index" hide />
                  <YAxis hide domain={["dataMin", "dataMax"]} />
                  <Tooltip contentStyle={{ background: "#0D1117", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 12 }} />
                  <Area type="monotone" dataKey="value" stroke="#38BDF8" fill="rgba(56,189,248,0.13)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">{slo.why}</p>
          </article>
        ))}
      </div>
      <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <article className="rounded-2xl border border-line bg-panel/80 p-6">
          <h2 className="text-xl font-semibold text-white">Reliability Contract</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {["Availability protects user reachability.", "MTTR proves recovery speed.", "Error rate captures correctness and failed requests.", "P95 latency captures user-facing responsiveness."].map((text) => <p key={text} className="rounded-xl border border-line bg-slate-950/45 p-4 text-sm leading-6 text-slate-300">{text}</p>)}
          </div>
        </article>
        <article className="rounded-2xl border border-line bg-panel/80 p-6">
          <h2 className="text-xl font-semibold text-white">Burn-rate alerts</h2>
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-line bg-slate-950/45 p-4"><div className="flex justify-between gap-3"><p className="font-semibold text-white">Fast burn</p><StatusBadge status="configured" /></div><p className="mt-2 text-sm text-slate-400">Critical when error rate exceeds 10% over 2 minutes.</p></div>
            <div className="rounded-xl border border-line bg-slate-950/45 p-4"><div className="flex justify-between gap-3"><p className="font-semibold text-white">Slow burn</p><StatusBadge status="configured" /></div><p className="mt-2 text-sm text-slate-400">Warning when error rate exceeds 2% over 30 minutes.</p></div>
          </div>
        </article>
      </section>
    </div>
  );
}
