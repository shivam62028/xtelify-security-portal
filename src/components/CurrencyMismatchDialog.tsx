// richyrik: Intelligent Currency Detection & Mismatch Resolution Modal
import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Coins,
  Check,
  X,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import { useFinOpsCurrency } from "./FinOpsCurrencyContext";

export const CurrencyMismatchDialog: React.FC = () => {
  const {
    isMismatchDialogOpen,
    setIsMismatchDialogOpen,
    mismatchInfo,
    resolveCurrencyMismatch,
    exchangeRates,
    currencySymbol,
  } = useFinOpsCurrency();

  const [selectedResolution, setSelectedResolution] = useState<"convert_incoming" | "switch_portal" | "as_is">("convert_incoming");

  if (!isMismatchDialogOpen || !mismatchInfo) return null;

  const { sheetName, detectedCurrency, portalCurrency, sampleValue } = mismatchInfo;

  // Conversion math for sample preview
  const rate = exchangeRates[detectedCurrency] || exchangeRates[portalCurrency] || 83.5;
  const sampleConverted =
    detectedCurrency === "INR" && portalCurrency === "USD"
      ? sampleValue / exchangeRates.USD
      : detectedCurrency === "USD" && portalCurrency === "INR"
      ? sampleValue * exchangeRates.USD
      : sampleValue;

  const detectedSym = detectedCurrency === "USD" ? "$" : detectedCurrency === "EUR" ? "€" : detectedCurrency === "GBP" ? "£" : "₹";
  const portalSym = portalCurrency === "USD" ? "$" : portalCurrency === "EUR" ? "€" : portalCurrency === "GBP" ? "£" : "₹";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0c101c] border border-amber-500/30 rounded-2xl w-full max-w-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-amber-500/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Currency Mismatch Detected
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                  {detectedCurrency} vs {portalCurrency}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Worksheet "{sheetName}" contains {detectedCurrency} ({detectedSym}), but active portal standard is {portalCurrency} ({portalSym}).
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMismatchDialogOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Comparison Preview Card */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Incoming Worksheet Data</span>
              <div className="text-base font-bold text-amber-300 font-mono">
                {detectedSym}{sampleValue.toLocaleString()} {detectedCurrency}
              </div>
              <p className="text-[10px] text-slate-500">Detected in sheet "{sheetName}"</p>
            </div>
            <div className="space-y-1 border-l border-white/[0.08] pl-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Target Standard Conversion</span>
              <div className="text-base font-bold text-emerald-300 font-mono">
                {portalSym}{Math.round(sampleConverted).toLocaleString()} {portalCurrency}
              </div>
              <p className="text-[10px] text-slate-500">
                Rate: 1 USD = ₹{exchangeRates.USD.toFixed(2)} INR
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider text-[10px]">
              Select Resolution Rule:
            </span>

            {/* Option A */}
            <div
              onClick={() => setSelectedResolution("convert_incoming")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                selectedResolution === "convert_incoming"
                  ? "bg-emerald-500/15 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                  : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedResolution === "convert_incoming"
                      ? "border-emerald-500 bg-emerald-500 text-slate-950"
                      : "border-slate-600"
                  }`}
                >
                  {selectedResolution === "convert_incoming" && <Check size={11} strokeWidth={3} />}
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Option A: Convert new incoming data to match existing currency ({portalCurrency})</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Automatically applies live exchange rates to recalculate incoming {detectedCurrency} figures into {portalCurrency}. Stored historical records remain untouched and standardized.
                  </p>
                </div>
              </div>
            </div>

            {/* Option B */}
            <div
              onClick={() => setSelectedResolution("switch_portal")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                selectedResolution === "switch_portal"
                  ? "bg-indigo-500/15 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                  : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedResolution === "switch_portal"
                      ? "border-indigo-500 bg-indigo-500 text-white"
                      : "border-slate-600"
                  }`}
                >
                  {selectedResolution === "switch_portal" && <Check size={11} strokeWidth={3} />}
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white">
                    Option B: Convert existing stored data to match new incoming currency ({detectedCurrency})
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Switches the active portal currency setting to {detectedCurrency} ({detectedSym}) and standardizes all portal displays to the incoming worksheet currency.
                  </p>
                </div>
              </div>
            </div>

            {/* Option C */}
            <div
              onClick={() => setSelectedResolution("as_is")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                selectedResolution === "as_is"
                  ? "bg-amber-500/15 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                  : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedResolution === "as_is"
                      ? "border-amber-500 bg-amber-500 text-slate-950"
                      : "border-slate-600"
                  }`}
                >
                  {selectedResolution === "as_is" && <Check size={11} strokeWidth={3} />}
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white">
                    Option C: Keep separate and apply on-the-fly exchange rate conversion
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Retains original numeric figures as written in the worksheet. Visual KPI cards and Recharts tooltips will dynamically convert values whenever currency filters are toggled.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <button
            onClick={() => setIsMismatchDialogOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel Ingestion
          </button>
          <button
            onClick={() => resolveCurrencyMismatch(selectedResolution)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
          >
            <span>Apply Resolution & Preview Ingestion</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
