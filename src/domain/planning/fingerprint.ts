import type { PlanningRequestV1 } from "@/domain/planning/contracts";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function stableValue(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") return value;
  if (Array.isArray(value)) return value.map(stableValue);
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stableValue(child)] as const);
    return Object.fromEntries(entries);
  }
  return String(value);
}

export function canonicalRequestForFingerprint(request: PlanningRequestV1): string {
  const withoutVolatileFields = Object.fromEntries(Object.entries(request).filter(([key]) => key !== "revision" && key !== "locale"));
  const canonical = {
    ...withoutVolatileFields,
    selectedItems: [...request.selectedItems].sort((left, right) => left.id.localeCompare(right.id, "ko")),
  };
  return JSON.stringify(stableValue(canonical));
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createInputFingerprint(request: PlanningRequestV1): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalRequestForFingerprint(request));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${toHex(digest)}`;
}
