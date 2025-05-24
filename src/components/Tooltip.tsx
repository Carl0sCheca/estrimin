"use client";

import { useState, useEffect, RefObject, useRef } from "react";
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

  const followCursorGapY = 20;

  const tooltipPositionRef = useRef<"top" | "bottom">("top");

  const [tooltipFollowCursor, setTooltipFollowCursor] =
    useState<boolean>(false);

  useEffect(() => {
    if (!tooltipRef.current || !tooltipState.visible) {
      return;
    }

    const rect = (
      tooltipRef.current as HTMLSpanElement
    ).getBoundingClientRect();

    const gapY = 3;

    let y = tooltipState.targetRect.y;
    let x = tooltipState.targetRect.x;

    if (!tooltipFollowCursor) {
      x =
        tooltipState.targetRect.x +
        tooltipState.targetRect.width * 0.5 -
        rect.width * 0.5;

      y = tooltipState.targetRect.y - rect.height - gapY;

      if (
        tooltipState.targetRect.originalY -
          tooltipState.targetRect.height -
          gapY <
          0 ||
        tooltipPositionRef.current === "bottom"
      ) {
        if (
          (tooltipPositionRef.current === "bottom" &&
            tooltipState.targetRect.originalY +
              tooltipState.targetRect.height +
              rect.height +
              gapY * 2 <=
              window.innerHeight) ||
          tooltipPositionRef.current !== "bottom"
        ) {
          const positionDown =
            -tooltipState.targetRect.height - rect.height - gapY * 2;
          y -= positionDown;
        }
      }
    }

    setTooltipState((prevState) => ({
      ...prevState,
      position: {
        x,
        y,
      },
    }));
  }, [tooltipState.targetRect, tooltipState.text, tooltipState.visible]);

  interface MouseEnterEventOptions {
    defaultPosition: "top" | "bottom";
    followCursor: boolean;
  }

  const tooltipMouseEnter = (
    event: React.MouseEvent<HTMLElement>,
    text: string,
    options: MouseEnterEventOptions = {
      defaultPosition: "top",
      followCursor: false,
    }
  ) => {
    if (!event.currentTarget || !tooltipRef.current) return;

    tooltipPositionRef.current = options.defaultPosition;
    setTooltipFollowCursor(options.followCursor);

    const rect = (
      event.currentTarget as HTMLButtonElement
    ).getBoundingClientRect();

    const rectTooltip = (
      tooltipRef.current as HTMLButtonElement
    ).getBoundingClientRect();

    let x = rect.x;

    const scrollY = event.pageY - event.clientY;
    let y = rect.y + scrollY;

    if (options.followCursor) {
      x = event.pageX - rectTooltip.width * 0.5;

      if (options.defaultPosition === "bottom") {
        y = event.pageY + followCursorGapY;
      } else {
        y = event.pageY - followCursorGapY * 2;
      }
    }

    setTooltipState((prevState) => ({
      ...prevState,
      targetRect: {
        x,
        y,
        originalY: rect.y,
        width: rect.width,
        height: rect.height,
      },
      text,
      visible: true,
    }));
  };

  const tooltipMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    if (!event.currentTarget || !tooltipRef.current) return;

    setTooltipFollowCursor(true);

    const rect = (
      tooltipRef.current as HTMLButtonElement
    ).getBoundingClientRect();

    const x = event.pageX - rect.width * 0.5;

    let y;

    if (tooltipPositionRef.current === "bottom") {
      y = event.pageY + followCursorGapY;
    } else {
      y = event.pageY - followCursorGapY * 2;
    }

    setTooltipState((prevState) => ({
      ...prevState,
      position: {
        x,
        y,
      },
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
      text: "",
    }));
  };

  return {
    tooltipState,
    tooltipMouseEnter,
    tooltipMouseLeave,
    tooltipMouseMove,
  };
};

export const Tooltip = ({ state, tooltipRef }: TooltipProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {mounted &&
        createPortal(
          <span
            className="select-none pointer-events-none text-center p-2 bg-gray-800 dark:bg-gray-600 px-1 text-sm text-gray-100 min-w-20 rounded-md absolute"
            style={{
              left: `${state.position.x}px`,
              top: `${state.position.y}px`,
              opacity: `${state.visible ? 1 : 0}`,
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
