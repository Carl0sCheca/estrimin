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

  const [selected, setSelected] = useState(0);

  useEffect(() => {
    setMounted(true);

    setSelected(
      Object.keys(ThemeSettings)
        .map((e) => e.valueOf())
        .indexOf(theme as string)
    );
  }, [theme]);

  return (
    <>
      {mounted && (
        <button
          onClick={() => {
            setSelected(
              selected + 1 >= Object.keys(ThemeSettings).length
                ? 0
                : selected + 1
            );
            setTheme(
              ThemeSettings[
                (Object.keys(ThemeSettings).at(selected) ||
                  "System") as keyof typeof ThemeSettings
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
