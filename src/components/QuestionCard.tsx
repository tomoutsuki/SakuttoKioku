import { useEffect, useState } from "react";
import { isQuestionCorrect } from "../quiz/questionRuntime";
import type { QuizQuestionResponse, StoredQuizQuestion } from "../types/quiz";
import { DragAndDropQuestion } from "./DragAndDropQuestion";

interface QuestionCardProps {
  question: StoredQuizQuestion;
  assetSource?: string;
  response?: QuizQuestionResponse;
  onSubmitAnswer(answer: QuizQuestionResponse): void;
}

function choiceClassName(
  choiceIndex: number,
  selectedAnswer: number | undefined,
  correctAnswerIndex: number,
) {
  if (selectedAnswer === undefined) {
    return "border-ink/10 bg-white text-ink hover:border-brand hover:bg-brand-soft/40";
  }

  if (choiceIndex === correctAnswerIndex) {
    return "border-accent bg-accent-soft text-ink";
  }

  if (choiceIndex === selectedAnswer) {
    return "border-danger bg-danger-soft text-ink";
  }

  return "border-ink/10 bg-ink/5 text-ink/55";
}

export function QuestionCard({ question, assetSource, response, onSubmitAnswer }: QuestionCardProps) {
  const [isHintOpen, setIsHintOpen] = useState(false);

  useEffect(() => {
    setIsHintOpen(false);
  }, [question.id]);

  const isMultipleChoice = question.type === "multiple_choice";
  const selectedAnswer =
    isMultipleChoice && response?.questionType === "multiple_choice" ? response.selectedAnswerIndex : undefined;
  const isAnswered = response !== undefined;
  const isCorrect = response ? isQuestionCorrect(question, response) : false;

  return (
    <article className="surface-card animate-rise relative flex h-full min-h-0 flex-col overflow-hidden">
      {assetSource ? (
        <div className="bg-ink/5">
          <img
            src={assetSource}
            alt=""
            className="h-24 w-full object-contain sm:h-28"
            loading="lazy"
          />
        </div>
      ) : question.image ? (
        <div className="border-b border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger">
          The referenced image could not be loaded from local storage.
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold leading-6 text-ink">{question.prompt}</h2>
          {question.hint ? (
            <button
              type="button"
              className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-deep transition hover:bg-brand hover:text-white"
              onClick={() => setIsHintOpen(true)}
            >
              Hint
            </button>
          ) : null}
        </div>

        {question.type === "multiple_choice" ? (
          <>
            <div className="mt-3 grid gap-2">
              {question.choices.map((choice, index) => (
                <button
                  key={`${question.id}-${index}`}
                  type="button"
                  className={`rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${choiceClassName(index, selectedAnswer, question.correctAnswerIndex)}`}
                  disabled={isAnswered}
                  onClick={() =>
                    onSubmitAnswer({
                      questionType: "multiple_choice",
                      selectedAnswerIndex: index,
                    })
                  }
                >
                  <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-[11px] font-black">
                    {String.fromCharCode(65 + index)}
                  </span>
                  {choice}
                </button>
              ))}
            </div>

            {isAnswered ? (
              <div
                className={`mt-3 rounded-2xl p-3 text-xs leading-5 ${
                  isCorrect ? "bg-accent-soft text-ink" : "bg-danger-soft text-ink"
                }`}
              >
                <p className="font-black">{isCorrect ? "Correct answer." : "Incorrect answer."}</p>
                <p className="mt-1">
                  Correct choice: <strong>{question.choices[question.correctAnswerIndex]}</strong>
                </p>
                {question.explanation ? <p className="mt-1">{question.explanation}</p> : null}
              </div>
            ) : null}
          </>
        ) : (
          <DragAndDropQuestion
            question={question}
            response={response?.questionType === "drag_and_drop" ? response : undefined}
            onSubmitAnswer={onSubmitAnswer}
          />
        )}
      </div>

      {isHintOpen && question.hint ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink/35 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-black">Hint</h3>
              <button
                type="button"
                className="rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink transition hover:bg-ink hover:text-white"
                onClick={() => setIsHintOpen(false)}
              >
                Close
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/75">{question.hint}</p>
          </div>
        </div>
      ) : null}
    </article>
  );
}
