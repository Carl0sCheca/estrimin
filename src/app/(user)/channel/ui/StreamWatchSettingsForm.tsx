"use client";

import {
  addUserAllowlistAction,
  changeWatchStreamsStateAction,
  removeUserAllowlistAction,
  setPasswordChannelAction,
} from "@/actions";
import {
  RiSave3Fill,
  RiUserFollowFill,
  RiUserUnfollowFill,
} from "react-icons/ri";
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
import { ChangeEvent, MouseEvent, useState } from "react";
import { UserChannel } from "./channelSettingsForm";
import { ChannelWatchOnly } from "@prisma/client";
import { MouseEnterEventOptions } from "@/components";

interface Props {
  showAlert: (message: string, error?: boolean, duration?: number) => void;
  tooltipMouseEnter: (
    event: React.MouseEvent<HTMLElement>,
    text: string,
    options?: MouseEnterEventOptions
  ) => void;
  tooltipMouseLeave: () => void;
  tooltipMouseMove: (event: React.MouseEvent<HTMLElement>) => void;
  userChannel: UserChannel;
  channelUrl: string;
}

export const StreamWatchSettingsForm = ({
  userChannel,
  showAlert,
  tooltipMouseEnter,
  tooltipMouseLeave,
  tooltipMouseMove,
  channelUrl,
}: Props) => {
  const [watchOnlyOption, setWatchOnlyOption] = useState<ChannelWatchOnly>(
    userChannel.watchOnly
  );

  const [watchOnlyPassword, setWatchOnlyPassword] = useState(
    userChannel.watchOnlyPassword || ""
  );

  const [buttonsState, setButtonsState] = useState({
    changePassword: false,
    addUserAllowlist: false,
  });

  const [addUserAllowlist, setAddUserAllowlist] = useState("");
  const [allowListUsers, setAllowListUsers] = useState<Array<AllowListUser>>(
    userChannel.channelAllowList
  );

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
      <div className={"mt-3 sm:mx-auto sm:w-full sm:max-w-sm"}>
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

                  if (
                    addUserAllowlist.toLowerCase() ===
                    userChannel.user.name.toLowerCase()
                  ) {
                    showAlert(`You cannot add yourself to the list`, true);

                    setAddUserAllowlist("");
                  } else {
                    const addUserRequestBody: AddUserAllowlistRequest = {
                      channelId: userChannel.id,
                      username: addUserAllowlist,
                      requestedBy: userChannel.user.name,
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
                  onMouseEnter={(e) => tooltipMouseEnter(e, "Add user")}
                  onMouseLeave={() => tooltipMouseLeave()}
                  className="flex justify-center items-center p-2 w-1/5 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress rounded-r-md text-white shadow-xs ring-0 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
                >
                  <div className={"relative flex text-center justify-center"}>
                    <div className="flex align-middle justify-center items-center text-base">
                      <RiUserFollowFill />
                    </div>
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
                  onMouseEnter={(e) => tooltipMouseEnter(e, "Save")}
                  onMouseLeave={() => tooltipMouseLeave()}
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
                  className="flex justify-center items-center p-2 w-1/5 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress rounded-r-md text-white shadow-xs ring-0 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
                >
                  <div className={"relative flex text-center justify-center"}>
                    <div className="flex align-middle justify-center items-center text-base">
                      <RiSave3Fill />
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
          <div className={"items-center justify-between"}>
            <label
              className={
                "algo mt-2 block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
              }
            >
              Channel URL:
              <div className="flex w-full">
                <div
                  className="text-primary-600 cursor-pointer h-12 overflow-x-auto whitespace-nowrap"
                  onClick={() => {
                    if (watchOnlyPassword) {
                      const url = `${channelUrl}/${userChannel.user.name.toLowerCase()}?password=${watchOnlyPassword}`;

                      navigator.clipboard.writeText(url);
                    }
                  }}
                >
                  <div
                    className="flex h-full"
                    onMouseEnter={(e) =>
                      tooltipMouseEnter(e, "Copy URL", {
                        defaultPosition: "bottom",
                        followCursor: true,
                      })
                    }
                    onMouseMove={(e) => tooltipMouseMove(e)}
                    onMouseLeave={() => tooltipMouseLeave()}
                  >
                    {`${channelUrl}/${userChannel.user.name.toLowerCase()}?password=${watchOnlyPassword}`}
                  </div>
                </div>
              </div>
            </label>
          </div>
        </>
      )}
    </>
  );
};
