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
  // So `@simplelogs/next`'s own dependency is what makes the external
  // resolve, hoisted layout or not — which is why `package.json` does NOT
  // declare `@simplelogs/node`, though it used to.
  //
  // Declaring it bought nothing: it did not make the external resolve, and
  // `package-lock.json` fixes the transitive copy either way. In the one
  // case where it would have acted at all it cost something — npm nests to
  // resolve a conflict with a ROOT declaration, so had `@simplelogs/next`
  // ever wanted a major this app's range refused, the declaration is what
  // would strand a root copy nothing imports. Undeclared, that major is
  // simply hoisted and there is one copy. Verified by removing it: same
  // alias, same hash, same `e.y`, same byte figures.
  //
  // The versions dated in this file and in `app/api/checkout/route.js` go
  // stale on any `@simplelogs/node` change. Check the installed version
  // after a bump (`npm ls @simplelogs/node`) rather than the checkout
  // response: `otelStarted` reports a split module instance, and per the
  // measurement above the external follows the importer, so there is none to
  // report.
  //
  // The same measurement retires the split-instance hazard this comment used
  // to warn about. It said a nested copy would leave the bundled code
  // importing the nested one while this resolved the root one — separate
  // module instances again. The nested build IS that scenario, and the
  // external followed the importer into the nest, so both halves stay on ONE
  // instance. Which is also why `otelStarted` cannot be the tripwire for the
  // paragraph above: there is no split for it to report.
  serverExternalPackages: ["@simplelogs/node"],
};
