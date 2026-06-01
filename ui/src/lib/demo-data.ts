import type { Control, Incident, IncidentDetail, PlatformSummary, Postmortem, ReplayPhase, Runbook, RunbookHistoryEntry, SLOTimeSeries, TimeRange, TimelineEvent, Topology } from "./types";

export const lifecycle: TimelineEvent[] = [
  { phase: "detect", label: "Prometheus alert fired", timestamp: "T+04s", detail: "Replica availability dropped below desired state and mapped to a runbook." },
  { phase: "snapshot", label: "Cluster context captured", timestamp: "T+05s", detail: "Pods, events, logs, deployment state, ReplicaSet state, and service state preserved." },
  { phase: "runbook", label: "pod-crash.md selected", timestamp: "T+06s", detail: "Alert mapping selected the pod crash runbook and dry-run remediation path." },
  { phase: "recover", label: "Replica restored", timestamp: "T+10s", detail: "Kubernetes Deployment controller created a replacement pod." },
  { phase: "validate", label: "SLO validated", timestamp: "T+12s", detail: "MTTR checked against the < 30s target. Result: met." },
  { phase: "audit", label: "Artifact set written", timestamp: "T+13s", detail: "report.md, result.json, remediation.log, and remediation-decision.json available." },
];

export const demoSummary: PlatformSummary = {
  mode: "demo",
  status: "recovered",
  service: "resilience-pilot",
  namespace: "default",
  replicas: { desired: 3, available: 3, ready: 3 },
  slo: {
    availability: { target: 99.5, current: 99.982, status: "met" },
    mttr: { target_seconds: 30, current_seconds: 12, status: "met" },
    error_rate: { target_percent: 0.5, current_percent: 0.14, status: "met" },
    p95_latency_ms: { target_ms: 500, current_ms: 184, status: "met" },
  },
  latest_incident_id: "INC-20260422153045",
  gitops: { status: "synced", tool: "ArgoCD" },
  policy: { status: "passing", controls_configured: 12 },
  updated_at: "2026-04-22T15:30:58Z",
};

export const demoIncidents: Incident[] = [
  {
    id: "INC-20260422153045",
    title: "Pod failure recovery test",
    status: "resolved",
    severity: "warning",
    service: "resilience-pilot",
    namespace: "default",
    started_at: "2026-04-22T15:30:45Z",
    resolved_at: "2026-04-22T15:30:57Z",
    duration_seconds: 12,
    slo_met: true,
    runbook: "pod-crash.md",
    mode: "demo",
  },
  {
    id: "INC-20260421101722",
    title: "High latency validation drill",
    status: "resolved",
    severity: "warning",
    service: "resilience-pilot",
    namespace: "default",
    started_at: "2026-04-21T10:17:22Z",
    resolved_at: "2026-04-21T10:17:43Z",
    duration_seconds: 21,
    slo_met: true,
    runbook: "high-latency.md",
    mode: "demo",
  },
  {
    id: "INC-20260420190911",
    title: "Rollback readiness check",
    status: "resolved",
    severity: "critical",
    service: "resilience-pilot",
    namespace: "default",
    started_at: "2026-04-20T19:09:11Z",
    resolved_at: "2026-04-20T19:09:39Z",
    duration_seconds: 28,
    slo_met: true,
    runbook: "deployment-rollback.md",
    mode: "demo",
  },
];

export const demoIncidentDetail: IncidentDetail = {
  ...demoIncidents[0],
  summary: "Pod failure was injected against the FastAPI deployment. Kubernetes restored replica count from 2/3 to 3/3 in 12 seconds. MTTR target of 30 seconds was met.",
  detection: {
    source: "PrometheusRule",
    condition: "Available replicas below desired count",
    metric: "kube_deployment_status_replicas_available",
    threshold: "available replicas < desired replicas",
    actual: "2/3 replicas available",
    runbook_annotation: "runbooks/pod-crash.md",
  },
  timeline: lifecycle,
  artifacts: [
    { name: "snapshot-pre/", type: "cluster-context", available: true },
    { name: "result.json", type: "slo-result", available: true },
    { name: "report.md", type: "incident-report", available: true },
    { name: "remediation.log", type: "remediation-log", available: true },
    { name: "remediation-decision.json", type: "decision-record", available: true },
    { name: "experiment-summary.md", type: "rollup", available: true },
  ],
};

