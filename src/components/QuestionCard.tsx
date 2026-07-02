import type { StoredQuizQuestion } from "../types/quiz";

interface QuestionCardProps {
  question: StoredQuizQuestion;
  assetSource?: string;
  selectedAnswer?: number;
  onSelectAnswer(index: number): void;
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

export function QuestionCard({
  question,
  assetSource,
  selectedAnswer,
  onSelectAnswer,
}: QuestionCardProps) {
  const isAnswered = selectedAnswer !== undefined;
  const isCorrect = selectedAnswer === question.correctAnswerIndex;

  return (
    <article className="surface-card animate-rise overflow-hidden">
      {assetSource ? (
        <div className="bg-ink/5">
          <img
            src={assetSource}
            alt=""
            className="h-52 w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : question.image ? (
        <div className="border-b border-danger/20 bg-danger-soft px-5 py-4 text-sm text-danger">
          The referenced image could not be loaded from local storage.
        </div>
      ) : null}

      <div className="p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Multiple choice</p>
        <h2 className="mt-2 text-2xl font-black leading-tight">{question.prompt}</h2>

        <div className="mt-5 grid gap-3">
          {question.choices.map((choice, index) => (
            <button
              key={`${question.id}-${index}`}
              type="button"
              className={`rounded-3xl border px-4 py-4 text-left text-sm font-semibold transition ${choiceClassName(index, selectedAnswer, question.correctAnswerIndex)}`}
              disabled={isAnswered}
              onClick={() => onSelectAnswer(index)}
            >
              <span className="mr-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-xs font-black">
                {String.fromCharCode(65 + index)}
              </span>
              {choice}
            </button>
          ))}
        </div>

        {isAnswered ? (
          <div
            className={`mt-5 rounded-3xl p-4 text-sm leading-6 ${
              isCorrect ? "bg-accent-soft text-ink" : "bg-danger-soft text-ink"
            }`}
          >
            <p className="font-black">{isCorrect ? "Correct answer." : "Incorrect answer."}</p>
            <p className="mt-2">
              Correct choice: <strong>{question.choices[question.correctAnswerIndex]}</strong>
            </p>
            {question.explanation ? <p className="mt-2">{question.explanation}</p> : null}
          </div>
        ) : (
          <p className="mt-5 text-sm leading-6 text-ink/65">
            Choose one answer. The selection is locked immediately after confirmation.
          </p>
        )}
      </div>
    </article>
  );
}
