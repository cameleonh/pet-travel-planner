const fullSyncConfig = {
  TOUR_API_DETAIL_LIMIT: "900",
  TOUR_API_DETAIL_CONCURRENCY: "10",
  TOUR_API_SYNC_BATCHES: "20",
  TOUR_API_REQUEST_LIMIT: "20000",
  TOUR_API_REQUEST_INTERVAL_MS: "50",
};

async function main(): Promise<void> {
  Object.assign(process.env, fullSyncConfig);
  await import("./sync-tour-db");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown full synchronization error";
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exitCode = 1;
});

export {};
