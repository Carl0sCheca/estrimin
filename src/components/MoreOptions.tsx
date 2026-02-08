"use client";

import { BsThreeDots } from "react-icons/bs";
import { MouseEnterEventOptions } from "./Tooltip";
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  size?: number;
  className?: string;
  tooltip?: {
    mouseEnter: (
      event: React.MouseEvent<HTMLElement>,
      text: string,
      options?: MouseEnterEventOptions,
    ) => void;
    mouseLeave: (event: React.MouseEvent<HTMLElement>) => void;
    text: string;
  };
  children?: React.ReactNode;
  recordingListIsOpen?: boolean;
  id?: string;
  isOpen?: boolean;
  onToggle?: (id: string) => void;
}

export const MoreOptions = ({
  size = 24,
  className,
  tooltip,
  children,
  recordingListIsOpen,
  id,
  isOpen,
  onToggle,
}: Props) => {
  const [visibleOptions, setVisibleOptions] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);

  const dotsRef = useRef<HTMLDivElement>(null);
  const childrenRef = useRef<HTMLDivElement>(null);

  const [childrenPosition, setChildrenPosition] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const moreOptionsId = id || crypto.randomUUID();

  const calculatePosition = useCallback(() => {
    if (!dotsRef.current || !childrenRef.current) return;

    const dotsRect = dotsRef.current.getBoundingClientRect();
    const childrenRect = childrenRef.current.getBoundingClientRect();

    return {
      x:
        dotsRect.left +
        dotsRect.width * 0.5 -
        childrenRect.width * 0.5 +
        window.scrollX,
      y: dotsRect.bottom - dotsRect.height + window.scrollY,
      width: childrenRect.width,
      height: childrenRect.height,
    };
  }, []);

  useEffect(() => {
    if (!visibleOptions) {
      setIsPositioned(false);
      return;
    }

    const position = calculatePosition();
    if (position) {
      setChildrenPosition(position);
      setIsPositioned(true);
    }
  }, [visibleOptions, calculatePosition]);

  useEffect(() => {
    if (recordingListIsOpen) {
      setVisibleOptions(false);
    }
  }, [recordingListIsOpen]);

  useEffect(() => {
    setVisibleOptions(isOpen ?? false);
  }, [isOpen]);

  useEffect(() => {
    if (!visibleOptions) return;

    const handleResize = () => {
      const position = calculatePosition();
      if (position) {
        setChildrenPosition(position);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize);
    };
  }, [visibleOptions, calculatePosition]);

  return (
    <>
      <div
        onClick={() => {
          setVisibleOptions(!visibleOptions);

          if (onToggle) {
            onToggle(moreOptionsId);
          }
        }}
        onMouseEnter={(e) =>
          tooltip?.mouseEnter(e, tooltip.text, { defaultPosition: "bottom" })
        }
        onMouseLeave={tooltip?.mouseLeave}
        className={className}
        ref={dotsRef}
      >
        <BsThreeDots
          size={size}
          className={`hover:text-gray-500 transition-colors duration-300 ${
            visibleOptions ? "text-gray-400" : "text-black"
          }`}
        />
      </div>

      <div
        className={`flex absolute bg-gray-800 rounded-md p-1 transition-opacity duration-100 text-white ${
          isPositioned ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{
          left: childrenPosition.x,
          top: childrenPosition.y - 30,
        }}
        ref={childrenRef}
      >
        {children}
      </div>
    </>
  );
};
