import type {
  DragAndDropQuestionInput,
  MultipleChoiceQuestionInput,
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

function validateSharedQuestionFields(
  question: Record<string, unknown>,
  label: string,
  duplicateIds: Set<string>,
  collector: ValidationCollector,
) {
  const questionId = question.id;

  collector.add(typeof questionId === "string" && questionId.trim().length > 0, `${label} is missing a valid "id".`);

  if (typeof questionId === "string" && questionId.trim()) {
    collector.add(!duplicateIds.has(questionId), `${label} uses a duplicate question id "${questionId}".`);
    duplicateIds.add(questionId);
  }

  collector.add(
    typeof question.question === "string" && question.question.trim().length > 0,
    `${label} is missing a valid "question" string.`,
  );

  if (question.image !== undefined) {
    collector.add(
      typeof question.image === "string" && question.image.trim().length > 0,
      `${label} image must be a non-empty string when provided.`,
    );
  }

  if (question.explanation !== undefined) {
    collector.add(typeof question.explanation === "string", `${label} explanation must be a string when provided.`);
  }

  if (question.hint !== undefined) {
    collector.add(typeof question.hint === "string", `${label} hint must be a string when provided.`);
  }

  return typeof questionId === "string" ? questionId.trim() : "";
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function validateMultipleChoiceQuestion(
  question: Record<string, unknown>,
  label: string,
  questionId: string,
): { errors: string[]; normalized?: MultipleChoiceQuestionInput } {
  const collector = new ValidationCollector();

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

  const errors = collector.getErrors();
  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors: [],
    normalized: {
      id: questionId,
      type: "multiple_choice",
      question: (question.question as string).trim(),
      image: normalizeOptionalText(question.image) ? normalizeAssetPath((question.image as string).trim()) : undefined,
      choices: (choices as string[]).map((choice) => choice.trim()),
      answer: question.answer as number,
      explanation: normalizeOptionalText(question.explanation),
      hint: normalizeOptionalText(question.hint),
    },
  };
}

function validateDragAndDropQuestion(
  question: Record<string, unknown>,
  label: string,
  questionId: string,
): { errors: string[]; normalized?: DragAndDropQuestionInput } {
  const collector = new ValidationCollector();
  const pairs = question.pairs;

  collector.add(Array.isArray(pairs), `${label} must include a "pairs" array.`);
  collector.add(Array.isArray(pairs) && pairs.length >= 2, `${label} must include at least two pairs.`);

  const leftValues = new Set<string>();
  const rightValues = new Set<string>();
  const normalizedPairs: DragAndDropQuestionInput["pairs"] = [];

  if (Array.isArray(pairs)) {
    pairs.forEach((pair, pairIndex) => {
      const pairLabel = `${label} pair ${pairIndex + 1}`;

      if (!isObject(pair)) {
        collector.addIssue(`${pairLabel} must be an object with "left" and "right" strings.`);
        return;
      }

      collector.add(typeof pair.left === "string" && pair.left.trim().length > 0, `${pairLabel} must include a non-empty "left" string.`);
      collector.add(typeof pair.right === "string" && pair.right.trim().length > 0, `${pairLabel} must include a non-empty "right" string.`);

      if (typeof pair.left !== "string" || typeof pair.right !== "string") {
        return;
      }

      const left = pair.left.trim();
      const right = pair.right.trim();

      collector.add(!leftValues.has(left), `${pairLabel} uses duplicate left value "${left}".`);
      collector.add(!rightValues.has(right), `${pairLabel} uses duplicate right value "${right}".`);

      if (leftValues.has(left) || rightValues.has(right)) {
        return;
      }

      leftValues.add(left);
      rightValues.add(right);
      normalizedPairs.push({ left, right });
    });
  }

  const errors = collector.getErrors();
  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors: [],
    normalized: {
      id: questionId,
      type: "drag_and_drop",
      question: (question.question as string).trim(),
      image: normalizeOptionalText(question.image) ? normalizeAssetPath((question.image as string).trim()) : undefined,
      pairs: normalizedPairs,
      explanation: normalizeOptionalText(question.explanation),
      hint: normalizeOptionalText(question.hint),
    },
  };
}

function validateQuestion(
  question: unknown,
  index: number,
  duplicateIds: Set<string>,
): { errors: string[]; normalized?: QuizQuestionInput } {
  const collector = new ValidationCollector();
  const label = `Question ${index + 1}`;

  if (!isObject(question)) {
    return {
      errors: [`${label} must be an object.`],
    };
  }

  const questionId = validateSharedQuestionFields(question, label, duplicateIds, collector);
  collector.add(
    question.type === "multiple_choice" || question.type === "drag_and_drop",
    `${label} must use a supported type of "multiple_choice" or "drag_and_drop".`,
  );

  const sharedErrors = collector.getErrors();
  if (sharedErrors.length > 0) {
    return { errors: sharedErrors };
  }

  if (question.type === "multiple_choice") {
    return validateMultipleChoiceQuestion(question, label, questionId);
  }

  return validateDragAndDropQuestion(question, label, questionId);
}

export function parseQuizDocument(jsonText: string): { quiz?: QuizDocumentInput; errors: string[] } {
  try {
    const raw = JSON.parse(jsonText) as unknown;

    if (!isObject(raw)) {
      return { errors: ["The quiz file must contain a single JSON object."] };
    }

    const collector = new ValidationCollector();
    collector.add(typeof raw.version === "number" && Number.isInteger(raw.version), 'The root "version" field is required and must be an integer.');
    collector.add(raw.version === 1, "Only quiz format version 1 is currently supported.");
    collector.add(typeof raw.title === "string" && raw.title.trim().length > 0, 'The root "title" field is required.');

    if (raw.id !== undefined) {
      collector.add(typeof raw.id === "string" && raw.id.trim().length > 0, 'The root "id" field must be a non-empty string when provided.');
    }

    if (raw.description !== undefined) {
      collector.add(typeof raw.description === "string", 'The root "description" field must be a string when provided.');
    }

    collector.add(Array.isArray(raw.questions), 'The root "questions" field is required and must be an array.');
    const questions = Array.isArray(raw.questions) ? raw.questions : [];
    collector.add(questions.length > 0, "The quiz must contain at least one question.");

    const duplicateIds = new Set<string>();
    const normalizedQuestions: QuizQuestionInput[] = [];

    questions.forEach((question, index) => {
      const result = validateQuestion(question, index, duplicateIds);
      result.errors.forEach((error) => collector.addIssue(error));
      if (result.normalized) {
        normalizedQuestions.push(result.normalized);
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
        description: normalizeOptionalText(raw.description),
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

    if (question.type === "multiple_choice") {
      return {
        id: question.id,
        type: "multiple_choice",
        prompt: question.question,
        image,
        choices: question.choices,
        correctAnswerIndex: question.answer,
        explanation: question.explanation,
        hint: question.hint,
      };
    }

    return {
      id: question.id,
      type: "drag_and_drop",
      prompt: question.question,
      image,
      pairs: question.pairs.map((pair, pairIndex) => ({
        id: `${question.id}-pair-${pairIndex + 1}`,
        left: pair.left,
        right: pair.right,
      })),
      explanation: question.explanation,
      hint: question.hint,
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
