"use client";

import { useState } from "react";
import { useSimpleLogs } from "@simplelogs/next";

export default function CheckoutButton() {
  const [status, setStatus] = useState("ready");
  const logger = useSimpleLogs();

  async function checkout() {
    logger.log({ touchpoint: "checkout/click", level: "info" });

    // Covers the request window, which is not short: the handler flushes its
    // telemetry before responding, and that flush waits on the export — 8.2s
    // against a collector that is not answering, per "What it costs" in the
    // README. Without this the box reads "ready" throughout, which is what it
    // says before anyone clicks at all, so a slow checkout is indistinguishable
    // from an ignored one. (It fooled me while verifying this branch.)
    setStatus("checking…");

    // Guarded, and both failure branches log. A rejected fetch — server down,
    // offline — would otherwise strand the box on "checking…" above, making a
    // failed checkout look like one still in flight, which the 8.2s window
    // makes entirely plausible; and catching that rejection to fix the box
    // would remove the unhandled rejection the SDK had been capturing for
    // free. A visible "failed" with no entry behind it is the worst outcome
    // for an example about logging.
    let result = null;
    try {
      // The SDK patches fetch to put the page and session ids on same-origin
      // requests, and — once `instrumentation-client.js` has started browser
      // tracing — a W3C `traceparent` alongside them. So the route handler's
      // own logs join this page's trace without either side passing an id
      // explicitly. Without that file the ids still travel and the trace does
      // not; see "Correlation across the client/server boundary" in the README.
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
      return;
    }

    // Joined is not the whole story: the trace can be correct and undeliverable
    // at the same time. `otelStarted` is false when this handler is a different
    // module instance from the one that started tracing, which leaves the flush
    // before the response inert — invisible here, and lost on a host that
    // freezes at the response.
    if (result.joined) {
      // Joined is still not the whole story. The span can carry the right
      // trace id and never be exported, because something decided not to keep
      // it — the caller, by sending `traceparent` flags `00`, or a sampler on
      // the server. Every other field here reports success, so this is the one
      // state the box would otherwise call clean while nothing reaches the
      // collector.
      //
      // Which of the two decided is deliberately not claimed. `sampled` is the
      // server reporting the decision it ended up with, and a server-side
      // sampler can drop a trace the caller marked keep; naming the caller
      // here would be right in the common case and wrong in that one.
      //
      // The consequence is scoped to the SERVER's span for the same reason.
      // Under a server-side sampler the browser's root span for this trace id
      // was exported normally and only the handler's half is missing — so
      // "nothing to find at the collector" would send someone away from
      // exactly the half-a-trace that is hardest to diagnose.
      //
      // `otelStarted` prints whether or not the span is being kept. It is not
      // a per-request outcome: it is the missing `serverExternalPackages`
      // entry, a standing fault on every request. Suppressing it on unsampled
      // requests would mean that under a ratio sampler the sampling decision,
      // not the fault, decided whether the box mentioned it — hiding it on
      // most clicks. What it must not do is promise the batch timer, which is
      // true only of a span that reached the buffer.
      setStatus(
        `checkout ok — client and server share trace ${result.traceId}` +
          (result.sampled
            ? ""
            : "\nBut this trace is not being kept: a sampling decision — the caller's " +
              "traceparent flags, or a sampler on the server — left the server's span " +
              "unexported. That is a choice rather than a fault: the span will not be " +
              "under this id at the collector, though anything the browser exported " +
              "for it still is.") +
          (result.otelStarted
            ? ""
            : result.sampled
              ? "\nBut the server cannot flush that trace before it responds: tracing " +
                "is not started in this handler's module instance, so the span goes out " +
                "on the batch timer, or not at all on a host that freezes. See " +
                "serverExternalPackages in next.config.mjs."
              : "\nSeparately, server tracing is not started in this handler's module " +
                "instance, so the flush before the response does nothing for any " +
                "request — including the ones that are being kept. See " +
                "serverExternalPackages in next.config.mjs."),
      );
      return;
    }

    // Describes what the server ended up with, and nothing more — the cause
    // belongs to the branches below. No id at all means server tracing never
    // started: with no tracer nothing installs a context manager, so no span
    // is active and there are no ids to read. Being unsampled does not do
    // this — a span dropped by the sampler still carries its ids, which is
    // exactly the flags `00` row, where the caller's trace id comes back.
    const recorded = result.traceId ? `trace ${result.traceId}` : "no trace at all";

    // Reachable here too, and easy to miss: a server-side sampler drops the
    // fresh root the same way it drops a joined trace, so the branches below
    // can name a trace id that nothing will ever export. Gated on there being
    // an id: with no trace at all `sampled` is false because nothing was
    // observed, which the `!sawTraceparent` branch already attributes and the
    // other branch lists among its candidates.
    const notKept =
      result.traceId && !result.sampled
        ? "\nWhatever the cause above, that trace is not being kept: a sampler dropped " +
          "it, so nothing reaches the collector under that id."
        : "";

    // A second fault worth naming on its own, for the same reason as the
    // both-missing case below: leaving it implicit means fixing one thing and
    // coming back for the other. Only when there IS a trace AND it is being
    // kept — an unsampled span never enters the batch buffer, so "it will go
    // out late instead of now" would be false, and printed next to `notKept`
    // it would contradict it outright.
    const undeliverable =
      result.traceId && result.sampled && !result.otelStarted
        ? "\nThe server also cannot flush what it did record: tracing is not started " +
          "in this handler's module instance. See serverExternalPackages in " +
          "next.config.mjs."
        : "";

    if (!result.sawTraceparent) {
      // The browser is the missing piece here. When the server also recorded
      // nothing, that is a second missing piece rather than a consequence of
      // the first, so it is named separately.
      setStatus(
        `checkout ok — but no traceparent reached the server, which recorded ${recorded}.\n` +
          "Nothing sent one: browser tracing is not running " +
          "(instrumentation-client.js), or something between here and the " +
          "handler stripped the header." +
          (result.traceId
            ? ""
            : "\nServer tracing is not running either (instrumentation.js).") +
          notKept +
          undeliverable,
      );
    } else {
      // Narrowed the same way the sibling branch above narrows, and on the
      // same signal: only a missing `initOtel()` leaves NO id — a malformed
      // header and a broken `carrier` both leave a fresh one. So an absent
      // `traceId` identifies the first cause outright and rules the other two
      // out, and listing all three would be broader than the evidence.
      setStatus(
        `checkout ok — but the server did not continue this page's trace; it recorded ${recorded}.\n` +
          (result.traceId
            ? "A traceparent arrived and was not joined. Either the traceparent " +
              "that arrived was malformed, or the handler is not passing the " +
              "headers to withTrace."
            : "A traceparent arrived and the server recorded nothing at all, so " +
              "server tracing is not running (instrumentation.js).") +
          notKept +
          undeliverable,
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
