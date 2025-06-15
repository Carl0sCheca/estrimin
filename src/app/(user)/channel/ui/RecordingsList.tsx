"use client";

import {
  changeDefaultRecordingVisibilityAction as changeUnsavedRecordingsVisibility,
  deleteRecordingAction,
  getRecordingsListAction,
  saveRecordingAction,
  storePastStreamsAction,
} from "@/actions";
import {
  Collapsible,
  MoreOptions,
  MouseEnterEventOptions,
  Selector,
  Spinner,
  Toggle,
} from "@/components";
import { Recording } from "@/interfaces";
import { formatDate, formatTimeAgo, secondsToHMS } from "@/lib/utils";
import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { IoIosTimer, IoMdSave } from "react-icons/io";
import {
  MdDeleteForever,
  MdOutlineDriveFileRenameOutline,
} from "react-icons/md";
import { RiFileVideoLine, RiLockFill } from "react-icons/ri";
import { UserChannel } from "./channelSettingsForm";
import { IoLink, IoList } from "react-icons/io5";
import { BiWorld } from "react-icons/bi";
import { RecordingVisibility, UserSetting } from "@prisma/client";

interface Props {
  userChannel: UserChannel;
  tooltipMouseEnter: (
    event: React.MouseEvent<HTMLElement>,
    text: string,
    options?: MouseEnterEventOptions
  ) => void;
  tooltipMouseLeave: (event: React.MouseEvent<HTMLElement>) => void;
  showAlert: (message: string, error?: boolean, duration?: number) => void;
  session: string;
  userSettings: UserSetting[];
}

