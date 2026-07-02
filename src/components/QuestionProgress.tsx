interface QuestionProgressProps {
  currentIndex: number;
  total: number;
  answeredCount: number;
}

export function QuestionProgress({ currentIndex, total, answeredCount }: QuestionProgressProps) {
  const currentProgress = ((currentIndex + 1) / total) * 100;
  const answeredProgress = (answeredCount / total) * 100;

  return (
    <section className="surface-card animate-rise p-5">
      <div className="flex items-center justify-between gap-3 text-sm font-semibold">
        <span>
          Question {currentIndex + 1} / {total}
        </span>
        <span>{answeredCount} answered</span>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-xs uppercase tracking-[0.18em] text-ink/55">
            <span>Current position</span>
            <span>{Math.round(currentProgress)}%</span>
          </div>
          <div className="h-3 rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-xs uppercase tracking-[0.18em] text-ink/55">
            <span>Answered</span>
            <span>{Math.round(answeredProgress)}%</span>
          </div>
          <div className="h-3 rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${answeredProgress}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
