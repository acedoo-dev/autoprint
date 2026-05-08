import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { generatePlannerContent } from "@/lib/agents/content-agent";
import { generatePDF } from "@/lib/pdf";
import { saveProduct } from "@/lib/storage";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = [];

    for (const lang of ["fr", "en"] as const) {
      const id = uuidv4();
      const content = await generatePlannerContent(lang);
      const pdfBuffer = await generatePDF(content);
      const product = await saveProduct(id, content, pdfBuffer);
      results.push({ id: product.id, title: product.title, lang });
    }

    return NextResponse.json({ success: true, generated: results });
  } catch (err) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
