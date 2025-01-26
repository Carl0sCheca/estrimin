"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

enum ThemeSettings {
  System = "system",
  Dark = "dark",
  Light = "light",
}

export const ThemeSwitch = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <>
      {mounted && (
        <button
          onClick={() => {
            const currentSelected = Object.keys(ThemeSettings)
              .map((e) => e.toString().toLowerCase())
              .indexOf(theme || ThemeSettings.System.toString());

            setTheme(
              ThemeSettings[
                (Object.keys(ThemeSettings).at(
                  currentSelected + 1 >= Object.keys(ThemeSettings).length
                    ? 0
                    : currentSelected + 1
                ) || "System") as keyof typeof ThemeSettings
              ]
            );
          }}
        >
          Current theme: {theme}
        </button>
      )}

      {!mounted && <button></button>}
    </>
  );
};
