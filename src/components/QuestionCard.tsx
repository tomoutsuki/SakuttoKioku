import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { isQuestionCorrect } from "../quiz/questionRuntime";
import type { QuizQuestionResponse, StoredMultipleChoiceQuestion, StoredQuizQuestion } from "../types/quiz";
import { DragAndDropQuestion } from "./DragAndDropQuestion";

interface QuestionCardProps {
  question: StoredQuizQuestion;
  assetSource?: string;
  response?: QuizQuestionResponse;
  onSubmitAnswer(answer: QuizQuestionResponse): void;
}

interface PointerPoint {
  x: number;
  y: number;
}

interface ViewerTransform {
  scale: number;
  x: number;
  y: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function hashValue(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getShuffledChoices(question: StoredMultipleChoiceQuestion) {
  return question.choices
    .map((choice, originalIndex) => ({
      choice,
      originalIndex,
      sortKey: hashValue(`${question.id}:${originalIndex}:${choice}`),
    }))
    .sort((left, right) => left.sortKey - right.sortKey || left.originalIndex - right.originalIndex);
}

function choiceClassName(
  choiceIndex: number,
  selectedAnswer: number | undefined,
  correctAnswerIndex: number,
) {
  if (selectedAnswer === undefined) {
    return "border-ink/10 bg-white text-ink hover:border-brand hover:bg-brand-soft/40";
  }

  if (choiceIndex === correctAnswerIndex) {
    return "border-accent bg-accent-soft text-ink";
  }

  if (choiceIndex === selectedAnswer) {
    return "border-danger bg-danger-soft text-ink";
  }

  return "border-ink/10 bg-ink/5 text-ink/55";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDistance(first: PointerPoint, second: PointerPoint) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function getCenter(first: PointerPoint, second: PointerPoint): PointerPoint {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

function clampTransform(transform: ViewerTransform) {
  if (typeof window === "undefined") {
    return transform;
  }

  const maxX = ((window.innerWidth * transform.scale) - window.innerWidth) / 2;
  const maxY = ((window.innerHeight * transform.scale) - window.innerHeight) / 2;

  return {
    scale: clamp(transform.scale, MIN_SCALE, MAX_SCALE),
    x: clamp(transform.x, -Math.max(0, maxX), Math.max(0, maxX)),
    y: clamp(transform.y, -Math.max(0, maxY), Math.max(0, maxY)),
  };
}

function ImagePreviewOverlay({
  source,
  alt,
  onClose,
}: {
  source: string;
  alt: string;
  onClose(): void;
}) {
  const pointersRef = useRef(new Map<number, PointerPoint>());
  const panStartRef = useRef<{ pointer: PointerPoint; transform: ViewerTransform } | null>(null);
  const pinchStartRef = useRef<{ distance: number; center: PointerPoint; transform: ViewerTransform } | null>(null);
  const [transform, setTransform] = useState<ViewerTransform>({ scale: 1, x: 0, y: 0 });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function resetPanState() {
    panStartRef.current = null;
    pinchStartRef.current = null;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const nextPoint = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, nextPoint);

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ignore capture failures on browsers that do not support it consistently.
    }

    const points = Array.from(pointersRef.current.values());

    if (points.length === 1) {
      panStartRef.current = {
        pointer: nextPoint,
        transform,
      };
      pinchStartRef.current = null;
      return;
    }

    if (points.length === 2) {
      panStartRef.current = null;
      pinchStartRef.current = {
        distance: getDistance(points[0], points[1]),
        center: getCenter(points[0], points[1]),
        transform,
      };
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) {
      return;
    }

    event.preventDefault();
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = Array.from(pointersRef.current.values());

    if (points.length >= 2 && pinchStartRef.current) {
      const center = getCenter(points[0], points[1]);
      const distance = getDistance(points[0], points[1]);
      const nextScale = clamp(
        pinchStartRef.current.transform.scale * (distance / Math.max(1, pinchStartRef.current.distance)),
        MIN_SCALE,
        MAX_SCALE,
      );

      setTransform(
        clampTransform({
          scale: nextScale,
          x: pinchStartRef.current.transform.x + (center.x - pinchStartRef.current.center.x),
          y: pinchStartRef.current.transform.y + (center.y - pinchStartRef.current.center.y),
        }),
      );
      return;
    }

    if (points.length === 1 && panStartRef.current) {
      const point = points[0];
      setTransform((current) => {
        if (current.scale <= 1) {
          return current;
        }

        return clampTransform({
          scale: current.scale,
          x: panStartRef.current!.transform.x + (point.x - panStartRef.current!.pointer.x),
          y: panStartRef.current!.transform.y + (point.y - panStartRef.current!.pointer.y),
        });
      });
    }
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore release failures.
    }

    const points = Array.from(pointersRef.current.values());

    if (points.length === 1) {
      panStartRef.current = {
        pointer: points[0],
        transform,
      };
      pinchStartRef.current = null;
      return;
    }

    if (points.length === 0) {
      resetPanState();
    }
  }

  function handleDoubleClick() {
    setTransform((current) =>
      current.scale > 1
        ? { scale: 1, x: 0, y: 0 }
        : clampTransform({ scale: 2, x: 0, y: 0 }),
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] bg-black">
      <button
        type="button"
        aria-label="Close image preview"
        className="absolute right-4 top-4 z-[95] inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-2xl font-semibold text-white transition hover:bg-black/75"
        onClick={onClose}
      >
        Å~
      </button>
      <div
        className="flex h-full w-full touch-none items-center justify-center overflow-hidden"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <img
          src={source}
          alt={alt}
          draggable={false}
          className="max-h-full max-w-full select-none object-contain"
          style={{
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
            transformOrigin: "center center",
          }}
        />
      </div>
    </div>,
    document.body,
  );
}

export function QuestionCard({ question, assetSource, response, onSubmitAnswer }: QuestionCardProps) {
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

  useEffect(() => {
    setIsHintOpen(false);
    setIsImagePreviewOpen(false);
  }, [question.id]);

  const isMultipleChoice = question.type === "multiple_choice";
  const selectedAnswer =
    isMultipleChoice && response?.questionType === "multiple_choice" ? response.selectedAnswerIndex : undefined;
  const shuffledChoices = useMemo(
    () => (question.type === "multiple_choice" ? getShuffledChoices(question) : []),
    [question],
  );
  const isAnswered = response !== undefined;
  const isCorrect = response ? isQuestionCorrect(question, response) : false;

  return (
    <article className="surface-card animate-rise relative flex h-full min-h-0 flex-col overflow-hidden">
      {assetSource ? (
        <button
          type="button"
          className="block w-full bg-ink/5 text-left transition hover:bg-ink/10"
          onClick={() => setIsImagePreviewOpen(true)}
        >
          <img
            src={assetSource}
            alt={question.prompt}
            className="max-h-[34vh] min-h-40 w-full object-contain"
            loading="lazy"
          />
        </button>
      ) : question.image ? (
        <div className="border-b border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger">
          The referenced image could not be loaded from local storage.
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold leading-6 text-ink">{question.prompt}</h2>
          {question.hint ? (
            <button
              type="button"
              className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-deep transition hover:bg-brand hover:text-white"
              onClick={() => setIsHintOpen(true)}
            >
              Hint
            </button>
          ) : null}
        </div>

        {question.type === "multiple_choice" ? (
          <>
            <div className="mt-3 grid gap-2">
              {shuffledChoices.map(({ choice, originalIndex }, displayIndex) => (
                <button
                  key={`${question.id}-${originalIndex}`}
                  type="button"
                  className={`rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${choiceClassName(originalIndex, selectedAnswer, question.correctAnswerIndex)}`}
                  disabled={isAnswered}
                  onClick={() =>
                    onSubmitAnswer({
                      questionType: "multiple_choice",
                      selectedAnswerIndex: originalIndex,
                    })
                  }
                >
                  <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-[11px] font-black">
                    {String.fromCharCode(65 + displayIndex)}
                  </span>
                  {choice}
                </button>
              ))}
            </div>

            {isAnswered ? (
              <div
                className={`mt-3 rounded-2xl p-3 text-xs leading-5 ${
                  isCorrect ? "bg-accent-soft text-ink" : "bg-danger-soft text-ink"
                }`}
              >
                <p className="font-black">{isCorrect ? "Correct answer." : "Incorrect answer."}</p>
                <p className="mt-1">
                  Correct choice: <strong>{question.choices[question.correctAnswerIndex]}</strong>
                </p>
                {question.explanation ? <p className="mt-1">{question.explanation}</p> : null}
              </div>
            ) : null}
          </>
        ) : (
          <DragAndDropQuestion
            question={question}
            response={response?.questionType === "drag_and_drop" ? response : undefined}
            onSubmitAnswer={onSubmitAnswer}
          />
        )}
      </div>

      {isHintOpen && question.hint ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink/35 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-black">Hint</h3>
              <button
                type="button"
                className="rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink transition hover:bg-ink hover:text-white"
                onClick={() => setIsHintOpen(false)}
              >
                Close
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/75">{question.hint}</p>
          </div>
        </div>
      ) : null}

      {isImagePreviewOpen && assetSource ? (
        <ImagePreviewOverlay source={assetSource} alt={question.prompt} onClose={() => setIsImagePreviewOpen(false)} />
      ) : null}
    </article>
  );
}
