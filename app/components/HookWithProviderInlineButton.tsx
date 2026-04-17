"use client";

import { useSimpleLogs } from "@simplelogs/next";

export default function HookWithProviderInlineButton() {
  const logger = useSimpleLogs();

  const onClick = () => {
    logger.start({ key: "inline_init_button", touchpoint: "provider_inline" });
    logger.log({
      touchpoint: "provider_inline",
      key: "button_click",
      level: "info",
      message: "Hook button clicked with provider inline initialization",
      metadata: { pattern: "provider-inline-init" },
    });
    logger.end({ key: "inline_init_button", touchpoint: "provider_inline" });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="sl-button sl-button-primary"
    >
      Send Log: Hook + Provider Inline Init
    </button>
  );
}
