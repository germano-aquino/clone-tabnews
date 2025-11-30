import webserver from "infra/webserver";
import activation from "models/activation";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("Use case: Registration flow (all successfull)", () => {
  let createUserBody;
  test("Create user account", async () => {
    const createUserResponse = await fetch(
      "http://localhost:3000/api/v1/users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "RegistrationFlow",
          email: "registration.flow@curso.dev",
          password: "RegistrationFlowPassword",
        }),
      },
    );

    expect(createUserResponse.status).toBe(201);

    createUserBody = await createUserResponse.json();

    expect(createUserBody).toEqual({
      id: createUserBody.id,
      username: "RegistrationFlow",
      email: "registration.flow@curso.dev",
      features: ["read:activation_token"],
      password: createUserBody.password,
      created_at: createUserBody.created_at,
      updated_at: createUserBody.updated_at,
    });
  });

  test("Send activation email", async () => {
    const lastEmail = await orchestrator.getLastEmail();

    expect(lastEmail.sender).toBe("<contato@curso.dev>");
    expect(lastEmail.recipients[0]).toBe("<registration.flow@curso.dev>");
    expect(lastEmail.subject).toBe("Ative seu cadastro no clone tabnews.");
    expect(lastEmail.text).toContain("RegistrationFlow");

    const userActivationToken = orchestrator.extractUUID(lastEmail.text);

    const activationTokenObject =
      await activation.findOneValidById(userActivationToken);

    expect(lastEmail.text).toContain(
      `${webserver.origin}/cadastro/ativar/${userActivationToken}`,
    );

    expect(activationTokenObject.user_id).toBe(createUserBody.id);
    expect(activationTokenObject.used_at).toBe(null);
  });

  test("Activate account", async () => {});

  test("Login", async () => {});

  test("Get user information", async () => {});
});
