import { Response, Router } from "express";
import { processQuery } from "../lib/database";
import { useAuth } from "../hooks";
import { v4 as uuidv4 } from "uuid";
import IRequest from "../interfaces/IRequest";
import { io } from "../server";
const router: Router = Router();

router.get("/", useAuth, async (_, res: Response) => {
  const calls = await processQuery("SELECT * FROM `tow_calls`");

  return res.json({ status: "success", calls });
});

router.post("/", async (req: IRequest, res: Response) => {
  const { description, location, caller } = req.body;
  const id = uuidv4();

  await processQuery(
    "INSERT INTO `tow_calls` (`id`, `description`, `name`, `location`) VALUES (?, ?, ?, ?)",
    [id, description, caller, location],
  );

  io.sockets.emit("UPDATE_TOW_CALLS");

  const calls = await processQuery("SELECT * FROM `tow_calls`");

  return res.json({ status: "success", calls });
});

router.delete("/:id", useAuth, async (req: IRequest, res: Response) => {
  const { id } = req.params;

  await processQuery("DELETE FROM `tow_calls` WHERE `id` = ?", [id]);

  const calls = await processQuery("SELECT * FROM `tow_calls`");

  return res.json({ status: "success", calls });
});

export default router;
