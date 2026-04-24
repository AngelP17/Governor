import type { Control, Incident, IncidentDetail, PlatformSummary, ReplayPhase, Runbook, TimelineEvent, Topology } from "./types";

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
