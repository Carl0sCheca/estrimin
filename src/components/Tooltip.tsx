"use client";

import { useState, useEffect, RefObject, MouseEventHandler } from "react";
import { createPortal } from "react-dom";

type Rect = {
  width: number;
  height: number;
  x: number;
  y: number;
};

type Position = {
  x: number;
  y: number;
};

type TooltipState = {
  visible: boolean;
  position: Position;
  text: string;
  targetRect: Rect;
};

interface TooltipProps {
  state: TooltipState;
  tooltipRef: RefObject<null>;
}

export const useTooltip = (tooltipRef: RefObject<null>) => {
  const [tooltipState, setTooltipState] = useState<TooltipState>({
    visible: false,
    position: { x: 0, y: 0 },
    text: "",
    targetRect: {
      width: 0,
      height: 0,
      x: 0,
      y: 0,
    },
  });

  useEffect(() => {
    if (!tooltipRef.current) {
      return;
    }

    const rect = (
      tooltipRef.current as HTMLSpanElement
    ).getBoundingClientRect();

    let y = tooltipState.targetRect.y - rect.height - 3;

    if (tooltipState.targetRect.y - tooltipState.targetRect.height < 0) {
      y = tooltipState.targetRect.y + rect.height + 9;
    }

    const x =
      tooltipState.targetRect.x +
      tooltipState.targetRect.width * 0.5 -
      rect.width * 0.5;

    setTooltipState({
      ...tooltipState,
      position: {
        x,
        y,
      },
    });
  }, [tooltipState.targetRect, tooltipState.text]);

  const tooltipMouseEnter = (
    event: React.MouseEvent<HTMLElement>,
    text: string
  ) => {
    if (!event.target) return;

    const rect = (event.target as HTMLButtonElement).getBoundingClientRect();

    const scrollY = event.pageY - event.clientY;

    setTooltipState({
      ...tooltipState,
      targetRect: {
        x: rect.x,
        y: rect.y + scrollY,
        width: rect.width,
        height: rect.height,
      },
      text,
      visible: true,
    });
  };

  const tooltipMouseLeave = () => {
    setTooltipState({
      ...tooltipState,
      text: "",
      visible: false,
      position: { x: -99999, y: -99999 },
    });
  };

  return { tooltipState, tooltipMouseEnter, tooltipMouseLeave };
};

export const Tooltip = ({ state, tooltipRef }: TooltipProps) => {
  return (
    <>
      {state.visible &&
        createPortal(
          <span
            className="text-center cursor-pointer p-2 bg-gray-800 dark:bg-gray-600 px-1 text-sm text-gray-100 min-w-20 rounded-md absolute"
            style={{
              left: `${state.position.x}px`,
              top: `${state.position.y}px`,
            }}
            ref={tooltipRef}
          >
            {state.text}
          </span>,
          document.body
        )}
    </>
  );
};
