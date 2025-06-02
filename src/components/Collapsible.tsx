"use client";

import { Dispatch, SetStateAction, useState } from "react";

interface Props {
  title?: string;
  maxHeight?: number;
  children?: React.ReactNode;
  setIsOpen?: Dispatch<SetStateAction<boolean>>;
}

export const Collapsible = ({
  title,
  maxHeight,
  children,
  setIsOpen,
}: Props) => {
  const [folded, setFolded] = useState(true);

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <input
        type="checkbox"
        id="accordion"
        value={`${folded}`}
        className="peer hidden"
      />
      <label
        htmlFor="accordion"
        onClick={() => {
          if (setIsOpen) {
            setIsOpen(!folded);
          }

          setFolded(!folded);
        }}
        className="select-none flex items-center justify-between p-4 bg-primary-600 text-white cursor-pointer hover:bg-primary-500 transition-colors"
      >
        <span className="text-lg font-semibold">{title || ""}</span>
        <svg
          className={`w-6 h-6 transition-transform ${
            !folded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          ></path>
        </svg>
      </label>
      <div
        className={`max-h-0 overflow-y-scroll transition-all duration-300`}
        style={{
          maxHeight: !folded ? (maxHeight ? `${maxHeight}px` : "450px") : "0px",
        }}
      >
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};
