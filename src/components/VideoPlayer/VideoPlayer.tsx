"use client";

import { ReactElement, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { type WhepPlayer, WhepPlayerInstance } from "whep-player";
import { GetViewers } from "@/actions";
import { PlayerState, VideoOverlay } from "@/components";

interface Props {
  url: string;
  channelUserId: string;
  channelUserName: string;
  sessionUserId: string | undefined;
  isFollowing: boolean;
  className?: string;
}

export const VideoPlayer = ({
  channelUserId,
  channelUserName,
  sessionUserId,
  isFollowing,
  url,
  className,
}: Props): ReactElement => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<WhepPlayer | null>(null);

  const [playerState, setPlayerState] = useState(PlayerState.OFFLINE);
  const searchParams = useSearchParams();
  const password = searchParams.get("password");

  const { data: viewersCount = 0 } = useQuery({
    queryKey: ["viewers", channelUserId],
    queryFn: async () => {
      const viewers = await GetViewers(channelUserId);
      return viewers.ok && viewers.count ? viewers.count : 0;
    },
    refetchInterval: 60000,
    enabled: playerState === PlayerState.ONLINE,
  });

  useEffect(() => {
    const closePlayer = async () => {
      if (!playerRef.current) {
        return;
      }
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
      });

      player.onError(() => {
        setPlayerState(PlayerState.OFFLINE);
      });

      player.onRetriesExceeded(() => {
        setPlayerState(PlayerState.OFFLINE);
      });

      return () => {};
    };

    startPlay();

    return () => {
      closePlayer();
    };
  }, [url, password]);

  return (
    <>
      <VideoOverlay
        playerState={playerState}
        viewers={viewersCount}
        channelUserId={channelUserId}
        channelUserName={channelUserName}
        sessionUserId={sessionUserId}
        isFollowing={isFollowing}
      />
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
