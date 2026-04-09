import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureOwnerSlug } from "../../server/services/teamAuth";
import { getOwnerFromBearer, teamApiOwnerSlugEnvError } from "./_helpers";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED", message: "Méthode non autorisée" });
  }
  const cfg = teamApiOwnerSlugEnvError();
  if (cfg) {
    return res.status(503).json({ ok: false, code: "CONFIG_MISSING", message: cfg });
  }
  const owner = await getOwnerFromBearer(req);
  if (!owner) {
    return res.status(401).json({ ok: false, code: "AUTH_REQUIRED", message: "Authentification requise." });
  }
  const out = await ensureOwnerSlug(owner.id, owner.email);
  if (!out.ok) {
    const status = out.code === "CONFIG_MISSING" ? 503 : 500;
    return res.status(status).json({ ok: false, code: out.code, message: out.error });
  }
  return res.status(200).json({ ok: true, ownerSlug: out.data });
}
