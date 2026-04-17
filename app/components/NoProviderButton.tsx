"use client";

import { useEffect, useRef } from "react";
import { SimpleLogs } from "@simplelogs/next";

export default function NoProviderButton() {
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) {
      return;
    }

    SimpleLogs.init({
      clientKey: process.env.NEXT_PUBLIC_SIMPLELOGS_CLIENT_KEY,
      debug: true,
    });

    isInitialized.current = true;
  }, []);

  const onClick = () => {
    SimpleLogs.start({ key: "manual_init_button", touchpoint: "no_provider" });
    SimpleLogs.log({
      touchpoint: "no_provider",
      key: "button_click",
      level: "info",
      message: "Button clicked without provider after manual init",
      metadata: { pattern: "no-provider-manual-init" },
    });
    SimpleLogs.end({ key: "manual_init_button", touchpoint: "no_provider" });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="sl-button sl-button-ghost"
    >
      Send Log: No Provider (Manual Init)
    </button>
  );
}
