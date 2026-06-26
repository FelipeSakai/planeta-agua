"use client";

import { useEffect, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

const storageKey = "planeta-agua-theme";
const themeChangeEvent = "planeta-agua-theme-change";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.localStorage.getItem(storageKey) === "dark" ? "dark" : "light";
}

function subscribeToTheme(onThemeChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === storageKey) {
      onThemeChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(themeChangeEvent, onThemeChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(themeChangeEvent, onThemeChange);
  };
}

function getServerTheme(): Theme {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getStoredTheme, getServerTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function handleToggle() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    window.localStorage.setItem(storageKey, nextTheme);
    window.dispatchEvent(new Event(themeChangeEvent));
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className="motion-reduce:transition-none"
      aria-label={`Tema ${theme === "dark" ? "escuro" : "claro"}. Alternar tema.`}
      onClick={handleToggle}
    >
      Tema: {theme === "dark" ? "Escuro" : "Claro"}
    </Button>
  );
}
