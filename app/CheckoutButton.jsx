"use client";

import { useState } from "react";
import { useSimpleLogs } from "@simplelogs/next";

export default function CheckoutButton() {
  const [status, setStatus] = useState("ready");
  const logger = useSimpleLogs();

  async function checkout() {
    logger.log({ touchpoint: "checkout/click", level: "info" });

    // The SDK patches fetch to put the page and session ids on same-origin
    // requests, and — once `instrumentation-client.js` has started browser
    // tracing — a W3C `traceparent` alongside them. So the route handler's own
    // logs join this page's trace without either side passing an id
    // explicitly. Without that file the ids still travel and the trace does
    // not; see "Correlation across the client/server boundary" in the README.
    //
    // Guarded, and both failure branches log. A rejected fetch — server down,
    // offline — would otherwise leave the box reading "ready", making a failed
    // checkout look identical to never having clicked; and catching that
    // rejection to fix the box would remove the unhandled rejection the SDK
    // had been capturing for free. A visible "failed" with no entry behind it
    // is the worst outcome for an example about logging.
    let result = null;
    try {
      const res = await fetch("/api/checkout", { method: "POST" });

      if (res.ok) {
        result = await res.json();
      } else {
        logger.log({
          touchpoint: "checkout/click",
          level: "error",
          message: `Checkout failed: HTTP ${res.status}`,
        });
      }
    } catch (error) {
      logger.log({
        touchpoint: "checkout/click",
        level: "error",
        message: `Checkout request failed: ${error.message}`,
      });
    }

    // Reports what the handler saw rather than asserting the good case. The
    // whole point of this example is a trace that spans both sides, and that
    // is exactly the thing an SDK upgrade can switch off without any error —
    // so a box that always reads "share one trace" would be the last place
    // you would notice.
    //
    // `joined` is the handler comparing the trace it ended up in against the
    // one this request carried, not merely noticing a header. The two
    // not-joined branches are split because they have different causes and
    // send you to different files.
    if (!result) {
      setStatus("failed");
    } else if (result.joined) {
      setStatus(`checkout ok — client and server share trace ${result.traceId}`);
    } else if (!result.sawTraceparent) {
      setStatus(
        `checkout ok — but no traceparent reached the server, so it opened its own trace (${result.traceId}).\n` +
          "Nothing sent one: browser tracing is not running (instrumentation-client.js), " +
          "or something between here and the handler stripped the header.",
      );
    } else {
      setStatus(
        `checkout ok — but the server did not continue this page's trace (it used ${result.traceId ?? "no trace at all"}).\n` +
          "A traceparent arrived and was not joined: server tracing is not running " +
          "(instrumentation.js), or the handler is not passing the headers to withTrace.",
      );
    }
  }

  return (
    <>
      <button onClick={checkout} style={{ font: "inherit", padding: "0.5rem 1rem", cursor: "pointer" }}>
        Run checkout
      </button>
      <pre style={{ background: "#f4f4f5", padding: "1rem", borderRadius: 6, overflowX: "auto", whiteSpace: "pre-wrap" }}>{status}</pre>
    </>
  );
}
