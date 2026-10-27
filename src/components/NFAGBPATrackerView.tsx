import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  FileSpreadsheet,
  Upload,
  Download,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Building2,
  User,
  Calendar,
  Layers,
  ExternalLink,
  Edit3,
  Trash2,
  Mail,
  RefreshCw,
  X,
  ChevronDown,
  LayoutGrid,
  Table as TableIcon,
  Tag,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Briefcase,
  SlidersHorizontal,
  Info,
} from "lucide-react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
// richyrik: FinOps currency & global date filter context
import { useFinOpsCurrency } from "./FinOpsCurrencyContext";

export interface NFAGBPARecord {
  id: string;
  project: string; // Col A: Project
  nfaNumber: string; // Col B: NFA Number
  status: string; // Col C: Status
  comment: string; // Col D: Comment
  aop: string; // Col E: AOP?
  capexOpex: string; // Col F: Capex / Opex
  costComponent: string; // Col G: Cost Component
  usecase: string; // Col H: Usecase
  owner: string; // Col I: Owner
  vendor: string; // Col J: Vendor
  quantityDuration: string; // Col K: Quantity and Duration
  annualCostCr: number | null; // Col L: Annual Cost (Cr)
  emailThread: string; // Col M: Email Thread
}

const STORAGE_KEY = "xtelify_nfa_gbpa_records_v1";

const INITIAL_NFA_GBPA_RECORDS: NFAGBPARecord[] = [
  {
    id: "nfa-rec-001",
    project: "Wynk Music Infra Scale-up",
    nfaNumber: "NFA-2024-001",
    status: "Approved",
    comment: "Approved by Finance Head; CUD discount active for 3 years with 38% gross savings",
    aop: "Yes",
    capexOpex: "Opex",
    costComponent: "GCP Committed Use Discount (CUD)",
    usecase: "High-throughput music streaming, CDN cache nodes, and transcoding compute clusters",
    owner: "Shubham Kumar",
    vendor: "Google Cloud",
    quantityDuration: "36 Months (N2D Compute Instances)",
    annualCostCr: 1.82,
    emailThread: "Approval Thread: NFA-2024-001 [Wynk Music GCP CUD]",
  },
  {
    id: "nfa-rec-002",
    project: "AWS Reserved Instances Q2-Q4",
    nfaNumber: "GBPA-2024-007",
    status: "Approved",
    comment: "Corporate GBPA contract signed; 34% cost savings vs on-demand compute baseline",
    aop: "Yes",
    capexOpex: "Opex",
    costComponent: "AWS EC2 Reserved Instances",
    usecase: "Core microservices cluster, RDS Aurora databases, and Kafka message streaming",
    owner: "Ananya Verma",
    vendor: "Amazon Web Services",
    quantityDuration: "12 Months Term (250 Instances)",
    annualCostCr: 0.8,
    emailThread: "Approval Thread: GBPA-2024-007 [AWS RI FinOps Signoff]",
  },
  {
    id: "nfa-rec-003",
    project: "DR Infrastructure Scale-Up GCP",
    nfaNumber: "NFA-2024-012",
    status: "Pending Finance",
    comment: "Pending Group CFO approval for secondary DR region failover compute capacity",
    aop: "No",
    capexOpex: "Capex",
    costComponent: "Cross-Region Disaster Recovery",
    usecase: "Active-passive multi-region backup for telecommunications regulatory compliance",
    owner: "Rahul Saxena",
    vendor: "Google Cloud",
    quantityDuration: "24 Months (Multi-Region Mumbai/Delhi)",
    annualCostCr: 0.6,
    emailThread: "Approval Thread: NFA-2024-012 [DR Scale-up GCP Review]",
  },
  {
    id: "nfa-rec-004",
    project: "Multi-Cloud CDN Cost Optimization",
    nfaNumber: "GBPA-2024-009",
    status: "Approved",
    comment: "Bandwidth tier commit with Cloudflare edge caching, WAF rules & bot protection",
    aop: "Yes",
    capexOpex: "Opex",
    costComponent: "Enterprise Edge CDN & DDoS Protection",
    usecase: "Global media delivery, zero-trust gateway endpoints, and bot mitigation",
    owner: "Priya Sharma",
    vendor: "Cloudflare",
    quantityDuration: "36 Months Enterprise Agreement",
    annualCostCr: 0.35,
    emailThread: "Approval Thread: GBPA-2024-009 [CDN Bandwidth Agreement]",
  },
  {
    id: "nfa-rec-005",
    project: "SAST/DAST Tooling — Security Budget",
    nfaNumber: "NFA-2024-015",
    status: "Under Review",
    comment: "Security team evaluating Prisma Cloud vs Wiz vs Snyk annual license tiers",
    aop: "Yes",
    capexOpex: "Opex",
    costComponent: "AppSec & Container Scanner License",
    usecase: "DevSecOps CI/CD pipeline integration and real-time repo monitoring across 400+ services",
    owner: "Vikram Malhotra",
    vendor: "Wiz / Palo Alto Networks",
    quantityDuration: "1 Year Enterprise (5,000 developer seats)",
    annualCostCr: 0.45,
    emailThread: "Approval Thread: NFA-2024-015 [DevSecOps Scanner Quote]",
  },
  {
    id: "nfa-rec-006",
    project: "Data Lakehouse BigQuery Migration",
    nfaNumber: "NFA-2024-019",
    status: "Approved",
    comment: "Migration phase 1 completed; formal sign-off from Enterprise Architecture & CISO",
    aop: "Yes",
    capexOpex: "Capex",
    costComponent: "Cloud BigQuery & Dataproc Compute",
    usecase: "Consolidated subscriber analytics and marketing data lake migration from on-prem Hadoop",
    owner: "Rohan Gupta",
    vendor: "Google Cloud",
    quantityDuration: "3 Years Enterprise Migration",
    annualCostCr: 2.4,
    emailThread: "Approval Thread: NFA-2024-019 [BigQuery Lakehouse Phase 1]",
  },
  {
    id: "nfa-rec-007",
    project: "Enterprise GenAI Gateway & Vertex AI",
    nfaNumber: "GBPA-2024-014",
    status: "Pending CTO",
    comment: "Awaiting benchmark metrics on Gemini 1.5 Flash token throughput and PII safety filters",
    aop: "No",
    capexOpex: "Opex",
    costComponent: "LLM API Quota & GPU Reserved Nodes",
    usecase: "Internal conversational search, code assistance, and customer service automated triage",
    owner: "Kavita Nambiar",
    vendor: "Google Cloud / OpenAI",
    quantityDuration: "12 Months Consumption Commitment",
    annualCostCr: 1.15,
    emailThread: "Approval Thread: GBPA-2024-014 [GenAI Model Hub Quota]",
  },
];

