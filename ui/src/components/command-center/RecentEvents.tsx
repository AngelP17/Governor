import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { demoEvents } from "../../lib/demo-data";
import { LoadingState } from "../shared/States";

interface EventItem {
  time: string;
  severity: "warning" | "info" | "success";
  text: string;
}

export function RecentEvents() {
  const [events, setEvents] = useState<EventItem[]>(demoEvents);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.events().then((result: { data?: EventItem[]; error?: string }) => {
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        setEvents(result.data);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState label="Loading events" />;

  return (
    <div className="rounded-2xl border border-line bg-panel/80 p-5">
      <h2 className="text-lg font-semibold text-white">Recent Events</h2>
      <div className="mt-4 divide-y divide-line">
        {events.map((event, index) => (
          <div key={`${event.time}-${index}`} className="flex gap-3 py-3 text-sm">
            <span className="shrink-0 font-mono text-xs text-slate-500">{event.time}</span>
            <span className={`shrink-0 font-mono text-xs ${event.severity === "success" ? "text-emerald-200" : event.severity === "warning" ? "text-amber-200" : "text-sky-200"}`}>{event.severity}</span>
            <span className="min-w-0 text-slate-300">{event.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
