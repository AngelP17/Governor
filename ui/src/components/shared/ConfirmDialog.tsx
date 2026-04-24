export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/70 px-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-surface">
        <h2 id="confirm-title" className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">{body}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 active:scale-[0.98]" onClick={onCancel}>Cancel</button>
          <button className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 active:scale-[0.98]" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
