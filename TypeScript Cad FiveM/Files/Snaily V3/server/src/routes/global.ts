import { NextFunction, Response, Router } from "express";
import { v4 } from "uuid";
import { processQuery } from "../lib/database";
import IRequest from "../interfaces/IRequest";
import { useAuth } from "../hooks";
import { RanksArr } from "../lib/constants";
import ICad from "../interfaces/ICad";
import { io } from "../server";
import Call from "../interfaces/Call";

const router: Router = Router();

export function mapCalls(calls: Call[]): Call[] {
  return calls.map((call) => {
    try {
      call.assigned_unit = JSON.parse(
        (typeof call.assigned_unit === "string" && call.assigned_unit) || "[]",
      );
    } catch {
      call.assigned_unit = [];
    }
    try {
      call.pos = JSON.parse(call.pos);
    } catch {
      call.pos = { x: 0, y: 0, z: 0 };
    }

    return call;
  });
}

router.get("/911-calls", async (_req: IRequest, res: Response) => {
  const calls = await processQuery<Call>("SELECT * FROM `911calls`");

  const mappedCalls = mapCalls(calls);

  return res.json({ calls: mappedCalls, status: "success" });
});

router.post("/911-calls", async (req: IRequest, res: Response) => {
  const id = v4();
  const { location, caller, coords: coordsArr } = req.body;
  const description = req.body.description ?? "No description provided";

  const coords = {
    x: coordsArr?.[0] || 0,
    y: coordsArr?.[1] || 0,
    z: coordsArr?.[2] || 0,
  };

  await processQuery<Call>(
    "INSERT INTO `911calls` (`id`, `description`, `name`, `location`, `status`, `assigned_unit`, `pos`, `hidden`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      description,
      caller,
      location,
      "Not assigned",
      "[]",
      JSON.stringify(coords),
      coordsArr ? "0" : "1",
    ],
  );

  io.sockets.emit("NEW_911_CALL");
  io.sockets.emit("UPDATE_911_CALLS");

  return res.json({ status: "success" });
});

router.post("/cad-info", useAuth, async (_req: IRequest, res: Response) => {
  const cadInfo = await processQuery<ICad>("SELECT * FROM `cad_info`");

  let features;

  try {
    features = JSON.parse(`${cadInfo[0].features}`);
  } catch {
    features = [];
  }

  return res.json({ cadInfo: { ...cadInfo[0], features }, status: "success" });
});

router.post("/update-aop", useAuth, adminOrDispatchAuth, async (req: IRequest, res: Response) => {
  const { aop } = req.body;

  await processQuery("UPDATE `cad_info` SET `aop` = ?", [aop]);

  return res.json({ status: "success" });
});

export async function adminOrDispatchAuth(
  req: IRequest,
  res: Response,
  next: NextFunction,
): Promise<void | Response> {
  const user: {
    dispatch: string;
    rank: string;
  }[] = await processQuery("SELECT `dispatch`, `rank` from `users` WHERE `id` = ?", [req.user?.id]);

  if (!user[0]) {
    return res.json({
      error: "user not found",
      status: "error",
    });
  }

  if (user[0].dispatch === "0" ?? !RanksArr.includes(user[0].rank)) {
    return res.json({
      error: "Forbidden",
      status: "error",
    });
  }

  next();
}

export default router;
