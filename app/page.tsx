import { SimpleLogsProvider } from "@simplelogs/next";
import HookWithProviderInlineButton from "./components/HookWithProviderInlineButton";
import HookWithProviderSeparateInitButton from "./components/HookWithProviderSeparateInitButton";
import NoProviderButton from "./components/NoProviderButton";
import ServerApiLogButton from "./components/ServerApiLogButton";
import PageLoadTimeDemo from "./components/PageLoadTimeDemo";
import ComponentMountTimeDemo from "./components/ComponentMountTimeDemo";
import TimedCallbackDemo from "./components/TimedCallbackDemo";
import WebVitalsDemo from "./components/WebVitalsDemo";

export default async function Home() {
  const providerConfig = {
    serverKey: process.env.SIMPLELOGS_SERVER_KEY,
    clientKey: process.env.SIMPLELOGS_CLIENT_KEY,
    debug: true,
  };

  return (
    <main className="page-shell">
      <div className="hero">
        <p className="eyebrow">SimpleLogs Next.js</p>
        <h1>Integration styles + performance hooks</h1>
        <p className="hero-copy">
          This example keeps things intentionally small while showing the most
          useful ways to wire <code>@simplelogs/next</code> in a Next.js App
          Router project — including the new performance hooks.
        </p>
      </div>

      <section className="demo-grid" aria-label="SimpleLogs integration demos">
        <article className="demo-card">
          <h2>1) Hook + provider (inline init)</h2>
          <p>
            <code>&lt;SimpleLogsProvider /&gt;</code> automatically initializes
            the client logger. The button uses <code>useSimpleLogs()</code>.
          </p>
          <SimpleLogsProvider config={providerConfig}>
            <HookWithProviderInlineButton />
          </SimpleLogsProvider>
        </article>

        <article className="demo-card">
          <h2>2) Hook + provider (separate init)</h2>
          <p>
            The provider shares config context, then
            <code> &lt;SimpleLogsClientInit /&gt;</code> controls when client
            init happens.
          </p>
          <SimpleLogsProvider config={providerConfig} clientInit={false}>
            <HookWithProviderSeparateInitButton />
          </SimpleLogsProvider>
        </article>

        <article className="demo-card">
          <h2>3) No provider (manual init)</h2>
          <p>
            Initializes in a client component via <code>SimpleLogs.init()</code>
            and logs directly with <code>SimpleLogs.log()</code>.
          </p>
          <NoProviderButton />
        </article>

        <article className="demo-card">
          <h2>Server-side logging via API route</h2>
          <p>
            Calls <code>/api/log-demo</code>, where the route handler writes a
            server log and timing.
          </p>
          <ServerApiLogButton />
        </article>
      </section>

      <SimpleLogsProvider config={providerConfig}>
        <section aria-label="SimpleLogs performance hooks" style={{ marginTop: "2rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "1.25rem", letterSpacing: "-0.01em" }}>
            Performance Hooks
          </h2>
          <div className="demo-grid">
            <article className="demo-card">
              <h2>usePageLoadTime</h2>
              <p>
                Measures navigation start → page load event (or a specific DOM
                element if <code>selector</code> is provided). Fires once on
                mount.
              </p>
              <PageLoadTimeDemo />
            </article>

            <article className="demo-card">
              <h2>useComponentMountTime</h2>
              <p>
                Records elapsed time from navigation start to when this
                component first renders. Useful for tracking hydration and
                lazy-load delays.
              </p>
              <ComponentMountTimeDemo />
            </article>

            <article className="demo-card">
              <h2>useTimedCallback</h2>
              <p>
                Wraps any async or sync function and records its execution
                duration automatically. Errors are re-thrown with{" "}
                <code>{"{ error: true }"}</code> merged into metadata.
              </p>
              <TimedCallbackDemo />
            </article>

            <article className="demo-card">
              <h2>useWebVitals</h2>
              <p>
                Monitors Core Web Vitals via <code>PerformanceObserver</code>.
                Call once per vital. CLS is accumulated and flushed as a log
                entry on unmount.
              </p>
              <WebVitalsDemo />
            </article>
          </div>
        </section>
      </SimpleLogsProvider>

      <section className="notes">
        <p>
          Required env vars: <code>SIMPLELOGS_SERVER_KEY</code> and
          <code> SIMPLELOGS_CLIENT_KEY</code>.
        </p>
        <p>
          For deeper setup and architecture notes, see <code>README.md</code>.
        </p>
      </section>
    </main>
  );
}
