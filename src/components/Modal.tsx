"use client";

import { SetStateAction, useEffect, useState } from "react";

interface Props {
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<SetStateAction<boolean>>;
  children: React.ReactNode;
}

export const Modal = ({ isModalOpen, setIsModalOpen, children }: Props) => {
  const [isOpen, setIsOpen] = useState(isModalOpen);

  useEffect(() => {
    setIsOpen(isModalOpen);
  }, [isModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setIsModalOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setIsModalOpen]);

  return (
    <>
      <div>
        <div
          className="relative z-50"
          style={{
            opacity: isOpen ? "1" : "0",
            pointerEvents: isOpen ? "auto" : "none",
          }}
          onClick={() => {
            setIsOpen(false);
            setIsModalOpen(false);
          }}
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-gray-500/75 transition-opacity"
            aria-hidden="true"
          ></div>

          <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
              >
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
