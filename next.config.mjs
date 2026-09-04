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
  // Declared in package.json because of THIS entry, not because anything here
  // imports it — nothing does; the route and `instrumentation.js` both go
  // through `@simplelogs/next/server`. Externalising turns the bundled import
  // inside that package into a runtime `require("@simplelogs/node")`, resolved
  // from `.next/server/` by walking up to `node_modules`. Under npm's hoisting
  // that works whether or not the app declares it; under a non-hoisted layout
  // it does not — the same hazard `instrumentation-client.js` avoids by
  // importing from `@simplelogs/next/otel` rather than reaching through to
  // `@simplelogs/browser`.
  //
  // The entry assumes the two declarations resolve to ONE copy. They do today:
  // `@simplelogs/next@2.0.0` depends on `@simplelogs/node@^2.0.0` and
  // `package.json` asks for the same range, so npm dedupes to a single hoisted
  // install and this externalises the very instance the bundled code imports.
  // If a future `@simplelogs/next` wants a major this range does not cover, a
  // second copy nests under it, the bundled code imports the nested one and
  // this resolves the root one — separate module instances again. `otelStarted`
  // in the checkout response is what would show that, so it is worth a look
  // after bumping either of these.
  serverExternalPackages: ["@simplelogs/node"],
};
