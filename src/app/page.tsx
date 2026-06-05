"use client";

import { useState, useEffect, useRef } from "react"; // useRef kept for step timer
import type { FlyerInputs } from "./api/generate/route";

const PLAN_OPTIONS = [
  "401(k)",
  "403(b)",
  "Pension",
  "ESPP",
  "Profit Sharing",
  "457(b)",
  "SIMPLE IRA",
  "SEP-IRA",
];

const EMPTY_COMPANY_FORM: FlyerInputs = {
  companyName: "",
  mode: "company",
  retirementPlans: [],
  matchingStructure: "",
  vestingSchedule: "",
  investmentOptions: "",
  eligibilityRules: "",
  additionalBenefits: "",
  includeEmailOutro: false,
};

const LOADING_STEPS: Record<"company" | "general", string[]> = {
  company: ["Writing your flyer…", "Almost done…"],
  general: ["Writing general 401(k) flyer…", "Almost done…"],
};

type Tab = "flyer" | "sources";

export default function Home() {
  const [form, setForm] = useState<FlyerInputs>(EMPTY_COMPANY_FORM);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [flyerHtml, setFlyerHtml] = useState<string | null>(null);
  const [sourcesHtml, setSourcesHtml] = useState<string | null>(null);
  const [emailOutro, setEmailOutro] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("flyer");
  const [pdfLoading, setPdfLoading] = useState<Tab | null>(null);
  const [copied, setCopied] = useState(false);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Advance loading step message over time
  useEffect(() => {
    if (loading) {
      setLoadingStep(0);
      const steps = LOADING_STEPS[form.mode];
      let idx = 0;
      stepTimerRef.current = setInterval(() => {
        idx++;
        if (idx < steps.length) setLoadingStep(idx);
        else if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      }, form.mode === "company" ? 8000 : 3000);
    } else {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    }
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, [loading, form.mode]);

  function setMode(mode: "company" | "general") {
    setForm((p) => ({ ...p, mode }));
  }

  function togglePlan(plan: string) {
    setForm((prev) => ({
      ...prev,
      retirementPlans: prev.retirementPlans.includes(plan)
        ? prev.retirementPlans.filter((p) => p !== plan)
        : [...prev.retirementPlans, plan],
    }));
  }

  async function handleGenerate(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setFlyerHtml(null);
    setSourcesHtml(null);
    setEmailOutro(null);
    setActiveTab("flyer");
    setLoading(true);

    try {
      const payload: FlyerInputs =
        form.mode === "general"
          ? { ...form, companyName: "General 401(k)" }
          : form;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setFlyerHtml(data.html);
      setSourcesHtml(data.sourcesHtml ?? null);
      setEmailOutro(data.emailOutro ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPdf(type: Tab) {
    const html = type === "flyer" ? flyerHtml : sourcesHtml;
    if (!html) return;
    setPdfLoading(type);
    try {
      const companySlug = form.companyName.replace(/\s+/g, "-") || "401k";
      const filename =
        type === "flyer"
          ? `${companySlug}-retirement-flyer`
          : `${companySlug}-sources-references`;
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, filename }),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "PDF failed");
    } finally {
      setPdfLoading(null);
    }
  }

  function handleCopyHtml() {
    const html = activeTab === "flyer" ? flyerHtml : sourcesHtml;
    if (!html) return;
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    const html = activeTab === "flyer" ? flyerHtml : sourcesHtml;
    if (!html) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  const activeHtml = activeTab === "flyer" ? flyerHtml : sourcesHtml;
  const hasContent = flyerHtml !== null;
  const steps = LOADING_STEPS[form.mode];

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-[#1a2e4a] text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-[#c9a84c] rounded flex items-center justify-center text-[#1a2e4a] font-bold text-sm">
            RF
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">
              Retirement Flyer Generator
            </h1>
            <p className="text-slate-300 text-xs">
              AI-researched one-page retirement plan snapshots for wealth advisor prospecting
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6 items-start">
        {/* Form panel */}
        <div className="w-[420px] shrink-0 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col gap-5">

          {/* Mode toggle */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Flyer Type</p>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setMode("company")}
                className={`flex-1 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  form.mode === "company"
                    ? "bg-[#1a2e4a] text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Company-Specific
              </button>
              <button
                type="button"
                onClick={() => setMode("general")}
                className={`flex-1 py-2 text-sm font-medium transition-colors cursor-pointer border-l border-slate-200 ${
                  form.mode === "general"
                    ? "bg-[#1a2e4a] text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                General 401(k)
              </button>
            </div>
          </div>

          {form.mode === "general" ? (
            /* General mode: no form needed */
            <div className="flex flex-col gap-3">
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 text-sm text-slate-600 leading-relaxed">
                Generates a clean one-page educational 401(k) overview — no company name needed. Covers contribution limits, employer match concept, vesting, tax treatment, and key planning concepts using 2025 IRS figures.
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.includeEmailOutro}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, includeEmailOutro: e.target.checked }))
                  }
                  className="w-4 h-4 accent-[#1a2e4a]"
                />
                <span className="text-sm text-slate-700">Include email subject + intro</span>
              </label>
            </div>
          ) : (
            /* Company-specific mode */
            <form onSubmit={handleGenerate} className="flex flex-col gap-5" id="company-form">
              {/* Company name */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Novartis, Johnson &amp; Johnson, Boeing"
                  value={form.companyName}
                  onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2e4a] focus:border-transparent"
                />
              </div>

              {/* Retirement plans */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">
                  Plans Offered <span className="text-slate-400 font-normal text-xs">(optional — will be researched)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLAN_OPTIONS.map((plan) => (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => togglePlan(plan)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                        form.retirementPlans.includes(plan)
                          ? "bg-[#1a2e4a] text-white border-[#1a2e4a]"
                          : "bg-white text-slate-600 border-slate-300 hover:border-[#1a2e4a]"
                      }`}
                    >
                      {plan}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional overrides — collapsed */}
              <details className="group">
                <summary className="text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700 select-none list-none flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Override / supplement research details
                </summary>
                <div className="mt-3 flex flex-col gap-3 pl-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600">Matching Structure</label>
                    <input type="text" placeholder="e.g. 100% match up to 5% of salary"
                      value={form.matchingStructure}
                      onChange={(e) => setForm((p) => ({ ...p, matchingStructure: e.target.value }))}
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2e4a]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600">Vesting Schedule</label>
                    <input type="text" placeholder="e.g. 3-year cliff or 20%/year over 5 years"
                      value={form.vestingSchedule}
                      onChange={(e) => setForm((p) => ({ ...p, vestingSchedule: e.target.value }))}
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2e4a]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600">Investment Options</label>
                    <textarea rows={2} placeholder="e.g. Target-date funds, index funds, company stock"
                      value={form.investmentOptions}
                      onChange={(e) => setForm((p) => ({ ...p, investmentOptions: e.target.value }))}
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2e4a] resize-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600">Eligibility / Retirement Age Rules</label>
                    <input type="text" placeholder="e.g. Age 55 with 10 years service"
                      value={form.eligibilityRules}
                      onChange={(e) => setForm((p) => ({ ...p, eligibilityRules: e.target.value }))}
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2e4a]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600">Additional Benefits</label>
                    <textarea rows={2} placeholder="e.g. Retiree health, HSA, life insurance"
                      value={form.additionalBenefits}
                      onChange={(e) => setForm((p) => ({ ...p, additionalBenefits: e.target.value }))}
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2e4a] resize-none" />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.includeEmailOutro}
                      onChange={(e) => setForm((p) => ({ ...p, includeEmailOutro: e.target.checked }))}
                      className="w-4 h-4 accent-[#1a2e4a]" />
                    <span className="text-sm text-slate-700">Include email subject + intro</span>
                  </label>
                </div>
              </details>
            </form>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type={form.mode === "company" ? "submit" : "button"}
            form={form.mode === "company" ? "company-form" : undefined}
            onClick={form.mode === "general" ? () => handleGenerate() : undefined}
            disabled={loading}
            className="bg-[#1a2e4a] hover:bg-[#243d61] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {steps[loadingStep]}
              </>
            ) : form.mode === "general" ? (
              "Generate General 401(k) Flyer"
            ) : (
              "Generate Flyer"
            )}
          </button>
        </div>

        {/* Preview panel */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {hasContent ? (
            <>
              {/* Tabs + action bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden mr-auto">
                  <button
                    onClick={() => setActiveTab("flyer")}
                    className={`px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      activeTab === "flyer" ? "bg-[#1a2e4a] text-white" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Flyer
                  </button>
                  {sourcesHtml && (
                    <button
                      onClick={() => setActiveTab("sources")}
                      className={`px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer border-l border-slate-200 ${
                        activeTab === "sources" ? "bg-[#1a2e4a] text-white" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Sources &amp; References
                    </button>
                  )}
                </div>

                {activeHtml && (
                  <>
                    <button onClick={handleCopyHtml}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg hover:border-[#1a2e4a] transition-colors cursor-pointer">
                      {copied ? "Copied!" : "Copy HTML"}
                    </button>
                    <button onClick={handlePrint}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg hover:border-[#1a2e4a] transition-colors cursor-pointer">
                      Print
                    </button>
                    <button
                      onClick={() => handleDownloadPdf(activeTab)}
                      disabled={pdfLoading === activeTab}
                      className="px-3 py-1.5 text-xs font-medium bg-[#1a2e4a] text-white border border-[#1a2e4a] rounded-lg hover:bg-[#243d61] disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {pdfLoading === activeTab ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating PDF…
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download PDF
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>

              {/* Iframe preview — 1056px = exact Letter height at 96dpi */}
              {activeHtml && (
                <iframe
                  key={activeTab}
                  srcDoc={activeHtml}
                  className="w-full bg-white rounded-xl shadow-sm border border-slate-200"
                  style={{ height: activeTab === "sources" ? "860px" : "1060px" }}
                  title={activeTab === "flyer" ? "Retirement Flyer Preview" : "Sources & References"}
                  sandbox="allow-same-origin"
                />
              )}

              {emailOutro && activeTab === "flyer" && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Email Intro</h3>
                  <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans">{emailOutro}</pre>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-slate-200 border-dashed min-h-[600px] text-center px-8">
              {loading ? (
                <div className="flex flex-col items-center gap-4 max-w-xs">
                  <div className="w-10 h-10 border-4 border-[#1a2e4a] border-t-transparent rounded-full animate-spin" />
                  <div>
                    <p className="text-slate-700 text-sm font-medium mb-1">{steps[loadingStep]}</p>
                    <div className="flex gap-1.5 justify-center mt-2">
                      {steps.map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            i <= loadingStep ? "bg-[#1a2e4a]" : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {form.mode === "company" && (
                    <p className="text-slate-400 text-xs">
                      Company-specific research takes ~30 seconds.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 text-sm max-w-xs">
                    {form.mode === "company"
                      ? "Enter a company name and click Generate Flyer. Add any known details to override Claude's defaults."
                      : "Click Generate to produce a general 401(k) educational flyer — no company needed."}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
