import { SimpleLogsProvider } from "@simplelogs/next/provider";

export const metadata = { title: "SimpleLogs — Next.js example" };

/**
 * This is the whole integration.
 *
 * One provider in the root layout covers both runtimes: it configures the
 * server SDK during the RSC render and hands the client config down through
 * context, so `serverLogger` in a route handler and `useSimpleLogs()` in a
 * component are both ready with no second setup step.
 *
 * Both keys are read here, on the server. The client key is passed to the
 * browser; the server key stays in this render and is stripped before the
 * config crosses the boundary.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", maxWidth: "42rem", margin: "4rem auto", padding: "0 1rem", lineHeight: 1.6 }}>
        <SimpleLogsProvider
          config={{
            serverKey: process.env.SIMPLELOGS_SERVER_KEY,
            clientKey: process.env.SIMPLELOGS_CLIENT_KEY,
            environment: process.env.NODE_ENV,
          }}
        >
          {children}
        </SimpleLogsProvider>
      </body>
    </html>
  );
}
