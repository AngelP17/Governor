import { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "../components/shared/SectionHeader";
import { StatusBadge } from "../components/shared/StatusBadge";
import { LoadingState } from "../components/shared/States";
import { api } from "../lib/api";
import type { Control } from "../lib/types";

export function Controls() {
  const [controls, setControls] = useState<Control[]>();
  useEffect(() => { api.controls().then((result) => setControls(result.data)); }, []);
  const grouped = useMemo(() => (controls ?? []).reduce<Record<string, Control[]>>((acc, control) => {
    acc[control.category] = [...(acc[control.category] ?? []), control];
    return acc;
  }, {}), [controls]);

  if (!controls) return <LoadingState />;

  return (
    <div className="mx-auto max-w-[1400px]">
      <SectionHeader eyebrow="Policy and Production Controls" title="Controls mapped to repo artifacts" description="The value here is not claiming production hosting. It is showing the concrete controls, the risks they reduce, and the boundaries that remain." />
      <div className="grid gap-6">
        {Object.entries(grouped).map(([category, items]) => (
          <section key={category}>
            <h2 className="mb-3 text-xl font-semibold text-white">{category}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((control) => (
                <article key={control.name} className="rounded-2xl border border-line bg-panel/80 p-5">
                  <div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-white">{control.name}</h3><StatusBadge status={control.status} /></div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{control.why}</p>
                  <div className="mt-4 rounded-xl border border-line bg-slate-950/45 p-3"><p className="text-xs text-slate-500">Artifact</p><p className="mt-1 break-all font-mono text-xs text-slate-200">{control.artifact}</p></div>
                  <p className="mt-4 text-sm leading-6 text-slate-300"><span className="text-slate-500">Risk reduced:</span> {control.risk_reduced}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      <section className="mt-7 rounded-2xl border border-amber-400/20 bg-amber-400/8 p-6">
        <h2 className="text-xl font-semibold text-amber-100">Known Boundaries</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {["Runs locally on k3d, not production hosted.", "HPA requires metrics-server for active scaling.", "Webhook receiver is local-only with no TLS/auth.", "No on-call or ticketing integration yet.", "AWS/EKS path is documented but not provisioned."].map((item) => <p key={item} className="rounded-xl border border-amber-400/15 bg-slate-950/30 p-4 text-sm text-amber-100/80">{item}</p>)}
        </div>
      </section>
    </div>
  );
}
