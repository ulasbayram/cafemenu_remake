"use client";
import { useEffect, useState } from "react";

export function useMenuTheme(defaultTheme?: "light" | "dark" | null) {
  const [theme, setTheme] = useState<"light" | "dark">(defaultTheme || "light");
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      let saved;
      try {
        saved = localStorage.getItem("fincan-menu-theme");
      } catch {}
      setTheme(
        saved === "dark" || saved === "light"
          ? saved
          : (defaultTheme ?? (media.matches ? "dark" : "light")),
      );
    };
    apply();
    media.addEventListener("change", apply);
    window.addEventListener("storage", apply);
    return () => {
      media.removeEventListener("change", apply);
      window.removeEventListener("storage", apply);
    };
  }, [defaultTheme]);
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("fincan-menu-theme", next);
    } catch {}
  }
  return { theme, toggleTheme };
}
