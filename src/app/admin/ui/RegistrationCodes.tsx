"use client";

import {
  deleteRegistrationCodesAction,
  generateRegistrationCode,
  getRegistrationCodesAction,
} from "@/actions";
import { Collapsible, MouseEnterEventOptions } from "@/components";
import {
  GenerateRegistrationCodeRequest,
  RegistrationCodeDto,
} from "@/interfaces";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { BiSolidSend } from "react-icons/bi";
import { FaCheckSquare, FaMinusSquare, FaSquare } from "react-icons/fa";
import { ImInfinite } from "react-icons/im";
import { IoTrashBin } from "react-icons/io5";
import { RiClipboardFill } from "react-icons/ri";

interface Props {
  tooltip: {
    mouseEnter: (
      event: React.MouseEvent<HTMLElement>,
      text: string,
      options?: MouseEnterEventOptions,
    ) => void;
    mouseLeave: (event: React.MouseEvent<HTMLElement>) => void;
  };
  baseUrl: string;
}

export const RegistrationCodes = ({ tooltip, baseUrl }: Props) => {
  const queryClient = useQueryClient();

  const [expiresRegistrationCode, setExpiresRegistrationCode] = useState(false);
  const [expiresDate, setExpiresDate] = useState("");

  const [elementsWithTooltip, setElementsWithTooltip] = useState<
    Array<{ id: string; element: HTMLElement }>
  >([]);

  const { data: registrationCodes = [] } = useQuery({
    queryKey: ["admin", "registration", "codes"],
    queryFn: async () => {
      const regLinksResponse = await getRegistrationCodesAction();

      if (
        !regLinksResponse ||
        !regLinksResponse.ok ||
        !regLinksResponse.registrationCodes
      ) {
        return [];
      }

      return regLinksResponse.registrationCodes;
    },
    refetchInterval: 120000,
  });

  const generateMutation = useMutation({
    mutationFn: async (request: GenerateRegistrationCodeRequest) => {
      return await generateRegistrationCode(request);
    },
    onSuccess: (data) => {
      if (!data || !data.id) {
        return;
      }

      queryClient.setQueryData(
        ["admin", "registration", "codes"],
        (oldData: RegistrationCodeDto[]) => [
          ...(oldData || []),
          {
            id: data.id as string,
            expirationDate: data.expirationDate || null,
            used: false,
            createdAt: new Date(),
            user: null,
          },
        ],
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (codeId: string) => {
      return await deleteRegistrationCodesAction(codeId);
    },
    onSuccess: (deleteResponse, codeId) => {
      if (!deleteResponse) {
        return;
      }

      queryClient.setQueryData(
        ["admin", "registration", "codes"],
        (oldData: RegistrationCodeDto[]) =>
          (oldData || []).filter((code) => code.id !== codeId),
      );

      const tooltipsToDelete = elementsWithTooltip.filter(
        (e) => e.id === codeId,
      );

      tooltipsToDelete.forEach((toDelete) => {
        tooltip.mouseLeave({
          currentTarget: toDelete.element,
        } as React.MouseEvent<HTMLElement>);
      });

      setElementsWithTooltip((prevState) =>
        prevState.filter((e) => e.id !== codeId),
      );
    },
  });

  const addCurrentTargetToList = (e: React.MouseEvent, id: string) => {
    const currentTarget = e.currentTarget;

    if (!currentTarget) {
      return;
    }

    setElementsWithTooltip((prevState) => {
      if (
        !prevState.some(
          (element) =>
            element.id === id &&
            element.element === (currentTarget as HTMLElement),
        )
      ) {
        prevState.push({ id, element: currentTarget as HTMLElement });
      }

      return [...prevState];
    });
  };

  return (
    <>
      <Collapsible title="Registration codes">
        <div className="mb-6 overflow-y-hidden">
          <div className="text-sm font-medium">Generate registration link</div>
          <div className="flex justify-between min-h-12.5">
            <div className="flex space-x-5">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  onChange={async () => {
                    setExpiresRegistrationCode(!expiresRegistrationCode);

                    if (!expiresDate) {
                      setExpiresDate(new Date().toJSON().slice(0, 10));
                    }
                  }}
                  checked={expiresRegistrationCode}
                  name="expires"
                  className="sr-only peer"
                />
                <div className="pr-2 select-none">Expires?</div>
                <div
                  className={`relative w-11 h-6 bg-gray-200 peer-focus:outline-hidden peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:rtl:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:inset-s-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600`}
                ></div>
              </label>
              <input
                className={`text-black rounded ${
                  expiresRegistrationCode ? "" : "hidden"
                }`}
                type="date"
                id="expirationDate"
                value={expiresDate}
                onChange={(event) => setExpiresDate(event.target.value)}
                min={new Date().toJSON().slice(0, 10)}
              />
            </div>
            <button
              className="flex justify-center items-center p-2 w-10 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress rounded-md text-white shadow-xs ring-0 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
              onMouseEnter={(e) => tooltip.mouseEnter(e, "Generate link")}
              onMouseLeave={tooltip.mouseLeave}
              onClick={async () => {
                const request: GenerateRegistrationCodeRequest = {};
                if (expiresRegistrationCode) {
                  request.expirationDate = new Date(expiresDate);
                }

                generateMutation.mutate(request);
              }}
            >
              <div className="py-1.5 text-lg">
                <BiSolidSend />
              </div>
            </button>
          </div>
        </div>
        {registrationCodes.map((registrationCode) => (
          <div
            key={registrationCode.id}
            className="flex justify-between my-2 dark:hover:bg-slate-300 dark:bg-slate-500 bg-slate-300 hover:bg-slate-500 rounded-sm"
          >
            <button
              className="group m-2 w-1/2 flex justify-center items-center bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress rounded-md text-white shadow-xs ring-0 ring-inset ring-gray-300 sm:leading-6"
              onMouseEnter={(e) => {
                tooltip.mouseEnter(e, "Copy URL");
                addCurrentTargetToList(e, registrationCode.id);
              }}
              onMouseLeave={tooltip.mouseLeave}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${baseUrl}/register/${registrationCode.id}`,
                  );
                } catch {}
              }}
            >
              <div className="py-1.5 text-lg">
                <RiClipboardFill />
              </div>
            </button>
            <div className="flex cursor-default m-2 w-full justify-center items-center p-2 bg-primary-600 disabled:bg-primary-700 disabled:cursor-progress rounded-md text-white shadow-xs ring-0 ring-inset ring-gray-300 sm:leading-6">
              {registrationCode.expirationDate ? (
                registrationCode.expirationDate.toJSON().slice(0, 10)
              ) : (
                <ImInfinite />
              )}
            </div>
            <button
              className="flex cursor-default m-2 w-1/2 justify-center items-center bg-primary-600 disabled:bg-primary-700 disabled:cursor-progress rounded-md text-white shadow-xs ring-0 ring-inset ring-gray-300 sm:leading-6"
              onMouseEnter={(e) => {
                addCurrentTargetToList(e, registrationCode.id);

                tooltip.mouseEnter(
                  e,
                  registrationCode.expirationDate &&
                    new Date(new Date().toJSON().slice(0, 10)) >
                      registrationCode.expirationDate
                    ? "Expired"
                    : registrationCode.used
                      ? `Used by ${registrationCode.user!.name}`
                      : "Not used",
                );
              }}
              onMouseLeave={tooltip.mouseLeave}
            >
              {registrationCode.expirationDate &&
              new Date(new Date().toJSON().slice(0, 10)) >
                registrationCode.expirationDate ? (
                <FaMinusSquare />
              ) : registrationCode.used ? (
                <FaCheckSquare />
              ) : (
                <FaSquare />
              )}
            </button>
            <button
              className="flex m-2 w-1/2 justify-center items-center text-lg bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress rounded-md text-white shadow-xs ring-0 ring-inset ring-gray-300 sm:leading-6"
              onMouseEnter={(e) => {
                addCurrentTargetToList(e, registrationCode.id);
                tooltip.mouseEnter(e, "Delete ");
              }}
              onMouseLeave={tooltip.mouseLeave}
              onClick={async () => {
                deleteMutation.mutate(registrationCode.id);
              }}
            >
              <IoTrashBin />
            </button>
          </div>
        ))}
      </Collapsible>
    </>
  );
};