export const NFAGBPATrackerView: React.FC = () => {
  // richyrik: Purged test data, initialized clean for real user Excel uploads
  const [records, setRecords] = useState<NFAGBPARecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // richyrik: Connect to FinOps Currency, Datasets & MongoDB Context
  const {
    currency,
    currencySymbol,
    formatCurrency,
    formatCr,
    dateFilter,
    parseWorkbookFile,
    datasets,
    setIsDatasetManagerOpen,
  } = useFinOpsCurrency();

  // richyrik: Ingestion & Dataset Deletion event listeners
  useEffect(() => {
    const handleIngest = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) setRecords(parsed);
        }
      } catch {
        // ignore
      }
    };

    const handleDatasetDeleted = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setRecords(Array.isArray(parsed) ? parsed : []);
        } else {
          setRecords([]);
        }
      } catch {
        setRecords([]);
      }
    };

    window.addEventListener("finops:ingest-approvals", handleIngest);
    window.addEventListener("finops:dataset-deleted", handleDatasetDeleted);
    return () => {
      window.removeEventListener("finops:ingest-approvals", handleIngest);
      window.removeEventListener("finops:dataset-deleted", handleDatasetDeleted);
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [capexFilter, setCapexFilter] = useState("All");
  const [aopFilter, setAopFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<NFAGBPARecord | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [activeEmailRecord, setActiveEmailRecord] = useState<NFAGBPARecord | null>(null);

  const [uploadFeedback, setUploadFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDropInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // ignore
    }
  }, [records]);

  // Executive KPI calculations
  const kpiMetrics = useMemo(() => {
    const totalRecords = records.length;

    let nfaCount = 0;
    let gbpaCount = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    let totalCostCr = 0;
    let capexCostCr = 0;
    let opexCostCr = 0;
    let aopYesCount = 0;

    for (const r of records) {
      const numUpper = (r.nfaNumber || "").toUpperCase();
      if (numUpper.includes("GBPA")) gbpaCount++;
      else nfaCount++;

      const st = (r.status || "").toLowerCase();
      if (st.includes("approv")) approvedCount++;
      else if (st.includes("reject") || st.includes("declin")) rejectedCount++;
      else pendingCount++;

      const cost = typeof r.annualCostCr === "number" && !isNaN(r.annualCostCr) ? r.annualCostCr : 0;
      totalCostCr += cost;

      const cx = (r.capexOpex || "").toLowerCase();
      if (cx.includes("capex")) capexCostCr += cost;
      else if (cx.includes("opex")) opexCostCr += cost;

      const aop = (r.aop || "").trim().toLowerCase();
      if (aop === "yes" || aop === "y" || aop === "true") aopYesCount++;
    }

    const approvedPct = totalRecords > 0 ? Math.round((approvedCount / totalRecords) * 100) : 0;
    const aopPct = totalRecords > 0 ? Math.round((aopYesCount / totalRecords) * 100) : 0;

    return {
      totalRecords,
      nfaCount,
      gbpaCount,
      approvedCount,
      pendingCount,
      rejectedCount,
      approvedPct,
      totalCostCr,
      capexCostCr,
      opexCostCr,
      aopYesCount,
      aopPct,
    };
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          r.project.toLowerCase().includes(q) ||
          r.nfaNumber.toLowerCase().includes(q) ||
          r.vendor.toLowerCase().includes(q) ||
          r.owner.toLowerCase().includes(q) ||
          r.usecase.toLowerCase().includes(q) ||
          r.costComponent.toLowerCase().includes(q) ||
          r.comment.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (statusFilter !== "All") {
        const st = (r.status || "").toLowerCase();
        if (statusFilter === "Approved" && !st.includes("approv")) return false;
        if (statusFilter === "Pending" && (st.includes("approv") || st.includes("reject"))) return false;
        if (statusFilter === "Rejected" && !st.includes("reject") && !st.includes("declin")) return false;
      }

      if (capexFilter !== "All") {
        const cx = (r.capexOpex || "").toLowerCase();
        if (capexFilter === "Capex" && !cx.includes("capex")) return false;
        if (capexFilter === "Opex" && !cx.includes("opex")) return false;
      }

      if (aopFilter !== "All") {
        const aop = (r.aop || "").trim().toLowerCase();
        const isYes = aop === "yes" || aop === "y" || aop === "true";
        if (aopFilter === "Yes" && !isYes) return false;
        if (aopFilter === "No" && isYes) return false;
      }

      return true;
    });
  }, [records, searchQuery, statusFilter, capexFilter, aopFilter]);

  // Excel parsing logic matching the 13 exact columns case-insensitively
  const parseExcelFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });

      // richyrik: Multi-sheet workbook auto-routing trigger
      if (workbook.SheetNames && workbook.SheetNames.length > 1) {
        await parseWorkbookFile(file);
        return;
      }

      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setUploadFeedback({ type: "error", message: "Excel workbook does not contain any sheets." });
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

      if (rawRows.length < 2) {
        setUploadFeedback({ type: "error", message: "Sheet has no data rows." });
        return;
      }

      let headerRowIndex = 0;
      let colMap: Record<string, number> = {};

      for (let r = 0; r < Math.min(10, rawRows.length); r++) {
        const row = rawRows[r];
        if (!Array.isArray(row)) continue;

        const currentMap: Record<string, number> = {};
        row.forEach((cell, idx) => {
          const str = String(cell || "").trim().toLowerCase();
          if (/^project/i.test(str)) currentMap.project = idx;
          else if (/^(nfa\s*number|nfa\s*no\.?|nfa|gbpa\s*number|gbpa\s*no\.?|approval\s*no)/i.test(str)) currentMap.nfaNumber = idx;
          else if (/^status/i.test(str)) currentMap.status = idx;
          else if (/^(comment|comments|remark|remarks|notes)/i.test(str)) currentMap.comment = idx;
          else if (/^(aop\??|is\s*aop|aop\s*aligned)/i.test(str)) currentMap.aop = idx;
          else if (/^(capex\s*[\/\-]?\s*opex|capex|opex)/i.test(str)) currentMap.capexOpex = idx;
          else if (/^(cost\s*component|component|cost\s*item)/i.test(str)) currentMap.costComponent = idx;
          else if (/^(usecase|use\s*case|description)/i.test(str)) currentMap.usecase = idx;
          else if (/^(owner|lead|spoc|assigned\s*to)/i.test(str)) currentMap.owner = idx;
          else if (/^(vendor|partner|provider|supplier)/i.test(str)) currentMap.vendor = idx;
          else if (/^(quantity\s*(and|&)?\s*duration|duration|quantity|term|tenure)/i.test(str)) currentMap.quantityDuration = idx;
          else if (/^(annual\s*cost\*?\s*\(?cr\)?|annual\s*cost|cost\s*\(?cr\)?|amount\s*\(?cr\)?)/i.test(str)) currentMap.annualCostCr = idx;
          else if (/^(email\s*thread|email|thread|mail\s*thread|approval\s*thread)/i.test(str)) currentMap.emailThread = idx;
        });

        if (currentMap.project !== undefined || currentMap.nfaNumber !== undefined || currentMap.costComponent !== undefined) {
          headerRowIndex = r;
          colMap = currentMap;
          break;
        }
      }

      if (colMap.project === undefined && colMap.nfaNumber === undefined) {
        colMap = {
          project: 0,
          nfaNumber: 1,
          status: 2,
          comment: 3,
          aop: 4,
          capexOpex: 5,
          costComponent: 6,
          usecase: 7,
          owner: 8,
          vendor: 9,
          quantityDuration: 10,
          annualCostCr: 11,
          emailThread: 12,
        };
      }

      const parsedRecords: NFAGBPARecord[] = [];

      for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!Array.isArray(row) || row.every((c) => c === "" || c === null || c === undefined)) continue;

        const getVal = (key: string): string => {
          const colIdx = colMap[key];
          if (colIdx !== undefined && row[colIdx] !== undefined && row[colIdx] !== null) {
            return String(row[colIdx]).trim();
          }
          return "";
        };

        const rawProject = getVal("project");
        const rawNfaNumber = getVal("nfaNumber");
        const rawStatus = getVal("status") || "Pending";
        const rawComment = getVal("comment");
        const rawAop = getVal("aop") || "No";
        const rawCapexOpex = getVal("capexOpex") || "Opex";
        const rawCostComponent = getVal("costComponent");
        const rawUsecase = getVal("usecase");
        const rawOwner = getVal("owner");
        const rawVendor = getVal("vendor");
        const rawQuantityDuration = getVal("quantityDuration");
        const rawEmailThread = getVal("emailThread");

        if (!rawProject && !rawNfaNumber && !rawCostComponent) continue;

        // Parse Annual Cost (Cr)
        let costNum: number | null = null;
        const rawCostStr = getVal("annualCostCr");
        if (rawCostStr) {
          const clean = rawCostStr.replace(/[₹,crCR\s]/g, "");
          const num = parseFloat(clean);
          if (!isNaN(num)) {
            if (num > 10000) {
              costNum = parseFloat((num / 10000000).toFixed(2));
            } else {
              costNum = parseFloat(num.toFixed(2));
            }
          }
        }

        parsedRecords.push({
          id: `nfa-upload-${Date.now()}-${r}`,
          project: rawProject || `Project Line ${r}`,
          nfaNumber: rawNfaNumber || `NFA-2024-${String(r).padStart(3, "0")}`,
          status: rawStatus,
          comment: rawComment,
          aop: rawAop,
          capexOpex: rawCapexOpex,
          costComponent: rawCostComponent,
          usecase: rawUsecase,
          owner: rawOwner,
          vendor: rawVendor,
          quantityDuration: rawQuantityDuration,
          annualCostCr: costNum,
          emailThread: rawEmailThread,
        });
      }

      if (parsedRecords.length === 0) {
        setUploadFeedback({ type: "error", message: "No valid rows found matching NFA & GBPA schema." });
        return;
      }

      setRecords(parsedRecords);
      setUploadFeedback({
        type: "success",
        message: `Successfully parsed and loaded ${parsedRecords.length} NFA / GBPA lines from "${file.name}".`,
      });
      setIsUploadModalOpen(false);
    } catch (err: any) {
      setUploadFeedback({
        type: "error",
        message: `Error reading file: ${err?.message || "Unknown file read error"}`,
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseExcelFile(file);
    if (e.target) e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseExcelFile(file);
  };

  // Export to Excel with the exact 13 headers from Images 1 & 2
  const handleExportExcel = () => {
    const exportData = records.map((r) => ({
      Project: r.project,
      "NFA Number": r.nfaNumber,
      Status: r.status,
      Comment: r.comment,
      "AOP?": r.aop,
      "Capex / Opex": r.capexOpex,
      "Cost Component": r.costComponent,
      Usecase: r.usecase,
      Owner: r.owner,
      Vendor: r.vendor,
      "Quantity and Duration": r.quantityDuration,
      "Annual Cost (Cr)": r.annualCostCr !== null ? r.annualCostCr : "",
      "Email Thread": r.emailThread,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet["!cols"] = [
      { wch: 30 }, // Project
      { wch: 18 }, // NFA Number
      { wch: 16 }, // Status
      { wch: 35 }, // Comment
      { wch: 10 }, // AOP?
      { wch: 14 }, // Capex / Opex
      { wch: 32 }, // Cost Component
      { wch: 45 }, // Usecase
      { wch: 20 }, // Owner
      { wch: 22 }, // Vendor
      { wch: 30 }, // Quantity and Duration
      { wch: 18 }, // Annual Cost (Cr)
      { wch: 35 }, // Email Thread
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "NFA & GBPA Tracker");
    XLSX.writeFile(workbook, `NFA_GBPA_Status_Tracker_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleSaveEdit = (updated: NFAGBPARecord) => {
    setRecords((prev) => {
      const idx = prev.findIndex((item) => item.id === updated.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [updated, ...prev];
    });
    setIsEditModalOpen(false);
    setEditingRecord(null);
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleResetSampleData = () => {
    setRecords(INITIAL_NFA_GBPA_RECORDS);
    setUploadFeedback({ type: "info", message: "Reset to default sample NFA/GBPA tracker records." });
  };

  const statusBadgeStyle = (statusStr: string) => {
    const s = (statusStr || "").toLowerCase();
    if (s.includes("approv")) {
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 ring-1 ring-emerald-500/30";
    }
    if (s.includes("reject") || s.includes("declin")) {
      return "bg-rose-500/15 text-rose-300 border-rose-500/30 ring-1 ring-rose-500/30";
    }
    return "bg-amber-500/15 text-amber-300 border-amber-500/30 ring-1 ring-amber-500/30";
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER & ACTION BAR ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-300 via-purple-300 to-indigo-400">
                NFA & GBPA Status Tracker
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
                FinOps Approvals
              </span>
            </h2>
          </div>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            Track active approval notes, financial commitments, vendor allocations, and annual costs from uploaded Excel sheets.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-violet-900/30 hover:shadow-violet-900/50 transition-all border border-violet-400/20 active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload NFA Excel
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-white/[0.08] transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export Excel
          </button>

          <button
            onClick={() => {
              setEditingRecord({
                id: `nfa-new-${Date.now()}`,
                project: "",
                nfaNumber: "NFA-2024-",
                status: "Pending Finance",
                comment: "",
                aop: "Yes",
                capexOpex: "Opex",
                costComponent: "",
                usecase: "",
                owner: "",
                vendor: "",
                quantityDuration: "",
                annualCostCr: null,
                emailThread: "",
              });
              setIsEditModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-white/[0.08] transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-violet-400" />
            Add Note
          </button>

          <button
            onClick={handleResetSampleData}
            title="Reset to default sample data"
            className="p-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 rounded-xl border border-white/[0.08] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── UPLOAD FEEDBACK TOAST ── */}
      <AnimatePresence>
        {uploadFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${uploadFeedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              : uploadFeedback.type === "error"
                ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                : "bg-blue-500/10 text-blue-300 border-blue-500/30"
              }`}
          >
            <div className="flex items-center gap-2">
              {uploadFeedback.type === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : uploadFeedback.type === "error" ? (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              ) : (
                <Info className="w-4 h-4 text-blue-400" />
              )}
              <span>{uploadFeedback.message}</span>
            </div>
            <button
              onClick={() => setUploadFeedback(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 4 EXECUTIVE KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total NFA / GBPA Records */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-violet-500/30 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Approvals
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-white">
            {kpiMetrics.totalRecords}{" "}
            <span className="text-xs font-normal text-slate-400">Records</span>
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium">
              {kpiMetrics.nfaCount} NFA
            </span>
            <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 font-medium">
              {kpiMetrics.gbpaCount} GBPA
            </span>
          </div>
        </div>

        {/* Card 2: Approved vs Pending */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-emerald-500/30 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Approved vs Pending
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-black tracking-tight text-emerald-400">
              {kpiMetrics.approvedCount}
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {kpiMetrics.approvedPct}% Approved
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-400">
            <span className="text-amber-400 font-medium">{kpiMetrics.pendingCount} Pending</span>
            <span>•</span>
            <span className="text-rose-400 font-medium">{kpiMetrics.rejectedCount} Rejected</span>
          </div>
        </div>

        {/* Card 3: Total Annual Cost (Cr) */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-indigo-500/30 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Annual Cost
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-white font-mono">
            {formatCr(kpiMetrics.totalCostCr)}
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-400">
            <span className="text-indigo-300 font-medium">{formatCr(kpiMetrics.capexCostCr)} Capex</span>
            <span>•</span>
            <span className="text-emerald-300 font-medium">{formatCr(kpiMetrics.opexCostCr)} Opex</span>
          </div>
        </div>

        {/* Card 4: AOP Aligned Count */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-cyan-500/30 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              AOP 2027 Alignment
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-black tracking-tight text-cyan-400">
              {kpiMetrics.aopYesCount}
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              {kpiMetrics.aopPct}% Aligned
            </span>
          </div>
          <div className="mt-2.5 text-xs text-slate-400">
            {kpiMetrics.aopYesCount} of {kpiMetrics.totalRecords} mapped to AOP plan
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Project, NFA No, Vendor, Owner, Usecase..."
              className="w-full bg-[#07090E]/80 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/70 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#07090E]/80 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500/70"
            >
              <option value="All">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending / In Review</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Capex / Opex Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400">Classification:</span>
            <select
              value={capexFilter}
              onChange={(e) => setCapexFilter(e.target.value)}
              className="bg-[#07090E]/80 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500/70"
            >
              <option value="All">All (Capex & Opex)</option>
              <option value="Capex">Capex Only</option>
              <option value="Opex">Opex Only</option>
            </select>
          </div>

          {/* AOP Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400">AOP?:</span>
            <select
              value={aopFilter}
              onChange={(e) => setAopFilter(e.target.value)}
              className="bg-[#07090E]/80 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500/70"
            >
              <option value="All">All</option>
              <option value="Yes">AOP: Yes</option>
              <option value="No">AOP: No</option>
            </select>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-[#07090E]/80 border border-slate-700/80 p-1 rounded-xl self-end md:self-auto">
          <button
            onClick={() => setViewMode("cards")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === "cards"
              ? "bg-violet-600/30 text-violet-300 border border-violet-500/40"
              : "text-slate-400 hover:text-white"
              }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Cards
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === "table"
              ? "bg-violet-600/30 text-violet-300 border border-violet-500/40"
              : "text-slate-400 hover:text-white"
              }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            Master Table
          </button>
        </div>
      </div>

      {/* ── DRAG & DROP EMPTY STATE (WHEN NO RECORDS) ── */}
      {records.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all bg-white/[0.01] ${isDragging
            ? "border-violet-500 bg-violet-500/10 scale-[1.01]"
            : "border-slate-700/80 hover:border-slate-600"
            }`}
        >
          <input
            type="file"
            ref={dragDropInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4 shadow-lg shadow-violet-900/20">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            Ready for your NFA / GBPA Approvals Excel upload
          </h3>
          <p className="text-slate-400 text-xs max-w-lg mx-auto mb-6">
            Upload your company approvals sheet (.xlsx, .xls, .csv) with the 13 standard columns. All uploaded sheets are automatically stored in Airtel Cloud Ops Security MongoDB (<code className="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">xtelify_db.finops_datasets</code>).
          </p>
          <div className="flex items-center justify-center flex-wrap gap-3">
            <button
              onClick={() => dragDropInputRef.current?.click()}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer"
            >
              Select Excel File
            </button>
            <button
              onClick={() => setIsDatasetManagerOpen(true)}
              className="px-5 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-white/[0.08] transition-all cursor-pointer"
            >
              View Datasets ({datasets.length})
            </button>
            <button
              onClick={handleResetSampleData}
              className="px-4 py-2.5 bg-slate-800/60 hover:bg-slate-800 text-slate-400 text-xs rounded-xl border border-slate-700/60 transition-all cursor-pointer"
            >
              Load Sample Template
            </button>
          </div>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-10 text-center">
          <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-white mb-1">No matching approvals found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Try adjusting your search query or reset the Status / Capex / AOP filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("All");
              setCapexFilter("All");
              setAopFilter("All");
            }}
            className="px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.08] text-xs text-slate-300 rounded-lg border border-white/[0.08]"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === "cards" ? (
        /* ── CARD GRID VIEW (Image 3 Modernized) ── */
        <div className="space-y-4">
          {filteredRecords.map((item) => {
            const isNfa = (item.nfaNumber || "").toUpperCase().includes("NFA");
            const isGbpa = (item.nfaNumber || "").toUpperCase().includes("GBPA");

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-slate-600/60 transition-all group relative overflow-hidden"
              >
                {/* Top Header Row */}
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${isNfa
                          ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                          : isGbpa
                            ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                            : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                          }`}
                      >
                        {isNfa ? "NFA" : isGbpa ? "GBPA" : "APPROVAL"}
                      </span>
                      <span className="text-slate-300 font-mono text-xs font-semibold tracking-wide">
                        {item.nfaNumber || "—"}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs text-slate-400 font-medium">
                        {item.project}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight pt-0.5">
                      {item.project}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1.5 ${statusBadgeStyle(
                        item.status
                      )}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${(item.status || "").toLowerCase().includes("approv")
                          ? "bg-emerald-400 animate-pulse"
                          : (item.status || "").toLowerCase().includes("reject")
                            ? "bg-rose-400"
                            : "bg-amber-400 animate-pulse"
                          }`}
                      />
                      {item.status || "Pending"}
                    </span>

                    <button
                      onClick={() => {
                        setEditingRecord(item);
                        setIsEditModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all"
                      title="Edit Line Item"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteRecord(item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                      title="Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Key Metadata Grid: Owner, Vendor, Capex/Opex, AOP? */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-[#07090E]/60 border border-slate-800/80 mb-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                      Owner
                    </span>
                    <div className="flex items-center gap-1.5 text-slate-200 font-medium truncate">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.owner || "Unassigned"}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                      Vendor
                    </span>
                    <div className="flex items-center gap-1.5 text-slate-200 font-medium truncate">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{item.vendor || "—"}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                      Capex / Opex
                    </span>
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${(item.capexOpex || "").toLowerCase().includes("capex")
                        ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                        : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        }`}
                    >
                      {item.capexOpex || "Opex"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                      AOP Aligned
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${(item.aop || "").toLowerCase() === "yes" || (item.aop || "").toLowerCase() === "y"
                        ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                        : "bg-slate-700/30 text-slate-400 border-slate-700"
                        }`}
                    >
                      {(item.aop || "").toLowerCase() === "yes" || (item.aop || "").toLowerCase() === "y" ? (
                        <>
                          <CheckCircle className="w-2.5 h-2.5 text-cyan-400" />
                          AOP: Yes
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-2.5 h-2.5 text-slate-400" />
                          AOP: No
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Financials & Duration Banner */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-violet-950/20 via-indigo-950/20 to-slate-900/40 border border-violet-500/20 flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-300 font-bold">
                      {currencySymbol}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-violet-300/80 block">
                        Annual Cost
                      </span>
                      <div className="text-lg font-black text-white font-mono tracking-tight">
                        {item.annualCostCr !== null ? (
                          formatCr(item.annualCostCr)
                        ) : (
                          <span className="text-amber-400 text-xs font-sans">— Awaiting Cost</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Quantity & Duration
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-200 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.quantityDuration || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Operational Details: Cost Component, Usecase, Comment */}
                <div className="space-y-2 text-xs">
                  {item.costComponent && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400 shrink-0">Cost Component:</span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                        {item.costComponent}
                      </span>
                    </div>
                  )}

                  {item.usecase && (
                    <div className="flex items-start gap-2">
                      <span className="text-[11px] font-bold text-slate-400 shrink-0 pt-0.5">Usecase:</span>
                      <p className="text-slate-300 leading-relaxed">{item.usecase}</p>
                    </div>
                  )}

                  {item.comment && (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-slate-300">
                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="leading-relaxed text-[11px]">
                        <span className="font-semibold text-amber-300">Comment / Remarks: </span>
                        {item.comment}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Action: Email Thread */}
                {item.emailThread && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                        Approval Thread:
                      </span>
                      <span className="text-slate-300 truncate max-w-md">{item.emailThread}</span>
                    </div>

                    <button
                      onClick={() => {
                        setActiveEmailRecord(item);
                        setIsEmailModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 rounded-lg text-xs font-semibold border border-violet-500/30 transition-all"
                    >
                      <span>View Email Thread</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* ── MASTER TABLE VIEW (Full 13 Columns) ── */
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#07090E]/90 text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  <th className="py-3.5 px-4">Project</th>
                  <th className="py-3.5 px-4">NFA Number</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Cost Component</th>
                  <th className="py-3.5 px-4">Usecase</th>
                  <th className="py-3.5 px-4">Annual Cost (Cr)</th>
                  <th className="py-3.5 px-4">AOP?</th>
                  <th className="py-3.5 px-4">Capex / Opex</th>
                  <th className="py-3.5 px-4">Owner</th>
                  <th className="py-3.5 px-4">Vendor</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Comment</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRecords.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                    onClick={() => {
                      setEditingRecord(item);
                      setIsEditModalOpen(true);
                    }}
                  >
                    <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                      {item.project}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-purple-300 font-semibold">
                      {item.nfaNumber}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadgeStyle(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-cyan-300">
                      {item.costComponent || "—"}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-300" title={item.usecase}>
                      {item.usecase || "—"}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-white">
                      {item.annualCostCr !== null ? formatCr(item.annualCostCr) : "—"}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(item.aop || "").toLowerCase() === "yes"
                          ? "bg-cyan-500/20 text-cyan-300"
                          : "bg-slate-700/40 text-slate-400"
                          }`}
                      >
                        {item.aop}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(item.capexOpex || "").toLowerCase().includes("capex")
                          ? "bg-indigo-500/20 text-indigo-300"
                          : "bg-emerald-500/20 text-emerald-300"
                          }`}
                      >
                        {item.capexOpex}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                      {item.owner || "—"}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                      {item.vendor || "—"}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                      {item.quantityDuration || "—"}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-400" title={item.comment}>
                      {item.comment || "—"}
                    </td>
                    <td
                      className="py-3.5 px-4 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingRecord(item);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-white rounded"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(item.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── EDIT / ADD MODAL ── */}
      <AnimatePresence>
        {isEditModalOpen && editingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0B0F19] border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-xs text-slate-300 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/20 text-violet-300 flex items-center justify-center font-bold">
                    <Edit3 className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {editingRecord.project ? `Edit Approval: ${editingRecord.nfaNumber}` : "Add New Approval Note"}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingRecord(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Col A: Project */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={editingRecord.project}
                    onChange={(e) => setEditingRecord({ ...editingRecord, project: e.target.value })}
                    placeholder="e.g. Wynk Music Infra Scale-up"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Col B: NFA Number */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    NFA / GBPA Number *
                  </label>
                  <input
                    type="text"
                    value={editingRecord.nfaNumber}
                    onChange={(e) => setEditingRecord({ ...editingRecord, nfaNumber: e.target.value })}
                    placeholder="e.g. NFA-2024-001 or GBPA-2024-007"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>

                {/* Col C: Status */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    value={editingRecord.status}
                    onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value })}
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="Approved">Approved</option>
                    <option value="Pending Finance">Pending Finance</option>
                    <option value="Pending CTO">Pending CTO</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {/* Col E: AOP? */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    AOP Aligned? (Col E)
                  </label>
                  <select
                    value={editingRecord.aop}
                    onChange={(e) => setEditingRecord({ ...editingRecord, aop: e.target.value })}
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                {/* Col F: Capex / Opex */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Capex / Opex (Col F)
                  </label>
                  <select
                    value={editingRecord.capexOpex}
                    onChange={(e) => setEditingRecord({ ...editingRecord, capexOpex: e.target.value })}
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="Opex">Opex</option>
                    <option value="Capex">Capex</option>
                  </select>
                </div>

                {/* Col L: Annual Cost (Cr) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Annual Cost (Cr) ₹ (Col L)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRecord.annualCostCr !== null ? editingRecord.annualCostCr : ""}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        annualCostCr: e.target.value === "" ? null : parseFloat(e.target.value),
                      })
                    }
                    placeholder="e.g. 1.82"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>

                {/* Col I: Owner */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Owner / SPOC (Col I)
                  </label>
                  <input
                    type="text"
                    value={editingRecord.owner}
                    onChange={(e) => setEditingRecord({ ...editingRecord, owner: e.target.value })}
                    placeholder="e.g. Shubham Kumar"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Col J: Vendor */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Vendor / Provider (Col J)
                  </label>
                  <input
                    type="text"
                    value={editingRecord.vendor}
                    onChange={(e) => setEditingRecord({ ...editingRecord, vendor: e.target.value })}
                    placeholder="e.g. Google Cloud, AWS, Microsoft"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Col K: Quantity and Duration */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Quantity and Duration (Col K)
                  </label>
                  <input
                    type="text"
                    value={editingRecord.quantityDuration}
                    onChange={(e) => setEditingRecord({ ...editingRecord, quantityDuration: e.target.value })}
                    placeholder="e.g. 36 Months Term (250 Instances)"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Col G: Cost Component */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Cost Component (Col G)
                  </label>
                  <input
                    type="text"
                    value={editingRecord.costComponent}
                    onChange={(e) => setEditingRecord({ ...editingRecord, costComponent: e.target.value })}
                    placeholder="e.g. GCP Committed Use Discount (CUD)"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Col H: Usecase */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Usecase (Col H)
                  </label>
                  <textarea
                    rows={2}
                    value={editingRecord.usecase}
                    onChange={(e) => setEditingRecord({ ...editingRecord, usecase: e.target.value })}
                    placeholder="Detailed operational use case..."
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Col D: Comment */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Comment / Approval Remarks (Col D)
                  </label>
                  <textarea
                    rows={2}
                    value={editingRecord.comment}
                    onChange={(e) => setEditingRecord({ ...editingRecord, comment: e.target.value })}
                    placeholder="e.g. Approved by Finance Head; CUD discount active for 3 years"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Col M: Email Thread */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Email Thread / Link / Reference (Col M)
                  </label>
                  <input
                    type="text"
                    value={editingRecord.emailThread}
                    onChange={(e) => setEditingRecord({ ...editingRecord, emailThread: e.target.value })}
                    placeholder="e.g. Approval Thread: NFA-2024-001 or URL"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingRecord(null);
                  }}
                  className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveEdit(editingRecord)}
                  className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-violet-900/30"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── EMAIL THREAD VIEWER MODAL ── */}
      <AnimatePresence>
        {isEmailModalOpen && activeEmailRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0B0F19] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-xs text-slate-300 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Approval Email Thread
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {activeEmailRecord.nfaNumber} • {activeEmailRecord.project}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsEmailModalOpen(false);
                    setActiveEmailRecord(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#07090E] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 uppercase font-bold">Thread Reference:</span>
                  <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-medium">
                    {activeEmailRecord.status}
                  </span>
                </div>
                <div className="text-white font-medium text-xs break-all">
                  {activeEmailRecord.emailThread}
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div>
                    <span className="text-slate-500">Owner / Submitter: </span>
                    <span className="text-slate-200">{activeEmailRecord.owner || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Cost: </span>
                    <span className="text-white font-mono font-semibold">
                      {activeEmailRecord.annualCostCr !== null
                        ? `₹${activeEmailRecord.annualCostCr.toFixed(2)} Cr`
                        : "—"}
                    </span>
                  </div>
                  {activeEmailRecord.comment && (
                    <div>
                      <span className="text-slate-500">Remarks: </span>
                      <span className="text-slate-300">{activeEmailRecord.comment}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {activeEmailRecord.emailThread.startsWith("http") && (
                  <a
                    href={activeEmailRecord.emailThread}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl"
                  >
                    <span>Open External Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  onClick={() => {
                    setIsEmailModalOpen(false);
                    setActiveEmailRecord(null);
                  }}
                  className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 rounded-xl font-medium"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
