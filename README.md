# SimpleLogs + Next.js

A Next.js App Router app instrumented with
[`@simplelogs/next`](https://www.npmjs.com/package/@simplelogs/next).

The whole integration is **one provider in the root layout**. It covers the
browser and the server — there is no second setup step for route handlers.

## Setup

You need both keys — SimpleLogs dashboard → **Settings → API Keys**.

```bash
cp .env.example .env     # add SIMPLELOGS_SERVER_KEY and SIMPLELOGS_CLIENT_KEY
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

<SimpleLogsProvider
  config={{
    serverKey: process.env.SIMPLELOGS_SERVER_KEY,
    clientKey: process.env.SIMPLELOGS_CLIENT_KEY,
  }}
>
  {children}
</SimpleLogsProvider>
```

It configures the server SDK during the RSC render and hands the client config
down through context. `serverLogger` in a route handler and `useSimpleLogs()`
in a client component are both ready with nothing else to wire.

## Keys

Both are read on the server, so **neither needs `NEXT_PUBLIC_`**. The client
key is passed down to the browser; the server key stays in the layout's render
and is stripped before the config crosses that boundary.

Never add `NEXT_PUBLIC_` to the server key.

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
switch under Settings → Session Replay. To keep rrweb out of the bundle
entirely:

```jsx
config={{ serverKey, clientKey, sessionReplay: { enabled: false } }}
```

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
