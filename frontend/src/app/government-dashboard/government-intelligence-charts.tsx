"use client";

import React, { useState, useId } from "react";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Users,
  Building2,
  Award,
  ChevronRight,
  Filter,
  BarChart2,
  Calendar,
  Info,
  Shield,
  MapPin,
  ExternalLink,
} from "lucide-react";

// ==========================================
// 1. STATUS DONUT CHART
// ==========================================

export interface StatusSlice {
  status: string;
  count: number;
}

interface StatusDonutChartProps {
  data: StatusSlice[];
  total: number;
  selectedStatus?: string;
  onSelectStatus?: (status: string) => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; text: string; border: string }
> = {
  SUBMITTED: {
    label: "Pending Verification",
    color: "#f59e0b", // Amber 500
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    color: "#f97316", // Orange 500
    bg: "bg-orange-50",
    text: "text-orange-800",
    border: "border-orange-200",
  },
  VALIDATED: {
    label: "Gov Validated",
    color: "#10b981", // Emerald 500
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  PROJECT_INITIATED: {
    label: "Project Initiated",
    color: "#8b5cf6", // Purple 500
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
  },
  MATCHING: {
    label: "AI Matching",
    color: "#3b82f6", // Blue 500
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
  },
  MATCHED: {
    label: "Institution Matched",
    color: "#6366f1", // Indigo 500
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    border: "border-indigo-200",
  },
  IN_PROGRESS: {
    label: "Executing Pilot",
    color: "#06b6d4", // Cyan 500
    bg: "bg-cyan-50",
    text: "text-cyan-800",
    border: "border-cyan-200",
  },
  COMPLETED: {
    label: "Resolved & Closed",
    color: "#047857", // Emerald 700
    bg: "bg-emerald-100",
    text: "text-emerald-950",
    border: "border-emerald-300",
  },
  REJECTED: {
    label: "Rejected / Criteria",
    color: "#f43f5e", // Rose 500
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
  },
  DEFAULT: {
    label: "Other Status",
    color: "#94a3b8", // Slate 400
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
  },
};

export function StatusDonutChart({
  data,
  total,
  selectedStatus,
  onSelectStatus,
}: StatusDonutChartProps) {
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

  if (!data || data.length === 0 || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-center">
        <Info className="h-8 w-8 text-stone-300 mb-2" />
        <p className="text-xs font-bold text-stone-700">No status data available</p>
        <p className="text-[11px] text-stone-500 mt-0.5">
          No records match the current jurisdiction and filters.
        </p>
      </div>
    );
  }

  // Calculate SVG arc parameters (circle circumference: 2 * Math.PI * r = 2 * Math.PI * 40 = 251.327)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  const slices = data.map((item) => {
    const fraction = total > 0 ? item.count / total : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += fraction * circumference;
    const config = STATUS_CONFIG[item.status] || {
      ...STATUS_CONFIG.DEFAULT,
      label: item.status.replace(/_/g, " "),
    };
    const pct = Math.round(fraction * 100);

    return {
      ...item,
      config,
      pct,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeHoverItem = hoveredStatus
    ? slices.find((s) => s.status === hoveredStatus)
    : selectedStatus
    ? slices.find((s) => s.status === selectedStatus)
    : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Donut SVG */}
      <div className="relative shrink-0 w-44 h-44 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
          {/* Background Track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth="14"
          />
          {/* Slices */}
          {slices.map((slice) => {
            const isSelected = selectedStatus === slice.status;
            const isHovered = hoveredStatus === slice.status;
            return (
              <circle
                key={slice.status}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={slice.config.color}
                strokeWidth={isSelected || isHovered ? "17" : "14"}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                className="cursor-pointer transition-all duration-300 hover:opacity-90"
                onMouseEnter={() => setHoveredStatus(slice.status)}
                onMouseLeave={() => setHoveredStatus(null)}
                onClick={() => onSelectStatus && onSelectStatus(slice.status)}
                role="button"
                aria-label={`${slice.config.label}: ${slice.count} (${slice.pct}%)`}
              />
            );
          })}
        </svg>

        {/* Center Total / Hover Detail */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
          {activeHoverItem ? (
            <>
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 line-clamp-1">
                {activeHoverItem.config.label}
              </span>
              <span className="text-xl font-black text-stone-900 leading-tight">
                {activeHoverItem.count}
              </span>
              <span className="text-[10px] font-bold text-stone-500">
                {activeHoverItem.pct}%
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Total
              </span>
              <span className="text-2xl font-black text-stone-900 leading-tight">
                {total}
              </span>
              <span className="text-[10px] text-stone-400 font-medium">
                Lifecycle
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend & Interactive Filter List */}
      <div className="flex-1 w-full space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-400 pb-1 border-b border-stone-100">
          <span>Lifecycle Stage</span>
          <span>Count (Share)</span>
        </div>
        <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
          {slices.map((slice) => {
            const isSelected = selectedStatus === slice.status;
            return (
              <button
                key={slice.status}
                type="button"
                onClick={() => onSelectStatus && onSelectStatus(slice.status)}
                onMouseEnter={() => setHoveredStatus(slice.status)}
                onMouseLeave={() => setHoveredStatus(null)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition border ${
                  isSelected
                    ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                    : "hover:bg-stone-50 border-transparent text-stone-800"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: slice.config.color }}
                  />
                  <span className="truncate font-semibold">{slice.config.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                  <span className={`font-bold ${isSelected ? "text-white" : "text-stone-900"}`}>
                    {slice.count}
                  </span>
                  <span className={`text-[10px] ${isSelected ? "text-stone-300" : "text-stone-400"}`}>
                    ({slice.pct}%)
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. DOMAIN / CATEGORY HORIZONTAL BAR CHART
// ==========================================

export interface DomainItem {
  name: string;
  count: number;
}

interface DomainHorizontalBarChartProps {
  data: DomainItem[];
  total: number;
  selectedDomain?: string;
  onSelectDomain?: (domain: string) => void;
}

export function DomainHorizontalBarChart({
  data,
  total,
  selectedDomain,
  onSelectDomain,
}: DomainHorizontalBarChartProps) {
  if (!data || data.length === 0 || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-center">
        <Info className="h-8 w-8 text-stone-300 mb-2" />
        <p className="text-xs font-bold text-stone-700">No domain classification recorded</p>
        <p className="text-[11px] text-stone-500 mt-0.5">
          Citizen reports have not yet been classified into focus domains.
        </p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-2.5">
      {data.slice(0, 8).map((item) => {
        const pct = Math.round((item.count / total) * 100);
        const barWidthPct = Math.max(4, Math.round((item.count / maxCount) * 100));
        const isSelected =
          selectedDomain &&
          (selectedDomain.toLowerCase() === item.name.toLowerCase() ||
            selectedDomain.toLowerCase() === item.name.toLowerCase().replace(/ /g, "_"));

        return (
          <div
            key={item.name}
            onClick={() => onSelectDomain && onSelectDomain(item.name)}
            className={`p-2.5 rounded-xl border transition cursor-pointer group ${
              isSelected
                ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-600/20"
                : "bg-white border-stone-100 hover:border-stone-200 hover:bg-stone-50/60"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-stone-900 group-hover:text-emerald-800 transition truncate max-w-[240px]">
                {item.name.replace(/_/g, " ")}
              </span>
              <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                <span className="font-bold text-stone-900">{item.count}</span>
                <span className="text-[10px] text-stone-400">({pct}%)</span>
              </div>
            </div>
            <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isSelected ? "bg-emerald-700" : "bg-emerald-600 group-hover:bg-emerald-700"
                }`}
                style={{ width: `${barWidthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// 3. PRIORITY DISTRIBUTION PROFILE
// ==========================================

export interface PriorityItem {
  priority: string;
  count: number;
}

interface PriorityDistributionProfileProps {
  data: PriorityItem[];
  total: number;
  selectedPriority?: string;
  onSelectPriority?: (priority: string) => void;
}

export function PriorityDistributionProfile({
  data,
  total,
  selectedPriority,
  onSelectPriority,
}: PriorityDistributionProfileProps) {
  const PRIORITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

  const countsMap = new Map<string, number>();
  data.forEach((d) => countsMap.set(d.priority.toUpperCase(), d.count));

  const items = PRIORITY_ORDER.map((lvl) => ({
    priority: lvl,
    count: countsMap.get(lvl) || 0,
    pct: total > 0 ? Math.round(((countsMap.get(lvl) || 0) / total) * 100) : 0,
  }));

  const CONFIG: Record<
    string,
    { label: string; badge: string; border: string; bg: string; text: string; bar: string }
  > = {
    CRITICAL: {
      label: "Critical Urgency",
      badge: "bg-red-100 text-red-900 border-red-300",
      border: "border-red-200",
      bg: "bg-red-50/60",
      text: "text-red-950",
      bar: "bg-red-600",
    },
    HIGH: {
      label: "High Priority",
      badge: "bg-amber-100 text-amber-900 border-amber-300",
      border: "border-amber-200",
      bg: "bg-amber-50/60",
      text: "text-amber-950",
      bar: "bg-amber-600",
    },
    MEDIUM: {
      label: "Medium Priority",
      badge: "bg-blue-100 text-blue-900 border-blue-300",
      border: "border-blue-200",
      bg: "bg-blue-50/60",
      text: "text-blue-950",
      bar: "bg-blue-600",
    },
    LOW: {
      label: "Low Priority",
      badge: "bg-stone-100 text-stone-700 border-stone-300",
      border: "border-stone-200",
      bg: "bg-stone-50/60",
      text: "text-stone-900",
      bar: "bg-stone-500",
    },
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => {
        const cfg = CONFIG[item.priority] || CONFIG.LOW;
        const isSelected = selectedPriority === item.priority;

        return (
          <div
            key={item.priority}
            onClick={() => onSelectPriority && onSelectPriority(item.priority)}
            className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
              isSelected
                ? `${cfg.bg} ${cfg.border} ring-2 ring-stone-900`
                : `${cfg.bg} ${cfg.border} hover:opacity-95`
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${cfg.badge}`}>
                  {item.priority}
                </span>
                <span className="text-[10px] font-mono text-stone-500 font-bold">
                  {item.pct}%
                </span>
              </div>
              <div className={`text-2xl font-black ${cfg.text} mt-2`}>
                {item.count}
              </div>
            </div>
            <div className="mt-3">
              <div className="h-1.5 w-full bg-white/80 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${cfg.bar}`}
                  style={{ width: `${Math.min(item.pct, 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-stone-500 mt-1 block">
                {cfg.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// 4. PROBLEM REPORTING TREND (SVG LINE & AREA)
// ==========================================

export interface TrendDataPoint {
  date?: string;
  month?: string;
  period?: string;
  count: number;
}

interface ProblemTrendLineChartProps {
  data: TrendDataPoint[];
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

export function ProblemTrendLineChart({
  data,
  timeRange,
  onTimeRangeChange,
}: ProblemTrendLineChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const gradId = useId();

  if (!data || data.length === 0) {
    return (
      <div className="bg-stone-50 p-8 rounded-2xl border border-dashed border-stone-200 text-center">
        <Calendar className="h-8 w-8 text-stone-300 mx-auto mb-2" />
        <p className="text-xs font-bold text-stone-700">Insufficient historical data</p>
        <p className="text-[11px] text-stone-500 mt-0.5">
          No problem submissions recorded in the selected period.
        </p>
      </div>
    );
  }

  const counts = data.map((d) => Number(d.count || 0));
  const maxCount = Math.max(...counts, 5);
  const minCount = 0;
  const range = maxCount - minCount || 1;

  // SVG dimensions
  const width = 600;
  const height = 180;
  const paddingX = 40;
  const paddingY = 24;
  const graphWidth = width - paddingX * 2;
  const graphHeight = height - paddingY * 2;

  const points = data.map((d, i) => {
    const x = paddingX + (data.length > 1 ? (i / (data.length - 1)) * graphWidth : graphWidth / 2);
    const y = height - paddingY - (d.count / range) * graphHeight;
    const label = d.date || d.month || d.period || `P${i + 1}`;
    return { x, y, count: d.count, label };
  });

  // Build SVG path
  const linePath = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`;
  }, "");

  // Build Area path (closing to bottom)
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`
      : "";

  const totalIntake = counts.reduce((a, b) => a + b, 0);
  const peakIntake = Math.max(...counts);

  return (
    <div className="space-y-3">
      {/* Controls & Metrics Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-100">
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold block">
              Period Total
            </span>
            <span className="text-base font-black text-stone-900">{totalIntake}</span>
          </div>
          <div className="h-6 w-px bg-stone-200" />
          <div>
            <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold block">
              Peak Volume
            </span>
            <span className="text-base font-black text-emerald-800">{peakIntake}</span>
          </div>
        </div>

        {/* Time range buttons */}
        <div className="inline-flex items-center p-1 rounded-xl bg-stone-100 border border-stone-200 text-xs">
          {[
            { id: "7d", label: "7 Days" },
            { id: "30d", label: "30 Days" },
            { id: "90d", label: "90 Days" },
            { id: "all", label: "All Time" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => onTimeRangeChange(btn.id)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                timeRange === btn.id
                  ? "bg-white text-emerald-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden bg-stone-50/50 rounded-xl p-2 border border-stone-100">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          {[0, 0.5, 1].map((ratio) => {
            const y = height - paddingY - ratio * graphHeight;
            const val = Math.round(minCount + ratio * range);
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#94a3b8"
                  fontFamily="monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaPath} fill={`url(#${gradId})`} />

          {/* Trend Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p, idx) => {
            const isHovered = hoverIndex === idx;
            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                {/* Invisible larger target for easy hover */}
                <circle cx={p.x} cy={p.y} r="12" fill="transparent" />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? "5" : "3.5"}
                  fill={isHovered ? "#047857" : "#059669"}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-all duration-200"
                />
              </g>
            );
          })}

          {/* X-axis date labels */}
          {points
            .filter((_, idx) => {
              if (points.length <= 8) return true;
              return idx % Math.ceil(points.length / 7) === 0 || idx === points.length - 1;
            })
            .map((p, idx) => (
              <text
                key={idx}
                x={p.x}
                y={height - 4}
                textAnchor="middle"
                fontSize="9"
                fill="#64748b"
                fontFamily="monospace"
              >
                {p.label.length > 5 ? p.label.slice(5) : p.label}
              </text>
            ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoverIndex !== null && points[hoverIndex] && (
          <div
            className="absolute z-10 px-2.5 py-1.5 rounded-lg bg-stone-900 text-white text-[11px] shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-12"
            style={{
              left: `${(points[hoverIndex].x / width) * 100}%`,
              top: `${(points[hoverIndex].y / height) * 100}%`,
            }}
          >
            <div className="font-bold">{points[hoverIndex].count} Problems</div>
            <div className="text-[9px] text-stone-300 font-mono">
              {points[hoverIndex].label}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 5. DISTRICT RANKING VISUALIZATION
// ==========================================

export interface DistrictRankingItem {
  district_id: string;
  district_name: string;
  total_problems: number;
  high_priority: number;
  pending_review: number;
  validated?: number;
  active_pilots?: number;
  resolved?: number;
}

interface DistrictRankingBarChartProps {
  data: DistrictRankingItem[];
  selectedDistrictId?: string;
  onSelectDistrict: (districtId: string) => void;
  isDistrictOfficer?: boolean;
}

export function DistrictRankingBarChart({
  data,
  selectedDistrictId,
  onSelectDistrict,
  isDistrictOfficer,
}: DistrictRankingBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
        <MapPin className="h-8 w-8 text-stone-300 mx-auto mb-2" />
        <p className="text-xs font-bold text-stone-700">No district records available</p>
      </div>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total_problems), 1);

  return (
    <div className="space-y-2">
      {data.slice(0, 10).map((row) => {
        const isSelected = selectedDistrictId === row.district_id;
        const totalPct = Math.max(4, Math.round((row.total_problems / maxTotal) * 100));

        return (
          <div
            key={row.district_id || row.district_name}
            onClick={() => !isDistrictOfficer && row.district_id && onSelectDistrict(row.district_id)}
            className={`p-3 rounded-xl border transition ${
              isDistrictOfficer ? "" : "cursor-pointer"
            } ${
              isSelected
                ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-600/20"
                : "bg-white border-stone-200 hover:border-stone-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                <span className="font-bold text-stone-900">{row.district_name}</span>
                {isSelected && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-700 text-white">
                    Selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                {row.pending_review > 0 && (
                  <span className="text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    {row.pending_review} Pending
                  </span>
                )}
                {row.validated !== undefined && row.validated > 0 && (
                  <span className="text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {row.validated} Validated
                  </span>
                )}
                <span className="font-black text-stone-900">{row.total_problems} Total</span>
              </div>
            </div>

            {/* Stacked bar visualization */}
            <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-600 h-full rounded-l-full transition-all duration-300"
                style={{ width: `${totalPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// 6. INSTITUTIONAL RESPONSE PIPELINE FUNNEL
// ==========================================

export interface PipelineFunnelData {
  reported: number;
  aiStructured: number;
  governmentValidated: number;
  matched: number;
  institutionInterested: number;
  eoiSubmitted: number;
  pilot: number;
  resolved: number;
}

interface InstitutionalPipelineFunnelProps {
  pipeline: PipelineFunnelData | null;
  onSelectStage?: (stageKey: string) => void;
}

export function InstitutionalPipelineFunnel({
  pipeline,
  onSelectStage,
}: InstitutionalPipelineFunnelProps) {
  const stages = [
    {
      key: "reported",
      title: "1. Reported",
      count: pipeline?.reported ?? 0,
      desc: "Citizen intake",
      bg: "bg-stone-50",
      border: "border-stone-200",
      color: "text-stone-900",
      badge: "Intake",
    },
    {
      key: "aiStructured",
      title: "2. AI Structured",
      count: pipeline?.aiStructured ?? 0,
      desc: "Domain & severity",
      bg: "bg-teal-50/70",
      border: "border-teal-200",
      color: "text-teal-900",
      badge: "Structured",
    },
    {
      key: "governmentValidated",
      title: "3. Gov Validated",
      count: pipeline?.governmentValidated ?? 0,
      desc: "Reviewer approval",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      color: "text-emerald-900",
      badge: "Certified",
    },
    {
      key: "matched",
      title: "4. Matched",
      count: pipeline?.matched ?? 0,
      desc: "Capability recommendations",
      bg: "bg-blue-50/70",
      border: "border-blue-200",
      color: "text-blue-900",
      badge: "AI Match",
    },
    {
      key: "institutionInterested",
      title: "5. Interested",
      count: pipeline?.institutionInterested ?? 0,
      desc: "HEI/Industry engaged",
      bg: "bg-purple-50/70",
      border: "border-purple-200",
      color: "text-purple-900",
      badge: "Intent",
    },
    {
      key: "eoiSubmitted",
      title: "6. Solution Proposed",
      count: pipeline?.eoiSubmitted ?? 0,
      desc: "Proposed in Open Workspace",
      bg: "bg-indigo-50/70",
      border: "border-indigo-200",
      color: "text-indigo-900",
      badge: "Proposal",
    },
    {
      key: "pilot",
      title: "7. Pilot Project",
      count: pipeline?.pilot ?? 0,
      desc: "Field deployment",
      bg: "bg-amber-50/70",
      border: "border-amber-200",
      color: "text-amber-900",
      badge: "Execution",
    },
    {
      key: "resolved",
      title: "8. Impact Verified",
      count: pipeline?.resolved ?? 0,
      desc: "Outcome certified",
      bg: "bg-emerald-100/80",
      border: "border-emerald-300",
      color: "text-emerald-950",
      badge: "Closed Loop",
    },
  ];

  const reportedCount = pipeline?.reported ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
      {stages.map((st) => {
        const conversionPct =
          reportedCount > 0
            ? ((st.count / reportedCount) * 100).toFixed(1)
            : "0.0";

        return (
          <div
            key={st.key}
            onClick={() => onSelectStage && onSelectStage(st.key)}
            className={`p-3 rounded-2xl border ${st.bg} ${st.border} flex flex-col justify-between text-center relative group hover:shadow-xs transition cursor-pointer`}
          >
            <div>
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                {st.title}
              </div>
              <div className={`text-xl font-black ${st.color} my-1`}>
                {st.count}
              </div>
              <div className="text-[10px] font-semibold text-stone-500 mb-1">
                {st.key === "reported" ? "100% Intake" : `${conversionPct}% of intake`}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-stone-500 line-clamp-1">
                {st.desc}
              </div>
              <span className="mt-1 inline-block px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-white/80 border border-stone-200/80 text-stone-700">
                {st.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
