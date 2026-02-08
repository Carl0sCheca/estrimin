"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

enum ThemeSettings {
  System = "system",
  Dark = "dark",
  Light = "light",
}

interface Props {
  className: string;
}

export const ThemeSwitch = ({ className }: Props) => {
  const { theme, setTheme } = useTheme();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <>
      {mounted && (
        <button
          className={className}
          onClick={() => {
            const currentSelected = Object.keys(ThemeSettings)
              .map((e) => e.toString().toLowerCase())
              .indexOf(theme || ThemeSettings.System.toString());

            setTheme(
              ThemeSettings[
                (Object.keys(ThemeSettings).at(
                  currentSelected + 1 >= Object.keys(ThemeSettings).length
                    ? 0
                    : currentSelected + 1,
                ) || "System") as keyof typeof ThemeSettings
              ],
            );
          }}
        >
          Current theme: {theme}
        </button>
      )}

      {!mounted && (
        <button
          className={`${className} animate-pulse h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-24 mb-4"`}
        ></button>
      )}
    </>
  );
};
