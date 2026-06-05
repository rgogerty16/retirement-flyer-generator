import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface FlyerInputs {
  companyName: string;
  mode: "company" | "general";
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

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a professional financial communications designer creating a one-page educational retirement plan snapshot for employees aged 50–65.

OUTPUT: A single, complete, self-contained HTML file with embedded CSS. No external dependencies, no JavaScript.

SINGLE-PAGE REQUIREMENT (NON-NEGOTIABLE):
The rendered page must fit on exactly one Letter-size page (8.5×11 in).
- Include <style>@page { size: letter; margin: 0; }</style>
- Set the outer wrapper: width: 816px; max-height: 1056px; overflow: hidden
- Body font-size: 11px. Section headers: 12px. Footer: 9.5px
- Section vertical padding: 6–8px. Horizontal: 12–14px
- This is a GLANCE document — max 4 bullets per section, tight prose
- Use 2–3 column CSS grid to pack sections efficiently
- No decorative whitespace. Every pixel earns its place.

COLOR + TYPE:
- Navy #1a2e4a, white #ffffff, light gray #f5f7fa, gold accent #c9a84c
- Headings: Georgia, serif. Body: Arial, Helvetica, sans-serif

TONE: Educational, professional, neutral. No solicitation. No performance claims.

Return ONLY the raw HTML — no markdown fences, no explanation.`;

// ─── Prompts ──────────────────────────────────────────────────────────────────

function buildFlyerPrompt(inputs: FlyerInputs): string {
  if (inputs.mode === "general") {
    return `Create a one-page general 401(k) educational flyer for employees aged 50–65 approaching retirement.

This is a GENERAL flyer — not tied to any specific employer. Cover:
1. Header: "Understanding Your 401(k): A Retirement Planning Snapshot"
2. "What Is a 401(k)?" — brief explanation, pre-tax vs Roth
3. "Employer Match: Free Money" — explain the concept with an illustrative example (e.g. 100% on first 5%)
4. "2025 Contribution Limits" — $23,500 base, $31,000 if age 50+ (catch-up)
5. "Vesting: When It's Truly Yours" — cliff vs graded, why it matters near retirement
6. "Key Planning Concepts" — diversification, target-date funds, income planning horizon
7. "Questions to Ask Your Plan Administrator" — 5 sharp, practical questions
8. Footer disclaimer: "This material is for general educational purposes only and does not constitute investment, tax, or legal advice."

Use 2025 IRS figures. Label all match/vesting examples as illustrative.

After the flyer, output ---SOURCES_JSON--- then a JSON array of source objects with fields: category, claim, source_name, description.`;
  }

  const plansStr =
    inputs.retirementPlans.length > 0
      ? inputs.retirementPlans.join(", ")
      : "Not specified — use your best knowledge of this company's typical offerings";

  const overrides = [
    inputs.matchingStructure && `Match structure: ${inputs.matchingStructure}`,
    inputs.vestingSchedule && `Vesting: ${inputs.vestingSchedule}`,
    inputs.investmentOptions && `Investment options: ${inputs.investmentOptions}`,
    inputs.eligibilityRules && `Eligibility: ${inputs.eligibilityRules}`,
    inputs.additionalBenefits && `Additional benefits: ${inputs.additionalBenefits}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `Create a one-page retirement plan educational flyer for employees aged 50–65 at ${inputs.companyName}.

KNOWN DETAILS (provided by user — use these exactly):
- Plans offered: ${plansStr}
${overrides || "- No additional details provided"}

INSTRUCTIONS:
Use your knowledge of ${inputs.companyName}'s publicly known retirement benefits to fill in any gaps. If you are confident a detail is publicly known and accurate (e.g. from SEC filings, official press, or well-documented HR policies), include it as a fact. If a figure is uncertain or unavailable, use a clearly labeled "illustrative example" with a realistic industry benchmark.

REQUIRED SECTIONS:
1. Header: "Retirement Planning Overview: ${inputs.companyName}"
2. "What's Available to You" — plans offered, concise
3. "How Your Plans Work" — match, vesting, contributions
4. "Key Retirement Concepts" — diversification, tax treatment, income planning
5. "Questions to Ask Before You Retire" — 5–6 targeted, specific questions
6. Footer: "This material is for educational purposes only and is not affiliated with or endorsed by ${inputs.companyName}. It does not constitute investment, tax, or legal advice."

${
  inputs.includeEmailOutro
    ? `After </html>, output ---EMAIL--- then:
- Subject line (max 8 words)
- 2–3 sentence email intro`
    : ""
}

After the flyer (and email if included), output ---SOURCES_JSON--- then a JSON array of source objects with fields: category, claim, source_name, description. Only include real, verifiable sources. Label any illustrative figures as such.`;
}

