import { Link, useLocation } from "wouter";
import { Calculator, ClipboardList, Database, Train, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import FreshnessBanner from "@/components/FreshnessBanner";

const NAV = [
  { href: "/",         label: "New Calculation", icon: Calculator },
  { href: "/history",  label: "History",         icon: ClipboardList },
  { href: "/reference", label: "Reference Data", icon: Database },
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", compact ? "px-3 py-2" : "px-4 pt-5 pb-4")}>
      <svg viewBox="0 0 32 32" width={compact ? 22 : 28} height={compact ? 22 : 28} fill="none" aria-label="Rule 107 DV">
        <rect x="3" y="9" width="26" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="9" cy="25" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="23" cy="25" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 14 L29 14" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 6 L24 6" stroke="hsl(var(--sidebar-primary))" strokeWidth="2.2" strokeLinecap="square" />
      </svg>
      <div className="flex flex-col leading-tight">
        <span className={cn("font-semibold tracking-tight text-sidebar-foreground", compact ? "text-[13px]" : "text-sm")}>Rule 107 DV</span>
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Depreciated Value</span>
      </div>
    </div>
  );
}

function NavLinks({ loc, onClick }: { loc: string; onClick?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 px-2 py-2">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = loc === href || (href !== "/" && loc.startsWith(href));
        return (
          <Link key={href} href={href}>
            <a
              data-testid={`link-${label.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={onClick}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover-elevate relative",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </a>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="mt-auto px-4 py-4 border-t border-sidebar-border text-[11px] leading-relaxed text-muted-foreground">
      <div className="flex items-center gap-1.5 mb-1">
        <Train className="h-3 w-3" />
        <span className="uppercase tracking-[0.15em]">AAR Office Manual</span>
      </div>
      Rule 107 · Jan 2026
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [loc] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the drawer when route changes
  useEffect(() => { setMobileOpen(false); }, [loc]);

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileOpen]);

  const currentLabel = NAV.find(
    n => loc === n.href || (n.href !== "/" && loc.startsWith(n.href))
  )?.label ?? "Rule 107 DV";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ------------ Mobile top bar (hidden on md+) ------------ */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-sidebar border-b border-sidebar-border px-3 h-12 no-print">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          data-testid="button-open-menu"
          className="inline-flex items-center justify-center h-9 w-9 rounded-md text-sidebar-foreground hover-elevate"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="text-sm font-medium text-sidebar-foreground truncate">{currentLabel}</div>
        <div className="w-9" aria-hidden="true" />
      </header>

      {/* ------------ Mobile drawer ------------ */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 no-print" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[82%] max-w-[300px] bg-sidebar border-r border-sidebar-border flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-start justify-between pr-2">
              <Logo />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="mt-3 h-9 w-9 rounded-md inline-flex items-center justify-center text-sidebar-foreground hover-elevate"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks loc={loc} onClick={() => setMobileOpen(false)} />
            <SidebarFooter />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen">
        {/* ------------ Desktop sidebar (hidden on < md) ------------ */}
        <aside className="hidden md:flex w-60 shrink-0 border-r border-sidebar-border bg-sidebar flex-col no-print">
          <Logo />
          <NavLinks loc={loc} />
          <SidebarFooter />
        </aside>

        {/* ------------ Main ------------ */}
        <main className="flex-1 min-w-0">
          <FreshnessBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
