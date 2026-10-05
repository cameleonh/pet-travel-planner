import { z } from "zod";

const coordinateSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
}).optional();

const httpsUrlSchema = z.string().url().refine((value) => {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
});

const placeSchema = z.object({
  name: z.string().trim().min(1).max(160),
  address: z.string().trim().max(300),
  policySourceText: z.string().max(5_000).optional(),
  policySourceUrl: httpsUrlSchema.nullable().optional(),
  policyObservedAt: z.string().datetime().nullable().optional(),
  plannedVisitAt: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  visitWindowStatus: z.enum(["within-hours", "outside-hours", "closed-day", "unknown"]).optional(),
  closingDayChecked: z.boolean().optional(),
  dwell: z.number().int().min(0).max(480).nullable().optional(),
  coordinates: coordinateSchema,
  operatingHours: z.object({
    useTime: z.string().max(500).nullable(),
    restDate: z.string().max(500).nullable(),
    fetchedAt: z.string().datetime().nullable(),
  }).nullable().optional(),
});

const routeSchema = z.object({
  fromName: z.string().trim().min(1).max(160),
  toName: z.string().trim().min(1).max(160),
  distanceKm: z.number().finite().min(0).max(10_000),
  durationMinutes: z.number().int().min(0).max(24 * 60).nullable(),
  routeMode: z.enum(["road", "approximate"]).optional(),
});

export const sharedPlanSchema = z.object({
  tripDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departure: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  arrival: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  places: z.array(placeSchema).min(1).max(12),
  routes: z.array(routeSchema).max(11),
}).strict();

export const sharedPlanRequestSchema = z.object({ plan: sharedPlanSchema }).strict();

export type SharedPlanData = z.infer<typeof sharedPlanSchema>;
