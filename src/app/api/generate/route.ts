import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface FlyerInputs {
  companyName: string;
  retirementPlans: string[];
  matchingStructure: string;
  vestingSchedule: string;
  investmentOptions: string;
  eligibilityRules: string;
  additionalBenefits: string;
  includeEmailOutro: boolean;
}

interface SourceEntry {
  category: string;
  claim: string;
  source_name: string;
  description: string;
}

const SYSTEM_PROMPT = `You are a professional financial communications designer and retirement plan educator specializing in creating clear, compliant, and easy-to-understand one-page educational flyers for employees approaching retirement.

Your output must always be a single, complete, self-contained HTML document with embedded CSS — no external dependencies, no JavaScript. The design should be clean, professional, print-ready, and suitable for emailing.

Design requirements:
- Page size equivalent: letter (8.5×11in feel), single page
- Color palette: navy (#1a2e4a), white, light gray (#f5f7fa), gold accent (#c9a84c)
- Font stack: Georgia, 'Times New Roman', serif for headings; Arial, Helvetica, sans-serif for body
- Clear visual hierarchy with section headers, bullet points, and short sentences
- Reading level: 8th–10th grade clarity
- Tone: educational, professional, neutral — NOT salesy
- No "contact me," "schedule a call," or solicitation language
- No guarantees or performance claims

Return ONLY the raw HTML — no markdown fences, no explanation.`;

function buildUserPrompt(inputs: FlyerInputs): string {
  const plansStr =
    inputs.retirementPlans.length > 0
      ? inputs.retirementPlans.join(", ")
      : "Not specified";

  return `Create a one-page retirement plan educational flyer for employees aged 50–65 at ${inputs.companyName}.

COMPANY DETAILS:
- Company name: ${inputs.companyName}
- Retirement plans offered: ${plansStr}
- Matching structure: ${inputs.matchingStructure || "Not provided — use a common 401(k) match example and label it as illustrative"}
- Vesting schedule: ${inputs.vestingSchedule || "Not provided — use a typical 3-year graded schedule as an example and label it illustrative"}
- Investment options: ${inputs.investmentOptions || "Not provided — describe general best practices for diversification"}
- Eligibility / retirement age rules: ${inputs.eligibilityRules || "Not provided — use typical retirement age milestones (59½, 62, 65) as reference"}
- Additional benefits: ${inputs.additionalBenefits || "None specified"}

REQUIRED SECTIONS:
1. Header — "Retirement Planning Overview: ${inputs.companyName}"
2. "What You Have Available" — breakdown of available plans
3. "How the Plan Works" — match, vesting, contributions
4. "Key Retirement Considerations" — diversification, tax treatment (pre-tax vs Roth if applicable), income planning
5. "Questions to Ask Before You Retire" — 5–7 planning prompts employees should consider
6. Footer disclaimer: "This material is for educational purposes only and is not affiliated with or endorsed by ${inputs.companyName}. It does not constitute investment, tax, or legal advice."

${
  inputs.includeEmailOutro
    ? `ALSO include, after the </html> tag, a plain-text block labeled "---EMAIL---" containing:
- Subject line (max 8 words)
- 2–3 sentence email intro to accompany the flyer`
    : ""
}

After the flyer (and after ---EMAIL--- if included), output the marker ---SOURCES_JSON--- followed by a JSON array of source objects. Each object must have these exact fields:
  "category": topic group (e.g. "IRS / Tax Rules", "Employer Benefits", "Social Security", "Planning Concepts")
  "claim": the specific fact or claim in the flyer this source supports
  "source_name": the authoritative source name (e.g. "IRS Publication 560", "U.S. Department of Labor", "SSA.gov")
  "description": brief note on what this source covers and where to find it (do NOT invent URLs — describe the source location)

Only include real, verifiable sources. Label any illustrative figures clearly as "Illustrative example — not sourced."`;
}

