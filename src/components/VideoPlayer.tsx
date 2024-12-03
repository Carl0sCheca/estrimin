"use client";

import { ReactElement, useEffect, useRef } from "react";
import { WebRTCPlayer } from "@eyevinn/webrtc-player";
import { useSearchParams } from "next/navigation";

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

      const player = new WebRTCPlayer({
        video,
        type: "whep",
        statsTypeFilter: "^candidate-*|^inbound-rtp",
      });

      await player.load(
        new URL(
          url +
            `${
              password
                ? `${url.includes("session") ? "&" : "?"}password=${password}`
                : ``
            }`
        )
      );
      // player.unmute();

      try {
        await video.play();
      } catch {
        return;
      }

      // player.on("no-media", () => {
      //   console.log("media timeout occured");
      // });
      // player.on("media-recovered", () => {
      //   console.log("media recovered");
      // });

      // Subscribe for RTC stats: `stats:${RTCStatsType}`
      // player.on("stats:inbound-rtp", (report) => {
      //   if (report.kind === "video") {
      //     console.log(report);
      //   }
      // });
    };

    startPlay();
  }, [url, password]);

  return (
    <div className={className}>
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
