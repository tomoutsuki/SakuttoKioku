import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { importQuizFile } from "../quiz/importers";
import { browserStorage } from "../storage/browserStorage";
import type { ImportOutcome, QuizAttempt, QuizStatistics, StoredQuiz } from "../types/quiz";

interface AppContextValue {
  quizzes: StoredQuiz[];
  statistics: Record<string, QuizStatistics>;
  isReady: boolean;
  importJson(file: File): Promise<ImportOutcome>;
  importZip(file: File): Promise<ImportOutcome>;
  recordAttempt(quizId: string, attempt: Omit<QuizAttempt, "id" | "playedAt">): Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function indexStatistics(entries: QuizStatistics[]) {
  return Object.fromEntries(entries.map((entry) => [entry.quizId, entry])) as Record<string, QuizStatistics>;
}

function createAttemptId() {
  return `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AppProvider({ children }: PropsWithChildren) {
  const [quizzes, setQuizzes] = useState<StoredQuiz[]>([]);
  const [statistics, setStatistics] = useState<Record<string, QuizStatistics>>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const [storedQuizzes, storedStatistics] = await Promise.all([
        browserStorage.getQuizzes(),
        browserStorage.getStatistics(),
      ]);

      if (!isMounted) {
        return;
      }

      setQuizzes(
        storedQuizzes.sort(
          (left, right) => new Date(right.importedAt).getTime() - new Date(left.importedAt).getTime(),
        ),
      );
      setStatistics(indexStatistics(storedStatistics));
      setIsReady(true);
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistImportedQuizzes = useCallback(async (outcome: ImportOutcome) => {
    if (outcome.importedQuizzes.length === 0) {
      return outcome;
    }

    const existingIds = new Set(quizzes.map((quiz) => quiz.id));
    const incomingIds = new Set<string>();
    const accepted: StoredQuiz[] = [];
    const errors = [...outcome.errors];

    outcome.importedQuizzes.forEach((quiz) => {
      if (existingIds.has(quiz.id) || incomingIds.has(quiz.id)) {
        errors.push(
          `Quiz "${quiz.title}" uses duplicate quiz id "${quiz.id}". Change the root "id" field or alter the quiz content before importing again.`,
        );
        return;
      }

      incomingIds.add(quiz.id);
      accepted.push(quiz);
    });

    await Promise.all(accepted.map((quiz) => browserStorage.saveQuiz(quiz)));
    setQuizzes((current) =>
      [...accepted, ...current].sort(
        (left, right) => new Date(right.importedAt).getTime() - new Date(left.importedAt).getTime(),
      ),
    );

    return {
      importedQuizzes: accepted,
      errors,
    };
  }, [quizzes]);

  const importJson = useCallback(async (file: File) => {
    const outcome = await importQuizFile(file);
    return persistImportedQuizzes(outcome);
  }, [persistImportedQuizzes]);

  const importZip = useCallback(async (file: File) => {
    const outcome = await importQuizFile(file);
    return persistImportedQuizzes(outcome);
  }, [persistImportedQuizzes]);

  const recordAttempt = useCallback(
    async (quizId: string, attempt: Omit<QuizAttempt, "id" | "playedAt">) => {
      const nextAttempt: QuizAttempt = {
        ...attempt,
        id: createAttemptId(),
        playedAt: new Date().toISOString(),
      };

      const current = statistics[quizId];
      const nextStats: QuizStatistics = {
        quizId,
        attempts: [...(current?.attempts ?? []), nextAttempt],
        totalCorrectAnswers: (current?.totalCorrectAnswers ?? 0) + nextAttempt.correctAnswers,
        totalWrongAnswers: (current?.totalWrongAnswers ?? 0) + nextAttempt.wrongAnswers,
        updatedAt: nextAttempt.playedAt,
      };

      await browserStorage.saveStatistics(nextStats);
      setStatistics((previous) => ({
        ...previous,
        [quizId]: nextStats,
      }));
    },
    [statistics],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      quizzes,
      statistics,
      isReady,
      importJson,
      importZip,
      recordAttempt,
    }),
    [importJson, importZip, isReady, quizzes, recordAttempt, statistics],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider.");
  }
  return context;
}
