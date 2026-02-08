"use client";

import {
  changeUserRoleAction,
  disableRecordingsAction,
  disableRegistrationAction,
} from "@/actions";
import {
  Logo,
  Notification,
  Toggle,
  Tooltip,
  useAlertNotification,
  useTooltip,
} from "@/components";
import { ChangeUserRoleResponse } from "@/interfaces";
import { SiteSetting } from "@/generated/browser";
import Link from "next/link";
import { useState } from "react";
import { CgFormatSlash } from "react-icons/cg";
import { RiUserFill, RiUserStarFill } from "react-icons/ri";
import { RegistrationCodes } from "./RegistrationCodes";
import { LiveChannels } from "./LiveChannels";
import { QueueJobs } from "./QueueJobs";
import { FailedQueueItems } from "./FailedQueueItems";

interface Props {
  settings: Array<SiteSetting>;
  baseUrl: string;
}

export const AdminForm = ({ settings, baseUrl }: Props) => {
  const initRegisterState =
    (settings.find((p) => p.key === "DISABLE_REGISTER")?.value as boolean) ??
    false;

  const initRecordingsState =
    (settings.find((p) => p.key === "DISABLE_RECORDINGS")?.value as boolean) ??
    false;

  const [disableRegister, setDisableRegister] = useState(initRegisterState);
  const [disableRecordings, setDisableRecordings] =
    useState(initRecordingsState);

  const [buttonsState, setButtonsState] = useState({
    changeRole: false,
  });

  const [changeUserRole, setChangeUserRole] = useState("");

  const { alertNotification, showAlert } = useAlertNotification();

  const { elements, tooltipMouseEnter, tooltipMouseLeave } = useTooltip();

  return (
    <>
      <Tooltip elements={elements} />
      <Notification state={alertNotification} />
      <div className={"sm:mx-auto sm:w-full sm:max-w-sm"}>
        <Logo />
        <h2
          className={
            "mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-gray-100"
          }
        >
          Admin dashboard
        </h2>
        <div className="mt-0 text-center text-sm font-bold leading-9 tracking-tight text-primary-700">
          <Link href="/user" className="hover:text-primary-600">
            Back to User
          </Link>
        </div>
        <div className={"mt-6 sm:mx-auto sm:w-full sm:max-w-sm"}>
          <Toggle
            onChange={async () => {
              setDisableRegister(!disableRegister);

              await disableRegistrationAction(!disableRegister);
            }}
            checked={disableRegister}
          >
            Disable registration
          </Toggle>
        </div>
        <div className={"mt-6 sm:mx-auto sm:w-full sm:max-w-sm"}>
          <Toggle
            onChange={async () => {
              setDisableRecordings(!disableRecordings);

              await disableRecordingsAction(!disableRecordings);
            }}
            checked={disableRecordings}
          >
            Disable recordings
          </Toggle>
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
                  "w-4/5 rounded-l-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                }
              />

              <button
                onMouseEnter={(e) => tooltipMouseEnter(e, "Switch role")}
                onMouseLeave={tooltipMouseLeave}
                onClick={async () => {
                  setButtonsState({ ...buttonsState, changeRole: true });
                  const changeUserRoleResponse: ChangeUserRoleResponse =
                    await changeUserRoleAction(changeUserRole);

                  if (alertNotification.timeout) {
                    clearTimeout(alertNotification.timeout);
                  }

                  if (changeUserRoleResponse.ok) {
                    showAlert(
                      `${changeUserRole} is now ${changeUserRoleResponse.newRole}`,
                    );
                  } else {
                    showAlert(
                      changeUserRoleResponse.message || "An error has occurred",
                      true,
                    );
                  }
                  setButtonsState({ ...buttonsState, changeRole: false });
                }}
                disabled={buttonsState.changeRole}
                className="flex w-1/5 justify-center items-center text-lg bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress rounded-r-md text-white shadow-xs ring-0 ring-inset ring-gray-300 sm:leading-6"
              >
                <div className={"relative flex text-center justify-center"}>
                  <div className="flex align-middle justify-center items-center text-base">
                    <RiUserStarFill />
                    <CgFormatSlash />
                    <RiUserFill />
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <RegistrationCodes
            tooltip={{
              mouseEnter: tooltipMouseEnter,
              mouseLeave: tooltipMouseLeave,
            }}
            baseUrl={baseUrl}
          />
        </div>
        <div className="mt-6">
          <LiveChannels baseUrl={baseUrl} />
        </div>
        <div className="mt-6">
          <QueueJobs
            tooltip={{
              mouseEnter: tooltipMouseEnter,
              mouseLeave: tooltipMouseLeave,
            }}
          />
        </div>
        <div className="mt-6">
          <FailedQueueItems
            tooltip={{
              mouseEnter: tooltipMouseEnter,
              mouseLeave: tooltipMouseLeave,
            }}
          />
        </div>
      </div>
    </>
  );
};
