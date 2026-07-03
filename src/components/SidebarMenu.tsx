import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const {
    quizzes,
    deleteCollection,
    deleteQuiz,
    renameCollection,
    renameQuiz,
  } = useAppContext();
  const activeQuizId = location.pathname.startsWith("/quiz/") ? location.pathname.split("/")[2] : undefined;
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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

  const activeCollectionId = useMemo(() => {
    const activeQuiz = quizzes.find((quiz) => quiz.id === activeQuizId);
    return activeQuiz?.collectionId;
  }, [activeQuizId, quizzes]);

  useEffect(() => {
    setOpenMenuId(null);
  }, [location.pathname]);

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

  function toggleMenu(menuId: string) {
    setOpenMenuId((current) => (current === menuId ? null : menuId));
  }

  async function handleRenameQuiz(quizId: string, currentTitle: string) {
    const nextTitle = window.prompt("Rename quiz", currentTitle)?.trim();
    setOpenMenuId(null);
    if (!nextTitle || nextTitle === currentTitle) {
      return;
    }
    await renameQuiz(quizId, nextTitle);
  }

  async function handleDeleteQuiz(quizId: string, title: string) {
    setOpenMenuId(null);
    if (!window.confirm(`Delete quiz \"${title}\"?`)) {
      return;
    }
    if (activeQuizId === quizId) {
      navigate("/");
    }
    await deleteQuiz(quizId);
  }

  async function handleRenameFolder(folderId: string, currentName: string) {
    const nextName = window.prompt("Rename folder", currentName)?.trim();
    setOpenMenuId(null);
    if (!nextName || nextName === currentName) {
      return;
    }
    await renameCollection(folderId, nextName);
  }

  async function handleDeleteFolder(folderId: string, folderName: string) {
    setOpenMenuId(null);
    if (!window.confirm(`Delete folder \"${folderName}\" and all quizzes inside it?`)) {
      return;
    }
    if (activeCollectionId === folderId) {
      navigate("/");
    }
    await deleteCollection(folderId);
  }

  function KebabMenu({
    menuId,
    renameLabel,
    deleteLabel,
    onRename,
    onDelete,
  }: {
    menuId: string;
    renameLabel: string;
    deleteLabel: string;
    onRename(): void;
    onDelete(): void;
  }) {
    const isOpenMenu = openMenuId === menuId;

    return (
      <div className="relative">
        <button
          type="button"
          aria-label="Open actions"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/65 transition hover:bg-white/10 hover:text-white"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleMenu(menuId);
          }}
        >
          <span className="text-lg leading-none">?</span>
        </button>
        {isOpenMenu ? (
          <div className="absolute right-0 top-10 z-20 min-w-[9rem] rounded-2xl border border-white/10 bg-[#1b2940] p-1 shadow-2xl">
            <button
              type="button"
              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onRename();
              }}
            >
              {renameLabel}
            </button>
            <button
              type="button"
              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[#ffb3aa] transition hover:bg-white/10 hover:text-white"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDelete();
              }}
            >
              {deleteLabel}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

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
                <Link
                  to="/review-mistakes"
                  onClick={onClose}
                  className={`block rounded-2xl px-3 py-3 text-sm font-semibold transition ${location.pathname === "/review-mistakes" ? "bg-white/14 text-white" : "text-white/72 hover:bg-white/8 hover:text-white"}`}
                >
                  Review Mistakes
                </Link>
              </div>
            </div>

            {sidebarState.standaloneQuizzes.length > 0 ? (
              <div>
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">Quizzes</p>
                <div className="mt-3 space-y-1">
                  {sidebarState.standaloneQuizzes.map((quiz) => {
                    const isActive = activeQuizId === quiz.id;
                    return (
                      <div key={quiz.id} className="flex items-center gap-1 rounded-2xl pr-1">
                        <Link
                          to={`/quiz/${quiz.id}`}
                          onClick={onClose}
                          className={`min-w-0 flex-1 truncate rounded-2xl px-3 py-3 text-sm font-semibold transition ${isActive ? "bg-white/14 text-white" : "text-white/72 hover:bg-white/8 hover:text-white"}`}
                        >
                          {quiz.title}
                        </Link>
                        {isActive ? (
                          <KebabMenu
                            menuId={`quiz-${quiz.id}`}
                            renameLabel="Rename quiz"
                            deleteLabel="Delete quiz"
                            onRename={() => void handleRenameQuiz(quiz.id, quiz.title)}
                            onDelete={() => void handleDeleteQuiz(quiz.id, quiz.title)}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {sidebarState.folders.length > 0 ? (
              <div>
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">Folders</p>
                <div className="mt-3 space-y-2">
                  {sidebarState.folders.map((folder) => {
                    const isExpanded = expandedFolders[folder.id] ?? false;
                    const isActiveFolder = activeCollectionId === folder.id;
                    return (
                      <div key={folder.id} className="rounded-3xl border border-white/8 bg-white/[0.03] p-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className={`flex min-w-0 flex-1 items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${isActiveFolder || isExpanded ? "bg-white/8 text-white" : "text-white/78 hover:bg-white/8 hover:text-white"}`}
                            onClick={() =>
                              setExpandedFolders((current) => ({
                                ...current,
                                [folder.id]: !isExpanded,
                              }))
                            }
                          >
                            <span className="truncate">{folder.name}</span>
                            <span className="ml-3 text-xs text-white/45">{isExpanded ? "?" : "+"}</span>
                          </button>
                          {isExpanded || isActiveFolder ? (
                            <KebabMenu
                              menuId={`folder-${folder.id}`}
                              renameLabel="Rename folder"
                              deleteLabel="Delete folder"
                              onRename={() => void handleRenameFolder(folder.id, folder.name)}
                              onDelete={() => void handleDeleteFolder(folder.id, folder.name)}
                            />
                          ) : null}
                        </div>
                        {isExpanded ? (
                          <div className="mt-1 space-y-1 px-1 pb-1">
                            {folder.quizzes.map((quiz) => {
                              const isActiveQuiz = activeQuizId === quiz.id;
                              return (
                                <div key={quiz.id} className="flex items-center gap-1 rounded-2xl pr-1">
                                  <Link
                                    to={`/quiz/${quiz.id}`}
                                    onClick={onClose}
                                    className={`min-w-0 flex-1 truncate rounded-2xl px-3 py-3 text-sm transition ${isActiveQuiz ? "bg-brand text-white" : "text-white/68 hover:bg-white/8 hover:text-white"}`}
                                  >
                                    {quiz.title}
                                  </Link>
                                  {isActiveQuiz ? (
                                    <KebabMenu
                                      menuId={`quiz-${quiz.id}`}
                                      renameLabel="Rename quiz"
                                      deleteLabel="Delete quiz"
                                      onRename={() => void handleRenameQuiz(quiz.id, quiz.title)}
                                      onDelete={() => void handleDeleteQuiz(quiz.id, quiz.title)}
                                    />
                                  ) : null}
                                </div>
                              );
                            })}
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
