import { WarningCircle } from "@phosphor-icons/react";
import { CopyButton } from "./CopyButton";

export function LoadingState({ label = "Loading operational state" }: { label?: string }) {
  return (
    <div className="grid gap-4">
      <div className="h-24 animate-pulse rounded-2xl border border-line bg-slate-900/50" aria-label={label} />
      <div className="grid gap-4 md:grid-cols-[1.35fr_0.8fr]">
        <div className="h-72 animate-pulse rounded-2xl border border-line bg-slate-900/50" />
        <div className="h-72 animate-pulse rounded-2xl border border-line bg-slate-900/50" />
      </div>
    </div>
  );
}

export function ApiOfflineState() {
  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/8 p-5">
      <div className="flex items-start gap-3">
        <WarningCircle className="mt-0.5 text-amber-200" size={22} />
        <div>
          <h3 className="font-semibold text-amber-100">Backend unavailable</h3>
          <p className="mt-1 text-sm leading-6 text-amber-100/75">
            The UI is showing demo data. Start the FastAPI service to enable live health, metrics, and chaos controls.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <CopyButton value="cd app && pip install -r requirements.txt && uvicorn main:app --host 0.0.0.0 --port 8080" label="Copy backend command" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmptyIncidentsState({ onDemo }: { onDemo: () => void }) {
  return (
    <div className="rounded-2xl border border-line bg-panel/80 p-8">
      <h3 className="text-lg font-semibold text-white">No incident artifacts found</h3>
      <p className="mt-2 max-w-[62ch] text-sm leading-6 text-slate-400">
        Run ./chaos_monkey.sh or start the demo replay to generate a recovery narrative.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="rounded-lg bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 active:scale-[0.98]" onClick={onDemo}>
          Run Demo Replay
        </button>
        <CopyButton value="./chaos_monkey.sh" />
      </div>
    </div>
  );
}
