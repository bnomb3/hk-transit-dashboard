import { useEffect, useState } from "react";

const STORAGE_KEY = "transit_theme";
const THEMES = ["system", "light", "dark"];

function loadTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

// Keep in sync with the inline script in index.html, which applies the theme
// before first paint.
export function useTheme() {
  const [theme, setTheme] = useState(loadTheme);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage unavailable; the choice just won't persist.
    }

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved =
        theme === "system" ? (media?.matches ? "dark" : "light") : theme;
      document.documentElement.setAttribute("data-bs-theme", resolved);
    };
    apply();

    if (theme !== "system" || !media) return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  return [theme, setTheme];
}
