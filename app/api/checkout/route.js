import { serverLogger, flushServer } from "@simplelogs/next/server";

export async function POST() {
  // A unique key, not a timestamp. start() and end() are matched on `key` in a
  // process-wide map, so two requests landing in the same millisecond would
  // otherwise share one and cross each other's pairs.
  const key = `checkout-${crypto.randomUUID()}`;

  // No request argument anywhere below: next/headers gives the SDK a request
  // scope, so these pick up the browser's page, session and trace ids by
  // themselves.
  await serverLogger.start({ key, touchpoint: "checkout/submit" });

  try {
    await serverLogger.log({
      touchpoint: "checkout/submit",
      level: "info",
      message: "Checkout processed",
    });

    return Response.json({ ok: true });
  } finally {
    // In a `finally` so the timing still closes when the work above throws —
    // the failed request is the one you most want timed, and an unclosed start
    // records nothing at all.
    await serverLogger.end({ key });

    // Flush before returning, and await it.
    //
    // Entries are batched behind a short timer. Measured against a local
    // collector on `next build && next start`: with this line both entries are
    // at the collector by the time the response returns; without it there are
    // none at that moment and they arrive a few hundred milliseconds later,
    // once the timer fires.
    //
    // A long-lived server survives that gap, which is why this looks
    // unnecessary in development. A serverless function frozen the moment it
    // responds does not, and the batch is dropped with no error anywhere. On
    // Vercel the SDK flushes per entry by itself (it reads the VERCEL env
    // var), but that flush is not awaited either — so this is the line that
    // makes delivery certain rather than timing-dependent, on any platform.
    //
    // Safe in a `finally`: neither call rejects. The SDK catches send failures
    // inside the queue and re-queues the entries, so a throw here cannot
    // replace the response built in the `try`. Checked with the collector
    // pointed at a dead port — the route still answers 200 and nothing is
    // logged unhandled.
    //
    // The real cost is latency: the response now waits on a round trip to the
    // collector. That is the trade for not losing the data, and it is the
    // right one on a platform that can freeze you. On a long-lived server you
    // could drop this line and let the batch timer do it.
    await flushServer();
  }
}
