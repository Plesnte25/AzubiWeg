/**
 * Starts a local PostgreSQL for development without Docker or root access.
 * Binaries are downloaded on first run by the embedded-postgres package.
 * Data persists in server/.pgdata; stop with Ctrl+C (or kill) — the handler
 * shuts the cluster down cleanly so it survives restarts.
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const dataDir = path.resolve(import.meta.dirname, "..", ".pgdata");
const firstRun = !existsSync(dataDir);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "companion",
  password: "companion",
  port: 5433,
  persistent: true,
});

async function main() {
  if (firstRun) {
    console.log("Initialising PostgreSQL cluster in", dataDir);
    await pg.initialise();
  }
  await pg.start();
  if (firstRun) {
    await pg.createDatabase("companion");
  }
  console.log("PostgreSQL ready on port 5433 (db: companion, user: companion)");

  const stop = async () => {
    console.log("\nStopping PostgreSQL…");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
