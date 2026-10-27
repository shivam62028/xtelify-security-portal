// richyrik: Multi-Worksheet Auto-Categorization & Ingestion Preview Modal
import React, { useState } from "react";
import {
  FileSpreadsheet,
  Layers,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  X,
  Target,
  CreditCard,
  FileCheck,
  Receipt,
  HelpCircle,
  Sparkles,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { useFinOpsCurrency, type DetectedSheetInfo } from "./FinOpsCurrencyContext";

export const MultiSheetIngestionModal: React.FC = () => {
  const {
    isMultiSheetModalOpen,
    setIsMultiSheetModalOpen,
    detectedSheets,
    updateSheetTarget,
    toggleSheetIncluded,
    applyMultiSheetIngestion,
    currency,
    customDatasetName,
    setCustomDatasetName,
    currentFileName,
    mongoStatus,
  } = useFinOpsCurrency();

  if (!isMultiSheetModalOpen || detectedSheets.length === 0) return null;

  const targetOptions: {
    value: "aop" | "credits" | "approvals" | "billing" | "ignore";
    label: string;
    icon: any;
    color: string;
  }[] = [
    { value: "aop", label: "AOP Dashboard", icon: Target, color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
    { value: "credits", label: "Credit Tracker / Cloud Cost", icon: CreditCard, color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
    { value: "approvals", label: "NFA / GBPA Tracker", icon: FileCheck, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
    { value: "billing", label: "Billing Observability", icon: Receipt, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
    { value: "ignore", label: "Skip / Do Not Ingest", icon: X, color: "text-slate-400 bg-slate-800 border-slate-700" },
  ];

  const includedCount = detectedSheets.filter((s) => s.included && s.detectedTarget !== "ignore").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0c101c] border border-white/[0.12] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Multi-Worksheet FinOps Ingestion Preview
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                  {detectedSheets.length} Worksheets Detected
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Sheets were auto-categorized by inspection of names and headers. Custom name and target routing will be saved to Airtel Server MongoDB.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMultiSheetModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* richyrik: User Custom Dataset Naming & MongoDB Banner */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-cyan-950/40 via-slate-900/40 to-transparent border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-cyan-300 uppercase tracking-wider mb-1">
              Dataset Name (Customizable by You):
            </label>
            <input
              type="text"
              value={customDatasetName}
              onChange={(e) => setCustomDatasetName(e.target.value)}
              placeholder="e.g. Airtel Wynk Cloud FinOps Q3 2026-27"
              className="w-full bg-slate-900 border border-cyan-500/30 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <div className="shrink-0 text-left sm:text-right text-[11px] text-slate-400 space-y-0.5">
            <div>Original File: <span className="text-slate-200 font-mono">{currentFileName || "uploaded_file.xlsx"}</span></div>
            <div className="text-emerald-400 flex items-center sm:justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Target: MongoDB <code className="font-mono text-emerald-300">xtelify_db.finops_datasets</code></span>
            </div>
          </div>
        </div>

        {/* Modal Body: Detected Sheets List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Worksheet & Detected Structure</span>
            <span>Assigned Target Section</span>
          </div>

          {detectedSheets.map((sheet, idx) => {
            const currentOption = targetOptions.find((t) => t.value === sheet.detectedTarget) || targetOptions[0];
            const TargetIcon = currentOption.icon;

            return (
              <div
                key={sheet.sheetName + idx}
                className={`p-4 rounded-xl border transition-all ${
                  sheet.included && sheet.detectedTarget !== "ignore"
                    ? "bg-white/[0.03] border-white/[0.1] hover:border-emerald-500/30"
                    : "bg-slate-900/40 border-white/[0.04] opacity-60"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Sheet Details */}
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={sheet.included && sheet.detectedTarget !== "ignore"}
                      onChange={() => toggleSheetIncluded(idx)}
                      className="mt-1 w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/50 bg-slate-900 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white flex items-center gap-1.5">
                          <Layers size={14} className="text-emerald-400" />
                          "{sheet.sheetName}"
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {sheet.rowCount} rows
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                          Currency: {sheet.detectedCurrency}
                        </span>
                        {sheet.conversionMultiplier && sheet.conversionMultiplier !== 1 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                            Auto-converted (x{sheet.conversionMultiplier.toFixed(4)})
                          </span>
                        )}
                      </div>

                      {/* Sample Headers Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Headers:</span>
                        {sheet.headers.slice(0, 5).map((h, hIdx) => (
                          <span
                            key={hIdx}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.05] text-slate-300 font-mono"
                          >
                            {h || `Col ${hIdx + 1}`}
                          </span>
                        ))}
                        {sheet.headers.length > 5 && (
                          <span className="text-[10px] text-slate-500">+{sheet.headers.length - 5} more</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Destination Mapping Dropdown */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400 hidden sm:inline">Route to:</span>
                    <select
                      value={sheet.detectedTarget}
                      onChange={(e) => updateSheetTarget(idx, e.target.value as any)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-emerald-500/50 bg-[#0e1322] cursor-pointer ${currentOption.color}`}
                    >
                      <option value="aop">AOP Dashboard</option>
                      <option value="credits">Credit Tracker / Cloud Cost</option>
                      <option value="approvals">NFA / GBPA Tracker</option>
                      <option value="billing">Billing Observability</option>
                      <option value="ignore">Skip / Do Not Ingest</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle size={14} className="text-emerald-400" />
            <span>
              <strong className="text-white">{includedCount}</strong> worksheets will be ingested into their respective FinOps modules.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMultiSheetModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => applyMultiSheetIngestion(detectedSheets)}
              disabled={includedCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Save to MongoDB & Ingest Worksheets</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
