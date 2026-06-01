import { demoControls, demoEvents, demoIncidentDetail, demoIncidents, demoPostmortem, demoRunbookHistory, demoRunbooks, demoSLOTimeSeries, demoSLOs, demoSummary, demoTopology } from "./demo-data";
import type { Control, Incident, IncidentDetail, PlatformSummary, Postmortem, Runbook, RunbookHistoryEntry, SLOTimeSeries, TimeRange, Topology, ChaosExperiment, RunbookResult } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

async function getJson<T>(path: string, fallback: T): Promise<{ data: T; mode: "live" | "demo"; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return { data: (await response.json()) as T, mode: "live" };
  } catch (error) {
    return { data: fallback, mode: "demo", error: error instanceof Error ? error.message : "Request failed" };
  }
}

async function postJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { method: "POST", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
}

async function postJsonBody<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
}

export const api = {
  baseUrl: API_BASE_URL,
  summary: () => getJson<PlatformSummary>("/platform/summary", demoSummary),
  incidents: () => getJson<Incident[]>("/platform/incidents", demoIncidents),
  incident: (id: string) => getJson<IncidentDetail>(`/platform/incidents/${id}`, { ...demoIncidentDetail, id }),
  runbooks: () => getJson<Runbook[]>("/platform/runbooks", demoRunbooks),
  topology: () => getJson<Topology>("/platform/topology", demoTopology),
  controls: () => getJson<Control[]>("/platform/controls", demoControls),
  events: () => getJson<Array<{ time: string; severity: "warning" | "info" | "success"; text: string }>>("/platform/events", demoEvents),
  slos: () => getJson<typeof demoSLOs>("/platform/slo", demoSLOs),
  sloTimeSeries: (range: TimeRange) => getJson<SLOTimeSeries>(`/platform/slo/history?range=${range}`, demoSLOTimeSeries(range)),
  runbookHistory: (runbookId?: string) =>
    getJson<RunbookHistoryEntry[]>(runbookId ? `/platform/runbooks/${runbookId}/history` : `/platform/runbooks/history`, runbookId ? demoRunbookHistory(runbookId) : []),
  postmortem: (incidentId: string) => postJsonBody<Postmortem>("/platform/postmortem", { incident_id: incidentId }).catch(() => ({ ...demoPostmortem(incidentId), incident_id: incidentId })),
  triggerDegraded: () => postJson<{ status: string; message: string; entry: ChaosExperiment }>("/platform/chaos/degraded"),
  resetChaos: () => postJson<{ status: string; message: string; entry: ChaosExperiment; mttr_seconds?: number; slo_met?: boolean }>("/platform/chaos/reset"),
  chaosHistory: () => getJson<ChaosExperiment[]>("/platform/chaos/history", []),
  runbookDryRun: (id: string) => postJson<RunbookResult>(`/platform/runbooks/${id}/dry-run`),
  runbookExecute: (id: string) => postJson<RunbookResult>(`/platform/runbooks/${id}/execute`),
};
