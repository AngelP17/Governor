import { CheckCircle, GitBranch, ShieldCheck } from "@phosphor-icons/react";

const stages = ["Code Push", "Bandit Scan", "Docker Build", "Trivy Scan", "Push Image", "Update Manifests", "ArgoCD Sync", "Rolling Update"];

export function GitOpsPipeline() {
  return (
    <div className="rounded-2xl border border-line bg-panel/80 p-5">
      <div className="flex items-center gap-2">
        <GitBranch size={20} className="shrink-0 text-sky-200" />
        <h2 className="text-lg font-semibold text-white">GitOps Delivery Flow</h2>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
        {stages.map((stage, index) => (
          <div key={stage} className="rounded-xl border border-line bg-slate-950/45 p-3">
            <div className="flex items-center justify-between">
              {index < 2 ? <ShieldCheck size={18} className="shrink-0 text-emerald-200" /> : <CheckCircle size={18} className="shrink-0 text-emerald-200" weight="fill" />}
              <span className="shrink-0 font-mono text-xs text-slate-500">{String(index + 1).padStart(2, "0")}</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{stage}</p>
            <p className="mt-1 text-xs text-emerald-200">{index === 6 ? "Synced" : "Passed"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
