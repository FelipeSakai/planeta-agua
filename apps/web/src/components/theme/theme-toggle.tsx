"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

const storageKey = "planeta-agua-theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.localStorage.getItem(storageKey) === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const storedTheme = getStoredTheme();
    setTheme(storedTheme);
    applyTheme(storedTheme);
  }, []);

  function handleToggle() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem(storageKey, nextTheme);
    applyTheme(nextTheme);
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