// ─── Sources page builder ─────────────────────────────────────────────────────

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
<title>Sources – ${companyName} Retirement Flyer</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #1a2e4a; font-size: 12.5px; line-height: 1.5; }
  .page { width: 850px; min-height: 1100px; margin: 0 auto; display: flex; flex-direction: column; }
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
  .col-headers { display: grid; grid-template-columns: 1fr 1.6fr; gap: 12px; padding: 4px 10px 8px; border-bottom: 2px solid #1a2e4a; margin-bottom: 4px; }
  .col-headers span { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #1a2e4a; }
  .footer { background: #f5f7fa; border-top: 1px solid #d0dde9; padding: 12px 36px; font-size: 10px; color: #7a96ad; line-height: 1.5; }
  .footer strong { color: #1a2e4a; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-tag">Transparency &amp; Accuracy</div>
    <h1>Sources &amp; References: <span>${companyName}</span></h1>
    <div class="header-sub">Each claim in the retirement flyer is traced to its source below. Illustrative figures are clearly labeled.</div>
  </div>
  <div class="body">
    <div class="intro">Facts are drawn from publicly available government guidance, company disclosures, or clearly labeled illustrative examples. Verify plan-specific figures through official employer benefit portals.</div>
    <div class="col-headers"><span>Claim in Flyer</span><span>Source</span></div>
    ${rows}
  </div>
  <div class="footer">
    <strong>Note:</strong> This reference document is for transparency purposes only. Not affiliated with or endorsed by ${companyName}. Consult official plan documents and qualified professionals for personalized advice.
  </div>
</div>
</body>
</html>`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const inputs: FlyerInputs = await req.json();

    if (inputs.mode === "company" && !inputs.companyName?.trim()) {
      return NextResponse.json(
        { error: "Company name is required." },
        { status: 400 }
      );
    }

    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildFlyerPrompt(inputs) }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const raw = content.text;

    // Parse ---SOURCES_JSON---
    const sourcesMarker = "---SOURCES_JSON---";
    const sourcesIdx = raw.indexOf(sourcesMarker);
    const beforeSources = sourcesIdx !== -1 ? raw.slice(0, sourcesIdx) : raw;
    const sourcesRaw = sourcesIdx !== -1 ? raw.slice(sourcesIdx + sourcesMarker.length).trim() : "";

    // Parse ---EMAIL---
    const emailMarker = "---EMAIL---";
    const emailIdx = beforeSources.indexOf(emailMarker);
    let html = emailIdx !== -1 ? beforeSources.slice(0, emailIdx).trim() : beforeSources.trim();
    const emailOutro = emailIdx !== -1 ? beforeSources.slice(emailIdx + emailMarker.length).trim() : null;

    html = html.replace(/^```html\n?/i, "").replace(/```$/, "").trim();

    let sourcesHtml: string | null = null;
    if (sourcesRaw) {
      try {
        const cleanJson = sourcesRaw.replace(/^```json\n?/i, "").replace(/^```\n?/, "").replace(/```$/, "").trim();
        const sources: SourceEntry[] = JSON.parse(cleanJson);
        sourcesHtml = buildSourcesHtml(
          inputs.mode === "general" ? "General 401(k)" : inputs.companyName,
          sources
        );
      } catch {
        // Sources parse failed — UI hides sources tab
      }
    }

    return NextResponse.json({ html, sourcesHtml, emailOutro });
  } catch (err) {
    console.error("Generate error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    const friendlyError = msg.includes("credit balance is too low")
      ? "Your Anthropic API credits are too low. Add credits at console.anthropic.com → Plans & Billing."
      : msg.includes("401") || msg.includes("authentication")
      ? "Invalid API key. Check ANTHROPIC_API_KEY in your .env.local file."
      : "Failed to generate flyer. Check your API key and try again.";
    return NextResponse.json({ error: friendlyError }, { status: 500 });
  }
}
