import puppeteer from "puppeteer";
import { NextRequest } from "next/server";

// Letter at 96dpi: 816 × 1056 CSS pixels
const LETTER_W = 816;
const LETTER_H = 1056;

export async function POST(req: NextRequest) {
  const { html, filename = "document", format = "pdf" } = await req.json();

  if (!html?.trim()) {
    return new Response(JSON.stringify({ error: "html is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const safeFilename = filename.replace(/[^a-z0-9_\-]/gi, "-").toLowerCase();
  const browser = await puppeteer.launch({ headless: true });

  try {
    const page = await browser.newPage();

    if (format === "png") {
      // 2× device pixel ratio → crisp 1632×2112 image (retina quality)
      await page.setViewport({ width: LETTER_W, height: LETTER_H, deviceScaleFactor: 2 });
      await page.setContent(html, { waitUntil: "domcontentloaded" });
      const image = await page.screenshot({
        type: "png",
        clip: { x: 0, y: 0, width: LETTER_W, height: LETTER_H },
      });
      return new Response(Buffer.from(image), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${safeFilename}.png"`,
        },
      });
    } else {
      // PDF: set viewport to exact Letter dimensions so CSS layout matches the page
      await page.setViewport({ width: LETTER_W, height: LETTER_H, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: "domcontentloaded" });
      const pdf = await page.pdf({
        width: `${LETTER_W}px`,
        height: `${LETTER_H}px`,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        pageRanges: "1", // guarantee single page even if content overflows
      });
      return new Response(Buffer.from(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeFilename}.pdf"`,
        },
      });
    }
  } finally {
    await browser.close();
  }
}
