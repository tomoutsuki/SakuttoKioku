interface EmptyStateProps {
  title: string;
  body: string;
}

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <section className="surface-card rounded-[30px] p-6 text-center">
      <div className="mx-auto max-w-md space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Ready to import</p>
        <h2 className="text-2xl font-black">{title}</h2>
        <p className="text-sm leading-6 text-ink/70">{body}</p>
      </div>
    </section>
  );
}
