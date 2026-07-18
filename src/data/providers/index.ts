import { FixturePlaceProvider } from "@/data/providers/fixture-provider";
import type { ProviderSnapshot } from "@/data/contracts";
import type { PlaceProvider } from "@/data/providers/provider";
import { DatabasePlaceProvider } from "@/data/providers/database-provider";
import { TourApiPlaceProvider } from "@/data/providers/tour-api-provider";
export type ProviderSelection = { provider: PlaceProvider; notice?: string };
export type DataSource = "fixture" | "live" | "database";
export type LoadedPlaceSnapshot = { snapshot: ProviderSnapshot; dataSource: DataSource; notice?: string };
export function selectPlaceProvider(environment: Readonly<Record<string, string | undefined>> = process.env): ProviderSelection {
  const mode = environment.DATA_PROVIDER?.trim();
  if (!mode || mode === "fixture") return { provider: new FixturePlaceProvider() };
  if (mode === "tour-api") return { provider: new TourApiPlaceProvider({ apiKey: environment.TOUR_API_KEY, baseUrl: environment.TOUR_API_BASE_URL }) };
  if (mode === "database") return { provider: new DatabasePlaceProvider(environment.DATABASE_PATH) };
  return { provider: new FixturePlaceProvider(), notice: `Unsupported DATA_PROVIDER '${mode}' was replaced with the deterministic fixture provider.` };
}

export async function loadPlaceSnapshot(selection: ProviderSelection = selectPlaceProvider()): Promise<LoadedPlaceSnapshot> {
  try {
    return {
      snapshot: await selection.provider.getSnapshot(),
      dataSource: selection.provider.name === "database" ? "database" : selection.provider.name === "tour-api" ? "live" : "fixture",
      notice: selection.notice,
    };
  } catch (error) {
    if (selection.provider.name === "fixture") throw error;
    return {
      snapshot: await new FixturePlaceProvider().getSnapshot(),
      dataSource: "fixture",
      notice: selection.provider.name === "database"
        ? "저장된 관광 데이터가 아직 없어 검증용 데이터로 보여드려요. 데이터 동기화 후 자동으로 저장 데이터가 표시됩니다."
        : "공식 관광 데이터를 불러오지 못해 검증용 데이터로 전환했습니다. 잠시 후 다시 확인해 주세요.",
    };
  }
}
