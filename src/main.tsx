import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

// Silence console.logs in production (security + performance)
if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
  // Keep console.warn and console.error for critical issues
}

// Initialize Sentry for error monitoring
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    enabled: import.meta.env.PROD, // Only send errors in production
    integrations: [
      Sentry.browserTracingIntegration(),
      // Replay disabled: captures PII (patient CPF, medical history) on screen
    ],
    // Performance Monitoring
    tracesSampleRate: 0.1, // Capture 10% of transactions
    // Session Replay — DISABLED for PII protection (LGPD)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

createRoot(document.getElementById("root")!).render(<App />);
