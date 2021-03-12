import { Response, Router } from "express";
import { processQuery } from "../lib/database";
import { useAuth } from "../hooks";
import { v4 as uuidv4 } from "uuid";
import IRequest from "../interfaces/IRequest";
import Officer from "../interfaces/Officer";
import usePermission from "../hooks/usePermission";
import Code10 from "../interfaces/Code10";
import { getWebhookData, postWebhook } from "../lib/functions";
import ICad from "../interfaces/ICad";
const router: Router = Router();

router.get(
  "/my-officers",
  useAuth,
  usePermission(["leo"]),
  async (req: IRequest, res: Response) => {
    const officers = await processQuery("SELECT * FROM `officers` WHERE `user_id` = ?", [
      req.user?.id,
    ]);

    return res.json({ officers, status: "success" });
  },
);

router.get("/my-logs", useAuth, usePermission(["leo"]), async (req: IRequest, res: Response) => {
  const logs = await processQuery(
    "SELECT * FROM `officer_logs` WHERE `user_id` = ? ORDER BY `started_at` DESC",
    [req.user?.id],
  );

  return res.json({ logs, status: "success" });
});

router.post(
  "/my-officers",
  useAuth,
  usePermission(["leo"]),
  async (req: IRequest, res: Response) => {
    const { name, department, callsign } = req.body;
    const id = uuidv4();

    if (name && department && callsign) {
      await processQuery(
        "INSERT INTO `officers` (`id`, `officer_name`,`officer_dept`,`callsign`,`user_id`,`status`,`status2`,`rank`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [id, name, department, callsign, req.user?.id, "off-duty", "", "officer"],
      );

      return res.json({ status: "success" });
    } else {
      return res.json({
        error: "Please fill in all fields",
        status: "error",
      });
    }
  },
);

router.delete("/:id", useAuth, usePermission(["leo"]), async (req: IRequest, res: Response) => {
  const { id } = req.params;
  await processQuery("DELETE FROM `officers` WHERE `id` = ?", [id]);

  const officers = await processQuery("SELECT * FROM `officers` WHERE `user_id` = ?", [
    req.user?.id,
  ]);

  return res.json({ status: "success", officers });
});

router.get(
  "/status/:id",
  useAuth,
  usePermission(["leo", "dispatch"]),
  async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const officer = await processQuery<Officer>("SELECT * FROM `officers` WHERE  `id` = ?", [id]);

    return res.json({ officer: officer[0], status: "success" });
  },
);

router.put(
  "/status/:id",
  useAuth,
  usePermission(["leo", "dispatch"]),
  async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const { status, status2, timeMs } = req.body;

    if (status && status2 && timeMs) {
      await processQuery("UPDATE `officers` SET `status` = ?, `status2` = ? WHERE `user_id` = ?", [
        "off-duty",
        "--------",
        req.user?.id,
      ]);

      const cadInfo = await processQuery<ICad>("SELECT * FROM `cad_info`");
      const webhook = cadInfo[0].webhook_url && (await getWebhookData(cadInfo[0].webhook_url));

      const code = await processQuery<Code10>("SELECT * FROM `10_codes` WHERE `code` = ?", [
        status2,
      ]);

      const officerLog = await processQuery(
        "SELECT * FROM `officer_logs` WHERE `officer_id` = ? AND `active` = ?",
        [id, "1"],
      );

      if (status2 === "10-8") {
        if (!officerLog[0]) {
          await processQuery(
            "INSERT INTO `officer_logs` (`id`, `officer_id`, `started_at`, `ended_at`, `active`, `user_id`) VALUES (?, ?, ?, ?, ?, ?)",
            [uuidv4(), id, timeMs, 0, "1", req.user?.id],
          );
        }
      } else {
        if (!code[0]) return;
        if (code[0]?.should_do === "set_off_duty") {
          await processQuery(
            "UPDATE `officer_logs` SET `active` = ?, `ended_at` = ? WHERE `id` = ?",
            ["0", timeMs, officerLog[0]?.id],
          );
        }
      }

      await processQuery("UPDATE `officers` SET `status` = ?, `status2` = ? WHERE `id` = ?", [
        code[0]?.should_do === "set_off_duty" ? "off-duty" : status,
        code[0]?.should_do === "set_off_duty" ? "--------" : status2,
        id,
      ]);

      const updatedOfficer = await processQuery<Officer>(
        "SELECT * FROM `officers` WHERE `id` = ?",
        [id],
      );

      webhook &&
        postWebhook(webhook, {
          username: webhook.name,
          avatar_url: webhook.avatar,
          embeds: [
            {
              title: "Status Change",
              type: "rich",
              description: `Officer ** ${updatedOfficer[0].officer_dept} - ${updatedOfficer[0].callsign}${updatedOfficer[0].officer_name}** has changed their status to ${status2}`,
              fields: [
                {
                  name: "ON/OFF duty",
                  value: updatedOfficer[0].status,
                  inline: true,
                },
                {
                  name: "Status",
                  value: updatedOfficer[0].status2,
                  inline: true,
                },
              ],
            },
          ],
        });

      return res.json({ status: "success", officer: updatedOfficer[0] });
    } else {
      return res.json({ error: "Please fill in all fields", status: "error" });
    }
  },
);