function buildSourcesHtml(companyName: string, sources: SourceEntry[]): string {
  const categories = [...new Set(sources.map((s) => s.category))];

  const rows = categories
    .map((cat) => {
      const entries = sources.filter((s) => s.category === cat);
      return `
      <div class="category">
        <div class="cat-label">${cat}</div>
        ${entries
          .map(
            (e) => `
          <div class="source-row">
            <div class="claim">${e.claim}</div>
            <div class="source-info">
              <span class="source-name">${e.source_name}</span>
              <span class="source-desc">${e.description}</span>
            </div>
          </div>`
          )
          .join("")}
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Sources & References – ${companyName} Retirement Flyer</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #1a2e4a; font-size: 12.5px; line-height: 1.5; }
  .page { width: 850px; min-height: 1100px; margin: 0 auto; background: #fff; display: flex; flex-direction: column; }

  .header { background: #1a2e4a; color: #fff; padding: 24px 36px 20px; }
  .header-tag { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #c9a84c; margin-bottom: 6px; }
  .header h1 { font-family: Georgia, serif; font-size: 22px; font-weight: normal; }
  .header h1 span { color: #c9a84c; }
  .header-sub { font-size: 11.5px; color: #a8bdd0; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 8px; }

  .body { flex: 1; padding: 24px 36px; }

  .intro { background: #f5f7fa; border-left: 3px solid #c9a84c; padding: 12px 16px; margin-bottom: 20px; border-radius: 0 6px 6px 0; font-size: 12px; color: #3a5a78; }

  .category { margin-bottom: 18px; }
  .cat-label { font-family: Georgia, serif; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; color: #c9a84c; background: #1a2e4a; padding: 4px 10px; display: inline-block; border-radius: 3px; margin-bottom: 8px; }

  .source-row { display: grid; grid-template-columns: 1fr 1.6fr; gap: 12px; padding: 8px 10px; border-bottom: 1px solid #e8eff6; }
  .source-row:last-child { border-bottom: none; }
  .claim { font-size: 12px; color: #1a2e4a; font-style: italic; }
  .source-info { display: flex; flex-direction: column; gap: 2px; }
  .source-name { font-weight: bold; color: #1a2e4a; font-size: 12px; }
  .source-desc { font-size: 11px; color: #5a7a99; }

  .col-headers { display: grid; grid-template-columns: 1fr 1.6fr; gap: 12px; padding: 4px 10px 6px; }
  .col-headers span { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #8aaccc; }

  .footer { background: #f5f7fa; border-top: 1px solid #d0dde9; padding: 12px 36px; font-size: 10px; color: #7a96ad; }
  .footer strong { color: #1a2e4a; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-tag">Transparency & Accuracy</div>
    <h1>Sources &amp; References: <span>${companyName}</span></h1>
    <div class="header-sub">This page documents the sources behind each claim in the accompanying retirement planning flyer. Produced for educational purposes only.</div>
  </div>

  <div class="body">
    <div class="intro">
      All factual claims in the flyer are grounded in publicly available government guidance, employer-disclosed information, or clearly labeled as illustrative examples. Figures marked "illustrative" should be verified with the employer's official benefits documentation.
    </div>

    <div class="col-headers">
      <span>Claim in Flyer</span>
      <span>Source</span>
    </div>

    ${rows}
  </div>

  <div class="footer">
    <strong>Note:</strong> This reference document is provided for transparency and due-diligence purposes. It does not constitute investment, tax, or legal advice. Readers should verify all plan-specific details through official employer benefit portals and qualified professionals. This material is not affiliated with or endorsed by ${companyName}.
  </div>
</div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const inputs: FlyerInputs = await req.json();

    if (!inputs.companyName?.trim()) {
      return NextResponse.json(
        { error: "Company name is required." },
        { status: 400 }
      );
    }

    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(inputs) }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const raw = content.text;

    // Parse ---SOURCES_JSON--- block
    const sourcesMarker = "---SOURCES_JSON---";
    const sourcesIdx = raw.indexOf(sourcesMarker);
    const beforeSources =
      sourcesIdx !== -1 ? raw.slice(0, sourcesIdx) : raw;
    const sourcesRaw =
      sourcesIdx !== -1 ? raw.slice(sourcesIdx + sourcesMarker.length).trim() : "";

    // Parse ---EMAIL--- block (must come before sources marker)
    const emailMarker = "---EMAIL---";
    const emailIdx = beforeSources.indexOf(emailMarker);
    let html =
      emailIdx !== -1
        ? beforeSources.slice(0, emailIdx).trim()
        : beforeSources.trim();
    const emailOutro =
      emailIdx !== -1
        ? beforeSources.slice(emailIdx + emailMarker.length).trim()
        : null;

    // Strip accidental markdown fences
    html = html.replace(/^```html\n?/i, "").replace(/```$/, "").trim();

    // Parse sources JSON and build sources page
    let sourcesHtml: string | null = null;
    if (sourcesRaw) {
      try {
        const cleanJson = sourcesRaw
          .replace(/^```json\n?/i, "")
          .replace(/^```\n?/, "")
          .replace(/```$/, "")
          .trim();
        const sources: SourceEntry[] = JSON.parse(cleanJson);
        sourcesHtml = buildSourcesHtml(inputs.companyName, sources);
      } catch {
        // Sources parse failed — return null, UI will hide the tab
      }
    }

    return NextResponse.json({ html, sourcesHtml, emailOutro });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json(
      { error: "Failed to generate flyer. Check your API key and try again." },
      { status: 500 }
    );
  }
}
