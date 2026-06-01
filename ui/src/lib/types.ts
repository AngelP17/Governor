export type Status = "healthy" | "degraded" | "recovering" | "recovered" | "slo_breached" | "met" | "breached" | "synced" | "passing" | "configured" | "enforced" | "blocked" | "observing" | "reconciling" | "pending" | "documented gap";

export type DataMode = "live" | "demo" | "generated";

export type SloStatus = "met" | "breached";

export interface PlatformSummary {
  mode: DataMode;
  status: Status;
  service: string;
  namespace: string;
  replicas: { desired: number; available: number; ready: number };
  slo: {
    availability: { target: number; current: number; status: SloStatus };
    mttr: { target_seconds: number; current_seconds: number; status: SloStatus };
    error_rate: { target_percent: number; current_percent: number; status: SloStatus };
    p95_latency_ms: { target_ms: number; current_ms: number; status: SloStatus };
  };
  latest_incident_id: string;
  gitops: { status: Status; tool: string };
  policy: { status: Status; controls_configured: number };
  updated_at?: string;
}

export interface Incident {
  id: string;
  title: string;
  status: Status | "resolved";
  severity: "info" | "warning" | "critical";
  service: string;
  namespace: string;
  started_at: string;
  resolved_at: string;
  duration_seconds: number;
  slo_met: boolean;
  runbook: string;
  mode?: DataMode;
}

export interface TimelineEvent {
  phase: string;
  label: string;
  timestamp: string;
  detail: string;
}

export interface IncidentDetail extends Incident {
  summary: string;
  detection: {
    source: string;
    condition: string;
    metric: string;
    threshold: string;
    actual: string;
    runbook_annotation: string;
  };
  timeline: TimelineEvent[];
  artifacts: Array<{ name: string; type: string; available: boolean }>;
}

export interface Runbook {
  id: string;
  title: string;
  file: string;
  mapped_alerts: string[];
  script: string;
  supports_dry_run: boolean;
  trigger: string;
  severity: string;
}

export interface TopologyNode {
  id: string;
  label: string;
  group: string;
  status: Status;
  role: string;
  files?: string[];
  commands?: string[];
}

export interface TopologyEdge {
  source: string;
  target: string;
  label: string;
}

export interface Topology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface Control {
  category: string;
  name: string;
  artifact: string;
  status: Status;
  risk_reduced: string;
  why: string;
}

export interface ChaosExperiment {
  id: string;
  action: "trigger" | "reset";
  label: string;
  timestamp: string;
  outcome: string;
  note: string;
  mttr_seconds: number | null;
  slo_met: boolean | null;
}

export interface RunbookResult {
  runbook_id: string;
  status: string;
  message: string;
  command: string | null;
  output: string | null;
}

export interface RunbookHistoryEntry {
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

export type TimeRange = "1h" | "24h" | "7d";

export interface SLOTimePoint {
  bucket: string;
  availability: number;
  mttr_seconds: number;
  error_rate: number;
  p95_latency_ms: number;
}

export interface SLOTimeSeries {
  range: TimeRange;
  points: SLOTimePoint[];
  mttr_history: Array<{ bucket: string; duration_seconds: number; incident_id: string | null }>;
}

export interface Postmortem {
  incident_id: string;
  generated_at: string;
  markdown: string;
}

export type ReplayPhase =
  | "baseline"
  | "chaos_injected"
  | "pod_terminated"
  | "replica_drop"
  | "alert_detected"
  | "snapshot_captured"
  | "runbook_selected"
  | "recovering"
  | "replicas_restored"
  | "health_passed"
  | "mttr_calculated"
  | "validated"
  | "audited";
