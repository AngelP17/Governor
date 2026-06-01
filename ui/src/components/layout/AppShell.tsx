import { ArrowsClockwise, BookOpenText, ChartLine, Gauge, GitBranch, ListChecks, PlayCircle, Pulse, ShieldCheck, Siren } from "@phosphor-icons/react";
import { NavLink, Outlet } from "react-router-dom";
import { clsx } from "clsx";
import { StatusBadge } from "../shared/StatusBadge";

const navItems = [
  { to: "/command-center", label: "Command Center", icon: Pulse },
  { to: "/replay", label: "Replay", icon: PlayCircle },
  { to: "/incidents", label: "Incidents", icon: Siren },
  { to: "/runbooks", label: "Runbooks", icon: BookOpenText },
  { to: "/slos", label: "SLOs", icon: ChartLine },
  { to: "/topology", label: "Topology", icon: GitBranch },
  { to: "/controls", label: "Controls", icon: ShieldCheck },
  { to: "/demo", label: "Demo", icon: ListChecks },
];

export function AppShell() {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden">
      <div className="mx-auto grid min-h-[100dvh] max-w-[1660px] grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-line bg-graphite/80 px-4 py-4 backdrop-blur lg:sticky lg:top-0 lg:h-[100dvh] lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="flex items-center justify-between gap-4 lg:block">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.18)]">
                  <Gauge size={16} weight="duotone" />
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-cyan-300/80">Governor</p>
              </div>
              <h1 className="mt-2 text-lg font-semibold tracking-tight text-white lg:text-xl">Reliability Control Plane</h1>
            </div>
            <StatusBadge status="healthy">LOCAL FIRST</StatusBadge>
          </div>
          <nav className="mt-5 flex gap-2 overflow-x-auto pb-2 lg:grid lg:overflow-visible lg:pb-0" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    "group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition active:scale-[0.99] lg:shrink",
                    isActive ? "bg-slate-800/80 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" : "text-slate-400 hover:bg-slate-900/70 hover:text-slate-100",
                  )
                }
              >
                <item.icon size={19} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="mt-8 hidden rounded-2xl border border-line bg-panel/80 p-4 lg:block">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ArrowsClockwise size={18} className="shrink-0 text-sky-200" />
              <span className="truncate">Local commands</span>
            </div>
            <div className="mt-4 space-y-2 overflow-hidden font-mono text-xs text-slate-400">
              <p className="truncate">./setup.sh</p>
              <p className="truncate">./chaos_monkey.sh</p>
              <p className="truncate">make validate</p>
              <p className="truncate">make summary</p>
            </div>
          </div>
        </aside>
        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-line bg-graphite/78 px-4 py-3 backdrop-blur md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="truncate font-mono text-xs text-slate-500">AngelP17/governor</p>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status="observing">API FALLBACK READY</StatusBadge>
                <StatusBadge status="synced">GITOPS</StatusBadge>
              </div>
            </div>
          </header>
          <main className="shell-scrollbar min-h-[calc(100dvh-57px)] px-4 py-6 md:px-8 lg:px-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
