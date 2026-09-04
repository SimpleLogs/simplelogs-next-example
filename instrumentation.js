/**
 * Server tracing, started once per server instance.
 *
 * This is the other half of `instrumentation-client.js`. The browser sends a
 * `traceparent`; `withTrace()` in a route handler continues it. Both steps
 * need a real tracer and a context manager, and this is what installs them —
 * without it `withTrace()` still runs your function, but nothing installs a
 * context manager, so the span it opens is never active and no id can be read
 * back off it. The span itself is fine, and does carry the caller's ids; it is
 * simply unreachable, so the join silently produces nothing.
 *
 * The runtime check is not optional, though not for the reason usually given.
 * The edge runtime does have `AsyncLocalStorage` — Next polyfills it there and
 * lists it as such in its own edge API reference. What it does not have is
 * native Node APIs, and `@simplelogs/next/server` reaches them: `initOtel()`
 * pulls `@opentelemetry/sdk-trace-node`, the proto OTLP exporters over
 * `node:http`, and `@opentelemetry/instrumentation`. So this fails on an
 * import under edge rather than degrading.
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
  //
  // Those exclusions are a separate matter from the `serverExternalPackages`
  // entry already in `next.config.mjs`, which this app needs regardless: that
  // one is about `initOtel()` and `flushServer()` sharing a single module
  // instance, not about anything patching requires.
  initOtel({ instrumentations: [] });
}
