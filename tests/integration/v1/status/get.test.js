import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

test("GET to /api/v1/status should return 200", async () => {
  const response = await fetch("http://localhost:3000/api/v1/status");
  expect(response.status).toBe(200);

  const responseBody = await response.json();

  const updatedAtParsed = new Date(responseBody.updated_at).toISOString();
  expect(updatedAtParsed).toBe(responseBody.updated_at);

  const databaseVersion = responseBody.dependencies.database.version;
  expect(databaseVersion).toBe("16.10");

  const maxConnections = responseBody.dependencies.database.max_connections;
  expect(maxConnections).toBe(100);

  const openedConnections =
    responseBody.dependencies.database.opened_connections;
  expect(openedConnections).toBe(1);
});
