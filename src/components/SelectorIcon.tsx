"use client";

import { useState } from "react";
import { MouseEnterEventOptions } from "./Tooltip";

interface Options {
  value: string;
  label: string;
  icon: React.ReactNode;
}

interface Props {
  tooltip?: {
    mouseEnter: (
      event: React.MouseEvent<HTMLElement>,
      text: string,
      options?: MouseEnterEventOptions
    ) => void;
    mouseLeave: () => void;
  };
  options: Options[];
  chooseSelectedOption: string;
}

export const SelectorIcon = ({
  chooseSelectedOption,
  tooltip,
  options,
}: Props) => {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(chooseSelectedOption);

  const handleOptionClick = (option: Options) => {
    setSelectedOption(option.value);
    setIsSelectorOpen(false);
  };

  return (
    <div className="relative">
      <div
        onClick={() => setIsSelectorOpen(!isSelectorOpen)}
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

      {isSelectorOpen && (
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
