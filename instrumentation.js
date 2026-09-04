/**
 * Server tracing, started once per server instance.
 *
 * This is the other half of `instrumentation-client.js`. The browser sends a
 * `traceparent`; `withTrace()` in a route handler continues it. Both steps
 * need a real tracer and a context manager, and this is what installs them —
 * without it `withTrace()` still runs your function, but the span it opens is
 * non-recording and carries no ids, so the join silently produces nothing.
 *
 * The runtime check is not optional: the edge runtime has no
 * `AsyncLocalStorage` from `node:async_hooks`, so calling this there fails on
 * an import rather than degrading.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { initOtel } = await import("@simplelogs/next/server");

  // `instrumentations: []` because this app continues the browser's trace
  // explicitly, in the one route handler that needs it. The automatic
  // alternative is `@opentelemetry/instrumentation-http`, which patches
  // `node:http` at require time through `require-in-the-middle` — worth the
  // extra dependency and the bundler exclusions it then needs when you have
  // many handlers, and not worth either when you have one.
  initOtel({ instrumentations: [] });
}
