import { ArrowRight, BookOpenText, GitBranch, PlayCircle, Siren, WarningCircle, Clock, Lightning } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LifecycleTimeline } from "../components/command-center/LifecycleTimeline";
import { MetricCard } from "../components/command-center/MetricCard";
import { RecentEvents } from "../components/command-center/RecentEvents";
import { TopologyMap } from "../components/topology/TopologyMap";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { ApiOfflineState, LoadingState } from "../components/shared/States";
import { StatusBadge } from "../components/shared/StatusBadge";
import { api } from "../lib/api";
import { demoTopology, lifecycle } from "../lib/demo-data";
import { percent } from "../lib/format";
import type { PlatformSummary, TopologyNode, ChaosExperiment } from "../lib/types";

export function CommandCenter() {
  const [summary, setSummary] = useState<PlatformSummary>();
  const [mode, setMode] = useState<"live" | "demo">("demo");
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState<"degraded" | "reset" | null>(null);
  const [chaosHistory, setChaosHistory] = useState<ChaosExperiment[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const navigate = useNavigate();

  const fetchSummary = async () => {
    const result = await api.summary();
    setSummary(result.data);
    setMode(result.mode);
    setError(result.error);
  };

  const fetchHistory = async () => {
    const result = await api.chaosHistory();
    if (result.mode === "live") setChaosHistory(result.data);
  };

  useEffect(() => {
    fetchSummary();
    fetchHistory();
    const interval = window.setInterval(() => { fetchSummary(); fetchHistory(); }, 30000);
    return () => window.clearInterval(interval);
  }, []);

  if (!summary) return <LoadingState />;

  const metricCards = [
    { title: "Availability", value: percent(summary.slo.availability.current, 3), target: `${summary.slo.availability.target}%`, status: summary.slo.availability.status === "met", description: "Health reachability remains inside the platform availability objective.", trend: [99.91, 99.94, 99.97, 99.95, 99.982] },
    { title: "MTTR", value: `${summary.slo.mttr.current_seconds}s`, target: `< ${summary.slo.mttr.target_seconds}s`, status: summary.slo.mttr.status === "met", description: "Pod replacement completed within the recovery objective.", trend: [19, 16, 14, 12, summary.slo.mttr.current_seconds] },
    { title: "Error Rate", value: percent(summary.slo.error_rate.current_percent), target: `< ${summary.slo.error_rate.target_percent}%`, status: summary.slo.error_rate.status === "met", description: "HTTP 5xx rate is below the configured service correctness threshold.", trend: [0.3, 0.22, 0.18, 0.16, summary.slo.error_rate.current_percent] },
    { title: "P95 Latency", value: `${summary.slo.p95_latency_ms.current_ms}ms`, target: `< ${summary.slo.p95_latency_ms.target_ms}ms`, status: summary.slo.p95_latency_ms.status === "met", description: "User-facing responsiveness remains below the latency SLO.", trend: [238, 210, 198, 188, summary.slo.p95_latency_ms.current_ms] },
    { title: "Running Pods", value: `${summary.replicas.ready}/${summary.replicas.desired}`, target: "3 ready", status: summary.replicas.ready === summary.replicas.desired, description: "Deployment desired state is restored after the failure injection.", trend: [3, 2, 2, 3, 3] },
    { title: "Policy Gates", value: `${summary.policy.controls_configured}`, target: "configured controls", status: summary.policy.status, description: "Runtime, policy, delivery, and observability controls are mapped to repo artifacts.", trend: [7, 8, 10, 11, summary.policy.controls_configured] },
  ];

  const runAction = async () => {
    setActionLoading(true);
    setActionError(undefined);
    try {
      if (confirm === "degraded") await api.triggerDegraded();
      if (confirm === "reset") await api.resetChaos();
      await fetchSummary();
      await fetchHistory();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1460px]">
      {error ? <div className="mb-5"><ApiOfflineState /></div> : null}
      {actionError ? (
        <div className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-400/8 p-4">
          <p className="text-sm font-semibold text-rose-100">Action failed</p>
          <p className="mt-1 text-xs text-rose-100/75">{actionError}</p>
        </div>
      ) : null}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[1.5rem] border border-line bg-panel/85 p-6 shadow-surface md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={mode === "live" ? "healthy" : "observing"}>{mode === "live" ? "LIVE CLUSTER" : "DEMO DATA"}</StatusBadge>
            <StatusBadge status={summary.status}>{summary.status === "healthy" ? "HEALTHY" : "RECOVERED"}</StatusBadge>
            <StatusBadge status={summary.slo.mttr.status === "met"} />
          </div>
          <div className="mt-9 grid gap-8 md:grid-cols-[1.3fr_0.7fr]">
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold leading-[1.05] tracking-tight text-white md:text-5xl lg:text-6xl">Resilience Pilot</h1>
              <p className="mt-4 text-lg font-medium text-slate-200 md:text-xl">Kubernetes Reliability Control Plane</p>
              <p className="mt-5 max-w-[74ch] text-base leading-7 text-slate-400">
                Failure injection, SLO validation, incident context capture, and runbook-driven recovery for local Kubernetes environments.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-slate-950/45 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Latest incident</p>
              <p className="mt-3 break-all font-mono text-lg font-semibold text-white">{summary.latest_incident_id}</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">Detect, snapshot, recover, validate, and preserve the recovery as an auditable artifact set.</p>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/replay" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 active:scale-[0.98]"><PlayCircle size={18} weight="fill" />Run Demo Incident</Link>
            <button disabled={mode !== "live" || actionLoading} onClick={() => setConfirm("degraded")} title={mode !== "live" ? "Start the FastAPI backend to enable live chaos controls." : "Trigger degraded health responses"} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-amber-300/35 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100 transition enabled:hover:border-amber-200/60 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"><WarningCircle size={18} />Trigger Degraded Mode</button>
            <button disabled={mode !== "live" || actionLoading} onClick={() => setConfirm("reset")} title={mode !== "live" ? "Start the FastAPI backend to enable live reset." : "Reset API chaos mode"} className="inline-flex shrink-0 rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition enabled:hover:border-slate-500 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45">Reset Chaos</button>
            <Link to={`/incidents/${summary.latest_incident_id}`} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-sky-300/45 active:scale-[0.98]">View Incident Report<ArrowRight size={17} /></Link>
            <Link to="/runbooks" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-sky-300/45 active:scale-[0.98]"><BookOpenText size={17} />Open Runbook</Link>
            <Link to="/topology" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-sky-300/45 active:scale-[0.98]"><GitBranch size={17} />View Architecture</Link>
          </div>
        </div>
        <div className="grid gap-5">
          <div className="rounded-2xl border border-line bg-panel/80 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Deployment state</p>
            <p className="mt-4 font-mono text-4xl font-semibold text-white">{summary.replicas.ready}/{summary.replicas.desired}</p>
            <p className="mt-3 text-sm text-slate-400">FastAPI replicas ready in namespace <span className="font-mono text-slate-200">{summary.namespace}</span>.</p>
          </div>
          <div className="rounded-2xl border border-line bg-panel/80 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Delivery and controls</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status={summary.gitops.status}>ARGOCD {String(summary.gitops.status).toUpperCase()}</StatusBadge>
              <StatusBadge status={summary.policy.status}>POLICY {String(summary.policy.status).toUpperCase()}</StatusBadge>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">GitOps sync and policy gates are shown as production-readiness signals, not vanity status lights.</p>
          </div>
        </div>
      </motion.section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((card) => <MetricCard key={card.title} {...card} />)}
      </section>
      <section className="mt-8">
        <LifecycleTimeline phases={lifecycle} />
      </section>
      <section className="mt-8 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <TopologyMap topology={demoTopology} onSelect={(node: TopologyNode) => navigate(`/topology?node=${node.id}`)} />
        <RecentEvents />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Chaos experiment log</h2>
            <p className="mt-1 text-sm text-slate-400">Recorded triggers and resets with calculated MTTR.</p>
          </div>
          <StatusBadge status={chaosHistory.length > 0 ? "observing" : "pending"}>{chaosHistory.length} ENTRIES</StatusBadge>
        </div>
        {chaosHistory.length === 0 ? (
          <div className="rounded-2xl border border-line bg-panel/80 p-8">
            <p className="text-sm text-slate-400">No chaos experiments recorded yet. Start the backend and click Trigger Degraded Mode to begin.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-panel/80">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-5 py-4">ID</th>
                    <th className="px-5 py-4">Action</th>
                    <th className="px-5 py-4">Note</th>
                    <th className="px-5 py-4">MTTR</th>
                    <th className="px-5 py-4">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <AnimatePresence>
                    {chaosHistory.map((entry) => (
                      <motion.tr key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="hover:bg-slate-900/55">
                        <td className="px-5 py-4 font-mono text-xs text-slate-300">{entry.id}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${entry.action === "trigger" ? "border-amber-300/30 bg-amber-300/10 text-amber-100" : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"}`}>
                            {entry.action === "trigger" ? <Lightning size={13} /> : <Clock size={13} />}
                            {entry.action.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-300">{entry.note}</td>
                        <td className="px-5 py-4 font-mono text-slate-200">{entry.mttr_seconds != null ? `${entry.mttr_seconds}s` : "--"}</td>
                        <td className="px-5 py-4"><StatusBadge status={entry.slo_met ?? true} /></td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {confirm ? <ConfirmDialog title={confirm === "degraded" ? "Trigger degraded mode?" : "Reset chaos mode?"} body="This calls the local FastAPI chaos endpoint. Use this only against the local demo service, not a shared environment." confirmLabel={confirm === "degraded" ? "Trigger degraded mode" : "Reset chaos"} onCancel={() => setConfirm(null)} onConfirm={runAction} /> : null}
    </div>
  );
}
