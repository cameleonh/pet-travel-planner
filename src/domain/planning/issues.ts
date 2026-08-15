import type { PlanIssue, PlanIssueCode, PlanIssueSeverity, PlanningStageName, SessionNotice, SessionNoticeCode } from "@/domain/planning/contracts";

export function createPlanIssue(
  code: PlanIssueCode,
  severity: PlanIssueSeverity,
  stage: PlanningStageName,
  options: { itemId?: string | null; legId?: string | null; params?: Record<string, string | number | boolean | null> } = {},
): PlanIssue {
  return {
    code,
    severity,
    stage,
    itemId: options.itemId ?? null,
    legId: options.legId ?? null,
    params: options.params ?? {},
  };
}

export function createSessionNotice(code: SessionNoticeCode, params: Record<string, string | number | boolean | null> = {}): SessionNotice {
  return { code, params };
}

export function hasBlockingIssue(issues: readonly PlanIssue[]): boolean {
  return issues.some((issue) => issue.severity === "blocking");
}

export function hasWarningIssue(issues: readonly PlanIssue[]): boolean {
  return issues.some((issue) => issue.severity === "warning");
}

