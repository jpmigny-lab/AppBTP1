import { z } from "zod"

export const EstimationFormSchema = z.object({
  // Step 1
  type_travaux: z.enum(["Neuf", "Rénovation", "Extension", "Second œuvre", "Aménagement intérieur"]),
  corps_metier: z.array(z.string()).min(1, "Sélectionne au moins un corps de métier"),
  surface: z.coerce.number().positive().max(100000),
  localisation: z.string().min(2),
  finition: z.enum(["Standard", "Moyen de gamme", "Haut de gamme"]),

  // Step 2
  accessibilite: z.enum(["Facile (plain-pied)", "Moyenne (étage sans ascenseur)", "Difficile (zone urbaine dense, sous-sol)"]),
  etat_existant: z.enum(["Neuf / vide", "Rénovation légère", "Rénovation lourde (démolition incluse)"]),
  contraintes: z.array(z.string()).min(1),
  delai: z.enum(["Urgent (< 1 mois)", "Normal (1–3 mois)", "Flexible (> 3 mois)"]),

  // Step 3
  marge: z.coerce.number().min(10).max(50).default(25),
  aleas: z.coerce.number().min(0).max(15).default(7),
  tva: z.enum(["5.5", "10", "20"]),
  budget_client: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),

  // Step 4
  description: z.string().min(1, "Décris le chantier"),
  date_demarrage: z.string().min(4),
  nb_ouvriers: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
})

export type EstimationFormValues = z.infer<typeof EstimationFormSchema>

export const PosteSchema = z.object({
  nom: z.string(),
  categorie: z.enum(["main_oeuvre", "materiaux", "sous_traitance", "frais_chantier"]),
  quantite: z.number(),
  unite: z.string(),
  prix_unitaire_ht: z.number(),
  total_ht: z.number(),
  detail: z.string(),
})

export const EstimationResultSchema = z.object({
  resume: z.string(),
  duree_estimee_jours: z.number(),
  nb_ouvriers_recommande: z.number(),
  postes: z.array(PosteSchema),
  sous_total_ht: z.number(),
  aleas_montant: z.number(),
  marge_montant: z.number(),
  total_ht: z.number(),
  tva_montant: z.number(),
  total_ttc: z.number(),
  prix_au_m2_ht: z.number(),
  marge_pourcentage: z.number(),
  risques: z.array(z.string()),
  postes_oublies_potentiels: z.array(z.string()),
  recommandations: z.array(z.string()),
  benchmark: z.string(),
})

export type EstimationResult = z.infer<typeof EstimationResultSchema>

