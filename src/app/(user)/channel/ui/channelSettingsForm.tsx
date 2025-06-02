"use client";

import {
  Logo,
  Notification,
  Tooltip,
  useAlertNotification,
  useTooltip,
} from "@/components";
import { AllowListUser } from "@/interfaces";
import { ChannelWatchOnly, Role, Setting } from "@prisma/client";
import Link from "next/link";
import { useRef } from "react";

import { RecordingsList } from "./RecordingsList";
import { StreamKey } from "./streamKey";
import { StreamWatchSettingsForm } from "./StreamWatchSettingsForm";

export interface UserChannel {
  id: number;
  watchOnly: ChannelWatchOnly;
  watchOnlyPassword: string | null;
  token: string;
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
  settings: {
    streamUrl: string;
    channelUrl: string;
    settings: Array<Setting>;
  };
  userChannel: UserChannel;
}

export const ChannelSettingsForm = ({ settings, userChannel }: Props) => {
  const { alertNotification, showAlert } = useAlertNotification();

  const tooltipRef = useRef(null);
  const {
    tooltipState,
    tooltipMouseEnter,
    tooltipMouseMove,
    tooltipMouseLeave,
  } = useTooltip(tooltipRef);

  return (
    <>
      <Tooltip state={tooltipState} tooltipRef={tooltipRef} />
      <Notification state={alertNotification} />
      <div className={"sm:mx-auto sm:w-full sm:max-w-sm"}>
        <Logo />
        <h2
          className={
            "mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-gray-100"
          }
        >
          Channel
        </h2>
        <div className="mt-0 text-center text-sm font-bold leading-9 tracking-tight text-primary-700 ">
          <Link href="/user" className="hover:text-primary-600">
            Back to User
          </Link>
        </div>
        <div className="mt-6">
          <StreamKey
            tooltipMouseEnter={tooltipMouseEnter}
            tooltipMouseMove={tooltipMouseMove}
            tooltipMouseLeave={tooltipMouseLeave}
            settings={settings}
            userChannel={userChannel}
          />
        </div>
        <StreamWatchSettingsForm
          userChannel={userChannel}
          showAlert={showAlert}
          tooltipMouseEnter={tooltipMouseEnter}
          tooltipMouseMove={tooltipMouseMove}
          tooltipMouseLeave={tooltipMouseLeave}
          channelUrl={settings.channelUrl}
        />
        <div className="mt-8">
          <RecordingsList
            userChannel={userChannel}
            tooltipMouseEnter={tooltipMouseEnter}
            tooltipMouseLeave={tooltipMouseLeave}
            showAlert={showAlert}
          />
        </div>
      </div>
    </>
  );
};
