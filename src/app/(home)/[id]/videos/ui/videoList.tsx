import { getChannelRecordingsAction } from "@/actions";
import { UserChannel } from "@/app/(user)/channel/ui/channelSettingsForm";
import { Videos } from "./videos";

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

      <Videos channel={channel} recordingsListInit={recordingsList} />
    </>
  );
};
