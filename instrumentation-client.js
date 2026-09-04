/**
 * Browser tracing, started before React hydrates.
 *
 * `@simplelogs/next` logs and times without this file. What it adds is the
 * page-scoped root span — and, with it, the `traceparent` header the patched
 * `fetch` puts on same-origin requests. Without a browser tracer there is no
 * active span to propagate, so the header is simply absent and server work
 * triggered by the page opens a trace of its own. Nothing warns about that:
 * the fallback is deliberately silent, because a page that never opted in is
 * not misconfigured.
 *
 * Tracing is a separate entry point so a page that only wants logging never
 * downloads the web tracer, the batch processors or the OTLP serializer.
 *
 * Imported from `@simplelogs/next/otel`, not `@simplelogs/browser/otel`:
 * the browser package is a transitive dependency here, and a non-hoisted
 * node_modules layout will not resolve one this app has not declared.
 *
 * This runs after the document loads and before hydration, which is earlier
 * than a `useEffect` in a client component can manage — so a fetch fired by
 * the first interaction cannot beat the tracer into place.
 */
import { initBrowserOtel } from "@simplelogs/next/otel";

initBrowserOtel();
