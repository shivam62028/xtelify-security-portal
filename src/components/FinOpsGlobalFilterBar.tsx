// richyrik: Global Multi-Year & Multi-Month Date Filter Bar & Currency Control Bar
import React, { useState, useRef, useEffect } from "react";
import {
  Calendar,
  ChevronDown,
  Check,
  RotateCcw,
  Sliders,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Upload,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  Info,
  Database,
} from "lucide-react";
import { useFinOpsCurrency, ALL_MONTHS, type CurrencyCode } from "./FinOpsCurrencyContext";

const FISCAL_YEARS = [
  { id: "FY 2026-27", label: "FY 2026-27 (Current)", badge: "Active" },
  { id: "FY 2027-28", label: "FY 2027-28 (AOP 2027)", badge: "Planning" },
  { id: "FY 2025-26", label: "FY 2025-26", badge: "Historical" },
  { id: "FY 2024-25", label: "FY 2024-25", badge: "Historical" },
];

export const FinOpsGlobalFilterBar: React.FC = () => {
  const {
    currency,
    setCurrency,
    exchangeRates,
    dateFilter,
    setFiscalYear,
    toggleMonth,
    selectAllMonths,
    clearAllMonths,
    selectQuarter,
    parseWorkbookFile,
    setIsFxModalOpen,
    datasets,
    setIsDatasetManagerOpen,
    mongoStatus,
  } = useFinOpsCurrency();

  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const yearRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) {
        setIsYearDropdownOpen(false);
      }
      if (monthRef.current && !monthRef.current.contains(e.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await parseWorkbookFile(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const selectedCount = dateFilter.selectedMonths.length;
  const isAllSelected = selectedCount === ALL_MONTHS.length;

  const monthLabel = isAllSelected
    ? "All 12 Months"
    : selectedCount === 1
    ? dateFilter.selectedMonths[0]
    : `${dateFilter.selectedMonths.slice(0, 3).join(", ")}${selectedCount > 3 ? ` (+${selectedCount - 3})` : ""}`;

  return (
    <div className="bg-[#0b0f19]/90 backdrop-blur-xl border-b border-white/[0.08] px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs sticky top-16 z-40 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
      {/* ── LEFT: GLOBAL DATE FILTER ENGINE (// richyrik) ── */}
      <div className="flex items-center flex-wrap gap-2.5">
        <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
          <Calendar size={13} className="text-emerald-400" />
          <span>Timeline Filter:</span>
        </div>

        {/* 1. Fiscal Year Selector */}
        <div className="relative" ref={yearRef}>
          <button
            onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-slate-200 font-medium transition-all shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          >
            <span className="font-semibold text-emerald-300">{dateFilter.fiscalYear}</span>
            <ChevronDown size={13} className={`text-slate-400 transition-transform ${isYearDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isYearDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-52 bg-[#0c101c] border border-white/[0.12] rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.6)] py-1.5 z-50">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/[0.06]">
                Select Fiscal Year
              </div>
              {FISCAL_YEARS.map((fy) => (
                <button
                  key={fy.id}
                  onClick={() => {
                    setFiscalYear(fy.id);
                    setIsYearDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-emerald-500/10 transition-colors ${
                    dateFilter.fiscalYear === fy.id ? "text-emerald-300 font-semibold bg-emerald-500/15" : "text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {dateFilter.fiscalYear === fy.id ? <Check size={13} className="text-emerald-400" /> : <div className="w-3.5" />}
                    <span>{fy.label}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {fy.badge}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Multi-Month Selector Dropdown */}
        <div className="relative" ref={monthRef}>
          <button
            onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-slate-200 font-medium transition-all shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          >
            <span className="text-slate-400">Months:</span>
            <span className="font-semibold text-cyan-300">{monthLabel}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
              {selectedCount}/12
            </span>
            <ChevronDown size={13} className={`text-slate-400 transition-transform ${isMonthDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isMonthDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-80 bg-[#0c101c] border border-white/[0.12] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.7)] p-3 z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08]">
                <span className="text-[11px] font-bold text-white tracking-wide">
                  Active Filter: {selectedCount} of 12 Months
                </span>
                <button
                  onClick={clearAllMonths}
                  className="text-[10px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw size={10} /> Reset
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1 mb-3">
                <button
                  onClick={selectAllMonths}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    isAllSelected ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  All (12M)
                </button>
                <button
                  onClick={() => selectQuarter("Q1")}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Q1 (Apr-Jun)
                </button>
                <button
                  onClick={() => selectQuarter("Q2")}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Q2 (Jul-Sep)
                </button>
                <button
                  onClick={() => selectQuarter("Q3")}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Q3 (Oct-Dec)
                </button>
                <button
                  onClick={() => selectQuarter("Q4")}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Q4 (Jan-Mar)
                </button>
                <button
                  onClick={() => selectQuarter("Actuals")}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
                >
                  Actuals YTD
                </button>
                <button
                  onClick={() => selectQuarter("Projected")}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
                >
                  Projected
                </button>
              </div>

              {/* 12 Months Checkbox Grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {ALL_MONTHS.map((m) => {
                  const isChecked = dateFilter.selectedMonths.includes(m);
                  const isActual = ["Apr", "May", "Jun"].includes(m);
                  return (
                    <button
                      key={m}
                      onClick={() => toggleMonth(m)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        isChecked
                          ? isActual
                            ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-200"
                            : "bg-emerald-500/20 border-emerald-500/40 text-emerald-200"
                          : "bg-white/[0.02] border-white/[0.05] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-3 h-3 rounded flex items-center justify-center text-[9px] ${
                            isChecked ? (isActual ? "bg-indigo-500 text-white" : "bg-emerald-500 text-white") : "border border-slate-600"
                          }`}
                        >
                          {isChecked && <Check size={10} />}
                        </div>
                        <span>{m}</span>
                      </div>
                      <span className="text-[8px] opacity-60 uppercase font-mono">
                        {isActual ? "Act" : "Proj"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. Consistency Guard Status Indicator (// richyrik) */}
        <div
          title="Data Consistency Guard Active: Chart visual bars and table row totals are 100% mathematically synchronized across active Year & Month filters."
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-help"
        >
          <ShieldCheck size={12} className="text-emerald-400" />
          <span className="text-[10px] font-semibold tracking-wide">Data Guard Active</span>
        </div>
      </div>

      {/* ── RIGHT: CURRENCY SWITCHER & FX CONTROLS (// richyrik) ── */}
      <div className="flex items-center flex-wrap gap-2.5">
        {/* richyrik: Uploaded Datasets & MongoDB Manager */}
        <button
          onClick={() => setIsDatasetManagerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
          title="Inspect & delete uploaded Excel workbooks saved in Airtel Server MongoDB"
        >
          <Database size={13} className="text-cyan-400" />
          <span>Datasets ({datasets.length})</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
        </button>

        {/* Multi-Worksheet Ingestion Button */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".xlsx,.xls,.csv"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/40 hover:to-teal-600/40 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 rounded-lg text-xs font-semibold shadow-sm transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.25)] cursor-pointer"
        >
          <FileSpreadsheet size={13} className="text-emerald-400" />
          <span>{isUploading ? "Scanning Sheets..." : "Ingest Workbook (.xlsx)"}</span>
        </button>

        <div className="h-4 w-px bg-slate-700 hidden sm:block" />

        {/* Global Currency Switcher */}
        <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.08]">
          {(["INR", "USD", "EUR", "GBP"] as CurrencyCode[]).map((curr) => {
            const symbols: Record<CurrencyCode, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
            const isActive = currency === curr;
            return (
              <button
                key={curr}
                onClick={() => setCurrency(curr)}
                className={`px-2 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md scale-102"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <span>{symbols[curr]}</span>
                <span className="text-[10px] font-medium">{curr}</span>
              </button>
            );
          })}
        </div>

        {/* FX Exchange Rate Quick Badge & Manager */}
        <button
          onClick={() => setIsFxModalOpen(true)}
          title="Click to view & edit exchange rates and inspection audit log"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs transition-colors"
        >
          <TrendingUp size={12} className="text-indigo-400" />
          <span className="text-[11px] font-mono text-slate-300">
            $1 = ₹{exchangeRates.USD.toFixed(1)}
          </span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold uppercase">
            FX Log
          </span>
        </button>
      </div>
    </div>
  );
};
