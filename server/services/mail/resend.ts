import { Resend } from "resend";
import { z } from "zod";

const AttachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  contentBase64: z.string().min(1),
  contentType: z.string().optional(),
});

const SendQuoteEmailInputSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  html: z.string().min(1),
  text: z.string().optional(),
  attachments: z.array(AttachmentSchema).min(1),
  metadata: z.record(z.any()).optional(),
});

export type SendQuoteEmailInput = z.infer<typeof SendQuoteEmailInputSchema>;

export type MailServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: "INVALID_INPUT" | "CONFIG_MISSING" | "UPSTREAM_ERROR" };

function stripDataUrlPrefix(raw: string): string {
  const idx = raw.indexOf("base64,");
  return idx >= 0 ? raw.slice(idx + "base64,".length) : raw;
}

export async function sendQuoteEmailWithResend(
  input: unknown,
): Promise<MailServiceResult<{ id: string }>> {
  const parsed = SendQuoteEmailInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" | "),
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const replyTo = process.env.RESEND_REPLY_TO;

  if (!apiKey || !from) {
    return {
      ok: false,
      code: "CONFIG_MISSING",
      error: "Variables RESEND_API_KEY et RESEND_FROM_EMAIL requises.",
    };
  }

  try {
    const resend = new Resend(apiKey);
    const payload = parsed.data;
    const attachments = payload.attachments.map((a) => ({
      filename: a.filename,
      content: stripDataUrlPrefix(a.contentBase64),
      contentType: a.contentType ?? "application/pdf",
    }));

    const { data, error } = await resend.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      attachments,
      replyTo: replyTo || undefined,
    });

    if (error || !data?.id) {
      return {
        ok: false,
        code: "UPSTREAM_ERROR",
        error: error?.message || "Resend n'a pas retourné d'identifiant de message.",
      };
    }

    return { ok: true, data: { id: data.id } };
  } catch (err: any) {
    return {
      ok: false,
      code: "UPSTREAM_ERROR",
      error: err?.message || "Erreur inattendue lors de l'envoi Resend.",
    };
  }
}
