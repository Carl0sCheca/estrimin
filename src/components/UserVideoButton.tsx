"use client";

import Link from "next/link";
import { useState } from "react";
import { FaUser } from "react-icons/fa";

export const UserVideoButton = () => {
  const [isVisible, setIsVisible] = useState(true);
  let timeout: NodeJS.Timeout | null = setTimeout(() => {
    setIsVisible(false);
  }, 2500);

  const mouseEnter = () => {
    setIsVisible(true);
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  const mouseLeave = () => {
    if (!timeout) {
      timeout = setTimeout(() => {
        setIsVisible(false);
      }, 2500);
    }
  };

  const touchEnter = () => {
    setIsVisible(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 2500);
  };

  return (
    <div
      className="z-10 absolute top-0 right-0 w-16 h-16 "
      onMouseEnter={mouseEnter}
      onMouseLeave={mouseLeave}
      onTouchStart={touchEnter}
    >
      <div
        className={`w-full h-full transition-opacity duration-500 ease-in-out absolute ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <Link
          href="/user"
          className="w-full h-full flex items-center justify-center"
        >
          <FaUser className="w-4/5 h-4/5 cursor-pointer text-white hover:text-primary-500" />
        </Link>
      </div>
    </div>
  );
};
