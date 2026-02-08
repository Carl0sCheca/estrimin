"use client";

import { createChannel } from "@/actions";
import { useState } from "react";
import { VscDebugRestart } from "react-icons/vsc";
import { UserChannel } from "./channelSettingsForm";
import { MouseEnterEventOptions } from "@/components";
import { HiClipboardCopy } from "react-icons/hi";
import { FaEye, FaEyeSlash } from "react-icons/fa";

interface Props {
  tooltipMouseEnter: (
    event: React.MouseEvent<HTMLElement>,
    text: string,
    options?: MouseEnterEventOptions,
  ) => void;
  tooltipMouseLeave: (event: React.MouseEvent<HTMLElement>) => void;
  tooltipMouseMove: (event: React.MouseEvent<HTMLElement>) => void;
  settings: {
    streamUrl: string | undefined;
  };
  userChannel: UserChannel | null;
  showAlert: (message: string, error?: boolean, duration?: number) => void;
}

export const StreamKey = ({
  tooltipMouseEnter,
  tooltipMouseLeave,
  tooltipMouseMove,
  settings,
  userChannel,
  showAlert,
}: Props) => {
  const [token, setToken] = useState<string>(userChannel?.token || "");
  const [tokenVisible, setTokenVisible] = useState(false);

  return (
    <>
      <div className={"flex items-center justify-between"}>
        <label
          className={
            "block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
          }
        >
          Stream token
        </label>
      </div>
      <div className={"mt-2"}>
        <div className="flex">
          <input
            id="token"
            name="token"
            type={tokenVisible ? "text" : "password"}
            readOnly
            value={token}
            onClick={(e) => {
              (e.target as HTMLInputElement).focus();
              (e.target as HTMLInputElement).select();
            }}
            onChange={(newToken) => setToken(newToken.target.value)}
            className={
              "w-4/5 rounded-l-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
            }
          />
          <button
            onMouseEnter={(e) =>
              tooltipMouseEnter(e, tokenVisible ? "Hide token" : "Show token")
            }
            onMouseLeave={tooltipMouseLeave}
            onClick={(e) => {
              tooltipMouseLeave(e);
              tooltipMouseEnter(e, !tokenVisible ? "Hide token" : "Show token");
              setTokenVisible(!tokenVisible);
            }}
            className="flex justify-center items-center p-2 w-1/5 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress text-white shadow-xs ring-0 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
          >
            <div className={"relative flex text-center justify-center"}>
              {tokenVisible ? <FaEyeSlash /> : <FaEye />}
            </div>
          </button>
          <button
            onMouseEnter={(e) => tooltipMouseEnter(e, "Copy token")}
            onMouseLeave={tooltipMouseLeave}
            onClick={async () => {
              await navigator.clipboard.writeText(token);
              showAlert("Token copied to clipboard");
            }}
            className="flex justify-center items-center p-2 w-1/5 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress text-white shadow-xs ring-0 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
          >
            <div className={"relative flex text-center justify-center"}>
              <HiClipboardCopy />
            </div>
          </button>
          <button
            onMouseEnter={(e) => tooltipMouseEnter(e, "Regenerate token")}
            onMouseLeave={tooltipMouseLeave}
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
      {userChannel && (
        <div className={"items-center justify-between"}>
          <label
            className={
              "mt-2 block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
            }
          >
            Stream server URL:
            <div className="flex w-full">
              <div
                className="text-primary-600 cursor-pointer h-12 overflow-x-auto whitespace-nowrap"
                onClick={async () => {
                  if (token) {
                    const url = `${settings.streamUrl}/${userChannel.user.id}/whip`;
                    await navigator.clipboard.writeText(url);
                  }
                }}
              >
                <div
                  className="flex h-full"
                  onMouseEnter={(e) =>
                    tooltipMouseEnter(e, "Copy URL", {
                      defaultPosition: "bottom",
                      followCursor: true,
                      extraGapY: 20,
                    })
                  }
                  onMouseMove={(e) => tooltipMouseMove(e)}
                  onMouseLeave={tooltipMouseLeave}
                >
                  {`${settings.streamUrl}/${userChannel.user.id}/whip`}
                </div>
              </div>
            </div>
          </label>
        </div>
      )}
    </>
  );
};
