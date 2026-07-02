import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QuestionCard } from "../components/QuestionCard";
import { QuestionProgress } from "../components/QuestionProgress";
import { useAppContext } from "../context/AppContext";
import { useQuizRecord } from "../hooks/useQuizRecord";
import { formatDateTime, formatPercentage } from "../utils/format";

export function QuizPage() {
  const { quizId } = useParams();
  const { recordAttempt } = useAppContext();
  const { quiz, stats } = useQuizRecord(quizId);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const completionRecorded = useRef(false);

  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
    completionRecorded.current = false;
  }, [quizId]);

  const summary = useMemo(() => {
    if (!quiz) {
      return {
        answeredCount: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        percentage: 0,
        isComplete: false,
      };
    }

    const answeredCount = Object.keys(answers).length;
    const correctAnswers = quiz.questions.reduce((count, question) => {
      return count + (answers[question.id] === question.correctAnswerIndex ? 1 : 0);
    }, 0);
    const wrongAnswers = answeredCount - correctAnswers;
    const percentage = quiz.questions.length === 0 ? 0 : (correctAnswers / quiz.questions.length) * 100;

    return {
      answeredCount,
      correctAnswers,
      wrongAnswers,
      percentage,
      isComplete: answeredCount === quiz.questions.length && quiz.questions.length > 0,
    };
  }, [answers, quiz]);

  useEffect(() => {
    if (!quiz || !summary.isComplete || completionRecorded.current) {
      return;
    }

    completionRecorded.current = true;
    void recordAttempt(quiz.id, {
      totalQuestions: quiz.questions.length,
      correctAnswers: summary.correctAnswers,
      wrongAnswers: summary.wrongAnswers,
      percentage: summary.percentage,
    });
  }, [quiz, recordAttempt, summary.correctAnswers, summary.isComplete, summary.percentage, summary.wrongAnswers]);

  if (!quiz) {
    return (
      <section className="surface-card p-6">
        <h2 className="text-2xl font-black">Quiz not found</h2>
        <p className="mt-2 text-sm leading-6 text-ink/70">
          The selected quiz does not exist in local storage or has not finished loading.
        </p>
        <Link to="/" className="action-button mt-5 bg-brand text-white hover:bg-brand-deep">
          Back to home
        </Link>
      </section>
    );
  }

  const currentQuestion = quiz.questions[currentIndex];
  const selectedAnswer = answers[currentQuestion.id];
  const currentAsset = currentQuestion.image ? quiz.assets[currentQuestion.image] : undefined;
  const attempts = stats?.attempts ?? [];
  const latestAttempt = attempts[attempts.length - 1];

  return (
    <div className="space-y-5">
      <QuestionProgress
        currentIndex={currentIndex}
        total={quiz.questions.length}
        answeredCount={summary.answeredCount}
      />

      <section className="surface-card animate-rise p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">{quiz.title}</h2>
            <p className="mt-2 text-sm leading-6 text-ink/70">{quiz.description || "No description provided."}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-[14rem]">
            <div className="rounded-2xl bg-ink/5 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/55">Attempts</p>
              <p className="mt-1 text-lg font-black">{attempts.length}</p>
            </div>
            <div className="rounded-2xl bg-brand-soft/70 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-deep">Last score</p>
              <p className="mt-1 text-lg font-black">{formatPercentage(latestAttempt?.percentage ?? 0)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-3xl bg-ink/5 px-4 py-3 text-sm text-ink/70">
          Last played: <strong className="text-ink">{formatDateTime(latestAttempt?.playedAt)}</strong>
        </div>

        {summary.isComplete ? (
          <div className="mt-5 rounded-[28px] bg-brand-soft/80 p-4 text-sm leading-6 text-ink">
            <p className="font-black">Quiz complete.</p>
            <p className="mt-2">
              Final score: {summary.correctAnswers} / {quiz.questions.length} ({formatPercentage(summary.percentage)})
            </p>
          </div>
        ) : null}
      </section>

      <QuestionCard
        question={currentQuestion}
        assetSource={currentAsset}
        selectedAnswer={selectedAnswer}
        onSelectAnswer={(answerIndex) =>
          setAnswers((current) =>
            current[currentQuestion.id] !== undefined
              ? current
              : {
                  ...current,
                  [currentQuestion.id]: answerIndex,
                },
          )
        }
      />

      <section className="surface-card animate-rise p-5">
        <div className="flex gap-3">
          <button
            type="button"
            className="action-button flex-1 bg-ink/5 text-ink hover:bg-ink/10"
            onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
            disabled={currentIndex === 0}
          >
            Previous
          </button>
          <button
            type="button"
            className="action-button flex-1 bg-brand text-white hover:bg-brand-deep"
            onClick={() => setCurrentIndex((value) => Math.min(quiz.questions.length - 1, value + 1))}
            disabled={currentIndex === quiz.questions.length - 1}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
