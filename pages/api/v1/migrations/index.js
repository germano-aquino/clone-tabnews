import { createRouter } from "next-connect";
import database from "infra/database";
import controller from "infra/controller";
import migrationRunner from "node-pg-migrate";
import { resolve } from "node:path";

const router = createRouter({});

router.get(getHandler).post(postHandler);

export default router.handler(controller.errorHandlers);

async function getMigrationsObject(dbClient, dryRun = true) {
  const migrationsOptions = {
    dbClient,
    dryRun,
    dir: resolve("infra", "migrations"),
    direction: "up",
    verbose: true,
    migrationsTable: "pgmigrations",
  };

  const migrationsObject = await migrationRunner(migrationsOptions);

  return migrationsObject;
}

async function getHandler(request, response) {
  let dbClient;

  try {
    dbClient = await database.getNewClient();

    const pendingMigrations = await getMigrationsObject(dbClient);

    return response.status(200).json(pendingMigrations);
  } finally {
    dbClient.end();
  }
}

async function postHandler(request, response) {
  let dbClient;

  try {
    dbClient = await database.getNewClient();

    const migratedMigrations = await getMigrationsObject(dbClient, false);

    if (migratedMigrations.length > 0) {
      return response.status(201).json(migratedMigrations);
    }

    return response.status(200).json(migratedMigrations);
  } finally {
    dbClient.end();
  }
}
