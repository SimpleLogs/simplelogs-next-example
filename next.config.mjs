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
  // Externalising it gives both a single instance. Verified against a local
  // collector: the handler's span is then exported before the response
  // returns rather than 5s later on the batch timer.
  // Nothing in this app imports `@simplelogs/node`; the route and
  // `instrumentation.js` both go through `@simplelogs/next/server`.
  // Externalising leaves the bundled import inside that package as a runtime
  // one — Turbopack's `externalImport`, an `await import()`, not a `require`.
  // That reaches the package's ESM build because `@simplelogs/node@2.0.1` maps
  // the `import` condition to `dist/index.mjs`; the import alone does not
  // decide it. The specifier is not `@simplelogs/node` either: Turbopack
  // imports a hashed alias and writes `.next/node_modules/@simplelogs/node-<hash>`
  // as a symlink.
  //
  // That symlink follows the IMPORTER, not this app. Measured by installing a
  // second copy at `node_modules/@simplelogs/next/node_modules/@simplelogs/node`
  // and rebuilding: the alias retargeted onto the nested copy, hash and all.
  // So `@simplelogs/next`'s own dependency is what makes the external resolve,
  // hoisted layout or not — the `package.json` range below pins the version
  // this file and the route's comments are written against, and is not what
  // puts the package within reach.
  //
  // The same measurement retires the split-instance hazard this comment used
  // to warn about. A future `@simplelogs/next` wanting a major outside that
  // range nests its own copy, and the external follows it there, so both
  // halves stay on ONE instance rather than splitting. `otelStarted` in the
  // checkout response is still what would show a split, so it stays worth a
  // look after bumping either of these.
  serverExternalPackages: ["@simplelogs/node"],
};
