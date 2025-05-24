"use client";

import { useState, useEffect, RefObject } from "react";
import { createPortal } from "react-dom";

type Rect = {
  width: number;
  height: number;
  x: number;
  y: number;
  originalY: number;
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
    position: { x: -999999, y: -999999 },
    text: "",
    targetRect: {
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      originalY: 0,
    },
  });

  useEffect(() => {
    if (!tooltipRef.current || !tooltipState.visible) {
      return;
    }

    const rect = (
      tooltipRef.current as HTMLSpanElement
    ).getBoundingClientRect();

    const gapY = 3;
    let y = tooltipState.targetRect.y - rect.height - gapY;

    if (
      tooltipState.targetRect.originalY -
        tooltipState.targetRect.height -
        gapY <
      0
    ) {
      const positionDown = -tooltipState.targetRect.height * 2 - gapY * 2;
      y -= positionDown;
    }

    const x =
      tooltipState.targetRect.x +
      tooltipState.targetRect.width * 0.5 -
      rect.width * 0.5;

    setTooltipState((prevState) => ({
      ...prevState,
      position: {
        x,
        y,
      },
    }));
  }, [tooltipState.targetRect, tooltipState.text, tooltipState.visible]);

  const tooltipMouseEnter = (
    event: React.MouseEvent<HTMLElement>,
    text: string
  ) => {
    if (!event.currentTarget) return;

    const rect = (
      event.currentTarget as HTMLButtonElement
    ).getBoundingClientRect();

    const scrollY = event.pageY - event.clientY;

    setTooltipState((prevState) => ({
      ...prevState,
      targetRect: {
        x: rect.x,
        y: rect.y + scrollY,
        originalY: rect.y,
        width: rect.width,
        height: rect.height,
      },
      text,
      visible: true,
    }));
  };

  const tooltipMouseLeave = () => {
    setTooltipState((prevState) => ({
      ...prevState,
      position: {
        x: -999999,
        y: -999999,
      },
      visible: false,
    }));
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
