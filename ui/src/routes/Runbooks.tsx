import { FileText, ShieldCheck, Play, Lightning, CheckCircle, WarningCircle, Clock, TerminalWindow } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { CopyButton } from "../components/shared/CopyButton";
import { LoadingState } from "../components/shared/States";
import { SectionHeader } from "../components/shared/SectionHeader";
import { StatusBadge } from "../components/shared/StatusBadge";
import { useToast } from "../components/shared/Toast";
import { api } from "../lib/api";
import { formatDateTime, formatSeconds } from "../lib/format";
import type { Runbook, RunbookResult } from "../lib/types";

const commandFor = (runbook: Runbook) => {
  if (runbook.id === "pod-crash") return "DRY_RUN=true scripts/remediate_pod_crash.sh incidents/INC-20260422153045";
  if (runbook.id === "high-latency") return "DRY_RUN=true scripts/remediate_high_latency.sh incidents/INC-20260422153045";
  if (runbook.id === "deployment-rollback") return "DRY_RUN=true scripts/remediate_deployment_rollback.sh incidents/INC-20260422153045";
  return "kubectl get pods -n kube-system -l k8s-app=kube-dns";
};

interface RunbookHistoryEntry {
  id: string;
  runbook_id: string;
  runbook_title: string;
  action: "dry-run" | "execute";
  status: string;
  command: string | null;
  started_at: string;
  duration_ms: number;
  exit_code: number;
  actor: string;
  output_excerpt: string | null;
}

export function Runbooks() {
  const [runbooks, setRunbooks] = useState<Runbook[]>();
  const [selected, setSelected] = useState<Runbook>();
  const [result, setResult] = useState<RunbookResult>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [history, setHistory] = useState<RunbookHistoryEntry[]>([]);
  const { push } = useToast();

  const refreshHistory = async () => {
    const res = await api.runbookHistory(selected?.id);
    setHistory(res.data);
  };

  useEffect(() => {
    api.runbooks().then((res) => {
      setRunbooks(res.data);
      setSelected(res.data[0]);
    });
  }, []);

  useEffect(() => {
    if (selected) {
      api.runbookHistory(selected.id).then((res) => setHistory(res.data));
    }
  }, [selected]);

  const runDryRun = async () => {
    if (!selected) return;
    setLoading(true);
    setError(undefined);
    setResult(undefined);
    try {
      const res = await api.runbookDryRun(selected.id);
      setResult(res);
      push({ title: "Dry run completed", description: res.message, variant: "info" });
      await refreshHistory();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Dry-run failed";
      setError(message);
      push({ title: "Dry run failed", description: message, variant: "error" });
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
      const variant = res.status === "executed" ? "success" : res.status === "manual_required" ? "warning" : "info";
      push({ title: `${selected.title} executed`, description: res.message, variant });
      await refreshHistory();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Execution failed";
      setError(message);
      push({ title: "Execution failed", description: message, variant: "error" });
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

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white"><TerminalWindow size={20} className="text-sky-200" />Execution history</h2>
            <p className="mt-1 text-sm text-slate-400">Last 8 runs for this runbook. Includes who triggered it, duration, exit code, and output excerpt.</p>
          </div>
          <span className="rounded-full border border-line bg-slate-950/45 px-3 py-1 font-mono text-xs text-slate-300">{history.length} ENTRIES</span>
        </div>
        {history.length === 0 ? (
          <div className="rounded-2xl border border-line bg-panel/80 p-8 text-sm text-slate-400">
            No runs recorded for this runbook yet. Trigger a Dry Run or Execute to populate the audit trail.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-panel/80">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Exit</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Output</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {history.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-900/55">
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">{entry.id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${entry.action === "execute" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-sky-300/30 bg-sky-300/10 text-sky-100"}`}>
                          {entry.action === "execute" ? <Lightning size={12} weight="fill" /> : <Play size={12} />}
                          {entry.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">{entry.status}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-200"><Clock size={12} className="mr-1 inline" />{formatSeconds(Math.max(1, Math.round(entry.duration_ms / 1000)))}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <span className={entry.exit_code === 0 ? "text-emerald-200" : "text-rose-200"}>{entry.exit_code === 0 ? "0" : entry.exit_code}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">{entry.actor}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{formatDateTime(entry.started_at)}</td>
                      <td className="px-4 py-3 max-w-[260px] truncate font-mono text-xs text-slate-400" title={entry.output_excerpt ?? ""}>
                        {entry.output_excerpt ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
