import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const safeName = id.replace(/[^a-zA-Z0-9-]/g, "");
  const pdfPath = path.join(process.cwd(), ".autoprint-data", "pdfs", `${safeName}.pdf`);

  if (!fs.existsSync(pdfPath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(pdfPath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}.pdf"`,
    },
  });
}
