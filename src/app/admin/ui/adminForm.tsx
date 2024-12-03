"use client";

import { changeUserRoleAction, disableRegistration } from "@/actions";
import { Notification, useAlertNotification } from "@/components";
import { ChangeUserRoleResponse } from "@/interfaces";
import { Setting } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CgFormatSlash } from "react-icons/cg";
import { RiUserFill, RiUserStarFill } from "react-icons/ri";

interface Props {
  settings: Array<Setting>;
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

  return (
    <>
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
            "mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900"
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
            <span className="ms-3 text-sm font-medium text-gray-900">
              Disable registration
            </span>
          </label>
        </div>

        <div className="mt-6">
          <div className={"flex items-center justify-between"}>
            <label
              htmlFor="obstoken"
              className={"block text-sm font-medium leading-6 text-gray-900"}
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
      </div>
    </>
  );
}
