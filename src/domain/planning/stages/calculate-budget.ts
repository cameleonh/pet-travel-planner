import type { BudgetSummary, PlanningItemSnapshot, PlanningRequestV1, RouteLeg } from "@/domain/planning/contracts";

export function calculateBudget(input: {
  request: PlanningRequestV1;
  includedItems: PlanningItemSnapshot[];
  legs: RouteLeg[];
}): BudgetSummary {
  const lines: BudgetSummary["lines"] = [];
  let knownTotalKrw = 0;
  let unknownItemCount = 0;

  for (const item of input.includedItems) {
    if (item.userCostKrw === null) {
      unknownItemCount += 1;
      continue;
    }
    const amount = Math.max(0, Math.round(item.userCostKrw));
    lines.push({
      id: `item:${item.id}`,
      itemId: item.id,
      labelCode: "ITEM_COST",
      labelParams: { name: item.name },
      amountKrw: amount,
      source: "user",
      includedInTotal: true,
    });
    knownTotalKrw += amount;
  }

  for (const leg of input.legs) {
    if (!input.request.settings.includeTollsInBudget) continue;
    if (leg.cost.tollFeeKrw === null) continue;
    const amount = Math.max(0, Math.round(leg.cost.tollFeeKrw));
    lines.push({
      id: `toll:${leg.id}`,
      itemId: null,
      labelCode: "TOLL_FEE",
      labelParams: { legId: leg.id },
      amountKrw: amount,
      source: "routing-provider",
      includedInTotal: true,
    });
    knownTotalKrw += amount;
  }

  for (const leg of input.legs) {
    if (leg.cost.taxiFareKrw === null) continue;
    lines.push({
      id: `taxi:${leg.id}`,
      itemId: null,
      labelCode: "TAXI_FARE_REFERENCE",
      labelParams: { legId: leg.id },
      amountKrw: leg.cost.taxiFareKrw,
      source: "routing-provider",
      includedInTotal: false,
    });
  }

  const budget = input.request.settings.budgetKrw;
  const remainingKrw = budget === null ? null : budget - knownTotalKrw;
  const overBudget = budget === null ? "unknown" : knownTotalKrw > budget ? "yes" : "no";
  return { knownTotalKrw, unknownItemCount, remainingKrw, overBudget, lines };
}
