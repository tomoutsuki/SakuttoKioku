import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { SidebarMenu } from "./SidebarMenu";

export function AppLayout() {
  const location = useLocation();
  const { quizzes } = useAppContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const activeQuizId = location.pathname.startsWith("/quiz/") ? location.pathname.split("/")[2] : undefined;
  const activeQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.id === activeQuizId),
    [activeQuizId, quizzes],
  );
  const isQuizRoute = location.pathname.startsWith("/quiz/");
  const headerTitle = isQuizRoute
    ? activeQuiz?.collectionName || activeQuiz?.title || "サクッと記憶"
    : "サクッと記憶";

  return (
    <div className="min-h-screen bg-hero-glow px-4 pb-4 pt-4 text-ink sm:px-6">
      <SidebarMenu isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-4xl flex-col gap-3">
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
            <Link to="/" className="truncate text-lg font-black tracking-tight text-ink sm:text-2xl">
              {headerTitle}
            </Link>
          </div>
        </header>

        <main className={isQuizRoute ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "flex-1"}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
