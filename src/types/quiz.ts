export type QuizQuestionType = "multiple_choice";

export interface QuizQuestionInput {
  id: string;
  type: QuizQuestionType;
  question: string;
  image?: string;
  choices: string[];
  answer: number;
  explanation?: string;
}

export interface QuizDocumentInput {
  id?: string;
  version: number;
  title: string;
  description?: string;
  questions: QuizQuestionInput[];
}

export interface StoredQuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  image?: string;
  choices: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

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

export interface QuizAttempt {
  id: string;
  playedAt: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  percentage: number;
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
