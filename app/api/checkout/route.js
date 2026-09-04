import { headers } from "next/headers";
import {
  serverLogger,
  flushServer,
  withTrace,
  currentTraceIds,
  isOtelStarted,
  otel,
} from "@simplelogs/next/server";

export async function POST() {
  // A unique key, not a timestamp. start() and end() are matched on `key` in a
  // process-wide map, so two requests in the same millisecond would otherwise
  // share one and cross each other's pairs.
  const key = `checkout-${crypto.randomUUID()}`;

  // The browser sends its trace as a W3C `traceparent`. Handing the whole
  // header set to `withTrace` as a `carrier` is what continues it, so the work
  // below lands inside the page's trace rather than opening one of its own.
  //
  // Page and session ids need none of this — `next/headers` gives the SDK a
  // request scope, so `serverLogger` picks those up by itself. The trace is
  // the one piece that travels through OpenTelemetry's context rather than
  // through the SDK's own correlation, which is why it is passed explicitly.
  const inbound = await headers();

  // The trace id the caller claims, if any. `traceparent` is
  // `version-traceid-spanid-flags`, so field 1 is the trace.
  //
  // Kept separate from "did we join it", because those are different
  // questions and only the second one is worth printing. A header can arrive
  // and still not be continued — if `initOtel()` is missing the span opened
  // below is non-recording and carries no ids at all, and if the header is
  // malformed extraction fails and a fresh root opens instead. Both look
  // exactly like success to anything that only asks whether the header was
  // there.
  const sawTraceparent = inbound.has("traceparent");
  const inboundTraceId = inbound.get("traceparent")?.split("-")[1];

  let response;
  try {
    response = await withTrace(
      async () => {
        await serverLogger.start({ key, touchpoint: "checkout/submit" });

        try {
          await serverLogger.log({
            touchpoint: "checkout/submit",
            level: "info",
            message: "Checkout processed",
          });

          // Read inside the scope, where the span is active — outside it this
          // is empty. Comparing it against what arrived is the only check that
          // distinguishes a trace this request CONTINUED from one it merely
          // opened, and it is false for every way the wiring can be wrong: a
          // missing `initOtel()` leaves `traceId` undefined, a malformed header
          // leaves a fresh id, and a broken `carrier` leaves the same.
          // `?? {}` is belt-and-braces: 2.0.0's `currentTraceIds()` already
          // returns `{}` when nothing is active. The line this replaced spread
          // the call directly, which tolerated `undefined`; a property read does
          // not, and a 500 here would replace the diagnosis with a bare
          // "failed" — the one outcome this code exists to prevent.
          const ids = currentTraceIds() ?? {};
          const joined = Boolean(inboundTraceId) && ids.traceId === inboundTraceId;

          // Whether this span will be EXPORTED, which is a different question
          // from whether it joined, and read off the span context rather than
          // worked out from the caller's flags byte — because the server gets
          // a say that the inbound header cannot show. A sampler set through
          // `OTEL_TRACES_SAMPLER` can drop a trace the caller marked keep, and
          // this file never sees it. (There is no sampler option on
          // `initOtel()` to worry about alongside it: it takes
          // `instrumentations`, `metricExportIntervalMs` and `diagnostics`,
          // and hands the provider none of them as a sampler.)
          //
          // The SAMPLED flag is the predicate the exporter itself applies —
          // `BatchSpanProcessor` drops any span whose flag is clear, before
          // anything else looks at it. `isRecording()` sits next to this and
          // answers a different question: it is `_ended === false`, so it is
          // liveness, and it only tracks sampling because a NOT_RECORD
          // decision hands back a non-recording span. A RECORD-without-SAMPLED
          // decision gets a live span that is still never exported, and would
          // read `true` here under a field named `sampled`.
          //
          // With no tracer started there is no active span at all, so nothing
          // is read and the `?? 0` answers instead: not observed, reported as
          // not kept. `otelStarted` and a missing `traceId` are what separate
          // that from a decision actually taken.
          //
          // Worth reporting because a caller sending `traceparent` flags `00`
          // gets a span carrying its trace id that is never exported, and that
          // is the one state where every other field here says success.
          //
          // `otel` is `@opentelemetry/api`, re-exported by the SDK, so reading
          // this costs no dependency of its own.
          const spanContext = otel.trace.getActiveSpan()?.spanContext();
          const sampled =
            ((spanContext?.traceFlags ?? 0) & otel.TraceFlags.SAMPLED) !== 0;

          // Reported back so the page can show what happened instead of
          // claiming it. Not secret: `traceId` is the value the browser itself
          // put in the `traceparent` header on this request.
          //
          // `otelStarted` is the fourth condition, and the only one the other
          // three fields cannot see. It is `false` when this handler is a
          // different module instance from the one `instrumentation.js`
          // started — traces still join, and the flush below silently does
          // nothing. See `serverExternalPackages` in `next.config.mjs`.
          return Response.json({
            ok: true,
            joined,
            sawTraceparent,
            sampled,
            otelStarted: isOtelStarted(),
            ...ids,
          });
        } finally {
          // In a `finally` so the timing still closes when the work above throws
          // — the failed request is the one you most want timed, and an unclosed
          // start records nothing at all.
          await serverLogger.end({ key });
        }
      },
      { name: "checkout/submit", carrier: inbound },
    );
  } finally {
    // OUTSIDE `withTrace` but inside a `finally`, and both halves of that are
    // load-bearing.
    //
    // Entries and this handler's span are both batched, and a serverless
    // function can be frozen the moment it responds. `flushServer()` covers
    // both — it is `Promise.all([serverQueue.flush(), flushOtel()])` — but
    // only for what has already reached them, and a span reaches the
    // `BatchSpanProcessor` on `onEnd`. `withTrace` ends its span after the
    // callback settles, which is what makes it time the callback at all. So a
    // flush INSIDE that callback runs while this request's span is still open,
    // and sweeps up everything except it.
    //
    // Measured against a local collector, naming the span uniquely so the
    // export carrying it could be identified:
    //
    //   flush inside   span exported 5.0s AFTER the response, on the batch timer
    //   flush here     span exported 39ms BEFORE the response
    //
    // Invisible on `next start`, which keeps running either way. On a platform
    // that freezes at the response, the first is the trace this route exists
    // to demonstrate, lost with no error.
    //
    // The `finally` is what keeps the failed request covered. `withTrace`
    // re-throws after ending its span, so a throw from the callback would
    // otherwise skip this line entirely — and a failed checkout is the one you
    // most want a timing and a trace for. The span has still ended by the time
    // this runs, on the rejection path too.
    //
    // The other half of making the flush work at all is `serverExternalPackages`
    // in `next.config.mjs` — see the note there.
    //
    // `flushServer()` does not reject, so nothing here can replace the
    // response built above or mask an error on its way out. Worth being
    // precise about that now it covers two things: the entries queue catches
    // its own send failures, and `flushOtel()` wraps each provider's
    // `forceFlush()` in its own `.catch(() => {})`. That second half matters
    // because `BatchSpanProcessor.forceFlush()` DOES reject, on an export
    // failure or an export timeout — without the SDK's catch, an unreachable
    // collector would 500 a checkout that worked, from inside a `finally`.
    //
    // "Flushing before the response" in the README has what this does and does
    // not guarantee, and what it costs.
    await flushServer();
  }

  return response;
}
