import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { generatePlannerContent, type ProductType } from "@/lib/agents/content-agent";
import { generatePDF } from "@/lib/pdf";
import { saveProduct } from "@/lib/storage";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const language: "fr" | "en" = body.language ?? "en";
    const type: ProductType | undefined = body.type;

    const id = uuidv4();
    const content = await generatePlannerContent(language, type);
    const pdfBuffer = await generatePDF(content);
    const product = await saveProduct(id, content, pdfBuffer);

    return NextResponse.json({ success: true, product });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
