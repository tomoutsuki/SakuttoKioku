import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { formatDateTime, formatDuration, formatPercentage } from "../utils/format";

export function IncorrectQuestionsPage() {
  const { quizzes, statistics } = useAppContext();
  const { quizId: routeQuizId } = useParams();
  const [searchParams] = useSearchParams();
  const selectedQuizId = searchParams.get("quizId") ?? routeQuizId ?? undefined;

  const reviewEntries = quizzes
    .map((quiz) => {
      const stats = statistics[quiz.id];
      const attempts = stats?.attempts ?? [];
      const latestAttempt = attempts[attempts.length - 1];
      const incorrectItems = latestAttempt?.incorrectQuestions ?? [];

      if (!latestAttempt || incorrectItems.length === 0) {
        return undefined;
      }

      const incorrectQuestions = incorrectItems
        .map((entry) => {
          const question = quiz.questions.find((item) => item.id === entry.questionId);
          return question
            ? {
                ...entry,
                question,
              }
            : undefined;
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

      if (incorrectQuestions.length === 0) {
        return undefined;
      }

      return {
        quiz,
        latestAttempt,
        incorrectQuestions,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .filter((entry) => (selectedQuizId ? entry.quiz.id === selectedQuizId : true))
    .sort((left, right) => new Date(right.latestAttempt.playedAt).getTime() - new Date(left.latestAttempt.playedAt).getTime());

  const selectedQuiz = selectedQuizId ? quizzes.find((quiz) => quiz.id === selectedQuizId) : undefined;
  const hasReviewEntries = reviewEntries.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <section className="surface-card animate-rise p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-ink">Review Mistakes</h2>
            <p className="mt-1 text-xs leading-5 text-ink/70">
              {selectedQuiz
                ? `Review the incorrect answers from the latest attempt of ${selectedQuiz.title}.`
                : "Review the incorrect answers from the latest attempts across your quizzes."}
            </p>
          </div>
          {selectedQuizId ? (
            <Link to="/review-mistakes" className="action-button bg-ink/5 text-ink hover:bg-ink/10">
              View all
            </Link>
          ) : null}
        </div>
      </section>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!hasReviewEntries ? (
          <section className="surface-card animate-rise p-6">
            <h3 className="text-lg font-black">No mistakes to review</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              {selectedQuiz
                ? "Complete that quiz and any incorrect answers from its latest attempt will appear here."
                : "Complete quizzes and any incorrect answers from their latest attempts will appear here."}
            </p>
          </section>
        ) : (
          <div className="grid gap-4 pb-1">
            {reviewEntries.map(({ quiz, latestAttempt, incorrectQuestions }) => (
              <section key={quiz.id} className="surface-card animate-rise overflow-hidden p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-ink">{quiz.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-ink/65">
                      {quiz.collectionName || "Standalone quiz"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink/70">
                    <span className="rounded-full bg-ink/5 px-3 py-1">{formatPercentage(latestAttempt.percentage)}</span>
                    <span className="rounded-full bg-ink/5 px-3 py-1">{formatDuration(latestAttempt.durationMs)}</span>
                    <span className="rounded-full bg-ink/5 px-3 py-1">{formatDateTime(latestAttempt.playedAt)}</span>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Link to={`/quiz/${quiz.id}`} className="action-button flex-1 bg-brand text-white hover:bg-brand-deep">
                    Retry quiz
                  </Link>
                  {!selectedQuizId ? (
                    <Link to={`/review-mistakes?quizId=${encodeURIComponent(quiz.id)}`} className="action-button flex-1 bg-ink/5 text-ink hover:bg-ink/10">
                      Open only this quiz
                    </Link>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3">
                  {incorrectQuestions.map((entry) => {
                    const { question } = entry;
                    const assetSource = question.image ? quiz.assets[question.image] : undefined;

                    return (
                      <article key={question.id} className="rounded-3xl bg-ink/5 p-4">
                        {assetSource ? (
                          <img src={assetSource} alt="" className="mb-3 h-24 w-full rounded-2xl object-contain bg-white/80" loading="lazy" />
                        ) : null}
                        <h4 className="text-sm font-semibold leading-6 text-ink">{question.prompt}</h4>
                        <div className="mt-3 space-y-2 text-sm">
                          {entry.questionType === "multiple_choice" && question.type === "multiple_choice" ? (
                            <>
                              <div className="rounded-2xl bg-danger-soft px-3 py-3 text-ink">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-danger">Your answer</p>
                                <p className="mt-1 font-semibold">{question.choices[entry.selectedAnswerIndex] || "Unknown"}</p>
                              </div>
                              <div className="rounded-2xl bg-accent-soft px-3 py-3 text-ink">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Correct answer</p>
                                <p className="mt-1 font-semibold">{question.choices[entry.correctAnswerIndex]}</p>
                              </div>
                            </>
                          ) : null}

                          {entry.questionType === "drag_and_drop" && question.type === "drag_and_drop" ? (
                            <div className="grid gap-2">
                              {question.pairs.map((pair) => {
                                const selectedLeftId = Object.entries(entry.selectedPairs).find(([, targetId]) => targetId === pair.id)?.[0];
                                const selectedLeft = question.pairs.find((item) => item.id === selectedLeftId);
                                const isCorrectMatch = selectedLeft?.id === pair.id;

                                return (
                                  <div key={pair.id} className="rounded-2xl bg-white/80 px-3 py-3 text-ink">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/55">{pair.right}</p>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                      <div className={`rounded-2xl px-3 py-3 ${isCorrectMatch ? "bg-accent-soft" : "bg-danger-soft"}`}>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/55">Your match</p>
                                        <p className="mt-1 font-semibold">{selectedLeft?.left ?? "No match recorded"}</p>
                                      </div>
                                      <div className="rounded-2xl bg-accent-soft px-3 py-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/55">Correct match</p>
                                        <p className="mt-1 font-semibold">{pair.left}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}

                          {question.hint ? (
                            <div className="rounded-2xl bg-brand-soft/70 px-3 py-3 text-ink">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-deep">Hint</p>
                              <p className="mt-1 text-sm leading-6">{question.hint}</p>
                            </div>
                          ) : null}

                          {question.explanation ? (
                            <div className="rounded-2xl bg-white/80 px-3 py-3 text-ink">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/60">Explanation</p>
                              <p className="mt-1 text-sm leading-6">{question.explanation}</p>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
