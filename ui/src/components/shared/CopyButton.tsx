import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import { useToast } from "./Toast";

export function CopyButton({ value, label = "Copy command" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { push } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      push({ title: "Copied to clipboard", description: value.length > 80 ? `${value.slice(0, 77)}...` : value, variant: "success" });
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      push({ title: "Copy failed", description: "Browser blocked clipboard access. Use Cmd+C manually.", variant: "error" });
    }
  };

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-sky-400/40 hover:text-white active:scale-[0.98]"
      aria-label={`${label}: ${value}`}
      onClick={handleCopy}
    >
      {copied ? <Check size={15} weight="bold" /> : <Copy size={15} />}
      {copied ? "Copied" : label}
    </button>
  );
}
