import { describe, expect, it } from "vitest";
import type { PlanningItemSnapshot, PlanningRequestV1 } from "@/domain/planning/contracts";
import { generateTravelPlan } from "@/domain/planning/orchestrator";
import { createInputFingerprint } from "@/domain/planning/fingerprint";
import { addKstMinutes, formatKstInstant, formatProviderDeparture, parseKstDateTime } from "@/domain/planning/kst-time";

const context = {
  queryFingerprint: "query:fixture",
  dataSnapshotId: "catalog:fixture",
  matchRuleVersion: "match-v1",
  petProfileRevision: 1,
  hardConstraintKeys: ["smallDog"],
  preferenceKeys: [],
  categoryKeys: ["숙소"],
  preparationFilterKeys: [],
  petProfile: { size: "smallDog" as const, weightKg: 6, dangerousDog: false },
};

function item(id: string, name: string, latitude: number, longitude: number, role: PlanningItemSnapshot["role"] = "core"): PlanningItemSnapshot {
  return {
    id,
    name,
    address: `${name} 주소`,
    category: "숙소",
    role,
    kind: role === "core" ? "place" : "trail",
    selectedAt: "2026-08-15T00:00:00+09:00",
    source: { provider: role === "core" ? "catalog" : "trail-db", sourceId: id, observedAt: null, sourceUrl: null },
    coordinates: role === "core" ? { latitude, longitude } : null,
    qualification: {
      status: role === "core" ? "exact-match" : "not-applicable",
      queryFingerprint: role === "core" ? context.queryFingerprint : null,
      hardConstraintKeys: role === "core" ? ["smallDog"] : [],
      proof: [],
    },
    petAdmission: role === "core"
      ? { status: "confirmed", evidenceText: "반려견 동반 가능", needsConfirmation: false }
      : { status: "unverified", evidenceText: null, needsConfirmation: true },
    activityWindow: role === "core" ? null : { startsOn: null, endsOn: null, opensAt: null, closesAt: null, officialDurationMinutes: 60 },
    userDwellMinutes: null,
    userCostKrw: role === "core" && id === "a" ? 12000 : null,
  };
}

function request(overrides: Partial<PlanningRequestV1> = {}): PlanningRequestV1 {
  const selectedItems = [item("a", "첫 장소", 36.35, 127.38), item("b", "둘째 장소", 36.36, 127.39)];
  return {
    schemaVersion: 1,
    planId: "plan-fixture",
    revision: 2,
    locale: "ko",
    timeZone: "Asia/Seoul",
    region: "대전광역시",
    qualificationContext: context,
    selectedItems,
    includedItemIds: ["a", "b"],
    orderedItemIds: ["a", "b"],
    nearbyAnchorId: "a",
    startItemId: "a",
    endPolicy: "last-item",
    settings: {
      tripDate: "2026-08-20",
      startTime: "09:00",
      dayEndTime: "18:00",
      transportMode: "car",
      pace: "balanced",
      orderMode: "saved",
      defaultDwellMinutes: 90,
      defaultDwellSource: "preset",
      budgetKrw: 20000,
      includeTollsInBudget: true,
    },
    ...overrides,
  };
}

describe("local-first planning engine", () => {
  it("creates a deterministic coordinate-only partial plan without provider keys", async () => {
    const first = await generateTravelPlan(request(), { now: () => Date.UTC(2026, 7, 15) });
    const second = await generateTravelPlan(request(), { now: () => Date.UTC(2026, 7, 15) });
    expect(first.outcome.kind).toBe("generated");
    expect(second.outcome.kind).toBe("generated");
    if (first.outcome.kind !== "generated" || second.outcome.kind !== "generated") return;
    expect(first.outcome.plan.inputFingerprint).toBe(second.outcome.plan.inputFingerprint);
    expect(first.outcome.plan.status).toBe("partial");
    expect(first.outcome.plan.legs[0]?.basis).toBe("coordinate-only");
    expect(first.outcome.plan.legs[0]?.durationMinutes).toBeNull();
    expect(first.outcome.plan.scheduleSummary.endsAt).toBeNull();
    expect(first.outcome.plan.report.movements[0]?.arrivalAt).toBeNull();
    expect(first.outcome.plan.budget.knownTotalKrw).toBe(12000);
    expect(first.outcome.plan.budget.remainingKrw).toBe(8000);
  });

  it("keeps a selected coordinate-less supplemental item outside the route", async () => {
    const supplemental = item("trail-1", "산책로", 0, 0, "supplemental");
    const result = await generateTravelPlan(request({
      selectedItems: [...request().selectedItems, supplemental],
      includedItemIds: ["a", "b", "trail-1"],
    }));
    expect(result.outcome.kind).toBe("generated");
    if (result.outcome.kind !== "generated") return;
    expect(result.outcome.plan.unscheduledItemIds).toEqual(["trail-1"]);
    expect(result.outcome.plan.report.unscheduled[0]?.reasonCode).toBe("ITEM_WITHOUT_COORDINATES");
    expect(result.outcome.plan.report.confirmationItemIds).toContain("trail-1");
  });

  it("rejects a core item from a different qualification query", async () => {
    const different = item("b", "둘째 장소", 36.36, 127.39);
    different.qualification.queryFingerprint = "query:other";
    const result = await generateTravelPlan(request({ selectedItems: [item("a", "첫 장소", 36.35, 127.38), different] }));
    expect(result.outcome.kind).toBe("rejected");
    if (result.outcome.kind === "rejected") expect(result.outcome.issues.map((issue) => issue.code)).toContain("QUALIFICATION_CONTEXT_MISMATCH");
  });

  it("uses KST arithmetic independently of the browser timezone", () => {
    const start = parseKstDateTime("2026-08-20", "23:40");
    expect(formatKstInstant(addKstMinutes(start, 50))).toBe("2026-08-21T00:30+09:00");
    expect(formatProviderDeparture(start)).toBe("202608202340");
  });

  it("fingerprints equivalent requests with different locale/revision identically", async () => {
    const ko = request();
    const zh = request({ locale: "zh", revision: 99 });
    expect(await createInputFingerprint(ko)).toBe(await createInputFingerprint(zh));
  });
});
