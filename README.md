# SimpleLogs + Next.js

A Next.js App Router app instrumented with
[`@simplelogs/next`](https://www.npmjs.com/package/@simplelogs/next).

The whole integration is **one provider in the root layout**. It covers the
browser and the server — there is no second setup step for route handlers.

## Setup

You need both keys — SimpleLogs dashboard → **Settings → API Keys**.

```bash
cp .env.example .env     # add both keys — see Keys below for the prefix rule
npm install
npm run dev              # http://localhost:5175
```

Add `http://localhost:5175` to the client key's allowed origins in Settings →
API Keys. Client keys are origin-locked, so the browser half stays silent until
you do.

Requires Node 20 or newer.

## The integration

[`app/layout.jsx`](app/layout.jsx):

```jsx
import { SimpleLogsProvider } from "@simplelogs/next/provider";

<SimpleLogsProvider config={{ clientKey: process.env.NEXT_PUBLIC_SIMPLELOGS_CLIENT_KEY }}>
  {children}
</SimpleLogsProvider>
```

That hands the client config down through context, so `useSimpleLogs()` works
anywhere below it. `serverLogger` in a route handler needs nothing further —
the server SDK reads `SIMPLELOGS_SERVER_KEY` from the environment at request
time.

## Keys

Two variables, and the difference between them is not decoration.

| | Prefix | Read |
|---|---|---|
| `SIMPLELOGS_SERVER_KEY` | **never** `NEXT_PUBLIC_` | By the server SDK, from the environment, per request |
| `NEXT_PUBLIC_SIMPLELOGS_CLIENT_KEY` | `NEXT_PUBLIC_` | Inlined into the client bundle at build time |

**Never prefix the server key.** `NEXT_PUBLIC_` is what puts a value in the
browser bundle, so prefixing it publishes the secret.

**Do prefix the client key**, even though a root layout looks like server-only
code. This layout uses no dynamic API, so Next prerenders it at *build* time —
an unprefixed `process.env.SIMPLELOGS_CLIENT_KEY` read here is frozen at
whatever the build environment had. Build in CI without it and the browser
silently receives `undefined`: nothing is captured and nothing says so. `next
dev` hides this completely, because in dev every render is dynamic.

The client key is public by design and origin-locked in the dashboard, so the
bundle is where it belongs.

## What you get without writing any logging code

- **Page views**, including soft navigations between routes
- **Web Vitals** — FCP, LCP, TTFB, CLS
- **Uncaught errors** and unhandled promise rejections
- A **deploy marker** per deployment, taken from Vercel's build environment

## Correlation across the client/server boundary

[`app/CheckoutButton.jsx`](app/CheckoutButton.jsx) calls
[`app/api/checkout/route.js`](app/api/checkout/route.js). Neither passes an id.

The SDK's patched `fetch` forwards page, session and trace headers on
same-origin requests, and the route handler reads them back through
`next/headers`. The result is one trace spanning the click and the server work
it caused.

That is the piece you would otherwise have to build yourself, and it is why
`@simplelogs/next` exists as its own package rather than as two installs.

Two levels of correlation are worth telling apart. A plain `serverLogger.log()`
is attributed to the browser's **page and session**. A server **timing**
(`start()` / `end()`) additionally joins the browser's **trace**, which is what
puts the server work inside the page's tree rather than beside it — so the
route handler here times itself as well as logging.

## Logging

In a **client component** — `useSimpleLogs()`:

```jsx
"use client";
import { useSimpleLogs } from "@simplelogs/next";

const logger = useSimpleLogs();
logger.log({ touchpoint: "checkout/click", level: "info" });
```

In a **route handler or server component** — `serverLogger`:

```js
import { serverLogger } from "@simplelogs/next/server";

await serverLogger.log({ touchpoint: "checkout/submit", level: "info" });
```

The timing hooks — `usePageLoadTime`, `useComponentMountTime`,
`useTimedCallback`, `useWebVitals` — and `identify()` / `clearIdentity()` are
all available from `@simplelogs/next` too. The
[React example](https://github.com/SimpleLogs/simplelogs-react-example) shows
them in use; they behave identically here.

### Naming

`touchpoint` is what the dashboard aggregates on, so keep it stable —
`orders/[id]`, never `orders/42`. A touchpoint per order id would make
percentiles meaningless.

## Session replay

On by default in `@simplelogs/next`, still gated by the sample decision and the
switch under Settings → Session Replay. To keep rrweb from ever being
downloaded:

```jsx
config={{ clientKey, sessionReplay: { enabled: false } }}
```

`enabled` is read at runtime, so no bundler can eliminate rrweb on it — the SDK
imports it dynamically, and in this example's production build it lands in its
own ~204KB chunk that is simply never fetched. What the flag saves is the
download, not the build output.

## Using the split packages directly

`@simplelogs/next` re-exports `@simplelogs/browser`, `@simplelogs/node` and
`@simplelogs/react` at the paths it has always published, so nothing here has
to change. If you would rather depend on them directly, `@simplelogs/react`'s
provider is the same component this example imports.

## Other examples

| Your app | Example | Package |
|---|---|---|
| Next.js | **this repo** | `@simplelogs/next` |
| React (Vite, CRA, Remix, React Router) | [simplelogs-react-example](https://github.com/SimpleLogs/simplelogs-react-example) | `@simplelogs/react` |
| Plain HTML / any framework | [simplelogs-vanilla-example](https://github.com/SimpleLogs/simplelogs-vanilla-example) | `@simplelogs/browser` |
| Express | [simplelogs-express-example](https://github.com/SimpleLogs/simplelogs-express-example) | `@simplelogs/express` |
| Node, any other server | [simplelogs-node-example](https://github.com/SimpleLogs/simplelogs-node-example) | `@simplelogs/node` |
