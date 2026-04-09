import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { createTeamMemberSecure, ensureOwnerSlug } from "../../lib/teamAuth.js";
import { getOwnerFromBearer, parseJsonBody, teamApiCreateMemberEnvError } from "../_helpers";

const BodySchema = z.object({
  name: z.string().min(2),
  role: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  code: z.string().regex(/^\d{4}$/),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED", message: "Méthode non autorisée" });
  }
  const cfg = teamApiCreateMemberEnvError();
  if (cfg) {
    return res.status(503).json({ ok: false, code: "CONFIG_MISSING", message: cfg });
  }
  const owner = await getOwnerFromBearer(req);
  if (!owner) {
    return res.status(401).json({ ok: false, code: "AUTH_REQUIRED", message: "Authentification requise." });
  }
  const parsed = BodySchema.safeParse(parseJsonBody(req));
  if (!parsed.success) {
    return res.status(400).json({ ok: false, code: "INVALID_INPUT", message: "Données invalides." });
  }
  const slug = await ensureOwnerSlug(owner.id, owner.email);
  if (!slug.ok) {
    const status = slug.code === "CONFIG_MISSING" ? 503 : 500;
    return res.status(status).json({ ok: false, code: slug.code, message: slug.error });
  }
  const out = await createTeamMemberSecure({
    ownerUserId: owner.id,
    ownerSlug: slug.data,
    name: parsed.data.name,
    role: parsed.data.role,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    rawCode: parsed.data.code,
  });
  if (!out.ok) {
    const status =
      out.code === "INVALID_INPUT" ? 400 :
      out.code === "DUPLICATE_CODE" ? 409 :
      out.code === "CONFIG_MISSING" ? 503 : 500;
    return res.status(status).json({ ok: false, code: out.code, message: out.error });
  }
  return res.status(200).json({ ok: true, member: out.data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/team/member]", e);
    return res.status(500).json({ ok: false, code: "INTERNAL", message: msg });
  }
}
