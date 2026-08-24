import { SimpleLogsProvider } from "@simplelogs/next/provider";

export const metadata = { title: "SimpleLogs — Next.js example" };

/**
 * This is the whole integration.
 *
 * One provider covers both runtimes: it hands the client config down through
 * context, and configures the server SDK during the RSC render, so
 * `serverLogger` in a route handler and `useSimpleLogs()` in a component are
 * both ready with no second setup step.
 *
 * The client key carries the NEXT_PUBLIC_ prefix because this layout uses no
 * dynamic API, so Next prerenders it at BUILD time. An unprefixed variable
 * read here would be frozen at whatever the build environment had — build in
 * CI without it and the browser silently gets `undefined`. NEXT_PUBLIC_ is
 * inlined into the client bundle instead, which is the behavior you want for a
 * value that is public by design.
 *
 * The server key is deliberately NOT passed and NOT prefixed. The server SDK
 * reads SIMPLELOGS_SERVER_KEY from the environment at request time, so it is
 * configured whether or not this render happens — and prefixing it would ship
 * a secret to the browser.
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