router.get(
  "/departments",
  useAuth,
  usePermission(["leo", "dispatch"]),
  async (_req: IRequest, res: Response) => {
    const departments = await processQuery("SELECT * FROM `departments`");

    return res.json({ departments, status: "success" });
  },
);

/* searches */
router.post(
  "/search/plate",
  useAuth,
  usePermission(["leo", "dispatch"]),
  async (req: IRequest, res: Response) => {
    const { plate } = req.body;

    if (plate) {
      const result = await processQuery("SELECT * FROM `registered_cars` WHERE `plate` = ?", [
        plate,
      ]);

      return res.json({ plate: result[0] ?? {}, status: "success" });
    } else {
      return res.json({ error: "Please fill in all fields", status: "error" });
    }
  },
);

router.get(
  "/search/names",
  useAuth,
  usePermission(["leo", "dispatch"]),
  async (_req, res: Response) => {
    const found = await processQuery("SELECT `full_name` FROM `citizens`", []);

    return res.json({
      names: found,
      status: "success",
    });
  },
);

router.post(
  "/search/name",
  useAuth,
  usePermission(["leo", "dispatch"]),
  async (req: IRequest, res: Response) => {
    const { name } = req.body;

    if (name) {
      const citizen = await processQuery("SELECT * FROM `citizens` WHERE `full_name` = ?", [name]);
      const citizenId = citizen[0]?.id ?? "not_found";

      const vehicles = await processQuery(
        "SELECT * FROM `registered_cars` WHERE `citizen_id` = ?",
        [citizenId],
      );
      const weapons = await processQuery(
        "SELECT * FROM `registered_weapons` WHERE `citizen_id` = ?",
        [citizenId],
      );
      const warnings = await processQuery(
        "SELECT * FROM `written_warnings` WHERE `citizen_id` = ?",
        [citizenId],
      );
      const arrestReports = await processQuery(
        "SELECT * FROM `arrest_reports` WHERE `citizen_id` = ?",
        [citizenId],
      );
      const tickets = await processQuery("SELECT * FROM `leo_tickets` WHERE `citizen_id` = ?", [
        citizenId,
      ]);
      const warrants = await processQuery("SELECT * FROM `warrants` WHERE `citizen_id` = ?", [
        citizenId,
      ]);

      return res.json({
        citizen: citizen[0],
        writtenWarnings: warnings,
        vehicles,
        weapons,
        arrestReports,
        tickets,
        warrants,
        status: "success",
      });
    } else {
      return res.json({ error: "Please fill in all fields", status: "error" });
    }
  },
);

router.post(
  "/search/weapon",
  useAuth,
  usePermission(["leo", "dispatch"]),
  async (req: IRequest, res: Response) => {
    const { serialNumber } = req.body;

    if (serialNumber) {
      const weapon = await processQuery(
        "SELECT * FROM `registered_weapons` WHERE `serial_number` = ?",
        [serialNumber],
      );

      return res.json({ weapon: weapon[0], status: "success" });
    } else {
      return res.json({ error: "Please fill in all fields", status: "error" });
    }
  },
);

router.post(
  "/note/:citizenId",
  useAuth,
  usePermission(["leo", "dispatch"]),
  async (req: IRequest, res: Response) => {
    const { citizenId } = req.params;
    const { note } = req.body;

    if (citizenId && note) {
      await processQuery("UPDATE `citizens` SET `note` = ? WHERE `id` = ?", [note, citizenId]);

      return res.json({ status: "success" });
    } else {
      return res.json({ error: "Please fill in all fields", status: "error" });
    }
  },
);

export default router;
