import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { EstimationInputSchema } from "../shared/estimationIA";
import { estimerChantier } from "./services/estimation/claude";
import { sendQuoteEmailWithResend } from "./services/mail/resend";

function normalizeEstimationInput(body: any) {
  const rawType = String(body?.typeChantier ?? body?.type_travaux ?? "").toLowerCase();
  const typeMap: Record<string, "renovation" | "construction" | "extension" | "autre"> = {
    renovation: "renovation",
    "rénovation": "renovation",
    construction: "construction",
    extension: "extension",
  };
  const typeChantier = typeMap[rawType] ?? "autre";
  const surfaceNum = Number(body?.surface);
  const location = typeof body?.localisation === "string" ? body.localisation.trim() : "";
  const rawDescription = typeof body?.description === "string" ? body.description.trim() : "";
  const fallbackDescription = `Projet ${typeChantier} ${location ? `à ${location}` : ""} avec estimation BTP détaillée.`.trim();
  const description =
    rawDescription.length >= 20
      ? rawDescription
      : `${fallbackDescription} ${rawDescription}`.trim();

  return {
    description,
    surface: Number.isFinite(surfaceNum) && surfaceNum > 0 ? surfaceNum : undefined,
    typeChantier,
    localisation: location || undefined,
  };
}

function toLegacyEstimationResult(
  result: Awaited<ReturnType<typeof estimerChantier>>,
  input: ReturnType<typeof normalizeEstimationInput>,
) {
  const coutMin = Number(result.coutMin) || 0;
  const coutMax = Number(result.coutMax) || 0;
  const moyenne = coutMin > 0 && coutMax > 0 ? (coutMin + coutMax) / 2 : Math.max(coutMin, coutMax, 0);
  const surface = input.surface && input.surface > 0 ? input.surface : undefined;
  const prixM2 = surface ? moyenne / surface : 0;
  const tvaRate = 0.2;
  const sousTotal = moyenne / (1 + tvaRate);
  const tvaMontant = moyenne - sousTotal;

  const postes = (result.corpsDeMetier || []).map((metier) => {
    const total = result.corpsDeMetier.length > 0 ? sousTotal / result.corpsDeMetier.length : 0;
    return {
      nom: metier,
      categorie: "main_oeuvre" as const,
      quantite: 1,
      unite: "forfait",
      prix_unitaire_ht: Number(total.toFixed(2)),
      total_ht: Number(total.toFixed(2)),
      detail: `Poste estimé automatiquement pour ${metier}`,
    };
  });

  return {
    resume: `Estimation IA ${input.typeChantier} ${input.localisation ? `à ${input.localisation}` : ""}`.trim(),
    duree_estimee_jours: (() => {
      const txt = result.dureeEstimee || "";
      const m = txt.match(/\d+/);
      if (!m) return 20;
      return Math.max(1, Number(m[0]));
    })(),
    nb_ouvriers_recommande: Math.min(8, Math.max(1, result.corpsDeMetier.length || 1)),
    postes,
    sous_total_ht: Number(sousTotal.toFixed(2)),
    aleas_montant: 0,
    marge_montant: 0,
    total_ht: Number(sousTotal.toFixed(2)),
    tva_montant: Number(tvaMontant.toFixed(2)),
    total_ttc: Number(moyenne.toFixed(2)),
    prix_au_m2_ht: Number(prixM2.toFixed(2)),
    marge_pourcentage: 0,
    risques: [],
    postes_oublies_potentiels: [],
    recommandations: [result.remarques].filter(Boolean),
    benchmark: `Fourchette estimée: ${coutMin.toLocaleString("fr-FR")}€ - ${coutMax.toLocaleString("fr-FR")}€`,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  app.post("/api/estimation", async (req, res) => {
    // #region agent log
    fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'pre-fix',hypothesisId:'H3',location:'server/routes.ts:/api/estimation:entry',message:'Estimation route hit',data:{bodyKeys:Object.keys(req.body ?? {}),hasDescription:Boolean(req.body?.description),typeChantier:req.body?.typeChantier ?? null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const normalizedInput = normalizeEstimationInput(req.body);
    // #region agent log
    fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'post-fix',hypothesisId:'H3',location:'server/routes.ts:/api/estimation:normalized',message:'Normalized estimation payload',data:{typeChantier:normalizedInput.typeChantier,hasDescription:Boolean(normalizedInput.description),descriptionLength:typeof normalizedInput.description==='string'?normalizedInput.description.length:null,surface:normalizedInput.surface ?? null,localisation:normalizedInput.localisation ?? null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const parsed = EstimationInputSchema.safeParse(normalizedInput);
    if (!parsed.success) {
      // #region agent log
      fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'pre-fix',hypothesisId:'H3',location:'server/routes.ts:/api/estimation:invalid-input',message:'Input schema rejected',data:{issues:parsed.error.issues.map((i)=>({path:i.path.join('.'),code:i.code,minimum:(i as any).minimum ?? null,received:(i as any).received ?? null,message:i.message}))},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return res.status(400).json({
        error: "INVALID_INPUT",
        message: "Données d'entrée invalides pour l'estimation",
        details: parsed.error.issues,
      });
    }

    try {
      const result = await estimerChantier(parsed.data);
      const legacy = toLegacyEstimationResult(result, normalizedInput);
      // #region agent log
      fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'post-fix',hypothesisId:'H12',location:'server/routes.ts:/api/estimation:legacy-mapped',message:'Mapped Claude output to legacy schema',data:{keys:Object.keys(legacy),postesCount:legacy.postes.length,totalTtc:legacy.total_ttc},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return res.json(legacy);
    } catch (err: any) {
      const code = err?.code ?? "UNKNOWN_ERROR";
      // #region agent log
      fetch('http://127.0.0.1:7926/ingest/d82336b5-3a0d-4ff4-89d3-4c82cf47cea4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4401c2'},body:JSON.stringify({sessionId:'4401c2',runId:'pre-fix',hypothesisId:'H4',location:'server/routes.ts:/api/estimation:catch',message:'Estimation route catch',data:{code,message:err?.message ?? null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (code === "CONFIG_MISSING") {
        return res.status(503).json({ error: code, message: err.message });
      }
      if (code === "INVALID_AI_PAYLOAD") {
        return res.status(502).json({ error: code, message: err.message });
      }
      return res
        .status(502)
        .json({ error: "UPSTREAM_ERROR", message: err?.message });
    }
  });

  app.post("/api/mail/send-quote", async (req, res) => {
    const body = req.body ?? {};
    const fallbackText =
      typeof body.text === "string" && body.text.trim().length > 0
        ? body.text
        : typeof body.html === "string"
          ? body.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
          : "";

    const result = await sendQuoteEmailWithResend({
      to: body.to,
      subject: body.subject,
      html: body.html,
      text: fallbackText || undefined,
      attachments: body.attachments,
      metadata: body.metadata,
    });

    if (!result.ok) {
      if (result.code === "INVALID_INPUT") {
        return res.status(400).json({ error: result.code, message: result.error });
      }
      if (result.code === "CONFIG_MISSING") {
        return res.status(503).json({ error: result.code, message: result.error });
      }
      return res.status(502).json({ error: result.code, message: result.error });
    }

    return res.status(200).json({ ok: true, messageId: result.data.id });
  });

  /** OAuth Gmail / Microsoft : échange du code côté serveur (secret jamais exposé au client) */
  app.post("/api/mail/google/token", async (req, res) => {
    try {
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      const { code, redirect_uri } = req.body ?? {};
      if (!clientId || !clientSecret) {
        return res.status(501).json({
          configured: false,
          message:
            "Configurer GOOGLE_OAUTH_CLIENT_ID et GOOGLE_OAUTH_CLIENT_SECRET sur le serveur.",
        });
      }
      if (!code || !redirect_uri) {
        return res.status(400).json({ message: "code et redirect_uri requis" });
      }
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: String(code),
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: String(redirect_uri),
          grant_type: "authorization_code",
        }),
      });
      const data = (await tokenRes.json()) as Record<string, unknown>;
      if (!tokenRes.ok) {
        return res.status(400).json({
          ...data,
          message:
            (data.error_description as string) ||
            (data.error as string) ||
            "Échange Google refusé",
        });
      }
      return res.json({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
      });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "Erreur serveur" });
    }
  });

  /** Liste des messages Gmail (proxy + métadonnées) */
  app.get("/api/mail/gmail/messages", async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Token manquant" });
      }
      const token = auth.slice(7);
      const listRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=30",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const listData = (await listRes.json()) as {
        messages?: { id: string }[];
        error?: unknown;
      };
      if (!listRes.ok) {
        return res.status(listRes.status).json(listData);
      }
      const ids = (listData.messages || []).slice(0, 20).map((m) => m.id);
      const details = await Promise.all(
        ids.map(async (id) => {
          const r = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          return r.json();
        }),
      );
      return res.json({ messages: details });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "Erreur serveur" });
    }
  });

  app.post("/api/mail/microsoft/token", async (req, res) => {
    try {
      const clientId = process.env.MICROSOFT_OAUTH_CLIENT_ID;
      const clientSecret = process.env.MICROSOFT_OAUTH_CLIENT_SECRET;
      const { code, redirect_uri } = req.body ?? {};
      if (!clientId || !clientSecret) {
        return res.status(501).json({
          configured: false,
          message:
            "Configurer MICROSOFT_OAUTH_CLIENT_ID et MICROSOFT_OAUTH_CLIENT_SECRET sur le serveur.",
        });
      }
      if (!code || !redirect_uri) {
        return res.status(400).json({ message: "code et redirect_uri requis" });
      }
      const tokenRes = await fetch(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code: String(code),
            redirect_uri: String(redirect_uri),
            grant_type: "authorization_code",
            scope:
              "https://graph.microsoft.com/Mail.Read offline_access openid profile",
          }),
        },
      );
      const data = (await tokenRes.json()) as Record<string, unknown>;
      if (!tokenRes.ok) {
        return res.status(400).json({
          ...data,
          message:
            (data.error_description as string) ||
            (data.error as string) ||
            "Échange Microsoft refusé",
        });
      }
      return res.json({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
      });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "Erreur serveur" });
    }
  });

  app.get("/api/mail/outlook/messages", async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Token manquant" });
      }
      const token = auth.slice(7);
      const r = await fetch(
        "https://graph.microsoft.com/v1.0/me/messages?$top=30&$select=subject,from,receivedDateTime,bodyPreview,isRead",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await r.json();
      if (!r.ok) {
        return res.status(r.status).json(data);
      }
      return res.json({ messages: (data as { value?: unknown[] }).value || [] });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "Erreur serveur" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
