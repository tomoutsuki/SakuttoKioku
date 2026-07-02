import { useMemo } from "react";
import { useAppContext } from "../context/AppContext";

export function useQuizRecord(quizId?: string) {
  const { quizzes, statistics } = useAppContext();

  return useMemo(() => {
    if (!quizId) {
      return { quiz: undefined, stats: undefined };
    }

    return {
      quiz: quizzes.find((entry) => entry.id === quizId),
      stats: statistics[quizId],
    };
  }, [quizId, quizzes, statistics]);
}
