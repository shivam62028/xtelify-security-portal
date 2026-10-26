import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Target,
  Wallet,
  Layers,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  AlertCircle,
  Upload,
  Download,
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  PieChart,
  BarChart3,
  RefreshCw,
  X,
  ChevronDown,
  Building2,
  Sparkles,
  HelpCircle,
  Tag,
  CreditCard,
  Briefcase,
  SlidersHorizontal,
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
  Cell,
  PieChart as RechartsPieChart,
  Pie,
} from "recharts";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";

export interface AOPLineItem {
  id: string;
  project: string; // Column A: Project
  costComponent: string; // Column B: Cost Component
  usecase: string; // Column C: Usecase
  lob: string; // Column D: LOB (optional / blank initially)
  amount: number | null; // Column E: Amount (optional / blank initially)
  paymentMode: string; // Column F: Payment mode (Monthly / One time) (optional / blank initially)
  capexOpex: string; // Column G: Capex/Opex (optional / blank initially)
}

// Initial company scoping data: Columns A, B, C populated; D, E, F, G empty as per company current state
const INITIAL_AOP_2027_DATA: AOPLineItem[] = [
  {
    id: "aop-2027-001",
    project: "Wynk Music Core",
    costComponent: "Cloud Compute (GCP GKE Production)",
    usecase: "High-throughput audio streaming microservices, auto-scaling playback pods, and session management",
    lob: "",
    amount: null,
    paymentMode: "",
    capexOpex: "",
  },
  {
    id: "aop-2027-002",
    project: "Wynk Music Core",
    costComponent: "Cloud Storage & Global CDN",
    usecase: "FLAC and MP3 audio track asset storage, regional edge caching, and offline download sync",
    lob: "",
    amount: null,
    paymentMode: "",
    capexOpex: "",
  },
  {
    id: "aop-2027-003",
    project: "Wynk Music Core",
    costComponent: "Managed Databases (Cloud SQL & Spanner)",
    usecase: "Subscriber playlist database, playback telemetry, and real-time social listening sessions",
    lob: "",
    amount: null,
    paymentMode: "",
    capexOpex: "",
  },
  {
    id: "aop-2027-004",
    project: "Airtel Xstream Play",
    costComponent: "Live Video Transcoding Pipeline",
    usecase: "Distributed HLS/DASH video encoding, multi-bitrate packaging, and DRM license server infrastructure",
    lob: "",
    amount: null,
    paymentMode: "",
    capexOpex: "",
  },
  {
    id: "aop-2027-005",
    project: "Airtel Xstream Play",
    costComponent: "Edge CDN Bandwidth (Akamai / Cloudflare)",
    usecase: "High-concurrency live cricket and entertainment streaming with ultra-low latency playback",
    lob: "",
    amount: null,
    paymentMode: "",
    capexOpex: "",
  },
  {
    id: "aop-2027-006",
    project: "Airtel Xstream Play",
    costComponent: "Recommendation AI GPU Clusters",
    usecase: "Personalized content discovery, viewer homepage curation, and real-time vector search embeddings",
    lob: "",
    amount: null,
    paymentMode: "",
    capexOpex: "",
  },
  {
    id: "aop-2027-007",
    project: "Cloud Security & FinOps Portal",
    costComponent: "CSPM & Container Scanning Licenses",
    usecase: "Continuous multi-cloud asset discovery, Kubernetes cluster posture, and CIS compliance auditing",
    lob: "",
    amount: null,
    paymentMode: "",
    capexOpex: "",
  },
  {
    id: "aop-2027-008",
    project: "Cloud Security & FinOps Portal",
    costComponent: "SAST/DAST Tooling & CI/CD Pipeline",
    usecase: "Automated static code security scanning and dynamic vulnerability verification in GitLab pipelines",
    lob: "",
    amount: null,
    paymentMode: "",
    capexOpex: "",
  },
  {
    id: "aop-2027-009",
    project: "Cloud Security & FinOps Portal",
    costComponent: "Security Portal Ingest DB (MongoDB Atlas)",
    usecase: "Vulnerability finding deduplication, asset ownership mapping, and multi-snapshot trend tracking",
    lob: "",
    amount: null,
    paymentMode: "",
    capexOpex: "",
  },
  {
    id: "aop-2027-010",
    project: "IPTV NextGen Infrastructure",
    costComponent: "Headend Video Encoding Appliances",
    usecase: "Broadcast linear television IP stream multiplexing, subtitling, and ad-insertion processors",
    lob: "",
    amount: null,
    paymentMode: "",
    capexOpex: "",
  },
  {
    id: "aop-2027-011",
    project: "IPTV NextGen Infrastructure",
    costComponent: "Origin Catch-up Rolling Buffer Storage",
    usecase: "7-day linear television rewind and catch-up TV rolling storage for digital set-top box playback",
    lob: "",
    amount: null,
    paymentMode: "",
    capexOpex: "",
  },
  {
    id: "aop-2027-012",
    project: "Big Data & Analytics Platform",
    costComponent: "BigQuery & Dataproc Analytics Compute",
    usecase: "Subscriber lifecycle event analytics, automated billing reconciliation, and churn prediction models",
    lob: "",
    amount: null,
    paymentMode: "",
    capexOpex: "",
  },
  {
    id: "aop-2027-013",
    project: "Big Data & Analytics Platform",
    costComponent: "Kafka Event Ingestion Fabric",
    usecase: "High-throughput streaming telemetry handling 250k+ subscriber interaction events per second",
    lob: "",
    amount: null,
    paymentMode: "",
    capexOpex: "",
  },
  {
    id: "aop-2027-014",
    project: "Enterprise API Gateway & Security",
    costComponent: "API Management Fabric & WAF Perimeter",
    usecase: "Subscriber authentication gateway, telecom carrier billing integrations, and DDoS mitigation",
    lob: "",
    amount: null,
    paymentMode: "",
    capexOpex: "",
  },
];

