import { SimpleLogsProvider } from "@simplelogs/next/provider";

export const metadata = { title: "SimpleLogs — Next.js example" };

/**
 * This is the whole integration.
 *
 * The provider covers the browser: it hands the client config down through
 * context, so `useSimpleLogs()` works anywhere below it.
 *
 * It deliberately does NOT carry the server key, and that key is never
 * prefixed — NEXT_PUBLIC_ would ship a secret to the browser. The server SDK
 * reads SIMPLELOGS_SERVER_KEY from the environment at request time, so
 * `serverLogger` in a route handler is configured whether or not this layout
 * renders — which matters, because `/` is statically prerendered and in
 * production this render may only ever have happened at build time.
 *
 * The client key carries the NEXT_PUBLIC_ prefix because it has to reach the
 * browser, and the browser is the one place a value can only arrive by being
 * in the bundle. That is fine here: the client key is public by design and
 * origin-locked in the dashboard.
 *
 * The prefix does NOT protect against a missing build-time value — a
 * NEXT_PUBLIC_ variable absent at build is `undefined` in the bundle forever,
 * exactly as an unprefixed one read from a prerendered layout would be. What
 * it buys is honesty: it puts the build-time capture in the variable's name,
 * instead of leaving it an emergent property of whether this route happened to
 * prerender. (`next build` prints which: `/` is `○ Static` here.)
 *
 * The real trade is runtime configurability. If you inject env at boot rather
 * than at build — Docker, Kubernetes — no NEXT_PUBLIC_ variable can see it,
 * and you would instead read an unprefixed variable from a layout forced
 * dynamic.
 *
 * Tracing is not set up here. It is a separate entry point on both sides, so
 * it lives in `instrumentation-client.js` and `instrumentation.js` — see
 * "Correlation across the client/server boundary" in the README.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", maxWidth: "42rem", margin: "4rem auto", padding: "0 1rem", lineHeight: 1.6 }}>
        <SimpleLogsProvider
          config={{
            clientKey: process.env.NEXT_PUBLIC_SIMPLELOGS_CLIENT_KEY,
            environment: process.env.NODE_ENV,
          }}
        >
          {children}
        </SimpleLogsProvider>
      </body>
    </html>
  );
}
