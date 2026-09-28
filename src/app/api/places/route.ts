import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/app/api/_shared/rate-limit";
import { ProviderConfigurationError } from "@/data/providers/provider";
import { loadPlaceSnapshot } from "@/data/providers";
import { buildCatalogPage } from "@/data/catalog";
import { compactCatalogForTransport } from "@/data/catalog-transport";
import { rawPlaceSchema } from "@/data/contracts";
import { conditionKeys, preparationFilterKeys, type ConditionKey, type PreparationFilterKey, type SelectedConstraint } from "@/domain/types";
import { SqlitePlaceRepository, resolveDatabasePath } from "@/data/database/repository";
import { getPlaceHoursBatch } from "@/app/api/_shared/place-hours";

const conditionSchema = z.enum(conditionKeys);
const categorySchema = rawPlaceSchema.shape.category;
const conditionListSchema = z.array(conditionSchema).max(conditionKeys.length).refine((keys) => new Set(keys).size === keys.length, "Duplicate conditions are not allowed.");
const preparationFilterSchema = z.enum(preparationFilterKeys as unknown as [string, ...string[]]);
const preparationFilterListSchema = z.array(preparationFilterSchema).max(preparationFilterKeys.length).refine((keys) => new Set(keys).size === keys.length, "Duplicate preparation filters are not allowed.");
const categoryListSchema = z.array(categorySchema).max(5).refine((keys) => new Set(keys).size === keys.length, "Duplicate categories are not allowed.");
const conditionLabels: Record<ConditionKey, string> = {
  smallDog: "소형견 가능",
  mediumDog: "중형견 가능",
  largeDog: "대형견 가능"
};

function parseConstraintList(raw: string | null, kind: SelectedConstraint["kind"]): SelectedConstraint[] {
  if (!raw) return [];
  return conditionListSchema.parse(raw.split(",").filter(Boolean)).map((key) => ({ key, label: conditionLabels[key], kind, protectedCategory: kind === "hard" ? "admission" : null }));
}

export async function GET(request: Request) {
  const requestId = randomUUID();
  try {
    const limited = enforceRateLimit(request);
    if (limited) return limited;
    const { snapshot, dataSource, notice } = await loadPlaceSnapshot();
    const url = new URL(request.url);
    const legacyHard = url.searchParams.get("conditions");
    const hard = parseConstraintList(url.searchParams.get("hard") ?? legacyHard, "hard");
    const preferences = parseConstraintList(url.searchParams.get("preferences"), "preference");
    const page = z.coerce.number().int().positive().max(10_000).default(1).parse(url.searchParams.get("page") ?? "1");
    const region = z.string().trim().max(40).default("").parse(url.searchParams.get("region") ?? "");
    const categoriesRaw = url.searchParams.get("categories");
    const categories = categoriesRaw ? categoryListSchema.parse(categoriesRaw.split(",").filter(Boolean)) : [];
    const prepFiltersRaw = url.searchParams.get("prep");
    const preparationFilters = (prepFiltersRaw ? preparationFilterListSchema.parse(prepFiltersRaw.split(",").filter(Boolean)) : []) as PreparationFilterKey[];
    const lang = z.enum(["ko", "en", "zh"]).default("ko").parse(url.searchParams.get("lang") ?? "ko");
    const placeSetParam = url.searchParams.get("placeSet");
    const placeSet = placeSetParam === "night-spots" || placeSetParam === "rural-stays" || placeSetParam === "accessible" ? placeSetParam as "night-spots" | "rural-stays" | "accessible" : undefined;
    let accessiblePlaceIds: ReadonlySet<string> | undefined;
    if (placeSet === "accessible") {
      try {
        const repo = new SqlitePlaceRepository(resolveDatabasePath());
        try {
          accessiblePlaceIds = new Set(repo.listAccessiblePlaceIds());
        } finally {
          repo.close();
        }
      } catch {
        // Fall back to the curated seed when the database is unavailable.
      }
    }
    const catalog = buildCatalogPage(snapshot, { hard, preferences, page, region, categories, preparationFilters, placeSet, accessiblePlaceIds });

    // Enrich results with accessibility, camping, congestion, and translation data when available
    const placeIds = catalog.results.map((result) => result.place.id);
    let accessibilityMap: Record<string, Record<string, string | undefined>> = {};
    let campingMap: Record<string, Record<string, unknown>> = {};
    let congestionMap: Record<string, { t_ats_nm: string; forecasts: { base_ymd: string; cnctr_rate: number }[] }> = {};
    let translationsMap: Record<string, { title: string | null; address: string | null; overview: string | null }> = {};
    try {
      const repo = new SqlitePlaceRepository(resolveDatabasePath());
      try {
        accessibilityMap = repo.loadAccessibilityBatch(placeIds);
        campingMap = repo.loadCampingBatch(placeIds);
        congestionMap = repo.loadCongestionBatch(placeIds);
        if (lang !== "ko") {
          translationsMap = repo.loadTranslationBatch(placeIds, lang);
        }
      } finally {
        repo.close();
      }
    } catch {
      // Enrichment is optional; skip silently if unavailable
    }

    return NextResponse.json({
      success: true,
      data: {
        provider: snapshot.provider,
        fetchedAt: snapshot.fetchedAt,
        catalog: compactCatalogForTransport(catalog),
        placeHours: getPlaceHoursBatch(placeIds),
        accessibility: accessibilityMap,
        camping: campingMap,
        congestion: congestionMap,
        translations: translationsMap,
        lang,
      },
      error: null,
      meta: { requestId, provider: snapshot.provider, dataSource, notice: notice ?? null },
    }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300", "Content-Language": lang, "X-Request-Id": requestId } });
  } catch (error) {
    const configurationError = error instanceof ProviderConfigurationError;
    const validationError = error instanceof z.ZodError;
    return NextResponse.json({ success: false, data: null, error: { code: configurationError ? error.code : validationError ? "INVALID_QUERY" : "PROVIDER_UNAVAILABLE", message: configurationError ? "데이터 제공자 설정을 확인해 주세요." : validationError ? "지원하는 검색 조건을 확인해 주세요." : "장소 정보를 불러오지 못했습니다." }, meta: { requestId } }, { status: configurationError ? 503 : validationError ? 400 : 502, headers: { "Content-Language": "ko", "X-Request-Id": requestId } });
  }
}
