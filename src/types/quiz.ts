export type QuizQuestionType = "multiple_choice" | "drag_and_drop";

interface QuizQuestionBaseInput {
  id: string;
  type: QuizQuestionType;
  question: string;
  image?: string;
  explanation?: string;
  hint?: string;
}

export interface MultipleChoiceQuestionInput extends QuizQuestionBaseInput {
  type: "multiple_choice";
  choices: string[];
  answer: number;
}

export interface DragAndDropPairInput {
  left: string;
  right: string;
}

export interface DragAndDropQuestionInput extends QuizQuestionBaseInput {
  type: "drag_and_drop";
  pairs: DragAndDropPairInput[];
}

export type QuizQuestionInput = MultipleChoiceQuestionInput | DragAndDropQuestionInput;

export interface QuizDocumentInput {
  id?: string;
  version: number;
  title: string;
  description?: string;
  questions: QuizQuestionInput[];
}

interface StoredQuizQuestionBase {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  image?: string;
  explanation?: string;
  hint?: string;
}

export interface StoredMultipleChoiceQuestion extends StoredQuizQuestionBase {
  type: "multiple_choice";
  choices: string[];
  correctAnswerIndex: number;
}

export interface StoredDragAndDropPair {
  id: string;
  left: string;
  right: string;
}

export interface StoredDragAndDropQuestion extends StoredQuizQuestionBase {
  type: "drag_and_drop";
  pairs: StoredDragAndDropPair[];
}

export type StoredQuizQuestion = StoredMultipleChoiceQuestion | StoredDragAndDropQuestion;

export interface StoredQuiz {
  id: string;
  version: number;
  title: string;
  description?: string;
  questions: StoredQuizQuestion[];
  assets: Record<string, string>;
  importedAt: string;
  sourceType: "json" | "zip";
  collectionId?: string;
  collectionName?: string;
}

export interface MultipleChoiceQuestionResponse {
  questionType: "multiple_choice";
  selectedAnswerIndex: number;
}

export interface DragAndDropQuestionResponse {
  questionType: "drag_and_drop";
  selectedPairs: Record<string, string>;
}

export type QuizQuestionResponse = MultipleChoiceQuestionResponse | DragAndDropQuestionResponse;

export interface MultipleChoiceIncorrectQuestionRecord {
  questionId: string;
  questionType: "multiple_choice";
  selectedAnswerIndex: number;
  correctAnswerIndex: number;
}

export interface DragAndDropIncorrectQuestionRecord {
  questionId: string;
  questionType: "drag_and_drop";
  selectedPairs: Record<string, string>;
  correctPairs: Record<string, string>;
}

export type IncorrectQuestionRecord =
  | MultipleChoiceIncorrectQuestionRecord
  | DragAndDropIncorrectQuestionRecord;

export interface QuizAttempt {
  id: string;
  playedAt: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  percentage: number;
  durationMs: number;
  incorrectQuestions: IncorrectQuestionRecord[];
}

export interface QuizStatistics {
  quizId: string;
  attempts: QuizAttempt[];
  totalCorrectAnswers: number;
  totalWrongAnswers: number;
  updatedAt: string;
}

export interface ImportOutcome {
  importedQuizzes: StoredQuiz[];
  errors: string[];
}
