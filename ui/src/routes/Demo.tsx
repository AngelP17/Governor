import { CaretRight } from "@phosphor-icons/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { SectionHeader } from "../components/shared/SectionHeader";
import { StatusBadge } from "../components/shared/StatusBadge";

const steps = [
  ["Platform baseline", "3-node k3d cluster, 3 FastAPI replicas, Prometheus scraping /metrics, and ArgoCD reconciling manifests.", "Healthy local control plane with observable service state."],
  ["Failure injection", "The chaos workflow terminates one FastAPI pod in a controlled local experiment.", "Replica count drops from 3/3 to 2/3."],
  ["Detection and context capture", "Prometheus alert rules detect replica loss and the snapshot script records pods, events, logs, and deployment state.", "Operational context is preserved before recovery hides evidence."],
  ["Recovery and validation", "Kubernetes restores desired state, readiness passes, and MTTR is checked against the 30-second objective.", "Replica count returns to 3/3 in 12 seconds."],
  ["Audit and production-readiness summary", "The incident report, result.json, remediation log, and decision record provide an auditable narrative.", "Boundaries and next hardening steps are visible."],
] as const;

export function Demo() {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  return (
    <div className="mx-auto max-w-[1200px]">
      <SectionHeader eyebrow="Guided Walkthrough" title="Portfolio review mode" description="A five-step explanation designed for SRE, Platform, and Infrastructure hiring conversations." action={<StatusBadge status="observing">STEP {index + 1}/5</StatusBadge>} />
      <div className="rounded-[1.5rem] border border-line bg-panel/82 p-6 md:p-8">
        <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr]">
          <div className="space-y-3">
            {steps.map((item, stepIndex) => (
              <button key={item[0]} onClick={() => setIndex(stepIndex)} className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition active:scale-[0.99] ${index === stepIndex ? "border-emerald-300/45 bg-emerald-300/10 text-white" : "border-line bg-slate-950/35 text-slate-400 hover:text-slate-200"}`}>
                {stepIndex + 1}. {item[0]}
              </button>
            ))}
          </div>
          <div className="min-w-0">
            <p className="font-mono text-xs text-slate-500">PORTFOLIO NARRATIVE</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">{step[0]}</h1>
            <p className="mt-5 text-base leading-7 text-slate-300 md:text-lg md:leading-8">{step[1]}</p>
            <details className="mt-6 rounded-2xl border border-line bg-slate-950/45 p-5">
              <summary className="cursor-pointer font-semibold text-white">Technical detail</summary>
              <p className="mt-3 text-sm leading-6 text-slate-400">{step[2]}</p>
            </details>
            <div className="mt-7 flex flex-wrap gap-2">
              <button disabled={index === steps.length - 1} onClick={() => setIndex((value) => Math.min(steps.length - 1, value + 1))} title={index === steps.length - 1 ? "You are on the final step" : undefined} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-semibold text-slate-950 transition enabled:hover:bg-emerald-200 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45">Next <CaretRight size={17} weight="bold" /></button>
              <Link to="/replay" className="shrink-0 rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-sky-300/45 active:scale-[0.98]">Open replay</Link>
              <Link to="/controls" className="shrink-0 rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-sky-300/45 active:scale-[0.98]">Production controls</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
