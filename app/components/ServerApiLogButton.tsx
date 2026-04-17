"use client";

import { useState } from "react";

export default function ServerApiLogButton() {
  const [status, setStatus] = useState<string>("Idle");

  const onClick = async () => {
    setStatus("Sending request...");

    try {
      const response = await fetch("/api/log-demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          touchpoint: "api_demo",
          key: "client_triggered_api_log",
        }),
      });

      if (!response.ok) {
        setStatus(`Request failed (${response.status})`);
        return;
      }

      const payload = (await response.json()) as { message?: string };
      setStatus(payload.message ?? "Request completed.");
    } catch {
      setStatus("Request failed due to a network error.");
    }
  };

  return (
    <div className="stack-sm">
      <button
        type="button"
        onClick={onClick}
        className="sl-button sl-button-primary"
      >
        Send Request: API Route Server Log
      </button>
      <p className="status-text" aria-live="polite">
        Status: {status}
      </p>
    </div>
  );
}
