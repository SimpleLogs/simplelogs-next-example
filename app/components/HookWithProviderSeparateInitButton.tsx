"use client";

import { SimpleLogsClientInit, useSimpleLogs } from "@simplelogs/next";

export default function HookWithProviderSeparateInitButton() {
  const logger = useSimpleLogs();

  const onClick = () => {
    logger.start({
      key: "separate_init_button",
      touchpoint: "provider_separate",
    });
    logger.log({
      touchpoint: "provider_separate",
      key: "button_click",
      level: "info",
      message: "Hook button clicked with separate client initialization",
      metadata: { pattern: "provider-separate-init" },
    });
    logger.end({
      key: "separate_init_button",
      touchpoint: "provider_separate",
    });
  };

  return (
    <>
      <SimpleLogsClientInit />
      <button
        type="button"
        onClick={onClick}
        className="sl-button sl-button-secondary"
      >
        Send Log: Hook + Provider Separate Init
      </button>
    </>
  );
}
