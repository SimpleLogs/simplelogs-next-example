import { serverLogger } from "@simplelogs/next/server";

export async function POST() {
  // No request argument anywhere below: next/headers gives the SDK a request
  // scope, so these pick up the browser's page, session and trace ids by
  // themselves.
  const key = `checkout-${Date.now()}`;
  await serverLogger.start({ key, touchpoint: "checkout/submit" });

  await serverLogger.log({
    touchpoint: "checkout/submit",
    level: "info",
    message: "Checkout processed",
  });

  await serverLogger.end({ key });

  return Response.json({ ok: true });
}
