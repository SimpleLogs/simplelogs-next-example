# SimpleLogs + Next.js

A Next.js App Router app instrumented with
[`@simplelogs/next`](https://www.npmjs.com/package/@simplelogs/next).

The whole integration is **one provider in the root layout** plus two
environment variables. The provider covers the browser; the server SDK reads
its key from the environment at request time, so route handlers need no setup
of their own.

Tracing is a further opt-in: two instrumentation files and one call in the
route handler. All of it is optional — logging, timings, page views and Web
Vitals work without any of it — and together it is what makes a click and the
server work it caused one trace rather than two.

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

Tracing is a separate opt-in on each side, so a page that only wants logging
never downloads the web tracer and a server that only wants logging never
starts one:

- [`instrumentation-client.js`](instrumentation-client.js) calls
  `initBrowserOtel()` — the page-scoped root span, and with it the
  `traceparent` on outgoing same-origin `fetch` calls.
- [`instrumentation.js`](instrumentation.js) calls `initOtel()` — the tracer
  and context manager the server needs to continue that trace.

See [Correlation across the client/server boundary](#correlation-across-the-clientserver-boundary)
for what each half is actually doing.

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
build. Setting only one environment therefore splits the data rather than
failing, and whichever half is left behind goes to the SDK's default — outside
your deployment:

| Set | Browser | Server |
|---|---|---|
| Run time only | **go to the SDK default** | your collector |
| Build time only | your collector | **go to the SDK default** |
| Both | your collector | your collector |

Measured with one page load and one checkout against a local collector: 0 / 2,
then 6 / 0.

Four emitters follow those two columns, by three different mechanisms:

| What | Column | Resolved |
|---|---|---|
| Browser entries (`/enqueue`, replay settings) | Browser | Per send, from the forwarded config |
| Browser traces and logs (OTLP) | Browser | Per send, from the forwarded config |
| Server entries (`serverLogger`) | Server | Per request, from the environment |
| Server traces and logs (OTLP) | Server | **Once, at server start** |

The last row is the one that differs. `initOtel()` runs inside `register()` and
resolves its exporter URL from the config as it stands then — so unlike
`serverLogger`, a value that only arrives after boot never reaches it. For an
ordinary deployment the answer is the same either way; it matters if you inject
environment at runtime.

Browser tracing needs no endpoint of its own. With `SIMPLELOGS_API_ENDPOINT`
pointed at `http://127.0.0.1:9999/api/v1`, one page load and one checkout put
every browser signal on that host and nothing anywhere else:

```
1x  http://127.0.0.1:9999/api/otlp/v1/traces
1x  http://127.0.0.1:9999/api/otlp/v1/logs
2x  http://127.0.0.1:9999/api/v1/replay/settings
```

**`SIMPLELOGS_OTLP_BROWSER_ENDPOINT`** moves the browser's OTLP signals — its
traces and logs — to a different host from its entries, for a deployment whose
collector is not its SimpleLogs install. It is forwarded to the browser by the
same prerendered render as `SIMPLELOGS_API_ENDPOINT`, so **it carries the same
build-time trap and must be set in both environments too.**

Two things are easy to get wrong about it, both measured here with it set to
`http://127.0.0.1:8888` and `SIMPLELOGS_API_ENDPOINT` still on `:9999`:

```
1x  http://127.0.0.1:8888/v1/traces
1x  http://127.0.0.1:8888/v1/logs
2x  http://127.0.0.1:9999/api/v1/replay/settings
```

- The override is used **verbatim** — `<endpoint>/v1/traces`, with no
  `/api/otlp` prefix. That prefix only appears on the URL derived from
  `SIMPLELOGS_API_ENDPOINT`.
- It takes **both** OTLP signals with it, not only traces, while entries and
  replay settings stay on the browser column.

Leaving it unset — as this example does — is what keeps the two columns above
sufficient.

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

Two levels of correlation are worth telling apart, because they arrive by
different routes and one of them needs setup.

**Page and session** ride the SDK's own headers. The patched `fetch` puts
`x-simplelogs-page-id` and `x-simplelogs-session-id` on same-origin requests,
and the route handler reads them back through `next/headers` — no argument
threaded through your code, and nothing to turn on. That is the piece you would
otherwise have to build yourself, and it is why `@simplelogs/next` exists as its
own package rather than as two installs.

**The trace** rides the W3C `traceparent` header, through OpenTelemetry's
context rather than the SDK's correlation. That is what puts the server work
*inside* the page's tree rather than beside it, and it takes both halves of the
opt-in:

1. `initBrowserOtel()` in [`instrumentation-client.js`](instrumentation-client.js)
   opens the page-scoped root span. Without an active span there is nothing to
   propagate, so the header is simply absent.
2. `initOtel()` in [`instrumentation.js`](instrumentation.js) installs the
   tracer and context manager on the server.
3. `withTrace(fn, { carrier: await headers() })` in
   [`app/api/checkout/route.js`](app/api/checkout/route.js) continues the
   incoming trace. A request that arrives without a `traceparent` — from curl,
   or from a browser that never opted in — opens its own trace instead.

Miss any of the three and the two sides still log, still time, and still share
a page and a session; only the trace splits in two. Nothing warns about it,
because a page that never opted in is not misconfigured — so if a waterfall
looks halved, check these three first.

The automatic alternative to step 3 is `@opentelemetry/instrumentation-http`,
which patches `node:http` at require time and continues the trace for every
handler without being asked. It earns its dependency once you have many
handlers; with one, an explicit `withTrace` is smaller and easier to read.

### Checking it still works

An SDK upgrade can switch this off without an error, a warning or a failing
build — that is exactly what happened on the way to 2.0.0, and it is why the
status box reports the trace id rather than asserting a join. The handler
answers the question directly, so the check is one command:

```bash
# No traceparent — the handler should open its own trace.
curl -sX POST localhost:5175/api/checkout
# {"ok":true,"joined":false,"traceId":"dba2429c…","spanId":"…"}

# With one — it should report that same trace back.
curl -sX POST -H 'traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' \
  localhost:5175/api/checkout
# {"ok":true,"joined":true,"traceId":"4bf92f3577b34da6a3ce929d0e0e4736","spanId":"…"}
```

`joined: true` with the caller's own trace id coming back is the server half.
The browser half is the button: click it and the box names a trace, or says the
server opened its own.

Three call sites have to be present, and any one of them going missing leaves a
green build and a silently split trace:

| Where | What |
|---|---|
| [`instrumentation-client.js`](instrumentation-client.js) | `initBrowserOtel()` |
| [`instrumentation.js`](instrumentation.js) | `initOtel()` |
| [`app/api/checkout/route.js`](app/api/checkout/route.js) | `withTrace(fn, { carrier })` |

### What the browser half costs

`instrumentation-client.js` imports the web tracer statically and runs before
hydration, so unlike the replay chunk below it is part of first load rather
than something fetched later. First Load JS for `/`, measured in this example's
own production build against the same build with that one file removed:

| | Uncompressed | gzipped |
|---|---|---|
| Logging only | 545,621 B | 163,546 B |
| Logging + browser tracing | 605,066 B | 179,890 B |

So about 16 KB gzipped for the page-scoped root span and the `traceparent` that
comes with it. Delete the file and both numbers drop back — nothing else in the
integration depends on it.

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

Read out of `@simplelogs/browser@2.0.0` and `@simplelogs/react@2.0.0`, since
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
own chunk of 213,633 B that is simply never fetched. What the flag saves is the
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
