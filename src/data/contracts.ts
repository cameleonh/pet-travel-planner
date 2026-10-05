import { z } from "zod";

export const coordinateSchema = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) });
export const sourceEvidenceSchema = z.object({ label: z.string().min(1), sourceText: z.string().min(1), sourceUrl: z.string().url(), observedAt: z.string().datetime() });
export const rawPlaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(["attraction", "restaurant", "cafe", "accommodation", "shopping"]),
  address: z.string().min(1),
  coordinates: coordinateSchema,
  petPolicy: sourceEvidenceSchema,
  amenities: z.array(z.string()).default([]),
  sourceModifiedAt: z.string().min(1).nullable().optional(),
  petDetailStatus: z.enum(["fetched", "not-fetched", "failed"]).optional(),
});
export const auxiliaryPlaceSchema = z.object({ id: z.string().min(1), name: z.string().min(1), category: z.enum(["museum", "park", "parking", "veterinary", "toilet"]), address: z.string().min(1), coordinates: coordinateSchema, petStatus: z.enum(["confirmed", "unknown"]), evidence: sourceEvidenceSchema, phone: z.string().min(1).optional(), weekdayHours: z.string().min(1).optional(), saturdayHours: z.string().min(1).optional(), sundayHours: z.string().min(1).optional(), closingDay: z.string().min(1).optional(), usageFee: z.string().min(1).optional() });
export const providerSnapshotSchema = z.object({ provider: z.enum(["fixture", "tour-api"]), fetchedAt: z.string().datetime(), sourceTotalCount: z.number().int().nonnegative().optional(), places: z.array(rawPlaceSchema), auxiliaryPlaces: z.array(auxiliaryPlaceSchema) });
export type RawPlace = z.infer<typeof rawPlaceSchema>;
export type AuxiliaryPlace = z.infer<typeof auxiliaryPlaceSchema>;
export type ProviderSnapshot = z.infer<typeof providerSnapshotSchema>;
