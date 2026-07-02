import type { QuizDocumentInput } from "../types/quiz";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function hashValue(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createDerivedQuizId(quiz: QuizDocumentInput) {
  const base = quiz.id?.trim() || slugify(quiz.title) || "quiz";
  if (quiz.id?.trim()) {
    return base;
  }

  const fingerprint = JSON.stringify({
    title: quiz.title,
    questions: quiz.questions.map((question) => ({
      id: question.id,
      question: question.question,
      choices: question.choices,
      answer: question.answer,
    })),
  });

  return `${base}-${hashValue(fingerprint)}`;
}

export function normalizeAssetPath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\.?\//, "");
}
