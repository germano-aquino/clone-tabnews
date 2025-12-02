import activation from "models/activation";
import user from "models/user";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("PATCH /api/v1/activation/[token_id]", () => {
  describe("Anonymous user", () => {
    test("With nonexistent token", async () => {
      const invalidToken = "b2fbcc08-1c1e-44f3-855b-c308f9d25516";
      const response = await fetch(
        `http://localhost:3000/api/v1/activation/${invalidToken}`,
        {
          method: "PATCH",
        },
      );

      expect(response.status).toBe(404);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "NotFoundError",
        message:
          "O token de ativação não foi encontrado no sistema ou expirou.",
        action: "Faça um novo cadastro.",
        status_code: 404,
      });
    });

    test("With expired token", async () => {
      jest.useFakeTimers({
        now: new Date(Date.now() - activation.EXPIRATION_IN_MILLISECONDS),
      });

      const createdUser = await orchestrator.createUser();
      const expiredActivationToken = await activation.create(createdUser.id);

      jest.useRealTimers();

      const response = await fetch(
        `http://localhost:3000/api/v1/activation/${expiredActivationToken.id}`,
        {
          method: "PATCH",
        },
      );

      expect(response.status).toBe(404);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "NotFoundError",
        message:
          "O token de ativação não foi encontrado no sistema ou expirou.",
        action: "Faça um novo cadastro.",
        status_code: 404,
      });
    });

    test("With already used token", async () => {
      const createdUser = await orchestrator.createUser();
      const activationToken = await activation.create(createdUser.id);

      const response1 = await fetch(
        `http://localhost:3000/api/v1/activation/${activationToken.id}`,
        {
          method: "PATCH",
        },
      );

      expect(response1.status).toBe(200);

      const response2 = await fetch(
        `http://localhost:3000/api/v1/activation/${activationToken.id}`,
        {
          method: "PATCH",
        },
      );

      expect(response2.status).toBe(404);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        name: "NotFoundError",
        message:
          "O token de ativação não foi encontrado no sistema ou expirou.",
        action: "Faça um novo cadastro.",
        status_code: 404,
      });
    });

    test("With valid token", async () => {
      const createUser = await orchestrator.createUser({
        email: "activation.test@curso.dev",
        password: "activationTest",
      });

      const activationTokenObject =
        await orchestrator.createActivationToken(createUser);

      const response = await fetch(
        `http://localhost:3000/api/v1/activation/${activationTokenObject.id}`,
        {
          method: "PATCH",
        },
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: activationTokenObject.id,
        user_id: createUser.id,
        used_at: responseBody.used_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
        expires_at: responseBody.expires_at,
      });
      expect(Date.parse(responseBody.used_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.expires_at) > Date.now()).toBe(true);

      const expiresAt = new Date(responseBody.expires_at);
      const createdAt = new Date(responseBody.created_at);
      expect(
        expiresAt - createdAt - activation.EXPIRATION_IN_MILLISECONDS,
      ).toBeLessThan(100);

      const activatedUser = await user.findOneById(responseBody.user_id);

      expect(activatedUser.features).toEqual([
        "create:session",
        "read:session",
      ]);
    });

    test("With a valid token but already activated user", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const activationToken =
        await orchestrator.createActivationToken(createdUser);

      const response = await fetch(
        `http://localhost:3000/api/v1/activation/${activationToken.id}`,
        {
          method: "PATCH",
        },
      );

      expect(response.status).toBe(403);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não pode mais usar tokens de ativação.",
        action: "Entre em contato com o suporte.",
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("With activated user", async () => {
      const createUser = await orchestrator.createUser({
        email: "activated.test@curso.dev",
        password: "activatedTest",
      });

      const activationTokenObject =
        await orchestrator.createActivationToken(createUser);

      const activatedUser = await orchestrator.activateUser(createUser);

      const createSession = await orchestrator.createSession(activatedUser);

      const secondActivationResponse = await fetch(
        `http://localhost:3000/api/v1/activation/${activationTokenObject.id}`,
        {
          method: "PATCH",
          headers: {
            Cookie: `session_id=${createSession.token}`,
          },
        },
      );

      expect(secondActivationResponse.status).toBe(403);

      const secondActivationBody = await secondActivationResponse.json();

      expect(secondActivationBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação.",
        action:
          'Verifique se o seu usuário possui a feature "read:activation_token".',
        status_code: 403,
      });
    });

    test("With valid token, but already logged in user", async () => {
      const user1 = await orchestrator.createUser();
      await orchestrator.activateUser(user1);
      const user1Session = await orchestrator.createSession(user1);

      const user2 = await orchestrator.createUser();
      const user2ActivationToken = await activation.create(user2.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/activation/${user2ActivationToken.id}`,
        {
          method: "PATCH",
          headers: {
            Cookie: `session_id=${user1Session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação.",
        action:
          'Verifique se o seu usuário possui a feature "read:activation_token".',
        status_code: 403,
      });
    });
  });
});
