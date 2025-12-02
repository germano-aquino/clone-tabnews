import database from "infra/database";
import email from "infra/email";
import { ForbiddenError, NotFoundError } from "infra/errors";
import webserver from "infra/webserver";
import user from "./user";
import authorization from "./authorization";

const EXPIRATION_IN_MILLISECONDS = 60 * 15 * 1000; // 15 minutes

async function create(userId) {
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  const newToken = await runInsertQuery(userId, expiresAt);
  return newToken;

  async function runInsertQuery(userId, expiresAt) {
    const results = await database.query({
      text: `
        INSERT INTO
          user_activation_tokens (user_id, expires_at)
        VALUES
          ($1, $2)
        RETURNING
          *
      ;`,
      values: [userId, expiresAt],
    });

    return results.rows[0];
  }
}

async function markTokenAsUsed(tokenId) {
  const activationTokenObject = await runUpdateQuery(tokenId);
  return activationTokenObject;

  async function runUpdateQuery(tokenId) {
    const results = await database.query({
      text: `
        UPDATE
          user_activation_tokens
        SET
          used_at = TIMEZONE('utc', NOW()),
          updated_at = TIMEZONE('utc', NOW())
        WHERE
          id = $1
          AND used_at IS NULL
          AND expires_at > NOW()
        RETURNING
          *
      ;`,
      values: [tokenId],
    });

    if (results.rowCount === 0) {
      throw new NotFoundError({
        message:
          "O token de ativação não foi encontrado no sistema ou expirou.",
        action: "Faça um novo cadastro.",
      });
    }

    return results.rows[0];
  }
}

async function activateUserByUserId(userId) {
  const userToActivate = await user.findOneById(userId);

  if (!authorization.can(userToActivate, "read:activation_token")) {
    throw new ForbiddenError({
      message: "Você não pode mais usar tokens de ativação.",
      action: "Entre em contato com o suporte.",
    });
  }

  const activatedUser = await user.setFeatures(userId, [
    "create:session",
    "read:session",
  ]);
  return activatedUser;
}

async function findOneValidById(tokenId) {
  const activationTokenObject = await runSelectQuery(tokenId);
  return activationTokenObject;

  async function runSelectQuery(tokenId) {
    const results = await database.query({
      text: `
        SELECT
          *
        FROM
          user_activation_tokens
        WHERE
          id = $1
          AND used_at IS NULL
          AND expires_at > NOW()
        LIMIT
          1
      ;`,
      values: [tokenId],
    });

    if (results.rowCount === 0) {
      throw new NotFoundError({
        message:
          "O token de ativação não foi encontrado no sistema ou expirou.",
        action: "Faça um novo cadastro.",
      });
    }
    return results.rows[0];
  }
}

async function sendEmailToUser(user, activationToken) {
  await email.send({
    from: "<contato@curso.dev>",
    to: user.email,
    subject: "Ative seu cadastro no clone tabnews.",
    text: `${user.username}, clique no link abaixo para ativar seu cadastro no ClomeTabnews:

${webserver.origin}/cadastro/ativar/${activationToken.id}

Atenciosamente,
Equipe clone tabnews`,
  });
}

const activation = {
  sendEmailToUser,
  findOneValidById,
  create,
  markTokenAsUsed,
  activateUserByUserId,
  EXPIRATION_IN_MILLISECONDS,
};

export default activation;
