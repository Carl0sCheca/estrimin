"use client";

import { useState } from "react";
import { MouseEnterEventOptions } from "./Tooltip";

interface Option {
  value: string;
  label: string;
  icon: React.ReactNode;
}

interface Props {
  multipleSelector?: {
    id: string;
    onToggle: (id: string | null) => void;
    currentlyOpen: string | null;
  };
  tooltip?: {
    mouseEnter: (
      event: React.MouseEvent<HTMLElement>,
      text: string,
      options?: MouseEnterEventOptions,
    ) => void;
    mouseLeave: (event: React.MouseEvent<HTMLElement>) => void;
  };
  options: Option[];
  chooseSelectedOption: string;
  callback?: (
    event: React.MouseEvent<HTMLElement>,
    selected: Option | undefined,
  ) => void;
}

export const Selector = ({
  chooseSelectedOption,
  tooltip,
  options,
  callback,
  multipleSelector,
}: Props) => {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(chooseSelectedOption);

  const [parentElement, setParentElement] = useState<HTMLElement | null>(null);

  const handleOptionClick = (
    event: React.MouseEvent<HTMLElement>,
    option: Option,
  ) => {
    try {
      if (callback && parentElement) {
        const syntheticEvent: React.MouseEvent<HTMLElement> = {
          ...event,
          currentTarget: parentElement,
        };

        callback(syntheticEvent, option);
      }

      if (multipleSelector) {
        multipleSelector.onToggle(null);
      } else {
        setIsSelectorOpen(false);
      }

      setSelectedOption(option.value);
    } catch {}
  };

  return (
    <div className="relative">
      <div
        onClick={() => {
          if (multipleSelector) {
            multipleSelector.onToggle(multipleSelector.id);
          } else {
            setIsSelectorOpen(!isSelectorOpen);
          }
        }}
        onMouseEnter={(e) => {
          setParentElement(e.currentTarget as HTMLElement);

          tooltip?.mouseEnter(
            e,
            options.find((opt) => opt.value === selectedOption)?.label || "",
            { extraGapY: 6 },
          );
        }}
        onMouseLeave={tooltip?.mouseLeave}
        className="flex items-center cursor-pointer hover:text-gray-300 hover:transition-colors hover:duration-300"
      >
        {options.find((opt) => opt.value === selectedOption)?.icon}
        {/* <MdArrowDropDown size={20} /> */}
      </div>

      {(multipleSelector
        ? multipleSelector.currentlyOpen === multipleSelector.id
        : isSelectorOpen) && (
        <div className="absolute z-10 mt-2 w-48 bg-white rounded-md shadow-lg py-1">
          {options.map((option) => (
            <div
              key={option.value}
              onClick={(e) => handleOptionClick(e, option)}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              <span className="mr-2">{option.icon}</span>
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
