import { SimpleLogsProvider } from "@simplelogs/next";
import HookWithProviderInlineButton from "./components/HookWithProviderInlineButton";
import HookWithProviderSeparateInitButton from "./components/HookWithProviderSeparateInitButton";
import NoProviderButton from "./components/NoProviderButton";
import ServerApiLogButton from "./components/ServerApiLogButton";

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
        <h1>Three integration styles + one server logging route</h1>
        <p className="hero-copy">
          This example keeps things intentionally small while showing the most
          useful ways to wire <code>@simplelogs/next</code> in a Next.js App
          Router project.
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