// Sample financial dataset for users who want to preview the fully populated view with D, E, F, G
const SAMPLE_POPULATED_AOP_2027: AOPLineItem[] = [
  {
    id: "aop-2027-001",
    project: "Wynk Music Core",
    costComponent: "Cloud Compute (GCP GKE Production)",
    usecase: "High-throughput audio streaming microservices, auto-scaling playback pods, and session management",
    lob: "Wynk Music",
    amount: 38000000,
    paymentMode: "Monthly",
    capexOpex: "Opex",
  },
  {
    id: "aop-2027-002",
    project: "Wynk Music Core",
    costComponent: "Cloud Storage & Global CDN",
    usecase: "FLAC and MP3 audio track asset storage, regional edge caching, and offline download sync",
    lob: "Wynk Music",
    amount: 24500000,
    paymentMode: "Monthly",
    capexOpex: "Opex",
  },
  {
    id: "aop-2027-003",
    project: "Wynk Music Core",
    costComponent: "Managed Databases (Cloud SQL & Spanner)",
    usecase: "Subscriber playlist database, playback telemetry, and real-time social listening sessions",
    lob: "Wynk Music",
    amount: 19000000,
    paymentMode: "Monthly",
    capexOpex: "Opex",
  },
  {
    id: "aop-2027-004",
    project: "Airtel Xstream Play",
    costComponent: "Live Video Transcoding Pipeline",
    usecase: "Distributed HLS/DASH video encoding, multi-bitrate packaging, and DRM license server infrastructure",
    lob: "DTH / Media",
    amount: 45000000,
    paymentMode: "Monthly",
    capexOpex: "Opex",
  },
  {
    id: "aop-2027-005",
    project: "Airtel Xstream Play",
    costComponent: "Edge CDN Bandwidth (Akamai / Cloudflare)",
    usecase: "High-concurrency live cricket and entertainment streaming with ultra-low latency playback",
    lob: "DTH / Media",
    amount: 62000000,
    paymentMode: "Monthly",
    capexOpex: "Opex",
  },
  {
    id: "aop-2027-006",
    project: "Airtel Xstream Play",
    costComponent: "Recommendation AI GPU Clusters",
    usecase: "Personalized content discovery, viewer homepage curation, and real-time vector search embeddings",
    lob: "Digital Apps",
    amount: 28000000,
    paymentMode: "Monthly",
    capexOpex: "Opex",
  },
  {
    id: "aop-2027-007",
    project: "Cloud Security & FinOps Portal",
    costComponent: "CSPM & Container Scanning Licenses",
    usecase: "Continuous multi-cloud asset discovery, Kubernetes cluster posture, and CIS compliance auditing",
    lob: "Enterprise Security",
    amount: 14500000,
    paymentMode: "One time",
    capexOpex: "Capex",
  },
  {
    id: "aop-2027-008",
    project: "Cloud Security & FinOps Portal",
    costComponent: "SAST/DAST Tooling & CI/CD Pipeline",
    usecase: "Automated static code security scanning and dynamic vulnerability verification in GitLab pipelines",
    lob: "Enterprise Security",
    amount: 9800000,
    paymentMode: "One time",
    capexOpex: "Capex",
  },
  {
    id: "aop-2027-009",
    project: "Cloud Security & FinOps Portal",
    costComponent: "Security Portal Ingest DB (MongoDB Atlas)",
    usecase: "Vulnerability finding deduplication, asset ownership mapping, and multi-snapshot trend tracking",
    lob: "Enterprise Security",
    amount: 7200000,
    paymentMode: "Monthly",
    capexOpex: "Opex",
  },
  {
    id: "aop-2027-010",
    project: "IPTV NextGen Infrastructure",
    costComponent: "Headend Video Encoding Appliances",
    usecase: "Broadcast linear television IP stream multiplexing, subtitling, and ad-insertion processors",
    lob: "DTH / Media",
    amount: 34000000,
    paymentMode: "One time",
    capexOpex: "Capex",
  },
  {
    id: "aop-2027-011",
    project: "IPTV NextGen Infrastructure",
    costComponent: "Origin Catch-up Rolling Buffer Storage",
    usecase: "7-day linear television rewind and catch-up TV rolling storage for digital set-top box playback",
    lob: "DTH / Media",
    amount: 16500000,
    paymentMode: "Monthly",
    capexOpex: "Opex",
  },
  {
    id: "aop-2027-012",
    project: "Big Data & Analytics Platform",
    costComponent: "BigQuery & Dataproc Analytics Compute",
    usecase: "Subscriber lifecycle event analytics, automated billing reconciliation, and churn prediction models",
    lob: "Digital Apps",
    amount: 31000000,
    paymentMode: "Monthly",
    capexOpex: "Opex",
  },
  {
    id: "aop-2027-013",
    project: "Big Data & Analytics Platform",
    costComponent: "Kafka Event Ingestion Fabric",
    usecase: "High-throughput streaming telemetry handling 250k+ subscriber interaction events per second",
    lob: "Digital Apps",
    amount: 18000000,
    paymentMode: "Monthly",
    capexOpex: "Opex",
  },
  {
    id: "aop-2027-014",
    project: "Enterprise API Gateway & Security",
    costComponent: "API Management Fabric & WAF Perimeter",
    usecase: "Subscriber authentication gateway, telecom carrier billing integrations, and DDoS mitigation",
    lob: "Core Platform",
    amount: 22000000,
    paymentMode: "One time",
    capexOpex: "Capex",
  },
];

const LOCAL_STORAGE_KEY = "xtelify_aop_2027_line_items";

// Format currency into Indian denomination (₹ Cr / ₹ L / ₹ K)
export const formatINR = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val) || val === 0) return "—";
  const absVal = Math.abs(val);
  if (absVal >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  }
  if (absVal >= 100000) {
    return `₹${(val / 100000).toFixed(2)} L`;
  }
  if (absVal >= 1000) {
    return `₹${(val / 1000).toFixed(1)} K`;
  }
  return `₹${val.toLocaleString("en-IN")}`;
};

