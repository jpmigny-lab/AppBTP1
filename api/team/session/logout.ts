import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { revokeTeamSession } from "../../../server/services/teamAuth";
import { parseJsonBody, teamApiServiceEnvError } from "../_helpers";

const BodySchema = z.object({
  sessionToken: z.string().min(20),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED", message: "Méthode non autorisée" });
  }
  const cfg = teamApiServiceEnvError();
  if (cfg) {
    return res.status(503).json({ ok: false, code: "CONFIG_MISSING", message: cfg });
  }
  const parsed = BodySchema.safeParse(parseJsonBody(req));
  if (!parsed.success) {
    return res.status(400).json({ ok: false, code: "INVALID_INPUT", message: "sessionToken requis." });
  }
  const out = await revokeTeamSession(parsed.data.sessionToken);
  if (!out.ok) {
    const status = out.code === "CONFIG_MISSING" ? 503 : 500;
    return res.status(status).json({ ok: false, code: out.code, message: out.error });
  }
  return res.status(200).json({ ok: true });
}
