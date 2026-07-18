import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { SqlitePlaceRepository, resolveDatabasePath } from "../src/data/database/repository";

async function main(): Promise<void> {
  const source = resolveDatabasePath();
  if (!existsSync(source)) throw new Error(`Database file does not exist: ${source}`);
  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const destination = resolve(process.env.DATABASE_BACKUP_DIR?.trim() || join(".data", "backups"), `pet-travel-${timestamp}.sqlite`);
  const repository = new SqlitePlaceRepository(source);
  try {
    await repository.backup(destination);
    console.log(JSON.stringify({ ok: true, source, destination }));
  } finally {
    repository.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown backup error";
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exitCode = 1;
});
