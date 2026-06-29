"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`btn-anilist-primary inline-flex items-center justify-center gap-1.5 rounded px-3 py-2 text-xs font-semibold ${className}`}
      title={isLight ? "Dunkles Theme" : "Helles Theme"}
      aria-label={isLight ? "Dunkles Theme aktivieren" : "Helles Theme aktivieren"}
    >
      {isLight ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">{isLight ? "Dunkel" : "Hell"}</span>
    </button>
  );
}
