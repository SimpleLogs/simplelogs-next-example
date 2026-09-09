import { SimpleLogsProvider } from "@simplelogs/next/provider";

export const metadata = { title: "SimpleLogs — Next.js example" };

/**
 * This is the whole integration.
 *
 * The provider covers the browser: it hands the client config down through
 * context, so `useSimpleLogs()` works anywhere below it.
 *
 * It deliberately does NOT carry the server key, and that key is never
 * prefixed — NEXT_PUBLIC_ would make it eligible for inlining into client
 * code, one read away from being published. The server SDK reads
 * SIMPLELOGS_SERVER_KEY from the environment at request time, so
 * `serverLogger` in a route handler is configured whether or not this layout
 * renders — which matters, because `/` is statically prerendered and in
 * production this render may only ever have happened at build time.
 *
 * The client key carries the NEXT_PUBLIC_ prefix because it has to reach the
 * browser, and there are two ways it can: inlined into client code, which is
 * what the prefix buys, or serialized into this layout's prerendered payload
 * and handed down as a prop. This file is a server component, so the prop is
 * the route the key actually takes — the prefix is kept for what it buys
 * below, not because it is the only way through. Either way it is fine: the
 * client key is public by design and origin-locked in the dashboard.
 *
 * The other half of the same config object is `environment`, which tags
 * browser entries with the deployment's environment — `development` or
 * `production` here. It needs no prefix, and the reason is specific to the
 * NAME rather than to this file: `NODE_ENV` is Next's own, inlined into client
 * code whether or not it carries the prefix, so there is nothing a prefix
 * could buy it. The flight payload carries it too — but it carries `clientKey`
 * above just the same, which keeps its prefix, so that route is not what
 * separates the two.
 *
 * Next's substitution is live in this build without acting on anything written
 * here: the only `NODE_ENV` read in this repo is the one below, and it is a
 * server read. It lands on `@simplelogs/core`'s own default instead, which the
 * client bundle carries already replaced, minified, in the chunk that carries
 * the SDK. Quoted as a stem rather than whole, because the full expression
 * does not fit a comment line and a wrap through it defeats the search it is
 * offered for:
 *
 * grep -o 'environment:ev(()=>"production")' .next/static/chunks/*.js
 *
 * The `?? "development"` tail follows it in the file.
 *
 * The prefix does NOT protect against a missing build-time value — absent at
 * build, the key is `undefined` forever in whatever captured it, the bundle or
 * this layout's payload, and an unprefixed variable read from a prerendered
 * layout fails the same way. What it buys is honesty: it puts the build-time
 * capture in the variable's name, instead of leaving it an emergent property
 * of whether this route happened to prerender. (`next build` prints which: `/`
 * is `○ Static` here.)
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
