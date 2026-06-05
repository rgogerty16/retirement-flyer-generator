import puppeteer from "puppeteer";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { html, filename = "document" } = await req.json();

  if (!html?.trim()) {
    return new Response(JSON.stringify({ error: "html is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    const safeFilename = filename.replace(/[^a-z0-9_\-]/gi, "-").toLowerCase();
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
