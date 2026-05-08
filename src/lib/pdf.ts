import PDFDocument from "pdfkit";
import type { PlannerContent, PlannerSection } from "./agents/content-agent";

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function lighten(hex: string, amount = 0.92): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return [
    Math.round(r + (255 - r) * amount),
    Math.round(g + (255 - g) * amount),
    Math.round(b + (255 - b) * amount),
  ];
}

export async function generatePDF(content: PlannerContent): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 40, left: 45, right: 45 },
      info: { Title: content.title, Author: "AutoPrint" },
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const accent = hexToRgb(content.accentColor);
    const accentLight = lighten(content.accentColor);
    const W = doc.page.width - 90;

    // ── COVER PAGE ──────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 180).fill(content.accentColor);

    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(28)
      .text(content.title, 45, 55, { width: W, align: "center" });

    doc
      .fillColor("rgba(255,255,255,0.85)")
      .font("Helvetica")
      .fontSize(13)
      .text(content.subtitle, 45, 100, { width: W, align: "center" });

    doc
      .fillColor("#333333")
      .font("Helvetica")
      .fontSize(11)
      .text(content.description, 45, 210, { width: W, align: "center" });

    // Decorative line
    doc
      .moveTo(45 + W / 2 - 40, 240)
      .lineTo(45 + W / 2 + 40, 240)
      .lineWidth(2)
      .strokeColor(content.accentColor)
      .stroke();

    // Page count info
    doc
      .fillColor("#888888")
      .fontSize(10)
      .text(`${content.pages.length} pages · PDF imprimable · Format A4`, 45, 255, {
        width: W,
        align: "center",
      });

    // ── CONTENT PAGES ────────────────────────────────────────────
    for (const page of content.pages) {
      doc.addPage();

      // Header bar
      doc.rect(0, 0, doc.page.width, 50).fill(content.accentColor);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(16)
        .text(page.title, 45, 16, { width: W });

      // Month/date line (subtle)
      doc
        .fillColor("#cccccc")
        .font("Helvetica")
        .fontSize(9)
        .text(content.title, 45, 35, { width: W, align: "right" });

      let y = 70;

      for (const section of page.sections) {
        if (y > doc.page.height - 80) {
          doc.addPage();
          y = 30;
        }

        y = renderSection(doc, section, y, W, accent, accentLight, content.accentColor);
        y += 14;
      }
    }

    // ── BACK COVER ───────────────────────────────────────────────
    doc.addPage();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(content.accentColor);

    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(22)
      .text("Merci / Thank you", 45, doc.page.height / 2 - 40, {
        width: W,
        align: "center",
      });

    doc
      .fillColor("rgba(255,255,255,0.7)")
      .font("Helvetica")
      .fontSize(12)
      .text(
        content.language === "fr"
          ? "Ce planificateur a été créé pour vous aider à atteindre vos objectifs."
          : "This planner was created to help you reach your goals.",
        45,
        doc.page.height / 2,
        { width: W, align: "center" }
      );

    doc.end();
  });
}

function renderSection(
  doc: PDFKit.PDFDocument,
  section: PlannerSection,
  startY: number,
  W: number,
  accent: [number, number, number],
  accentLight: [number, number, number],
  accentHex: string
): number {
  let y = startY;
  const leftX = 45;

  // Section label
  doc
    .fillColor(accentHex)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(section.label.toUpperCase(), leftX, y);

  y += 16;

  if (section.type === "lines") {
    const rows = section.rows ?? 6;
    for (let i = 0; i < rows; i++) {
      doc
        .moveTo(leftX, y + 12)
        .lineTo(leftX + W, y + 12)
        .lineWidth(0.5)
        .strokeColor("#e5e7eb")
        .stroke();
      y += 20;
    }
  } else if (section.type === "checkbox") {
    const items = section.items ?? [];
    for (const item of items) {
      doc
        .roundedRect(leftX, y, 11, 11, 2)
        .lineWidth(1)
        .strokeColor(accentHex)
        .stroke();

      doc
        .fillColor("#374151")
        .font("Helvetica")
        .fontSize(10)
        .text(item, leftX + 18, y + 1);

      y += 20;
    }
  } else if (section.type === "time-slots") {
    const items = section.items ?? [];
    const colW = W / 2 - 5;
    for (let i = 0; i < items.length; i++) {
      const col = i % 2;
      const x = leftX + col * (colW + 10);
      if (col === 0 && i > 0) y += 22;

      doc
        .fillColor(accentHex)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(items[i], x, y + 1, { width: 35 });

      doc
        .moveTo(x + 38, y + 12)
        .lineTo(x + colW, y + 12)
        .lineWidth(0.5)
        .strokeColor("#e5e7eb")
        .stroke();
    }
    y += 22;
  } else if (section.type === "grid") {
    const cols = 7;
    const rows = section.rows ?? 5;
    const cellW = W / cols;
    const cellH = 28;

    // Header row
    const daysFR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const daysEN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const headers = section.items?.length === 7 ? section.items : daysFR;

    for (let c = 0; c < cols; c++) {
      doc
        .rect(leftX + c * cellW, y, cellW, 18)
        .fillColor(accentHex)
        .fill();
      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(headers[c] ?? daysEN[c], leftX + c * cellW + 2, y + 4, {
          width: cellW - 4,
          align: "center",
        });
    }
    y += 18;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        doc
          .rect(leftX + c * cellW, y, cellW, cellH)
          .lineWidth(0.5)
          .strokeColor("#e5e7eb")
          .stroke();
      }
      y += cellH;
    }
  } else {
    // freeform: big box
    const h = (section.rows ?? 4) * 20;
    const [lr, lg, lb] = accentLight;
    doc
      .rect(leftX, y, W, h)
      .fillColor(`rgb(${lr},${lg},${lb})`)
      .fill()
      .rect(leftX, y, W, h)
      .lineWidth(0.8)
      .strokeColor(accentHex)
      .stroke();
    y += h;
  }

  return y;
}
