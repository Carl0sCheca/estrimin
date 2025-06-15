"use client";

import { ReactElement, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { type WhepPlayer, WhepPlayerInstance } from "whep-player";
import { GetViewers } from "@/actions";
import { PlayerState, VideoOverlay } from "@/components";

interface Props {
  url: string;
  channelUserId: string;
  className?: string;
}

export const VideoPlayer = ({
  channelUserId,
  url,
  className,
}: Props): ReactElement => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const playerRef = useRef<WhepPlayer | null>(null);

  const clearCurrentInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const [viewersCount, setViewersCount] = useState(0);
  const [playerState, setPlayerState] = useState(PlayerState.OFFLINE);
  const searchParams = useSearchParams();
  const password = searchParams.get("password");

  useEffect(() => {
    const setNewInterval = (callback: () => void, duration: number) => {
      clearCurrentInterval();
      intervalRef.current = setInterval(callback, duration);
    };

    const closePlayer = async () => {
      if (!playerRef.current) {
        return;
      }
      clearCurrentInterval();
      await playerRef.current.unload();
    };

    const startPlay = async () => {
      if (playerRef.current) return;

      const video = videoRef.current;
      if (!video) return;

      const player = WhepPlayerInstance({
        video,
        url: `${url}${
          password
            ? `${url.includes("session") ? "&" : "?"}password=${password}`
            : ``
        }`,
      });

      playerRef.current = player;
      player.load();

      player.onConnected(async () => {
        setPlayerState(PlayerState.ONLINE);

        const viewers = await GetViewers(channelUserId);
        if (viewers.ok && viewers.count) {
          setViewersCount(viewers.count);
        }

        setNewInterval(async () => {
          const viewers = await GetViewers(channelUserId);
          if (viewers.ok && viewers.count) {
            setViewersCount(viewers.count);
          }
        }, 60000);
      });

      player.onError(() => {
        setPlayerState(PlayerState.OFFLINE);
        clearCurrentInterval();
      });

      player.onRetriesExceeded(() => {
        setPlayerState(PlayerState.OFFLINE);
        clearCurrentInterval();
      });

      return () => {
        clearCurrentInterval();
      };
    };

    startPlay();

    return () => {
      closePlayer();
    };
  }, [url, password, channelUserId]);

  return (
    <>
      <VideoOverlay playerState={playerState} viewers={viewersCount} />
      <div className={`${className} relative group`}>
        <video
          className="flex h-full w-full bg-black"
          ref={videoRef}
          playsInline
          autoPlay
          muted
          controls={true}
        />
      </div>
    </>
  );
};
