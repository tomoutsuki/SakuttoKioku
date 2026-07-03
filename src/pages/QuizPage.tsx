import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QuestionCard } from "../components/QuestionCard";
import { QuestionProgress } from "../components/QuestionProgress";
import { useAppContext } from "../context/AppContext";
import { useQuizRecord } from "../hooks/useQuizRecord";
import { createIncorrectQuestionRecord, isQuestionCorrect } from "../quiz/questionRuntime";
import type { QuizQuestionResponse } from "../types/quiz";
import { formatDuration, formatPercentage } from "../utils/format";

export function QuizPage() {
  const { quizId } = useParams();
  const { recordAttempt } = useAppContext();
  const { quiz } = useQuizRecord(quizId);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizQuestionResponse>>({});
  const [elapsedMs, setElapsedMs] = useState(0);
  const [completedDurationMs, setCompletedDurationMs] = useState<number | null>(null);
  const completionRecorded = useRef(false);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
    setElapsedMs(0);
    setCompletedDurationMs(null);
    completionRecorded.current = false;
    startedAtRef.current = Date.now();
  }, [quizId]);

  useEffect(() => {
    if (completedDurationMs !== null) {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [completedDurationMs]);

  const summary = useMemo(() => {
    if (!quiz) {
      return {
        answeredCount: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        percentage: 0,
        incorrectQuestions: [],
        isComplete: false,
      };
    }

    const answeredCount = Object.keys(answers).length;
    const correctAnswers = quiz.questions.reduce((count, question) => {
      const answer = answers[question.id];
      return count + (answer && isQuestionCorrect(question, answer) ? 1 : 0);
    }, 0);

    const incorrectQuestions = quiz.questions.flatMap((question) => {
      const answer = answers[question.id];
      if (!answer) {
        return [];
      }

      const incorrectRecord = createIncorrectQuestionRecord(question, answer);
      return incorrectRecord ? [incorrectRecord] : [];
    });

    const wrongAnswers = answeredCount - correctAnswers;
    const percentage = quiz.questions.length === 0 ? 0 : (correctAnswers / quiz.questions.length) * 100;

    return {
      answeredCount,
      correctAnswers,
      wrongAnswers,
      percentage,
      incorrectQuestions,
      isComplete: answeredCount === quiz.questions.length && quiz.questions.length > 0,
    };
  }, [answers, quiz]);

  useEffect(() => {
    if (!quiz || !summary.isComplete || completionRecorded.current) {
      return;
    }

    completionRecorded.current = true;
    const durationMs = Date.now() - startedAtRef.current;
    setCompletedDurationMs(durationMs);
    void recordAttempt(quiz.id, {
      totalQuestions: quiz.questions.length,
      correctAnswers: summary.correctAnswers,
      wrongAnswers: summary.wrongAnswers,
      percentage: summary.percentage,
      durationMs,
      incorrectQuestions: summary.incorrectQuestions,
    });
  }, [quiz, recordAttempt, summary.correctAnswers, summary.incorrectQuestions, summary.isComplete, summary.percentage, summary.wrongAnswers]);

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
  const currentResponse = answers[currentQuestion.id];
  const currentAsset = currentQuestion.image ? quiz.assets[currentQuestion.image] : undefined;
  const displayDuration = completedDurationMs ?? elapsedMs;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <QuestionProgress currentIndex={currentIndex} total={quiz.questions.length} />

      <section className="surface-card animate-rise p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="truncate text-base font-black text-ink">{quiz.title}</h2>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink/70">
              {formatDuration(displayDuration)}
            </span>
            {summary.isComplete ? (
              <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-deep">
                {formatPercentage(summary.percentage)}
              </span>
            ) : null}
          </div>
        </div>
        {summary.isComplete ? (
          <p className="mt-2 text-xs leading-5 text-ink/70">
            Final score: {summary.correctAnswers} / {quiz.questions.length}
          </p>
        ) : null}
      </section>

      <div className="min-h-0 flex-1">
        <QuestionCard
          question={currentQuestion}
          assetSource={currentAsset}
          response={currentResponse}
          onSubmitAnswer={(answer) =>
            setAnswers((current) =>
              current[currentQuestion.id] !== undefined
                ? current
                : {
                    ...current,
                    [currentQuestion.id]: answer,
                  },
            )
          }
        />
      </div>

      <section className="surface-card animate-rise p-3">
        <div className="flex gap-2">
          <button
            type="button"
            className="action-button flex-1 bg-ink/5 py-2.5 text-ink hover:bg-ink/10"
            onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
            disabled={currentIndex === 0}
          >
            Previous
          </button>
          <button
            type="button"
            className="action-button flex-1 bg-brand py-2.5 text-white hover:bg-brand-deep"
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
