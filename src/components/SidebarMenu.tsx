import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

interface SidebarMenuProps {
  isOpen: boolean;
  onClose(): void;
}

interface QuizFolderGroup {
  id: string;
  name: string;
  quizzes: Array<{
    id: string;
    title: string;
  }>;
}

export function SidebarMenu({ isOpen, onClose }: SidebarMenuProps) {
  const location = useLocation();
  const { quizzes } = useAppContext();
  const activeQuizId = location.pathname.startsWith("/quiz/") ? location.pathname.split("/")[2] : undefined;
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const sidebarState = useMemo(() => {
    const standaloneQuizzes = quizzes
      .filter((quiz) => !quiz.collectionId)
      .sort((left, right) => new Date(right.importedAt).getTime() - new Date(left.importedAt).getTime());

    const folderMap = new Map<string, QuizFolderGroup>();

    quizzes
      .filter((quiz) => quiz.collectionId)
      .sort((left, right) => new Date(right.importedAt).getTime() - new Date(left.importedAt).getTime())
      .forEach((quiz) => {
        const folderId = quiz.collectionId as string;
        const existing = folderMap.get(folderId);
        if (existing) {
          existing.quizzes.push({ id: quiz.id, title: quiz.title });
          return;
        }

        folderMap.set(folderId, {
          id: folderId,
          name: quiz.collectionName || "Imported ZIP",
          quizzes: [{ id: quiz.id, title: quiz.title }],
        });
      });

    return {
      standaloneQuizzes,
      folders: Array.from(folderMap.values()),
    };
  }, [quizzes]);

  useEffect(() => {
    if (!activeQuizId) {
      return;
    }

    const containingFolder = sidebarState.folders.find((folder) =>
      folder.quizzes.some((quiz) => quiz.id === activeQuizId),
    );

    if (!containingFolder) {
      return;
    }

    setExpandedFolders((current) => ({
      ...current,
      [containingFolder.id]: true,
    }));
  }, [activeQuizId, sidebarState.folders]);

  const hasLibraryItems = sidebarState.standaloneQuizzes.length > 0 || sidebarState.folders.length > 0;

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-ink/35 transition ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-[20rem] max-w-[88vw] flex-col bg-ink text-white shadow-2xl transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <Link to="/" onClick={onClose} className="text-lg font-black tracking-tight text-white">
            サクッと記憶
          </Link>
          <button
            type="button"
            className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-5">
            <div>
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">Library</p>
              <div className="mt-3 space-y-1">
                <Link
                  to="/"
                  onClick={onClose}
                  className={`block rounded-2xl px-3 py-3 text-sm font-semibold transition ${location.pathname === "/" ? "bg-white/14 text-white" : "text-white/72 hover:bg-white/8 hover:text-white"}`}
                >
                  Home
                </Link>
              </div>
            </div>

            {sidebarState.standaloneQuizzes.length > 0 ? (
              <div>
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">Quizzes</p>
                <div className="mt-3 space-y-1">
                  {sidebarState.standaloneQuizzes.map((quiz) => (
                    <Link
                      key={quiz.id}
                      to={`/quiz/${quiz.id}`}
                      onClick={onClose}
                      className={`block rounded-2xl px-3 py-3 text-sm font-semibold transition ${activeQuizId === quiz.id ? "bg-white/14 text-white" : "text-white/72 hover:bg-white/8 hover:text-white"}`}
                    >
                      {quiz.title}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {sidebarState.folders.length > 0 ? (
              <div>
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">Folders</p>
                <div className="mt-3 space-y-2">
                  {sidebarState.folders.map((folder) => {
                    const isExpanded = expandedFolders[folder.id] ?? false;
                    return (
                      <div key={folder.id} className="rounded-3xl border border-white/8 bg-white/[0.03] p-2">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-semibold text-white/78 transition hover:bg-white/8 hover:text-white"
                          onClick={() =>
                            setExpandedFolders((current) => ({
                              ...current,
                              [folder.id]: !isExpanded,
                            }))
                          }
                        >
                          <span className="truncate">{folder.name}</span>
                          <span className="ml-3 text-xs text-white/45">{isExpanded ? "−" : "+"}</span>
                        </button>
                        {isExpanded ? (
                          <div className="mt-1 space-y-1 px-1 pb-1">
                            {folder.quizzes.map((quiz) => (
                              <Link
                                key={quiz.id}
                                to={`/quiz/${quiz.id}`}
                                onClick={onClose}
                                className={`block rounded-2xl px-3 py-3 text-sm transition ${activeQuizId === quiz.id ? "bg-brand text-white" : "text-white/68 hover:bg-white/8 hover:text-white"}`}
                              >
                                {quiz.title}
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {!hasLibraryItems ? (
              <div className="rounded-3xl border border-dashed border-white/10 px-4 py-5 text-sm leading-6 text-white/55">
                Import a JSON quiz or a ZIP package from the home screen to populate the library.
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
}
