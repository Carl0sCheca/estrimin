"use client";

import {
  addUserAllowlistAction,
  changeWatchStreamsStateAction,
  removeUserAllowlistAction,
  setPasswordChannelAction,
} from "@/actions";
import { Notification, useAlertNotification } from "@/components";
import {
  AddUserAllowlistRequest,
  AddUserAllowlistResponse,
  AllowListUser,
  RemoveUserAllowlistRequest,
  RemoveUserAllowlistResponse,
  SetPasswordRequest,
  SetPasswordResponse,
  UpdateWatchOnlyStatusRequest,
} from "@/interfaces";
import { ChannelWatchOnly, Role, Setting } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, MouseEvent, useState } from "react";

import {
  RiSave3Fill,
  RiUserFollowFill,
  RiUserUnfollowFill,
} from "react-icons/ri";

interface userChannel {
  id: number;
  watchOnly: ChannelWatchOnly;
  watchOnlyPassword: string | null;
  user: {
    id: string;
    role: Role;
    email: string;
    emailVerified: boolean;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    image: string | null;
    channelAllowListUsersId: number | null;
  };
  channelAllowList: Array<AllowListUser>;
}

interface Props {
  settings: { streamUrl: string; settings: Array<Setting> };
  userChannel: userChannel;
}

export function ChannelSettingsForm({ settings, userChannel }: Props) {
  const [watchOnlyOption, setWatchOnlyOption] = useState<ChannelWatchOnly>(
    userChannel.watchOnly
  );

  const [watchOnlyPassword, setWatchOnlyPassword] = useState(
    userChannel.watchOnlyPassword || ""
  );

  const [tooltip, setTooltip] = useState({
    x: 0,
    y: 0,
    visible: false,
  });

  const [buttonsState, setButtonsState] = useState({
    changePassword: false,
    addUserAllowlist: false,
  });

  const [addUserAllowlist, setAddUserAllowlist] = useState("");
  const [allowListUsers, setAllowListUsers] = useState<Array<AllowListUser>>(
    userChannel.channelAllowList
  );

  const { alertNotification, showAlert } = useAlertNotification();

  const isOverflowX = (element: HTMLElement) =>
    element.offsetWidth < element.scrollWidth;

  const handleMouseOver = (event: MouseEvent) => {
    const element = event.target as HTMLElement;
    if (!element) return;

    if (isOverflowX(element)) {
      element.setAttribute("title", element.textContent ?? "");
    } else {
      element.removeAttribute("title");
    }
  };

  return (
    <>
      <Notification state={alertNotification} />
      <div className={"sm:mx-auto sm:w-full sm:max-w-sm"}>
        <Image
          className={"mx-auto h-20 w-auto"}
          width={256}
          height={256}
          priority={true}
          alt="Logo"
          src="/logo.png"
        />
        <h2
          className={
            "mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-gray-100"
          }
        >
          Channel settings
        </h2>

        <div className="mt-0 text-center text-sm font-bold leading-9 tracking-tight text-primary-700">
          <Link href="/user">User settings</Link>
        </div>

        <div className={"mt-6 sm:mx-auto sm:w-full sm:max-w-sm"}>
          <label
            htmlFor="watchstreamstate"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-100"
          >
            Who can watch your streams:
          </label>
          <select
            defaultValue={watchOnlyOption}
            onChange={async (e: ChangeEvent<HTMLElement>) => {
              const value = (e.target as HTMLSelectElement)
                .value as ChannelWatchOnly;
              setWatchOnlyOption(value);

              const request: UpdateWatchOnlyStatusRequest = {
                channelId: userChannel.id,
                state: value,
              };

              await changeWatchStreamsStateAction(request);
            }}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
          >
            <option value="ALL">Anyone</option>
            <option value="REGISTERED_USERS">Registered users</option>
            <option value="ALLOWLIST">Allowlist</option>
            <option value="PASSWORD">Password</option>
          </select>
        </div>
        {watchOnlyOption === ChannelWatchOnly.ALLOWLIST && (
          <div className="mt-6">
            <div className={"flex items-center justify-between"}>
              <label
                htmlFor="obstoken"
                className={
                  "block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
                }
              >
                Only these users can watch yours streams
              </label>
            </div>
            <div className={"mt-2"}>
              <div className="flex">
                <form
                  className="flex w-full"
                  action={async () => {
                    setButtonsState({
                      ...buttonsState,
                      addUserAllowlist: true,
                    });

                    const addUserRequestBody: AddUserAllowlistRequest = {
                      channelId: userChannel.id,
                      username: addUserAllowlist,
                    };

                    const addUserResponse: AddUserAllowlistResponse =
                      await addUserAllowlistAction(addUserRequestBody);

                    if (addUserResponse.ok) {
                      setAllowListUsers([
                        ...allowListUsers,
                        addUserResponse.data!,
                      ]);

                      showAlert(
                        `User ${addUserResponse.data?.user.name} added to the allowlist`
                      );

                      setAddUserAllowlist("");
                    } else {
                      showAlert(
                        addUserResponse.message || "An error has occurred",
                        true
                      );
                    }

                    setButtonsState({
                      ...buttonsState,
                      addUserAllowlist: false,
                    });
                  }}
                >
                  <input
                    type="text"
                    value={addUserAllowlist}
                    required
                    onChange={(e) => setAddUserAllowlist(e.target.value)}
                    className={
                      "w-4/5 rounded-l-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                    }
                  />

                  <button
                    disabled={buttonsState.addUserAllowlist}
                    className="group block w-1/5 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress rounded-r-md py-1.5 text-white shadow-xs ring-0 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
                  >
                    <div className={"relative flex text-center justify-center"}>
                      <div className="flex align-middle justify-center items-center text-base">
                        <RiUserFollowFill />
                      </div>
                      <span className="cursor-pointer hover:hidden invisible group-hover:visible group-hover:opacity-100 transition-all p-2 bg-gray-800 px-1 text-sm text-gray-100 min-w-20 rounded-md absolute left-full -translate-x-full -translate-y-[65px] opacity-0 m-4 mx-auto">
                        Add user
                      </span>
                    </div>
                  </button>
                </form>
              </div>
              <div className="flex flex-col mt-4">
                {allowListUsers.length > 0 && (
                  <span className="text-lg font-bold mb-2">Allowlist:</span>
                )}
                <div className="flex max-h-40 overflow-auto">
                  <ul className="flex flex-wrap w-full">
                    {allowListUsers.map((elem: AllowListUser) => (
                      <button
                        key={elem.id}
                        onClick={async () => {
                          const removeUserRequestBody: RemoveUserAllowlistRequest =
                            {
                              id: elem.id,
                            };

                          const removeUserResponse: RemoveUserAllowlistResponse =
                            await removeUserAllowlistAction(
                              removeUserRequestBody
                            );

                          if (removeUserResponse) {
                            setAllowListUsers(
                              allowListUsers.filter((p) => p !== elem)
                            );
                          }
                        }}
                        className="w-full md:w-1/2 cursor-pointer group hover:bg-gray-300 transition-colors duration-300 rounded-md"
                      >
                        <li className="flex w-full p-2 text-left">
                          <div
                            className="grow w-11/12 truncate select-none"
                            title={elem.user.name}
                            onMouseOver={handleMouseOver}
                          >
                            {elem.user.name}
                          </div>
                          <div className="w-1/12 flex justify-end items-center">
                            <RiUserUnfollowFill className="group-hover:fill-red-500 transition-colors duration-300" />
                          </div>
                        </li>
                      </button>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        {watchOnlyOption === ChannelWatchOnly.PASSWORD && (
          <>
            <div className="mt-6">
              <div className={"flex items-center justify-between"}>
                <label
                  htmlFor="passwordurl"
                  className={
                    "block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
                  }
                >
                  Use a password to be able to watch your stream
                </label>
              </div>
              <div className={"mt-2"}>
                <div className="flex">
                  <input
                    id="changeuserrole"
                    name="changeuserrole"
                    type="text"
                    value={watchOnlyPassword}
                    onChange={(e) => setWatchOnlyPassword(e.target.value)}
                    className={
                      "w-4/5 rounded-l-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                    }
                  />

                  <button
                    onClick={async () => {
                      setButtonsState({
                        ...buttonsState,
                        changePassword: true,
                      });

                      const request: SetPasswordRequest = {
                        channelId: userChannel.id,
                        password: watchOnlyPassword,
                      };

                      const setPasswordResponse: SetPasswordResponse =
                        await setPasswordChannelAction(request);

                      if (setPasswordResponse.ok) {
                        showAlert("Password has been set");
                      }
                      setButtonsState({
                        ...buttonsState,
                        changePassword: false,
                      });
                    }}
                    disabled={buttonsState.changePassword}
                    className="group block w-1/5 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress rounded-r-md py-1.5 text-white shadow-xs ring-0 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
                  >
                    <div className={"relative flex text-center justify-center"}>
                      <div className="flex align-middle justify-center items-center text-base">
                        <RiSave3Fill />
                      </div>
                      <span className="cursor-pointer hover:hidden invisible group-hover:visible group-hover:opacity-100 transition-all p-2 bg-gray-800 px-1 text-sm text-gray-100 min-w-20 rounded-md absolute left-full -translate-x-full -translate-y-[65px] opacity-0 m-4 mx-auto">
                        Save
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
            <div className={"items-center justify-between"}>
              <label
                htmlFor="obstoken"
                className={
                  "algo mt-2 block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
                }
              >
                Stream URL:
                <div className="flex w-full">
                  <div
                    className="text-primary-600 cursor-pointer h-12 overflow-x-auto whitespace-nowrap"
                    onClick={() => {
                      if (watchOnlyPassword) {
                        const url = `${
                          settings.streamUrl
                        }/${userChannel.user.name.toLowerCase()}?password=${watchOnlyPassword}`;
                        navigator.clipboard.writeText(url);
                      }
                    }}
                  >
                    <div
                      className="flex h-full"
                      onMouseEnter={(e: MouseEvent) => {
                        setTooltip({
                          ...tooltip,
                          visible: true,
                          x: e.pageX - 20,
                          y: e.pageY + 20,
                        });
                      }}
                      onMouseLeave={() => {
                        setTooltip({
                          ...tooltip,
                          visible: false,
                        });
                      }}
                      onMouseMove={(e: MouseEvent) => {
                        setTooltip({
                          ...tooltip,
                          visible: true,
                          x: e.pageX - 20,
                          y: e.pageY + 20,
                        });
                      }}
                    >
                      {`${
                        settings.streamUrl
                      }/${userChannel.user.name.toLowerCase()}?password=${watchOnlyPassword}`}
                    </div>
                  </div>
                  <span
                    style={{ left: tooltip.x, top: tooltip.y }}
                    className={`${
                      tooltip.visible
                        ? "opacity-100 visible"
                        : "opacity-0 invisible"
                    } transition-opacity select-none p-2 duration-1000 bg-gray-800 px-1 text-sm text-gray-100 min-w-20 rounded-md absolute -translate-x-0 -translate-y-1/2 m-4 mx-auto`}
                  >
                    Copy URL
                  </span>
                </div>
              </label>
            </div>
          </>
        )}
      </div>
    </>
  );
}
