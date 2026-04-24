import { CaretLeft, CaretRight, Pause, Play, SkipBack, Gauge } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LifecycleTimeline } from "../components/command-center/LifecycleTimeline";
import { TopologyMap } from "../components/topology/TopologyMap";
import { CopyButton } from "../components/shared/CopyButton";
import { SectionHeader } from "../components/shared/SectionHeader";
import { StatusBadge } from "../components/shared/StatusBadge";
import { demoTopology, lifecycle, replayPhases } from "../lib/demo-data";

export function Replay() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const phase = replayPhases[index];
  const visibleEvents = replayPhases.slice(0, index + 1).map((item) => item.event);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setIndex((current) => current >= replayPhases.length - 1 ? current : current + 1);
    }, 1450 / speed);
    return () => window.clearInterval(timer);
  }, [playing, speed]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        setPlaying((value) => !value);
      }
      if (event.key === "ArrowRight") setIndex((value) => Math.min(replayPhases.length - 1, value + 1));
      if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const status = useMemo(() => phase.status === "Degraded" ? "degraded" : phase.status === "Recovering" ? "recovering" : "recovered", [phase.status]);

  return (
    <div className="mx-auto max-w-[1460px]">
      <SectionHeader eyebrow="Incident Replay" title="Pod failure recovery, step by step" description="A deterministic replay of the closed-loop workflow: failure, detection, context capture, runbook selection, recovery, validation, and audit." action={<StatusBadge status={status}>{phase.status.toUpperCase()}</StatusBadge>} />
      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-2xl border border-line bg-panel/82 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-xs text-slate-500">STEP {index + 1}/{replayPhases.length}</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">{phase.label}</h1>
              <p className="mt-2 text-sm text-slate-400">{phase.event}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 active:scale-[0.98]" onClick={() => { setIndex(0); setPlaying(false); }} aria-label="Restart replay"><SkipBack size={17} /></button>
              <button className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 active:scale-[0.98]" onClick={() => setIndex((value) => Math.max(0, value - 1))} aria-label="Previous step"><CaretLeft size={17} /></button>
              <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 active:scale-[0.98]" onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={17} weight="fill" /> : <Play size={17} weight="fill" />}{playing ? "Pause" : "Play"}</button>
              <button className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 active:scale-[0.98]" onClick={() => setIndex((value) => Math.min(replayPhases.length - 1, value + 1))} aria-label="Next step"><CaretRight size={17} /></button>
              {[1, 2, 4].map((item) => <button key={item} className={`rounded-lg border px-3 py-2 text-sm font-semibold active:scale-[0.98] ${speed === item ? "border-sky-300/50 bg-sky-300/10 text-sky-100" : "border-slate-700 text-slate-300"}`} onClick={() => setSpeed(item)}>{item}x</button>)}
            </div>
          </div>
          <div className="mt-5">
            <TopologyMap topology={demoTopology} degradedPods={index >= 2 && index <= 7} selected="pods" onSelect={() => undefined} />
            <p className="mt-3 text-center text-xs text-slate-500">Node inspection is available on the <Link to="/topology" className="text-sky-300/70 underline underline-offset-2 hover:text-sky-200">Topology page</Link>.</p>
          </div>
        </div>
        <div className="grid gap-5">
          <div className="rounded-2xl border border-line bg-panel/80 p-5">
            <div className="flex items-center gap-2"><Gauge size={20} className="text-emerald-200" /><h2 className="text-lg font-semibold text-white">SLO Validation</h2></div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-line bg-slate-950/45 p-3"><p className="text-xs text-slate-500">Replicas</p><p className="mt-2 font-mono text-2xl text-white">{phase.replicas}</p></div>
              <div className="rounded-xl border border-line bg-slate-950/45 p-3"><p className="text-xs text-slate-500">MTTR</p><p className="mt-2 font-mono text-2xl text-white">{phase.mttr ?? "--"}</p></div>
              <div className="rounded-xl border border-line bg-slate-950/45 p-3"><p className="text-xs text-slate-500">Target</p><p className="mt-2 font-mono text-2xl text-white">&lt;30s</p></div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">The replay shows recovery crossing from degraded to validated only after readiness returns and MTTR is calculated.</p>
          </div>
          <div className="rounded-2xl border border-line bg-panel/80 p-5">
            <h2 className="text-lg font-semibold text-white">Event Stream</h2>
            <div className="mt-4 max-h-[300px] space-y-2 overflow-auto pr-1">
              {visibleEvents.map((event, eventIndex) => <p key={event} className="rounded-lg border border-line bg-slate-950/45 px-3 py-2 font-mono text-xs text-slate-300">T+{String(eventIndex).padStart(2, "0")}s {event}</p>)}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-panel/80 p-5">
            <h2 className="text-lg font-semibold text-white">Artifacts and runbook</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {["snapshot-pre/", "result.json", "report.md", "remediation-decision.json"].map((item) => <span key={item} className="rounded-lg border border-line bg-slate-950/45 px-3 py-2 font-mono text-xs text-slate-300">{item}</span>)}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 active:scale-[0.98]" to="/incidents/INC-20260422153045">View report</Link>
              <Link className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 active:scale-[0.98]" to="/runbooks">Open runbook</Link>
              <CopyButton value="./chaos_monkey.sh" />
            </div>
          </div>
        </div>
      </div>
      <section className="mt-6"><LifecycleTimeline phases={lifecycle} activePhase={Math.min(5, Math.floor(index / 2))} /></section>
    </div>
  );
}
