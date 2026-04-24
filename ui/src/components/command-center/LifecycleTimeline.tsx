import { clsx } from "clsx";
import { CheckCircle, Circle, Pulse } from "@phosphor-icons/react";
import type { TimelineEvent } from "../../lib/types";

export function LifecycleTimeline({ phases, activePhase = phases.length - 1, compact = false }: { phases: TimelineEvent[]; activePhase?: number; compact?: boolean }) {
  return (
    <div className={clsx("grid gap-3", compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6")}>
      {phases.map((phase, index) => {
        const done = index <= activePhase;
        const Icon = done ? CheckCircle : index === activePhase + 1 ? Pulse : Circle;
        return (
          <article key={phase.phase} className={clsx("relative rounded-2xl border p-4", done ? "border-emerald-400/20 bg-emerald-400/8" : "border-line bg-panel/70")}>
            <div className="flex items-center justify-between">
              <Icon size={22} className={done ? "text-emerald-200" : "text-slate-500"} weight={done ? "fill" : "regular"} />
              <span className="shrink-0 font-mono text-xs text-slate-500">{phase.timestamp}</span>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-white">{phase.label}</h3>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">{phase.phase}</p>
            <p className="mt-3 text-sm leading-6 text-slate-400">{phase.detail}</p>
          </article>
        );
      })}
    </div>
  );
}
