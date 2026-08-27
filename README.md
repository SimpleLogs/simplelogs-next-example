# SimpleLogs + Next.js

A Next.js App Router app instrumented with
[`@simplelogs/next`](https://www.npmjs.com/package/@simplelogs/next).

The whole integration is **one provider in the root layout** plus two
environment variables. The provider covers the browser; the server SDK reads
its key from the environment at request time, so route handlers need no setup
of their own.

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
browser bundle, so prefixing it publishes the secret. It does not need the
prefix: the server SDK reads it from the environment at request time, which is
why this example does not pass it to the provider at all.

**Do prefix the client key.** It has to reach the browser, and the bundle is
the only way a value gets there. That is fine — the key is public by design and
origin-locked in the dashboard.

Be precise about what the prefix does and does not buy:

- It does **not** protect you from a missing build-time value. A `NEXT_PUBLIC_`
  variable absent at build is `undefined` in the bundle forever — exactly what
  an unprefixed variable read from a prerendered layout would be. Both fail the
  same way.
- It **does** make the build-time capture explicit. The name says "this is
  baked in", instead of it being an emergent property of whether this route
  happened to prerender. `next build` prints which: `/` is `○ Static` here, so
  an unprefixed read would be captured at build without anything saying so.

`next dev` hides all of this, because in dev every render is dynamic. Check a
production build before trusting either arrangement.

**If you inject environment variables at boot rather than at build** — Docker,
Kubernetes, anything that sets env on the running container — no `NEXT_PUBLIC_`
variable can see them. Read an unprefixed variable from a layout marked
`export const dynamic = "force-dynamic"` instead, and accept losing static
rendering for that route.

### Self-hosted collectors

`SIMPLELOGS_API_ENDPOINT` is optional and only for self-hosted installs, but it
has the same build-time trap as the client key and no prefix to signal it.

**Set it in both environments — wherever you build and wherever you run.**

The provider reads it during the layout's render and forwards it to the
browser, and that render is prerendered, so the browser's copy is fixed at
build. The server reads it from the environment per request. Setting only one
therefore splits the data rather than failing, and whichever half is left
behind goes to the SDK's default — outside your deployment:

| Set | Browser entries | Server entries |
|---|---|---|
| Run time only | **go to the SDK default** | your collector |
| Build time only | your collector | **go to the SDK default** |
| Both | your collector | your collector |

Measured with one page load and one checkout against a local collector: 0 / 2,
then 6 / 0.

Either direction leaves half of every trace missing, which reads as a
correlation bug rather than a configuration one — and that is what makes it
expensive to diagnose.

## What you get without writing any logging code

- **Page views**, including soft navigations between routes
- **Web Vitals** — FCP, LCP, TTFB, CLS
- **Uncaught errors** and unhandled promise rejections
- A **deploy marker** per deployment, taken from Vercel's build environment
- **Console output**, but only while a session is being recorded — see
  [Session replay](#session-replay) below

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

## Flushing before the response

[`app/api/checkout/route.js`](app/api/checkout/route.js) ends with
`await flushServer()`. That line is worth understanding before you copy the
route, because what it buys depends on where you deploy.

Entries are batched. Without the flush they still arrive — a few hundred
milliseconds later, when the batch timer fires. A long-lived server survives
that gap, which is exactly why the omission is invisible in `next dev`. **A
serverless function frozen the moment it responds does not**, and the batch is
dropped with no error anywhere.

Measured on `next build && next start` against a local collector: with the
flush, both entries are delivered by the time the response returns; without it,
none are at that moment.

### What it does not guarantee

The server queue is process-wide, and `flush()` drains it synchronously before
awaiting the sends. Whoever drains first awaits that batch; anyone arriving
afterwards finds it empty and returns while those sends are still outstanding.
There are two ways in.

**On Vercel this is the normal path, not a race.** The SDK auto-flushes per
entry there — it keys off the `VERCEL` environment variable — so by the time
`flushServer()` runs, the queue is already empty. Timing the route against a
collector that delays its reply by two seconds shows it plainly:

| | response time |
|---|---|
| `VERCEL` unset | **2.04s** — the flush genuinely awaits the send |
| `VERCEL=1` | **0.02s** — queue already drained, sends still in flight |

**Elsewhere it is a narrow window**, between this request's last entry and the
flush on the next line. It matters most on a platform that runs requests
concurrently in one process *and* throttles CPU after responding — Cloud Run —
and cannot arise where an instance takes one request at a time, like Lambda.
For what it is worth, it did not reproduce here at twelve concurrent requests:
every one awaited its own send in full, because a request normally still has
its own entries queued when it reaches the flush.

Closing the window properly is an SDK fix rather than an application one:
[simplelogs-sdk#43](https://github.com/SimpleLogs/simplelogs-sdk/issues/43).

### What it costs

The response now waits on a round trip to the collector. That is the trade for
not losing the data on a platform that can freeze you. On a long-lived server
you can drop the line and let the batch timer do it.

## Session replay

On by default in `@simplelogs/next`, still gated by the sample decision and the
switch under Settings → Session Replay.

While a recording is running, the SDK also captures the page's `console.*`
calls into it, and they are shipped and indexed with the recording.

Read out of `@simplelogs/browser@1.6.0` and `@simplelogs/react@1.4.5`, since
none of this is visible from the call site:

- The console methods are wrapped when the replay module loads, not when a
  recording starts — `patchConsoleForReplay()` runs at module top level. The
  wrapper records nothing until there is a session: `recordConsoleLogEvent` is
  `if (!activeSession) return`. So `console.log` is not the original function
  from the moment replay loads, and nothing leaves the page until a recording
  is actually running.
- Captured lines go through the recorder like any other event. The rrweb
  `emit` callback is `redactPiiDeep(...)` first, then `facts.observe(...)`,
  then the buffer — so the same pattern-based PII redaction that covers
  recorded DOM covers console arguments too, and the recording-rule facts are
  built from the recorder's own event stream rather than from a separate
  buffer. There is nowhere for a pre-recording line to be kept.
- A recording rule decides whether an already-running recording is **sent**,
  not whether one starts. `RetentionController` holds the recorder's bytes
  locally and evaluates the rules on a timer; a match either commits the held
  buffer or discards it, and a deadline, a byte cap or the page unloading
  forces the decision. So nothing a rule is judging has left the page at the
  time it is judged.
- **With no recording rules configured — as in this example — none of that
  happens.** `shouldHold()` returns `false` on an empty rule set, so the
  controller never engages and the recording streams as it always did. A
  sampled session ships, console lines included. Holding is also skipped when
  the configured rules could not drop anything anyway: an all-`record` set
  over a `record` default has nothing to withhold for.
- The `sessionReplay` masking options do **not** cover them. `maskAllInputs`,
  `blockClass` and `maskTextClass` mask recorded DOM, and a string passed to
  `console.log` never was DOM.

`sessionReplay.enabled` is the only lever: **there is no way to keep session
replay and opt out of console capture.** `SessionReplayConfig` has no
console-specific flag, and the provider only imports `@simplelogs/browser/replay`
when the flag is on — so turning it off stops the download and the console
patch together:

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
