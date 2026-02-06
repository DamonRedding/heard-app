import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initPostHog } from "./lib/posthog";
import { initNativePlugins } from "./lib/capacitor";

initPostHog();
initNativePlugins();

createRoot(document.getElementById("root")!).render(<App />);
