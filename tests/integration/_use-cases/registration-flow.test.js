import webserver from "infra/webserver";
import activation from "models/activation";
import user from "models/user";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("Use case: Registration flow (all successfull)", () => {
  let createUserBody;
  let userActivationToken;

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

  test("Receive activation email", async () => {
    const lastEmail = await orchestrator.getLastEmail();

    expect(lastEmail.sender).toBe("<contato@curso.dev>");
    expect(lastEmail.recipients[0]).toBe("<registration.flow@curso.dev>");
    expect(lastEmail.subject).toBe("Ative seu cadastro no clone tabnews.");
    expect(lastEmail.text).toContain("RegistrationFlow");

    userActivationToken = orchestrator.extractUUID(lastEmail.text);

    const activationTokenObject =
      await activation.findOneValidById(userActivationToken);

    expect(lastEmail.text).toContain(
      `${webserver.origin}/cadastro/ativar/${userActivationToken}`,
    );

    expect(activationTokenObject.user_id).toBe(createUserBody.id);
    expect(activationTokenObject.used_at).toBe(null);
  });

  test("Activate account", async () => {
    const response = await fetch(
      `http://localhost:3000/api/v1/activation/${userActivationToken}`,
      {
        method: "PATCH",
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    const activatedUserObject =
      await user.findOneByUsername("RegistrationFlow");

    expect(Date.parse(responseBody.used_at)).not.toBeNaN();
    expect(new Date(responseBody.used_at) < Date.now()).toBe(true);
    expect(activatedUserObject.features).toEqual(["create:session"]);
  });

  test("Login", async () => {
    const createSessionResponse = await fetch(
      "http://localhost:3000/api/v1/sessions",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "registration.flow@curso.dev",
          password: "RegistrationFlowPassword",
        }),
      },
    );

    expect(createSessionResponse.status).toBe(201);

    const createSessionBody = await createSessionResponse.json();

    expect(createSessionBody.user_id).toBe(createUserBody.id);
  });

  test("Get user information", async () => {});
});
