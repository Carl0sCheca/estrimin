"use client";

import { changeUserRoleAction, disableRegistration } from "@/actions";
import { Notification, useAlertNotification } from "@/components";
import { ChangeUserRoleResponse } from "@/interfaces";
import { Setting } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import { BiSolidSend } from "react-icons/bi";
import { CgFormatSlash } from "react-icons/cg";
import { FaCheckSquare, FaSquare } from "react-icons/fa";
import { IoTrashBin } from "react-icons/io5";
import { RiClipboardFill, RiUserFill, RiUserStarFill } from "react-icons/ri";

interface Props {
  settings: Array<Setting>;
}

interface RegistrationLink {
  url: string;
  expirationDate: Date;
  expired: boolean;
}

export function AdminForm({ settings }: Props) {
  const initRegisterState: boolean = JSON.parse(
    settings.find((p) => p.name === "DISABLE_REGISTER")?.value ?? "false"
  );

  const [disableRegister, setDisableRegister] = useState(initRegisterState);

  const [buttonsState, setButtonsState] = useState({
    changeRole: false,
  });

  const [changeUserRole, setChangeUserRole] = useState("");

  const { alertNotification, showAlert } = useAlertNotification();

  const [foldedRegistrationLinks, setFoldedRegistrationLinks] = useState(false);
  const [expiresRegistrationLink, setExpiresRegistrationLink] = useState(false);
  const [expiresDate, setExpiresDate] = useState(
    new Date().toJSON().slice(0, 10)
  );

  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipText, setTooltipText] = useState("");

  const tooltipHandleMouseEnter = (
    event: React.MouseEvent<HTMLElement>,
    text: string
  ) => {
    if (!event.target) return;

    const rect = (event.target as HTMLButtonElement).getBoundingClientRect();

    setTooltipPosition({
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY - 60,
    });

    setTooltipText(text);

    setTooltipVisible(true);
  };

  const tooltipHandleMouseLeave = () => {
    setTooltipVisible(false);
    setTooltipText("");
  };

  return (
    <>
      {tooltipVisible &&
        createPortal(
          <span
            className="text-center cursor-pointer p-2 bg-gray-800 dark:bg-gray-600 px-1 text-sm text-gray-100 min-w-20 rounded-md fixed"
            style={{
              left: `${tooltipPosition.x - 6}px`,
              top: `${tooltipPosition.y + 20}px`,
            }}
            onMouseEnter={tooltipHandleMouseLeave}
          >
            {tooltipText}
          </span>,
          document.body
        )}
      <Notification state={alertNotification} />
      <div className={"sm:mx-auto sm:w-full sm:max-w-sm"}>
        <Image
          className={"mx-auto h-20 w-auto"}
          width={256}
          height={256}
          alt="Logo"
          src="/logo.png"
        />
        <h2
          className={
            "mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-gray-100"
          }
        >
          Admin dashboard
        </h2>

        <div className="mt-0 text-center text-sm font-bold leading-9 tracking-tight text-primary-700">
          <Link href="/user">User settings</Link>
        </div>

        <div className={"mt-6 sm:mx-auto sm:w-full sm:max-w-sm"}>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              onChange={async () => {
                setDisableRegister(!disableRegister);

                await disableRegistration(!disableRegister);
              }}
              checked={disableRegister}
              name="disableregister"
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-100">
              Disable registration
            </span>
          </label>
        </div>
        <div className="mt-6">
          <div className={"flex items-center justify-between"}>
            <label
              htmlFor="obstoken"
              className={
                "block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
              }
            >
              Change user role
            </label>
          </div>
          <div className={"mt-2"}>
            <div className="flex">
              <input
                id="changeuserrole"
                name="changeuserrole"
                type="text"
                value={changeUserRole}
                onChange={(e) => setChangeUserRole(e.target.value)}
                className={
                  "w-4/5 rounded-l-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                }
              />

              <button
                onClick={async () => {
                  setButtonsState({ ...buttonsState, changeRole: true });
                  const changeUserRoleResponse: ChangeUserRoleResponse =
                    await changeUserRoleAction(changeUserRole);

                  if (alertNotification.timeout) {
                    clearTimeout(alertNotification.timeout);
                  }

                  if (changeUserRoleResponse.ok) {
                    showAlert(
                      `${changeUserRole} is now ${changeUserRoleResponse.newRole}`
                    );
                  } else {
                    showAlert(
                      changeUserRoleResponse.message || "An error has occurred",
                      true
                    );
                  }
                  setButtonsState({ ...buttonsState, changeRole: false });
                }}
                disabled={buttonsState.changeRole}
                className="group block w-1/5 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress rounded-r-md py-1.5 text-white shadow-sm ring-0 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
              >
                <div className={"relative flex text-center justify-center"}>
                  <div className="flex align-middle justify-center items-center text-base">
                    <RiUserStarFill />
                    <CgFormatSlash />
                    <RiUserFill />
                  </div>
                  <span className="cursor-pointer hover:hidden invisible group-hover:visible group-hover:opacity-100 transition-all p-2 bg-gray-800 px-1 text-sm text-gray-100 min-w-20 rounded-md absolute left-full -translate-x-full -translate-y-[65px] opacity-0 m-4 mx-auto">
                    Switch role
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <input
              type="checkbox"
              id="accordion"
              value={`${foldedRegistrationLinks}`}
              // onChange={setExpiresRegistrationLink}
              className="peer hidden"
            />
            <label
              htmlFor="accordion"
              onClick={() =>
                setFoldedRegistrationLinks(!foldedRegistrationLinks)
              }
              className="select-none flex items-center justify-between p-4 bg-primary-600 text-white cursor-pointer hover:bg-primary-500 transition-colors"
            >
              <span className="text-lg font-semibold">Registration links</span>
              <svg
                className={`w-6 h-6 transition-transform ${
                  !foldedRegistrationLinks ? "rotate-180" : ""
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
              className={`max-h-0 overflow-y-scroll transition-all duration-300 ${
                !foldedRegistrationLinks ? "max-h-[250px]" : ""
              }`}
            >
              <div className="p-4">
                <div className="mb-6 overflow-y-hidden">
                  <div className="text-sm font-medium">
                    Generate registration link
                  </div>
                  <div className="flex justify-between min-h-[50px]">
                    <div className="flex space-x-5">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          onChange={async () => {
                            setExpiresRegistrationLink(
                              !expiresRegistrationLink
                            );
                          }}
                          checked={expiresRegistrationLink}
                          name="expires"
                          className="sr-only peer"
                        />
                        <div className="pr-2 select-none">Expires?</div>
                        <div
                          className={`relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600`}
                        ></div>
                      </label>
                      <input
                        className={`text-black rounded ${
                          expiresRegistrationLink ? "" : "hidden"
                        }`}
                        type="date"
                        id="expirationDate"
                        value={expiresDate}
                        onChange={(event) => setExpiresDate(event.target.value)}
                        min={new Date().toJSON().slice(0, 10)}
                      />
                    </div>
                    <button
                      className="flex justify-center items-center p-2 w-10 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress rounded-md text-white shadow-sm ring-0 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
                      onMouseEnter={(e) =>
                        tooltipHandleMouseEnter(e, "Generate link")
                      }
                      onMouseLeave={tooltipHandleMouseLeave}
                      onClick={async () => {
                        console.log("click");
                      }}
                    >
                      <div className="py-1.5 text-lg">
                        <BiSolidSend />
                      </div>
                    </button>
                  </div>
                </div>
                <div className="flex justify-between  bg-slate-300 hover:bg-slate-500 rounded">
                  <button
                    className="group flex justify-center items-center w-2/5 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress rounded-md text-white shadow-sm ring-0 ring-inset ring-gray-300 sm:leading-6"
                    onMouseEnter={(e) => tooltipHandleMouseEnter(e, "Copy URL")}
                    onMouseLeave={tooltipHandleMouseLeave}
                  >
                    <div className="py-1.5 text-lg">
                      <RiClipboardFill />
                    </div>
                  </button>
                  <div className="flex w-full justify-center items-center p-2 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress rounded-md text-white shadow-sm ring-0 ring-inset ring-gray-300 sm:leading-6">
                    {new Date().toJSON().slice(0, 10)}
                  </div>
                  <button className="flex w-full justify-center items-center bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress rounded-md text-white shadow-sm ring-0 ring-inset ring-gray-300 sm:leading-6">
                    <FaCheckSquare />
                    <FaSquare />
                  </button>
                  <button
                    className="flex w-full justify-center items-center text-lg bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress rounded-md text-white shadow-sm ring-0 ring-inset ring-gray-300 sm:leading-6"
                    onMouseEnter={(e) => tooltipHandleMouseEnter(e, "Remove ")}
                    onMouseLeave={tooltipHandleMouseLeave}
                  >
                    <IoTrashBin />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
