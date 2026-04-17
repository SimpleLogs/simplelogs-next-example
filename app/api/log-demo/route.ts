import { NextResponse } from "next/server";
import { SimpleLogs } from "@simplelogs/next";
import { flushServer } from "@simplelogs/next/server";

type DemoPayload = {
  touchpoint?: string;
  key?: string;
};

export async function POST(request: Request) {
  let payload: DemoPayload = {};

  try {
    payload = (await request.json()) as DemoPayload;
  } catch {
    payload = {};
  }

  const touchpoint = payload.touchpoint ?? "api_demo";
  const key = payload.key ?? "api_route_log";

  SimpleLogs.start({ key: "api_route_request", touchpoint });
  SimpleLogs.log({
    touchpoint,
    key,
    level: "info",
    message: "Server-side log captured from app/api/log-demo route handler",
    metadata: {
      method: "POST",
      timestamp: new Date().toISOString(),
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 50));

  SimpleLogs.end({ key: "api_route_request", touchpoint });
  await flushServer();

  return NextResponse.json({
    ok: true,
    message: "Server-side log and timing written from /api/log-demo",
  });
}
