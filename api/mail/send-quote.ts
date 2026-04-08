import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { Resend } from "resend";

const AttachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  contentBase64: z.string().min(1),
  contentType: z.string().optional(),
});

const BodySchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  html: z.string().min(1),
  text: z.string().optional(),
  attachments: z.array(AttachmentSchema).min(1),
});

function stripDataUrlPrefix(raw: string): string {
  const idx = raw.indexOf("base64,");
  return idx >= 0 ? raw.slice(idx + "base64,".length) : raw;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED", message: "Méthode non autorisée" });
  }

  const parsed = BodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      error: "INVALID_INPUT",
      message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" | "),
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const replyTo = process.env.RESEND_REPLY_TO;
  if (!apiKey || !from) {
    return res.status(503).json({
      error: "CONFIG_MISSING",
      message: "Variables RESEND_API_KEY et RESEND_FROM_EMAIL requises.",
    });
  }

  try {
    const resend = new Resend(apiKey);
    const body = parsed.data;
    const fallbackText =
      body.text && body.text.trim().length > 0
        ? body.text
        : body.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    const { data, error } = await resend.emails.send({
      from,
      to: body.to,
      subject: body.subject,
      html: body.html,
      text: fallbackText,
      attachments: body.attachments.map((a) => ({
        filename: a.filename,
        content: stripDataUrlPrefix(a.contentBase64),
        contentType: a.contentType ?? "application/pdf",
      })),
      replyTo: replyTo || undefined,
    });

    if (error || !data?.id) {
      return res.status(502).json({
        error: "UPSTREAM_ERROR",
        message: error?.message || "Resend n'a pas retourné d'id de message.",
      });
    }

    return res.status(200).json({ ok: true, messageId: data.id });
  } catch (err: any) {
    return res.status(502).json({
      error: "UPSTREAM_ERROR",
      message: err?.message || "Erreur inattendue lors de l'envoi Resend.",
    });
  }
}
