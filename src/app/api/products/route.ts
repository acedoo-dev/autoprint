import { NextRequest, NextResponse } from "next/server";
import { getCatalog, markPublished, deleteProduct } from "@/lib/storage";

export async function GET() {
  const products = await getCatalog();
  return NextResponse.json(products);
}

export async function PATCH(req: NextRequest) {
  const { id, action } = await req.json();
  if (action === "publish") {
    await markPublished(id);
    return NextResponse.json({ success: true });
  }
  if (action === "delete") {
    await deleteProduct(id);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
