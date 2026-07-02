import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { SidebarMenu } from "./SidebarMenu";

export function AppLayout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-hero-glow px-4 pb-8 pt-4 text-ink sm:px-6">
      <SidebarMenu isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4">
        <header className="surface-card sticky top-4 z-20 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink/10 bg-ink/5 text-ink transition hover:bg-ink hover:text-white"
              onClick={() => setIsSidebarOpen(true)}
            >
              <span className="space-y-1.5">
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
              </span>
            </button>
            <Link to="/" className="text-2xl font-black tracking-tight text-ink">
              サクッと記憶
            </Link>
          </div>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
