import { demoControls, demoIncidentDetail, demoIncidents, demoRunbooks, demoSummary, demoTopology } from "./demo-data";
import type { Control, Incident, IncidentDetail, PlatformSummary, Runbook, Topology } from "./types";

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

export const api = {
  baseUrl: API_BASE_URL,
  summary: () => getJson<PlatformSummary>("/platform/summary", demoSummary),
  incidents: () => getJson<Incident[]>("/platform/incidents", demoIncidents),
  incident: (id: string) => getJson<IncidentDetail>(`/platform/incidents/${id}`, { ...demoIncidentDetail, id }),
  runbooks: () => getJson<Runbook[]>("/platform/runbooks", demoRunbooks),
  topology: () => getJson<Topology>("/platform/topology", demoTopology),
  controls: () => getJson<Control[]>("/platform/controls", demoControls),
  triggerDegraded: async () => {
    const response = await fetch(`${API_BASE_URL}/simulate-crash?mode=degraded&probability=0.5`, { method: "POST" });
    if (!response.ok) throw new Error("Unable to trigger degraded mode");
    return response.json() as Promise<unknown>;
  },
  resetChaos: async () => {
    const response = await fetch(`${API_BASE_URL}/simulate-crash?mode=reset`, { method: "POST" });
    if (!response.ok) throw new Error("Unable to reset chaos mode");
    return response.json() as Promise<unknown>;
  },
};
