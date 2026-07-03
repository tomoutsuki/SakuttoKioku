import type {
  DragAndDropIncorrectQuestionRecord,
  IncorrectQuestionRecord,
  MultipleChoiceIncorrectQuestionRecord,
  QuizQuestionResponse,
  StoredDragAndDropQuestion,
  StoredMultipleChoiceQuestion,
  StoredQuizQuestion,
} from "../types/quiz";

export function isMultipleChoiceQuestion(
  question: StoredQuizQuestion,
): question is StoredMultipleChoiceQuestion {
  return question.type === "multiple_choice";
}

export function isDragAndDropQuestion(
  question: StoredQuizQuestion,
): question is StoredDragAndDropQuestion {
  return question.type === "drag_and_drop";
}

export function getCorrectDragAndDropPairs(question: StoredDragAndDropQuestion) {
  return Object.fromEntries(question.pairs.map((pair) => [pair.id, pair.id]));
}

export function isQuestionCorrect(question: StoredQuizQuestion, answer: QuizQuestionResponse) {
  if (question.type === "multiple_choice") {
    return answer.questionType === "multiple_choice" && answer.selectedAnswerIndex === question.correctAnswerIndex;
  }

  if (answer.questionType !== "drag_and_drop") {
    return false;
  }

  const correctPairs = getCorrectDragAndDropPairs(question);
  return question.pairs.every((pair) => answer.selectedPairs[pair.id] === correctPairs[pair.id]);
}

export function createIncorrectQuestionRecord(
  question: StoredQuizQuestion,
  answer: QuizQuestionResponse,
): IncorrectQuestionRecord | undefined {
  if (isQuestionCorrect(question, answer)) {
    return undefined;
  }

  if (question.type === "multiple_choice" && answer.questionType === "multiple_choice") {
    const incorrectRecord: MultipleChoiceIncorrectQuestionRecord = {
      questionId: question.id,
      questionType: "multiple_choice",
      selectedAnswerIndex: answer.selectedAnswerIndex,
      correctAnswerIndex: question.correctAnswerIndex,
    };
    return incorrectRecord;
  }

  if (question.type === "drag_and_drop" && answer.questionType === "drag_and_drop") {
    const incorrectRecord: DragAndDropIncorrectQuestionRecord = {
      questionId: question.id,
      questionType: "drag_and_drop",
      selectedPairs: { ...answer.selectedPairs },
      correctPairs: getCorrectDragAndDropPairs(question),
    };
    return incorrectRecord;
  }

  return undefined;
}
