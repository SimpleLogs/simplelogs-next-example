"use client";

import { usePageLoadTime } from "@simplelogs/next";

export default function PageLoadTimeDemo() {
  usePageLoadTime({
    touchpoint: "perf/page-load",
    key: "home-page-load",
  });

  return (
    <p className="status-text">
      Fires once on mount. Measures navigation start → load event and sends a
      timing entry to SimpleLogs.
    </p>
  );
}
