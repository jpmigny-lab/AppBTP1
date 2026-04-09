import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { loginTeamMember } from "../../server/services/teamAuth";
import { parseJsonBody, teamApiCodeEnvError } from "./_helpers";

const BodySchema = z.object({
  ownerSlug: z.string().min(2),
  code: z.string().regex(/^\d{4}$/),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED", message: "Méthode non autorisée" });
  }
  const cfg = teamApiCodeEnvError();
  if (cfg) {
    return res.status(503).json({ ok: false, code: "CONFIG_MISSING", message: cfg });
  }
  const parsed = BodySchema.safeParse(parseJsonBody(req));
  if (!parsed.success) {
    return res.status(400).json({ ok: false, code: "INVALID_INPUT", message: "ownerSlug et code requis." });
  }
  const out = await loginTeamMember(parsed.data.ownerSlug, parsed.data.code);
  if (!out.ok) {
    const status =
      out.code === "INVALID_INPUT" ? 400 :
      out.code === "INVALID_CODE" ? 401 :
      out.code === "CONFIG_MISSING" ? 503 : 500;
    return res.status(status).json({ ok: false, code: out.code, message: out.error });
  }
  return res.status(200).json({
    ok: true,
    member: out.data.member,
    sessionToken: out.data.sessionToken,
    expiresAt: out.data.expiresAt,
  });
}