export const demoRunbooks: Runbook[] = [
  { id: "pod-crash", title: "Pod Crash Recovery", file: "runbooks/pod-crash.md", mapped_alerts: ["HighPodRestartRate", "PodCrashLoopBackOff", "ServiceDown"], script: "scripts/remediate_pod_crash.sh", supports_dry_run: true, trigger: "Pod restart rate, CrashLoopBackOff, or replica loss", severity: "warning / critical" },
  { id: "high-latency", title: "High Latency", file: "runbooks/high-latency.md", mapped_alerts: ["HighLatencyP95"], script: "scripts/remediate_high_latency.sh", supports_dry_run: true, trigger: "P95 latency over 500ms", severity: "warning" },
  { id: "dns-failure", title: "DNS Failure", file: "runbooks/dns-failure.md", mapped_alerts: ["ServiceDown", "HighErrorRate"], script: "", supports_dry_run: false, trigger: "DNS resolution failures or service lookup errors", severity: "warning / critical" },
  { id: "deployment-rollback", title: "Deployment Rollback", file: "runbooks/deployment-rollback.md", mapped_alerts: ["HighErrorRate", "InsufficientReplicas", "HighErrorRateFastBurn"], script: "scripts/remediate_deployment_rollback.sh", supports_dry_run: true, trigger: "5xx spike or insufficient replicas after rollout", severity: "warning / critical" },
];

export const demoTopology: Topology = {
  nodes: [
    { id: "local", label: "Local Host", group: "Local Host", status: "healthy", role: "Developer, CI, and demo operator entrypoint", files: ["setup.sh", "chaos_monkey.sh"], commands: ["./setup.sh", "./chaos_monkey.sh"] },
    { id: "k3d", label: "k3d Cluster", group: "k3d Cluster", status: "healthy", role: "Three-node local Kubernetes control plane", files: ["terraform/main.tf"], commands: ["terraform -chdir=terraform apply"] },
    { id: "service", label: "Kubernetes Service", group: "Application Namespace", status: "healthy", role: "Routes localhost:8080 traffic to FastAPI pods", files: ["manifests/service.yaml"], commands: ["curl http://localhost:8080/health"] },
    { id: "pods", label: "FastAPI Pods", group: "Application Namespace", status: "healthy", role: "Three replicas with probes and RED metrics", files: ["manifests/deployment.yaml", "app/main.py"], commands: ["kubectl get pods -l app=resilience-pilot -n default"] },
    { id: "prometheus", label: "Prometheus", group: "Monitoring Namespace", status: "observing", role: "Scrapes FastAPI /metrics and evaluates alert rules", files: ["monitoring/prometheus-rules.yaml"], commands: ["kubectl port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090 -n monitoring"] },
    { id: "grafana", label: "Grafana", group: "Monitoring Namespace", status: "observing", role: "Visualizes RED and Kubernetes metrics", files: ["monitoring/grafana-dashboard.json"], commands: ["kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring"] },
    { id: "argocd", label: "ArgoCD", group: "GitOps Namespace", status: "reconciling", role: "Keeps cluster state aligned with Git manifests", files: ["setup_argocd.sh"], commands: ["kubectl port-forward svc/argocd-server 8443:443 -n argocd"] },
    { id: "github", label: "GitHub Manifests", group: "CI/CD", status: "synced", role: "Desired state and DevSecOps pipeline source", files: [".github/workflows/devsecops.yml", "manifests/deployment.yaml"], commands: ["make validate"] },
  ],
  edges: [
    { source: "local", target: "service", label: "localhost:8080" },
    { source: "service", target: "pods", label: "routes traffic" },
    { source: "pods", target: "prometheus", label: "/metrics scrape" },
    { source: "prometheus", target: "grafana", label: "visualize" },
    { source: "github", target: "argocd", label: "pull desired state" },
    { source: "argocd", target: "k3d", label: "sync" },
  ],
};

export const demoSLOs = [
  { name: "Availability", target: "99.5%", current: "99.982%", status: true, why: "Protects user reachability.", data: [99.8, 99.91, 99.96, 99.94, 99.982] },
  { name: "MTTR", target: "< 30s", current: "12s", status: true, why: "Proves recovery speed after a controlled failure.", data: [22, 19, 16, 14, 12] },
  { name: "Error Rate", target: "< 0.5%", current: "0.14%", status: true, why: "Captures correctness and failed requests.", data: [0.31, 0.26, 0.2, 0.18, 0.14] },
  { name: "P95 Latency", target: "< 500ms", current: "184ms", status: true, why: "Captures user-facing responsiveness.", data: [240, 228, 206, 193, 184] },
];

