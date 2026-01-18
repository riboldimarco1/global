export type Theme = "light" | "dark" | "system";
export type ColorScheme = "blue" | "green" | "purple" | "orange" | "rose" | "banesco" | "slate" | "midnight" | "emerald" | "amber" | "crimson" | "indigo" | "forest";

const THEME_KEY = "app-theme";
const COLOR_SCHEME_KEY = "app-color-scheme";

export const colorSchemes: { id: ColorScheme; name: string; color: string }[] = [
  { id: "blue", name: "Azul", color: "#2563eb" },
  { id: "green", name: "Verde", color: "#16a34a" },
  { id: "purple", name: "Morado", color: "#9333ea" },
  { id: "orange", name: "Naranja", color: "#ea580c" },
  { id: "rose", name: "Rosa", color: "#e11d48" },
  { id: "banesco", name: "Banesco", color: "#1B5E20" },
  { id: "slate", name: "Pizarra", color: "#475569" },
  { id: "midnight", name: "Medianoche", color: "#1e1b4b" },
  { id: "emerald", name: "Esmeralda", color: "#059669" },
  { id: "amber", name: "Ámbar", color: "#d97706" },
  { id: "crimson", name: "Carmesí", color: "#991b1b" },
  { id: "indigo", name: "Índigo", color: "#4f46e5" },
  { id: "forest", name: "Bosque", color: "#166534" },
];

export function getTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
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
  
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  } else {
    root.classList.toggle("dark", theme === "dark");
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
      document.documentElement.classList.toggle("dark", e.matches);
      const savedColorScheme = getColorScheme();
      applyColorScheme(savedColorScheme);
    }
  });
}
