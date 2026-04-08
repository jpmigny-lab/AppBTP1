import Anthropic from "@anthropic-ai/sdk";
import { config } from "../../config/env";
import {
  EstimationOutputSchema,
  type EstimationInput,
  type EstimationOutput,
} from "../../../shared/estimationIA";

const PROMPT_SYSTEM = `Tu es un expert en chiffrage de chantiers BTP en France.
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans explication, avec exactement ces champs :
{
  "coutMin": number (en euros),
  "coutMax": number (en euros),
  "dureeEstimee": string (ex: "3 à 5 semaines"),
  "corpsDeMetier": string[] (liste des métiers nécessaires),
  "remarques": string (points d'attention importants)
}`;

type ServiceError = {
  code: "CONFIG_MISSING" | "UPSTREAM_ERROR" | "INVALID_AI_PAYLOAD";
  message: string;
  raw?: string;
  errors?: unknown;
};

export async function estimerChantier(
  input: EstimationInput,
): Promise<EstimationOutput> {
  // #region agent log
  fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'pre-fix',hypothesisId:'H2',location:'server/services/estimation/claude.ts:entry',message:'estimerChantier entry',data:{hasAnthropicKey:Boolean(config.anthropicApiKey),anthropicKeyLength:config.anthropicApiKey?.length ?? 0,model:config.anthropicModel,inputType:input.typeChantier},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (!config.anthropicApiKey) {
    // #region agent log
    fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'pre-fix',hypothesisId:'H2',location:'server/services/estimation/claude.ts:missing-key',message:'Missing Anthropic key in config',data:{hasAnthropicKey:Boolean(config.anthropicApiKey)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw {
      code: "CONFIG_MISSING",
      message: "Clé API Anthropic non configurée",
    } satisfies ServiceError;
  }

  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const userMessage = `
Chantier à estimer :
- Type : ${input.typeChantier}
- Description : ${input.description}
${input.surface ? `- Surface : ${input.surface} m²` : ""}
${input.localisation ? `- Localisation : ${input.localisation}` : ""}
`;

  let rawText: string;

  try {
    const response = await client.messages.create({
      model: config.anthropicModel,
      max_tokens: 1024,
      system: PROMPT_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    });
    // #region agent log
    fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'post-fix',hypothesisId:'H11',location:'server/services/estimation/claude.ts:after-create',message:'Anthropic response metadata',data:{id:response.id,model:response.model,stopReason:response.stop_reason ?? null,inputTokens:(response as any)?.usage?.input_tokens ?? null,outputTokens:(response as any)?.usage?.output_tokens ?? null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
  } catch (err: any) {
    // #region agent log
    fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'pre-fix',hypothesisId:'H4',location:'server/services/estimation/claude.ts:upstream-error',message:'Anthropic SDK call failed',data:{errorName:err?.name ?? null,errorMessage:err?.message ?? null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw {
      code: "UPSTREAM_ERROR",
      message: err?.message ?? "Erreur appel Claude",
    } satisfies ServiceError;
  }

  const cleaned = rawText.replace(/```json|```/g, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw {
      code: "INVALID_AI_PAYLOAD",
      message: "Réponse Claude non JSON",
      raw: cleaned,
    } satisfies ServiceError;
  }

  const result = EstimationOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw {
      code: "INVALID_AI_PAYLOAD",
      message: "Structure JSON invalide",
      errors: result.error.issues,
    } satisfies ServiceError;
  }

  return result.data;
}
