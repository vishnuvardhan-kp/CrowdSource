"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Database,
  ExternalLink,
  Sparkles,
  FileText,
  Download,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import {
  fetchResearchIntelligence,
  ResearchIntelligenceData,
  PaperRecommendation,
  DatasetRecommendation,
  ScoreBreakdown,
} from "../../../lib/research-api";
import { ScoreBreakdownModal } from "./ScoreBreakdownModal";
import { useTranslation } from "../../../lib/i18n";

interface ResearchIntelligenceCardProps {
  challengeId: string;
  token?: string | null;
  compact?: boolean;
}

export function ResearchIntelligenceCard({
  challengeId,
  token,
  compact = false,
}: ResearchIntelligenceCardProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<ResearchIntelligenceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"papers" | "datasets">("papers");
  const [expandedAbstracts, setExpandedAbstracts] = useState<Record<number, boolean>>({});
  const [modalItem, setModalItem] = useState<{
    title: string;
    itemType: "paper" | "dataset";
    relevanceScore: number;
    scoreBreakdown: ScoreBreakdown;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchResearchIntelligence(challengeId, token);
      setData(res);
      // Auto-switch to available tab if papers empty
      if (res.papers.length === 0 && res.datasets.length > 0) {
        setActiveTab("datasets");
      }
    } catch (err: any) {
      console.error("Failed to load research intelligence:", err);
      setError(err.message || "Failed to load research intelligence");
    } finally {
      setLoading(false);
    }
  }, [challengeId, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleAbstract = (id: number) => {
    setExpandedAbstracts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const paperCount = data?.papers?.length || 0;
  const datasetCount = data?.datasets?.length || 0;

  return (
    <div className="rounded-2xl border border-stone-200/90 bg-gradient-to-b from-stone-50/70 to-white p-5 shadow-xs transition hover:shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-stone-900">
                {t("research.title", "Research Intelligence & Scholarly Evidence")}
              </h3>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                {t("research.badge_knowledge_base", "Knowledge Base")}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {t(
                "research.subtitle",
                "Curated scientific papers and open datasets retrieved to accelerate university solutions",
              )}
            </p>
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition disabled:opacity-50"
          title="Refresh research recommendations"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          <span>{t("common.refresh", "Refresh")}</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-10 space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-stone-500">
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
            <span>{t("research.loading", "Retrieving scholarly research vectors...")}</span>
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <div className="h-4 bg-stone-200/60 rounded animate-pulse w-3/4 mx-auto" />
            <div className="h-4 bg-stone-200/60 rounded animate-pulse w-1/2 mx-auto" />
          </div>
        </div>
      )}

      {/* Unavailable State (Graceful Degradation) */}
      {!loading && data?.status === "unavailable" && (
        <div className="my-4 rounded-xl bg-amber-50/80 p-4 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">
              {t("research.unavailable_title", "Research Service Temporarily Offline")}
            </div>
            <p className="mt-0.5 text-amber-800">
              {data.message ||
                t(
                  "research.unavailable_desc",
                  "The research intelligence index is currently performing maintenance. Core challenge submission and verification workflows remain unaffected.",
                )}
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && data && data.status !== "unavailable" && paperCount === 0 && datasetCount === 0 && (
        <div className="py-8 text-center text-stone-500">
          <BookOpen className="h-8 w-8 mx-auto text-stone-300 mb-2" />
          <p className="text-xs font-semibold">
            {t("research.empty_title", "No Research Intelligence Records Found")}
          </p>
          <p className="text-[11px] text-stone-400 mt-1 max-w-sm mx-auto">
            {t(
              "research.empty_desc",
              "No scientific papers or datasets currently meet the high relevance threshold for this specific problem domain.",
            )}
          </p>
        </div>
      )}

      {/* Active Content */}
      {!loading && data && data.status !== "unavailable" && (paperCount > 0 || datasetCount > 0) && (
        <div className="pt-4 space-y-4">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-stone-200">
            <button
              onClick={() => setActiveTab("papers")}
              className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition -mb-px ${
                activeTab === "papers"
                  ? "border-emerald-700 text-emerald-800"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>{t("research.papers_tab", "Scholarly Papers")}</span>
              <span
                className={`rounded-full px-2 py-0.2 text-[10px] font-extrabold ${
                  activeTab === "papers"
                    ? "bg-emerald-100 text-emerald-900"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                {paperCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("datasets")}
              className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition -mb-px ${
                activeTab === "datasets"
                  ? "border-blue-700 text-blue-800"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              <Database className="h-4 w-4" />
              <span>{t("research.datasets_tab", "Open Datasets")}</span>
              <span
                className={`rounded-full px-2 py-0.2 text-[10px] font-extrabold ${
                  activeTab === "datasets"
                    ? "bg-blue-100 text-blue-900"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                {datasetCount}
              </span>
            </button>
          </div>

          {/* Papers List */}
          {activeTab === "papers" && (
            <div className="space-y-3">
              {data.papers.slice(0, compact ? 3 : 10).map((paper) => {
                const scorePct = Math.round(paper.relevanceScore * 100);
                const isExpanded = !!expandedAbstracts[paper.id];
                return (
                  <div
                    key={paper.id}
                    className="group rounded-xl border border-stone-200 bg-white p-4 shadow-2xs hover:border-emerald-200 hover:shadow-xs transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        {/* Domain & Year Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          {paper.domain && (
                            <span className="rounded-md bg-stone-100 px-2 py-0.5 font-semibold text-stone-700">
                              {paper.domain}
                            </span>
                          )}
                          {paper.publicationYear && (
                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800 border border-emerald-100">
                              {paper.publicationYear}
                            </span>
                          )}
                          {paper.citationCount > 0 && (
                            <span className="rounded-md bg-purple-50 px-2 py-0.5 font-semibold text-purple-700 border border-purple-100">
                              {paper.citationCount} {t("research.citations", "citations")}
                            </span>
                          )}
                          {paper.isOpenAccess && (
                            <span className="rounded-md bg-teal-50 px-2 py-0.5 font-semibold text-teal-800 border border-teal-200">
                              {t("research.open_access", "Open Access")}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-bold text-stone-900 leading-snug group-hover:text-emerald-900 transition">
                          {paper.title}
                        </h4>

                        {/* Authors & Venue */}
                        <div className="text-[11px] text-stone-500">
                          {paper.authors && paper.authors.length > 0 && (
                            <span>{paper.authors.slice(0, 3).join(", ")}{paper.authors.length > 3 ? " et al." : ""}</span>
                          )}
                          {paper.venue && (
                            <span className="italic ml-1">· {paper.venue}</span>
                          )}
                        </div>

                        {/* Abstract */}
                        {paper.abstract && (
                          <div className="pt-1 text-xs text-stone-600 leading-relaxed">
                            <p className={isExpanded ? "" : "line-clamp-2"}>
                              {paper.abstract}
                            </p>
                            {paper.abstract.length > 150 && (
                              <button
                                onClick={() => toggleAbstract(paper.id)}
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                              >
                                {isExpanded ? (
                                  <>
                                    <span>{t("common.show_less", "Show less")}</span>
                                    <ChevronUp className="h-3 w-3" />
                                  </>
                                ) : (
                                  <>
                                    <span>{t("common.show_more", "Read abstract")}</span>
                                    <ChevronDown className="h-3 w-3" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Score Pill & Breakdown Trigger */}
                      <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2">
                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-center">
                          <span className="text-sm font-black text-emerald-800">{scorePct}%</span>
                          <span className="text-[9px] block font-bold text-emerald-600 uppercase tracking-wider">
                            {t("research.relevance", "Match")}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setModalItem({
                              title: paper.title,
                              itemType: "paper",
                              relevanceScore: paper.relevanceScore,
                              scoreBreakdown: paper.scoreBreakdown,
                            })
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
                        >
                          <Info className="h-3 w-3" />
                          <span>{t("research.why_recommended", "Why matched?")}</span>
                        </button>
                      </div>
                    </div>

                    {/* Links */}
                    <div className="mt-3 pt-2.5 border-t border-stone-100 flex flex-wrap items-center gap-3 text-xs">
                      {paper.pdfUrl && (
                        <a
                          href={paper.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>{t("research.view_pdf", "View PDF")}</span>
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      )}
                      {paper.openAccessUrl && paper.openAccessUrl !== paper.pdfUrl && (
                        <a
                          href={paper.openAccessUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-900"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>{t("research.open_access_link", "Open Access")}</span>
                        </a>
                      )}
                      {paper.doi && (
                        <a
                          href={`https://doi.org/${paper.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-800 text-[11px]"
                        >
                          <span>DOI: {paper.doi}</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                        </a>
                      )}
                      {paper.paperUrl && !paper.pdfUrl && (
                        <a
                          href={paper.paperUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900 text-[11px]"
                        >
                          <span>{t("research.source_link", "Publisher Page")}</span>
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Datasets List */}
          {activeTab === "datasets" && (
            <div className="space-y-3">
              {data.datasets.slice(0, compact ? 3 : 10).map((dataset) => {
                const scorePct = Math.round(dataset.relevanceScore * 100);
                return (
                  <div
                    key={dataset.id}
                    className="group rounded-xl border border-stone-200 bg-white p-4 shadow-2xs hover:border-blue-200 hover:shadow-xs transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        {/* Domain & Geographic Scope Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          {dataset.domain && (
                            <span className="rounded-md bg-stone-100 px-2 py-0.5 font-semibold text-stone-700">
                              {dataset.domain}
                            </span>
                          )}
                          {dataset.geographicScope && (
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 font-semibold text-blue-800 border border-blue-100">
                              {dataset.geographicScope}
                            </span>
                          )}
                          {dataset.format && (
                            <span className="rounded-md bg-stone-100 px-2 py-0.5 font-semibold text-stone-600 uppercase">
                              {dataset.format}
                            </span>
                          )}
                          {dataset.license && (
                            <span className="rounded-md bg-stone-50 px-2 py-0.5 text-stone-500 border border-stone-200">
                              {dataset.license}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-bold text-stone-900 leading-snug group-hover:text-blue-900 transition">
                          {dataset.title}
                        </h4>

                        {/* Description */}
                        {dataset.description && (
                          <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                            {dataset.description}
                          </p>
                        )}

                        {/* Features */}
                        {dataset.features && dataset.features.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            <span className="text-[10px] font-semibold text-stone-400">
                              {t("research.features", "Variables")}:
                            </span>
                            {dataset.features.slice(0, 4).map((feat, fidx) => (
                              <span
                                key={fidx}
                                className="rounded bg-stone-100 px-1.5 py-0.2 text-[10px] text-stone-600"
                              >
                                {feat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Score Pill & Breakdown Trigger */}
                      <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2">
                        <div className="rounded-xl bg-blue-50 border border-blue-200 px-2.5 py-1 text-center">
                          <span className="text-sm font-black text-blue-800">{scorePct}%</span>
                          <span className="text-[9px] block font-bold text-blue-600 uppercase tracking-wider">
                            {t("research.relevance", "Match")}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setModalItem({
                              title: dataset.title,
                              itemType: "dataset",
                              relevanceScore: dataset.relevanceScore,
                              scoreBreakdown: dataset.scoreBreakdown,
                            })
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline underline-offset-2"
                        >
                          <Info className="h-3 w-3" />
                          <span>{t("research.why_recommended", "Why matched?")}</span>
                        </button>
                      </div>
                    </div>

                    {/* Download & Source Links */}
                    <div className="mt-3 pt-2.5 border-t border-stone-100 flex flex-wrap items-center gap-3 text-xs">
                      {dataset.accessUrl && (
                        <a
                          href={dataset.accessUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>{t("research.access_dataset", "Access / Download Data")}</span>
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      )}
                      {dataset.sourceUrl && dataset.sourceUrl !== dataset.accessUrl && (
                        <a
                          href={dataset.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900 text-[11px]"
                        >
                          <span>{t("research.portal_link", "Dataset Portal")}</span>
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal for Score Breakdown */}
      {modalItem && (
        <ScoreBreakdownModal
          isOpen={!!modalItem}
          onClose={() => setModalItem(null)}
          title={modalItem.title}
          itemType={modalItem.itemType}
          relevanceScore={modalItem.relevanceScore}
          scoreBreakdown={modalItem.scoreBreakdown}
        />
      )}
    </div>
  );
}
