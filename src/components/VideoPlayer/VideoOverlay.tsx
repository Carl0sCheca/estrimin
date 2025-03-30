"use client";

import { PlayerState, UserVideoButton } from "@/components";
import { useEffect, useState, useRef, useCallback } from "react";
import { IoMdPeople } from "react-icons/io";

const TIME_IN = 2500;
const TIME_OUT = 2500;
const TIME_OUT_END = 10000;

interface Props {
  playerState: PlayerState;
  viewers: number;
}

export const VideoOverlay = ({ playerState, viewers }: Props) => {
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearCurrentTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const setNewTimeout = useCallback(
    (callback: () => void, duration: number) => {
      clearCurrentTimeout();
      timeoutRef.current = setTimeout(() => {
        callback();
        timeoutRef.current = null;
      }, duration);
    },
    []
  );

  useEffect(() => {
    if (playerState === PlayerState.OFFLINE) return;

    setNewTimeout(() => setIsVisible(false), TIME_OUT);

    return () => {
      clearCurrentTimeout();
    };
  });

  useEffect(() => {
    if (playerState === PlayerState.OFFLINE) {
      setIsVisible(true);
      clearCurrentTimeout();
    } else {
      setNewTimeout(() => setIsVisible(false), TIME_OUT);
    }
  }, [playerState, setNewTimeout]);

  const mouseEnter = () => {
    if (playerState === PlayerState.OFFLINE) return;

    setIsVisible(true);
    setNewTimeout(() => setIsVisible(false), TIME_OUT_END);
  };

  const mouseMove = () => {
    if (playerState === PlayerState.OFFLINE) return;

    if (!isVisible) setIsVisible(true);
    setNewTimeout(() => setIsVisible(false), TIME_OUT_END);
  };

  const mouseLeave = () => {
    if (playerState === PlayerState.OFFLINE) return;

    setNewTimeout(() => setIsVisible(false), TIME_IN);
  };

  const touchEnter = () => {
    if (playerState === PlayerState.OFFLINE) return;

    setIsVisible(true);
    clearCurrentTimeout();
  };

  return (
    <div
      className={`transition-opacity duration-500 ease-in-out z-10 absolute w-full h-16 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onMouseEnter={mouseEnter}
      onMouseLeave={mouseLeave}
      onMouseMove={mouseMove}
      onTouchMove={touchEnter}
    >
      <div className={`ml-6 absolute h-full flex items-center justify-center`}>
        <span
          className={`select-none rounded-md border-0 p-1 text-gray-900 shadow-xs ring-1 ring-inset ${
            playerState === PlayerState.ONLINE
              ? "bg-primary-500 ring-primary-600"
              : "bg-gray-300 ring-gray-400"
          }`}
        >
          {playerState === PlayerState.ONLINE ? (
            <span className="inline-flex items-center gap-1">
              Online <IoMdPeople className="ml-1" />
              {viewers}
            </span>
          ) : (
            "Offline"
          )}
        </span>
      </div>
      <UserVideoButton />
    </div>
  );
};
