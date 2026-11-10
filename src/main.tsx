import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyWaitingUpdateAtStart, registerServiceWorker } from "./pwa/serviceWorker";

// A waiting new version may only take over here, before anything is rendered.
applyWaitingUpdateAtStart().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
  registerServiceWorker();
});
