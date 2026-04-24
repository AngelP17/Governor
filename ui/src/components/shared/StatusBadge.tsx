import { clsx } from "clsx";
import { dotTone, statusLabel, statusTone } from "../../lib/status";
import type { Status } from "../../lib/types";

export function StatusBadge({ status, children }: { status: Status | "resolved" | boolean; children?: React.ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide", statusTone(status))}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", dotTone(status))} aria-hidden="true" />
      {children ?? statusLabel(status)}
    </span>
  );
}
