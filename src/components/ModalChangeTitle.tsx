"use client";

import { SetStateAction } from "react";
import { MdOutlineDriveFileRenameOutline } from "react-icons/md";

interface Props {
  title: string;
  setTitle: React.Dispatch<SetStateAction<string>>;
  acceptCallback: () => void;
  cancelCallback: () => void;
}

export const ModalChangeTitle = ({
  title,
  setTitle,
  acceptCallback,
  cancelCallback,
}: Props) => {
  return (
    <>
      <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
        <div className="sm:flex sm:items-start">
          <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:size-10">
            <MdOutlineDriveFileRenameOutline
              className="text-primary-600"
              size={24}
            />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
            <h3
              className="text-base font-semibold text-gray-900"
              id="dialog-title"
            >
              Change title
            </h3>
            <div className="mt-2">
              <input
                type="text"
                value={title || ""}
                placeholder="Enter new title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                onChange={(e) => {
                  setTitle(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    acceptCallback();
                  } else if (e.key === "Escape") {
                    cancelCallback();
                  }
                }}
              />
              <p className="text-sm text-gray-500 mt-2">
                Enter a new title for your recording.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
        <button
          onMouseDown={acceptCallback}
          type="button"
          className="inline-flex w-full justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary-500 sm:ml-3 sm:w-auto"
        >
          Accept
        </button>
        <button
          onMouseDown={cancelCallback}
          type="button"
          className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 sm:mt-0 sm:w-auto"
        >
          Cancel
        </button>
      </div>
    </>
  );
};
