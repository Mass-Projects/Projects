import { Response, Router } from "express";
import { processQuery } from "../lib/database";
import { useAuth } from "../hooks";
import IRequest from "../interfaces/IRequest";
// import { v4 } from "uuid";
import IUser from "../interfaces/IUser";
import Citizen from "../interfaces/Citizen";
import Logger from "../lib/Logger";
import Officer from "../interfaces/Officer";
import usePermission from "../hooks/usePermission";
import { createNotification } from "./notifications";
import { v4 } from "uuid";
import Code10 from "../interfaces/Code10";
const router: Router = Router();

export interface Item {
  value: string;
  label: string;
}

export function parse10Codes(codes: Code10[]): Code10[] {
  return codes.map((code) => {
    code.what_pages = JSON.parse(`${code.what_pages}`);

    return code;
  });
}

/* Cad settings */
router.put(
  "/cad-settings",
  useAuth,
  usePermission(["owner"]),
  async (req: IRequest, res: Response) => {
    const user = await processQuery<IUser>("SELECT `rank` from `users` WHERE `id` = ?", [
      req.user?.id,
    ]);

    if (user[0].rank !== "owner") {
      return res.json({ error: "Forbidden", status: "error" }).status(403);
    }

    const {
      cad_name,
      aop,
      tow_whitelisted,
      whitelisted,
      webhook_url,
      plate_length = 8,
      live_map_url,
      steam_api_key,
      features,
    } = req.body;

    if (cad_name && aop && tow_whitelisted && whitelisted) {
      await processQuery(
        "UPDATE `cad_info` SET `cad_name` = ?, `AOP` = ?, `tow_whitelisted` = ?, `whitelisted` = ?, `webhook_url`= ?, `plate_length` = ?, `live_map_url` = ?, `steam_api_key` = ?, `features` = ?",
        [
          cad_name,
          aop,
          tow_whitelisted,
          whitelisted,
          webhook_url,
          plate_length,
          live_map_url,
          steam_api_key,
          JSON.stringify(features) || JSON.stringify("[]"),
        ],
      );

      return res.json({ status: "success" });
    } else {
      return res.json({ error: "Please fill in all fields", status: "error" });
    }
  },
);

/* members */
router.get(
  "/members",
  useAuth,
  usePermission(["admin", "owner", "moderator"]),
  async (_req: IRequest, res: Response) => {
    const members = await processQuery<IUser>(
      "SELECT `id`, `username`, `rank`, `leo`, `ems_fd`, `dispatch`, `tow`, `banned`, `ban_reason`, `whitelist_status`, `steam_id`, `avatar_url`, `supervisor`  FROM `users` ORDER BY `username` ASC",
    );

    return res.json({ status: "success", members });
  },
);

router.get(
  "/members/:id",
  useAuth,
  usePermission(["admin", "owner", "moderator", "dispatch"]),
  async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const member = await processQuery<IUser>(
      "SELECT `id`, `username`, `rank`, `leo`, `ems_fd`, `dispatch`, `tow`, `banned`, `ban_reason`, `whitelist_status`, `steam_id`, `avatar_url`, `supervisor` FROM `users` WHERE `id` = ?",
      [id],
    );

    return res.json({ status: "success", member: member[0] });
  },
);

router.put(
  "/members/:id",
  useAuth,
  usePermission(["admin", "owner", "moderator"]),
  async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const { rank, leo, dispatch, emsFd, tow, supervisor } = req.body;

    if (rank && leo && dispatch && emsFd && supervisor) {
      await processQuery(
        "UPDATE `users` SET `rank` = ?, `leo` = ?, `dispatch` = ?, `ems_fd` = ?, `tow` = ?, `supervisor` = ? WHERE `id` = ?",
        [rank, leo, dispatch, emsFd, tow, supervisor, id],
      );

      const updated = await processQuery<IUser>(
        "SELECT `id`, `username`, `rank`, `leo`, `ems_fd`, `dispatch`, `tow`, `banned`, `ban_reason`, `whitelist_status`, `steam_id`, `avatar_url`, `supervisor`  FROM `users` WHERE `id` = ?",
        [id],
      );

      return res.json({ status: "success", member: updated[0] });
    } else {
      return res.json({
        error: "Please fill in all fields",
        status: "error",
      });
    }
  },
);

