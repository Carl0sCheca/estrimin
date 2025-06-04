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
      options?: MouseEnterEventOptions
    ) => void;
    mouseLeave: () => void;
  };
  options: Option[];
  chooseSelectedOption: string;
  callback?: (selected: Option | undefined) => void;
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

  const handleOptionClick = (option: Option) => {
    try {
      if (callback) {
        callback(option);
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
        onMouseEnter={(e) =>
          tooltip?.mouseEnter(
            e,
            options.find((opt) => opt.value === selectedOption)?.label || "",
            { extraGapY: 3 }
          )
        }
        onMouseLeave={() => tooltip?.mouseLeave()}
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
              onClick={() => handleOptionClick(option)}
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
