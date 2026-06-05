import puppeteer from "puppeteer";
import { NextRequest } from "next/server";

// Letter at 96 dpi
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
      // ── PNG: screenshot exactly the .page wrapper at 2× resolution ───────────
      // Render at Letter dimensions so the page element fills the viewport
      await page.setViewport({ width: LETTER_W, height: LETTER_H, deviceScaleFactor: 2 });
      await page.setContent(html, { waitUntil: "domcontentloaded" });

      // Find the primary page wrapper element and get its bounding box.
      // Fall back through common patterns Claude uses.
      const clip = await page.evaluate((lw, lh) => {
        const el = (
          document.querySelector(".page") ||
          document.querySelector("[class*='page']") ||
          document.querySelector("body > div") ||
          document.body
        ) as HTMLElement;
        const r = el.getBoundingClientRect();
        // If the element is smaller than expected, fall back to Letter dimensions
        return {
          x: Math.max(r.left, 0),
          y: Math.max(r.top, 0),
          width: r.width > 100 ? r.width : lw,
          height: r.height > 100 ? r.height : lh,
        };
      }, LETTER_W, LETTER_H);

      const image = await page.screenshot({ type: "png", clip });

      return new Response(Buffer.from(image), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${safeFilename}.png"`,
        },
      });
    } else {
      // ── PDF: scale-to-fit on Letter, single page ──────────────────────────────
      // Step 1: render at Letter width, unconstrained height
      await page.setViewport({ width: LETTER_W, height: 3000 });
      await page.setContent(html, { waitUntil: "domcontentloaded" });

      // Step 2: measure the natural rendered height
      const naturalH = await page.evaluate(() =>
        Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
      );

      // Step 3: if content overflows, inject CSS zoom to scale it down to fit
      if (naturalH > LETTER_H) {
        const zoom = LETTER_H / naturalH; // e.g. 0.82 if content is 1290px tall

        await page.evaluate((z, lw) => {
          const body = document.body;
          // Expand body width so content fills the full letter width after zoom
          body.style.cssText += `
            margin: 0;
            padding: 0;
            width: ${Math.ceil(lw / z)}px;
            zoom: ${z};
          `;
          // Expand the primary page wrapper to match the pre-zoom body width
          const wrapper = body.firstElementChild as HTMLElement | null;
          if (wrapper) wrapper.style.width = `${Math.ceil(lw / z)}px`;
          // Clip html to letter dimensions
          document.documentElement.style.cssText += `
            width: ${lw}px;
            overflow: hidden;
          `;
        }, zoom, LETTER_W);
      }

      const pdf = await page.pdf({
        width: `${LETTER_W}px`,
        height: `${LETTER_H}px`,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        pageRanges: "1",
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
