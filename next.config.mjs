/** @type {import("next").NextConfig} */
export default {
  // `@simplelogs/node` holds the OpenTelemetry providers `initOtel()` starts in
  // module-level state. Bundled, `instrumentation.js` and a route handler get
  // SEPARATE copies of that module — so `initOtel()` starts the providers in
  // one copy and `flushServer()` in the handler finds `started === null` and
  // force-flushes nothing.
  //
  // Nothing looks wrong when that happens, which is what makes it worth an
  // entry here. `withTrace()` keeps working, because it resolves its tracer
  // through `@opentelemetry/api`'s GLOBAL provider rather than that module
  // state — so traces still join correctly and only the flush is silently
  // inert. Measured with a probe route: `isOtelStarted()` returned `false`
  // inside the handler while the same request reported a correctly joined
  // trace.
  //
  // Externalising it gives both a single `require`d instance. Verified against
  // a local collector: the handler's span is then exported before the response
  // returns rather than 5s later on the batch timer.
  // Declared in package.json for this reason, not only for the import in the
  // route: externalising turns the bundled import into a runtime
  // `require("@simplelogs/node")` resolved from `.next/server/` by walking up
  // to `node_modules`. Under npm's hoisting that works whether or not the app
  // declares it; under a non-hoisted layout it does not — the same hazard
  // `instrumentation-client.js` avoids by importing from `@simplelogs/next/otel`
  // rather than reaching through to `@simplelogs/browser`.
  serverExternalPackages: ["@simplelogs/node"],
};
