import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { SqlitePlaceRepository } from "@/data/database/repository";
import { runDetailEnrichment } from "@/data/database/enrichment";
import { syncProviderSnapshot } from "@/data/database/sync";
import { FixturePlaceProvider } from "@/data/providers/fixture-provider";
import { migrations } from "@/data/database/schema";

const directories: string[] = [];

function temporaryDatabase(): { directory: string; path: string } {
  const directory = mkdtempSync(join(tmpdir(), "pet-travel-db-"));
  directories.push(directory);
  return { directory, path: join(directory, "places.sqlite") };
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("SQLite place repository", () => {
  it("migrates a real file and round-trips the validated fixture snapshot", async () => {
    const { path } = temporaryDatabase();
    const repository = new SqlitePlaceRepository(path);
    const source = await new FixturePlaceProvider().getSnapshot();

    const result = await syncProviderSnapshot(new FixturePlaceProvider(), repository);
    const restored = repository.loadLatestSnapshot();

    expect(repository.getMigrationVersions()).toEqual([1, 2]);
    expect(result).toMatchObject({ places: 2, auxiliaryPlaces: 5 });
    expect(restored).toEqual(source);
    expect(repository.getCounts()).toEqual({ successfulRuns: 1, snapshots: 1, places: 2, auxiliaryPlaces: 5 });
    repository.close();
  });

  it("upgrades an existing migration-1 database without losing its snapshot", async () => {
    const { path } = temporaryDatabase();
    const legacy = new Database(path);
    legacy.pragma("foreign_keys = ON");
    legacy.exec(migrations[0]!.up);
    legacy.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (1, ?, ?)").run("initial_snapshot_store", new Date().toISOString());
    legacy.close();

    const repository = new SqlitePlaceRepository(path);
    expect(repository.getMigrationVersions()).toEqual([1, 2]);
    expect(repository.loadLatestSnapshot()).toBeNull();
    repository.close();
  });

  it("keeps append-only snapshots and serves the latest successful one after a failed sync", async () => {
    const { path } = temporaryDatabase();
    const repository = new SqlitePlaceRepository(path);
    await syncProviderSnapshot(new FixturePlaceProvider(), repository);
    const first = repository.loadLatestSnapshot();
    const secondProvider = {
      name: "fixture" as const,
      getSnapshot: async () => ({ ...await new FixturePlaceProvider().getSnapshot(), fetchedAt: "2026-07-16T10:00:00.000Z" }),
    };
    await syncProviderSnapshot(secondProvider, repository);

    await expect(syncProviderSnapshot({
      name: "fixture" as const,
      getSnapshot: async () => { throw new Error("upstream unavailable"); },
    }, repository)).rejects.toThrow("upstream unavailable");

    expect(repository.getCounts()).toMatchObject({ successfulRuns: 2, snapshots: 2, places: 4 });
    expect(repository.loadLatestSnapshot()?.fetchedAt).toBe("2026-07-16T10:00:00.000Z");
    expect(first?.places).toHaveLength(2);
    repository.close();
  });

  it("returns null for an empty migrated database and rejects partial invalid publication", async () => {
    const { path } = temporaryDatabase();
    const repository = new SqlitePlaceRepository(path);
    expect(repository.loadLatestSnapshot()).toBeNull();
    const runId = repository.startSync("fixture");
    const fixture = await new FixturePlaceProvider().getSnapshot();
    expect(() => repository.publishSnapshot(runId, {
      ...fixture,
      places: [{ ...(fixture.places[0]!), coordinates: { latitude: 91, longitude: 128 } }],
    })).toThrow();
    expect(repository.getCounts()).toMatchObject({ successfulRuns: 0, snapshots: 0, places: 0 });
    repository.close();
  });

  it("creates an online backup that reopens with integrity intact", async () => {
    const { directory, path } = temporaryDatabase();
    const destination = join(directory, "backup.sqlite");
    const repository = new SqlitePlaceRepository(path);
    await syncProviderSnapshot(new FixturePlaceProvider(), repository);
    await repository.backup(destination);
    repository.close();

    const backup = new Database(destination, { readonly: true });
    expect(backup.pragma("integrity_check", { simple: true })).toBe("ok");
    expect((backup.prepare("SELECT count(*) AS count FROM places").get() as { count: number }).count).toBe(2);
    backup.close();
  });

  it("advances detail coverage across bounded batches using each published snapshot as the next checkpoint", async () => {
    const { path } = temporaryDatabase();
    const repository = new SqlitePlaceRepository(path);
    const fixture = await new FixturePlaceProvider().getSnapshot();
    const places = ["1", "2", "3"].map((id) => ({
      ...fixture.places[0]!,
      id: `tour-api:${id}`,
      name: `장소 ${id}`,
      petDetailStatus: "not-fetched" as const,
    }));
    await syncProviderSnapshot({
      name: "tour-api" as const,
      getSnapshot: async () => ({ ...fixture, provider: "tour-api" as const, places, auxiliaryPlaces: [] }),
    }, repository);
    const seenCoverage: number[] = [];

    const result = await runDetailEnrichment({
      repository,
      maxBatches: 2,
      createProvider: (cachedPlaces) => ({
        name: "tour-api" as const,
        getSnapshot: async () => {
          const fetchedBefore = cachedPlaces.filter((place) => place.petDetailStatus === "fetched").length;
          seenCoverage.push(fetchedBefore);
          return {
            ...fixture,
            provider: "tour-api" as const,
            fetchedAt: new Date(Date.parse(fixture.fetchedAt) + (fetchedBefore + 1) * 1_000).toISOString(),
            sourceTotalCount: cachedPlaces.length,
            auxiliaryPlaces: [],
            places: cachedPlaces.map((place, index) => index === fetchedBefore ? { ...place, petDetailStatus: "fetched" as const } : place),
          };
        },
      }),
    });

    expect(seenCoverage).toEqual([0, 1]);
    expect(result).toMatchObject({
      batchesCompleted: 2,
      stopReason: "batch-limit",
      before: { fetched: 0, pending: 3, failed: 0, total: 3 },
      after: { fetched: 2, pending: 1, failed: 0, total: 3 },
    });
    expect(repository.loadLatestSnapshot()?.places.filter((place) => place.petDetailStatus === "fetched")).toHaveLength(2);
    repository.close();
  });

  it("stops a multi-batch enrichment after the first published batch makes no progress", async () => {
    const { path } = temporaryDatabase();
    const repository = new SqlitePlaceRepository(path);
    const fixture = await new FixturePlaceProvider().getSnapshot();
    const pendingSnapshot = {
      ...fixture,
      provider: "tour-api" as const,
      auxiliaryPlaces: [],
      places: fixture.places.map((place) => ({ ...place, petDetailStatus: "not-fetched" as const })),
    };
    await syncProviderSnapshot({ name: "tour-api" as const, getSnapshot: async () => pendingSnapshot }, repository);
    let calls = 0;

    const result = await runDetailEnrichment({
      repository,
      maxBatches: 5,
      createProvider: () => ({
        name: "tour-api" as const,
        getSnapshot: async () => {
          calls += 1;
          return { ...pendingSnapshot, fetchedAt: new Date(Date.parse(pendingSnapshot.fetchedAt) + calls * 1_000).toISOString() };
        },
      }),
    });

    expect(calls).toBe(1);
    expect(result).toMatchObject({ batchesCompleted: 1, stopReason: "no-progress" });
    repository.close();
  });

  it("keeps the latest successful checkpoint when an enrichment batch aborts on quota", async () => {
    const { path } = temporaryDatabase();
    const repository = new SqlitePlaceRepository(path);
    await syncProviderSnapshot(new FixturePlaceProvider(), repository);
    const checkpoint = repository.loadLatestSnapshot();

    await expect(runDetailEnrichment({
      repository,
      maxBatches: 1,
      createProvider: () => ({
        name: "tour-api" as const,
        getSnapshot: async () => { throw new Error("Tour API returned result code 22: quota exhausted"); },
      }),
    })).rejects.toThrow("result code 22");

    expect(repository.loadLatestSnapshot()).toEqual(checkpoint);
    expect(repository.getCounts()).toMatchObject({ successfulRuns: 1, snapshots: 1 });
    repository.close();
  });
});
