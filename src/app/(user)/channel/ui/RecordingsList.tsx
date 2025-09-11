"use client";

import {
  changeRecordingTitle,
  changeRecordingVisibility,
  changeDefaultRecordingVisibilityAction,
  deleteRecordingAction,
  getRecordingsListAction,
  saveRecordingAction,
  storePastStreamsAction,
} from "@/actions";
import {
  Collapsible,
  Modal,
  ModalChangeTitle,
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
import { IoMdSave } from "react-icons/io";
import {
  MdDeleteForever,
  MdOutlineDriveFileRenameOutline,
} from "react-icons/md";
import { RiFileVideoLine, RiLiveLine, RiLockFill } from "react-icons/ri";
import { UserChannel } from "./channelSettingsForm";
import { IoLink, IoList } from "react-icons/io5";
import { BiWorld } from "react-icons/bi";
import { RecordingVisibility, UserSetting } from "@prisma/client";
import { FaCircle, FaRegClock } from "react-icons/fa";

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

  const [savingRecording, setSavingRecording] = useState<Array<string>>([]);

  const [visibilityUnsavedRecordings, setVisibilityUnsavedRecordings] =
    useState<RecordingVisibility>(
      (userSettings.find((e) => e.key === "VISIBILITY_UNSAVED_RECORDINGS")
        ?.value as RecordingVisibility) || RecordingVisibility.PRIVATE
    );

  const [storePastStreams, setStorePastStreams] = useState<boolean>(
    (userSettings.find((e) => e.key === "STORE_PAST_STREAMS")
      ?.value as boolean) ?? false
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

  const [changeTitleModalOpen, setChangeTitleModalOpen] = useState(false);
  const [changeTitleString, setChangeTitleString] = useState("");
  const [changeTitleRecordingId, setChangeTitleRecordingId] = useState("");

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
          Store past streams (deleted after 48 hours unless manually saved)
        </Toggle>
        <div>
          <label
            htmlFor="watchstreamstate"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-100"
          >
            Default visibility of unsaved streams:
          </label>
          <select
            defaultValue={visibilityUnsavedRecordings}
            onChange={async (e: ChangeEvent<HTMLElement>) => {
              const value = (e.target as HTMLSelectElement)
                .value as RecordingVisibility;

              const response = await changeDefaultRecordingVisibilityAction(
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
        <Modal
          isModalOpen={changeTitleModalOpen}
          setIsModalOpen={setChangeTitleModalOpen}
        >
          <ModalChangeTitle
            title={changeTitleString}
            setTitle={setChangeTitleString}
            acceptCallback={async () => {
              const response = await changeRecordingTitle(
                changeTitleRecordingId,
                changeTitleString
              );

              if (!response.ok) {
                showAlert(response.message || "Unexpected error", true);
              } else {
                showAlert("Title changed");
                setRecordingList((prevList) => {
                  return prevList.map((rec) => {
                    if (rec.id === changeTitleRecordingId) {
                      return { ...rec, title: changeTitleString };
                    }
                    return rec;
                  });
                });
              }

              setChangeTitleModalOpen(false);
              setChangeTitleRecordingId("");
            }}
            cancelCallback={() => {
              setChangeTitleModalOpen(false);
              setChangeTitleRecordingId("");
            }}
          />
        </Modal>
        {recordingList.map((recording) => {
          return (
            <div key={`${recording.id}${recording.start}`}>
              <div className="flex py-1 px-2 min-w-0">
                <Link
                  className="flex items-center w-3/5"
                  href={recording.url}
                  target="_blank"
                >
                  <div
                    onMouseEnter={(e) =>
                      tooltipMouseEnter(e, formatDate(recording.start, true))
                    }
                    onMouseLeave={tooltipMouseLeave}
                    className="flex items-center min-w-0 max-w-full"
                  >
                    <RiFileVideoLine className="mr-1.5 min-w-4 flex-shrink-0" />
                    <span title={recording.title} className="truncate min-w-0">
                      {recording.title || formatDate(recording.start)}
                    </span>
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
                    <FaRegClock className="ml-2" />
                  </div>
                  {(recording.type === "LIVE" ||
                    recording.type === "PROCESSING") && (
                    <div
                      onMouseEnter={(e) =>
                        tooltipMouseEnter(
                          e,
                          recording.type === "PROCESSING"
                            ? "Recording is being processed"
                            : "This recording is live now"
                        )
                      }
                      onMouseLeave={tooltipMouseLeave}
                      className="flex items-center h-full"
                    >
                      {recording.type === "LIVE" && (
                        <RiLiveLine className="ml-1" />
                      )}
                      {recording.type === "PROCESSING" && (
                        <FaCircle size={12} className="ml-1 text-red-500" />
                      )}
                    </div>
                  )}
                </Link>
                <div className="flex w-0.5/5 mx-3">
                  <MoreOptions
                    recordingListIsOpen={recordingListIsOpen}
                    id={`${recording.id}${recording.start}`}
                    isOpen={
                      openMoreOptionsId === `${recording.id}${recording.start}`
                    }
                    onToggle={(id) => {
                      setOpenMoreOptionsId(
                        openMoreOptionsId === id ? null : id
                      );
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

                        if (recording.type === "SAVED") {
                          return;
                        }

                        setSavingRecording((prev) =>
                          recording.id && !prev.includes(recording.id)
                            ? [...prev, recording.id]
                            : prev
                        );

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
                        } else {
                          showAlert(
                            response.message || "Unexpected error",
                            true
                          );
                        }

                        setSavingRecording((prev) =>
                          prev.filter((r) => r !== recording.id)
                        );
                      }}
                      onMouseEnter={(e) =>
                        tooltipMouseEnter(
                          e,
                          recording.type !== "SAVED"
                            ? "Keep stream forever"
                            : "This stream is saved",
                          {
                            extraGapY: 6,
                          }
                        )
                      }
                      onMouseLeave={tooltipMouseLeave}
                      className={`flex items-center hover:transition-colors hover:duration-300 ${
                        recording.type !== "SAVED"
                          ? "hover:text-green-400 cursor-pointer"
                          : "text-primary-500 cursor-default"
                      }`}
                    >
                      {savingRecording.includes(recording.id || "") ? (
                        <Spinner size={24} />
                      ) : (
                        <IoMdSave size={24} />
                      )}
                    </div>
                    {recording.type === "SAVED" && (
                      <div
                        onClick={() => {
                          setChangeTitleString(recording.title || "");
                          setChangeTitleRecordingId(recording.id || "");
                          setChangeTitleModalOpen(true);
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
                      chooseSelectedOption={recording.visibility}
                      options={[
                        {
                          value: RecordingVisibility.PUBLIC,
                          label: "Public video",
                          icon: <BiWorld size={24} />,
                        },
                        {
                          value: RecordingVisibility.ALLOWLIST,
                          label: "Allowlist",
                          icon: <IoList size={24} />,
                        },
                        {
                          value: RecordingVisibility.UNLISTED,
                          label: "Unlisted video",
                          icon: <IoLink size={24} />,
                        },
                        {
                          value: RecordingVisibility.PRIVATE,
                          label: "Private video",
                          icon: <RiLockFill size={24} />,
                        },
                      ]}
                      callback={async (_, option) => {
                        const response = await changeRecordingVisibility(
                          recording,
                          option?.value as RecordingVisibility
                        );

                        if (response.ok) {
                          showAlert("Changed recording visibility");
                        }
                      }}
                    />
                  </MoreOptions>
                </div>
                <div className="w-3/5 text-right">
                  {formatTimeAgo(recording.start)} {"ago"}
                </div>
              </div>
            </div>
          );
        })}
      </Collapsible>
    </>
  );
};
