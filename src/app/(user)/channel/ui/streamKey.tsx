"use client";

import { createChannel } from "@/actions";
import { MouseEvent, MouseEventHandler, useState } from "react";
import { VscDebugRestart } from "react-icons/vsc";
import { userChannel } from "./channelSettingsForm";

interface Props {
  tooltipMouseEnter: Function;
  tooltipMouseLeave: Function;
  settings: {
    streamUrl: string | undefined;
  };
  userChannel: userChannel;
}

export const StreamKey = ({
  tooltipMouseEnter,
  tooltipMouseLeave,
  settings,
  userChannel,
}: Props) => {
  const [tooltip, setTooltip] = useState({
    x: 0,
    y: 0,
    visible: false,
  });

  const [token, setToken] = useState<string>(userChannel.token);

  return (
    <>
      {" "}
      <div className={"flex items-center justify-between"}>
        <label
          htmlFor="obstoken"
          className={
            "block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
          }
        >
          Stream key
        </label>
      </div>
      <div className={"mt-2"}>
        <div className="flex">
          <input
            id="token"
            name="token"
            type="text"
            readOnly
            value={token}
            onChange={(newToken) => setToken(newToken.target.value)}
            className={
              "w-4/5 rounded-l-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
            }
          />

          <button
            onMouseEnter={(e) => tooltipMouseEnter(e, "Regenerate token")}
            onMouseLeave={() => tooltipMouseLeave()}
            onClick={async () => {
              const tokenResponse = await createChannel();

              if (tokenResponse.ok && tokenResponse.data) {
                setToken(tokenResponse.data);
              }
            }}
            className="flex justify-center items-center p-2 w-1/5 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress rounded-r-md text-white shadow-xs ring-0 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
          >
            <div className={"relative flex text-center justify-center"}>
              <VscDebugRestart />
            </div>
          </button>
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
                if (token) {
                  const url = `${
                    settings.streamUrl
                  }/${userChannel.user.name.toLowerCase()}/whip?token=${token}`;
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
                }/${userChannel.user.name.toLowerCase()}/whip?token=${token}`}
              </div>
            </div>
            <span
              style={{ left: tooltip.x, top: tooltip.y }}
              className={`${
                tooltip.visible ? "opacity-100 visible" : "opacity-0 invisible"
              } transition-opacity select-none p-2 duration-1000 bg-gray-800 px-1 text-sm text-gray-100 min-w-20 rounded-md absolute -translate-x-0 -translate-y-1/2 m-4 mx-auto`}
            >
              Copy URL
            </span>
          </div>
        </label>
      </div>
    </>
  );
};
