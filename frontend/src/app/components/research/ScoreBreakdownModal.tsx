"use client";

import React, { useEffect } from "react";
import { X, Sparkles, BookOpen, Database, Award, Compass, Calendar, FileText } from "lucide-react";
import { ScoreBreakdown } from "../../../lib/research-api";
import { useTranslation } from "../../../lib/i18n";

interface ScoreBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  itemType: "paper" | "dataset";
  relevanceScore: number;
  scoreBreakdown: ScoreBreakdown;
}

export function ScoreBreakdownModal({
  isOpen,
  onClose,
  title,
  itemType,
  relevanceScore,
  scoreBreakdown,
}: ScoreBreakdownModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const scorePct = Math.round(relevanceScore * 100);

  const factors = [
    {
      name: t("research.semantic_match", "Semantic Alignment"),
      score: scoreBreakdown.semantic,
      weight: "40%",
      desc: t(
        "research.semantic_desc",
        "Deep contextual match between civic problem description and scholarly vectors",
      ),
      icon: <Sparkles className="h-4 w-4 text-emerald-600" />,
    },
    {
      name: t("research.keyword_match", "Keyword & Capability Match"),
      score: scoreBreakdown.keyword,
      weight: "25%",
      desc: t(
        "research.keyword_desc",
        "Direct overlap with extracted problem keywords and capability taxonomy",
      ),
      icon: <FileText className="h-4 w-4 text-blue-600" />,
    },
    {
      name: t("research.domain_match", "Civic Domain Relevance"),
      score: scoreBreakdown.domain,
      weight: "15%",
      desc: t(
        "research.domain_desc",
        "Alignment with official government challenge sector and domain",
      ),
      icon: <Compass className="h-4 w-4 text-purple-600" />,
    },
  ];

  if (itemType === "paper") {
    if (scoreBreakdown.recency !== undefined) {
      factors.push({
        name: t("research.recency_factor", "Publication Recency"),
        score: scoreBreakdown.recency,
        weight: "10%",
        desc: t(
          "research.recency_desc",
          "Recent findings and current methodology (weighted towards post-2020 research)",
        ),
        icon: <Calendar className="h-4 w-4 text-amber-600" />,
      });
    }
    if (scoreBreakdown.citation !== undefined) {
      factors.push({
        name: t("research.citation_factor", "Scholarly Citations"),
        score: scoreBreakdown.citation,
        weight: "10%",
        desc: t(
          "research.citation_desc",
          "Peer-reviewed impact and scholarly adoption in academic literature",
        ),
        icon: <Award className="h-4 w-4 text-indigo-600" />,
      });
    }
  } else {
    if (scoreBreakdown.geographic !== undefined) {
      factors.push({
        name: t("research.geographic_factor", "Geographic Relevance"),
        score: scoreBreakdown.geographic,
        weight: "20%",
        desc: t(
          "research.geographic_desc",
          "Data relevance to regional, state, or district-level civic indicators",
        ),
        icon: <Compass className="h-4 w-4 text-rose-600" />,
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                itemType === "paper" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
              }`}
            >
              {itemType === "paper" ? (
                <BookOpen className="h-5 w-5" />
              ) : (
                <Database className="h-5 w-5" />
              )}
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                {itemType === "paper"
                  ? t("research.paper_score_analysis", "Paper Relevance Analysis")
                  : t("research.dataset_score_analysis", "Dataset Relevance Analysis")}
              </span>
              <h3 className="text-sm font-bold text-stone-900 line-clamp-1">{title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Overall Score Badge */}
        <div className="my-4 flex items-center justify-between rounded-xl bg-emerald-50 p-3.5 border border-emerald-100">
          <div>
            <div className="text-xs font-bold text-emerald-900">
              {t("research.overall_score", "Overall Match Score")}
            </div>
            <div className="text-[11px] text-emerald-700">
              {t("research.score_formula", "Deterministic weighted blend of semantic + domain features")}
            </div>
          </div>
          <div className="flex items-baseline gap-1 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-2xs">
            <span className="text-2xl font-black text-emerald-800">{scorePct}%</span>
          </div>
        </div>

        {/* Factor Breakdown */}
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {factors.map((factor, idx) => {
            const factorPct = Math.round(factor.score * 100);
            return (
              <div
                key={idx}
                className="rounded-xl border border-stone-200/70 p-3 hover:border-emerald-200 hover:bg-stone-50/50 transition"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-stone-800">
                    {factor.icon}
                    <span>{factor.name}</span>
                    <span className="text-[10px] font-normal text-stone-400">({factor.weight})</span>
                  </div>
                  <span className="font-extrabold text-stone-900">{factorPct}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, factorPct))}%` }}
                  />
                </div>
                <p className="text-[11px] text-stone-500 leading-tight">{factor.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-stone-100 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition shadow-2xs"
          >
            {t("common.close", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}
