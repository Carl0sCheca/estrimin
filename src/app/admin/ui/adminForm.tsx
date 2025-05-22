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
  Notification,
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
import { Setting } from "@prisma/client";
import Image from "next/image";
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

  const tooltipRef = useRef(null);
  const { tooltipState, tooltipMouseEnter, tooltipMouseLeave } =
    useTooltip(tooltipRef);

  const [expiresRegistrationCode, setExpiresRegistrationCode] = useState(false);
  const [expiresDate, setExpiresDate] = useState("");

  const [registrationCodes, setRegistrationCodes] = useState<
    Array<RegistrationCodeDto>
  >([]);

  const [liveChannels, setLiveChannels] = useState<Array<LiveChannelItem>>([]);

  const getDiffTimeInMinutes = (date1: Date, date2: Date): number => {
    return Math.floor(
      Math.abs(new Date(date1).getTime() - new Date(date2).getTime()) /
        1000 /
        60
    );
  };

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
      const response = await getLiveChannelsAction();

      setLiveChannels(response.items);
    };

    getRegistrationCodes();

    getLiveChannels();

    const intervalId = setInterval(async () => {
      await getLiveChannels();
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      <Tooltip state={tooltipState} tooltipRef={tooltipRef} />
      <Notification state={alertNotification} />
      <div className={"sm:mx-auto sm:w-full sm:max-w-sm"}>
        <Image
          className={"mx-auto h-20 w-auto"}
          width={256}
          height={256}
          alt="Logo"
          priority={true}
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
            <div
              role="status"
              className={`${
                liveChannels.length == 0 ? "flex" : "hidden"
              } justify-center`}
            >
              <svg
                aria-hidden="true"
                className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-primary-500"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="currentColor"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentFill"
                />
              </svg>
              <span className="sr-only">Loading...</span>
            </div>
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
                      {getDiffTimeInMinutes(new Date(), channel.readyTime)}{" "}
                      minute
                      {getDiffTimeInMinutes(new Date(), channel.readyTime) > 1
                        ? "s"
                        : ""}{" "}
                      ago
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
