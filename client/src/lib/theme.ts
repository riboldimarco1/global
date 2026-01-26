export type Theme = "light" | "medium" | "dark" | "system";
export type ColorScheme = "blue" | "green" | "purple" | "orange" | "rose" | "banesco" | "lightblue";

const THEME_KEY = "app-theme";
const COLOR_SCHEME_KEY = "app-color-scheme";

export const colorSchemes: { id: ColorScheme; name: string; color: string }[] = [
  { id: "blue", name: "Azul", color: "#2563eb" },
  { id: "lightblue", name: "Azul Claro", color: "#38bdf8" },
  { id: "green", name: "Verde", color: "#16a34a" },
  { id: "purple", name: "Morado", color: "#9333ea" },
  { id: "orange", name: "Naranja", color: "#ea580c" },
  { id: "rose", name: "Rosa", color: "#e11d48" },
  { id: "banesco", name: "Banesco", color: "#1B5E20" },
];

export function getTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "medium" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export function getColorScheme(): ColorScheme {
  const stored = localStorage.getItem(COLOR_SCHEME_KEY);
  if (colorSchemes.some(c => c.id === stored)) {
    return stored as ColorScheme;
  }
  return "blue";
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function setColorScheme(scheme: ColorScheme): void {
  localStorage.setItem(COLOR_SCHEME_KEY, scheme);
  applyColorScheme(scheme);
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.remove("light", "medium", "dark");
  
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.add(prefersDark ? "dark" : "light");
  } else {
    root.classList.add(theme);
  }
}

export function applyColorScheme(scheme: ColorScheme): void {
  const root = document.documentElement;
  colorSchemes.forEach(c => root.classList.remove(`theme-${c.id}`));
  root.classList.add(`theme-${scheme}`);
}

export function initTheme(): void {
  const theme = getTheme();
  const colorScheme = getColorScheme();
  applyTheme(theme);
  applyColorScheme(colorScheme);
  
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (getTheme() === "system") {
      const root = document.documentElement;
      root.classList.remove("light", "medium", "dark");
      root.classList.add(e.matches ? "dark" : "light");
      const savedColorScheme = getColorScheme();
      applyColorScheme(savedColorScheme);
    }
  });
}
