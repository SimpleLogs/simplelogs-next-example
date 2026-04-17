# SimpleLogs + Next.js Example App

This repository is a focused example of how to integrate `@simplelogs/next` in a Next.js App Router app.

The goal is clarity over complexity. You get one page with labeled demos that show:

1. Hook + provider with inline client initialization
2. Hook + provider with separate client initialization
3. No provider with manual client initialization
4. Server-side logging from an API route (`app/api/log-demo/route.ts`)

## What This App Demonstrates

The homepage (`app/page.tsx`) contains four cards, each with a clearly labeled button:

1. **Send Log: Hook + Provider Inline Init**
Uses `useSimpleLogs()` inside a component wrapped by `<SimpleLogsProvider />` with default `clientInit` behavior.

2. **Send Log: Hook + Provider Separate Init**
Uses `useSimpleLogs()` with `<SimpleLogsProvider clientInit={false} />` and explicit `<SimpleLogsClientInit />`.

3. **Send Log: No Provider (Manual Init)**
Uses `SimpleLogs.init()` directly in a client component and then logs through `SimpleLogs.log()`.

4. **Send Request: API Route Server Log**
Calls `POST /api/log-demo`, where the route handler writes server-side log entries and timing data.

## Project Structure

```text
app/
	api/log-demo/route.ts                      # Server-side logging demo route
	components/
		HookWithProviderInlineButton.tsx         # Pattern 1 button
		HookWithProviderSeparateInitButton.tsx   # Pattern 2 button
		NoProviderButton.tsx                     # Pattern 3 button
		ServerApiLogButton.tsx                   # Pattern 4 button
	globals.css                                # Dark SimpleLogs visual style
	layout.tsx                                 # Root layout and metadata
	page.tsx                                   # Main demo page
```

## Prerequisites

1. Node.js 20+ recommended
2. `pnpm` installed (repo includes `pnpm-lock.yaml`)
3. A SimpleLogs server key and client key

## Environment Variables

Create `.env.local` (or copy from `.env.example`) and set:

```env
SIMPLELOGS_SERVER_KEY=your-server-key-here
SIMPLELOGS_CLIENT_KEY=your-client-key-here
NEXT_PUBLIC_SIMPLELOGS_CLIENT_KEY=your-client-key-here
```

Why three keys?

1. `SIMPLELOGS_SERVER_KEY`: used by server-side logging
2. `SIMPLELOGS_CLIENT_KEY`: passed from server components through provider-based examples
3. `NEXT_PUBLIC_SIMPLELOGS_CLIENT_KEY`: used by the no-provider manual init client example

## Install and Run

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## How Each Pattern Works

### 1) Hook + Provider (Inline Init)

Files:

1. `app/page.tsx`
2. `app/components/HookWithProviderInlineButton.tsx`

Flow:

1. The page wraps the button with:
	 ```tsx
	 <SimpleLogsProvider config={providerConfig}>
		 <HookWithProviderInlineButton />
	 </SimpleLogsProvider>
	 ```
2. The client component calls:
	 ```tsx
	 const logger = useSimpleLogs()
	 ```
3. Clicking the button logs `start`, `log`, and `end` events.

Use this when you want the most straightforward provider + hook setup.

### 2) Hook + Provider (Separate Init)

Files:

1. `app/page.tsx`
2. `app/components/HookWithProviderSeparateInitButton.tsx`

Flow:

1. The page wraps with provider and disables auto init:
	 ```tsx
	 <SimpleLogsProvider config={providerConfig} clientInit={false}>
		 <HookWithProviderSeparateInitButton />
	 </SimpleLogsProvider>
	 ```
2. The client component renders `<SimpleLogsClientInit />` explicitly.
3. The same component also uses `useSimpleLogs()` to send logs.

Use this when you need precise control over when client initialization happens.

### 3) No Provider (Manual Init)

File:

1. `app/components/NoProviderButton.tsx`

Flow:

1. On mount, the component manually calls:
	 ```tsx
	 SimpleLogs.init({
		 clientKey: process.env.NEXT_PUBLIC_SIMPLELOGS_CLIENT_KEY,
		 debug: true,
	 })
	 ```
2. Clicking the button uses `SimpleLogs.start/log/end` directly.

Use this for very small or isolated client-only scenarios where you do not want provider context.

### 4) Server-Side Logging via API Route

Files:

1. `app/components/ServerApiLogButton.tsx`
2. `app/api/log-demo/route.ts`

Flow:

1. Button sends `POST /api/log-demo`.
2. Route handler logs on the server with `SimpleLogs.start/log/end`.
3. Handler calls `flushServer()` to push server queue immediately.
4. Client receives JSON confirmation and displays status text.

## Notes About Keys and Runtime Behavior

1. Provider-based examples read config in a server component and pass client config safely through provider context.
2. Manual no-provider example must use `NEXT_PUBLIC_*` env vars because it initializes directly in client code.
3. The API route runs on the server and can use server-side configuration.

## Visual Style

The app intentionally uses a dark, modern style for a SimpleLogs-like look:

1. Dark gradient background
2. Soft elevated cards
3. Distinct button variants for each demo type
4. Clear status/feedback text for API interactions

All styling is in `app/globals.css` with reusable classes (`sl-button`, `demo-card`, etc.).

## Troubleshooting

### Button clicks do not produce logs

1. Confirm all required env vars are present in `.env.local`.
2. Restart `pnpm dev` after env updates.
3. Keep `debug: true` for local visibility while validating behavior.

### No-provider example logs fail

1. Ensure `NEXT_PUBLIC_SIMPLELOGS_CLIENT_KEY` is set.
2. Check browser console for missing-key warnings in debug mode.

### API route returns failure

1. Verify `SIMPLELOGS_SERVER_KEY` exists.
2. Test `POST /api/log-demo` manually with curl:

```bash
curl -X POST http://localhost:3000/api/log-demo \
	-H "content-type: application/json" \
	-d '{"touchpoint":"api_demo","key":"manual_test"}'
```

## Useful Scripts

```bash
pnpm dev
pnpm lint
pnpm build
pnpm start
```

## Why This Example Is Intentionally Small

This repo is meant to be a quick-reference integration guide. It avoids extra routing, state management, and architecture noise so you can directly copy the pattern you need into your own app.
