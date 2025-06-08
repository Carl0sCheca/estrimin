"use client";

import {
  changeUserRoleAction,
  deleteRegistrationCodesAction,
  disableRegistration,
  generateRegistrationCode,
  getLiveChannelsAction,
  getRegistrationCodesAction,
} from "@/actions";
import {
  Collapsible,
  Logo,
  Notification,
  Spinner,
  Tooltip,
  useAlertNotification,
  useTooltip,
} from "@/components";
import {
  ChangeUserRoleResponse,
  GenerateRegistrationCodeRequest,
  LiveChannelItem,
  RegistrationCodeDto,
} from "@/interfaces";
import { formatTimeAgo } from "@/lib/utils";
import { Setting } from "@prisma/client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BiSolidSend } from "react-icons/bi";
import { CgFormatSlash } from "react-icons/cg";
import { FaCheckSquare, FaMinusSquare, FaSquare } from "react-icons/fa";
import { ImInfinite } from "react-icons/im";
import { IoMdPeople } from "react-icons/io";
import { IoTrashBin } from "react-icons/io5";
import { RiClipboardFill, RiUserFill, RiUserStarFill } from "react-icons/ri";

interface Props {
  settings: Array<Setting>;
  baseUrl: string;
}

export function AdminForm({ settings, baseUrl }: Props) {
  const initRegisterState: boolean = JSON.parse(
    settings.find((p) => p.name === "DISABLE_REGISTER")?.value ?? "false"
  );

  const [disableRegister, setDisableRegister] = useState(initRegisterState);

  const [buttonsState, setButtonsState] = useState({
    changeRole: false,
  });

  const [changeUserRole, setChangeUserRole] = useState("");

  const { alertNotification, showAlert } = useAlertNotification();

  const { elements, tooltipMouseEnter, tooltipMouseLeave } = useTooltip();

  const [expiresRegistrationCode, setExpiresRegistrationCode] = useState(false);
  const [expiresDate, setExpiresDate] = useState("");

  const [registrationCodes, setRegistrationCodes] = useState<
    Array<RegistrationCodeDto>
  >([]);

  const [liveChannels, setLiveChannels] = useState<Array<LiveChannelItem>>([]);
  const [liveChannelsIsLoading, setLiveChannelsIsLoading] = useState(true);

  useEffect(() => {
    const getRegistrationCodes = async () => {
      const regLinksResponse = await getRegistrationCodesAction();

      if (
        !regLinksResponse ||
        !regLinksResponse.ok ||
        !regLinksResponse.registrationCodes
      ) {
        return;
      }

      setRegistrationCodes(regLinksResponse.registrationCodes);
    };

    const getLiveChannels = async () => {
      setLiveChannelsIsLoading(true);
      const response = await getLiveChannelsAction();

      setLiveChannels(response.items);
      setLiveChannelsIsLoading(false);
    };

    getRegistrationCodes();

    getLiveChannels();

    const intervalId = setInterval(async () => {
      await getLiveChannels();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

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
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-hidden peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:rtl:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
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
          <Collapsible title="Registration codes">
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
                        setExpiresRegistrationCode(!expiresRegistrationCode);

                        if (!expiresDate) {
                          setExpiresDate(new Date().toJSON().slice(0, 10));
                        }
                      }}
                      checked={expiresRegistrationCode}
                      name="expires"
                      className="sr-only peer"
                    />
                    <div className="pr-2 select-none">Expires?</div>
                    <div
                      className={`relative w-11 h-6 bg-gray-200 peer-focus:outline-hidden peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:rtl:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600`}
                    ></div>
                  </label>
                  <input
                    className={`text-black rounded ${
                      expiresRegistrationCode ? "" : "hidden"
                    }`}
                    type="date"
                    id="expirationDate"
                    value={expiresDate}
                    onChange={(event) => setExpiresDate(event.target.value)}
                    min={new Date().toJSON().slice(0, 10)}
                  />
                </div>
                <button
                  className="flex justify-center items-center p-2 w-10 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress rounded-md text-white shadow-xs ring-0 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
                  onMouseEnter={(e) => tooltipMouseEnter(e, "Generate link")}
                  onMouseLeave={tooltipMouseLeave}
                  onClick={async () => {
                    const request: GenerateRegistrationCodeRequest = {};
                    if (expiresRegistrationCode) {
                      request.expirationDate = new Date(expiresDate);
                    }

                    const registrationCodeResponse =
                      await generateRegistrationCode(request);

                    if (
                      !registrationCodeResponse ||
                      !registrationCodeResponse.id
                    ) {
                      return;
                    }

                    setRegistrationCodes((prevRegistrationCodes) => [
                      ...prevRegistrationCodes,
                      {
                        id: registrationCodeResponse.id as string,
                        expirationDate:
                          registrationCodeResponse.expirationDate || null,
                        used: false,
                        createdAt: new Date(),
                        user: null,
                      },
                    ]);
                  }}
                >
                  <div className="py-1.5 text-lg">
                    <BiSolidSend />
                  </div>
                </button>
              </div>
            </div>
            {registrationCodes.map((registrationCode) => (
              <div
                key={registrationCode.id}
                className="flex justify-between my-2 dark:hover:bg-slate-300 dark:bg-slate-500 bg-slate-300 hover:bg-slate-500 rounded-sm"
              >
                <button
                  className="group m-2 w-1/2 flex justify-center items-center bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress rounded-md text-white shadow-xs ring-0 ring-inset ring-gray-300 sm:leading-6"
                  onMouseEnter={(e) => tooltipMouseEnter(e, "Copy URL")}
                  onMouseLeave={tooltipMouseLeave}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `${baseUrl}/register/${registrationCode.id}`
                      );
                    } catch {}
                  }}
                >
                  <div className="py-1.5 text-lg">
                    <RiClipboardFill />
                  </div>
                </button>
                <div className="flex cursor-default m-2 w-full justify-center items-center p-2 bg-primary-600 disabled:bg-primary-700 disabled:cursor-progress rounded-md text-white shadow-xs ring-0 ring-inset ring-gray-300 sm:leading-6">
                  {registrationCode.expirationDate ? (
                    registrationCode.expirationDate.toJSON().slice(0, 10)
                  ) : (
                    <ImInfinite />
                  )}
                </div>
                <button
                  className="flex cursor-default m-2 w-1/2 justify-center items-center bg-primary-600 disabled:bg-primary-700 disabled:cursor-progress rounded-md text-white shadow-xs ring-0 ring-inset ring-gray-300 sm:leading-6"
                  onMouseEnter={(e) =>
                    tooltipMouseEnter(
                      e,
                      registrationCode.expirationDate &&
                        new Date(new Date().toJSON().slice(0, 10)) >
                          registrationCode.expirationDate
                        ? "Expired"
                        : registrationCode.used
                        ? `Used by ${registrationCode.user!.name}`
                        : "Not used"
                    )
                  }
                  onMouseLeave={tooltipMouseLeave}
                >
                  {registrationCode.expirationDate &&
                  new Date(new Date().toJSON().slice(0, 10)) >
                    registrationCode.expirationDate ? (
                    <FaMinusSquare />
                  ) : registrationCode.used ? (
                    <FaCheckSquare />
                  ) : (
                    <FaSquare />
                  )}
                </button>
                <button
                  className="flex m-2 w-1/2 justify-center items-center text-lg bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress rounded-md text-white shadow-xs ring-0 ring-inset ring-gray-300 sm:leading-6"
                  onMouseEnter={(e) => tooltipMouseEnter(e, "Delete ")}
                  onMouseLeave={tooltipMouseLeave}
                  onClick={async () => {
                    const deleteResponse = await deleteRegistrationCodesAction(
                      registrationCode.id
                    );

                    if (!deleteResponse) {
                      return;
                    }

                    setRegistrationCodes((prevRegistrationCodes) =>
                      prevRegistrationCodes.filter(
                        (code) => code.id !== registrationCode.id
                      )
                    );
                  }}
                >
                  <IoTrashBin />
                </button>
              </div>
            ))}
          </Collapsible>
        </div>
        <div className="mt-6">
          <Collapsible title="Live channels">
            <Spinner
              className={`${
                liveChannelsIsLoading ? "flex" : "hidden"
              } justify-center`}
            />
            {liveChannels.length === 0 && !liveChannelsIsLoading && (
              <>No live channels currently</>
            )}
            {liveChannels
              .filter((channel) => channel.ready)
              .map((channel, i) => {
                return (
                  <div key={i} className="flex py-1 px-2">
                    <a
                      className="w-1/2 inline-flex items-center truncate"
                      href={`${baseUrl}/${channel.name}`}
                      target="_blank"
                    >
                      <div
                        className="items-center truncate"
                        title={channel.name}
                      >
                        {channel.name}
                      </div>
                      <div className="flex items-center">
                        <IoMdPeople className="ml-2" /> {channel.viewers}
                      </div>
                    </a>
                    <div className="w-1/2 text-right">
                      {formatTimeAgo(channel.readyTime)} ago
                    </div>
                  </div>
                );
              })}
          </Collapsible>
        </div>
      </div>
    </>
  );
}
