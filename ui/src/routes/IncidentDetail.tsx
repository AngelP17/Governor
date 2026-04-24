import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LifecycleTimeline } from "../components/command-center/LifecycleTimeline";
import { CopyButton } from "../components/shared/CopyButton";
import { LoadingState } from "../components/shared/States";
import { StatusBadge } from "../components/shared/StatusBadge";
import { api } from "../lib/api";
import { formatDateTime, formatSeconds } from "../lib/format";
import type { IncidentDetail } from "../lib/types";

export function IncidentDetailPage() {
  const { id = "INC-20260422153045" } = useParams();
  const [incident, setIncident] = useState<IncidentDetail>();

  useEffect(() => {
    api.incident(id).then((result) => setIncident(result.data));
  }, [id]);

  if (!incident) return <LoadingState />;

  const panels = [
    ["Detection", incident.detection.condition, [["Source", incident.detection.source], ["Metric", incident.detection.metric], ["Threshold", incident.detection.threshold], ["Actual", incident.detection.actual], ["Runbook annotation", incident.detection.runbook_annotation]]],
    ["Snapshot", "The snapshot captures cluster context before validation changes the state.", [["Pods", "snapshot-pre/pods.txt"], ["Events", "snapshot-pre/events.txt"], ["Logs", "snapshot-pre/logs/"], ["Deployment", "snapshot-pre/deployment.yaml"], ["Service", "snapshot-pre/service.yaml"]]],
    ["Recovery", "Recovery was handled by Kubernetes desired-state reconciliation with an audited remediation script available.", [["Mechanism", "Deployment controller"], ["Replica path", "2/3 -> 3/3"], ["Script", "scripts/remediate_pod_crash.sh"], ["Mode", "dry-run supported"], ["Decision record", "remediation-decision.json"]]],
    ["SLO Validation", "Recovery is accepted only after readiness returns and MTTR is checked against the objective.", [["Target", "< 30s"], ["Actual", `${incident.duration_seconds}s`], ["Result", incident.slo_met ? "met" : "breached"], ["Budget impact", "contained"], ["Confidence", "High for local drill"]]],
  ] as const;

  return (
    <div className="mx-auto max-w-[1400px]">
      <section className="rounded-2xl border border-line bg-panel/82 p-6 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-xs text-slate-500">{incident.id}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-4xl">{incident.title}</h1>
            <p className="mt-4 max-w-[86ch] text-base leading-7 text-slate-400">{incident.summary}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <StatusBadge status={incident.status} />
            <StatusBadge status={incident.slo_met} />
            <StatusBadge status="observing">{(incident.mode ?? "demo").toUpperCase()}</StatusBadge>
          </div>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {[["Service", incident.service], ["Namespace", incident.namespace], ["Started", formatDateTime(incident.started_at)], ["Duration", formatSeconds(incident.duration_seconds)]].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line bg-slate-950/45 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-2 break-all font-mono text-sm text-white">{value}</p></div>
          ))}
        </div>
      </section>
      <section className="mt-6"><LifecycleTimeline phases={incident.timeline} /></section>
      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        {panels.map(([title, body, rows]) => (
          <article key={title} className="rounded-2xl border border-line bg-panel/80 p-5">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
            <div className="mt-4 divide-y divide-line">
              {rows.map(([label, value]) => <div key={label} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:gap-3"><span className="shrink-0 text-slate-500 sm:w-[150px]">{label}</span><span className="min-w-0 break-all font-mono text-slate-200">{value}</span></div>)}
            </div>
          </article>
        ))}
      </section>
      <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_0.75fr]">
        <article className="rounded-2xl border border-line bg-panel/80 p-5">
          <h2 className="text-lg font-semibold text-white">Audit Trail</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {incident.artifacts.map((artifact) => (
              <div key={artifact.name} className="rounded-xl border border-line bg-slate-950/45 p-4">
                <div className="flex items-center justify-between gap-3"><p className="font-mono text-sm text-white">{artifact.name}</p><StatusBadge status={artifact.available} /></div>
                <p className="mt-2 text-xs text-slate-500">{artifact.type}</p>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-2xl border border-line bg-panel/80 p-5">
          <h2 className="text-lg font-semibold text-white">Lessons and next hardening step</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
            <li>Add metrics-server to activate HPA behavior locally.</li>
            <li>Add Alertmanager webhook TLS/auth before non-local use.</li>
            <li>Add on-call or ticket integration for handoff workflows.</li>
            <li>Add EKS deployment path when moving beyond k3d.</li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <CopyButton value="python3 scripts/summarize_experiments.py" />
            <Link to="/runbooks" className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 active:scale-[0.98]">Open runbooks</Link>
          </div>
        </article>
      </section>
    </div>
  );
}
