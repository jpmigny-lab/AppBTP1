import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { updateTeamMemberCodeSecure } from "../../../../server/services/teamAuth";
import { getOwnerFromBearer } from "../../_helpers";

const BodySchema = z.object({
  code: z.string().regex(/^\d{4}$/),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED", message: "Méthode non autorisée" });
  }
  const owner = await getOwnerFromBearer(req);
  if (!owner) {
    return res.status(401).json({ ok: false, code: "AUTH_REQUIRED", message: "Authentification requise." });
  }
  const parsed = BodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, code: "INVALID_INPUT", message: "Code invalide." });
  }
  const memberId = String((req.query as any)?.id || "");
  if (!memberId) {
    return res.status(400).json({ ok: false, code: "INVALID_INPUT", message: "ID membre manquant." });
  }
  const out = await updateTeamMemberCodeSecure({
    ownerUserId: owner.id,
    memberId,
    rawCode: parsed.data.code,
  });
  if (!out.ok) {
    const status =
      out.code === "INVALID_INPUT" ? 400 :
      out.code === "DUPLICATE_CODE" ? 409 :
      out.code === "CONFIG_MISSING" ? 503 : 500;
    return res.status(status).json({ ok: false, code: out.code, message: out.error });
  }
  return res.status(200).json({ ok: true });
}
