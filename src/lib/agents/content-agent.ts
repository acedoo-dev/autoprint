import { anthropic, MODEL } from "@/lib/anthropic";

export type ProductType =
  | "daily-planner"
  | "weekly-planner"
  | "monthly-planner"
  | "habit-tracker"
  | "budget-tracker"
  | "meal-planner"
  | "goal-planner"
  | "gratitude-journal";

export interface PlannerSection {
  label: string;
  type: "lines" | "checkbox" | "grid" | "freeform" | "time-slots";
  rows?: number;
  items?: string[];
}

export interface PlannerPage {
  title: string;
  sections: PlannerSection[];
}

export interface PlannerContent {
  title: string;
  subtitle: string;
  description: string;
  kofiDescription: string;
  tags: string[];
  suggestedPriceUSD: number;
  type: ProductType;
  language: "fr" | "en";
  accentColor: string;
  pages: PlannerPage[];
}

const NICHES: { type: ProductType; weight: number }[] = [
  { type: "daily-planner", weight: 3 },
  { type: "weekly-planner", weight: 3 },
  { type: "budget-tracker", weight: 3 },
  { type: "habit-tracker", weight: 2 },
  { type: "monthly-planner", weight: 2 },
  { type: "meal-planner", weight: 2 },
  { type: "goal-planner", weight: 2 },
  { type: "gratitude-journal", weight: 1 },
];

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6",
  "#f59e0b", "#10b981", "#3b82f6", "#ef4444",
];

function pickType(): ProductType {
  const total = NICHES.reduce((s, n) => s + n.weight, 0);
  let r = Math.random() * total;
  for (const n of NICHES) {
    r -= n.weight;
    if (r <= 0) return n.type;
  }
  return "daily-planner";
}

export async function generatePlannerContent(
  language: "fr" | "en",
  type?: ProductType
): Promise<PlannerContent> {
  const productType = type ?? pickType();
  const accentColor = COLORS[Math.floor(Math.random() * COLORS.length)];

  const prompt = language === "fr"
    ? `Tu es un expert en création de planificateurs numériques premium vendus sur Ko-fi.
Génère le contenu complet pour un "${productType}" en FRANÇAIS.
Le produit doit être professionnel, utile et attrayant pour des acheteurs québécois/français.

Réponds UNIQUEMENT avec un JSON valide dans ce format exact:
{
  "title": "Titre accrocheur (max 60 caractères)",
  "subtitle": "Sous-titre descriptif (max 80 caractères)",
  "description": "Description courte pour l'en-tête du PDF (1-2 phrases)",
  "kofiDescription": "Description complète pour le listing Ko-fi (150-200 mots), inclus les avantages, ce que contient le produit, à qui c'est destiné. Mentionne que c'est un téléchargement numérique instantané en PDF.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
  "suggestedPriceUSD": 7,
  "pages": [
    {
      "title": "Titre de la page",
      "sections": [
        {
          "label": "Étiquette de section",
          "type": "lines|checkbox|grid|freeform|time-slots",
          "rows": 8,
          "items": ["item1", "item2"]
        }
      ]
    }
  ]
}

Crée 4-6 pages utiles et bien structurées selon le type de planificateur.
Pour les checkboxes: inclus des items dans "items". Pour les time-slots: inclus les heures dans "items" (ex: "06:00", "07:00").
Les tags doivent être en français et pertinents pour la recherche Ko-fi.`
    : `You are an expert at creating premium digital planners sold on Ko-fi.
Generate complete content for a "${productType}" in ENGLISH.
The product must be professional, useful, and appealing to buyers looking for quality planners.

Respond ONLY with valid JSON in this exact format:
{
  "title": "Catchy title (max 60 chars)",
  "subtitle": "Descriptive subtitle (max 80 chars)",
  "description": "Short description for PDF header (1-2 sentences)",
  "kofiDescription": "Full Ko-fi listing description (150-200 words), include benefits, what's included, who it's for. Mention it's an instant digital PDF download.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
  "suggestedPriceUSD": 7,
  "pages": [
    {
      "title": "Page title",
      "sections": [
        {
          "label": "Section label",
          "type": "lines|checkbox|grid|freeform|time-slots",
          "rows": 8,
          "items": ["item1", "item2"]
        }
      ]
    }
  ]
}

Create 4-6 useful, well-structured pages for this type of planner.
For checkboxes: include items in "items". For time-slots: include hours in "items" (e.g. "6:00 AM", "7:00 AM").
Tags must be relevant English search terms buyers would use on Ko-fi/Etsy.`;

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("No text response");

  const jsonMatch = text.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in response");

  const data = JSON.parse(jsonMatch[0]);

  return {
    ...data,
    type: productType,
    language,
    accentColor,
  };
}
