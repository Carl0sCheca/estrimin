"use client";

import { ReactElement, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { WhepPlayer } from "whep-player";

interface Props {
  url: string;
  className?: string;
}

export function VideoPlayer({ url, className }: Props): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);

  const searchParams = useSearchParams();
  const password = searchParams.get("password");

  useEffect(() => {
    const startPlay = async () => {
      const video = videoRef.current;

      if (!video) return;

      const player = WhepPlayer({
        video,
        url: `${url}${
          password
            ? `${url.includes("session") ? "&" : "?"}password=${password}`
            : ``
        }`,
      });

      player.load();
    };

    startPlay();
  }, [url, password]);

  return (
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
  );
}
