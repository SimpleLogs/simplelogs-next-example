"use client";

import { useState } from "react";
import { useTimedCallback } from "@simplelogs/next";

export default function TimedCallbackDemo() {
  const [status, setStatus] = useState("Idle");

  const timedWork = useTimedCallback(
    async () => {
      await new Promise((r) => setTimeout(r, Math.random() * 800 + 200));
    },
    { touchpoint: "ui/timed-callback", key: "simulated-work" }
  );

  const handleClick = async () => {
    setStatus("Running…");
    try {
      await timedWork();
      setStatus("Done — duration logged");
    } catch {
      setStatus("Error logged");
    }
  };

  return (
    <div className="stack-sm">
      <button
        type="button"
        onClick={handleClick}
        className="sl-button sl-button-secondary"
      >
        Run Timed Callback
      </button>
      <p className="status-text" aria-live="polite">
        Status: {status}
      </p>
    </div>
  );
}
