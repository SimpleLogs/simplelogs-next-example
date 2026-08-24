"use client";

import { useState } from "react";
import { useSimpleLogs } from "@simplelogs/next";

export default function CheckoutButton() {
  const [status, setStatus] = useState("ready");
  const logger = useSimpleLogs();

  async function checkout() {
    logger.log({ touchpoint: "checkout/click", level: "info" });

    // The SDK patches fetch to forward page, session and trace headers on
    // same-origin requests, so the route handler's own logs join this page's
    // trace without either side passing an id explicitly.
    //
    // Guarded because a rejected fetch — server down, offline — would
    // otherwise leave the box reading "ready", making a failed checkout look
    // identical to never having clicked.
    let ok = false;
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      ok = res.ok;
    } catch {
      ok = false;
    }

    setStatus(ok ? "checkout ok — client and server share one trace" : "failed");
  }

  return (
    <>
      <button onClick={checkout} style={{ font: "inherit", padding: "0.5rem 1rem", cursor: "pointer" }}>
        Run checkout
      </button>
      <pre style={{ background: "#f4f4f5", padding: "1rem", borderRadius: 6, overflowX: "auto" }}>{status}</pre>
    </>
  );
}