router.put(
  "/members/:path/:id",
  useAuth,
  usePermission(["admin", "owner", "moderator"]),
  async (req: IRequest, res: Response) => {
    const { path, id } = req.params;
    const { ban_reason } = req.body;

    switch (path) {
      case "ban": {
        if (ban_reason) {
          if (req.user?.id === id) {
            return res.json({ error: "You can't ban yourself", status: "error" });
          }

          await processQuery("UPDATE `users` SET `banned` = ?, `ban_reason` = ? WHERE `id` = ?", [
            "1",
            ban_reason,
            id,
          ]);
        } else {
          return res.json({ error: "Please provide a ban reason", status: "error" });
        }
        break;
      }
      case "unban": {
        await processQuery("UPDATE `users` SET `banned` = ?, `ban_reason` = ? WHERE `id` = ?", [
          "0",
          "",
          id,
        ]);
        break;
      }
      case "accept": {
        await processQuery("UPDATE `users` SET `whitelist_status` = ? WHERE `id` = ?", [
          "accepted",
          id,
        ]);
        break;
      }
      case "decline": {
        await processQuery("DELETE FROM `users` WHERE `id` = ?", [id]);
        break;
      }
      case "remove": {
        await processQuery("DELETE FROM `users` WHERE `id` = ?", [id]);
        break;
      }
      default: {
        return res.json({ error: "Invalid path", status: "error" });
      }
    }

    const members = await processQuery<IUser>(
      "SELECT `id`, `username`, `rank`, `leo`, `ems_fd`, `dispatch`, `tow`, `banned`, `ban_reason`, `whitelist_status`, `steam_id`, `avatar_url`  FROM `users`",
    );
    const updated = await processQuery<IUser>(
      "SELECT `id`, `username`, `rank`, `leo`, `ems_fd`, `dispatch`, `tow`, `banned`, `ban_reason`, `whitelist_status`, `steam_id`, `avatar_url` FROM `users` WHERE `id` = ?",
      [id],
    );

    return res.json({ status: "success", member: updated[0], members });
  },
);

/* citizens */
router.get(
  "/citizens",
  useAuth,
  usePermission(["admin", "owner", "moderator", "ems_fd"]),
  async (_req: IRequest, res: Response) => {
    const citizens = await processQuery("SELECT * FROM `citizens`");

    const parsedCitizens = async () => {
      const arr: Citizen[] = [];

      await Promise.all(
        citizens.map(async (citizen: Citizen & { user: { username: string } }) => {
          const user = await processQuery("SELECT `username` FROM `users` WHERE `id` = ?", [
            citizen.user_id,
          ]);

          citizen.user = user[0];

          arr.push(citizen);
        }),
      );

      return arr;
    };

    return res.json({ citizens: await parsedCitizens(), status: "success" });
  },
);

router.get(
  "/expungement-requests",
  useAuth,
  usePermission(["admin", "owner", "moderator"]),
  async (_req, res: Response) => {
    const requests = await processQuery("SELECT * FROM `court_requests`");

    const parsedRequests = async () => {
      const reqs: any[] = [];

      await Promise.all(
        requests.map(async (request: any) => {
          const citizen = await processQuery("SELECT `full_name` FROM `citizens` WHERE `id` = ?", [
            request.citizen_id,
          ]);
          const user = await processQuery("SELECT `username` FROM `users` WHERE `id` = ?", [
            request.user_id,
          ]);

          request.user = user[0];
          request.citizen = citizen[0];

          request.warrants = JSON.parse(request.warrants);
          request.arrestReports = JSON.parse(request.arrest_reports);
          request.tickets = JSON.parse(request.tickets);

          reqs.push(request);
        }),
      );

      return reqs;
    };

    return res.json({
      status: "success",
      requests: await parsedRequests(),
    });
  },
);

