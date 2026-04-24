import { ArrowUpRight } from "@phosphor-icons/react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { StatusBadge } from "../shared/StatusBadge";
import type { Status } from "../../lib/types";

export function MetricCard({ title, value, target, status, description, trend }: { title: string; value: string; target: string; status: Status | boolean; description: string; trend: number[] }) {
  const data = trend.map((item, index) => ({ index, item }));
  return (
    <article className="rounded-2xl border border-line bg-panel/82 p-5 shadow-surface">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
          <p className="mt-3 truncate font-mono text-3xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="mt-4 h-12">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <Area type="monotone" dataKey="item" stroke="#34D399" fill="rgba(52,211,153,0.16)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
        <p className="truncate text-xs text-slate-500">Target: <span className="font-mono text-slate-300">{target}</span></p>
        <ArrowUpRight size={16} className="shrink-0 text-slate-500" />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </article>
  );
}
