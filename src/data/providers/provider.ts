import type { ProviderSnapshot } from "@/data/contracts";
export type PlaceProviderName = ProviderSnapshot["provider"] | "database";
export interface PlaceProvider { readonly name: PlaceProviderName; getSnapshot(): Promise<ProviderSnapshot>; }
export class ProviderConfigurationError extends Error { readonly code = "PROVIDER_CONFIGURATION_ERROR"; constructor(message: string) { super(message); this.name = "ProviderConfigurationError"; } }
export class EmptyDatabaseError extends Error { readonly code = "EMPTY_DATABASE"; constructor() { super("No successful place snapshot exists in the database."); this.name = "EmptyDatabaseError"; } }
