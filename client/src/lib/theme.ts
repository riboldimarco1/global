export type Theme = "light" | "dark" | "system";

const THEME_KEY = "app-theme";

export function getTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
}

export function initTheme(): void {
  const theme = getTheme();
  applyTheme(theme);
  
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (getTheme() === "system") {
      document.documentElement.classList.toggle("dark", e.matches);
    }
  });
}