export const RecordingsList = ({
  userChannel,
  tooltipMouseEnter,
  tooltipMouseLeave,
  showAlert,
  session,
  userSettings,
}: Props) => {
  const [recordingList, setRecordingList] = useState<Array<Recording>>([]);
  const [recordingListIsLoading, setRecordingListIsLoading] = useState(true);
  const [recordingListIsOpen, setRecordingListIsOpen] = useState(false);

  const [savingRecording, setSavingRecording] = useState(false);

  const [visibilityUnsavedRecordings, setVisibilityUnsavedRecordings] =
    useState<RecordingVisibility>(
      (userSettings.find((e) => e.key === "VISIBILITY_UNSAVED_RECORDINGS")
        ?.value as RecordingVisibility) || RecordingVisibility.PUBLIC
    );

  const [storePastStreams, setStorePastStreams] = useState<boolean>(
    (userSettings.find((e) => e.key === "STORE_PAST_STREAMS")
      ?.value as boolean) ?? true
  );

  const [openMoreOptionsId, setOpenMoreOptionsId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const getRecordingsList = async () => {
      setRecordingListIsLoading(true);
      const responseRecordingsList = await getRecordingsListAction(
        userChannel,
        session
      );

      if (responseRecordingsList.ok) {
        setRecordingList(responseRecordingsList.recordings);
      }

      setRecordingListIsLoading(false);
    };

    getRecordingsList();
  }, [userChannel, session]);

  const [openSelectorId, setOpenSelectorId] = useState<string | null>(null);

  const handleToggleSelector = (id: string | null) => {
    setOpenSelectorId((prevId) => (prevId === id ? null : id));
  };

  useEffect(() => {
    if (recordingListIsOpen) {
      setOpenSelectorId(null);
    }
  }, [recordingListIsOpen]);

  return (
    <>
      <div className="mt-4 mb-4 flex flex-col gap-4">
        <Toggle
          onChange={async () => {
            const response = await storePastStreamsAction(
              !storePastStreams,
              userChannel.user.id
            );

            if (response.ok) {
              setStorePastStreams(!storePastStreams);
            } else {
              showAlert("An error has occurred", true);
            }
          }}
          checked={storePastStreams}
        >
          Allow rewind and store past streams (deleted after 48 hours unless
          manually saved)
        </Toggle>
        <div>
          <label
            htmlFor="watchstreamstate"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-100"
          >
            Visibility of unsaved streams:
          </label>
          <select
            defaultValue={visibilityUnsavedRecordings}
            onChange={async (e: ChangeEvent<HTMLElement>) => {
              const value = (e.target as HTMLSelectElement)
                .value as RecordingVisibility;

              const response = await changeUnsavedRecordingsVisibility(
                value,
                userChannel.user.id
              );

              if (response.ok) {
                setVisibilityUnsavedRecordings(value);
              } else {
                showAlert("An error has occurred", true);
              }
            }}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
          >
            <option value="PUBLIC">Public</option>
            <option value="ALLOWLIST">Allowlist</option>
            <option value="UNLISTED">Unlisted</option>
            <option value="PRIVATE">Private</option>
          </select>
        </div>
      </div>
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
        {recordingList.map((recording) => {
          return (
            <div
              key={`${recording.id}${recording.start}`}
              className="flex py-1 px-2"
            >
              <Link
                className="w-2/4 flex items-center"
                href={recording.url}
                target="_blank"
              >
                <div
                  onMouseEnter={(e) =>
                    tooltipMouseEnter(e, formatDate(recording.start, true))
                  }
                  onMouseLeave={tooltipMouseLeave}
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
                  onMouseLeave={tooltipMouseLeave}
                  className="flex items-center h-full"
                >
                  <IoIosTimer className="ml-2" />
                </div>
              </Link>
              <div className="flex w-1/4 ">
                <MoreOptions
                  recordingListIsOpen={recordingListIsOpen}
                  id={`${recording.id}${recording.start}`}
                  isOpen={
                    openMoreOptionsId === `${recording.id}${recording.start}`
                  }
                  onToggle={(id) => {
                    setOpenMoreOptionsId(openMoreOptionsId === id ? null : id);
                  }}
                  className="flex items-center cursor-pointer mx-auto"
                  tooltip={{
                    mouseEnter: tooltipMouseEnter,
                    mouseLeave: tooltipMouseLeave,
                    text: "Options",
                  }}
                >
                  <div
                    onClick={async (e) => {
                      const currentTarget = e.currentTarget as HTMLElement;

                      if (recording.type !== "not-saved") {
                        return;
                      }

                      setSavingRecording(true);

                      const response = await saveRecordingAction(
                        recording,
                        userChannel,
                        session
                      );

                      if (response.ok && response.recording) {
                        tooltipMouseLeave({
                          ...e,
                          currentTarget,
                        });
                        setRecordingList((list) =>
                          list.map((r) => {
                            if (r === recording) {
                              r = response.recording as Recording;
                            }
                            return r;
                          })
                        );
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
                          extraGapY: 6,
                        }
                      )
                    }
                    onMouseLeave={tooltipMouseLeave}
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
                  {recording.type !== "not-saved" && (
                    <div
                      onClick={() => {
                        console.log("open modal");
                      }}
                      onMouseEnter={(e) =>
                        tooltipMouseEnter(e, "Change title", { extraGapY: 6 })
                      }
                      onMouseLeave={tooltipMouseLeave}
                      className="flex items-center hover:transition-colors hover:duration-300 hover:text-gray-300 cursor-pointer"
                    >
                      <MdOutlineDriveFileRenameOutline size={24} />
                    </div>
                  )}
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
                  {/* <div
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
                </div> */}
                  <Selector
                    multipleSelector={{
                      onToggle: handleToggleSelector,
                      id: "deleteSelector",
                      currentlyOpen: openSelectorId,
                    }}
                    tooltip={{
                      mouseEnter: tooltipMouseEnter,
                      mouseLeave: tooltipMouseLeave,
                    }}
                    chooseSelectedOption="delete"
                    callback={async (event, selected) => {
                      if (!selected) {
                        return;
                      }

                      const response = await deleteRecordingAction(
                        recording,
                        userChannel
                      );

                      if (response.ok) {
                        setRecordingList((list) =>
                          list.filter((item) => item !== recording)
                        );

                        tooltipMouseLeave(event);
                      } else {
                        showAlert(
                          response.message || "An error has occurred",
                          true
                        );
                      }
                    }}
                    options={[
                      {
                        value: "delete",
                        label: "Delete video",
                        icon: <MdDeleteForever size={24} />,
                      },
                    ]}
                  />
                  {recording.type !== "not-saved" && (
                    <Selector
                      multipleSelector={{
                        onToggle: handleToggleSelector,
                        id: "visibilitySector",
                        currentlyOpen: openSelectorId,
                      }}
                      tooltip={{
                        mouseEnter: tooltipMouseEnter,
                        mouseLeave: tooltipMouseLeave,
                      }}
                      chooseSelectedOption="public"
                      options={[
                        {
                          value: "public",
                          label: "Public video",
                          icon: <BiWorld size={24} />,
                        },
                        {
                          value: "allowlist",
                          label: "Allowlist",
                          icon: <IoList size={24} />,
                        },
                        {
                          value: "unlisted",
                          label: "Unlisted video",
                          icon: <IoLink size={24} />,
                        },
                        {
                          value: "Private",
                          label: "Private video",
                          icon: <RiLockFill size={24} />,
                        },
                      ]}
                      callback={(selectedOption) => {
                        console.log(selectedOption);
                      }}
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
    </>
  );
};
