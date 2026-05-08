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
    ? `Expert planificateurs numériques Ko-fi. Génère un "${productType}" en FRANÇAIS.
JSON UNIQUEMENT, 3 pages max, sections courtes:
{"title":"<60 chars","subtitle":"<80 chars","description":"1 phrase","kofiDescription":"80 mots max, PDF instantané","tags":["t1","t2","t3","t4","t5","t6"],"suggestedPriceUSD":7,"pages":[{"title":"titre","sections":[{"label":"label","type":"lines|checkbox|time-slots|freeform","rows":6,"items":["i1","i2"]}]}]}`
    : `Expert digital planners Ko-fi. Generate a "${productType}" in ENGLISH.
JSON ONLY, max 3 pages, short sections:
{"title":"<60 chars","subtitle":"<80 chars","description":"1 sentence","kofiDescription":"80 words max, instant PDF download","tags":["t1","t2","t3","t4","t5","t6"],"suggestedPriceUSD":7,"pages":[{"title":"title","sections":[{"label":"label","type":"lines|checkbox|time-slots|freeform","rows":6,"items":["i1","i2"]}]}]}`;

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
