import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isQuestionCorrect } from "../quiz/questionRuntime";
import type { DragAndDropQuestionResponse, StoredDragAndDropQuestion, StoredDragAndDropPair } from "../types/quiz";

interface DragAndDropQuestionProps {
  question: StoredDragAndDropQuestion;
  response?: DragAndDropQuestionResponse;
  onSubmitAnswer(answer: DragAndDropQuestionResponse): void;
}

interface DragState {
  leftId: string;
  label: string;
  pointerId: number;
  originX: number;
  originY: number;
  x: number;
  y: number;
}

function hashValue(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getShuffledTargets(question: StoredDragAndDropQuestion) {
  return [...question.pairs].sort((left, right) => {
    const leftHash = hashValue(`${question.id}:${left.id}:${left.right}`);
    const rightHash = hashValue(`${question.id}:${right.id}:${right.right}`);
    return leftHash - rightHash || left.right.localeCompare(right.right);
  });
}

function leftItemClassName(isAnswered: boolean, isActive: boolean, isAssigned: boolean) {
  if (isAnswered) {
    return "border-ink/10 bg-ink/5 text-ink/65";
  }

  if (isActive) {
    return "border-brand bg-brand-soft/70 text-ink shadow-sm";
  }

  if (isAssigned) {
    return "border-accent/40 bg-accent-soft text-ink";
  }

  return "border-ink/10 bg-white text-ink hover:border-brand hover:bg-brand-soft/30";
}

function targetCardClassName(
  isAnswered: boolean,
  isHovered: boolean,
  hasAssignment: boolean,
  isCorrectMatch: boolean,
) {
  if (isAnswered) {
    if (isCorrectMatch) {
      return "border-accent bg-accent-soft text-ink";
    }

    return "border-danger bg-danger-soft text-ink";
  }

  if (isHovered) {
    return "border-brand bg-brand-soft/60 text-ink shadow-sm";
  }

  if (hasAssignment) {
    return "border-ink/15 bg-ink/5 text-ink";
  }

  return "border-ink/10 bg-white text-ink hover:border-brand hover:bg-brand-soft/20";
}

export function DragAndDropQuestion({ question, response, onSubmitAnswer }: DragAndDropQuestionProps) {
  const targetRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const suppressClickLeftIdRef = useRef<string | null>(null);
  const [draftPairs, setDraftPairs] = useState<Record<string, string>>({});
  const [activeLeftId, setActiveLeftId] = useState<string | undefined>(undefined);
  const [hoveredTargetId, setHoveredTargetId] = useState<string | undefined>(undefined);
  const [dragState, setDragState] = useState<DragState | undefined>(undefined);
  const isAnswered = response !== undefined;

  useEffect(() => {
    if (response?.questionType === "drag_and_drop") {
      setDraftPairs({ ...response.selectedPairs });
    } else {
      setDraftPairs({});
    }

    setActiveLeftId(undefined);
    setHoveredTargetId(undefined);
    setDragState(undefined);
    suppressClickLeftIdRef.current = null;
  }, [question.id, response]);

  const targets = useMemo(() => getShuffledTargets(question), [question]);
  const resolvedPairs = response?.questionType === "drag_and_drop" ? response.selectedPairs : draftPairs;
  const assignedByTargetId = useMemo(
    () => Object.fromEntries(Object.entries(resolvedPairs).map(([leftId, targetId]) => [targetId, leftId])),
    [resolvedPairs],
  );
  const isComplete = question.pairs.every((pair) => typeof draftPairs[pair.id] === "string");
  const isCorrect = response ? isQuestionCorrect(question, response) : false;

  function findPairById(pairId: string | undefined) {
    return question.pairs.find((pair) => pair.id === pairId);
  }

  function findHoveredTarget(clientX: number, clientY: number) {
    return targets.find((target) => {
      const element = targetRefs.current[target.id];
      if (!element) {
        return false;
      }

      const bounds = element.getBoundingClientRect();
      return clientX >= bounds.left && clientX <= bounds.right && clientY >= bounds.top && clientY <= bounds.bottom;
    })?.id;
  }

  function assignPair(leftId: string, targetId: string) {
    setDraftPairs((current) => {
      const nextEntries = Object.entries(current).filter(([pairId, assignedTargetId]) => {
        if (pairId === leftId) {
          return false;
        }

        return assignedTargetId !== targetId;
      });

      return {
        ...Object.fromEntries(nextEntries),
        [leftId]: targetId,
      };
    });
    setActiveLeftId(undefined);
  }

  function handlePointerDown(pair: StoredDragAndDropPair, event: React.PointerEvent<HTMLButtonElement>) {
    if (isAnswered) {
      return;
    }

    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can fail on some browsers; dragging still works without it.
    }

    setActiveLeftId(pair.id);
    setHoveredTargetId(findHoveredTarget(event.clientX, event.clientY));
    setDragState({
      leftId: pair.id,
      label: pair.left,
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    setDragState((current) => {
      if (!current || current.pointerId !== event.pointerId) {
        return current;
      }

      setHoveredTargetId(findHoveredTarget(event.clientX, event.clientY));
      return {
        ...current,
        x: event.clientX,
        y: event.clientY,
      };
    });
  }

  function clearDragState() {
    setDragState(undefined);
    setHoveredTargetId(undefined);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const didDrag = Math.hypot(event.clientX - dragState.originX, event.clientY - dragState.originY) > 8;
    const droppedTargetId = findHoveredTarget(event.clientX, event.clientY);

    if (didDrag && droppedTargetId) {
      assignPair(dragState.leftId, droppedTargetId);
      suppressClickLeftIdRef.current = dragState.leftId;
      window.requestAnimationFrame(() => {
        suppressClickLeftIdRef.current = null;
      });
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore capture release failures.
    }

    clearDragState();
  }

  function handleLeftClick(pairId: string) {
    if (isAnswered) {
      return;
    }

    if (suppressClickLeftIdRef.current === pairId) {
      suppressClickLeftIdRef.current = null;
      return;
    }

    setActiveLeftId((current) => (current === pairId ? undefined : pairId));
  }

  function handleTargetClick(targetId: string) {
    if (isAnswered || !activeLeftId) {
      return;
    }

    assignPair(activeLeftId, targetId);
  }

  function handleReset() {
    if (isAnswered) {
      return;
    }

    setDraftPairs({});
    setActiveLeftId(undefined);
    setHoveredTargetId(undefined);
  }

  function handleConfirm() {
    if (isAnswered || !isComplete) {
      return;
    }

    onSubmitAnswer({
      questionType: "drag_and_drop",
      selectedPairs: { ...draftPairs },
    });
  }

  const dragPreview = dragState && typeof document !== "undefined"
    ? createPortal(
        <div
          className="pointer-events-none fixed z-[80] rounded-2xl border border-brand bg-white/95 px-3 py-2 text-sm font-semibold text-ink shadow-2xl"
          style={{
            left: dragState.x,
            top: dragState.y,
            transform: "translate(-50%, calc(-100% - 12px))",
          }}
        >
          {dragState.label}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
          <section className="min-h-0 rounded-3xl bg-ink/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-ink/50">Left</p>
              {!isAnswered ? <p className="text-[11px] text-ink/45">Hold or tap</p> : null}
            </div>
            <div className="mt-3 grid gap-2">
              {question.pairs.map((pair) => {
                const assignedTarget = findPairById(resolvedPairs[pair.id]);
                return (
                  <button
                    key={pair.id}
                    type="button"
                    className={`touch-none rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${leftItemClassName(
                      isAnswered,
                      activeLeftId === pair.id,
                      Boolean(assignedTarget),
                    )}`}
                    onClick={() => handleLeftClick(pair.id)}
                    onPointerDown={(event) => handlePointerDown(pair, event)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={clearDragState}
                  >
                    <span className="block">{pair.left}</span>
                    <span className="mt-1 block text-[11px] font-medium text-ink/55">
                      {assignedTarget ? `Assigned to: ${assignedTarget.right}` : "Drag to a matching item"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="min-h-0 rounded-3xl bg-ink/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-ink/50">Right</p>
              {!isAnswered ? <p className="text-[11px] text-ink/45">Drop targets</p> : null}
            </div>
            <div className="mt-3 grid gap-2">
              {targets.map((target) => {
                const assignedLeft = findPairById(assignedByTargetId[target.id]);
                const isCorrectMatch = assignedLeft?.id === target.id;
                return (
                  <button
                    key={target.id}
                    type="button"
                    ref={(element) => {
                      targetRefs.current[target.id] = element;
                    }}
                    disabled={isAnswered}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${targetCardClassName(
                      isAnswered,
                      hoveredTargetId === target.id,
                      Boolean(assignedLeft),
                      isCorrectMatch,
                    )}`}
                    onClick={() => handleTargetClick(target.id)}
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-ink/45">{target.right}</p>
                    <div className="mt-3 rounded-2xl border border-dashed border-current/20 bg-white/60 px-3 py-3 text-sm font-semibold text-ink">
                      {assignedLeft ? assignedLeft.left : <span className="text-ink/40">Drop a left item here</span>}
                    </div>
                    {isAnswered && !isCorrectMatch ? (
                      <p className="mt-2 text-xs font-semibold text-ink/70">Correct match: {target.left}</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {!isAnswered ? (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              className="action-button flex-1 bg-ink/5 py-2.5 text-ink hover:bg-ink/10"
              onClick={handleReset}
            >
              Reset
            </button>
            <button
              type="button"
              className="action-button flex-1 bg-brand py-2.5 text-white hover:bg-brand-deep"
              disabled={!isComplete}
              onClick={handleConfirm}
            >
              Confirm matches
            </button>
          </div>
        ) : (
          <div
            className={`mt-3 rounded-2xl p-3 text-xs leading-5 ${
              isCorrect ? "bg-accent-soft text-ink" : "bg-danger-soft text-ink"
            }`}
          >
            <p className="font-black">{isCorrect ? "All matches are correct." : "Some matches are incorrect."}</p>
            {question.explanation ? <p className="mt-1">{question.explanation}</p> : null}
          </div>
        )}
      </div>
      {dragPreview}
    </>
  );
}
