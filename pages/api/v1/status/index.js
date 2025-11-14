import database from "infra/database.js";
import { InternalServerError } from "infra/errors";

async function status(request, response) {
  try {
    const updatedAt = new Date().toISOString();

    let result = await database.query("SHOW server_version;");
    const version = result.rows[0].server_version;

    result = await database.query("SHOW max_connections");
    const maxConnections = result.rows[0].max_connections;

    const databaseName = process.env.POSTGRES_DB;
    result = await database.query({
      text: "SELECT count(*)::int AS opened_connections FROM pg_stat_activity WHERE datname = $1",
      values: [databaseName],
    });
    const openedConnections = result.rows[0].opened_connections;

    response.status(200).json({
      updated_at: updatedAt,
      dependencies: {
        database: {
          version,
          max_connections: parseInt(maxConnections),
          opened_connections: openedConnections,
        },
      },
    });
  } catch (error) {
    const publicErrorObject = new InternalServerError({
      cause: error,
    });

    console.log("\nErro dentro do catch do controller:");
    console.error(publicErrorObject);

    response.status(500).json(publicErrorObject);
  }
}

export default status;
