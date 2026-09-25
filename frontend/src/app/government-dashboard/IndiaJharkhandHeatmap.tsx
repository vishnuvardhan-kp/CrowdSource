"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  MapPin,
  Compass,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Info,
  X,
  ChevronRight,
  Eye,
  Filter,
  Globe,
  SlidersHorizontal,
  Building2,
  Activity,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { JHARKHAND_REAL_BOUNDARIES } from "./jharkhand-real-boundaries";

// Canonical centers for Jharkhand's 24 districts (latitude, longitude)
export const JHARKHAND_DISTRICT_CENTERS: Record<string, { lat: number; lng: number; code: string }> = {
  "Ranchi": { lat: 23.3239, lng: 85.3660, code: "RAN" },
  "Dhanbad": { lat: 23.8261, lng: 86.4663, code: "DHN" },
  "East Singhbhum": { lat: 22.5791, lng: 86.4472, code: "ESB" },
  "East Singhbum": { lat: 22.5791, lng: 86.4472, code: "ESB" },
  "Bokaro": { lat: 23.6907, lng: 85.9848, code: "BOK" },
  "Hazaribagh": { lat: 24.0582, lng: 85.4208, code: "HAZ" },
  "Deoghar": { lat: 24.3271, lng: 86.7341, code: "DEO" },
  "Giridih": { lat: 24.2935, lng: 86.1036, code: "GIR" },
  "Palamu": { lat: 24.2016, lng: 84.1613, code: "PAL" },
  "Ramgarh": { lat: 23.6249, lng: 85.5537, code: "RAM" },
  "West Singhbhum": { lat: 22.4165, lng: 85.5135, code: "WSB" },
  "Saraikela Kharsawan": { lat: 22.8458, lng: 85.9444, code: "SKK" },
  "Dumka": { lat: 24.3176, lng: 87.2605, code: "DUM" },
  "Godda": { lat: 24.8589, lng: 87.3064, code: "GOD" },
  "Sahibganj": { lat: 25.0088, lng: 87.6598, code: "SAH" },
  "Sahebganj": { lat: 25.0088, lng: 87.6598, code: "SAH" },
  "Pakur": { lat: 24.5613, lng: 87.6588, code: "PAK" },
  "Jamtara": { lat: 23.9750, lng: 86.9071, code: "JAM" },
  "Koderma": { lat: 24.5007, lng: 85.6626, code: "KOD" },
  "Chatra": { lat: 24.1654, lng: 84.8819, code: "CHA" },
  "Garhwa": { lat: 24.1006, lng: 83.6927, code: "GAR" },
  "Latehar": { lat: 23.7154, lng: 84.4382, code: "LAT" },
  "Lohardaga": { lat: 23.4744, lng: 84.6621, code: "LOH" },
  "Gumla": { lat: 23.1007, lng: 84.5278, code: "GUM" },
  "Simdega": { lat: 22.5777, lng: 84.5596, code: "SIM" },
  "Khunti": { lat: 22.9828, lng: 85.2542, code: "KHU" },
};

