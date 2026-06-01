import type { Status } from "./types";

export const statusLabel = (status: Status | "resolved" | boolean): string => {
  if (typeof status === "boolean") return status ? "SLO MET" : "SLO BREACHED";
  return status.replace(/_/g, " ").toUpperCase();
};

export const statusTone = (status: Status | "resolved" | boolean): string => {
  if (typeof status === "boolean") return status ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-rose-400/30 bg-rose-400/10 text-rose-200";
  if (["healthy", "recovered", "met", "synced", "passing", "configured", "enforced", "resolved"].includes(status)) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }
  if (["degraded", "recovering", "pending", "documented gap", "observing", "reconciling"].includes(status)) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  }
  return "border-rose-400/30 bg-rose-400/10 text-rose-100";
};

export const dotTone = (status: Status | "resolved" | boolean): string => {
  if (typeof status === "boolean") return status ? "bg-emerald-300" : "bg-rose-300";
  if (["healthy", "recovered", "met", "synced", "passing", "configured", "enforced", "resolved"].includes(status)) return "bg-emerald-300";
  if (["degraded", "recovering", "pending", "documented gap", "observing", "reconciling"].includes(status)) return "bg-amber-300";
  return "bg-rose-300";
};
