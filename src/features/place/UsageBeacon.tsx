"use client";

import { useEffect } from "react";
import { track } from "@/domain/usage-client";

export function UsageBeacon({ kind, detail }: { kind: Parameters<typeof track>[0]; detail: string }) {
  useEffect(() => {
    track(kind, detail);
  }, [kind, detail]);
  return null;
}