// SVG Projection math:
// Longitude: 68.0° E -> 98.0° E (span 30° mapped to 1000 px)
// Latitude: 38.0° N -> 8.0° N (span 30° mapped to 1000 px)
export function projectCoords(lng: number, lat: number) {
  const x = (lng - 68.0) * (1000 / 30.0);
  const y = (38.0 - lat) * (1000 / 30.0);
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

// Neighboring state polygons for India spatial context
const SURROUNDING_STATES = [
  { name: "Bihar", path: "510,380 670,380 670,420 630,425 570,436 510,440" },
  { name: "West Bengal", path: "670,380 720,440 700,530 655,540 630,494 675,434" },
  { name: "Odisha", path: "550,530 635,530 660,620 560,650 520,580" },
  { name: "Chhattisgarh", path: "450,440 512,442 535,530 520,580 430,560" },
  { name: "Uttar Pradesh", path: "360,320 510,380 512,442 450,440 380,400" },
  { name: "Madhya Pradesh", path: "260,420 450,440 430,560 300,560" },
  { name: "Rajasthan", path: "120,320 280,320 260,450 150,480" },
  { name: "Gujarat", path: "40,440 160,460 160,560 60,560 30,490" },
  { name: "Maharashtra", path: "180,560 350,560 380,680 220,680" },
  { name: "Karnataka", path: "220,680 340,680 320,840 230,800" },
  { name: "Andhra Pradesh", path: "350,600 480,600 450,760 360,760" },
  { name: "Tamil Nadu", path: "300,780 380,780 360,930 290,920" },
  { name: "Kerala", path: "250,810 300,810 290,920 260,900" },
  { name: "Assam & NE", path: "720,350 900,320 920,450 780,480 730,420" },
  { name: "Jammu & Kashmir / Ladakh", path: "200,90 340,90 320,230 190,210" },
];

export interface HotspotPoint {
  id: string;
  title: string;
  summary: string;
  domain: string;
  priority: string;
  status: string;
  district: string;
  district_id?: string;
  latitude: number;
  longitude: number;
  village_locality?: string;
  affected_population?: string;
  submitted_at?: string;
}

export interface DistrictHotspot {
  district_id: string;
  district_name: string;
  state: string;
  total_problems: number;
  mapped_problems: number;
  unmapped_problems: number;
  high_priority: number;
  pending_review: number;
  active_in_progress: number;
  resolved: number;
  centroid: {
    latitude: number | null;
    longitude: number | null;
  };
}

export interface HeatmapData {
  summary: {
    total_problems: number;
    mapped_problems: number;
    unmapped_problems: number;
    high_priority: number;
    pending_review: number;
    active_in_progress: number;
    resolved: number;
    districts_covered: number;
    top_domain: string;
  };
  points: HotspotPoint[];
  district_hotspots: DistrictHotspot[];
  domain_breakdown: { domain: string; count: number; mapped: number; unmapped: number }[];
  jurisdiction: {
    role: string;
    scope: string;
    district_id: string | null;
    district_name: string | null;
    is_district_officer: boolean;
  };
}

interface Props {
  selectedDistrictId?: string;
  onSelectDistrict?: (districtId: string) => void;
  selectedDomain?: string;
  selectedPriority?: string;
  selectedStatus?: string;
  timeRange?: string;
}

// Default ViewBox configurations:
// Jharkhand focus centered precisely around Jharkhand's bounds (4:3 aspect ratio)
const JHARKHAND_VIEWBOX = { x: 497, y: 410, w: 180, h: 135 };
// Full India overview
const INDIA_VIEWBOX = { x: 0, y: 50, w: 980, h: 920 };

export default function IndiaJharkhandHeatmap({
  selectedDistrictId,
  onSelectDistrict,
  selectedDomain = "",
  selectedPriority = "",
  selectedStatus = "",
  timeRange = "all",
}: Props) {
  const { token, user } = useAuth();
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ViewBox & Map state
  const [viewBox, setViewBox] = useState(JHARKHAND_VIEWBOX);
  const [viewMode, setViewMode] = useState<"jharkhand" | "india">("jharkhand");
  const [showPins, setShowPins] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showDistrictChoropleth, setShowDistrictChoropleth] = useState(true);

  // Hover & selection states
  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictHotspot | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotPoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<HotspotPoint | null>(null);
  const [inspectDistrict, setInspectDistrict] = useState<DistrictHotspot | null>(null);
  const [showUnmappedDrawer, setShowUnmappedDrawer] = useState(false);

  // Pan / Dragging state
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDragging = useRef(false);
  const startDrag = useRef({ x: 0, y: 0, vX: 0, vY: 0 });

  // Fetch real problem hotspot telemetry from backend
  const fetchHotspots = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedDistrictId) params.append("district_id", selectedDistrictId);
      if (selectedDomain) params.append("domain", selectedDomain);
      if (selectedPriority) params.append("priority", selectedPriority);
      if (selectedStatus) params.append("status", selectedStatus);
      if (timeRange && timeRange !== "all") params.append("timeRange", timeRange);

      const res = await fetch(`/api/admin/analytics/problem-hotspots?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load geographic problem data (HTTP ${res.status})`);
      }

      const resData = await res.json();
      setData(resData);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching problem hotspots:", err);
      setError(err.message || "Failed to load geographic telemetry");
    } finally {
      setLoading(false);
    }
  }, [token, selectedDistrictId, selectedDomain, selectedPriority, selectedStatus, timeRange]);

  useEffect(() => {
    fetchHotspots();
  }, [fetchHotspots]);

  // Handle camera transitions
  const focusJharkhand = () => {
    setViewBox(JHARKHAND_VIEWBOX);
    setViewMode("jharkhand");
    setInspectDistrict(null);
  };

  const zoomToIndia = () => {
    setViewBox(INDIA_VIEWBOX);
    setViewMode("india");
    setInspectDistrict(null);
  };

  const handleZoom = (factor: number) => {
    setViewBox((prev) => {
      const nw = prev.w * factor;
      const nh = prev.h * factor;
      const nx = prev.x + (prev.w - nw) / 2;
      const ny = prev.y + (prev.h - nh) / 2;
      return { x: Math.max(0, nx), y: Math.max(0, ny), w: nw, h: nh };
    });
  };

  // Mouse pan event handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    isDragging.current = true;
    startDrag.current = {
      x: e.clientX,
      y: e.clientY,
      vX: viewBox.x,
      vY: viewBox.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;

    const dx = (e.clientX - startDrag.current.x) * scaleX;
    const dy = (e.clientY - startDrag.current.y) * scaleY;

    setViewBox((prev) => ({
      ...prev,
      x: startDrag.current.vX - dx,
      y: startDrag.current.vY - dy,
    }));
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // District lookup map for fast stats retrieval
  const districtStatsMap = useMemo(() => {
    const map = new Map<string, DistrictHotspot>();
    if (!data?.district_hotspots) return map;
    for (const dh of data.district_hotspots) {
      map.set(dh.district_name.toLowerCase(), dh);
      if (dh.district_name.toLowerCase() === "east singhbum") {
        map.set("east singhbhum", dh);
      }
      if (dh.district_name.toLowerCase() === "east singhbhum") {
        map.set("east singhbum", dh);
      }
      if (dh.district_name.toLowerCase() === "sahebganj") {
        map.set("sahibganj", dh);
      }
      if (dh.district_name.toLowerCase() === "kodarma") {
        map.set("koderma", dh);
      }
      if (dh.district_name.toLowerCase() === "hazaribag") {
        map.set("hazaribagh", dh);
      }
    }
    return map;
  }, [data]);

  // Color generator for district problem density based on real database analytics
  const getDistrictFillColor = (districtName: string) => {
    const stats = districtStatsMap.get(districtName.toLowerCase());
    const count = stats?.total_problems ?? 0;
    if (count === 0) return "#1e293b"; // slate-800: No Recorded Problems
    if (count <= 5) return "#065f46"; // emerald-800: 1-5 Active
    if (count <= 20) return "#047857"; // emerald-700: 6-20 Moderate
    if (count <= 100) return "#059669"; // emerald-600: 21-100 High
    return "#0f766e"; // teal-700: 100+ Hotspot
  };

  // Click on a district
  const handleDistrictClick = (name: string) => {
    const stats = districtStatsMap.get(name.toLowerCase());
    if (stats) {
      setInspectDistrict(stats);
      if (onSelectDistrict && stats.district_id) {
        onSelectDistrict(stats.district_id);
      }
    }
  };

  // Status badge styling helper
  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case "CRITICAL":
        return { bg: "bg-red-500", text: "text-red-700", ring: "ring-red-400" };
      case "HIGH":
        return { bg: "bg-amber-500", text: "text-amber-700", ring: "ring-amber-400" };
      case "MEDIUM":
        return { bg: "bg-blue-500", text: "text-blue-700", ring: "ring-blue-400" };
      default:
        return { bg: "bg-stone-500", text: "text-stone-700", ring: "ring-stone-400" };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col min-w-0">
      {/* Top Header & Telemetry Bar */}
      <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/70 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-700 text-white shadow-2xs">
              <Compass className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                Spatial Problem Intelligence Heatmap
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {viewMode === "jharkhand" ? "Jharkhand Focused" : "India Overview"}
                </span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Authentic GIS district boundaries, real GPS problem pins, and district problem density.
              </p>
            </div>
          </div>
        </div>

        {/* Viewport Control Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={focusJharkhand}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition shadow-2xs ${
              viewMode === "jharkhand"
                ? "bg-emerald-700 text-white"
                : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50"
            }`}
            title="Focus camera directly on Jharkhand State"
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>Focus Jharkhand</span>
          </button>

          <button
            onClick={zoomToIndia}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition shadow-2xs ${
              viewMode === "india"
                ? "bg-emerald-700 text-white"
                : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50"
            }`}
            title="Zoom out to full India national overview"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Zoom to India</span>
          </button>

          <div className="h-6 w-px bg-stone-200 mx-1 hidden sm:block" />

          {/* Zoom In / Out Buttons */}
          <div className="inline-flex rounded-xl border border-stone-200 bg-white p-0.5 shadow-2xs">
            <button
              onClick={() => handleZoom(0.8)}
              className="p-1.5 text-stone-700 hover:bg-stone-100 rounded-lg transition"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleZoom(1.25)}
              className="p-1.5 text-stone-700 hover:bg-stone-100 rounded-lg transition"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={focusJharkhand}
              className="p-1.5 text-stone-700 hover:bg-stone-100 rounded-lg transition"
              title="Reset View"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Layers Toggle */}
          <button
            onClick={() => setShowPins(!showPins)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
              showPins ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-white text-stone-500 border-stone-200"
            }`}
          >
            {showPins ? "GPS Pins: On" : "GPS Pins: Off"}
          </button>

          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
              showLabels ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-white text-stone-500 border-stone-200"
            }`}
          >
            {showLabels ? "Labels: On" : "Labels: Off"}
          </button>
        </div>
      </div>

      {/* KPI Micro-Bar */}
      {data?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 p-3 bg-stone-100/60 border-b border-stone-200 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-stone-400 block text-[10px] font-bold uppercase">Total Problems</span>
            <span className="text-base font-black text-stone-900">{data.summary.total_problems}</span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-emerald-600 block text-[10px] font-bold uppercase">Mapped With GPS</span>
            <span className="text-base font-black text-emerald-700">{data.summary.mapped_problems}</span>
          </div>

          {/* Unmapped Problems Badge - 100% Accounted For */}
          <div
            onClick={() => setShowUnmappedDrawer(true)}
            className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-300 shadow-2xs cursor-pointer hover:bg-amber-100 transition group"
            title="Click to inspect all unmapped problems counted in district registers"
          >
            <div className="flex items-center justify-between">
              <span className="text-amber-800 block text-[10px] font-bold uppercase">Unmapped (Audited)</span>
              <Eye className="h-3 w-3 text-amber-700 opacity-60 group-hover:opacity-100" />
            </div>
            <span className="text-base font-black text-amber-900">{data.summary.unmapped_problems}</span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-red-500 block text-[10px] font-bold uppercase">High / Critical</span>
            <span className="text-base font-black text-red-600">{data.summary.high_priority}</span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-blue-500 block text-[10px] font-bold uppercase">Active Projects</span>
            <span className="text-base font-black text-blue-700">{data.summary.active_in_progress}</span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-stone-500 block text-[10px] font-bold uppercase">Districts Covered</span>
            <span className="text-base font-black text-stone-800">{data.summary.districts_covered} / 24</span>
          </div>
        </div>
      )}

      {/* Main Map Canvas & Interactive Area */}
      <div className="relative w-full h-[520px] sm:h-[600px] bg-stone-900 select-none overflow-hidden cursor-grab active:cursor-grabbing">
        {loading && (
          <div className="absolute inset-0 z-30 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-400 border-t-transparent mx-auto" />
              <p className="text-xs text-stone-200 font-medium">Rendering spatial telemetry & district bounds...</p>
            </div>
          </div>
        )}

        {/* SVG Interactive Canvas */}
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            {/* Heatmap point glow filter */}
            <filter id="hotspot-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Pulse animation for critical hotspots */}
            <style>{`
              @keyframes pin-pulse {
                0% { r: 1.2px; opacity: 0.9; }
                50% { r: 3.5px; opacity: 0.3; }
                100% { r: 1.2px; opacity: 0.9; }
              }
              .pulse-circle {
                animation: pin-pulse 2s infinite ease-in-out;
              }
            `}</style>
          </defs>

          {/* LAYER 1: Background & Ocean */}
          <rect x="-200" y="-200" width="1400" height="1400" fill="#0c131f" />

          {/* LAYER 2: Neighboring Indian States (Context Boundary) */}
          <g id="surrounding-states" opacity={viewMode === "india" ? "0.95" : "0.45"}>
            {SURROUNDING_STATES.map((st) => (
              <polygon
                key={st.name}
                points={st.path}
                fill="#1e293b"
                stroke="#334155"
                strokeWidth={viewMode === "india" ? "1" : "0.4"}
                className="transition-colors hover:fill-stone-800"
              />
            ))}
          </g>

          {/* LAYER 3: Jharkhand State Boundary Outline */}
          <g id="jharkhand-state-boundary" pointerEvents="none">
            {Object.values(JHARKHAND_REAL_BOUNDARIES).map((b, i) => (
              <path
                key={`border-${i}`}
                d={b.path}
                fill="none"
                stroke="#10b981"
                strokeWidth={viewMode === "india" ? "1.5" : "0.7"}
                strokeLinejoin="round"
                opacity={viewMode === "india" ? "0.9" : "0.6"}
              />
            ))}
          </g>

          {/* LAYER 4: 24 Jharkhand District Real Geographic Boundaries (Interactive Choropleth) */}
          <g id="jharkhand-districts">
            {Object.entries(JHARKHAND_REAL_BOUNDARIES).map(([districtName, districtInfo]) => {
              const stats = districtStatsMap.get(districtName.toLowerCase());
              const isHovered = hoveredDistrict?.district_name?.toLowerCase() === districtName.toLowerCase();
              const isSelected = inspectDistrict?.district_name?.toLowerCase() === districtName.toLowerCase();
              const fillColor = showDistrictChoropleth ? getDistrictFillColor(districtName) : "#1e293b";

              return (
                <path
                  key={districtName}
                  d={districtInfo.path}
                  fill={fillColor}
                  fillOpacity={isHovered ? 0.95 : 0.8}
                  stroke={isSelected ? "#fbbf24" : isHovered ? "#38bdf8" : "#0f766e"}
                  strokeWidth={isSelected ? 1.4 : isHovered ? 0.9 : 0.45}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className="transition-all duration-150 cursor-pointer"
                  onMouseEnter={() => setHoveredDistrict(stats || {
                    district_id: "",
                    district_name: districtName,
                    state: "Jharkhand",
                    total_problems: 0,
                    mapped_problems: 0,
                    unmapped_problems: 0,
                    high_priority: 0,
                    pending_review: 0,
                    active_in_progress: 0,
                    resolved: 0,
                    centroid: { latitude: districtInfo.center.lat, longitude: districtInfo.center.lng },
                  })}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  onClick={() => handleDistrictClick(districtName)}
                />
              );
            })}
          </g>

          {/* LAYER 5: District Labels positioned at true geographic centroids */}
          {showLabels && (
            <g id="district-labels" pointerEvents="none">
              {Object.entries(JHARKHAND_REAL_BOUNDARIES).map(([name, info]) => {
                const stats = districtStatsMap.get(name.toLowerCase());
                const count = stats?.total_problems ?? 0;
                const fontSize = viewMode === "india" ? "2.2px" : "2.8px";

                return (
                  <g key={name} transform={`translate(${info.center.x}, ${info.center.y})`}>
                    <circle r={viewMode === "india" ? "0.5" : "0.7"} fill="#ffffff" opacity="0.85" />
                    <text
                      y="-1.5"
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize={fontSize}
                      fontWeight="bold"
                      style={{
                        paintOrder: "stroke",
                        stroke: "#0f172a",
                        strokeWidth: "1px",
                        strokeLinejoin: "round",
                      }}
                    >
                      {name}
                    </text>
                    {count > 0 && (
                      <text
                        y="2.8"
                        textAnchor="middle"
                        fill="#34d399"
                        fontSize={viewMode === "india" ? "1.8px" : "2.4px"}
                        fontWeight="bold"
                        style={{
                          paintOrder: "stroke",
                          stroke: "#0f172a",
                          strokeWidth: "0.8px",
                          strokeLinejoin: "round",
                        }}
                      >
                        {count} {count === 1 ? "problem" : "problems"}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* LAYER 6: Real GPS Problem Hotspots (Mapped Points) */}
          {showPins && data?.points && (
            <g id="problem-hotspots">
              {data.points.map((pt) => {
                const projected = projectCoords(pt.longitude, pt.latitude);
                const isCritical = pt.priority === "CRITICAL";
                const isHigh = pt.priority === "HIGH";
                const isMedium = pt.priority === "MEDIUM";
                const pinColor = isCritical ? "#ef4444" : isHigh ? "#f59e0b" : isMedium ? "#38bdf8" : "#94a3b8";
                const pinRadius = viewMode === "india" ? (isCritical ? 1.4 : 1.0) : (isCritical ? 1.8 : 1.3);

                return (
                  <g
                    key={pt.id}
                    transform={`translate(${projected.x}, ${projected.y})`}
                    className="cursor-pointer group"
                    onClick={() => setSelectedHotspot(pt)}
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Pulsing ring for critical/high priority */}
                    {(isCritical || isHigh) && (
                      <circle
                        r={pinRadius * 2.2}
                        fill={pinColor}
                        opacity="0.3"
                        className="pulse-circle"
                      />
                    )}

                    {/* Central hotspot pin */}
                    <circle
                      r={pinRadius}
                      fill={pinColor}
                      stroke="#ffffff"
                      strokeWidth={viewMode === "india" ? 0.3 : 0.4}
                      filter="url(#hotspot-glow)"
                      className="transition-transform group-hover:scale-150"
                    />
                  </g>
                );
              })}
            </g>
          )}
        </svg>

        {/* Floating Controls HUD in Top Right of Canvas */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
          {/* Spatial Legend */}
          <div className="bg-stone-900/90 backdrop-blur-md p-3 rounded-xl border border-stone-700/80 text-[11px] text-stone-200 shadow-lg space-y-2 max-w-[210px]">
            <span className="font-bold text-stone-100 uppercase tracking-wider text-[10px] block border-b border-stone-700 pb-1">
              Problem Density
            </span>
            <div className="grid grid-cols-1 gap-1 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#0f766e]" />
                <span>100+ - Hotspot</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#059669]" />
                <span>21-100 - High</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#047857]" />
                <span>6-20 - Moderate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#065f46]" />
                <span>1-5 - Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#1e293b] border border-stone-600" />
                <span>0 - No Recorded Problems</span>
              </div>
            </div>

            <span className="font-bold text-stone-100 uppercase tracking-wider text-[10px] block border-b border-stone-700 pt-1 pb-1">
              GPS Pins
            </span>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span>Critical</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>High</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span>Low</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hover District HUD Overlay (Bottom Left of Canvas) */}
        {hoveredDistrict && (
          <div className="absolute bottom-4 left-4 z-20 bg-stone-900/90 backdrop-blur-md p-3.5 rounded-xl border border-stone-700 text-stone-100 shadow-xl text-xs space-y-1.5 pointer-events-none max-w-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-3 border-b border-stone-700 pb-1.5">
              <span className="font-bold text-sm text-emerald-400">{hoveredDistrict.district_name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-mono">
                {hoveredDistrict.state}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-stone-400 block text-[10px]">Total Problems:</span>
                <span className="font-bold text-stone-100">{hoveredDistrict.total_problems}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px]">Mapped GPS:</span>
                <span className="font-bold text-emerald-400">{hoveredDistrict.mapped_problems}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px]">Unmapped:</span>
                <span className="font-bold text-amber-400">{hoveredDistrict.unmapped_problems}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px]">High / Critical:</span>
                <span className="font-bold text-red-400">{hoveredDistrict.high_priority}</span>
              </div>
            </div>
            <p className="text-[10px] text-stone-400 pt-1 italic">
              Click district to inspect District Analytics
            </p>
          </div>
        )}

        {/* Hover Pin Tooltip (Floating near mouse) */}
        {hoveredPoint && !selectedHotspot && (
          <div className="absolute top-4 left-4 z-20 bg-stone-900/95 backdrop-blur-md p-3 rounded-xl border border-emerald-500/50 text-stone-100 shadow-xl text-xs space-y-1 max-w-sm pointer-events-none">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityColor(hoveredPoint.priority).bg} text-white`}>
                {hoveredPoint.priority}
              </span>
              <span className="text-[10px] text-stone-400 font-semibold">{hoveredPoint.domain}</span>
            </div>
            <p className="font-bold text-white line-clamp-1">{hoveredPoint.title}</p>
            <p className="text-[11px] text-stone-300 line-clamp-2">{hoveredPoint.summary}</p>
            <div className="flex items-center gap-3 text-[10px] text-stone-400 pt-1">
              <span>📍 {hoveredPoint.district}</span>
              <span>Coordinates: {hoveredPoint.latitude.toFixed(4)}, {hoveredPoint.longitude.toFixed(4)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Selected Hotspot Modal / Popover */}
      {selectedHotspot && (
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 text-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getPriorityColor(selectedHotspot.priority).bg} text-white`}>
                  {selectedHotspot.priority} PRIORITY
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold text-[10px]">
                  {selectedHotspot.domain}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-800 font-mono text-[10px]">
                  Status: {selectedHotspot.status}
                </span>
              </div>
              <h4 className="text-sm font-bold text-stone-900">{selectedHotspot.title}</h4>
              <p className="text-stone-600 leading-relaxed">{selectedHotspot.summary}</p>
              <div className="flex flex-wrap items-center gap-4 text-stone-500 text-[11px] pt-1">
                <span>📍 District: <strong>{selectedHotspot.district}</strong></span>
                {selectedHotspot.village_locality && (
                  <span>Locality: <strong>{selectedHotspot.village_locality}</strong></span>
                )}
                <span>GPS: <code>{selectedHotspot.latitude}, {selectedHotspot.longitude}</code></span>
                {selectedHotspot.affected_population && (
                  <span>Population: <strong>{selectedHotspot.affected_population}</strong></span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Link
                href={`/challenges/${selectedHotspot.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition shadow-2xs"
              >
                <span>View Full Challenge</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => setSelectedHotspot(null)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected District Detail Card: District Overview / Analytics */}
      {inspectDistrict && (
        <div className="p-4 sm:p-5 bg-emerald-50/70 border-t border-emerald-200 text-xs animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-700" />
                <h4 className="text-sm font-bold text-stone-900">
                  {inspectDistrict.district_name} - District Overview & Analytics
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                  {inspectDistrict.state}
                </span>
              </div>

              {/* District breakdown metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-stone-400 block text-[10px] font-bold uppercase">Total Problems</span>
                  <span className="text-base font-black text-stone-900">{inspectDistrict.total_problems}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-emerald-600 block text-[10px] font-bold uppercase">Mapped GPS</span>
                  <span className="text-base font-black text-emerald-700">{inspectDistrict.mapped_problems}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-amber-200 bg-amber-50/40">
                  <span className="text-amber-800 block text-[10px] font-bold uppercase">Unmapped (Audited)</span>
                  <span className="text-base font-black text-amber-900">{inspectDistrict.unmapped_problems}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-red-600 block text-[10px] font-bold uppercase">High / Critical</span>
                  <span className="text-base font-black text-red-600">{inspectDistrict.high_priority}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-blue-600 block text-[10px] font-bold uppercase">Active Projects</span>
                  <span className="text-base font-black text-blue-700">{inspectDistrict.active_in_progress}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onSelectDistrict && inspectDistrict.district_id && (
                <button
                  onClick={() => onSelectDistrict(inspectDistrict.district_id)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition shadow-xs"
                >
                  Filter Scope to {inspectDistrict.district_name}
                </button>
              )}
              <button
                onClick={() => setInspectDistrict(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-emerald-100 transition"
                title="Close District Overview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unmapped Problems Audit Drawer */}
      {showUnmappedDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h4 className="font-bold text-base text-stone-900">
                  Unmapped Problems (Zero-Drop Accounting)
                </h4>
              </div>
              <button
                onClick={() => setShowUnmappedDrawer(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Every citizen problem without valid GPS hardware telemetry remains 100% accounted for in district registers, domain metrics, and institutional matching. No problems are discarded or fabricated with synthetic coordinates.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {data?.district_hotspots
                .filter((d) => d.unmapped_problems > 0)
                .map((d) => (
                  <div
                    key={d.district_id || d.district_name}
                    className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-stone-900">{d.district_name}</span>
                      <span className="text-stone-400 block text-[11px]">
                        Total registered: {d.total_problems} &middot; Mapped: {d.mapped_problems}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300">
                      {d.unmapped_problems} Unmapped
                    </span>
                  </div>
                ))}
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setShowUnmappedDrawer(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold"
              >
                Close Audit Register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
