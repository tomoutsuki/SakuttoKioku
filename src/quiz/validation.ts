import type {
  QuizDocumentInput,
  QuizQuestionInput,
  StoredQuiz,
  StoredQuizQuestion,
} from "../types/quiz";
import { createDerivedQuizId, normalizeAssetPath } from "../utils/quizIdentity";

class ValidationCollector {
  private readonly issues: string[] = [];

  add(condition: boolean, message: string) {
    if (!condition) {
      this.issues.push(message);
    }
  }

  addIssue(message: string) {
    this.issues.push(message);
  }

  getErrors() {
    return this.issues;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateQuestion(
  question: unknown,
  index: number,
  duplicateIds: Set<string>,
): { errors: string[]; normalized?: StoredQuizQuestion } {
  const collector = new ValidationCollector();
  const label = `Question ${index + 1}`;

  if (!isObject(question)) {
    return {
      errors: [`${label} must be an object.`],
    };
  }

  const questionId = question.id;
  collector.add(typeof questionId === "string" && questionId.trim().length > 0, `${label} is missing a valid "id".`);
  if (typeof questionId === "string" && questionId.trim()) {
    collector.add(!duplicateIds.has(questionId), `${label} uses a duplicate question id "${questionId}".`);
    duplicateIds.add(questionId);
  }

  collector.add(question.type === "multiple_choice", `${label} must use type "multiple_choice".`);
  collector.add(
    typeof question.question === "string" && question.question.trim().length > 0,
    `${label} is missing a valid "question" string.`,
  );

  const choices = question.choices;
  collector.add(Array.isArray(choices), `${label} must include a "choices" array.`);
  collector.add(Array.isArray(choices) && choices.length === 4, `${label} must have exactly four answer choices.`);

  if (Array.isArray(choices)) {
    choices.forEach((choice, choiceIndex) => {
      collector.add(
        typeof choice === "string" && choice.trim().length > 0,
        `${label} choice ${choiceIndex + 1} must be a non-empty string.`,
      );
    });
  }

  collector.add(
    typeof question.answer === "number" && Number.isInteger(question.answer),
    `${label} must include an integer "answer" index.`,
  );

  if (typeof question.answer === "number" && Number.isInteger(question.answer)) {
    collector.add(question.answer >= 0 && question.answer < 4, `${label} answer index must be between 0 and 3.`);
  }

  if (question.image !== undefined) {
    collector.add(
      typeof question.image === "string" && question.image.trim().length > 0,
      `${label} image must be a non-empty string when provided.`,
    );
  }

  if (question.explanation !== undefined) {
    collector.add(
      typeof question.explanation === "string",
      `${label} explanation must be a string when provided.`,
    );
  }

  const errors = collector.getErrors();
  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors: [],
    normalized: {
      id: questionId as string,
      type: "multiple_choice",
      prompt: (question.question as string).trim(),
      image: typeof question.image === "string" ? normalizeAssetPath(question.image.trim()) : undefined,
      choices: (choices as string[]).map((choice) => choice.trim()),
      correctAnswerIndex: question.answer as number,
      explanation: typeof question.explanation === "string" ? question.explanation.trim() : undefined,
    },
  };
}

export function parseQuizDocument(jsonText: string): { quiz?: QuizDocumentInput; errors: string[] } {
  try {
    const raw = JSON.parse(jsonText) as unknown;

    if (!isObject(raw)) {
      return { errors: ["The quiz file must contain a single JSON object."] };
    }

    const collector = new ValidationCollector();
    collector.add(typeof raw.version === "number" && Number.isInteger(raw.version), `The root "version" field is required and must be an integer.`);
    collector.add(raw.version === 1, `Only quiz format version 1 is currently supported.`);
    collector.add(typeof raw.title === "string" && raw.title.trim().length > 0, `The root "title" field is required.`);

    if (raw.id !== undefined) {
      collector.add(typeof raw.id === "string" && raw.id.trim().length > 0, `The root "id" field must be a non-empty string when provided.`);
    }

    if (raw.description !== undefined) {
      collector.add(typeof raw.description === "string", `The root "description" field must be a string when provided.`);
    }

    collector.add(Array.isArray(raw.questions), `The root "questions" field is required and must be an array.`);
    const questions = Array.isArray(raw.questions) ? raw.questions : [];
    collector.add(questions.length > 0, `The quiz must contain at least one question.`);

    const duplicateIds = new Set<string>();
    const normalizedQuestions: QuizQuestionInput[] = [];

    questions.forEach((question, index) => {
      const result = validateQuestion(question, index, duplicateIds);
      result.errors.forEach((error) => collector.addIssue(error));
      if (result.normalized) {
        normalizedQuestions.push({
          id: result.normalized.id,
          type: result.normalized.type,
          question: result.normalized.prompt,
          image: result.normalized.image,
          choices: result.normalized.choices,
          answer: result.normalized.correctAnswerIndex,
          explanation: result.normalized.explanation,
        });
      }
    });

    const errors = collector.getErrors();
    if (errors.length > 0) {
      return { errors };
    }

    return {
      quiz: {
        id: typeof raw.id === "string" ? raw.id.trim() : undefined,
        version: raw.version as number,
        title: (raw.title as string).trim(),
        description: typeof raw.description === "string" ? raw.description.trim() : undefined,
        questions: normalizedQuestions,
      },
      errors: [],
    };
  } catch {
    return {
      errors: ["The selected file is not valid JSON."],
    };
  }
}

function isDataUrl(value: string) {
  return value.startsWith("data:");
}

interface BuildStoredQuizOptions {
  collectionId?: string;
  collectionName?: string;
}

export function buildStoredQuiz(
  quiz: QuizDocumentInput,
  sourceType: "json" | "zip",
  assets: Record<string, string>,
  options?: BuildStoredQuizOptions,
): { quiz?: StoredQuiz; errors: string[] } {
  const quizId = createDerivedQuizId(quiz);
  const errors: string[] = [];
  const normalizedAssets = Object.fromEntries(
    Object.entries(assets).map(([path, value]) => [normalizeAssetPath(path), value]),
  );

  const storedQuestions = quiz.questions.map<StoredQuizQuestion>((question, index) => {
    const image = question.image ? normalizeAssetPath(question.image) : undefined;

    if (sourceType === "json" && image && !isDataUrl(image)) {
      errors.push(
        `Question ${index + 1} references "${image}", but standalone JSON imports cannot include local image files. Use a ZIP package or embed a data URL.`,
      );
    }

    if (sourceType === "zip" && image && !isDataUrl(image) && !normalizedAssets[image]) {
      errors.push(`Question ${index + 1} references missing image "${image}" inside the ZIP package.`);
    }

    return {
      id: question.id,
      type: question.type,
      prompt: question.question,
      image,
      choices: question.choices,
      correctAnswerIndex: question.answer,
      explanation: question.explanation,
    };
  });

  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors: [],
    quiz: {
      id: quizId,
      version: quiz.version,
      title: quiz.title,
      description: quiz.description,
      questions: storedQuestions,
      assets: normalizedAssets,
      importedAt: new Date().toISOString(),
      sourceType,
      collectionId: options?.collectionId,
      collectionName: options?.collectionName,
    },
  };
}
