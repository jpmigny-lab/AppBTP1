import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getTeamMemberSessionContext } from "../../../server/services/teamAuth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED", message: "Méthode non autorisée" });
  }
  const sessionToken = String(req.query?.sessionToken || "");
  if (!sessionToken) {
    return res.status(400).json({ ok: false, code: "INVALID_INPUT", message: "sessionToken requis." });
  }
  const out = await getTeamMemberSessionContext(sessionToken);
  if (!out.ok) {
    const status =
      out.code === "INVALID_SESSION" || out.code === "EXPIRED" ? 401 :
      out.code === "CONFIG_MISSING" ? 503 : 500;
    return res.status(status).json({ ok: false, code: out.code, message: out.error });
  }
  return res.status(200).json({
    ok: true,
    member: out.data.member,
    expiresAt: out.data.expiresAt,
    permissions: out.data.permissions,
    assignedChantierIds: out.data.assignedChantierIds,
    chantiers: out.data.chantiers,
  });
}
