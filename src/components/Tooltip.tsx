"use client";

import { useState, useEffect, RefObject, useRef, createRef } from "react";

export interface MouseEnterEventOptions {
  defaultPosition?: "top" | "bottom";
  followCursor?: boolean;
  extraGapY?: number;
  effect?: Effect;
}

export enum Effect {
  None,
  Pulse,
}

type Position = {
  x: number;
  y: number;
};

type Size = {
  width: number;
  height: number;
};

type TooltipElement = {
  size?: Size;
  position?: Position;
};

type Element = {
  id: string;
  element: HTMLElement;
  visible: boolean;
  tooltipRef: RefObject<HTMLSpanElement | null>;
  text: string;
  size?: Size;
  position?: Position;
  followCursor: boolean;
  options: MouseEnterEventOptions;
  effect: Effect;
  actualEffect: Effect;
};

interface TooltipProps {
  elements: Array<Element>;
}

export const useTooltip = () => {
  const [elements, setElements] = useState<Array<Element>>([]);
  const timeoutsMap = useRef<Map<HTMLElement, NodeJS.Timeout>>(new Map());

  const getPosition = (
    element: Element,
    event: React.MouseEvent<HTMLElement>,
    tooltip?: TooltipElement,
  ): Position => {
    const elementBounding = element.element.getBoundingClientRect();
    const options = element.options;

    let x =
      elementBounding.x -
      (tooltip?.size?.width || 0) * 0.5 +
      elementBounding.width * 0.5;

    const scrollY = event.pageY - event.clientY;

    let y = 0;

    if (options.followCursor) {
      x = event.pageX - (tooltip?.size?.width || 0) * 0.5;

      if (options.defaultPosition === "bottom") {
        y = event.pageY + (options.extraGapY || 0);
      } else {
        y =
          event.pageY - (tooltip?.size?.height || 0) - (options.extraGapY || 0);
      }
    } else {
      y = elementBounding.y + scrollY;

      if (options.defaultPosition === "top") {
        y -= (options.extraGapY || 0) + (tooltip?.size?.height || 0);
      } else {
        y += elementBounding.height + (options.extraGapY || 0);
      }
    }

    if (options.followCursor) {
      if (
        options.defaultPosition === "top" &&
        elementBounding.y -
          (tooltip?.size?.height || 0) -
          (element.options.extraGapY || 0) <
          0
      ) {
        y = event.pageY + (options.extraGapY || 0);
      } else if (
        options.defaultPosition === "bottom" &&
        event.clientY +
          (tooltip?.size?.height || 0) +
          (element.options.extraGapY || 0) >=
          window.innerHeight
      ) {
        y =
          event.pageY - (tooltip?.size?.height || 0) - (options.extraGapY || 0);
      }
    } else {
      if (
        options.defaultPosition === "top" &&
        elementBounding.y -
          (tooltip?.size?.height || 0) -
          (element.options.extraGapY || 0) <
          0
      ) {
        y =
          elementBounding.y +
          scrollY +
          elementBounding.height +
          (options.extraGapY || 0);
      } else if (
        options.defaultPosition === "bottom" &&
        elementBounding.y +
          (tooltip?.size?.height || 0) +
          elementBounding.height +
          (element.options.extraGapY || 0) >=
          window.innerHeight
      ) {
        y =
          elementBounding.y +
          scrollY -
          (options.extraGapY || 0) -
          (tooltip?.size?.height || 0);
      }
    }

    return { x, y };
  };

  const tooltipMouseEnter = (
    event: React.MouseEvent<HTMLElement>,
    text: string,
    {
      defaultPosition = "top",
      followCursor = false,
      extraGapY = 3,
      effect = Effect.None,
    }: MouseEnterEventOptions = {},
  ) => {
    const element = event.currentTarget as HTMLElement;

    setElements((prevState) => {
      const elementExists = prevState.find((item) => item.element === element);
      const existingTimeout = timeoutsMap.current.get(element);

      if (existingTimeout) {
        clearTimeout(existingTimeout);
        timeoutsMap.current.delete(element);
      }

      if (!elementExists) {
        const id = crypto.randomUUID();

        const newElement: Element = {
          element,
          id,
          visible: false,
          text,
          tooltipRef: createRef<HTMLSpanElement>(),
          followCursor,
          options: { defaultPosition, followCursor, extraGapY },
          actualEffect: Effect.None,
          effect,
        };

        const visibilityTimeout = setTimeout(() => {
          setElements((prev) =>
            prev.map((item) => {
              if (item.element === element) {
                const tooltipElement = item.tooltipRef.current;
                let size = item.size;
                let position = item.position;

                if (tooltipElement) {
                  const rect = tooltipElement.getBoundingClientRect();
                  size = { width: rect.width, height: rect.height };
                  position = { x: rect.x, y: rect.y };
                }

                const { x, y } = getPosition(item, event, { size, position });

                return { ...item, visible: true, size, position: { x, y } };
              }

              return item;
            }),
          );
        }, 20);

        timeoutsMap.current.set(element, visibilityTimeout);

        return [...prevState, newElement];
      } else {
        const visibilityTimeout = setTimeout(() => {
          setElements((prev) =>
            prev.map((item) => {
              if (item.element === element) {
                const tooltipElement = item.tooltipRef.current;
                let size = item.size;
                let position = item.position;

                if (tooltipElement) {
                  const rect = tooltipElement.getBoundingClientRect();
                  size = { width: rect.width, height: rect.height };
                  position = { x: rect.x, y: rect.y };
                }

                const { x, y } = getPosition(item, event, { size, position });

                return {
                  ...item,
                  text,
                  visible: true,
                  size,
                  position: { x, y },
                };
              }
              return item;
            }),
          );
        }, 20);

        timeoutsMap.current.set(element, visibilityTimeout);

        return prevState;
      }
    });
  };

  const tooltipMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    const element = event.currentTarget as HTMLElement;

    setElements((prev) =>
      prev.map((item) => {
        if (item.element === element) {
          const tooltipElement = item.tooltipRef.current;
          let size = item.size;
          let position = item.position;

          if (tooltipElement) {
            const rect = tooltipElement.getBoundingClientRect();
            size = { width: rect.width, height: rect.height };
            position = { x: rect.x, y: rect.y };
          }

          const { x, y } = getPosition(item, event, { size, position });

          return { ...item, position: { x, y } };
        }

        return item;
      }),
    );
  };

  const tooltipMouseLeave = (event: React.MouseEvent<HTMLElement>) => {
    const element = event.currentTarget as HTMLElement;

    setElements((prevState) =>
      prevState.map((item) => {
        if (item.element === element) {
          return { ...item, visible: false };
        }
        return item;
      }),
    );

    const existingTimeout = timeoutsMap.current.get(element);
    if (existingTimeout) clearTimeout(existingTimeout);

    const newTimeout = setTimeout(() => {
      setElements((prev) => prev.filter((el) => el.element !== element));
      timeoutsMap.current.delete(element);
    }, 500);

    timeoutsMap.current.set(element, newTimeout);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      elements.forEach((item) => {
        if (!item.visible) return;

        const rect = item.element.getBoundingClientRect();
        const isInside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;

        if (!isInside) {
          setElements((prev) => {
            const stillExists = prev.find(
              (el) => el.element === item.element && el.visible,
            );
            if (!stillExists) return prev;

            const existingTimeout = timeoutsMap.current.get(item.element);
            if (existingTimeout) clearTimeout(existingTimeout);

            const newTimeout = setTimeout(() => {
              setElements((p) => p.filter((el) => el.element !== item.element));
              timeoutsMap.current.delete(item.element);
            }, 500);

            timeoutsMap.current.set(item.element, newTimeout);

            return prev.map((el) =>
              el.element === item.element ? { ...el, visible: false } : el,
            );
          });
        }
      });
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
  }, [elements]);

  useEffect(() => {
    const handleMouseClick = () => {
      setElements((prev) =>
        prev.map((el) =>
          el.visible ? { ...el, actualEffect: Effect.Pulse } : el,
        ),
      );

      setTimeout(() => {
        setElements((prev) =>
          prev.map((el) => ({ ...el, actualEffect: Effect.None })),
        );
      }, 200);
    };

    window.addEventListener("click", handleMouseClick);
    return () => window.removeEventListener("click", handleMouseClick);
  }, []);

  useEffect(() => {
    const currentTimeoutsMap = timeoutsMap.current;

    return () => {
      currentTimeoutsMap.forEach((timeout) => clearTimeout(timeout));
      currentTimeoutsMap.clear();
    };
  }, []);

  return {
    elements,
    tooltipMouseEnter,
    tooltipMouseLeave,
    tooltipMouseMove,
  };
};

export const Tooltip = ({ elements }: TooltipProps) => {
  return (
    <>
      {elements.map((element) => {
        const isHidden = !element.visible;
        const isPulsing = element.actualEffect === Effect.Pulse;

        return (
          <span
            key={element.id}
            className={`
              absolute select-none z-40 pointer-events-none text-center p-2 
              bg-gray-800 dark:bg-gray-600 px-1 text-sm text-gray-100 
              min-w-20 rounded-md
              transition duration-200 ease-in-out

              ${isHidden ? "opacity-0" : "opacity-100"}

              ${
                isPulsing && element.effect === Effect.Pulse
                  ? "scale-125 bg-gray-700 brightness-125"
                  : "scale-100"
              }
            `}
            style={{
              left: `${element.position?.x || 0}px`,
              top: `${element.position?.y || 0}px`,
            }}
            ref={element.tooltipRef}
          >
            {element.text}
          </span>
        );
      })}
    </>
  );
};
