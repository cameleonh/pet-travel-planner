import { describe, expect, it } from "vitest";
import type { PlanningRequestV1 } from "@/domain/planning/contracts";
import { applyPlannerCommand, applyPlanningEvent, createPlanningSession } from "@/domain/planning/session";

function request(): PlanningRequestV1 {
  const item = (id: string, lat: number) => ({
    id, name: id, address: null, category: "place" as const, role: "core" as const, kind: "place" as const,
    selectedAt: "2026-08-15T00:00:00+09:00", source: { provider: "catalog" as const, sourceId: id, observedAt: null, sourceUrl: null }, coordinates: { latitude: lat, longitude: 127 },
    qualification: { status: "exact-match" as const, queryFingerprint: "q", hardConstraintKeys: [], proof: [] },
    petAdmission: { status: "confirmed" as const, evidenceText: "yes", needsConfirmation: false }, activityWindow: null, userDwellMinutes: null, userCostKrw: null,
  });
  return {
    schemaVersion: 1, planId: "session", revision: 0, locale: "ko", timeZone: "Asia/Seoul", region: "대전", qualificationContext: {
      queryFingerprint: "q", dataSnapshotId: "d", matchRuleVersion: "v1", petProfileRevision: 1, hardConstraintKeys: [], preferenceKeys: [], categoryKeys: [], preparationFilterKeys: [], petProfile: { size: null, weightKg: null, dangerousDog: false },
    }, selectedItems: [item("a", 36), item("b", 36.1)], includedItemIds: ["a", "b"], orderedItemIds: ["a", "b"], nearbyAnchorId: "a", startItemId: "a", endPolicy: "last-item",
    settings: { tripDate: "2026-08-20", startTime: "09:00", dayEndTime: null, transportMode: "car", pace: "balanced", orderMode: "saved", defaultDwellMinutes: 90, defaultDwellSource: "preset", budgetKrw: null, includeTollsInBudget: true },
  };
}

describe("planning session reducer", () => {
  it("requires both supplemental reviews before course confirmation", () => {
    let session = createPlanningSession(request());
    expect(session.phase).toBe("supplemental-review");
    session = applyPlanningEvent(session, { type: "COMPLETE_SELECTION" });
    session = applyPlanningEvent(session, { type: "COMPLETE_REGIONAL_REVIEW", region: "대전" });
    expect(session.phase).toBe("supplemental-review");
    session = applyPlanningEvent(session, { type: "COMPLETE_NEARBY_REVIEW", anchorItemId: "a" });
    expect(session.phase).toBe("course-config");
    session = applyPlanningEvent(session, { type: "CONFIRM_COURSE" });
    expect(session.phase).toBe("plan-setup");
  });

  it("reconciles removing the start item atomically", () => {
    const session = createPlanningSession(request());
    const next = applyPlannerCommand(session, { type: "REMOVE_ITEM", itemId: "a" });
    expect(next.request.selectedItems.map((item) => item.id)).toEqual(["b"]);
    expect(next.request.includedItemIds).toEqual(["b"]);
    expect(next.request.orderedItemIds).toEqual(["b"]);
    expect(next.request.startItemId).toBe("b");
    expect(next.request.nearbyAnchorId).toBeNull();
  });

  it("does not commit a stale generation envelope", () => {
    let session = createPlanningSession(request());
    session = applyPlanningEvent(session, { type: "COMPLETE_REGIONAL_REVIEW", region: "대전" });
    session = applyPlanningEvent(session, { type: "COMPLETE_NEARBY_REVIEW", anchorItemId: "a" });
    session = applyPlanningEvent(session, { type: "CONFIRM_COURSE" });
    session = applyPlanningEvent(session, { type: "GENERATION_STARTED", generationId: "g1", inputRevision: 0, inputFingerprint: "f1" });
    const stale = applyPlanningEvent(session, { type: "COMMIT_GENERATION", envelope: { generationId: "g2", inputRevision: 0, inputFingerprint: "f2", outcome: { kind: "rejected", issues: [] } } });
    expect(stale.phase).toBe("generating");
    expect(stale.notices.at(-1)?.code).toBe("STALE_GENERATION");
  });

  it("keeps a user dwell value when pace changes", () => {
    let session = createPlanningSession(request());
    session = applyPlannerCommand(session, { type: "SET_DEFAULT_DWELL", minutes: 150 });
    session = applyPlannerCommand(session, { type: "SET_PACE", pace: "packed" });
    expect(session.request.settings.defaultDwellMinutes).toBe(150);
    expect(session.request.settings.defaultDwellSource).toBe("user");
  });
});
