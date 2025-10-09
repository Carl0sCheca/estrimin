"use client";

import { getLiveChannelsAction } from "@/actions";
import { Collapsible, Spinner } from "@/components";
import { LiveChannelItem } from "@/interfaces";
import { formatTimeAgo } from "@/lib/utils";
import { useEffect, useState } from "react";
import { IoMdPeople } from "react-icons/io";

interface Props {
  baseUrl: string;
}

export const LiveChannels = ({ baseUrl }: Props) => {
  const [liveChannels, setLiveChannels] = useState<Array<LiveChannelItem>>([]);
  const [liveChannelsIsLoading, setLiveChannelsIsLoading] = useState(true);

  useEffect(() => {
    const getLiveChannels = async () => {
      setLiveChannelsIsLoading(true);
      const response = await getLiveChannelsAction();

      setLiveChannels(response.items);
      setLiveChannelsIsLoading(false);
    };

    getLiveChannels();

    const intervalId = setInterval(async () => {
      await getLiveChannels();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  return (
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
                href={`${baseUrl}/${channel.id}`}
                target="_blank"
              >
                <div className="items-center truncate" title={channel.id}>
                  {channel.id}
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
  );
};
