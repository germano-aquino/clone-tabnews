import database from "infra/database";
import { ValidationError } from "infra/errors";

export async function create(userInputValues) {
  await validateUniqueFields(userInputValues.email, userInputValues.username);

  const newUser = await runInsertQuery(userInputValues);
  return newUser;

  async function validateUniqueFields(email, username) {
    const results = await database.query({
      text: `
      SELECT 
        email, username 
      FROM
        users
      WHERE
        LOWER(email) = LOWER($1)
      OR
        LOWER(username) = LOWER($2)
      ;`,
      values: [email, username],
    });

    if (results.rowCount > 0) {
      throw new ValidationError({
        message: `O 'username' ou 'email' informado já está sendo utilizado.`,
        action: `Utilize outro 'username' ou 'email' para realizar o cadastro.`,
      });
    }
  }

  async function runInsertQuery(userInputValues) {
    const results = await database.query({
      text: `
      INSERT INTO 
        users (username, email, password) 
      VALUES
        ($1, $2, $3)
      RETURNING
        *
      ;`,
      values: [
        userInputValues.username,
        userInputValues.email,
        userInputValues.password,
      ],
    });

    return results.rows[0];
  }
}

const user = {
  create,
};

export default user;
