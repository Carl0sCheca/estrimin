"use client";

import { useState, useEffect, RefObject, useRef, createRef } from "react";

export interface MouseEnterEventOptions {
  defaultPosition?: "top" | "bottom";
  followCursor?: boolean;
  extraGapY?: number;
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
    tooltip?: TooltipElement
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

    return {
      x,
      y,
    };
  };

  const tooltipMouseEnter = (
    event: React.MouseEvent<HTMLElement>,
    text: string,
    {
      defaultPosition = "top",
      followCursor = false,
      extraGapY = 3,
    }: MouseEnterEventOptions = {}
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
          options: {
            defaultPosition,
            followCursor,
            extraGapY,
          },
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

                return {
                  ...item,
                  visible: true,
                  size,
                  position: {
                    x,
                    y,
                  },
                };
              }

              return item;
            })
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
            })
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

          const { x, y } = getPosition(item, event, {
            size,
            position,
          });

          return {
            ...item,
            position: { x, y },
          };
        }

        return item;
      })
    );
  };

  const tooltipMouseLeave = (event: React.MouseEvent<HTMLElement>) => {
    const element = event.currentTarget as HTMLElement;

    setElements((prevState) => {
      return prevState.map((item) => {
        if (item.element === element) {
          const existingTimeout = timeoutsMap.current.get(element);
          if (existingTimeout) clearTimeout(existingTimeout);

          item.visible = false;

          const newTimeout = setTimeout(() => {
            setElements((prev) => prev.filter((el) => el.element !== element));
          }, 1000);

          timeoutsMap.current.set(element, newTimeout);
        }
        return item;
      });
    });
  };

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
        return (
          <span
            key={element.id}
            className="select-none pointer-events-none text-center p-2 bg-gray-800 dark:bg-gray-600 px-1 text-sm text-gray-100 min-w-20 rounded-md absolute transition-opacity duration-500k ease-out"
            style={{
              left: `${element.position?.x || 0}px`,
              top: `${element.position?.y || 0}px`,
              opacity: `${element.visible ? 1 : 0}`,
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
