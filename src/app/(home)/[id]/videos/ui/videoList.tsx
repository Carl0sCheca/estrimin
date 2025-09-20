import { getChannelRecordingsAction } from "@/actions";
import { UserChannel } from "@/app/(user)/channel/ui/channelSettingsForm";
import { formatDate } from "@/lib/utils";
import { RecordingVisibility } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { FaCircle } from "react-icons/fa";
import { IoLink, IoList } from "react-icons/io5";
import { RiLockFill } from "react-icons/ri";

interface Props {
  channel: UserChannel;
}

export const VideoList = async ({ channel }: Props) => {
  const recordingsList = await getChannelRecordingsAction(channel);

  return (
    <>
      {(!recordingsList.ok ||
        (recordingsList.ok && recordingsList.recordings.length === 0)) && (
        <div className="text-center gap-6 mt-6">No videos</div>
      )}

      {recordingsList.ok && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 rounded-lg shadow-lg p-2">
          {recordingsList.recordings.map((recording) => (
            <Link
              key={recording.title + recording.date}
              href={recording.url}
              className="group cursor-pointer"
            >
              <div className="relative w-full h-50 sm:h-50 md:h-50 lg:h-24 rounded-lg overflow-hidden mb-2">
                <Image
                  src={recording.thumbnail}
                  alt={recording.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  priority
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />

                {(recording.status === "LIVE" ||
                  recording.status === "PROCESSING") && (
                  <div className="absolute top-0.5 left-0.5 bg-red text-white p-1 rounded-full">
                    <FaCircle
                      title={
                        recording.status === "LIVE"
                          ? "live"
                          : "processing video"
                      }
                      size={12}
                      className={`ml-1 ${
                        recording.status === "LIVE"
                          ? "text-red-500"
                          : "text-primary-500"
                      }`}
                    />
                  </div>
                )}

                {recording.visibility !== RecordingVisibility.PUBLIC && (
                  <div className="absolute top-2 right-2 bg-black/65 text-white p-1 rounded-full">
                    {recording.visibility === RecordingVisibility.ALLOWLIST && (
                      <IoList size={10} />
                    )}
                    {recording.visibility === RecordingVisibility.PRIVATE && (
                      <RiLockFill size={10} />
                    )}
                    {recording.visibility === RecordingVisibility.UNLISTED && (
                      <IoLink size={10} />
                    )}
                  </div>
                )}

                <div className="absolute bottom-2 right-2 bg-black/65 text-white text-xs px-1.5 py-0.5 rounded">
                  {recording.duration}
                </div>
              </div>

              <div className="mt-2">
                <h3
                  title={recording.title}
                  className="font-medium text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors"
                >
                  {recording.title}
                </h3>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-sm text-gray-500">
                    {formatDate(recording.date)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
};
