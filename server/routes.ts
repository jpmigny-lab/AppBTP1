import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  app.post("/api/estimation", async (req, res) => {
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Clé Anthropic manquante côté serveur (ANTHROPIC_API_KEY)." });
      }

      const body = req.body ?? {};
      const prompt = [
        "Génère une estimation complète pour le chantier suivant :",
        "",
        `Type de travaux : ${body.type_travaux}`,
        `Corps de métier : ${(body.corps_metier || []).join(", ")}`,
        `Surface : ${body.surface} m²`,
        `Localisation : ${body.localisation}`,
        `Niveau de finition : ${body.finition}`,
        `Accessibilité : ${body.accessibilite}`,
        `État existant : ${body.etat_existant}`,
        `Contraintes : ${(body.contraintes || []).join(", ")}`,
        `Délai souhaité : ${body.delai}`,
        `Marge souhaitée : ${body.marge}%`,
        `Provision aléas : ${body.aleas}%`,
        `TVA : ${body.tva}%`,
        `Budget client indicatif : ${body.budget_client ?? "Non renseigné"}`,
        `Description complémentaire : ${body.description}`,
        `Date démarrage souhaitée : ${body.date_demarrage}`,
        `Ouvriers disponibles : ${body.nb_ouvriers ?? "Non renseigné"}`,
        "",
        "Retourne UNIQUEMENT ce JSON :",
        "{",
        "\"resume\": \"string\",",
        "\"duree_estimee_jours\": number,",
        "\"nb_ouvriers_recommande\": number,",
        "\"postes\": [",
        "{",
        "\"nom\": \"string\",",
        "\"categorie\": \"main_oeuvre | materiaux | sous_traitance | frais_chantier\",",
        "\"quantite\": number,",
        "\"unite\": \"string\",",
        "\"prix_unitaire_ht\": number,",
        "\"total_ht\": number,",
        "\"detail\": \"string\"",
        "}",
        "],",
        "\"sous_total_ht\": number,",
        "\"aleas_montant\": number,",
        "\"marge_montant\": number,",
        "\"total_ht\": number,",
        "\"tva_montant\": number,",
        "\"total_ttc\": number,",
        "\"prix_au_m2_ht\": number,",
        "\"marge_pourcentage\": number,",
        "\"risques\": [\"string\"],",
        "\"postes_oublies_potentiels\": [\"string\"],",
        "\"recommandations\": [\"string\"],",
        "\"benchmark\": \"string\"",
        "}",
      ].join("\n");

      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system:
            "Tu es un expert en chiffrage de chantiers BTP en France avec 20 ans d'expérience. " +
            "Tu fournis des estimations précises, détaillées et réalistes basées sur les prix du marché français actuel. " +
            "Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après.",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!anthropicRes.ok) {
        const text = await anthropicRes.text().catch(() => "");
        return res.status(anthropicRes.status).json({
          message: "Erreur Anthropic",
          status: anthropicRes.status,
          details: text.slice(0, 800),
        });
      }

      const data = (await anthropicRes.json()) as any;
      const contentText = (data?.content || [])
        .map((c: any) => (c?.type === "text" ? c?.text : ""))
        .filter(Boolean)
        .join("\n")
        .trim();

      // Nettoyage: retirer backticks si Claude en ajoute malgré la consigne
      const cleaned = contentText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        return res.status(500).json({
          message: "Réponse IA non-JSON",
          snippet: cleaned.slice(0, 800),
        });
      }

      return res.json(parsed);
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "Erreur serveur" });
    }
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