router.put(
  "/expungement-requests/:requestId/:type",
  useAuth,
  usePermission(["admin", "owner", "moderator"]),
  async (req: IRequest, res: Response) => {
    const { requestId, type } = req.params;
    const request = await processQuery("SELECT * FROM `court_requests` WHERE `id` = ?", [
      requestId,
    ]);

    switch (type) {
      case "accept": {
        // value to remove from the citizen
        const { warrants, arrestReports, tickets } = req.body;

        warrants.forEach(async (warrant: Item) => {
          await processQuery("DELETE FROM `warrants` WHERE `id` = ?", [warrant.value]);
        });
        arrestReports.forEach(async (arr: Item) => {
          await processQuery("DELETE FROM `arrest_reports` WHERE `id` = ?", [arr.value]);
        });
        tickets.forEach(async (ticket: Item) => {
          await processQuery("DELETE FROM `leo_tickets` WHERE `id` = ?", [ticket.value]);
        });

        await processQuery("DELETE FROM `court_requests` WHERE `id` = ?", [requestId]);
        await createNotification(
          "Expungement request accepted",
          `Your expungement was accepted for citizen with id: ${request[0].citizen_id}`,
          "/court",
          request[0].user_id,
        );

        break;
      }
      case "decline": {
        await processQuery("DELETE FROM `court_requests` WHERE `id` = ?", [requestId]);
        await createNotification(
          "Expungement request declined",
          `Your expungement was declined for citizen with id: ${request[0].citizen_id}`,
          "/court",
          request[0].user_id,
        );
        break;
      }
      default: {
        return res.json({
          error: "invalid type",
          status: "error",
        });
      }
    }

    const updated = await processQuery("SELECT * FROM `court_requests`");

    return res.json({
      status: "success",
      requests: updated.map((request: any) => {
        request.warrants = JSON.parse(request.warrants);
        request.arrestReports = JSON.parse(request.arrest_reports);
        request.tickets = JSON.parse(request.tickets);
        return request;
      }),
    });
  },
);

router.delete(
  "/citizens/:id",
  useAuth,
  usePermission(["admin", "owner", "moderator"]),
  async (req: IRequest, res: Response) => {
    const { id } = req.params;

    await processQuery("DELETE FROM `citizens` WHERE `id` = ?", [id]);

    const citizens = await processQuery("SELECT * FROM `citizens`");

    return res.json({ citizens, status: "success" });
  },
);

/* companies */
router.get("/companies", useAuth, async (_req: IRequest, res: Response) => {
  const companies = await processQuery("SELECT * FROM `businesses`");

  const parsedCompanies = async () => {
    const arr: any[] = [];

    await Promise.all(
      companies.map(async (company: any) => {
        const user = await processQuery("SELECT `username` FROM `users` WHERE `id` = ?", [
          company.user_id,
        ]);

        company.user = user[0];

        arr.push(company);
      }),
    );

    return arr;
  };

  return res.json({ companies: await parsedCompanies(), status: "success" });
});

router.delete(
  "/companies/:id",
  useAuth,
  usePermission(["admin", "owner", "moderator"]),
  async (req: IRequest, res: Response) => {
    const { id } = req.params;

    const employees = await processQuery<Citizen>(
      "SELECT * FROM `citizens` WHERE `business_id` = ?",
      [id],
    );

    employees?.forEach(async (em: Citizen) => {
      await processQuery(
        "UPDATE `citizens` SET `business_id` = ?, `business` = ?, `rank` = ?, `vehicle_reg` = ?, `posts` = ?, `b_status` = ? WHERE `id` = ?",
        ["", "none", "", "1", "1", "", em.id],
      );
    });

    await processQuery("DELETE FROM `businesses` WHERE `id` = ?", [id]);

    const companies = await processQuery("SELECT * FROM `businesses`");

    return res.json({ companies, status: "success" });
  },
);

router.get(
  "/officers",
  useAuth,
  usePermission(["admin", "owner", "moderator", "supervisor"]),
  async (_req: IRequest, res: Response) => {
    try {
      const officers = await processQuery<Officer>("SELECT * FROM `officers`");

      return res.json({ status: "success", officers });
    } catch (e) {
      Logger.error("UPDATE_CALLSIGN", e);
      return res.json({ status: "error", error: "An unexpected error occurred" });
    }
  },
);

router.get(
  "/officers/:id",
  useAuth,
  usePermission(["admin", "owner", "moderator", "supervisor"]),
  async (req: IRequest, res: Response) => {
    const { id } = req.params;

    try {
      const officer = await processQuery<Officer>("SELECT * FROM `officers` WHERE `id` = ?", [id]);

      return res.json({ status: "success", officer: officer[0] });
    } catch (e) {
      Logger.error("GET_OFFICER_BY_ID", e);
      return res.json({ error: "An unexpected error occurred", status: "error" });
    }
  },
);

router.put(
  "/officers/:officerId",
  useAuth,
  usePermission(["admin", "owner", "moderator", "supervisor"]),
  async (req: IRequest, res: Response) => {
    const { officerId } = req.params;
    const { callsign, rank, department } = req.body;

    if (!callsign || !department) {
      return res.json({
        error: "Please fill in all fields",
        status: "error",
      });
    }

    try {
      await processQuery(
        "UPDATE `officers` SET `callsign` = ?, `rank` = ?, `officer_dept` = ? WHERE `id` = ?",
        [callsign, rank, department, officerId],
      );

      return res.json({ status: "success" });
    } catch (e) {
      Logger.error("UPDATE_CALLSIGN", e);
      return res.json({ status: "error", error: "An unexpected error occurred" });
    }
  },
);

