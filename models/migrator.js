import database from "infra/database";
import { ServiceError } from "infra/errors";
import migrationRunner from "node-pg-migrate";
import { resolve } from "node:path";

const migrationsOptions = {
  dryRun: true,
  dir: resolve("infra", "migrations"),
  direction: "up",
  verbose: false,
  log: () => {},
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
  } catch (error) {
    const migratorError = new ServiceError({
      cause: error,
      message: "Serviço de migração indisponível no momento.",
    });

    console.error(migratorError);
    throw migratorError;
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
  } catch (error) {
    const migratorError = new ServiceError({
      cause: error,
      message: "Serviço de migração indisponível no momento.",
    });

    console.error(migratorError);
    throw migratorError;
  } finally {
    dbClient?.end();
  }
}

const migrator = {
  listPendingMigrations,
  runPendingMigrations,
};

export default migrator;
