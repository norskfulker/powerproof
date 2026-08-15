import "./index.css";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { registerPwaServiceWorker } from "@/lib/pwa";

registerPwaServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