router.get(
  "/penal-codes",
  useAuth,
  usePermission(["admin", "moderator", "owner", "leo", "dispatch"]),
  async (_, res: Response) => {
    const penalCodes = await processQuery("SELECT * FROM `penal_codes`");

    return res.json({
      status: "success",
      penalCodes,
    });
  },
);

router.post(
  "/penal-codes",
  useAuth,
  usePermission(["admin", "moderator", "owner"]),
  async (req: IRequest, res: Response) => {
    const { title, des } = req.body;

    if (!title || !des) {
      return res.json({
        error: "Please fill in all fields",
        status: "error",
      });
    }

    await processQuery("INSERT INTO `penal_codes` (`id`, `title`, `des`) VALUES (?, ?, ?)", [
      v4(),
      title,
      des,
    ]);

    const updated = await processQuery("SELECT * FROM `penal_codes`");

    return res.json({
      status: "success",
      penalCodes: updated,
    });
  },
);

router.put(
  "/penal-codes/:id",
  useAuth,
  usePermission(["admin", "moderator", "owner"]),
  async (req: IRequest, res: Response) => {
    const { title, des } = req.body;
    const { id } = req.params;

    if (!title || !des) {
      return res.json({
        error: "Please fill in all fields",
        status: "error",
      });
    }

    await processQuery("UPDATE `penal_codes` SET `title` = ?, `des` = ? WHERE `id` = ?", [
      title,
      des,
      id,
    ]);

    return res.json({
      status: "success",
    });
  },
);

router.delete(
  "/penal-codes/:id",
  useAuth,
  usePermission(["admin", "moderator", "owner"]),
  async (req: IRequest, res: Response) => {
    const { id } = req.params;

    await processQuery("DELETE FROM `penal_codes` WHERE `id` = ?", [id]);

    const updated = await processQuery("SELECT * FROM `penal_codes`");

    return res.json({
      status: "success",
      penalCodes: updated,
    });
  },
);

router.get(
  "/10-codes",
  useAuth,
  usePermission(["admin", "moderator", "owner", "leo", "dispatch", "ems_fd"]),
  async (_, res: Response) => {
    const codes = await processQuery("SELECT * FROM `10_codes`");

    const parsed = parse10Codes(codes);

    return res.json({
      status: "success",
      codes: parsed,
    });
  },
);

router.post(
  "/10-codes",
  useAuth,
  usePermission(["admin", "moderator", "owner"]),
  async (req: IRequest, res: Response) => {
    const { code, what_pages, color, should_do } = req.body;

    if (!code || what_pages?.length <= 0 || !should_do || !color) {
      return res.json({
        status: "error",
        error: "Please fill in all fields",
      });
    }

    const exists = await processQuery("SELECT * FROM `10_codes` WHERE `code` = ?", [code]);

    if (exists[0]) {
      return res.json({
        error: "Code already exists",
        status: "error",
      });
    }

    await processQuery(
      "INSERT INTO `10_codes` (`id`, `code`, `color`, `what_pages`, `should_do`) VALUES (?, ?, ?, ?, ?)",
      [v4(), code, color, JSON.stringify(what_pages), should_do],
    );

    return res.json({
      status: "success",
    });
  },
);

router.put(
  "/10-codes/:id",
  useAuth,
  usePermission(["admin", "moderator", "owner"]),
  async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const { code, what_pages, color, should_do } = req.body;

    await processQuery(
      "UPDATE `10_codes` SET `code` = ?, `color` = ?, `what_pages` = ?, `should_do` = ? WHERE `id` = ?",
      [code, color, JSON.stringify(what_pages), should_do, id],
    );

    return res.json({
      status: "success",
    });
  },
);

router.delete(
  "/10-codes/:id",
  useAuth,
  usePermission(["admin", "moderator", "owner"]),
  async (req: IRequest, res: Response) => {
    const { id } = req.params;

    await processQuery("DELETE FROM `10_codes` WHERE `id` = ?", [id]);

    const updated = await processQuery("SELECT * FROM `10_codes`");
    const parsed = parse10Codes(updated);

    return res.json({
      status: "success",
      codes: parsed,
    });
  },
);

export default router;
