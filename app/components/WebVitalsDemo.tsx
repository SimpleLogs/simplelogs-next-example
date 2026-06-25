"use client";

import { useWebVitals } from "@simplelogs/next";

export default function WebVitalsDemo() {
  useWebVitals({ vital: "lcp", touchpoint: "perf/web-vitals", key: "lcp" });
  useWebVitals({ vital: "fcp", touchpoint: "perf/web-vitals", key: "fcp" });
  useWebVitals({ vital: "ttfb", touchpoint: "perf/web-vitals", key: "ttfb" });
  useWebVitals({ vital: "cls", touchpoint: "perf/web-vitals", key: "cls" });

  return (
    <ul className="status-text" style={{ margin: 0, paddingLeft: "1.1rem" }}>
      <li>LCP — Largest Contentful Paint</li>
      <li>FCP — First Contentful Paint</li>
      <li>TTFB — Time to First Byte</li>
      <li>CLS — Cumulative Layout Shift (score, logged on unmount)</li>
    </ul>
  );
}
