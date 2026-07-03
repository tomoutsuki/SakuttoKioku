interface QuestionProgressProps {
  currentIndex: number;
  total: number;
}

export function QuestionProgress({ currentIndex, total }: QuestionProgressProps) {
  const currentProgress = ((currentIndex + 1) / total) * 100;

  return (
    <section className="surface-card animate-rise p-3">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-ink/65">
        <span>Question</span>
        <span>
          {currentIndex + 1} / {total}
        </span>
      </div>

      <div className="mt-2 h-2 rounded-full bg-ink/10">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${currentProgress}%` }}
        />
      </div>
    </section>
  );
}