// Full Indian currency representation with commas
export const formatINRFull = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return `₹${Math.round(val).toLocaleString("en-IN")}`;
};

const PROJECT_PALETTE: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  "Wynk Music Core": { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30", bar: "#F43F5E" },
  "Airtel Xstream Play": { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30", bar: "#0EA5E9" },
  "Cloud Security & FinOps Portal": { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", bar: "#10B981" },
  "IPTV NextGen Infrastructure": { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", bar: "#F59E0B" },
  "Big Data & Analytics Platform": { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30", bar: "#8B5CF6" },
  "Enterprise API Gateway & Security": { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30", bar: "#6366F1" },
};

const DEFAULT_PALETTE = { bg: "bg-slate-700/20", text: "text-slate-300", border: "border-slate-700/40", bar: "#38BDF8" };

export const AOPDashboardView: React.FC = () => {
  // Load data from localStorage or fallback to initial scoping
  const [items, setItems] = useState<AOPLineItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore parse errors
    }
    return INITIAL_AOP_2027_DATA;
  });

  // Persist changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage error ignore
    }
  }, [items]);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("All");
  const [selectedLOB, setSelectedLOB] = useState<string>("All");
  const [selectedCapexOpex, setSelectedCapexOpex] = useState<string>("All");

  // Chart view toggles
  const [leftChartMetric, setLeftChartMetric] = useState<"components" | "amount">("components");
  const [rightChartMetric, setRightChartMetric] = useState<"capexOpex" | "lob" | "payment">("capexOpex");

  // Inline edit & item modal states
  const [editingItem, setEditingItem] = useState<AOPLineItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);

  // Hidden file input ref for Excel upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss notification
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Derived unique lists for dropdown filters
  const uniqueProjects = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.project && it.project.trim()) set.add(it.project.trim());
    });
    return Array.from(set).sort();
  }, [items]);

  const uniqueLOBs = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.lob && it.lob.trim()) set.add(it.lob.trim());
    });
    return Array.from(set).sort();
  }, [items]);

  // Filtered dataset
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesProj = it.project.toLowerCase().includes(q);
        const matchesComp = it.costComponent.toLowerCase().includes(q);
        const matchesUse = it.usecase.toLowerCase().includes(q);
        const matchesLOB = (it.lob || "").toLowerCase().includes(q);
        if (!matchesProj && !matchesComp && !matchesUse && !matchesLOB) {
          return false;
        }
      }

      if (selectedProject !== "All" && it.project !== selectedProject) {
        return false;
      }

      if (selectedLOB !== "All") {
        if (selectedLOB === "Pending LOB") {
          if (it.lob && it.lob.trim()) return false;
        } else if (it.lob !== selectedLOB) {
          return false;
        }
      }

      if (selectedCapexOpex !== "All") {
        if (selectedCapexOpex === "Pending") {
          if (it.capexOpex && it.capexOpex.trim()) return false;
        } else if (it.capexOpex?.toLowerCase() !== selectedCapexOpex.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [items, searchQuery, selectedProject, selectedLOB, selectedCapexOpex]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Top 4 Executive KPI Calculations (with smart empty-state handling)
  // ─────────────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalLineItems = items.length;
    const scopedProjectsCount = uniqueProjects.length;
    const totalUseCases = items.filter((it) => it.usecase && it.usecase.trim().length > 0).length;

    // Check financial completeness across Columns D, E, F, G
    let filledFieldsCount = 0;
    const totalPossibleFields = totalLineItems * 4; // D (LOB), E (Amount), F (Payment Mode), G (Capex/Opex)

    let totalBudget = 0;
    let hasAnyBudget = false;

    let capexCount = 0;
    let opexCount = 0;
    let capexAmount = 0;
    let opexAmount = 0;

    let monthlyCount = 0;
    let oneTimeCount = 0;

    items.forEach((it) => {
      if (it.lob && it.lob.trim()) filledFieldsCount++;
      if (it.amount !== null && it.amount !== undefined && it.amount > 0) {
        filledFieldsCount++;
        totalBudget += it.amount;
        hasAnyBudget = true;
      }
      if (it.paymentMode && it.paymentMode.trim()) {
        filledFieldsCount++;
        const mode = it.paymentMode.toLowerCase();
        if (mode.includes("month")) monthlyCount++;
        else if (mode.includes("one") || mode.includes("time")) oneTimeCount++;
      }
      if (it.capexOpex && it.capexOpex.trim()) {
        filledFieldsCount++;
        const cls = it.capexOpex.toLowerCase();
        if (cls.includes("capex")) {
          capexCount++;
          capexAmount += it.amount || 0;
        } else if (cls.includes("opex")) {
          opexCount++;
          opexAmount += it.amount || 0;
        }
      }
    });

    const completenessPct = totalPossibleFields > 0 ? Math.round((filledFieldsCount / totalPossibleFields) * 100) : 0;
    const hasAnyFinancials = hasAnyBudget || capexCount > 0 || opexCount > 0 || monthlyCount > 0 || oneTimeCount > 0;

    return {
      totalLineItems,
      scopedProjectsCount,
      totalUseCases,
      completenessPct,
      filledFieldsCount,
      totalPossibleFields,
      totalBudget,
      hasAnyBudget,
      hasAnyFinancials,
      capexCount,
      opexCount,
      capexAmount,
      opexAmount,
      monthlyCount,
      oneTimeCount,
    };
  }, [items, uniqueProjects]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Left Chart Data: Project Breakdown (Components & Use Cases vs Budget)
  // ─────────────────────────────────────────────────────────────────────────────
  const projectChartData = useMemo(() => {
    const map: Record<
      string,
      { project: string; components: number; usecases: number; totalAmount: number; shortName: string }
    > = {};

    items.forEach((it) => {
      const proj = it.project.trim() || "Unassigned";
      if (!map[proj]) {
        map[proj] = {
          project: proj,
          components: 0,
          usecases: 0,
          totalAmount: 0,
          shortName: proj.length > 18 ? proj.slice(0, 16) + "…" : proj,
        };
      }
      map[proj].components += 1;
      if (it.usecase && it.usecase.trim()) {
        map[proj].usecases += 1;
      }
      if (it.amount && it.amount > 0) {
        map[proj].totalAmount += it.amount;
      }
    });

    return Object.values(map);
  }, [items]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Right Chart Data: Financial Structure (Capex/Opex, LOB, Payment Mode)
  // ─────────────────────────────────────────────────────────────────────────────
  const financialStructureData = useMemo(() => {
    if (rightChartMetric === "capexOpex") {
      const data = [
        { name: "Opex", value: kpis.opexAmount > 0 ? kpis.opexAmount : kpis.opexCount, count: kpis.opexCount, color: "#10B981" },
        { name: "Capex", value: kpis.capexAmount > 0 ? kpis.capexAmount : kpis.capexCount, count: kpis.capexCount, color: "#6366F1" },
      ].filter((d) => d.value > 0);
      return data;
    }

    if (rightChartMetric === "payment") {
      return [
        { name: "Monthly", value: kpis.monthlyCount, color: "#A855F7" },
        { name: "One time", value: kpis.oneTimeCount, color: "#3B82F6" },
      ].filter((d) => d.value > 0);
    }

    // LOB breakdown
    const lobMap: Record<string, { name: string; count: number; amount: number }> = {};
    items.forEach((it) => {
      const lob = it.lob && it.lob.trim() ? it.lob.trim() : "Pending LOB";
      if (!lobMap[lob]) lobMap[lob] = { name: lob, count: 0, amount: 0 };
      lobMap[lob].count += 1;
      lobMap[lob].amount += it.amount || 0;
    });

    const colors = ["#0EA5E9", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#64748B"];
    return Object.values(lobMap).map((l, idx) => ({
      name: l.name,
      value: l.amount > 0 ? l.amount : l.count,
      count: l.count,
      color: colors[idx % colors.length],
    }));
  }, [items, kpis, rightChartMetric]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Excel File Upload & Parser (Supports Image 1's exact 7 headers case-insensitively)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          setNotification({ message: "The uploaded spreadsheet contains no data rows.", type: "error" });
          return;
        }

        const parsedLineItems: AOPLineItem[] = [];

        rawJson.forEach((row, idx) => {
          // Resolve exact columns case-insensitively with flexible fallback aliases
          let project = "";
          let costComponent = "";
          let usecase = "";
          let lob = "";
          let amount: number | null = null;
          let paymentMode = "";
          let capexOpex = "";

          for (const key of Object.keys(row)) {
            const cleanKey = key.trim().toLowerCase();
            const val = String(row[key] ?? "").trim();

            if (/^project$|^project\s*name$/i.test(cleanKey)) {
              project = val;
            } else if (/^cost\s*component$|^component$/i.test(cleanKey)) {
              costComponent = val;
            } else if (/^usecase$|^use\s*case$|^description$/i.test(cleanKey)) {
              usecase = val;
            } else if (/^lob$|^line\s*of\s*business$/i.test(cleanKey)) {
              lob = val;
            } else if (/^amount$|^budget$|^cost$/i.test(cleanKey)) {
              const num = parseFloat(val.replace(/[₹,$\s]/g, ""));
              amount = isNaN(num) || num <= 0 ? null : num;
            } else if (/^payment\s*mode|^payment\s*mode\s*\(monthly\s*\/\s*one\s*time\)$/i.test(cleanKey)) {
              paymentMode = val;
            } else if (/^capex\/opex$|^capex\s*\/\s*opex$|^capex_opex$/i.test(cleanKey)) {
              capexOpex = val;
            }
          }

          // Fallback positional mapping if headers were exact column order A-G
          const rowValues = Object.values(row).map((v) => String(v ?? "").trim());
          if (!project && rowValues[0]) project = rowValues[0];
          if (!costComponent && rowValues[1]) costComponent = rowValues[1];
          if (!usecase && rowValues[2]) usecase = rowValues[2];
          if (!lob && rowValues[3]) lob = rowValues[3];
          if (amount === null && rowValues[4]) {
            const num = parseFloat(rowValues[4].replace(/[₹,$\s]/g, ""));
            if (!isNaN(num) && num > 0) amount = num;
          }
          if (!paymentMode && rowValues[5]) paymentMode = rowValues[5];
          if (!capexOpex && rowValues[6]) capexOpex = rowValues[6];

          if (project || costComponent || usecase) {
            parsedLineItems.push({
              id: `aop-upload-${Date.now()}-${idx}`,
              project: project || `Project ${idx + 1}`,
              costComponent: costComponent || `Component ${idx + 1}`,
              usecase: usecase || "Scoped operational requirement",
              lob,
              amount,
              paymentMode,
              capexOpex,
            });
          }
        });

        if (parsedLineItems.length > 0) {
          setItems(parsedLineItems);
          setNotification({
            message: `Successfully loaded ${parsedLineItems.length} AOP 2027 line items from "${file.name}".`,
            type: "success",
          });
        } else {
          setNotification({
            message: "Could not detect AOP columns. Expected: Project, Cost Component, Usecase, LOB, Amount, Payment mode, Capex/Opex.",
            type: "error",
          });
        }
      } catch (err: any) {
        setNotification({ message: `Failed to parse Excel file: ${err.message || "Unknown error"}`, type: "error" });
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Excel File Export (Creates exact 7-column schema matching Image 1)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    try {
      const exportRows = filteredItems.map((it) => ({
        Project: it.project,
        "Cost Component": it.costComponent,
        Usecase: it.usecase,
        LOB: it.lob || "",
        Amount: it.amount !== null && it.amount !== undefined ? it.amount : "",
        "Payment mode (Monthly / One time)": it.paymentMode || "",
        "Capex/Opex": it.capexOpex || "",
      }));

      const ws = XLSX.utils.json_to_sheet(exportRows);
      // Auto column widths
      ws["!cols"] = [
        { wch: 28 }, // Project
        { wch: 34 }, // Cost Component
        { wch: 60 }, // Usecase
        { wch: 20 }, // LOB
        { wch: 18 }, // Amount
        { wch: 32 }, // Payment mode (Monthly / One time)
        { wch: 16 }, // Capex/Opex
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "AOP 2027");
      XLSX.writeFile(wb, "AOP_2027_Annual_Operating_Plan.xlsx");

      setNotification({ message: `Exported ${filteredItems.length} AOP 2027 line items to Excel.`, type: "success" });
    } catch (err: any) {
      setNotification({ message: `Export failed: ${err.message}`, type: "error" });
    }
  };

  // Quick action: Toggle populated sample vs clean scoped initial
  const handleTogglePopulatedPreview = () => {
    if (kpis.hasAnyBudget) {
      setItems(INITIAL_AOP_2027_DATA);
      setNotification({ message: "Reset to initial company state: Columns A, B, C populated; D–G pending.", type: "info" });
    } else {
      setItems(SAMPLE_POPULATED_AOP_2027);
      setNotification({ message: "Loaded preview financial figures across Columns D, E, F, G.", type: "success" });
    }
  };

  // Inline edit saving
  const handleSaveItem = (itemToSave: AOPLineItem) => {
    setItems((prev) => {
      const exists = prev.some((it) => it.id === itemToSave.id);
      if (exists) {
        return prev.map((it) => (it.id === itemToSave.id ? itemToSave : it));
      }
      return [itemToSave, ...prev];
    });
    setIsModalOpen(false);
    setEditingItem(null);
    setNotification({ message: `Updated line item: "${itemToSave.costComponent}"`, type: "success" });
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setNotification({ message: "Line item removed.", type: "info" });
  };

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. HEADER & ACTION BAR
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-orange-300 to-amber-400 tracking-tight">
              AOP 2027 — Annual Operating Plan
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
              FY 2026 - 2027
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
            Project cost components, use case scoping, Capex/Opex classification, and LOB budget allocation.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-500/40 shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            title="Upload company AOP 2027 Excel with 7 columns"
          >
            <Upload size={14} />
            <span>Upload AOP Excel</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.12] flex items-center gap-2 transition-all cursor-pointer active:scale-95 hover:border-white/[0.25]"
            title="Export full 7-column spreadsheet matching company schema"
          >
            <Download size={14} />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => {
              setEditingItem({
                id: `aop-manual-${Date.now()}`,
                project: uniqueProjects[0] || "Wynk Music Core",
                costComponent: "",
                usecase: "",
                lob: "",
                amount: null,
                paymentMode: "",
                capexOpex: "",
              });
              setIsModalOpen(true);
            }}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600/80 hover:bg-violet-600 border border-violet-500/40 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md shadow-violet-950/40"
          >
            <Plus size={14} />
            <span>Add Item</span>
          </button>

          <button
            onClick={handleTogglePopulatedPreview}
            className="px-3 py-2 rounded-xl text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Toggle between Empty Financials (current company state) and Populated Financials (future state)"
          >
            <Sparkles size={13} className="text-amber-400" />
            <span>{kpis.hasAnyBudget ? "Reset to Empty D–G" : "Preview Populated D–G"}</span>
          </button>
        </div>
      </div>

      {/* Floating Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium backdrop-blur-xl shadow-xl ${
              notification.type === "success"
                ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
                : notification.type === "error"
                ? "bg-rose-950/80 border-rose-500/50 text-rose-300"
                : "bg-blue-950/80 border-blue-500/50 text-blue-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle size={15} />
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. TOP 4 EXECUTIVE KPI CARDS (Smart Empty-State Handling)
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Scoped Projects & Use Cases */}
        <div className="rounded-2xl p-5 border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl relative overflow-hidden flex flex-col justify-between group hover:border-white/[0.18] transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]">
          <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/15 transition-all" />
          <div className="flex items-center justify-between text-blue-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Scoped Projects & Use Cases</span>
            <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/20 text-blue-400">
              <Layers size={18} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight">{kpis.scopedProjectsCount}</span>
              <span className="text-xs font-semibold text-blue-400">Core Projects</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                {kpis.totalUseCases} Use Cases
              </span>
              <span className="text-[11px] text-slate-400">Cols A & C Mapped</span>
            </div>
          </div>
        </div>

        {/* Card 2: Cost Components Mapped & Completeness Badge */}
        <div className="rounded-2xl p-5 border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl relative overflow-hidden flex flex-col justify-between group hover:border-white/[0.18] transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]">
          <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/15 transition-all" />
          <div className="flex items-center justify-between text-purple-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cost Components Mapped</span>
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/20 text-purple-400">
              <FileSpreadsheet size={18} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight">{kpis.totalLineItems}</span>
              <span className="text-xs font-semibold text-purple-300">Line Items</span>
            </div>
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-400">Data Completeness (Cols D–G)</span>
                <span className={`font-bold ${kpis.completenessPct > 50 ? "text-emerald-400" : "text-amber-400"}`}>
                  {kpis.completenessPct}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden ring-1 ring-white/[0.05]">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    kpis.completenessPct > 50
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                      : "bg-gradient-to-r from-amber-500 to-orange-400"
                  }`}
                  style={{ width: `${Math.max(4, kpis.completenessPct)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Total AOP 2027 Budget (Smart Empty State) */}
        <div className="rounded-2xl p-5 border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl relative overflow-hidden flex flex-col justify-between group hover:border-white/[0.18] transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]">
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/15 transition-all" />
          <div className="flex items-center justify-between text-amber-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total AOP 2027 Budget</span>
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-400">
              <Wallet size={18} />
            </div>
          </div>
          <div>
            {kpis.hasAnyBudget ? (
              <>
                <div className="text-3xl font-black text-amber-300 tracking-tight">
                  {formatINR(kpis.totalBudget)}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-mono">
                  {formatINRFull(kpis.totalBudget)} across active line items
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
                    Pending Allocation
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-300/80 font-medium">
                  <Clock size={13} className="shrink-0 text-amber-400 animate-pulse" />
                  <span>Scoping complete — awaiting finance inputs</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Card 4: Capex / Opex & Payment Split (Smart Empty State) */}
        <div className="rounded-2xl p-5 border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl relative overflow-hidden flex flex-col justify-between group hover:border-white/[0.18] transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/15 transition-all" />
          <div className="flex items-center justify-between text-emerald-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Capex / Opex & Terms Split</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400">
              <PieChart size={18} />
            </div>
          </div>
          <div>
            {kpis.capexCount > 0 || kpis.opexCount > 0 ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Opex: {kpis.opexCount} ({formatINR(kpis.opexAmount)})
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-black bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    Capex: {kpis.capexCount} ({formatINR(kpis.capexAmount)})
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  {kpis.monthlyCount} Monthly • {kpis.oneTimeCount} One-time line items
                </p>
              </>
            ) : (
              <>
                <div className="text-xl font-bold text-slate-300">
                  Unclassified
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
                  <Tag size={13} className="shrink-0 text-slate-500" />
                  <span>Pending Col F & G (Payment Mode & Capex/Opex)</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. DUAL ANALYTICS CHARTS SECTION
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Chart: Project Breakdown (Components/Use Cases vs Budget Allocation) */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] rounded-2xl p-5 hover:border-white/[0.14] transition-all duration-300 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-400" />
                Project Scoping & Resource Breakdown
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {leftChartMetric === "components"
                  ? "Number of Cost Components & Use Cases mapped per Project (Cols A–C)"
                  : "Total AOP 2027 Budget Allocation in INR per Project (Col E)"}
              </p>
            </div>

            {/* Toggle metric */}
            <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-800 text-xs self-start">
              <button
                onClick={() => setLeftChartMetric("components")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  leftChartMetric === "components"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Components & Use Cases
              </button>
              <button
                onClick={() => setLeftChartMetric("amount")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                  leftChartMetric === "amount"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>Budget (₹)</span>
                {!kpis.hasAnyBudget && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          <div className="h-[270px] w-full">
            {leftChartMetric === "components" ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectChartData} barCategoryGap="25%" barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                  <XAxis
                    dataKey="shortName"
                    stroke="#64748b"
                    fontSize={11}
                    tick={{ fill: "#94a3b8" }}
                  />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#0b0f19",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    }}
                    formatter={(val: any, name: string) => [`${val} items`, name]}
                    labelFormatter={(label) => {
                      const full = projectChartData.find((d) => d.shortName === label)?.project || label;
                      return `Project: ${full}`;
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                    formatter={(value) => <span className="text-slate-300 font-medium">{value}</span>}
                  />
                  <Bar
                    dataKey="components"
                    name="Cost Components"
                    fill="#6366F1"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1200}
                  />
                  <Bar
                    dataKey="usecases"
                    name="Use Cases"
                    fill="#06B6D4"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1200}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : kpis.hasAnyBudget ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectChartData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                  <XAxis dataKey="shortName" stroke="#64748b" fontSize={11} tick={{ fill: "#94a3b8" }} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickFormatter={(v) => (v >= 10000000 ? `${(v / 10000000).toFixed(1)} Cr` : `${(v / 100000).toFixed(0)} L`)}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#0b0f19",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    }}
                    formatter={(val: any) => [formatINRFull(val), "Allocated Budget"]}
                    labelFormatter={(label) => {
                      const full = projectChartData.find((d) => d.shortName === label)?.project || label;
                      return `Project: ${full}`;
                    }}
                  />
                  <Bar dataKey="totalAmount" name="Budget (Amount)" radius={[6, 6, 0, 0]} animationDuration={1200}>
                    {projectChartData.map((entry, idx) => {
                      const pal = PROJECT_PALETTE[entry.project] || DEFAULT_PALETTE;
                      return <Cell key={`cell-${idx}`} fill={pal.bar} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                  <Wallet size={22} />
                </div>
                <h4 className="text-sm font-bold text-slate-200">Financial Amounts Awaiting Input</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Column E (`Amount`) is currently empty across scoped items. Click any table cell below to fill figures or upload an updated Excel sheet to view project budget distribution.
                </p>
                <button
                  onClick={() => setLeftChartMetric("components")}
                  className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer"
                >
                  Return to Components & Use Cases View
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Chart: Financial Structure OR AOP 2027 Scoping Readiness Card (Smart State) */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] rounded-2xl p-5 hover:border-white/[0.14] transition-all duration-300 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PieChart size={16} className="text-emerald-400" />
                {kpis.hasAnyFinancials ? "Financial Structure & Classification" : "AOP 2027 Scoping Readiness Status"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {kpis.hasAnyFinancials
                  ? "Distribution across Capex/Opex, LOB allocation, and Payment Mode"
                  : "Audit status of the 7 company schema columns (Columns A–G)"}
              </p>
            </div>

            {kpis.hasAnyFinancials && (
              <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-800 text-xs self-start">
                <button
                  onClick={() => setRightChartMetric("capexOpex")}
                  className={`px-2 py-1 rounded-md font-semibold transition-all ${
                    rightChartMetric === "capexOpex" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Capex/Opex
                </button>
                <button
                  onClick={() => setRightChartMetric("lob")}
                  className={`px-2 py-1 rounded-md font-semibold transition-all ${
                    rightChartMetric === "lob" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  LOB
                </button>
                <button
                  onClick={() => setRightChartMetric("payment")}
                  className={`px-2 py-1 rounded-md font-semibold transition-all ${
                    rightChartMetric === "payment" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Payment
                </button>
              </div>
            )}
          </div>

          <div className="h-[270px] w-full flex items-center justify-center">
            {kpis.hasAnyFinancials && financialStructureData.length > 0 ? (
              <div className="w-full h-full flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="w-full sm:w-3/5 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#0b0f19",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "12px",
                        }}
                        formatter={(val: any, name: string) => [
                          typeof val === "number" && val > 1000 ? formatINR(val) : `${val} items`,
                          name,
                        ]}
                      />
                      <Pie
                        data={financialStructureData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        stroke="#07090E"
                        strokeWidth={2}
                      >
                        {financialStructureData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>

                <div className="w-full sm:w-2/5 flex flex-col gap-2.5 pr-2">
                  {financialStructureData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-slate-200">{item.name}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-300">
                        {item.value > 1000 ? formatINR(item.value) : `${item.value} items`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Sleek Empty-State Card: AOP 2027 Scoping Readiness (Image 1 Context) */
              <div className="w-full h-full p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Cols A, B, C</span>
                      <p className="font-semibold text-slate-200 text-xs mt-0.5">Scoping & Architecture</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      100% Ready
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Cols D, E, F, G</span>
                      <p className="font-semibold text-slate-200 text-xs mt-0.5">Financial & Terms</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Awaiting Input
                    </span>
                  </div>
                </div>

                {/* Checklist of 7 Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 my-2 text-[11px]">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle size={13} className="shrink-0" />
                    <span className="text-slate-300">Col A: Project Scope (100%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-400">
                    <Clock size={13} className="shrink-0 text-amber-400" />
                    <span className="text-slate-400">Col D: LOB (Awaiting BU Tag)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle size={13} className="shrink-0" />
                    <span className="text-slate-300">Col B: Cost Components (100%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-400">
                    <Clock size={13} className="shrink-0 text-amber-400" />
                    <span className="text-slate-400">Col E: Amount (Awaiting Finance)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle size={13} className="shrink-0" />
                    <span className="text-slate-300">Col C: Use Cases (100%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-400">
                    <Clock size={13} className="shrink-0 text-amber-400" />
                    <span className="text-slate-400">Cols F & G: Mode & Capex/Opex</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-[11px] text-slate-400 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <HelpCircle size={14} className="text-amber-400 shrink-0" />
                    <span>Upload updated Excel or click any row below to edit financial figures inline.</span>
                  </div>
                  <button
                    onClick={handleTogglePopulatedPreview}
                    className="text-amber-400 hover:text-amber-300 font-bold shrink-0 underline text-[10px]"
                  >
                    Demo Figures
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. FILTER & SEARCH BAR
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Project, Cost Component, Usecase, or LOB..."
            className="w-full bg-[#07090E]/80 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/70 focus:ring-1 focus:ring-amber-400/40 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Project Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-[#07090E]/80 px-2.5 py-1.5 rounded-xl border border-slate-700/80">
            <span className="text-slate-500 font-medium">Project:</span>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900 text-slate-200">All Projects</option>
              {uniqueProjects.map((p) => (
                <option key={p} value={p} className="bg-slate-900 text-slate-200">
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* LOB Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-[#07090E]/80 px-2.5 py-1.5 rounded-xl border border-slate-700/80">
            <span className="text-slate-500 font-medium">LOB:</span>
            <select
              value={selectedLOB}
              onChange={(e) => setSelectedLOB(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900 text-slate-200">All LOBs</option>
              <option value="Pending LOB" className="bg-slate-900 text-amber-300">Pending LOB</option>
              {uniqueLOBs.map((l) => (
                <option key={l} value={l} className="bg-slate-900 text-slate-200">
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* Capex/Opex Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-[#07090E]/80 px-2.5 py-1.5 rounded-xl border border-slate-700/80">
            <span className="text-slate-500 font-medium">Capex/Opex:</span>
            <select
              value={selectedCapexOpex}
              onChange={(e) => setSelectedCapexOpex(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900 text-slate-200">All Classes</option>
              <option value="Opex" className="bg-slate-900 text-emerald-300">Opex</option>
              <option value="Capex" className="bg-slate-900 text-indigo-300">Capex</option>
              <option value="Pending" className="bg-slate-900 text-amber-300">Pending</option>
            </select>
          </div>

          {(searchQuery || selectedProject !== "All" || selectedLOB !== "All" || selectedCapexOpex !== "All") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedProject("All");
                setSelectedLOB("All");
                setSelectedCapexOpex("All");
              }}
              className="text-xs text-slate-400 hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          5. AOP 2027 MASTER DATA TABLE (Exact 7 Columns from Image 1)
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] rounded-2xl overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]">
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-amber-400" />
              AOP 2027 Line Items
            </h3>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/[0.06] text-slate-300 border border-white/[0.10]">
              Showing {filteredItems.length} of {items.length} Rows
            </span>
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:block">
            Click on any row or <span className="text-amber-400 font-semibold">Edit</span> to update LOB, Amount, Payment Mode, or Capex/Opex inline.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 font-bold text-slate-300">Project</th>
                <th className="py-3.5 px-4 font-bold text-slate-300">Cost Component</th>
                <th className="py-3.5 px-4 font-bold text-slate-300 min-w-[260px]">Usecase</th>
                <th className="py-3.5 px-4 font-bold text-slate-300">LOB</th>
                <th className="py-3.5 px-4 font-bold text-slate-300 text-right">Amount</th>
                <th className="py-3.5 px-4 font-bold text-slate-300">Payment mode (Monthly / One time)</th>
                <th className="py-3.5 px-4 font-bold text-slate-300">Capex/Opex</th>
                <th className="py-3.5 px-4 font-bold text-slate-300 text-center w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredItems.map((row) => {
                const palette = PROJECT_PALETTE[row.project] || DEFAULT_PALETTE;
                return (
                  <tr
                    key={row.id}
                    className="hover:bg-white/[0.04] transition-colors group cursor-pointer"
                    onClick={() => {
                      setEditingItem({ ...row });
                      setIsModalOpen(true);
                    }}
                  >
                    {/* Column A: Project (Bold white text with project badge) */}
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${palette.bar.replace("#", "bg-[#") + "]"}`} style={{ backgroundColor: palette.bar }} />
                        <span className="truncate max-w-[170px]" title={row.project}>
                          {row.project}
                        </span>
                      </div>
                    </td>

                    {/* Column B: Cost Component (Cyan/blue subtle pill) */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-medium bg-cyan-950/40 text-cyan-300 border border-cyan-800/40 max-w-[200px] truncate" title={row.costComponent}>
                        {row.costComponent}
                      </span>
                    </td>

                    {/* Column C: Usecase (Readable wrapped text) */}
                    <td className="py-3.5 px-4 text-slate-300 text-xs leading-relaxed max-w-sm">
                      <span className="line-clamp-2" title={row.usecase}>
                        {row.usecase}
                      </span>
                    </td>

                    {/* Column D: LOB (Badge if present, subtle dashed if empty) */}
                    <td className="py-3.5 px-4">
                      {row.lob && row.lob.trim() ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          <Building2 size={11} />
                          {row.lob}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border border-dashed border-amber-500/40 text-amber-400/80 bg-amber-500/5 group-hover:border-amber-400 transition-colors">
                          <Clock size={10} />
                          Pending LOB
                        </span>
                      )}
                    </td>

                    {/* Column E: Amount (Right-aligned monospace INR or awaiting cost in muted amber) */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      {row.amount !== null && row.amount !== undefined && row.amount > 0 ? (
                        <span className="text-emerald-400 text-xs sm:text-sm">
                          {formatINRFull(row.amount)}
                        </span>
                      ) : (
                        <span className="text-amber-400/70 text-xs italic font-normal">
                          — Awaiting Cost
                        </span>
                      )}
                    </td>

                    {/* Column F: Payment mode (Monthly / One time) */}
                    <td className="py-3.5 px-4">
                      {row.paymentMode && row.paymentMode.trim() ? (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                            row.paymentMode.toLowerCase().includes("month")
                              ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                              : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                          }`}
                        >
                          {row.paymentMode}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono border border-dashed border-slate-700 text-slate-500">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Column G: Capex/Opex */}
                    <td className="py-3.5 px-4">
                      {row.capexOpex && row.capexOpex.trim() ? (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            row.capexOpex.toLowerCase().includes("opex")
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                          }`}
                        >
                          {row.capexOpex}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono border border-dashed border-slate-700 text-slate-500">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingItem({ ...row });
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                          title="Edit Financials & Details"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(row.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Delete Line Item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-3 text-slate-500">
                      <Search size={20} />
                    </div>
                    <p className="font-semibold text-slate-300">No matching line items found</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search keywords.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          6. INLINE / ROW EDIT & ADD MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0B0F19] border border-slate-700/80 rounded-2xl p-6 w-full max-w-xl shadow-2xl shadow-black/80 flex flex-col gap-5 text-slate-100 relative"
            >
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Edit3 size={16} className="text-amber-400" />
                    Edit AOP 2027 Line Item
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Update technical scoping (Cols A–C) or enter financial figures (Cols D–G)
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Project (Col A) */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Column A: Project <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingItem.project}
                    onChange={(e) => setEditingItem({ ...editingItem, project: e.target.value })}
                    placeholder="e.g. Wynk Music Core"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400/70"
                  />
                </div>

                {/* Cost Component (Col B) */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Column B: Cost Component <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingItem.costComponent}
                    onChange={(e) => setEditingItem({ ...editingItem, costComponent: e.target.value })}
                    placeholder="e.g. Cloud Compute (GCP GKE Production)"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400/70"
                  />
                </div>

                {/* Usecase (Col C) */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Column C: Usecase <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={editingItem.usecase}
                    onChange={(e) => setEditingItem({ ...editingItem, usecase: e.target.value })}
                    placeholder="Describe operational use case and requirements..."
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400/70 text-xs"
                  />
                </div>

                {/* LOB (Col D) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Column D: LOB (Line of Business)
                  </label>
                  <input
                    type="text"
                    value={editingItem.lob}
                    onChange={(e) => setEditingItem({ ...editingItem, lob: e.target.value })}
                    placeholder="e.g. Wynk Music, DTH, Digital"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400/70"
                  />
                </div>

                {/* Amount (Col E) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Column E: Amount (₹ INR)
                  </label>
                  <input
                    type="number"
                    value={editingItem.amount ?? ""}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setEditingItem({ ...editingItem, amount: val ? parseFloat(val) : null });
                    }}
                    placeholder="e.g. 38000000"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400/70"
                  />
                  {editingItem.amount && editingItem.amount > 0 ? (
                    <span className="text-[10px] text-emerald-400 mt-1 block font-mono">
                      Formatted: {formatINR(editingItem.amount)} ({formatINRFull(editingItem.amount)})
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400/70 mt-1 block">Leave blank if pending finance inputs</span>
                  )}
                </div>

                {/* Payment mode (Col F) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Column F: Payment mode
                  </label>
                  <select
                    value={editingItem.paymentMode || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, paymentMode: e.target.value })}
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400/70"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">— Pending Payment Mode —</option>
                    <option value="Monthly" className="bg-slate-900 text-purple-300">Monthly</option>
                    <option value="One time" className="bg-slate-900 text-blue-300">One time</option>
                  </select>
                </div>

                {/* Capex/Opex (Col G) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Column G: Capex/Opex
                  </label>
                  <select
                    value={editingItem.capexOpex || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, capexOpex: e.target.value })}
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400/70"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">— Pending Classification —</option>
                    <option value="Opex" className="bg-slate-900 text-emerald-300">Opex (Operational Expense)</option>
                    <option value="Capex" className="bg-slate-900 text-indigo-300">Capex (Capital Expense)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveItem(editingItem)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-orange-950/40 transition-all cursor-pointer"
                >
                  Save Line Item
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
