import { serverLogger, flushServer } from "@simplelogs/next/server";

export async function POST() {
  // A unique key, not a timestamp. start() and end() are matched on `key` in a
  // process-wide map, so two requests in the same millisecond would otherwise
  // share one and cross each other's pairs.
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

    // Entries are batched, and a serverless function can be frozen the moment
    // it responds. Neither call rejects, so this cannot fail the request.
    // "Flushing before the response" in the README has what it does and does
    // not guarantee, and what it costs.
    await flushServer();
  }
}
