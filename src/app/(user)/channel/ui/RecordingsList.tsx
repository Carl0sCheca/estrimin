"use client";

import {
  deleteRecordingAction,
  getRecordingsListAction,
  saveRecordingAction,
} from "@/actions";
import {
  Collapsible,
  MoreOptions,
  MouseEnterEventOptions,
  SelectorIcon,
  Spinner,
} from "@/components";
import { Recording } from "@/interfaces";
import { formatDate, formatTimeAgo, secondsToHMS } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { IoIosTimer, IoMdSave } from "react-icons/io";
import { MdDeleteForever } from "react-icons/md";
import {
  RiFileVideoLine,
  RiLockFill,
  RiLockPasswordFill,
  RiLockUnlockFill,
} from "react-icons/ri";
import { UserChannel } from "./channelSettingsForm";

interface Props {
  userChannel: UserChannel;
  tooltipMouseEnter: (
    event: React.MouseEvent<HTMLElement>,
    text: string,
    options?: MouseEnterEventOptions
  ) => void;
  tooltipMouseLeave: () => void;
  showAlert: (message: string, error?: boolean, duration?: number) => void;
}

export const RecordingsList = ({
  userChannel,
  tooltipMouseEnter,
  tooltipMouseLeave,
  showAlert,
}: Props) => {
  const [recordingList, setRecordingList] = useState<Array<Recording>>([]);
  const [recordingListIsLoading, setRecordingListIsLoading] = useState(true);
  const [recordingListIsOpen, setRecordingListIsOpen] = useState(false);

  const [savingRecording, setSavingRecording] = useState(false);

  useEffect(() => {
    const getRecordingsList = async () => {
      setRecordingListIsLoading(true);
      const responseRecordingsList = await getRecordingsListAction(userChannel);

      if (responseRecordingsList.ok) {
        setRecordingList(responseRecordingsList.recordings);
      }

      setRecordingListIsLoading(false);
    };

    getRecordingsList();
  }, [userChannel]);

  return (
    <Collapsible setIsOpen={setRecordingListIsOpen} title="Saved streams">
      <Spinner
        className={`${
          recordingListIsLoading ? "flex" : "hidden"
        } justify-center`}
      />
      <div className="mb-4">Streams are stored for 48 hours</div>
      {recordingList.length === 0 && !recordingListIsLoading && (
        <div>No streams found</div>
      )}
      {recordingList.map((recording, i) => {
        return (
          <div key={i} className="flex py-1 px-2">
            <Link
              className="w-2/4 flex items-center"
              href={recording.url}
              target="_blank"
            >
              <div
                onMouseEnter={(e) =>
                  tooltipMouseEnter(e, formatDate(recording.start, true))
                }
                onMouseLeave={() => tooltipMouseLeave()}
                className="flex items-center"
              >
                <RiFileVideoLine className="mr-1.5" />{" "}
                {formatDate(recording.start)}
              </div>
              <div
                onMouseEnter={(e) =>
                  tooltipMouseEnter(
                    e,
                    `Duration: ${secondsToHMS(recording.duration)}`
                  )
                }
                onMouseLeave={() => tooltipMouseLeave()}
                className="flex items-center"
              >
                <IoIosTimer className="ml-2" />
              </div>
            </Link>
            <div className="flex w-1/4 ">
              <MoreOptions
                recordingListIsOpen={recordingListIsOpen}
                className="flex items-center cursor-pointer mx-auto"
                tooltip={{
                  mouseEnter: tooltipMouseEnter,
                  mouseLeave: tooltipMouseLeave,
                  text: "Options",
                }}
              >
                <div
                  onClick={async () => {
                    if (recording.type !== "not-saved") {
                      return;
                    }

                    setSavingRecording(true);

                    const response = await saveRecordingAction(
                      recording,
                      userChannel
                    );

                    if (response.ok && response.recording) {
                      setRecordingList((list) =>
                        list.map((r) => {
                          if (r === recording) {
                            r = response.recording as Recording;
                          }
                          return r;
                        })
                      );
                      tooltipMouseLeave();
                      showAlert("Saved stream");
                    }

                    setSavingRecording(false);
                  }}
                  onMouseEnter={(e) =>
                    tooltipMouseEnter(
                      e,
                      recording.type === "not-saved"
                        ? "Keep stream forever"
                        : "This stream is saved",
                      {
                        extraGapY: 3,
                      }
                    )
                  }
                  onMouseLeave={() => tooltipMouseLeave()}
                  className={`flex items-center hover:transition-colors hover:duration-300 ${
                    recording.type === "not-saved"
                      ? "hover:text-green-400 cursor-pointer"
                      : "text-primary-500 cursor-default"
                  }`}
                >
                  {savingRecording ? (
                    <Spinner size={24} />
                  ) : (
                    <IoMdSave size={24} />
                  )}
                </div>
                {/* <div
                  onMouseEnter={(e) =>
                    tooltipMouseEnter(e, "Make clip (disabled)", {
                      extraGapY: 3,
                    })
                  }
                  onMouseLeave={() => tooltipMouseLeave()}
                  className="flex items-center cursor-pointer hover:text-grey-300 hover:transition-colors hover:duration-300"
                >
                  <MdOutlineSlowMotionVideo size={24} />
                </div> */}
                <div
                  onClick={async () => {
                    const response = await deleteRecordingAction(
                      recording,
                      userChannel
                    );

                    if (response.ok) {
                      setRecordingList((list) =>
                        list.filter((item) => item !== recording)
                      );
                      tooltipMouseLeave();
                    } else {
                      showAlert(
                        response.message || "An error has occurred",
                        true
                      );
                    }
                  }}
                  onMouseEnter={(e) =>
                    tooltipMouseEnter(e, "Delete stream", { extraGapY: 3 })
                  }
                  onMouseLeave={() => tooltipMouseLeave()}
                  className="flex items-center cursor-pointer hover:text-red-500 hover:transition-colors hover:duration-300"
                >
                  <MdDeleteForever size={24} />
                </div>
                {recording.type !== "not-saved" && (
                  <SelectorIcon
                    tooltip={{
                      mouseEnter: tooltipMouseEnter,
                      mouseLeave: tooltipMouseLeave,
                    }}
                    chooseSelectedOption="public"
                    options={[
                      {
                        value: "public",
                        label: "Public video",
                        icon: <RiLockUnlockFill size={24} />,
                      },
                      {
                        value: "allowlist",
                        label: "Allowlist",
                        icon: <RiLockPasswordFill size={24} />,
                      },
                      {
                        value: "private",
                        label: "Private video",
                        icon: <RiLockFill size={24} />,
                      },
                    ]}
                  />
                )}
              </MoreOptions>
            </div>
            <div className="w-2/4 text-right">
              {formatTimeAgo(recording.start)} {"ago"}
            </div>
          </div>
        );
      })}
    </Collapsible>
  );
};
