"use client";

interface Props {
  videoUrl: string;
}

export const RecordingPlayer = ({ videoUrl }: Props) => {
  return (
    <>
      <div className={`flex-auto h-full w-full relative group`}>
        <video
          className="flex h-full w-full bg-black"
          playsInline
          autoPlay
          src={videoUrl}
          muted
          controls={true}
        />
      </div>
    </>
  );
};
