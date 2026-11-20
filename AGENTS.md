<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Working in this repo

## What it is

- A standalone example of `@simplelogs/next` on the App Router, served on port
  5175 (`npm run dev`, `npm start`).
- Keep the house style: npm (not pnpm), plain JS (no TypeScript, Tailwind or
  ESLint), a `.env.example`, and a README that covers setup, key handling and
  the reasoning behind both, ending with the table of other examples.
- This is the first thing a new user runs. Never use a `file:` or
  absolute-path dependency, and point `@simplelogs/next` only at a version npm
  already publishes (`npm view @simplelogs/next versions`). If the example has
  to change before the SDK release it needs, open it as a draft PR that names
  the SDK change it waits on.

## Next.js traps

- `next dev` hides build-time capture. `/` is statically prerendered
  (`next build` lists it as `○ Static`), so check `npm run build && npm start`
  as well as `npm run dev`.
- The client key keeps its `NEXT_PUBLIC_` prefix, which marks it as captured
  at build time. It reaches the browser through `app/layout.jsx`'s prerendered
  payload, so it must be set wherever you build.
- The server key must never have the prefix. The server SDK reads it at run
  time, not build time, and caches it, so it must be in the environment before
  the server starts.
- Set `SIMPLELOGS_API_ENDPOINT` at both build time and run time. With only one
  of them set, the data splits between your collector and the SDK default, and
  nothing fails. `SIMPLELOGS_OTLP_BROWSER_ENDPOINT`, if you use it, reaches the
  browser through the same prerender, so set it wherever you build. Without
  it, browser OTLP follows `SIMPLELOGS_API_ENDPOINT`.
- `next.config.mjs` keeps `@simplelogs/node` in `serverExternalPackages`, and
  `package.json` deliberately does not declare it. Read the comment there
  before changing either.

## Verifying a change

- `npm install && npm run build` must pass.
- To see what the SDK sends, run a stand-in collector: a small `node:http`
  server that prints the method, path and body of each request. Set
  `SIMPLELOGS_API_ENDPOINT=http://127.0.0.1:<port>` for both `npm run build`
  and `npm start`. Entries then arrive on `/enqueue`, and OTLP on
  `/api/otlp/v1/*` (the server's OTLP bodies are protobuf).
- The collector is a different origin from the page, so it must answer
  `OPTIONS` preflights with CORS headers that allow `authorization`,
  `content-type` and `x-simplelogs-environment`. Without them only the
  browser's `/enqueue` beacons get through, and browser tracing looks broken
  when it is not.
- `curl` runs no JavaScript. Check browser telemetry in a real browser.
- Never truncate the collector's log file while the collector holds it open.

## Docs and comments

- Docs and comments describe current behavior only. Never narrate history
  ("previously", "used to", "this replaced"); that belongs in commit messages
  and PR bodies.
- US English: `color`, not `colour`.
- Some existing comments break these rules. Fix them in the lines you touch,
  not in an unrelated sweep.