export const demoEvents = [
  { time: "15:30:45Z", severity: "warning" as const, text: "Pod termination requested by chaos workflow" },
  { time: "15:30:49Z", severity: "warning" as const, text: "Replica availability dropped to 2/3" },
  { time: "15:30:50Z", severity: "info" as const, text: "Snapshot captured pods, events, logs, deployment state" },
  { time: "15:30:51Z", severity: "info" as const, text: "Runbook mapped: runbooks/pod-crash.md" },
  { time: "15:30:55Z", severity: "info" as const, text: "Deployment controller scheduled replacement pod" },
  { time: "15:30:57Z", severity: "success" as const, text: "Readiness passed: 3/3 replicas available" },
  { time: "15:30:58Z", severity: "success" as const, text: "MTTR validated: 12s under 30s objective" },
  { time: "15:30:59Z", severity: "success" as const, text: "Audit report generated" },
];

export const demoControls: Control[] = [
  { category: "Runtime Safety", name: "Liveness probe", artifact: "manifests/deployment.yaml", status: "configured", risk_reduced: "Restarts failed containers automatically", why: "Detects process failure" },
  { category: "Runtime Safety", name: "Readiness probe", artifact: "manifests/deployment.yaml", status: "configured", risk_reduced: "Removes unready pods from service routing", why: "Prevents bad pods from receiving traffic" },
  { category: "Runtime Safety", name: "Resource limits", artifact: "manifests/deployment.yaml", status: "configured", risk_reduced: "Constrains pod resource usage", why: "Protects node stability" },
  { category: "Runtime Safety", name: "Non-root container", artifact: "policy/kubernetes.rego", status: "configured", risk_reduced: "Limits container privilege", why: "Reduces compromise blast radius" },
  { category: "Runtime Safety", name: "Capability drops", artifact: "policy/kubernetes.rego", status: "configured", risk_reduced: "Removes unnecessary Linux capabilities", why: "Hardens runtime permissions" },
  { category: "Availability and Recovery", name: "PodDisruptionBudget", artifact: "manifests/poddisruptionbudget.yaml", status: "configured", risk_reduced: "Keeps at least two replicas during voluntary disruption", why: "Protects maintenance windows" },
  { category: "Availability and Recovery", name: "HorizontalPodAutoscaler", artifact: "manifests/hpa.yaml", status: "documented gap", risk_reduced: "Scales 3 to 6 replicas when metrics-server exists", why: "Adds capacity under load" },
  { category: "Network and Access Control", name: "NetworkPolicy", artifact: "manifests/networkpolicy.yaml", status: "configured", risk_reduced: "Restricts ingress and egress paths", why: "Limits lateral movement" },
  { category: "Policy and CI Gates", name: "OPA/Rego validation", artifact: "policy/kubernetes.rego", status: "configured", risk_reduced: "Blocks unsafe manifests in CI", why: "Codifies platform standards" },
  { category: "Policy and CI Gates", name: "kubeconform validation", artifact: "Makefile", status: "configured", risk_reduced: "Catches malformed Kubernetes resources", why: "Prevents invalid desired state" },
  { category: "Policy and CI Gates", name: "Trivy scan", artifact: ".github/workflows/devsecops.yml", status: "configured", risk_reduced: "Blocks critical image vulnerabilities", why: "Protects delivery path" },
  { category: "Policy and CI Gates", name: "Bandit scan", artifact: ".github/workflows/devsecops.yml", status: "configured", risk_reduced: "Finds Python security issues", why: "Shifts security left" },
  { category: "Observability and Alerting", name: "Burn-rate alerts", artifact: "monitoring/prometheus-rules.yaml", status: "configured", risk_reduced: "Detects fast and slow error-budget consumption", why: "Connects alerts to SLO impact" },
  { category: "Observability and Alerting", name: "ArgoCD self-heal", artifact: "setup_argocd.sh", status: "configured", risk_reduced: "Reconciles drift to Git state", why: "Keeps runtime aligned with reviewed state" },
];

