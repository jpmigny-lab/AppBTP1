import { z } from "zod";

export const EstimationInputSchema = z.object({
  description: z.string().min(20, "Description trop courte"),
  surface: z.number().optional(),
  typeChantier: z.enum(["renovation", "construction", "extension", "autre"]),
  localisation: z.string().optional(),
});

export const EstimationOutputSchema = z.object({
  coutMin: z.number(),
  coutMax: z.number(),
  dureeEstimee: z.string(),
  corpsDeMetier: z.array(z.string()),
  remarques: z.string(),
});

export type EstimationInput = z.infer<typeof EstimationInputSchema>;
export type EstimationOutput = z.infer<typeof EstimationOutputSchema>;
