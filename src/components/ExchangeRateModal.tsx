// richyrik: Exchange Rate Management Panel & Editable FX Audit Log
import React, { useState } from "react";
import {
  TrendingUp,
  X,
  Check,
  RotateCcw,
  Clock,
  User,
  Shield,
  HelpCircle,
  ArrowRight,
  DollarSign,
  History,
  Sparkles,
} from "lucide-react";
import { useFinOpsCurrency, type CurrencyCode } from "./FinOpsCurrencyContext";

export const ExchangeRateModal: React.FC = () => {
  const {
    isFxModalOpen,
    setIsFxModalOpen,
    exchangeRates,
    updateExchangeRate,
    auditLogs,
    latestAuditBadge,
  } = useFinOpsCurrency();

  const [usdRate, setUsdRate] = useState<string>(String(exchangeRates.USD));
  const [eurRate, setEurRate] = useState<string>(String(exchangeRates.EUR));
  const [gbpRate, setGbpRate] = useState<string>(String(exchangeRates.GBP));
  const [userName, setUserName] = useState<string>("Finance Controller");
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Conversion test calculator state
  const [testAmount, setTestAmount] = useState<string>("10000");
  const [testCurrency, setTestCurrency] = useState<"USD" | "EUR" | "GBP">("USD");

  if (!isFxModalOpen) return null;

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    const u = parseFloat(usdRate);
    const ev = parseFloat(eurRate);
    const g = parseFloat(gbpRate);

    if (u > 0 && u !== exchangeRates.USD) {
      updateExchangeRate("USD", u, userName);
    }
    if (ev > 0 && ev !== exchangeRates.EUR) {
      updateExchangeRate("EUR", ev, userName);
    }
    if (g > 0 && g !== exchangeRates.GBP) {
      updateExchangeRate("GBP", g, userName);
    }

    setUpdateSuccess(true);
    setTimeout(() => setUpdateSuccess(false), 3000);
  };

  const calcAmount = parseFloat(testAmount) || 0;
  const currentTestRate = testCurrency === "USD" ? parseFloat(usdRate) || exchangeRates.USD : testCurrency === "EUR" ? parseFloat(eurRate) || exchangeRates.EUR : parseFloat(gbpRate) || exchangeRates.GBP;
  const inrEquivalent = calcAmount * currentTestRate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0c101c] border border-white/[0.12] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <TrendingUp size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Exchange Rate Management & Audit Trail
              </h2>
              <p className="text-xs text-slate-400">
                Configure live foreign exchange rates against Indian Rupee (INR - ₹) for global FinOps calculations.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsFxModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Audit Log Badge Announcement (Requirement 4) */}
        <div className="px-6 py-2.5 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border-b border-indigo-500/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-indigo-300 font-medium">
            <Sparkles size={14} className="text-indigo-400 shrink-0" />
            <span className="font-mono text-[11px]">{latestAuditBadge}</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold uppercase shrink-0">
            Live Calibrated
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Form to update rates */}
          <form onSubmit={handleSaveRates} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Active Exchange Rates (1 Unit = INR ₹)</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">Operator:</span>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-xs w-36 focus:outline-none focus:border-indigo-500"
                  placeholder="Your Name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* USD */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                    <span>USD ($)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">US Dollar</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={usdRate}
                    onChange={(e) => setUsdRate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-sm font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block">Baseline: 1 USD = ₹{exchangeRates.USD.toFixed(2)}</span>
              </div>

              {/* EUR */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-300 flex items-center gap-1">
                    <span>EUR (€)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Euro</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={eurRate}
                    onChange={(e) => setEurRate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-sm font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block">Baseline: 1 EUR = ₹{exchangeRates.EUR.toFixed(2)}</span>
              </div>

              {/* GBP */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
                    <span>GBP (£)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">British Pound</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={gbpRate}
                    onChange={(e) => setGbpRate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-sm font-semibold focus:outline-none focus:border-purple-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block">Baseline: 1 GBP = ₹{exchangeRates.GBP.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Updating exchange rates recalibrates all charts and tooltips dynamically.
              </span>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all"
              >
                {updateSuccess ? <Check size={14} className="text-emerald-300" /> : <TrendingUp size={14} />}
                <span>{updateSuccess ? "Rates Updated & Logged!" : "Save & Broadcast Rates"}</span>
              </button>
            </div>
          </form>

          {/* Quick Conversion Tester */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <History size={13} className="text-indigo-400" />
              <span>Interactive FX Sandbox Calculator</span>
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  className="w-28 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs font-semibold focus:outline-none"
                />
                <select
                  value={testCurrency}
                  onChange={(e) => setTestCurrency(e.target.value as any)}
                  className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
              <ArrowRight size={14} className="text-slate-500" />
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-xs font-bold">
                ₹{Math.round(inrEquivalent).toLocaleString("en-IN")} INR
              </div>
              <span className="text-[10px] text-slate-400">
                (approx. ₹{(inrEquivalent / 10000000).toFixed(3)} Cr / ₹{(inrEquivalent / 100000).toFixed(2)} Lakhs)
              </span>
            </div>
          </div>

          {/* Audit History Log Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock size={13} className="text-emerald-400" />
              <span>Exchange Rate Audit Log Trail</span>
            </h4>
            <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-white/[0.01]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Currency Pair</th>
                    <th className="py-2.5 px-4">Old Rate</th>
                    <th className="py-2.5 px-4">New Rate</th>
                    <th className="py-2.5 px-4">Updated By</th>
                    <th className="py-2.5 px-4">Audit Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-slate-300">
                  {auditLogs.map((entry) => (
                    <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">{entry.timestamp}</td>
                      <td className="py-2.5 px-4 font-bold text-indigo-300">INR / {entry.currency}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-400">{entry.oldRate.toFixed(2)}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-emerald-300">{entry.newRate.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-slate-300 flex items-center gap-1.5">
                        <User size={12} className="text-slate-500" />
                        <span>{entry.user}</span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">{entry.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/[0.08] flex items-center justify-end bg-white/[0.02]">
          <button
            onClick={() => setIsFxModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
