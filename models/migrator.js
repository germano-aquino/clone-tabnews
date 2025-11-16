import database from "infra/database";
import migrationRunner from "node-pg-migrate";
import { resolve } from "node:path";

const migrationsOptions = {
  dir: resolve("infra", "migrations"),
  direction: "up",
  verbose: true,
  migrationsTable: "pgmigrations",
};

export async function listPendingMigrations() {
  let dbClient;

  try {
    dbClient = await database.getNewClient();

    const pendingMigrations = await migrationRunner({
      ...migrationsOptions,
      dbClient,
    });

    return pendingMigrations;
  } finally {
    dbClient?.end();
  }
}

export async function runPendingMigrations() {
  let dbClient;

  try {
    dbClient = await database.getNewClient();
    const migratedMigrations = await migrationRunner({
      ...migrationsOptions,
      dbClient,
      dryRun: false,
    });

    return migratedMigrations;
  } finally {
    dbClient?.end();
  }
}

const migrator = {
  listPendingMigrations,
  runPendingMigrations,
};

export default migrator;
