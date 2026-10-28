// richyrik: Enhanced Billing Observability Executive FinOps Command Center
import React, { useState, useMemo, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Calendar,
  ChevronRight,
  Sparkles,
  Info,
  Receipt,
  Upload,
  Plus,
  Trash2,
  Edit2,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import { useFinOpsCurrency } from "./FinOpsCurrencyContext";
import { FinOpsEmptyStateCard } from "./FinOpsEmptyStateCard";
import { saveFinOpsDataForFY, hasDataForSection, get12MonthKeysForFY, getFinOpsDataForFY } from "./finopsMultiYearStorage";

export interface MonthlyBillingItem {
  month: string;
  gcpPaid: number;
  gcpOpen: number;
  awsPaid: number;
  awsOpen: number;
}

export interface BillingInvoiceRecord {
  id: string;
  invoiceId: string;
  provider: string;
  category: "CDN" | "Video Platform" | "Cross Charge" | "Core Compute & Storage";
  month: string;
  amount: number;
  status: "Paid" | "Outstanding" | "Under Review";
  linkedRef: string;
  anomalyFlag?: "Normal" | "Surge +18%" | "Due in 5 Days" | "Under Reconciliation" | "Unmapped Ref";
}

interface BillingObservabilityViewProps {
  billingData: MonthlyBillingItem[];
  fmt: (n: number) => string;
  aopPlanned?: number;
  aopActual?: number;
}

// Clean invoices dataset: empty until ingested via Excel or database
const SAMPLE_INVOICES: BillingInvoiceRecord[] = [];
const CATEGORY_MONTHLY_DATA: any[] = [];

export const BillingObservabilityView: React.FC<BillingObservabilityViewProps> = ({
  billingData,
  fmt,
  aopPlanned = 14600000,
  aopActual = 13660000,
}) => {
  // richyrik: Connect to FinOps Currency, Datasets & MongoDB Engine
  const {
    currency,
    currencySymbol,
    formatCurrency,
    dateFilter,
    isMonthSelected,
    parseWorkbookFile,
    datasets,
    setIsDatasetManagerOpen,
  } = useFinOpsCurrency();

  const activeFY = dateFilter?.fiscalYear || "FY 2026-27";

  const [isAddBillingModalOpen, setIsAddBillingModalOpen] = useState(false);
  const [entryMonth, setEntryMonth] = useState("");
  const [entryGcpPaid, setEntryGcpPaid] = useState<string>("0");
  const [entryGcpOpen, setEntryGcpOpen] = useState<string>("0");
  const [entryAwsPaid, setEntryAwsPaid] = useState<string>("0");
  const [entryAwsOpen, setEntryAwsOpen] = useState<string>("0");

  const [localBillingData, setLocalBillingData] = useState<MonthlyBillingItem[]>(() => {
    if (billingData && billingData.length > 0) return billingData;
    const fyData = getFinOpsDataForFY(activeFY);
    if (fyData?.billingData && Array.isArray(fyData.billingData) && fyData.billingData.length > 0) {
      return fyData.billingData;
    }
    return [];
  });

  useEffect(() => {
    if (billingData && billingData.length > 0) {
      setLocalBillingData(billingData);
    } else {
      const fyData = getFinOpsDataForFY(activeFY);
      setLocalBillingData(fyData?.billingData || []);
    }
  }, [billingData, activeFY]);

  const fyMonths = useMemo(() => get12MonthKeysForFY(activeFY), [activeFY]);

  useEffect(() => {
    if (fyMonths.length > 0 && !entryMonth) {
      setEntryMonth(fyMonths[0].key);
    }
  }, [fyMonths, entryMonth]);

  const handleCreateNewBillingEntry = () => {
    const firstMonth = fyMonths[0]?.key || "Apr";
    setEntryMonth(firstMonth);
    setEntryGcpPaid("0");
    setEntryGcpOpen("0");
    setEntryAwsPaid("0");
    setEntryAwsOpen("0");
    setIsAddBillingModalOpen(true);
  };

  const handleEditBillingMonth = (item: MonthlyBillingItem) => {
    setEntryMonth(item.month);
    setEntryGcpPaid(String(item.gcpPaid));
    setEntryGcpOpen(String(item.gcpOpen));
    setEntryAwsPaid(String(item.awsPaid));
    setEntryAwsOpen(String(item.awsOpen));
    setIsAddBillingModalOpen(true);
  };

  const handleDeleteBillingMonth = (monthKey: string) => {
    if (!window.confirm(`Are you sure you want to delete the billing entry for ${monthKey}?`)) return;
    const updatedList = localBillingData.filter(
      (b) => b.month.toLowerCase() !== monthKey.toLowerCase()
    );
    setLocalBillingData(updatedList);
    saveFinOpsDataForFY(activeFY, { billingData: updatedList });

    const rawRows = [
      ["Month", "GCP Paid", "GCP Open", "AWS Paid", "AWS Open"],
      ...updatedList.map((b) => [b.month, b.gcpPaid, b.gcpOpen, b.awsPaid, b.awsOpen]),
    ];
    window.dispatchEvent(new CustomEvent("finops:ingest-billing", { detail: { rawRows } }));
    window.dispatchEvent(new CustomEvent("finops:billing-updated"));
  };

  const handleSaveBillingEntry = () => {
    const targetMonth = entryMonth.trim() || (fyMonths[0]?.key ?? "Apr");
    const gcpPaidNum = parseFloat(entryGcpPaid) || 0;
    const gcpOpenNum = parseFloat(entryGcpOpen) || 0;
    const awsPaidNum = parseFloat(entryAwsPaid) || 0;
    const awsOpenNum = parseFloat(entryAwsOpen) || 0;

    let updatedList = [...localBillingData];
    const existingIdx = updatedList.findIndex(
      (b) => b.month.toLowerCase() === targetMonth.toLowerCase()
    );

    const newRecord: MonthlyBillingItem = {
      month: targetMonth,
      gcpPaid: gcpPaidNum,
      gcpOpen: gcpOpenNum,
      awsPaid: awsPaidNum,
      awsOpen: awsOpenNum,
    };

    if (existingIdx >= 0) {
      updatedList[existingIdx] = newRecord;
    } else {
      updatedList.push(newRecord);
    }

    setLocalBillingData(updatedList);
    saveFinOpsDataForFY(activeFY, { billingData: updatedList });

    const rawRows = [
      ["Month", "GCP Paid", "GCP Open", "AWS Paid", "AWS Open"],
      ...updatedList.map((b) => [b.month, b.gcpPaid, b.gcpOpen, b.awsPaid, b.awsOpen]),
    ];
    window.dispatchEvent(new CustomEvent("finops:ingest-billing", { detail: { rawRows } }));
    window.dispatchEvent(new CustomEvent("finops:billing-updated"));
    setIsAddBillingModalOpen(false);
  };

  const handleInitializeFullFY = () => {
    const initialized: MonthlyBillingItem[] = fyMonths.map((m) => ({
      month: m.key,
      gcpPaid: 0,
      gcpOpen: 0,
      awsPaid: 0,
      awsOpen: 0,
    }));

    setLocalBillingData(initialized);
    saveFinOpsDataForFY(activeFY, { billingData: initialized });
    const rawRows = [
      ["Month", "GCP Paid", "GCP Open", "AWS Paid", "AWS Open"],
      ...initialized.map((b) => [b.month, b.gcpPaid, b.gcpOpen, b.awsPaid, b.awsOpen]),
    ];
    window.dispatchEvent(new CustomEvent("finops:ingest-billing", { detail: { rawRows } }));
    window.dispatchEvent(new CustomEvent("finops:billing-updated"));
    setIsAddBillingModalOpen(false);
  };

  const [chartMode, setChartMode] = useState<"provider" | "category">("provider");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("All");
  const [invoiceProviderFilter, setInvoiceProviderFilter] = useState("All");

  // Filtered monthly billing data respecting global date filter
  const filteredBillingData = useMemo(() => {
    const list = localBillingData.filter((d) => isMonthSelected(d.month));
    return list.length > 0 ? list : localBillingData;
  }, [localBillingData, dateFilter.selectedMonths]);

  const filteredCategoryData = useMemo(() => {
    return filteredBillingData.map((d) => ({
      month: d.month,
      cdn: (d.gcpPaid + d.awsPaid) * 0.45,
      video: (d.gcpPaid + d.awsPaid) * 0.25,
      crossCharge: (d.gcpOpen + d.awsOpen) * 0.15,
      otherCompute: (d.gcpPaid + d.awsPaid) * 0.15,
    }));
  }, [filteredBillingData]);

  // Aggregated metrics accurately matching active filtered months
  const totalGcpPaid = useMemo(() => filteredBillingData.reduce((s, d) => s + d.gcpPaid, 0), [filteredBillingData]);
  const totalGcpOpen = useMemo(() => filteredBillingData.reduce((s, d) => s + d.gcpOpen, 0), [filteredBillingData]);
  const totalAwsPaid = useMemo(() => filteredBillingData.reduce((s, d) => s + d.awsPaid, 0), [filteredBillingData]);
  const totalAwsOpen = useMemo(() => filteredBillingData.reduce((s, d) => s + d.awsOpen, 0), [filteredBillingData]);

  const totalCloudPaid = totalGcpPaid + totalAwsPaid;
  const totalOutstanding = totalGcpOpen + totalAwsOpen;

  const aopVariance = aopActual - aopPlanned;
  const aopPercentage = Math.round((aopActual / aopPlanned) * 100);
  const remainingHeadroom = aopPlanned - aopActual;

  const rawInvoices: BillingInvoiceRecord[] = useMemo(() => {
    const fyData = getFinOpsDataForFY(activeFY);
    return (fyData?.billingInvoices || []) as BillingInvoiceRecord[];
  }, [activeFY]);

  // Filtered invoice list aligned with date filters
  const filteredInvoices = useMemo(() => {
    return rawInvoices.filter((inv) => {
      // Month filter alignment
      const invMonthPrefix = inv.month.split(" ")[0];
      if (!isMonthSelected(invMonthPrefix)) return false;

      if (invoiceSearch.trim()) {
        const q = invoiceSearch.toLowerCase();
        const matches =
          inv.invoiceId.toLowerCase().includes(q) ||
          inv.provider.toLowerCase().includes(q) ||
          inv.category.toLowerCase().includes(q) ||
          inv.linkedRef.toLowerCase().includes(q) ||
          inv.status.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (invoiceStatusFilter !== "All" && inv.status !== invoiceStatusFilter) return false;
      if (invoiceProviderFilter !== "All" && inv.provider !== invoiceProviderFilter) return false;
      return true;
    });
  }, [invoiceSearch, invoiceStatusFilter, invoiceProviderFilter, dateFilter.selectedMonths]);

  // richyrik: Excel export of invoices
  const handleExportInvoices = () => {
    const data = filteredInvoices.map((inv) => ({
      "Invoice ID": inv.invoiceId,
      Provider: inv.provider,
      Category: inv.category,
      "Billing Month": inv.month,
      "Amount (INR)": inv.amount,
      Status: inv.status,
      "Linked NFA / AOP Ref": inv.linkedRef,
      "Anomaly / Flag": inv.anomalyFlag || "Normal",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 22 },
      { wch: 22 },
      { wch: 24 },
      { wch: 15 },
      { wch: 16 },
      { wch: 16 },
      { wch: 22 },
      { wch: 22 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Billing Invoices");
    XLSX.writeFile(wb, `FinOps_Billing_Invoices_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const statusPillStyle = (status: string) => {
    if (status === "Paid") {
      return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
    }
    if (status === "Outstanding") {
      return "bg-rose-500/15 text-rose-400 border border-rose-500/30";
    }
    return "bg-amber-500/15 text-amber-400 border border-amber-500/30";
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER TITLE ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-400">
                Billing Observability
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Command Center
              </span>
            </h2>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Month-by-month cloud spend — unified AWS & GCP settlement, credit pacing, and NFA approval coverage.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setEntryGcpPaid("0");
              setEntryGcpOpen("0");
              setEntryAwsPaid("0");
              setEntryAwsOpen("0");
              setIsAddBillingModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Month Entry
          </button>
          <button
            onClick={handleExportInvoices}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-white/[0.08] transition-all self-start sm:self-auto cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export Invoices
          </button>
        </div>
      </div>

      {/* Empty State when no billing datasets recorded for this FY */}
      {localBillingData.length === 0 ? (
        <div className="relative">
          <FinOpsEmptyStateCard
            sectionName="Billing Observability"
            fiscalYear={activeFY}
            onCreateNew={handleCreateNewBillingEntry}
            onUploadExcel={parseWorkbookFile}
            onClonePrevious={handleInitializeFullFY}
          />
        </div>
      ) : (
        <>

      {/* ── 1. EXECUTIVE SUMMARY & AOP PACING HEADER (// richyrik) ── */}
      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Pacing Metrics */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  AOP 2027 Financial Pacing
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  On-Track
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400">
                Target: <span className="text-slate-200 font-semibold">{fmt(aopPlanned)}</span>
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <div className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                {fmt(aopActual)}{" "}
                <span className="text-xs font-normal text-slate-400 font-sans">
                  Spent ({aopPercentage}% of AOP 2027 Budget)
                </span>
              </div>
              <span className="text-xs text-emerald-400 font-medium">
                • {fmt(remainingHeadroom)} Buffer Remaining
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1">
              <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 shadow-sm shadow-emerald-500/50"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, aopPercentage)}%` }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>FY Pacing: {aopPercentage}%</span>
                <span>Remaining Runway: 6.5%</span>
                <span>AOP Cap: {fmt(aopPlanned)}</span>
              </div>
            </div>
          </div>

          {/* Right Status Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5 lg:w-72 shrink-0">
            <div className="p-2.5 rounded-xl bg-[#07090E]/80 border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Active NFAs</span>
              <div className="text-base font-bold text-purple-300 flex items-center gap-1">
                <span>12 Active</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#07090E]/80 border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Pending Approvals</span>
              <div className="text-base font-bold text-amber-300 flex items-center gap-1">
                <span>2 Pending</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#07090E]/80 border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Open Invoices</span>
              <div className="text-base font-bold text-rose-400 font-mono">
                {fmt(totalOutstanding)}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#07090E]/80 border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">NFA Coverage</span>
              <div className="text-base font-bold text-cyan-300 font-mono">
                92% Aligned
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. EXPANDED 6-CARD KPI GRID (// richyrik) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Total Cloud Spend (YTD) */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-emerald-500/30 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Cloud Spend (YTD)
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5" />
              +4.8% MoM
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {fmt(totalCloudPaid)}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
            <span>GCP: {fmt(totalGcpPaid)}</span>
            <span>•</span>
            <span>AWS: {fmt(totalAwsPaid)}</span>
          </div>
        </div>

        {/* Card 2: Total Outstanding Invoices */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-amber-500/30 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Outstanding Invoices
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
              3 Invoices Open
            </span>
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">
            {fmt(totalOutstanding)}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
            <span>GCP: {fmt(totalGcpOpen)}</span>
            <span>•</span>
            <span>AWS: {fmt(totalAwsOpen)}</span>
          </div>
        </div>

        {/* Card 3: Cloud Spend Rate */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-cyan-500/30 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Cloud Spend Rate
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              Monthly Velocity
            </span>
          </div>
          <div className="text-2xl font-black text-cyan-300 font-mono">
            {fmt(filteredBillingData.length > 0 ? totalCloudPaid / filteredBillingData.length : 0)}{" "}
            <span className="text-xs text-slate-400 font-sans font-normal">Monthly Spend Rate</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex mt-2">
            <div
              className="bg-cyan-400 h-full"
              style={{ width: `${totalCloudPaid > 0 ? Math.round((totalGcpPaid / totalCloudPaid) * 100) : 50}%` }}
            />
            <div
              className="bg-amber-400 h-full"
              style={{ width: `${totalCloudPaid > 0 ? Math.round((totalAwsPaid / totalCloudPaid) * 100) : 50}%` }}
            />
          </div>
        </div>

        {/* Card 4: Invoices Recorded */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-purple-500/30 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Invoices Recorded
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
              {filteredInvoices.length} Invoices
            </span>
          </div>
          <div className="text-2xl font-black text-purple-300 font-mono">
            {fmt(filteredInvoices.reduce((acc, inv) => acc + inv.amount, 0))}{" "}
            <span className="text-xs text-slate-400 font-sans font-normal">Total Invoiced</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            {filteredInvoices.filter((i) => i.status === "Paid").length} Paid • {filteredInvoices.filter((i) => i.status !== "Paid").length} Pending
          </div>
        </div>

        {/* Card 5: GCP Net Paid & Outstanding */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-blue-500/30 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              GCP Net Paid & Outstanding
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
              {totalGcpPaid + totalGcpOpen > 0 ? `${((totalGcpPaid / (totalGcpPaid + totalGcpOpen)) * 100).toFixed(1)}% Settled` : "0.0% Settled"}
            </span>
          </div>
          <div className="flex items-baseline gap-2 font-mono">
            <div className="text-2xl font-black text-blue-400">{fmt(totalGcpPaid)}</div>
            <span className="text-xs text-amber-400 font-medium">({fmt(totalGcpOpen)} Open)</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-blue-500 h-full"
              style={{ width: `${totalGcpPaid + totalGcpOpen > 0 ? (totalGcpPaid / (totalGcpPaid + totalGcpOpen)) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Card 6: AWS Net Paid & Outstanding */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-orange-500/30 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              AWS Net Paid & Outstanding
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30">
              {totalAwsPaid + totalAwsOpen > 0 ? `${((totalAwsPaid / (totalAwsPaid + totalAwsOpen)) * 100).toFixed(1)}% Settled` : "0.0% Settled"}
            </span>
          </div>
          <div className="flex items-baseline gap-2 font-mono">
            <div className="text-2xl font-black text-orange-400">{fmt(totalAwsPaid)}</div>
            <span className="text-xs text-rose-400 font-medium">({fmt(totalAwsOpen)} Open)</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-orange-500 h-full"
              style={{ width: `${totalAwsPaid + totalAwsOpen > 0 ? (totalAwsPaid / (totalAwsPaid + totalAwsOpen)) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── 3. MULTI-DIMENSIONAL MONTHLY SPEND CHART WITH TOGGLE (// richyrik) ── */}
      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Monthly Cloud Spend Breakdown</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {dateFilter.fiscalYear} ({currencySymbol})
              </span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {chartMode === "provider"
                ? "Provider split: Google Cloud vs Amazon Web Services (Paid vs Outstanding Invoices)."
                : "Category split: CDN, Video Platform, Cross Charge, and Core Compute (Credit Tracker view)."}
            </p>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-1 bg-[#07090E]/90 border border-slate-700/80 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setChartMode("provider")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                chartMode === "provider"
                  ? "bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              By Cloud Provider
            </button>
            <button
              onClick={() => setChartMode("category")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                chartMode === "category"
                  ? "bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              By Service Category
            </button>
          </div>
        </div>

        {/* Chart Rendering */}
        <ResponsiveContainer width="100%" height={340}>
          {chartMode === "provider" ? (
            /* Toggle Option A — By Cloud Provider (Filtered to Selected Months) */
            <BarChart data={filteredBillingData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
              <YAxis tickFormatter={(v) => formatCurrency(v, true)} stroke="#64748b" fontSize={11} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "#0B0F19", border: "1px solid #1e293b", borderRadius: 10 }}
                formatter={(v: any, n: any) => [formatCurrency(v, false), String(n ?? "")]}
              />
              <Legend wrapperStyle={{ paddingTop: 10 }} />
              {/* Airtel Palette: Paid in vibrant Brand Colors, Outstanding in Alert Red/Amber */}
              <Bar isAnimationActive={true} animationDuration={1000} dataKey="gcpPaid" name="GCP Paid" stackId="gcp" fill="#4285F4" radius={[0, 0, 0, 0]} />
              <Bar isAnimationActive={true} animationDuration={1000} dataKey="gcpOpen" name="GCP Outstanding" stackId="gcp" fill="#EF4444" radius={[4, 4, 0, 0]} />
              <Bar isAnimationActive={true} animationDuration={1000} dataKey="awsPaid" name="AWS Paid" stackId="aws" fill="#FF9900" radius={[0, 0, 0, 0]} />
              <Bar isAnimationActive={true} animationDuration={1000} dataKey="awsOpen" name="AWS Outstanding" stackId="aws" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            /* Toggle Option B — By Service Category (Filtered to Selected Months) */
            <BarChart data={filteredCategoryData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
              <YAxis tickFormatter={(v) => formatCurrency(v, true)} stroke="#64748b" fontSize={11} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "#0B0F19", border: "1px solid #1e293b", borderRadius: 10 }}
                formatter={(v: any, n: any) => [formatCurrency(v, false), String(n ?? "")]}
              />
              <Legend wrapperStyle={{ paddingTop: 10 }} />
              <Bar isAnimationActive={true} animationDuration={1000} dataKey="cdn" name="CDN (Media / CloudFront)" stackId="cat" fill="#06B6D4" radius={[0, 0, 0, 0]} />
              <Bar isAnimationActive={true} animationDuration={1000} dataKey="video" name="Video Platform (Ateme)" stackId="cat" fill="#8B5CF6" radius={[0, 0, 0, 0]} />
              <Bar isAnimationActive={true} animationDuration={1000} dataKey="crossCharge" name="Cross Charge & API" stackId="cat" fill="#F59E0B" radius={[0, 0, 0, 0]} />
              <Bar isAnimationActive={true} animationDuration={1000} dataKey="otherCompute" name="Core Compute & Storage" stackId="cat" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* ── 3.5. MONTH-BY-MONTH MULTI-CLOUD SPEND RECORDS ── */}
      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>Month-by-Month Multi-Cloud Records</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {localBillingData.length} Months
              </span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Configured monthly settlement entries for {activeFY} across Google Cloud and AWS.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEntryGcpPaid("0");
                setEntryGcpOpen("0");
                setEntryAwsPaid("0");
                setEntryAwsOpen("0");
                setIsAddBillingModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Month Entry</span>
            </button>
            <button
              onClick={handleInitializeFullFY}
              className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              Generate 12M Structure
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#07090E]/90 text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                <th className="py-3 px-4">Billing Month</th>
                <th className="py-3 px-4 text-right text-blue-300">GCP Paid</th>
                <th className="py-3 px-4 text-right text-rose-300">GCP Outstanding</th>
                <th className="py-3 px-4 text-right text-amber-300">AWS Paid</th>
                <th className="py-3 px-4 text-right text-amber-400">AWS Outstanding</th>
                <th className="py-3 px-4 text-right text-white">Net Cloud Spend</th>
                <th className="py-3 px-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {localBillingData.map((b) => {
                const totalMonthSpend = b.gcpPaid + b.awsPaid;
                const totalMonthOpen = b.gcpOpen + b.awsOpen;

                return (
                  <tr key={b.month} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-3 px-4 whitespace-nowrap font-sans font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{b.month}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-blue-400 whitespace-nowrap">
                      {formatCurrency(b.gcpPaid, false)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap text-slate-400">
                      {b.gcpOpen > 0 ? (
                        <span className="text-rose-400 font-bold">{formatCurrency(b.gcpOpen, false)}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-400 whitespace-nowrap">
                      {formatCurrency(b.awsPaid, false)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap text-slate-400">
                      {b.awsOpen > 0 ? (
                        <span className="text-amber-300 font-bold">{formatCurrency(b.awsOpen, false)}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-white whitespace-nowrap font-mono">
                      {formatCurrency(totalMonthSpend, false)}
                      {totalMonthOpen > 0 && (
                        <span className="block text-[10px] text-amber-400 font-sans font-normal">
                          + {formatCurrency(totalMonthOpen, false)} open
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEditBillingMonth(b)}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-all cursor-pointer"
                          title="Edit Month Entry"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBillingMonth(b.month)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
                          title="Delete Month Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. BILLING ANOMALY & RECENT INVOICE AUDIT TABLE (// richyrik) ── */}
      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Billing Anomaly & Invoice Audit Table</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {filteredInvoices.length} Invoices
              </span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Reconciled vendor statements, anomaly surge alerts, and corresponding NFA/AOP references.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center flex-wrap gap-2.5">
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                placeholder="Search invoice or NFA..."
                className="w-full bg-[#07090E]/80 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={invoiceStatusFilter}
              onChange={(e) => setInvoiceStatusFilter(e.target.value)}
              className="bg-[#07090E]/80 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Outstanding">Outstanding</option>
              <option value="Under Review">Under Review</option>
            </select>

            <select
              value={invoiceProviderFilter}
              onChange={(e) => setInvoiceProviderFilter(e.target.value)}
              className="bg-[#07090E]/80 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">All Providers</option>
              <option value="Google Cloud">Google Cloud</option>
              <option value="Amazon Web Services">AWS</option>
              <option value="Akamai Technologies">Akamai</option>
              <option value="Ateme Platform">Ateme</option>
              <option value="Cloudflare">Cloudflare</option>
            </select>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#07090E]/90 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                <th className="py-3 px-4">Invoice ID</th>
                <th className="py-3 px-4">Provider / Vendor</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Month</th>
                <th className="py-3 px-4 text-right">Amount ({currencySymbol})</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Linked NFA / AOP</th>
                <th className="py-3 px-4">Risk / Anomaly Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                    {inv.invoiceId}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-200 font-medium">
                    {inv.provider}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-medium">
                      {inv.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono">
                    {inv.month}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-white text-right">
                    {formatCurrency(inv.amount, false)}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${statusPillStyle(
                        inv.status
                      )}`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-purple-300 font-medium">
                    {inv.linkedRef}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {inv.anomalyFlag === "Normal" ? (
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                        Normal
                      </span>
                    ) : inv.anomalyFlag?.includes("Surge") ? (
                      <span className="text-[10px] text-amber-400 flex items-center gap-1 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        {inv.anomalyFlag}
                      </span>
                    ) : (
                      <span className="text-[10px] text-rose-400 flex items-center gap-1 font-medium px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                        <ShieldAlert className="w-3 h-3 text-rose-400" />
                        {inv.anomalyFlag}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Add / Edit Billing Month Entry Modal */}
      <AnimatePresence>
        {isAddBillingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0B0F19] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-xs text-slate-300 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Add / Update Billing Month Entry</h3>
                    <p className="text-[11px] text-slate-400">Targeting {activeFY} multi-cloud spend</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddBillingModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Select Billing Month ({activeFY}) *
                  </label>
                  <select
                    value={entryMonth}
                    onChange={(e) => setEntryMonth(e.target.value)}
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    {fyMonths.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.key} ({m.quarter})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      GCP Paid Amount
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={entryGcpPaid}
                      onChange={(e) => setEntryGcpPaid(e.target.value)}
                      placeholder="e.g. 1500000"
                      className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      GCP Open / Outstanding
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={entryGcpOpen}
                      onChange={(e) => setEntryGcpOpen(e.target.value)}
                      placeholder="e.g. 0"
                      className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      AWS Paid Amount
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={entryAwsPaid}
                      onChange={(e) => setEntryAwsPaid(e.target.value)}
                      placeholder="e.g. 1200000"
                      className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      AWS Open / Outstanding
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={entryAwsOpen}
                      onChange={(e) => setEntryAwsOpen(e.target.value)}
                      placeholder="e.g. 0"
                      className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Need full year structure right away?</span>
                  <button
                    type="button"
                    onClick={handleInitializeFullFY}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-all cursor-pointer"
                  >
                    Generate All 12 Months (Apr–Mar)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddBillingModalOpen(false)}
                  className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBillingEntry}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-950/40 cursor-pointer"
                >
                  Save Month Entry
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
