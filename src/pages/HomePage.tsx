import { useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { ImportPanel } from "../components/ImportPanel";
import { useAppContext } from "../context/AppContext";

interface ImportFeedbackState {
  successMessage?: string;
  errors: string[];
}

export function HomePage() {
  const { quizzes, importJson, importZip, isReady } = useAppContext();
  const [feedback, setFeedback] = useState<ImportFeedbackState>({ errors: [] });
  const [isImporting, setIsImporting] = useState(false);

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
