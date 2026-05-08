import type { PlannerContent } from "./agents/content-agent";

export interface StoredProduct {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  language: "fr" | "en";
  suggestedPriceUSD: number;
  tags: string[];
  kofiDescription: string;
  accentColor: string;
  pdfUrl: string;
  status: "pending" | "published";
  createdAt: string;
  publishedAt?: string;
}

// ── Local filesystem storage (dev) ───────────────────────────────────────────
import fs from "fs";
import path from "path";

const LOCAL_DIR = path.join(process.cwd(), ".autoprint-data");
const LOCAL_CATALOG = path.join(LOCAL_DIR, "catalog.json");
const LOCAL_PDFS = path.join(LOCAL_DIR, "pdfs");

function ensureLocalDirs() {
  if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });
  if (!fs.existsSync(LOCAL_PDFS)) fs.mkdirSync(LOCAL_PDFS, { recursive: true });
}

function readLocalCatalog(): StoredProduct[] {
  if (!fs.existsSync(LOCAL_CATALOG)) return [];
  return JSON.parse(fs.readFileSync(LOCAL_CATALOG, "utf-8"));
}

function writeLocalCatalog(products: StoredProduct[]) {
  ensureLocalDirs();
  fs.writeFileSync(LOCAL_CATALOG, JSON.stringify(products, null, 2));
}

// ── Vercel Blob storage (production) ─────────────────────────────────────────
async function getBlobStorage() {
  const { put, list } = await import("@vercel/blob");
  return { put, list };
}

// ── Public API ────────────────────────────────────────────────────────────────
const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export async function getCatalog(): Promise<StoredProduct[]> {
  if (!useBlob()) return readLocalCatalog();

  try {
    const { list } = await getBlobStorage();
    const { blobs } = await list({ prefix: "catalog.json" });
    if (!blobs.length) return [];
    const res = await fetch(blobs[0].url);
    return res.ok ? ((await res.json()) as StoredProduct[]) : [];
  } catch {
    return [];
  }
}

async function saveCatalog(products: StoredProduct[]) {
  if (!useBlob()) {
    writeLocalCatalog(products);
    return;
  }
  const { put } = await getBlobStorage();
  await put("catalog.json", JSON.stringify(products), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

export async function saveProduct(
  id: string,
  content: PlannerContent,
  pdfBuffer: Buffer
): Promise<StoredProduct> {
  let pdfUrl: string;

  if (!useBlob()) {
    ensureLocalDirs();
    const pdfPath = path.join(LOCAL_PDFS, `${id}.pdf`);
    fs.writeFileSync(pdfPath, pdfBuffer);
    pdfUrl = `/api/pdf/${id}`;
  } else {
    const { put } = await getBlobStorage();
    const blob = await put(`pdfs/${id}.pdf`, pdfBuffer, {
      access: "public",
      contentType: "application/pdf",
      addRandomSuffix: false,
    });
    pdfUrl = blob.url;
  }

  const product: StoredProduct = {
    id,
    title: content.title,
    subtitle: content.subtitle,
    type: content.type,
    language: content.language,
    suggestedPriceUSD: content.suggestedPriceUSD,
    tags: content.tags,
    kofiDescription: content.kofiDescription,
    accentColor: content.accentColor,
    pdfUrl,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const catalog = await getCatalog();
  catalog.unshift(product);
  await saveCatalog(catalog);

  return product;
}

export async function markPublished(id: string) {
  const catalog = await getCatalog();
  const product = catalog.find((p) => p.id === id);
  if (product) {
    product.status = "published";
    product.publishedAt = new Date().toISOString();
    await saveCatalog(catalog);
  }
}

export async function deleteProduct(id: string) {
  const catalog = await getCatalog();
  await saveCatalog(catalog.filter((p) => p.id !== id));

  if (!useBlob()) {
    const pdfPath = path.join(LOCAL_PDFS, `${id}.pdf`);
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  }
}
