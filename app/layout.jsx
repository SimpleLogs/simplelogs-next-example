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
 * `production` here. It carries no prefix because prefixing it is not an
 * option: `NODE_ENV` is the framework's name rather than one this project
 * chose, and `NEXT_PUBLIC_NODE_ENV` would be a different variable someone
 * would have to set. That reasoning is about `NODE_ENV` and nothing else: a
 * name of this project's own would be an ordinary setting again, with the
 * key's trade-offs and the same build-time capture.
 *
 * Next does inline `process.env.NODE_ENV` into client code without any prefix,
 * and that substitution is live in this build. It acts on
 * `@simplelogs/core@2.0.1`'s own default rather than on anything written here:
 * the only `NODE_ENV` read in this repo is the one below, and it is a server
 * read. The client bundle carries core's default already replaced, minified,
 * in the chunk that carries the SDK. Match it without pinning the minifier's
 * rename of `staticEnv`, which is allocated per build, and against a
 * production `next build`: `next dev` substitutes `"development"` instead, and
 * does not minify.
 *
 * grep -oE 'environment:[A-Za-z0-9_$]+\(\(\)=>"production"\)' .next/static/chunks/*.js
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
