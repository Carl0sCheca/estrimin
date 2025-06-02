"use client";

import { useState } from "react";
import { FaInfoCircle } from "react-icons/fa";

type AlertNotificationState = {
  message: string;
  visible: boolean;
  error: boolean;
  timeout: NodeJS.Timeout | null;
};

interface AlertNotificationProps {
  state: AlertNotificationState;
}

export const useAlertNotification = () => {
  const [alertNotification, setAlertNotification] =
    useState<AlertNotificationState>({
      message: "",
      visible: false,
      timeout: null,
      error: false,
    } as AlertNotificationState);

  const showAlert = (message: string, error = false, duration = 2500) => {
    setAlertNotification({
      message,
      visible: true,
      error,
      timeout: null,
    });

    if (alertNotification.timeout) {
      clearTimeout(alertNotification.timeout);
    }

    const timeout = setTimeout(() => {
      setAlertNotification({
        message,
        visible: false,
        error,
        timeout: null,
      });
    }, duration);

    setAlertNotification((prevState) => ({
      ...prevState,
      timeout,
    }));
  };

  const hideAlert = () => {
    if (alertNotification.timeout) {
      clearTimeout(alertNotification.timeout);
    }
    setAlertNotification({
      message: "",
      visible: false,
      error: false,
      timeout: null,
    });
  };

  return { alertNotification, showAlert, hideAlert };
};

export const Notification = ({ state }: AlertNotificationProps) => {
  return (
    <div
      className={`transition-all duration-500 fixed inset-x-0 top-0 flex items-start justify-center z-50 px-6 py-12 lg:px-8 pointer-events-none  ${
        state.visible ? "visible opacity-100" : "invisible opacity-0 "
      } `}
    >
      <div
        className={`flex items-center text-white text-sm font-bold px-4 py-3 rounded-lg ${
          state.error ? "bg-red-500" : "bg-primary-500"
        }`}
        role="alert"
      >
        <FaInfoCircle className="fill-current w-4 h-4 mr-2" />
        <p>{state.message}</p>
      </div>
    </div>
  );
};
