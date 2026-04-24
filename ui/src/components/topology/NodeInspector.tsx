import type { TopologyNode } from "../../lib/types";
import { CopyButton } from "../shared/CopyButton";
import { StatusBadge } from "../shared/StatusBadge";

export function NodeInspector({ node }: { node: TopologyNode }) {
  return (
    <aside className="rounded-2xl border border-line bg-panel/82 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Node Inspector</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{node.label}</h2>
        </div>
        <StatusBadge status={node.status} />
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-400">{node.role}</p>
      <div className="mt-5">
        <h3 className="text-sm font-semibold text-slate-200">Related files</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {(node.files ?? ["manifests/deployment.yaml"]).map((file) => (
            <span key={file} className="rounded-lg border border-line bg-slate-950/50 px-3 py-2 font-mono text-xs text-slate-300">{file}</span>
          ))}
        </div>
      </div>
      <div className="mt-5">
        <h3 className="text-sm font-semibold text-slate-200">Related commands</h3>
        <div className="mt-3 grid gap-2">
          {(node.commands ?? ["kubectl get pods -n default"]).map((command) => (
            <div key={command} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-slate-950/50 p-3">
              <code className="min-w-0 break-all font-mono text-xs text-slate-300">{command}</code>
              <CopyButton value={command} label="Copy" />
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
