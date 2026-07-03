import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ImportPanel } from "../components/ImportPanel";
import { useAppContext } from "../context/AppContext";
import { formatDuration, formatPercentage } from "../utils/format";

interface ImportFeedbackState {
  successMessage?: string;
  errors: string[];
}

export function HomePage() {
  const { quizzes, statistics, importJson, importZip, isReady } = useAppContext();
  const [feedback, setFeedback] = useState<ImportFeedbackState>({ errors: [] });
  const [isImporting, setIsImporting] = useState(false);

  const weakQuizzes = useMemo(() => {
    return quizzes
      .map((quiz) => {
        const stats = statistics[quiz.id];
        const attempts = stats?.attempts ?? [];
        if (attempts.length === 0) {
          return undefined;
        }

        const latestAttempt = attempts[attempts.length - 1];
        const averagePercentage = attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / attempts.length;

        return {
          quiz,
          attempts,
          latestAttempt,
          averagePercentage,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .sort((left, right) => {
        if (left.averagePercentage !== right.averagePercentage) {
          return left.averagePercentage - right.averagePercentage;
        }
        return right.latestAttempt.wrongAnswers - left.latestAttempt.wrongAnswers;
      })
      .slice(0, 5);
  }, [quizzes, statistics]);

  async function handleImport(action: (file: File) => Promise<{ importedQuizzes: { title: string }[]; errors: string[] }>, file: File) {
    setIsImporting(true);
    try {
      const result = await action(file);
      const importedTitles = result.importedQuizzes.map((quiz) => quiz.title);
      setFeedback({
        successMessage:
          importedTitles.length > 0
            ? `Imported ${importedTitles.length} ${importedTitles.length === 1 ? "quiz" : "quizzes"}: ${importedTitles.join(", ")}`
            : undefined,
        errors: result.errors,
      });
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <ImportPanel
        disabled={!isReady || isImporting}
        onImportJson={(file) => handleImport(importJson, file)}
        onImportZip={(file) => handleImport(importZip, file)}
      />

      <section className="surface-card animate-rise p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Review</p>
            <h2 className="mt-2 text-2xl font-black">Review your mistakes</h2>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              Open a standalone page with the incorrect answers from the latest attempts across your quizzes.
            </p>
          </div>
          <Link to="/review-mistakes" className="action-button bg-ink text-white hover:bg-ink/90">
            Review Mistakes
          </Link>
        </div>
      </section>

      {feedback.successMessage || feedback.errors.length > 0 ? (
        <section className="surface-card animate-rise p-5">
          {feedback.successMessage ? (
            <div className="rounded-3xl bg-accent-soft p-4 text-sm font-semibold text-ink">
              {feedback.successMessage}
            </div>
          ) : null}
          {feedback.errors.length > 0 ? (
            <div className={`${feedback.successMessage ? "mt-3" : ""} rounded-3xl bg-danger-soft p-4`}>
              <p className="text-sm font-black text-danger">Import issues</p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-ink">
                {feedback.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {weakQuizzes.length > 0 ? (
        <section className="surface-card animate-rise p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Weak points</p>
          <h2 className="mt-2 text-2xl font-black">Lower-performing quizzes</h2>
          <div className="mt-4 grid gap-3">
            {weakQuizzes.map(({ quiz, attempts, latestAttempt, averagePercentage }) => (
              <article key={quiz.id} className="rounded-3xl bg-ink/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-ink">{quiz.title}</h3>
                    <p className="mt-1 text-xs text-ink/65">{quiz.collectionName || "Standalone quiz"}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/70">
                    {formatPercentage(averagePercentage)} avg
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-ink/70">
                  <span className="rounded-full bg-white px-3 py-1">{attempts.length} attempts</span>
                  <span className="rounded-full bg-white px-3 py-1">{latestAttempt.wrongAnswers} wrong last run</span>
                  <span className="rounded-full bg-white px-3 py-1">{formatDuration(latestAttempt.durationMs)}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link to={`/quiz/${quiz.id}`} className="action-button flex-1 bg-brand text-white hover:bg-brand-deep">
                    Retry quiz
                  </Link>
                  <Link to={`/review-mistakes?quizId=${encodeURIComponent(quiz.id)}`} className="action-button flex-1 bg-ink/5 text-ink hover:bg-ink/10">
                    Review mistakes
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {quizzes.length === 0 ? (
        <EmptyState
          title="No quizzes imported yet"
          body="Import a JSON quiz or a ZIP package, then open a quiz from the side menu. ZIP imports appear as folders in the library."
        />
      ) : (
        <section className="surface-card animate-rise p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Library ready</p>
          <h2 className="mt-2 text-2xl font-black">Open a quiz from the side menu</h2>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            Imported quizzes now live in the menu drawer. Standalone JSON quizzes appear directly in the list, and ZIP imports appear inside folders.
          </p>
        </section>
      )}
    </div>
  );
}
