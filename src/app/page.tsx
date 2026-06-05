"use client";

import { useState } from "react";
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

const EMPTY_FORM: FlyerInputs = {
  companyName: "",
  retirementPlans: [],
  matchingStructure: "",
  vestingSchedule: "",
  investmentOptions: "",
  eligibilityRules: "",
  additionalBenefits: "",
  includeEmailOutro: false,
};

type Tab = "flyer" | "sources";

export default function Home() {
  const [form, setForm] = useState<FlyerInputs>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flyerHtml, setFlyerHtml] = useState<string | null>(null);
  const [sourcesHtml, setSourcesHtml] = useState<string | null>(null);
  const [emailOutro, setEmailOutro] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("flyer");
  const [pdfLoading, setPdfLoading] = useState<Tab | null>(null);
  const [copied, setCopied] = useState(false);

  function togglePlan(plan: string) {
    setForm((prev) => ({
      ...prev,
      retirementPlans: prev.retirementPlans.includes(plan)
        ? prev.retirementPlans.filter((p) => p !== plan)
        : [...prev.retirementPlans, plan],
    }));
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFlyerHtml(null);
    setSourcesHtml(null);
    setEmailOutro(null);
    setActiveTab("flyer");
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
      const filename =
        type === "flyer"
          ? `${form.companyName}-retirement-flyer`
          : `${form.companyName}-sources-references`;
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
      a.click();
      URL.revokeObjectURL(url);
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
              One-page educational flyers for wealth advisor prospecting
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6 items-start">
        {/* Form panel */}
        <form
          onSubmit={handleGenerate}
          className="w-[420px] shrink-0 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col gap-5"
        >
          <h2 className="text-base font-semibold text-slate-800">
            Company Details
          </h2>

          {/* Company name */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Novartis, Johnson &amp; Johnson"
              value={form.companyName}
              onChange={(e) =>
                setForm((p) => ({ ...p, companyName: e.target.value }))
              }
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2e4a] focus:border-transparent"
            />
          </div>

          {/* Retirement plans */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">
              Retirement Plans Offered
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

          {/* Match */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Matching Structure
            </label>
            <input
              type="text"
              placeholder="e.g. 100% match up to 4% of salary"
              value={form.matchingStructure}
              onChange={(e) =>
                setForm((p) => ({ ...p, matchingStructure: e.target.value }))
              }
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2e4a] focus:border-transparent"
            />
          </div>

          {/* Vesting */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Vesting Schedule
            </label>
            <input
              type="text"
              placeholder="e.g. 3-year cliff, or 20%/year over 5 years"
              value={form.vestingSchedule}
              onChange={(e) =>
                setForm((p) => ({ ...p, vestingSchedule: e.target.value }))
              }
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2e4a] focus:border-transparent"
            />
          </div>

          {/* Investment options */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Investment Options Overview
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Target-date funds, index funds, company stock option"
              value={form.investmentOptions}
              onChange={(e) =>
                setForm((p) => ({ ...p, investmentOptions: e.target.value }))
              }
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2e4a] focus:border-transparent resize-none"
            />
          </div>

          {/* Eligibility */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Eligibility / Retirement Age Rules
            </label>
            <input
              type="text"
              placeholder="e.g. Eligible at age 55 with 10 years service"
              value={form.eligibilityRules}
              onChange={(e) =>
                setForm((p) => ({ ...p, eligibilityRules: e.target.value }))
              }
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2e4a] focus:border-transparent"
            />
          </div>

          {/* Additional benefits */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Additional Benefits
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Retiree health coverage, HSA, life insurance"
              value={form.additionalBenefits}
              onChange={(e) =>
                setForm((p) => ({ ...p, additionalBenefits: e.target.value }))
              }
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2e4a] focus:border-transparent resize-none"
            />
          </div>

          {/* Email outro toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.includeEmailOutro}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  includeEmailOutro: e.target.checked,
                }))
              }
              className="w-4 h-4 accent-[#1a2e4a]"
            />
            <span className="text-sm text-slate-700">
              Include email subject line + intro
            </span>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-[#1a2e4a] hover:bg-[#243d61] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm transition-colors cursor-pointer"
          >
            {loading ? "Generating…" : "Generate Flyer"}
          </button>
        </form>

        {/* Preview panel */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {hasContent ? (
            <>
              {/* Tabs + action bar */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Tabs */}
                <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden mr-auto">
                  <button
                    onClick={() => setActiveTab("flyer")}
                    className={`px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      activeTab === "flyer"
                        ? "bg-[#1a2e4a] text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Flyer
                  </button>
                  {sourcesHtml && (
                    <button
                      onClick={() => setActiveTab("sources")}
                      className={`px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer border-l border-slate-200 ${
                        activeTab === "sources"
                          ? "bg-[#1a2e4a] text-white"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Sources &amp; References
                    </button>
                  )}
                </div>

                {/* Actions for active tab */}
                {activeHtml && (
                  <>
                    <button
                      onClick={handleCopyHtml}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg hover:border-[#1a2e4a] transition-colors cursor-pointer"
                    >
                      {copied ? "Copied!" : "Copy HTML"}
                    </button>
                    <button
                      onClick={handlePrint}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg hover:border-[#1a2e4a] transition-colors cursor-pointer"
                    >
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

              {/* Content iframe */}
              {activeHtml && (
                <iframe
                  key={activeTab}
                  srcDoc={activeHtml}
                  className="w-full bg-white rounded-xl shadow-sm border border-slate-200"
                  style={{ height: activeTab === "sources" ? "800px" : "1100px" }}
                  title={activeTab === "flyer" ? "Retirement Flyer Preview" : "Sources & References"}
                  sandbox="allow-same-origin"
                />
              )}

              {/* Email outro */}
              {emailOutro && activeTab === "flyer" && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">
                    Email Intro
                  </h3>
                  <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans">
                    {emailOutro}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-slate-200 border-dashed min-h-[600px] text-center px-8">
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-[#1a2e4a] border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-500 text-sm">
                    Claude is drafting your flyer and sources…
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-slate-500 text-sm max-w-xs">
                    Fill in the company details on the left, then click{" "}
                    <strong>Generate Flyer</strong> to produce a print-ready
                    flyer with a sources reference page.
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
