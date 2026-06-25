"use client";

import { useComponentMountTime } from "@simplelogs/next";

export default function ComponentMountTimeDemo() {
  useComponentMountTime({
    touchpoint: "perf/component-mount",
    key: "home-component-mount",
  });

  return (
    <p className="status-text">
      Fires once on mount. Records elapsed time from navigation start to when
      this component first rendered.
    </p>
  );
}