export const replayPhases: Array<{ key: ReplayPhase; label: string; event: string; status: string; replicas: string; mttr?: string }> = [
  { key: "baseline", label: "Baseline healthy", event: "Baseline: 3/3 FastAPI pods ready", status: "Healthy", replicas: "3/3" },
  { key: "chaos_injected", label: "Chaos injected", event: "Chaos Monkey selected victim pod", status: "Degraded", replicas: "3/3" },
  { key: "pod_terminated", label: "Pod terminated", event: "Pod terminated intentionally", status: "Degraded", replicas: "2/3" },
  { key: "replica_drop", label: "Replica drop", event: "Replica availability dropped to 2/3", status: "Degraded", replicas: "2/3" },
  { key: "alert_detected", label: "Alert detected", event: "Prometheus alert condition detected", status: "Recovering", replicas: "2/3" },
  { key: "snapshot_captured", label: "Snapshot captured", event: "Incident snapshot captured", status: "Recovering", replicas: "2/3" },
  { key: "runbook_selected", label: "Runbook selected", event: "Runbook mapped: pod-crash.md", status: "Recovering", replicas: "2/3" },
  { key: "recovering", label: "Self-healing starts", event: "Kubernetes Deployment controller created replacement pod", status: "Recovering", replicas: "2/3" },
  { key: "replicas_restored", label: "Replicas restored", event: "Replica count restored to 3/3", status: "Recovered", replicas: "3/3" },
  { key: "health_passed", label: "Health checks pass", event: "Health endpoint passed readiness check", status: "Recovered", replicas: "3/3" },
  { key: "mttr_calculated", label: "MTTR calculated", event: "MTTR calculated: 12 seconds", status: "Recovered", replicas: "3/3", mttr: "12s" },
  { key: "validated", label: "SLO validated", event: "SLO validated: MTTR target met", status: "SLO Met", replicas: "3/3", mttr: "12s" },
  { key: "audited", label: "Audit report generated", event: "Audit report generated", status: "Audited", replicas: "3/3", mttr: "12s" },
];

const timeBuckets = (range: TimeRange): string[] => {
  if (range === "1h") {
    return Array.from({ length: 12 }, (_, i) => {
      const minutesAgo = (11 - i) * 5;
      return `T-${minutesAgo.toString().padStart(2, "0")}m`;
    });
  }
  if (range === "24h") {
    return Array.from({ length: 24 }, (_, i) => `${(23 - i).toString().padStart(2, "0")}h`);
  }
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
};

const trendCurve = (range: TimeRange, target: number, current: number, jitter: number, decimals: number): number[] => {
  const buckets = timeBuckets(range);
  const slope = (current - target) / Math.max(1, buckets.length - 1);
  return buckets.map((_, i) => {
    const baseline = target + slope * i;
    const wave = Math.sin(i / 1.4) * jitter * 0.4;
    const noise = ((i * 37 + 11) % 17) / 17 - 0.5;
    return Number((baseline + wave + noise * jitter * 0.6).toFixed(decimals));
  });
};

export const demoSLOTimeSeries = (range: TimeRange): SLOTimeSeries => {
  const buckets = timeBuckets(range);
  const availability = trendCurve(range, 99.94, 99.982, 0.04, 3);
  const errorRate = trendCurve(range, 0.18, 0.14, 0.06, 3);
  const p95 = trendCurve(range, 198, 184, 14, 0);
  const mttr = trendCurve(range, 22, 12, 4, 1);
  return {
    range,
    points: buckets.map((bucket, i) => ({
      bucket,
      availability: availability[i],
      mttr_seconds: mttr[i],
      error_rate: errorRate[i],
      p95_latency_ms: p95[i],
    })),
    mttr_history: mttr.map((duration, i) => ({
      bucket: buckets[i],
      duration_seconds: duration,
      incident_id: i % 4 === 2 ? `INC-DEMO-${(1000 + i).toString()}` : null,
    })),
  };
};

