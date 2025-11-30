import database from "infra/database";
import password from "models/password.js";
import { ValidationError, NotFoundError } from "infra/errors";

export async function create(userInputValues) {
  await validateUniqueUsername(userInputValues.username);
  await validateUniqueEmail(userInputValues.email);
  await hashPasswordInObject(userInputValues);
  injectDefaultFeaturesInObject(userInputValues);

  const newUser = await runInsertQuery(userInputValues);
  return newUser;

  async function runInsertQuery(userInputValues) {
    const results = await database.query({
      text: `
      INSERT INTO 
        users (username, email, password, features) 
      VALUES
        ($1, $2, $3, $4)
      RETURNING
        *
      ;`,
      values: [
        userInputValues.username,
        userInputValues.email,
        userInputValues.password,
        userInputValues.features,
      ],
    });

    return results.rows[0];
  }

  function injectDefaultFeaturesInObject(userInputValues) {
    userInputValues.features = ["read:activation_token"];
  }
}

async function update(username, userInputValues) {
  const currentUser = await findOneByUsername(username);

  if ("username" in userInputValues) {
    const newUsername = userInputValues.username;
    if (newUsername.toLowerCase() !== username.toLowerCase()) {
      await validateUniqueUsername(userInputValues.username);
    }
  }

  if ("email" in userInputValues) {
    await validateUniqueEmail(userInputValues.email);
  }

  if ("password" in userInputValues) {
    await hashPasswordInObject(userInputValues);
  }

  const userWithNewValues = { ...currentUser, ...userInputValues };

  const updatedUser = await runUpdateQuery(userWithNewValues);
  return updatedUser;

  async function runUpdateQuery(userWithNewValues) {
    const results = await database.query({
      text: `
        UPDATE
          users
        SET
          username = $2,
          email = $3,
          password = $4,
          updated_at = timezone('utc', now())
        WHERE
          id = $1
        RETURNING
          *
      ;`,
      values: [
        userWithNewValues.id,
        userWithNewValues.username,
        userWithNewValues.email,
        userWithNewValues.password,
      ],
    });

    return results.rows[0];
  }
}

async function validateUniqueUsername(username) {
  const results = await database.query({
    text: `
      SELECT 
        email, username 
      FROM
        users
      WHERE
        LOWER(username) = LOWER($1)
      ;`,
    values: [username],
  });

  if (results.rowCount > 0) {
    throw new ValidationError({
      message: `O 'username' informado já está sendo utilizado.`,
      action: `Utilize outro 'username' para realizar esta operação.`,
    });
  }
}

async function validateUniqueEmail(email) {
  const results = await database.query({
    text: `
      SELECT 
        email, username 
      FROM
        users
      WHERE
        LOWER(email) = LOWER($1)
      ;`,
    values: [email],
  });

  if (results.rowCount > 0) {
    throw new ValidationError({
      message: `O 'email' informado já está sendo utilizado.`,
      action: `Utilize outro 'email' para realizar esta operação.`,
    });
  }
}

async function hashPasswordInObject(userInputValues) {
  const hashedPassword = await password.hash(userInputValues.password);
  userInputValues.password = hashedPassword;
}

export async function findOneById(username) {
  const userFound = runSelectQuery(username);

  return userFound;

  async function runSelectQuery(id) {
    const results = await database.query({
      text: `
      SELECT
        *
      FROM
        users
      WHERE
        id = $1
      LIMIT
        1
      ;`,
      values: [id],
    });

    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: `O 'id' informado não foi encontrado no sistema.`,
        action: `Verifique se o 'id' está digitado corretamente.`,
      });
    }
    return results.rows[0];
  }
}

export async function findOneByUsername(username) {
  const userFound = runSelectQuery(username);

  return userFound;

  async function runSelectQuery(username) {
    const results = await database.query({
      text: `
      SELECT
        *
      FROM
        users
      WHERE
        LOWER(username) = LOWER($1)
      LIMIT
        1
      ;`,
      values: [username],
    });

    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: `O 'username' informado não foi encontrado no sistema.`,
        action: `Verifique se o 'username' está digitado corretamente.`,
      });
    }
    return results.rows[0];
  }
}

async function findOneByEmail(email) {
  const userFound = runSelectQuery(email);

  return userFound;

  async function runSelectQuery(email) {
    const results = await database.query({
      text: `
      SELECT
        *
      FROM
        users
      WHERE
        LOWER(email) = LOWER($1)
      LIMIT
        1
      ;`,
      values: [email],
    });

    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: `O 'email' informado não foi encontrado no sistema.`,
        action: `Verifique se o 'email' está digitado corretamente.`,
      });
    }
    return results.rows[0];
  }
}

async function setFeatures(userId, features) {
  const updatedUser = await runUpdateQuery(userId);
  return updatedUser;

  async function runUpdateQuery(userId) {
    const results = await database.query({
      text: `
        UPDATE
          users
        SET
          features = $2,
          updated_at = TIMEZONE('utc', NOW())
        WHERE
          id = $1
        RETURNING
          *
      ;`,
      values: [userId, features],
    });

    return results.rows[0];
  }
}

const user = {
  create,
  update,
  setFeatures,
  findOneById,
  findOneByUsername,
  findOneByEmail,
};

export default user;
