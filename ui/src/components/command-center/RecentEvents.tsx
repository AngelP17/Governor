const events = [
  ["15:30:45Z", "warning", "Pod termination requested by chaos workflow"],
  ["15:30:49Z", "warning", "Replica availability dropped to 2/3"],
  ["15:30:50Z", "info", "Snapshot captured pods, events, logs, deployment state"],
  ["15:30:51Z", "info", "Runbook mapped: runbooks/pod-crash.md"],
  ["15:30:55Z", "info", "Deployment controller scheduled replacement pod"],
  ["15:30:57Z", "success", "Readiness passed: 3/3 replicas available"],
  ["15:30:58Z", "success", "MTTR validated: 12s under 30s objective"],
  ["15:30:59Z", "success", "Audit report generated"],
] as const;

export function RecentEvents() {
  return (
    <div className="rounded-2xl border border-line bg-panel/80 p-5">
      <h2 className="text-lg font-semibold text-white">Recent Events</h2>
      <div className="mt-4 divide-y divide-line">
        {events.map(([time, severity, text]) => (
          <div key={`${time}-${text}`} className="flex gap-3 py-3 text-sm">
            <span className="shrink-0 font-mono text-xs text-slate-500">{time}</span>
            <span className={`shrink-0 font-mono text-xs ${severity === "success" ? "text-emerald-200" : severity === "warning" ? "text-amber-200" : "text-sky-200"}`}>{severity}</span>
            <span className="min-w-0 text-slate-300">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