const sampleRunbookExecutions: RunbookHistoryEntry[] = [
  { id: "RB-2026-04-22-001", runbook_id: "pod-crash", runbook_title: "Pod Crash Recovery", action: "execute", status: "executed", command: "scripts/remediate_pod_crash.sh incidents/INC-20260422153045", started_at: "2026-04-22T15:30:45Z", duration_ms: 12400, exit_code: 0, actor: "on-call-demo", output_excerpt: "Pods checked: 3/3 ready" },
  { id: "RB-2026-04-22-002", runbook_id: "pod-crash", runbook_title: "Pod Crash Recovery", action: "dry-run", status: "dry_run_simulated", command: "DRY_RUN=true scripts/remediate_pod_crash.sh incidents/INC-20260422153045", started_at: "2026-04-22T15:28:11Z", duration_ms: 480, exit_code: 0, actor: "demo-operator", output_excerpt: "No changes applied." },
  { id: "RB-2026-04-21-001", runbook_id: "pod-crash", runbook_title: "Pod Crash Recovery", action: "execute", status: "executed", command: "scripts/remediate_pod_crash.sh incidents/INC-20260421101722", started_at: "2026-04-21T10:17:22Z", duration_ms: 21000, exit_code: 0, actor: "on-call-demo", output_excerpt: "MTTR 21s under 30s objective" },
  { id: "RB-2026-04-20-002", runbook_id: "deployment-rollback", runbook_title: "Deployment Rollback", action: "execute", status: "executed", command: "scripts/remediate_deployment_rollback.sh incidents/INC-20260420190911", started_at: "2026-04-20T19:09:11Z", duration_ms: 28000, exit_code: 0, actor: "release-bot", output_excerpt: "Rollback to revision 7" },
  { id: "RB-2026-04-19-001", runbook_id: "high-latency", runbook_title: "High Latency", action: "execute", status: "executed", command: "scripts/remediate_high_latency.sh incidents/INC-20260419081230", started_at: "2026-04-19T08:12:30Z", duration_ms: 18500, exit_code: 0, actor: "sre-demo", output_excerpt: "Connection pool reset" },
  { id: "RB-2026-04-18-001", runbook_id: "pod-crash", runbook_title: "Pod Crash Recovery", action: "dry-run", status: "dry_run_simulated", command: "DRY_RUN=true scripts/remediate_pod_crash.sh incidents/INC-20260418164405", started_at: "2026-04-18T16:44:05Z", duration_ms: 510, exit_code: 0, actor: "demo-operator", output_excerpt: "Would execute: check pods" },
  { id: "RB-2026-04-17-001", runbook_id: "pod-crash", runbook_title: "Pod Crash Recovery", action: "execute", status: "executed", command: "scripts/remediate_pod_crash.sh incidents/INC-20260417091245", started_at: "2026-04-17T09:12:45Z", duration_ms: 14200, exit_code: 0, actor: "on-call-demo", output_excerpt: "Pods checked: 3/3 ready" },
  { id: "RB-2026-04-16-001", runbook_id: "dns-failure", runbook_title: "DNS Failure", action: "execute", status: "manual_required", command: null, started_at: "2026-04-16T11:01:08Z", duration_ms: 800, exit_code: 1, actor: "sre-demo", output_excerpt: "This runbook requires manual steps." },
];

export const demoRunbookHistory = (runbookId: string): RunbookHistoryEntry[] => {
  if (runbookId === "all") return sampleRunbookExecutions;
  return sampleRunbookExecutions.filter((entry) => entry.runbook_id === runbookId);
};

export const demoPostmortem = (incidentId: string): Postmortem => {
  const markdown = `# Postmortem: ${incidentId}

## Summary
Pod failure was injected against the FastAPI deployment in the default namespace. The Kubernetes Deployment controller scheduled a replacement pod and readiness returned to 3/3 within 12 seconds, meeting the 30 second MTTR objective.

## Detection
- Source: PrometheusRule
- Condition: Available replicas below desired count
- Metric: kube_deployment_status_replicas_available
- Threshold: available replicas < desired replicas
- Actual: 2/3 replicas available

## Timeline
| Phase | Time | Detail |
| --- | --- | --- |
| detect | T+04s | Prometheus alert fired |
| snapshot | T+05s | Cluster context captured |
| runbook | T+06s | runbooks/pod-crash.md selected |
| recover | T+10s | Replica restored |
| validate | T+12s | SLO validated |
| audit | T+13s | Report generated |

## Impact
- Availability: 99.982 percent, target 99.5 percent
- MTTR: 12 seconds, target under 30 seconds
- Error rate: 0.14 percent, target under 0.5 percent
- P95 latency: 184 ms, target under 500 ms

## Root cause
The chaos workflow terminated one FastAPI pod. The Deployment controller detected the unavailable replica and scheduled a replacement. No application bug was involved.

## What went well
- The replica gap was detected within 4 seconds.
- The pre-recovery snapshot preserved cluster context for postmortem.
- The runbook mapping automatically selected the correct operating procedure.

## What we will improve
- Activate metrics-server so the HPA can react to CPU pressure.
- Add an Alertmanager webhook with local TLS for handoff workflows.
- Capture a one-page decision record alongside the existing artifacts.

## Artifacts
- incidents/${incidentId}/snapshot-pre
- incidents/${incidentId}/result.json
- incidents/${incidentId}/report.md
- incidents/${incidentId}/remediation.log
- incidents/${incidentId}/remediation-decision.json

_Generated automatically by the Resilience Pilot control plane. Edit before publishing._
`;
  return {
    incident_id: incidentId,
    generated_at: "2026-04-22T15:31:00Z",
    markdown,
  };
};
