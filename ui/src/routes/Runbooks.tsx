import { FileText, ShieldCheck, Play, Lightning, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { CopyButton } from "../components/shared/CopyButton";
import { LoadingState } from "../components/shared/States";
import { SectionHeader } from "../components/shared/SectionHeader";
import { StatusBadge } from "../components/shared/StatusBadge";
import { api } from "../lib/api";
import type { Runbook, RunbookResult } from "../lib/types";

const commandFor = (runbook: Runbook) => {
  if (runbook.id === "pod-crash") return "DRY_RUN=true scripts/remediate_pod_crash.sh incidents/INC-20260422153045";
  if (runbook.id === "high-latency") return "DRY_RUN=true scripts/remediate_high_latency.sh incidents/INC-20260422153045";
  if (runbook.id === "deployment-rollback") return "DRY_RUN=true scripts/remediate_deployment_rollback.sh incidents/INC-20260422153045";
  return "kubectl get pods -n kube-system -l k8s-app=kube-dns";
};

export function Runbooks() {
  const [runbooks, setRunbooks] = useState<Runbook[]>();
  const [selected, setSelected] = useState<Runbook>();
  const [result, setResult] = useState<RunbookResult>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    api.runbooks().then((res) => {
      setRunbooks(res.data);
      setSelected(res.data[0]);
    });
  }, []);

  const runDryRun = async () => {
    if (!selected) return;
    setLoading(true);
    setError(undefined);
    setResult(undefined);
    try {
      const res = await api.runbookDryRun(selected.id);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dry-run failed");
    } finally {
      setLoading(false);
    }
  };

  const runExecute = async () => {
    if (!selected) return;
    setLoading(true);
    setError(undefined);
    setResult(undefined);
    try {
      const res = await api.runbookExecute(selected.id);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Execution failed");
    } finally {
      setLoading(false);
    }
  };

  if (!runbooks || !selected) return <LoadingState />;

  return (
    <div className="mx-auto max-w-[1400px]">
      <SectionHeader eyebrow="Runbook Console" title="Alerts mapped to operating procedures" description="Runbooks connect symptoms to safe checks, remediation scripts, validation commands, and escalation criteria." />
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="grid gap-4">
          {runbooks.map((runbook) => (
            <button key={runbook.id} onClick={() => { setSelected(runbook); setResult(undefined); setError(undefined); }} className={`rounded-2xl border p-5 text-left transition active:scale-[0.99] ${selected.id === runbook.id ? "border-sky-300/45 bg-sky-300/10" : "border-line bg-panel/80 hover:border-slate-500/45"}`}>
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="text-lg font-semibold text-white">{runbook.title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{runbook.trigger}</p></div>
                <StatusBadge status={runbook.supports_dry_run}>DRY RUN</StatusBadge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {runbook.mapped_alerts.map((alert) => <span key={alert} className="rounded-full border border-line bg-slate-950/45 px-3 py-1 font-mono text-xs text-slate-300">{alert}</span>)}
              </div>
            </button>
          ))}
        </div>
        <article className="rounded-2xl border border-line bg-panel/82 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Selected runbook</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">{selected.title}</h1>
            </div>
            <FileText size={28} className="shrink-0 text-sky-200" />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[["File", selected.file], ["Severity", selected.severity], ["Script", selected.script || "Manual DNS checks"], ["Validation", "kubectl get pods -l app=resilience-pilot -n default"]].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-slate-950/45 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-2 break-all font-mono text-xs text-slate-200">{value}</p></div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-line bg-slate-950/35 p-5">
            <div className="flex items-center gap-2"><ShieldCheck size={20} className="shrink-0 text-emerald-200" /><h2 className="text-lg font-semibold text-white">Operating path</h2></div>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
              <li>1. Confirm alert scope and affected replicas.</li>
              <li>2. Capture pre-recovery context before state changes.</li>
              <li>3. Run safe checks and dry-run remediation where supported.</li>
              <li>4. Validate readiness, metrics, and SLO result.</li>
              <li>5. Preserve report, result, log, and decision record.</li>
            </ol>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button disabled={loading || !selected.supports_dry_run} onClick={runDryRun} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-sky-300/35 bg-sky-300/10 px-4 py-2.5 text-sm font-semibold text-sky-100 transition enabled:hover:border-sky-200/60 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"><Play size={16} />Dry Run</button>
            <button disabled={loading || !selected.script} onClick={runExecute} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"><Lightning size={16} weight="fill" />Execute</button>
            <CopyButton value={commandFor(selected)} />
            <CopyButton value="kubectl get events -n default --sort-by='.lastTimestamp' | head -30" label="Copy validation command" />
          </div>
          {error ? (
            <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/8 p-4">
              <div className="flex items-center gap-2"><WarningCircle size={16} className="text-rose-200" /><p className="text-sm font-semibold text-rose-100">Error</p></div>
              <p className="mt-1 text-xs text-rose-100/75">{error}</p>
            </div>
          ) : null}
          {result ? (
            <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/8 p-4">
              <div className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-200" /><p className="text-sm font-semibold text-emerald-100">{result.message}</p></div>
              {result.command ? (
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Command</p>
                  <code className="mt-1 block break-all rounded-lg border border-line bg-slate-950/45 px-3 py-2 font-mono text-xs text-slate-200">{result.command}</code>
                </div>
              ) : null}
              {result.output ? (
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Output</p>
                  <pre className="mt-1 max-h-48 overflow-auto rounded-lg border border-line bg-slate-950/45 px-3 py-2 font-mono text-xs text-slate-200">{result.output}</pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </article>
      </div>
    </div>
  );
}
