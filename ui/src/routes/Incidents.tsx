import { ArrowRight } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiOfflineState, EmptyIncidentsState, LoadingState } from "../components/shared/States";
import { SectionHeader } from "../components/shared/SectionHeader";
import { StatusBadge } from "../components/shared/StatusBadge";
import { api } from "../lib/api";
import { formatDateTime, formatSeconds } from "../lib/format";
import type { Incident } from "../lib/types";

export function Incidents() {
  const [incidents, setIncidents] = useState<Incident[]>();
  const [error, setError] = useState<string>();
  const navigate = useNavigate();

  useEffect(() => {
    api.incidents().then((result) => {
      setIncidents(result.data);
      setError(result.error);
    });
  }, []);

  if (!incidents) return <LoadingState />;

  return (
    <div className="mx-auto max-w-[1400px]">
      <SectionHeader eyebrow="Incident Review" title="Recovery artifacts and SLO outcomes" description="Every row links an operational failure to its impact, selected runbook, recovery duration, and audit state." />
      {error ? <div className="mb-5"><ApiOfflineState /></div> : null}
      {incidents.length === 0 ? <EmptyIncidentsState onDemo={() => navigate("/replay")} /> : (
        <div className="overflow-hidden rounded-2xl border border-line bg-panel/80">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">Incident</th>
                  <th className="px-5 py-4">Severity</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Service</th>
                  <th className="px-5 py-4">Duration</th>
                  <th className="px-5 py-4">SLO</th>
                  <th className="px-5 py-4">Runbook</th>
                  <th className="px-5 py-4">Started</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {incidents.map((incident) => (
                  <tr key={incident.id} className="transition hover:bg-slate-900/55" onClick={() => navigate(`/incidents/${incident.id}`)}>
                    <td className="px-5 py-4"><p className="font-semibold text-white">{incident.title}</p><p className="font-mono text-xs text-slate-500">{incident.id}</p></td>
                    <td className="px-5 py-4"><StatusBadge status={incident.severity === "critical" ? "slo_breached" : "recovering"}>{incident.severity.toUpperCase()}</StatusBadge></td>
                    <td className="px-5 py-4"><StatusBadge status={incident.status} /></td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-300">{incident.service}</td>
                    <td className="px-5 py-4 font-mono text-slate-200">{formatSeconds(incident.duration_seconds)}</td>
                    <td className="px-5 py-4"><StatusBadge status={incident.slo_met} /></td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-300">{incident.runbook}</td>
                    <td className="px-5 py-4 text-slate-400">{formatDateTime(incident.started_at)}</td>
                    <td className="px-5 py-4"><Link className="inline-flex shrink-0 items-center gap-2 text-sky-200 hover:text-sky-100" to={`/incidents/${incident.id}`}>Open <ArrowRight size={15} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
