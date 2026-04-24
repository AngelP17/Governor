import { clsx } from "clsx";
import type { Topology, TopologyNode } from "../../lib/types";
import { StatusBadge } from "../shared/StatusBadge";

export function TopologyMap({ topology, selected, onSelect, degradedPods = false }: { topology: Topology; selected?: string; onSelect: (node: TopologyNode) => void; degradedPods?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-panel/75 p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {topology.nodes.map((node) => {
          const status = degradedPods && node.id === "pods" ? "degraded" : node.status;
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelect(node)}
              className={clsx(
                "min-h-28 rounded-2xl border p-4 text-left transition hover:border-sky-300/40 active:scale-[0.99]",
                selected === node.id ? "border-sky-300/50 bg-sky-300/10" : "border-line bg-slate-950/40",
                status === "degraded" && "animate-pulse border-rose-300/40 bg-rose-400/10",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs uppercase tracking-[0.16em] text-slate-500">{node.group}</p>
                  <h3 className="mt-2 truncate text-sm font-semibold text-white">{node.label}</h3>
                </div>
                <StatusBadge status={status} />
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">{node.role}</p>
            </button>
          );
        })}
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {topology.edges.map((edge) => (
          <div key={`${edge.source}-${edge.target}`} className="truncate rounded-xl border border-line bg-slate-950/45 px-3 py-2 font-mono text-xs text-slate-400">
            {edge.source} {"->"} {edge.target}: {edge.label}
          </div>
        ))}
      </div>
    </div>
  );
}
