import { createRouter } from "next-connect";
import controller from "infra/controller";
import user from "models/user.js";

const router = createRouter({});

router.get(getHandler).patch(patchHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const username = request.query.username;
  const result = await user.findOneByUsername(username);

  return response.status(200).json(result);
}

async function patchHandler(request, response) {
  const username = request.query.username;
  const userInputValues = request.body;

  const result = await user.update(username, userInputValues);
  return response.status(200).json(result);
}
