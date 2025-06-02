"use client";

import { useEffect, useState } from "react";

export const GoBackButton = () => {
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.history) {
      setCanGoBack(window.history.length > 1);
    }
  }, []);

  if (!canGoBack) {
    return <></>;
  }

  return (
    <button
      onClick={() => window.history.back()}
      className={
        "cursor-pointer select-none inline-flex text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-hidden focus:ring-primary-500 font-medium rounded-lg text-sm px-5 py-2.5 text-center my-4"
      }
    >
      Go back
    </button>
  );
};
