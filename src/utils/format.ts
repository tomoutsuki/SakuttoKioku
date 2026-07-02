export function formatDateTime(value?: string) {
  if (!value) {
    return "Not played yet";
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatPercentage(value: number) {
  return `${Math.round(value)}%`;
}
