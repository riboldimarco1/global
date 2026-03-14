import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initTheme } from "./lib/theme";

initTheme();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((reg) => reg.unregister());
    }).then(() => {
      if ("caches" in window) {
        caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
      }
      return navigator.serviceWorker.register("/sw.js");
    }).then((registration) => {
      console.log("SW registered:", registration.scope);
      registration.update();
    }).catch((error) => {
      console.log("SW registration failed:", error);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
