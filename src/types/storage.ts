import type { QuizStatistics, StoredQuiz } from "./quiz";

export interface StorageAdapter {
  getQuizzes(): Promise<StoredQuiz[]>;
  saveQuiz(quiz: StoredQuiz): Promise<void>;
  deleteQuiz(quizId: string): Promise<void>;
  getStatistics(): Promise<QuizStatistics[]>;
  saveStatistics(stats: QuizStatistics): Promise<void>;
  deleteStatistics(quizId: string): Promise<void>;
}
