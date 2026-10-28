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
  ChevronUp,
  Building2,
  Sparkles,
  HelpCircle,
  Tag,
  CreditCard,
  Briefcase,
  SlidersHorizontal,
  Tv,
  Zap,
  AlertTriangle,
  Columns,
  Radio,
  Home,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  CalendarRange,
  Copy,
  DollarSign,
  ArrowUpRight,
  Check,
  Eye,
  Server,
  Share2,
  Database,
  Shield,
  Cloud,
  Cpu,
  Globe,
  HardDrive,
  Terminal,
  RotateCcw,
  Camera,
  Sliders,
  Calculator,
  Bookmark,
  FileText,
  CheckCheck,
  Percent,
  EyeOff,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
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
import { useFinOpsCurrency } from "./FinOpsCurrencyContext";
import {
  type LOBType as AOPLOBSubtype,
  type AOPDisplayCurrency,
  type AOPLeadershipSummary,
  type AOPCategoryGroup,
  type AOPSubComponent,
  type MonthlyDataPoint,
  type CustomColumnDef,
  type CustomKPICardDef,
  type TrashItem,
  type AOPSnapshot,
  DEFAULT_LEADERSHIP_SUMMARIES,
  DEFAULT_AOP_CATEGORIES,
  ALL_MONTH_KEYS,
  MONTHS_12_KEYS,
  createMonthlySpread,
  formatAOPCurrency,
  formatAOPCostPerUser,
  getAggregatedLeadershipSummary,
  getFilteredCategoryGroups,
  getXstreamSubstream,
  getIPTVSubstream,
  getQuarterlyPacingData,
  getMonthlyTimelineData,
  parseAOPMultiSheetWorkbook,
} from "./aopMultiSheetData";
import {
  getFiscalYears,
  addFiscalYear,
  getFinOpsDataForFY,
  saveFinOpsDataForFY,
  cloneFinOpsDataFromPreviousYear,
  hasDataForSection,
  get12MonthKeysForFY,
  sanitizeAOPCategories,
  sanitizeLeadershipSummaries,
  normalizeFYKey,
  persistAOPHierarchyToBackend,
  fetchAOPHierarchyFromBackend,
  saveAOPSnapshotToBackend,
  fetchAOPSnapshotsFromBackend,
  deleteAOPSnapshotFromBackend,
  type FiscalYearOption,
} from "./finopsMultiYearStorage";
import { FinOpsEmptyStateCard } from "./FinOpsEmptyStateCard";
import {
  getCustomCatalog,
  fetchCustomCatalogFromBackend,
  getPresetsForLOB,
  getCategoryCodesForLOB,
  addCustomCatalogSubtype,
  deleteCustomCatalogSubtype,
  addCustomCategoryCode,
  deleteCustomCategoryCode,
  addCustomCatalogLOB,
  deleteCustomCatalogLOB,
  type FinOpsCustomCatalog,
  type PresetSubtype,
  type CustomCatalogCategoryCode,
} from "./finopsCustomCatalogStorage";

export type { AOPLOBSubtype };

// AOP Line Item schema with Allocated Amount (Col E), Total Spent (between E and F), Subtype (IPTV vs XSTREAM), and Dynamic Custom Columns
export interface AOPLineItem {
  id: string;
  project: string; // Column A: Project
  costComponent: string; // Column B: Cost Component
  usecase: string; // Column C: Usecase
  lob: string; // Column D: LOB (Line of Business)
  amount: number | null; // Column E: Allocated Amount (renamed from Amount)
  totalSpent?: number | null; // NEW: Total Spent (between Column E and Column F)
  paymentMode: string; // Column F: Payment mode (Monthly / One time)
  capexOpex: string; // Column G: Capex/Opex
  subtype?: "IPTV" | "XSTREAM" | "DTH" | "HT"; // Subtype classification: IPTV or XSTREAM (XSTRM), DTH, HT
  customFields?: Record<string, string | number>; // Dynamic user-defined additional columns
}

// Helper to safely extract or infer line item subtype
const getItemSubtype = (item: Partial<AOPLineItem>): "IPTV" | "XSTREAM" | "DTH" | "HT" => {
  if (item.subtype === "IPTV" || item.subtype === "XSTREAM" || item.subtype === "DTH" || item.subtype === "HT") {
    return item.subtype;
  }
  const combined = `${item.project || ""} ${item.lob || ""} ${item.costComponent || ""} ${item.usecase || ""}`.toLowerCase();
  if (combined.includes("iptv")) return "IPTV";
  if (combined.includes("dth")) return "DTH";
  if (/\bht\b|home terminal|broadband/i.test(combined)) return "HT";
  return "XSTREAM";
};

export interface CategoryCodeOption {
  code: string;
  label: string;
  icon: string;
  isCustom?: boolean;
}

const DEFAULT_CATEGORY_CODES: CategoryCodeOption[] = [
  { code: "CDN", label: "CDN Bandwidth", icon: "Radio" },
  { code: "VIDEO_PLATFORM", label: "Video Platform", icon: "Tv" },
  { code: "SAAS", label: "SaaS & Tools", icon: "Sparkles" },
  { code: "MANPOWER", label: "Manpower & TnM", icon: "Users" },
  { code: "CROSS_CHARGE", label: "Cross-Charge Infra", icon: "Building2" },
  { code: "OTHER", label: "Other Systems", icon: "Server" },
];

const SELECTABLE_CATEGORY_ICONS = [
  { name: "Server", label: "Server / Systems", icon: Server },
  { name: "Database", label: "Database / Storage", icon: Database },
  { name: "Cloud", label: "Cloud Infra", icon: Cloud },
  { name: "Shield", label: "Security & Compliance", icon: Shield },
  { name: "Cpu", label: "Compute & AI", icon: Cpu },
  { name: "Radio", label: "CDN / Edge", icon: Radio },
  { name: "Tv", label: "Video / Media", icon: Tv },
  { name: "Globe", label: "Network / Transit", icon: Globe },
  { name: "Sparkles", label: "SaaS & Tools", icon: Sparkles },
  { name: "Users", label: "Manpower & Teams", icon: Users },
  { name: "Building2", label: "Corporate / Cross-Charge", icon: Building2 },
  { name: "Zap", label: "Performance", icon: Zap },
  { name: "HardDrive", label: "Hardware & Disk", icon: HardDrive },
  { name: "Terminal", label: "DevOps & Tooling", icon: Terminal },
  { name: "Layers", label: "Platform / Layers", icon: Layers },
  { name: "Tag", label: "Custom Tag", icon: Tag },
];

const getCategoryIconComponent = (code: string, iconName?: string) => {
  const norm = (iconName || "").toLowerCase();
  if (norm === "database") return Database;
  if (norm === "shield") return Shield;
  if (norm === "cloud") return Cloud;
  if (norm === "cpu") return Cpu;
  if (norm === "globe") return Globe;
  if (norm === "harddrive") return HardDrive;
  if (norm === "terminal") return Terminal;
  if (norm === "radio") return Radio;
  if (norm === "tv") return Tv;
  if (norm === "sparkles") return Sparkles;
  if (norm === "users") return Users;
  if (norm === "building2") return Building2;
  if (norm === "zap") return Zap;
  if (norm === "layers") return Layers;
  if (norm === "tag") return Tag;
  if (norm === "server") return Server;

  // Fallback by code heuristic
  const c = (code || "").toUpperCase();
  if (c === "CDN" || c.includes("CDN")) return Radio;
  if (c === "VIDEO_PLATFORM" || c.includes("VIDEO")) return Tv;
  if (c === "SAAS" || c.includes("SAAS") || c.includes("TOOL")) return Sparkles;
  if (c === "MANPOWER" || c.includes("MANPOWER") || c.includes("TNM")) return Users;
  if (c === "CROSS_CHARGE" || c.includes("CROSS")) return Building2;
  if (c.includes("DATA") || c.includes("DB")) return Database;
  if (c.includes("SEC") || c.includes("COMPLIANCE")) return Shield;
  if (c.includes("CLOUD")) return Cloud;
  if (c.includes("COMPUTE") || c.includes("AI")) return Cpu;
  if (c.includes("NET") || c.includes("TRANSIT")) return Globe;
  return Server;
};

const getCategoryColorClasses = (code: string) => {
  const upper = (code || "").toUpperCase();
  if (upper === "CDN") return "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
  if (upper === "VIDEO_PLATFORM") return "bg-cyan-500/15 border-cyan-500/30 text-cyan-400";
  if (upper === "SAAS") return "bg-purple-500/15 border-purple-500/30 text-purple-400";
  if (upper === "MANPOWER") return "bg-indigo-500/15 border-indigo-500/30 text-indigo-400";
  if (upper === "CROSS_CHARGE") return "bg-amber-500/15 border-amber-500/30 text-amber-400";
  if (upper.includes("SEC")) return "bg-rose-500/15 border-rose-500/30 text-rose-400";
  if (upper.includes("DATA") || upper.includes("DB")) return "bg-teal-500/15 border-teal-500/30 text-teal-400";
  if (upper.includes("CLOUD")) return "bg-sky-500/15 border-sky-500/30 text-sky-400";
  if (upper.includes("AI") || upper.includes("COMPUTE")) return "bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-400";
  return "bg-blue-500/15 border-blue-500/30 text-blue-400";
};

export interface AOPDashboardViewProps {
  initialSubtype?: string;
  onSubtypeChange?: (subtype: string) => void;
}

// Initial company scoping data: empty until user ingests or inputs data
const INITIAL_AOP_2027_DATA: AOPLineItem[] = [];

const sanitizeAOPItems = (list: any[]): AOPLineItem[] => {
  if (!Array.isArray(list)) return [];
  return list.filter((item) => {
    if (!item) return false;
    if (typeof item.id === "string" && item.id.startsWith("aop-2027-")) return false;
    return true;
  });
};

const LOCAL_STORAGE_KEY = "xtelify_aop_2027_line_items";

// ─────────────────────────────────────────────────────────────────────────────
// RECHARTS CUSTOM TOOLTIP FOR COMPOSEDCHART (Executive-ready formatting)
// ─────────────────────────────────────────────────────────────────────────────
const CustomAOPTooltip = ({ active, payload, label, displayCurrency }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-[#0B0F19]/95 backdrop-blur-xl border border-white/20 p-4 rounded-xl shadow-2xl text-xs space-y-2 min-w-[220px]">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <span className="font-bold text-white text-sm">{data.displayPeriod || data.month || label}</span>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            data.isElapsed || data.isActual
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
          }`}
        >
          {data.isElapsed || data.isActual ? "Actual Spend" : "Projected"}
        </span>
      </div>
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            Budget:
          </span>
          <span className="font-mono font-bold text-white">
            {formatAOPCurrency(data.budget, displayCurrency)}
          </span>
        </div>
        {(data.actual > 0 || data.isElapsed || data.isActual) && (
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Actual Spend:
            </span>
            <span className="font-mono font-bold text-emerald-400">
              {formatAOPCurrency(data.actual, displayCurrency)}
            </span>
          </div>
        )}
        {(data.projected > 0 || (!data.isElapsed && !data.isActual)) && (
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              Projected Spend:
            </span>
            <span className="font-mono font-bold text-cyan-300">
              {formatAOPCurrency(data.projected, displayCurrency)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            Pacing Target:
          </span>
          <span className="font-mono font-bold text-amber-300">
            {formatAOPCurrency(data.pacing, displayCurrency)}
          </span>
        </div>
        {data.variance !== undefined && (
          <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[11px]">
            <span className="text-slate-400">Variance:</span>
            <span className={`font-mono font-bold ${data.variance > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {data.variance > 0
                ? `+${formatAOPCurrency(data.variance, displayCurrency)} Overrun`
                : `${formatAOPCurrency(Math.abs(data.variance), displayCurrency)} Under`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const AOPDashboardView: React.FC<AOPDashboardViewProps> = ({
  initialSubtype = "ALL",
  onSubtypeChange,
}) => {
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. STATE MANAGEMENT & CONTEXT
  // ─────────────────────────────────────────────────────────────────────────────
  const { currency, parseWorkbookFile, datasets, setIsDatasetManagerOpen, dateFilter } = useFinOpsCurrency();
  const activeFY = normalizeFYKey(dateFilter?.fiscalYear || "FY 2026-27");
  const m12Keys = useMemo(() => get12MonthKeysForFY(activeFY), [activeFY]);

  const DEFAULT_LOBS = [
    { id: "ALL", label: "All LOBs", isCustom: false },
    { id: "IPTV", label: "IPTV", isCustom: false },
    { id: "XSTREAM", label: "Xstream (incl. DTH & HT)", isCustom: false },
  ];

  const [lobs, setLobs] = useState<{ id: string; label: string; isCustom?: boolean }[]>(() => {
    try {
      const saved = localStorage.getItem("xtelify_aop_custom_lobs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Clean up legacy built-in DTH and HT buttons since they are now consolidated under Xstream
          const cleaned = parsed.filter((l) => !(l.id === "DTH" || l.id === "HT") || l.isCustom);
          if (!cleaned.some((l) => l.id === "XSTREAM")) {
            cleaned.splice(2, 0, { id: "XSTREAM", label: "Xstream (incl. DTH & HT)", isCustom: false });
          } else {
            cleaned.forEach((l) => {
              if (l.id === "XSTREAM" && !l.label.includes("DTH")) {
                l.label = "Xstream (incl. DTH & HT)";
              }
            });
          }
          return cleaned;
        }
      }
    } catch {}
    return DEFAULT_LOBS;
  });

  useEffect(() => {
    try {
      localStorage.setItem("xtelify_aop_custom_lobs", JSON.stringify(lobs));
    } catch {}
  }, [lobs]);

  // Sub-pillar filter within Xstream (All, Core Xstream / Wynk, DTH, HT, Sub-Projects)
  const [xstreamSubfilter, setXstreamSubfilter] = useState<string>("ALL");
  // Sub-pillar filter within IPTV (All, Core STB, App, VP, API)
  const [iptvSubfilter, setIptvSubfilter] = useState<string>("ALL");

  const [activeLOB, setActiveLOB] = useState<string>(() => {
    return initialSubtype || "ALL";
  });

  const [customCatalog, setCustomCatalog] = useState<FinOpsCustomCatalog>(getCustomCatalog);

  useEffect(() => {
    fetchCustomCatalogFromBackend().then((cat) => {
      setCustomCatalog(cat);
    });
    const handleCatUpdate = (e: any) => {
      if (e.detail) {
        setCustomCatalog(e.detail);
      } else {
        setCustomCatalog(getCustomCatalog());
      }
    };
    window.addEventListener("finops:custom-catalog-updated", handleCatUpdate);
    return () => window.removeEventListener("finops:custom-catalog-updated", handleCatUpdate);
  }, []);

  useEffect(() => {
    if (customCatalog.lobs && customCatalog.lobs.length > 0) {
      setLobs((prev) => {
        const map = new Map<string, { id: string; label: string; isCustom?: boolean }>();
        DEFAULT_LOBS.forEach((l) => map.set(l.id, l));
        prev.forEach((l) => map.set(l.id, l));
        customCatalog.lobs
          .filter((cl) => !cl.parentId || cl.parentId === "TOP")
          .forEach((cl) => {
            map.set(cl.id, { id: cl.id, label: cl.label, isCustom: true });
          });
        return Array.from(map.values());
      });
    }
  }, [customCatalog.lobs]);

  useEffect(() => {
    if (initialSubtype) {
      setActiveLOB(initialSubtype);
      if (initialSubtype === "DTH" || initialSubtype === "HT" || initialSubtype === "XSTREAM_CORE" || initialSubtype === "XSTREAM_SUBPROJECTS") {
        setXstreamSubfilter(initialSubtype);
      } else if (initialSubtype.startsWith("IPTV_")) {
        setIptvSubfilter(initialSubtype);
      } else {
        setXstreamSubfilter("ALL");
        setIptvSubfilter("ALL");
      }
    }
  }, [initialSubtype]);

  const handleLOBSelect = (lob: string) => {
    setActiveLOB(lob);
    if (lob === "DTH" || lob === "HT" || lob === "XSTREAM_CORE" || lob === "XSTREAM_SUBPROJECTS") {
      setXstreamSubfilter(lob);
    } else {
      setXstreamSubfilter("ALL");
    }
    if (lob.startsWith("IPTV_")) {
      setIptvSubfilter(lob);
    } else {
      setIptvSubfilter("ALL");
    }
    if (onSubtypeChange) onSubtypeChange(lob);
  };

  const [displayCurrency, setDisplayCurrency] = useState<AOPDisplayCurrency>(() => {
    return currency === "USD" ? "USD_M" : "INR_CR";
  });

  useEffect(() => {
    setDisplayCurrency(currency === "USD" ? "USD_M" : "INR_CR");
  }, [currency]);

  // Partitioned Multi-FY Isolated State
  const [categories, setCategories] = useState<AOPCategoryGroup[]>(() => {
    const fyData = getFinOpsDataForFY(activeFY);
    if (fyData && Array.isArray(fyData.aopCategories) && fyData.aopCategories.length > 0) {
      return sanitizeAOPCategories(fyData.aopCategories);
    }
    try {
      const saved = localStorage.getItem("xtelify_aop_categories_v3");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeAOPCategories(parsed);
        }
      }
    } catch {}
    return [];
  });

  const [leadershipSummaries, setLeadershipSummaries] = useState<
    Record<string, AOPLeadershipSummary>
  >(() => {
    const fyData = getFinOpsDataForFY(activeFY);
    if (fyData && fyData.aopLeadershipSummaries && Object.keys(fyData.aopLeadershipSummaries).length > 0) {
      return sanitizeLeadershipSummaries(fyData.aopLeadershipSummaries);
    }
    return {};
  });

  // Dynamic Custom Columns (Supports Standard Text/Number & Calculated Formula columns)
  const [customColumns, setCustomColumns] = useState<CustomColumnDef[]>(() => {
    try {
      const saved = localStorage.getItem("xtelify_aop_custom_columns_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      { id: "owner", name: "Owner", type: "STANDARD_TEXT" },
      { id: "mau_m", name: "MAU (M)", type: "STANDARD_NUMBER", unit: "M" },
      { id: "cost_per_mau", name: "Cost / MAU", type: "FORMULA", formula: "SPEND / MAU", prefix: "₹" },
    ];
  });

  // Dynamic Custom KPI Cards
  const DEFAULT_KPI_CARDS: CustomKPICardDef[] = [
    {
      id: "kpi_mau",
      title: "Year-End MAU (Subscribers)",
      metricSource: "YEAR_END_MAU",
      filterScopeLOB: "ALL",
      colorTheme: "EMERALD",
      suffix: "M",
    },
    {
      id: "kpi_budget",
      title: "Total AOP Budget",
      metricSource: "TOTAL_BUDGET",
      filterScopeLOB: "ALL",
      colorTheme: "BLUE",
      prefix: "₹",
      suffix: " Cr",
    },
    {
      id: "kpi_cpu",
      title: "Cost per User (Year End)",
      metricSource: "COST_PER_USER",
      filterScopeLOB: "ALL",
      colorTheme: "PURPLE",
      prefix: "₹",
    },
    {
      id: "kpi_devops",
      title: "DevOps Savings Realized",
      metricSource: "DEVOPS_SAVINGS",
      filterScopeLOB: "ALL",
      colorTheme: "EMERALD",
      prefix: "₹",
      suffix: " Cr",
    },
  ];

  const [kpiCards, setKpiCards] = useState<CustomKPICardDef[]>(() => {
    try {
      const saved = localStorage.getItem("xtelify_aop_kpi_cards_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_KPI_CARDS;
  });

  // Undo / Trash Recovery Drawer State
  const [trashItems, setTrashItems] = useState<TrashItem[]>(() => {
    try {
      const saved = localStorage.getItem("xtelify_aop_trash_items_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [isTrashDrawerOpen, setIsTrashDrawerOpen] = useState(false);

  // Snapshot Versioning State
  const [snapshots, setSnapshots] = useState<AOPSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem("xtelify_aop_snapshots_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [isSaveSnapshotModalOpen, setIsSaveSnapshotModalOpen] = useState(false);
  const [isSnapshotDrawerOpen, setIsSnapshotDrawerOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState("");
  const [snapshotNotes, setSnapshotNotes] = useState("");

  // What-If Sandbox Mode State
  const [isSandboxActive, setIsSandboxActive] = useState<boolean>(false);
  const [sandboxGrowthPct, setSandboxGrowthPct] = useState<number>(0);
  const liveBackupRef = useRef<{
    categories: AOPCategoryGroup[];
    summaries: Record<string, AOPLeadershipSummary>;
  } | null>(null);

  // Custom KPI Card Builder Modal State
  const [isAddKPICardModalOpen, setIsAddKPICardModalOpen] = useState(false);
  const [editingKPICard, setEditingKPICard] = useState<CustomKPICardDef | null>(null);
  const [kpiCardTitle, setKpiCardTitle] = useState("");
  const [kpiCardMetricSource, setKpiCardMetricSource] = useState<CustomKPICardDef["metricSource"]>("TOTAL_BUDGET");
  const [kpiCardFilterLOB, setKpiCardFilterLOB] = useState("ALL");
  const [kpiCardFilterCategory, setKpiCardFilterCategory] = useState("ALL");
  const [kpiCardColorTheme, setKpiCardColorTheme] = useState<CustomKPICardDef["colorTheme"]>("EMERALD");
  const [kpiCardFormula, setKpiCardFormula] = useState("");
  const [kpiCardPrefix, setKpiCardPrefix] = useState("");
  const [kpiCardSuffix, setKpiCardSuffix] = useState("");

  // Approvals records for NFA auto-complete
  const existingApprovals = useMemo(() => getFinOpsDataForFY(activeFY)?.approvalRecords || [], [activeFY]);

  // Hydrate from FastAPI / MongoDB backend on mount and fiscal year switch
  useEffect(() => {
    let isMounted = true;
    fetchAOPHierarchyFromBackend(activeFY)
      .then((backendData) => {
        if (!isMounted || !backendData) return;
        if (Array.isArray(backendData.aopCategories) && backendData.aopCategories.length > 0) {
          setCategories(sanitizeAOPCategories(backendData.aopCategories));
        }
        if (backendData.aopLeadershipSummaries && Object.keys(backendData.aopLeadershipSummaries).length > 0) {
          setLeadershipSummaries(sanitizeLeadershipSummaries(backendData.aopLeadershipSummaries));
        }
        if (Array.isArray(backendData.kpiCards) && backendData.kpiCards.length > 0) {
          setKpiCards(backendData.kpiCards);
        }
        if (Array.isArray(backendData.customColumns) && backendData.customColumns.length > 0) {
          setCustomColumns(backendData.customColumns);
        }
        if (Array.isArray(backendData.trashItems)) {
          setTrashItems(backendData.trashItems);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [activeFY]);

  useEffect(() => {
    try {
      localStorage.setItem("xtelify_aop_custom_columns_v2", JSON.stringify(customColumns));
    } catch {}
    saveFinOpsDataForFY(activeFY, { aopCustomColumns: customColumns });
  }, [customColumns, activeFY]);

  useEffect(() => {
    try {
      localStorage.setItem("xtelify_aop_kpi_cards_v1", JSON.stringify(kpiCards));
    } catch {}
    saveFinOpsDataForFY(activeFY, { aopKpiCards: kpiCards });
  }, [kpiCards, activeFY]);

  useEffect(() => {
    try {
      localStorage.setItem("xtelify_aop_trash_items_v1", JSON.stringify(trashItems));
    } catch {}
    saveFinOpsDataForFY(activeFY, { aopTrashItems: trashItems });
  }, [trashItems, activeFY]);

  useEffect(() => {
    fetchAOPSnapshotsFromBackend(activeFY).then((res) => {
      if (Array.isArray(res) && res.length > 0) {
        setSnapshots(res);
        try {
          localStorage.setItem("xtelify_aop_snapshots_v1", JSON.stringify(res));
        } catch {}
      }
    });
  }, [activeFY]);

  // Reload when active fiscal year changes without wiping category hierarchy
  useEffect(() => {
    const fyData = getFinOpsDataForFY(activeFY);
    if (fyData && Array.isArray(fyData.aopCategories) && fyData.aopCategories.length > 0) {
      setCategories(sanitizeAOPCategories(fyData.aopCategories));
    } else {
      setCategories((prev) => {
        if (!prev || prev.length === 0) return prev;
        const normFY = normalizeFYKey(activeFY);
        return prev.map((cat) => {
          const catYearly = cat.yearlyData?.[normFY];
          const updatedSubs = cat.subComponents.map((sub) => {
            const subYearly = sub.yearlyData?.[normFY];
            return {
              ...sub,
              allocatedBudgetCr: subYearly?.allocatedBudgetCr !== undefined
                ? subYearly.allocatedBudgetCr
                : (normFY === "FY 2026-27" ? sub.allocatedBudgetCr : 0),
              totalSpentCr: subYearly?.totalSpentCr !== undefined
                ? subYearly.totalSpentCr
                : (normFY === "FY 2026-27" ? sub.totalSpentCr : 0),
              monthlyData: subYearly?.monthlyData || (normFY === "FY 2026-27" ? (sub.monthlyData || []) : []),
            };
          });

          const catSubsBudget = updatedSubs.reduce((s, sub) => s + (sub.allocatedBudgetCr || 0), 0);
          const catSubsSpent = parseFloat(updatedSubs.reduce((s, sub) => s + (sub.totalSpentCr || 0), 0).toFixed(2));

          return {
            ...cat,
            allocatedBudgetCr: catYearly?.allocatedBudgetCr !== undefined
              ? catYearly.allocatedBudgetCr
              : (catSubsBudget > 0 ? catSubsBudget : (normFY === "FY 2026-27" ? cat.allocatedBudgetCr : 0)),
            totalSpentCr: catYearly?.totalSpentCr !== undefined
              ? catYearly.totalSpentCr
              : (catSubsSpent > 0 ? catSubsSpent : (normFY === "FY 2026-27" ? cat.totalSpentCr : 0)),
            subComponents: updatedSubs,
          };
        });
      });
    }

    if (fyData && fyData.aopLeadershipSummaries && Object.keys(fyData.aopLeadershipSummaries).length > 0) {
      setLeadershipSummaries(sanitizeLeadershipSummaries(fyData.aopLeadershipSummaries));
    }
  }, [activeFY]);

  // Persist partitioned changes for active fiscal year to localStorage & MongoDB backend
  useEffect(() => {
    if (!categories || categories.length === 0) return;
    saveFinOpsDataForFY(activeFY, { aopCategories: categories });
    try {
      localStorage.setItem("xtelify_aop_categories_v3", JSON.stringify(categories));
    } catch {}
    persistAOPHierarchyToBackend(activeFY, categories, leadershipSummaries);
  }, [categories, activeFY]);

  useEffect(() => {
    if (!leadershipSummaries || Object.keys(leadershipSummaries).length === 0) return;
    saveFinOpsDataForFY(activeFY, { aopLeadershipSummaries: leadershipSummaries });
  }, [leadershipSummaries, activeFY]);

  // Listen for multi-year cross-tab / modal storage updates
  useEffect(() => {
    const handleFYUpdated = (e: any) => {
      if (normalizeFYKey(e.detail?.fy) === activeFY && e.detail?.data?.aopCategories) {
        setCategories(e.detail.data.aopCategories);
      }
    };
    window.addEventListener("finops:fy-data-updated", handleFYUpdated);
    return () => window.removeEventListener("finops:fy-data-updated", handleFYUpdated);
  }, [activeFY]);

  // Inline Budget Editing
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingBudgetValue, setEditingBudgetValue] = useState<string>("");

  // Year Data Modal State (for + Add / Edit Year Data on cards)
  const [isYearDataModalOpen, setIsYearDataModalOpen] = useState(false);
  const [yearDataTargetCat, setYearDataTargetCat] = useState<AOPCategoryGroup | null>(null);
  const [yearDataTargetSub, setYearDataTargetSub] = useState<AOPSubComponent | null>(null);
  const [yearDataFY, setYearDataFY] = useState<string>("FY 2027-28");
  const [yearDataBudget, setYearDataBudget] = useState<string>("0");
  const [yearDataMonths, setYearDataMonths] = useState<
    { month: string; shortLabel: string; quarter: string; amount: number; status: "ACTUAL" | "PROJECTED" }[]
  >([]);

  const modalInitKeyRef = useRef<string>("");

  const initYearModalData = (cat: AOPCategoryGroup | null, sub: AOPSubComponent | null, rawFY: string) => {
    if (!cat) return;
    const normFY = normalizeFYKey(rawFY);
    const targetStore = getFinOpsDataForFY(normFY);
    const existingCat = targetStore?.aopCategories?.find((c) => c.id === cat.id);
    const existingSub = sub && existingCat ? existingCat.subComponents.find((s) => s.id === sub.id) : null;

    let b = 0;
    let monthsSource: any = [];

    if (sub) {
      if (sub.yearlyData?.[normFY]?.allocatedBudgetCr !== undefined) {
        b = sub.yearlyData[normFY].allocatedBudgetCr || 0;
      } else if (existingSub?.allocatedBudgetCr !== undefined) {
        b = existingSub.allocatedBudgetCr || 0;
      } else if (normFY === normalizeFYKey(activeFY)) {
        b = sub.allocatedBudgetCr || 0;
      }
      monthsSource =
        sub.yearlyData?.[normFY]?.monthlyData ||
        sub.yearlyData?.[normFY]?.months ||
        existingSub?.monthlyData ||
        (normFY === normalizeFYKey(activeFY) ? sub.monthlyData : []) ||
        [];
    } else {
      if (cat.yearlyData?.[normFY]?.allocatedBudgetCr !== undefined) {
        b = cat.yearlyData[normFY].allocatedBudgetCr || 0;
      } else if (existingCat?.allocatedBudgetCr !== undefined) {
        b = existingCat.allocatedBudgetCr || 0;
      } else if (normFY === normalizeFYKey(activeFY)) {
        b = cat.allocatedBudgetCr || 0;
      }
      monthsSource =
        cat.yearlyData?.[normFY]?.monthlyData ||
        cat.yearlyData?.[normFY]?.months ||
        existingCat?.monthlyData ||
        (normFY === normalizeFYKey(activeFY) ? cat.monthlyData : []) ||
        [];
    }

    setYearDataBudget(String(Number(b) || 0));

    const fyMonthsMeta = get12MonthKeysForFY(normFY);
    const initializedMonths = fyMonthsMeta.map((mMeta, idx) => {
      let found: any = null;
      if (Array.isArray(monthsSource)) {
        found = monthsSource.find(
          (pt: any) => pt.month === mMeta.key || (pt.month && pt.month.startsWith(mMeta.shortLabel))
        );
      } else if (monthsSource && typeof monthsSource === "object") {
        found = monthsSource[mMeta.key] || monthsSource[mMeta.shortLabel];
      }
      const defaultStatus: "ACTUAL" | "PROJECTED" = idx < 6 ? "ACTUAL" : "PROJECTED";
      const status: "ACTUAL" | "PROJECTED" =
        found?.status || (found?.isActual ?? (defaultStatus === "ACTUAL") ? "ACTUAL" : "PROJECTED");
      const rawAmt =
        found?.amount !== undefined
          ? found.amount
          : status === "ACTUAL"
          ? found?.actualSpentCr ?? 0
          : found?.projectedCr ?? found?.actualSpentCr ?? 0;
      const amount = Number(rawAmt) || 0;
      return {
        month: mMeta.key,
        shortLabel: mMeta.shortLabel,
        quarter: mMeta.quarter,
        amount,
        status,
      };
    });

    setYearDataMonths(initializedMonths);
  };

  // Modal State Initialization: only runs when modal opens (isOpen) or when targetId / selectedFY changes
  useEffect(() => {
    if (!isYearDataModalOpen || !yearDataTargetCat) {
      modalInitKeyRef.current = "";
      return;
    }
    const targetId = yearDataTargetSub ? yearDataTargetSub.id : yearDataTargetCat.id;
    const normFY = normalizeFYKey(yearDataFY);
    const currentKey = `${targetId}::${normFY}`;
    if (modalInitKeyRef.current === currentKey) return;
    modalInitKeyRef.current = currentKey;
    initYearModalData(yearDataTargetCat, yearDataTargetSub, normFY);
  }, [isYearDataModalOpen, yearDataTargetCat?.id, yearDataTargetSub?.id, yearDataFY]);

  // Category creation Modal FY selection
  const [catFormFY, setCatFormFY] = useState<string>(activeFY);
  const [isAddingFYInModal, setIsAddingFYInModal] = useState(false);
  const [newFYInModal, setNewFYInModal] = useState("");

  const fiscalYearsList = useMemo(() => getFiscalYears(), []);


  // Multi-select category cards
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // View mode switcher: "EXECUTIVE" vs "SCOPING_TABLE"
  const [activeViewMode, setActiveViewMode] = useState<"EXECUTIVE" | "SCOPING_TABLE">("EXECUTIVE");

  // Expandable summary cards state
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    DEFAULT_AOP_CATEGORIES.forEach((c) => {
      init[c.id] = true;
    });
    return init;
  });

  const toggleCategoryExpanded = (catId: string) => {
    setExpandedCategoryIds((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // 12-Month timeline drilldown per sub-component
  const [expandedSubComponentIds, setExpandedSubComponentIds] = useState<Record<string, boolean>>({});

  const toggleSubComponentTimeline = (subId: string) => {
    setExpandedSubComponentIds((prev) => ({
      ...prev,
      [subId]: !prev[subId],
    }));
  };

  // Modals state
  const [isAddLOBModalOpen, setIsAddLOBModalOpen] = useState(false);
  const [newLOBName, setNewLOBName] = useState("");
  const [newLOBMau, setNewLOBMau] = useState("10.0");
  const [newLOBGrowth, setNewLOBGrowth] = useState("20.0");
  const [newLOBBudget, setNewLOBBudget] = useState("50.0");

  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AOPCategoryGroup | null>(null);
  const [catFormName, setCatFormName] = useState("");
  const [catFormLOB, setCatFormLOB] = useState("IPTV");
  const [catFormSheet, setCatFormSheet] = useState("");
  const [catFormCode, setCatFormCode] = useState<string>("CDN");
  const [catFormBudget, setCatFormBudget] = useState("0");

  const [categoryCodeOptions, setCategoryCodeOptions] = useState<CategoryCodeOption[]>(() => {
    try {
      const catalog = getCustomCatalog();
      if (catalog && catalog.categories && catalog.categories.length > 0) {
        const map = new Map<string, CategoryCodeOption>();
        DEFAULT_CATEGORY_CODES.forEach((c) => map.set(c.code.toUpperCase(), c));
        catalog.categories.forEach((c) => {
          map.set(c.code.toUpperCase(), {
            code: c.code.toUpperCase(),
            label: c.label,
            icon: c.icon,
            isCustom: true,
          });
        });
        return Array.from(map.values());
      }
      const saved = localStorage.getItem("xtelify_aop_category_codes_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_CATEGORY_CODES;
  });

  useEffect(() => {
    if (customCatalog.categories && customCatalog.categories.length > 0) {
      setCategoryCodeOptions((prev) => {
        const map = new Map<string, CategoryCodeOption>();
        DEFAULT_CATEGORY_CODES.forEach((c) => map.set(c.code.toUpperCase(), c));
        prev.forEach((c) => map.set(c.code.toUpperCase(), c));
        customCatalog.categories.forEach((c) => {
          map.set(c.code.toUpperCase(), {
            code: c.code.toUpperCase(),
            label: c.label,
            icon: c.icon,
            isCustom: true,
          });
        });
        return Array.from(map.values());
      });
    }
  }, [customCatalog.categories]);

  const [isCustomCategoryCodeMode, setIsCustomCategoryCodeMode] = useState(false);
  const [customCategoryCodeLabel, setCustomCategoryCodeLabel] = useState("");
  const [catFormIcon, setCatFormIcon] = useState<string>("Radio");
  const [showIconPicker, setShowIconPicker] = useState<boolean>(false);

  const getCategoryCodeLabel = (code: string) => {
    const found = categoryCodeOptions.find((o) => o.code === code || o.code.toUpperCase() === (code || "").toUpperCase());
    return found ? found.label : code;
  };

  const handleSaveCustomCategoryCode = async () => {
    const trimmed = customCategoryCodeLabel.trim();
    if (!trimmed) return;
    const generatedCode = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    const existing = categoryCodeOptions.find((o) => o.code === generatedCode);
    const newOpt: CategoryCodeOption = existing
      ? { ...existing, label: trimmed, icon: catFormIcon }
      : {
          code: generatedCode,
          label: trimmed,
          icon: catFormIcon,
          isCustom: true,
        };
    const updated = existing
      ? categoryCodeOptions.map((o) => (o.code === generatedCode ? newOpt : o))
      : [...categoryCodeOptions, newOpt];

    setCategoryCodeOptions(updated);
    try {
      localStorage.setItem("xtelify_aop_category_codes_v1", JSON.stringify(updated));
    } catch {}

    await addCustomCategoryCode({
      code: generatedCode,
      label: trimmed,
      icon: catFormIcon,
      lob: catFormLOB,
    });
    setCustomCatalog(getCustomCatalog());

    setCatFormCode(generatedCode);
    setIsCustomCategoryCodeMode(false);
    setShowIconPicker(false);
    setNotification({
      message: `Category '${trimmed}' (${generatedCode}) saved and selected!`,
      type: "success",
    });
  };

  const handleDeleteCustomCategoryCode = async (codeToDelete: string) => {
    const updated = categoryCodeOptions.filter((o) => o.code !== codeToDelete);
    setCategoryCodeOptions(updated);
    try {
      localStorage.setItem("xtelify_aop_category_codes_v1", JSON.stringify(updated));
    } catch {}

    await deleteCustomCategoryCode(codeToDelete);
    setCustomCatalog(getCustomCatalog());

    if (catFormCode === codeToDelete) {
      setCatFormCode("CDN");
      setCatFormIcon("Radio");
    }
    setNotification({ message: `Custom category removed.`, type: "info" });
  };

  const [isAddSubModalOpen, setIsAddSubModalOpen] = useState(false);
  const [targetCategoryIdForSub, setTargetCategoryIdForSub] = useState<string | null>(null);
  const [editingSubComponent, setEditingSubComponent] = useState<{ categoryId: string; sub: AOPSubComponent } | null>(null);
  const [subFormName, setSubFormName] = useState("");
  const [subFormVendor, setSubFormVendor] = useState("");
  const [subFormNotes, setSubFormNotes] = useState("");
  const [subFormCapexOpex, setSubFormCapexOpex] = useState<"Opex" | "Capex">("Opex");
  const [subFormPaymentMode, setSubFormPaymentMode] = useState<"Monthly" | "One time" | "Annual">("Monthly");
  const [subFormBudget, setSubFormBudget] = useState("10.0");
  const [subFormCustomFields, setSubFormCustomFields] = useState<Record<string, string>>({});
  const [subFormNFANumber, setSubFormNFANumber] = useState("");
  const [subFormNFAStatus, setSubFormNFAStatus] = useState<"NFA Approved" | "NFA Pending" | "No NFA">("No NFA");
  const [subFormDevopsSavingsCr, setSubFormDevopsSavingsCr] = useState("0");
  const [subFormDevopsSavingsType, setSubFormDevopsSavingsType] = useState<"Spot" | "CUD / Reserved" | "Right-sizing" | "Storage Tiering" | "Architecture" | "Other">("Spot");
  const [subFormDevopsSavingsNotes, setSubFormDevopsSavingsNotes] = useState("");

  const [isManageColumnsModalOpen, setIsManageColumnsModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColType, setNewColType] = useState<"STANDARD_TEXT" | "STANDARD_NUMBER" | "FORMULA">("STANDARD_TEXT");
  const [newColFormula, setNewColFormula] = useState("SPEND / MAU");
  const [newColUnit, setNewColUnit] = useState("");
  const [newColPrefix, setNewColPrefix] = useState("");
  const [newColSuffix, setNewColSuffix] = useState("");

  // Recharts ComposedChart filters
  const [selectedPacingCategory, setSelectedPacingCategory] = useState<string>("ALL");
  const [selectedPacingComponent, setSelectedPacingComponent] = useState<string>("ALL");
  const [pacingHorizon, setPacingHorizon] = useState<"QUARTERLY" | "MONTHLY">("QUARTERLY");

  // Line items state (for 7-column table)
  const [items, setItems] = useState<AOPLineItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const cleaned = sanitizeAOPItems(parsed);
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleaned));
        }
        return cleaned;
      }
    } catch {}
    return [];
  });

  // UI helpers & filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("All");
  const [selectedLOB, setSelectedLOB] = useState<string>("All");
  const [selectedCapexOpex, setSelectedCapexOpex] = useState<string>("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AOPLineItem | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Notification auto-dismiss
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 6000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Sync items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. DERIVED METRICS & CATEGORY FILTERING
  // ─────────────────────────────────────────────────────────────────────────────
  // Filter categories for selected LOB
  const filteredCategories = useMemo(() => {
    const sub = activeLOB === "IPTV" || activeLOB.startsWith("IPTV_") ? iptvSubfilter : xstreamSubfilter;
    return getFilteredCategoryGroups(activeLOB, categories, sub);
  }, [activeLOB, categories, xstreamSubfilter, iptvSubfilter]);

  // Aggregate executive leadership summary (MAU, Budget, Cost Per User)
  const currentSummary = useMemo(() => {
    return getAggregatedLeadershipSummary(activeLOB, leadershipSummaries, categories);
  }, [activeLOB, leadershipSummaries, categories]);

  // Sub-components count & Capex/Opex totals
  const { totalSubComponentsCount, capexBudgetCr, opexBudgetCr, capexPct, opexPct } = useMemo(() => {
    let count = 0;
    let capex = 0;
    let opex = 0;
    filteredCategories.forEach((cat) => {
      count += cat.subComponents.length;
      cat.subComponents.forEach((sub) => {
        if (sub.capexOpex === "Capex") capex += sub.allocatedBudgetCr || 0;
        else opex += sub.allocatedBudgetCr || 0;
      });
    });
    const tot = capex + opex;
    return {
      totalSubComponentsCount: count,
      capexBudgetCr: capex,
      opexBudgetCr: opex,
      capexPct: tot > 0 ? Math.round((capex / tot) * 100) : 0,
      opexPct: tot > 0 ? Math.round((opex / tot) * 100) : 0,
    };
  }, [filteredCategories]);

  // LOB Icon helper
  const getLOBIcon = (lobId: string) => {
    const upper = lobId.toUpperCase();
    if (upper === "ALL") return Layers;
    if (upper === "IPTV") return Tv;
    if (upper === "XSTREAM" || upper === "XSTRM") return Zap;
    if (upper === "DTH") return Radio;
    if (upper === "HT") return Home;
    if (upper.includes("BROADBAND") || upper.includes("FIBER")) return Radio;
    if (upper.includes("CLOUD")) return Server;
    return Briefcase;
  };

  const getLOBPillData = (lobId: string) => {
    const s = getAggregatedLeadershipSummary(lobId, leadershipSummaries, categories);
    return {
      budget: formatAOPCurrency(s.totalBudgetCr, displayCurrency),
      mau: `${s.yearEndMauMillions}M MAU`,
    };
  };

  // Level 1: LOB Management
  const handleAddLOB = () => {
    const name = newLOBName.trim();
    if (!name) return;
    const id = name.toUpperCase().replace(/\s+/g, "_");
    if (lobs.some((l) => l.id === id)) {
      setNotification({ message: `LOB '${name}' already exists.`, type: "error" });
      return;
    }
    const mau = parseFloat(newLOBMau) || 10.0;
    const growth = parseFloat(newLOBGrowth) || 20.0;
    const budget = parseFloat(newLOBBudget) || 50.0;
    const cpu = mau > 0 ? parseFloat(((budget * 10000000) / (mau * 1000000)).toFixed(2)) : 0;

    const newSummary: AOPLeadershipSummary = {
      lob: id,
      yearEndMauMillions: mau,
      prevYearMauMillions: parseFloat((mau / (1 + growth / 100)).toFixed(1)),
      growthPct: growth,
      totalBudgetCr: budget,
      totalSpentCr: parseFloat((budget * 0.95).toFixed(1)),
      costPerUserInr: cpu,
      prevYearCostPerUserInr: parseFloat((cpu * 1.05).toFixed(2)),
      cpuImprovementPct: -4.8,
    };

    setLeadershipSummaries((prev) => ({ ...prev, [id]: newSummary }));
    setLobs((prev) => [...prev, { id, label: name, isCustom: true }]);
    setActiveLOB(id);
    if (onSubtypeChange) onSubtypeChange(id);
    addCustomCatalogLOB({
      id,
      label: name,
      mauMillions: mau,
      growthPct: growth,
      budgetCr: budget,
      isCustom: true,
    }).then(() => {
      setCustomCatalog(getCustomCatalog());
    });
    setIsAddLOBModalOpen(false);
    setNewLOBName("");
    setNotification({ message: `New AOP Type / LOB '${name}' added successfully.`, type: "success" });
  };

  const handleDeleteLOB = (lobId: string) => {
    if (lobId === "ALL" || lobId === "IPTV" || lobId === "XSTREAM") {
      setNotification({ message: `Cannot delete primary LOB '${lobId}'.`, type: "error" });
      return;
    }
    const lobToDelete = lobs.find((l) => l.id === lobId);
    if (lobToDelete) {
      setTrashItems((prev) => [
        {
          id: `trash_lob_${Date.now()}`,
          itemType: "LOB",
          itemName: lobToDelete.label || lobId,
          deletedAt: new Date().toLocaleTimeString(),
          data: { lob: lobToDelete, summary: leadershipSummaries[lobId] },
        },
        ...prev,
      ]);
    }
    setLobs((prev) => prev.filter((l) => l.id !== lobId));
    deleteCustomCatalogLOB(lobId).then(() => {
      setCustomCatalog(getCustomCatalog());
    });
    if (activeLOB === lobId) {
      setActiveLOB("ALL");
      if (onSubtypeChange) onSubtypeChange("ALL");
    }
    setNotification({ message: `LOB '${lobId}' moved to Recently Deleted (Trash).`, type: "info" });
  };

  // Level 2: Major Cost Sub-type Parent Card Management
  const handleAddCategory = () => {
    if (!catFormName.trim()) return;
    const bCr = parseFloat(catFormBudget) || 0;
    const targetFY = catFormFY || activeFY;

    let finalCode = catFormCode;
    let finalIcon: string | undefined = catFormIcon;

    if (isCustomCategoryCodeMode && customCategoryCodeLabel.trim()) {
      const customLabel = customCategoryCodeLabel.trim();
      finalCode = customLabel.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      finalIcon = catFormIcon || "Server";

      const existing = categoryCodeOptions.find((o) => o.code === finalCode);
      if (!existing) {
        const newOpt: CategoryCodeOption = {
          code: finalCode,
          label: customLabel,
          icon: finalIcon,
          isCustom: true,
        };
        const updated = [...categoryCodeOptions, newOpt];
        setCategoryCodeOptions(updated);
        try {
          localStorage.setItem("xtelify_aop_category_codes_v1", JSON.stringify(updated));
        } catch {}
      }
    } else {
      const selectedOpt = categoryCodeOptions.find((o) => o.code === catFormCode);
      if (selectedOpt && !catFormIcon) finalIcon = selectedOpt.icon;
    }

    const newCat: AOPCategoryGroup = {
      id: `cat-custom-${Date.now()}`,
      categoryName: catFormName.trim(),
      categoryCode: finalCode,
      icon: finalIcon,
      lob: catFormLOB,
      sourceSheet: catFormSheet.trim() || `${catFormLOB} ${catFormName.trim()}`,
      allocatedBudgetCr: bCr,
      totalSpentCr: 0,
      subComponents: [],
    };

    // Auto-save user-created custom subtype into finops_custom_catalog (MongoDB & localStorage)
    const isStandardPreset = getPresetsForLOB(catFormLOB).some(
      (p) => p.name.trim().toLowerCase() === catFormName.trim().toLowerCase()
    );
    if (!isStandardPreset) {
      addCustomCatalogSubtype({
        id: `custom-sub-${Date.now()}`,
        name: catFormName.trim(),
        lob: catFormLOB,
        sourceSheet: catFormSheet.trim() || `${catFormLOB} ${catFormName.trim()}`,
        categoryCode: finalCode,
        icon: finalIcon || "Server",
        defaultBudgetCr: bCr,
        isCustom: true,
      }).then(() => {
        setCustomCatalog(getCustomCatalog());
      });
    }

    if (isCustomCategoryCodeMode && customCategoryCodeLabel.trim()) {
      addCustomCategoryCode({
        code: finalCode,
        label: customCategoryCodeLabel.trim(),
        icon: finalIcon || "Server",
        lob: catFormLOB,
      }).then(() => {
        setCustomCatalog(getCustomCatalog());
      });
    }

    if (targetFY !== activeFY) {
      const targetStore = getFinOpsDataForFY(targetFY) || {};
      const targetCats = targetStore.aopCategories ? [newCat, ...targetStore.aopCategories] : [newCat];
      saveFinOpsDataForFY(targetFY, { aopCategories: targetCats });
      setNotification({
        message: `Major Sub-type '${newCat.categoryName}' created directly in ${targetFY}.`,
        type: "success",
      });
    } else {
      setCategories((prev) => [newCat, ...prev]);
      setExpandedCategoryIds((prev) => ({ ...prev, [newCat.id]: true }));
      setNotification({ message: `Major Sub-type '${newCat.categoryName}' created in ${activeFY}.`, type: "success" });
    }

    setIsAddCategoryModalOpen(false);
    setCatFormName("");
    setCatFormSheet("");
    setCatFormBudget("0");
    setIsCustomCategoryCodeMode(false);
    setCustomCategoryCodeLabel("");
    setCatFormIcon("Radio");
    setShowIconPicker(false);
  };

  const handleEditCategory = () => {
    if (!editingCategory || !catFormName.trim()) return;
    const bCr = parseFloat(catFormBudget) || 0;

    let finalCode = catFormCode;
    let finalIcon: string | undefined = catFormIcon || editingCategory.icon;

    if (isCustomCategoryCodeMode && customCategoryCodeLabel.trim()) {
      const customLabel = customCategoryCodeLabel.trim();
      finalCode = customLabel.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      finalIcon = catFormIcon || "Server";

      const existing = categoryCodeOptions.find((o) => o.code === finalCode);
      if (!existing) {
        const newOpt: CategoryCodeOption = {
          code: finalCode,
          label: customLabel,
          icon: finalIcon,
          isCustom: true,
        };
        const updated = [...categoryCodeOptions, newOpt];
        setCategoryCodeOptions(updated);
        try {
          localStorage.setItem("xtelify_aop_category_codes_v1", JSON.stringify(updated));
        } catch {}
      }
    } else {
      const selectedOpt = categoryCodeOptions.find((o) => o.code === catFormCode);
      if (selectedOpt && !catFormIcon) finalIcon = selectedOpt.icon;
    }

    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== editingCategory.id) return c;
        return {
          ...c,
          categoryName: catFormName.trim(),
          categoryCode: finalCode,
          icon: finalIcon,
          lob: catFormLOB,
          sourceSheet: catFormSheet.trim() || c.sourceSheet,
          allocatedBudgetCr: bCr > 0 ? bCr : c.allocatedBudgetCr,
        };
      })
    );
    setEditingCategory(null);
    setIsCustomCategoryCodeMode(false);
    setCustomCategoryCodeLabel("");
    setCatFormIcon("Radio");
    setShowIconPicker(false);
    setNotification({ message: `Major Sub-type updated.`, type: "success" });
  };

  const handleDeleteCategory = (categoryId: string) => {
    const catToDelete = categories.find((c) => c.id === categoryId);
    if (catToDelete) {
      setTrashItems((prev) => [
        {
          id: `trash_cat_${Date.now()}`,
          itemType: "CATEGORY",
          itemName: catToDelete.categoryName,
          deletedAt: new Date().toLocaleTimeString(),
          data: catToDelete,
        },
        ...prev,
      ]);
    }
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    setSelectedCategoryIds((prev) => prev.filter((id) => id !== categoryId));
    setNotification({ message: `Major Sub-type moved to Recently Deleted (Trash).`, type: "info" });
  };

  const handleDeleteSelectedCategories = () => {
    if (selectedCategoryIds.length === 0) return;
    const count = selectedCategoryIds.length;
    const catsToDelete = categories.filter((c) => selectedCategoryIds.includes(c.id));
    if (catsToDelete.length > 0) {
      const newTrash: TrashItem[] = catsToDelete.map((c) => ({
        id: `trash_cat_${Date.now()}_${c.id}`,
        itemType: "CATEGORY",
        itemName: c.categoryName,
        deletedAt: new Date().toLocaleTimeString(),
        data: c,
      }));
      setTrashItems((prev) => [...newTrash, ...prev]);
    }
    setCategories((prev) => prev.filter((c) => !selectedCategoryIds.includes(c.id)));
    setSelectedCategoryIds([]);
    setNotification({ message: `${count} Major Sub-types moved to Recently Deleted.`, type: "info" });
  };

  const openEditCategoryModal = (cat: AOPCategoryGroup) => {
    setEditingCategory(cat);
    setCatFormName(cat.categoryName);
    setCatFormLOB(cat.lob);
    setCatFormSheet(cat.sourceSheet);
    setCatFormCode(cat.categoryCode);
    setCatFormBudget(String(cat.allocatedBudgetCr || 0));

    const isStandard = DEFAULT_CATEGORY_CODES.some((o) => o.code === cat.categoryCode);
    const found = categoryCodeOptions.find((o) => o.code === cat.categoryCode);
    const resolvedIcon = cat.icon || found?.icon || (cat.categoryCode === "CDN" ? "Radio" : "Server");
    setCatFormIcon(resolvedIcon);
    setShowIconPicker(false);

    if (!isStandard) {
      setIsCustomCategoryCodeMode(true);
      setCustomCategoryCodeLabel(found ? found.label : cat.categoryCode);
    } else {
      setIsCustomCategoryCodeMode(false);
      setCustomCategoryCodeLabel("");
    }
  };

  // Level 3: Child Sub-component Management with NFA and DevOps Savings
  const handleAddSubComponent = () => {
    if (!targetCategoryIdForSub || !subFormName.trim()) return;
    const bCr = parseFloat(subFormBudget) || 0;
    const devopsSavingsNum = parseFloat(subFormDevopsSavingsCr) || 0;
    const newSub: AOPSubComponent = {
      id: `sub-custom-${Date.now()}`,
      name: subFormName.trim(),
      vendorOrPlatform: subFormVendor.trim() || "Internal Squad",
      capexOpex: subFormCapexOpex,
      paymentMode: subFormPaymentMode,
      allocatedBudgetCr: bCr,
      totalSpentCr: 0,
      monthlyData: MONTHS_12_KEYS.map((m) => ({
        month: m.key,
        quarter: m.quarter,
        budgetCr: parseFloat((bCr / 12).toFixed(2)),
        actualSpentCr: 0,
        projectedCr: 0,
        isActual: m.isActual,
      })),
      notes: subFormNotes.trim() || undefined,
      customFields: { ...subFormCustomFields },
      nfaNumber: subFormNFANumber.trim() || undefined,
      nfaStatus: subFormNFAStatus,
      devopsSavingsCr: devopsSavingsNum,
      devopsSavingsType: subFormDevopsSavingsType,
      devopsSavingsNotes: subFormDevopsSavingsNotes.trim() || undefined,
    };

    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== targetCategoryIdForSub) return cat;
        const newSubs = [...cat.subComponents, newSub];
        const newBudget = newSubs.reduce((acc, s) => acc + (s.allocatedBudgetCr || 0), 0);
        const newSpent = newSubs.reduce((acc, s) => acc + (s.totalSpentCr || 0), 0);
        return {
          ...cat,
          subComponents: newSubs,
          allocatedBudgetCr: parseFloat(newBudget.toFixed(2)),
          totalSpentCr: parseFloat(newSpent.toFixed(2)),
        };
      })
    );

    setIsAddSubModalOpen(false);
    setTargetCategoryIdForSub(null);
    setSubFormName("");
    setSubFormVendor("");
    setSubFormNotes("");
    setSubFormBudget("10.0");
    setSubFormCustomFields({});
    setSubFormNFANumber("");
    setSubFormNFAStatus("No NFA");
    setSubFormDevopsSavingsCr("0");
    setSubFormDevopsSavingsType("Spot");
    setSubFormDevopsSavingsNotes("");
    setNotification({ message: `Sub-component '${newSub.name}' added.`, type: "success" });
  };

  const handleEditSubComponent = () => {
    if (!editingSubComponent || !subFormName.trim()) return;
    const { categoryId, sub } = editingSubComponent;
    const bCr = parseFloat(subFormBudget) || 0;
    const devopsSavingsNum = parseFloat(subFormDevopsSavingsCr) || 0;

    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== categoryId) return cat;
        const newSubs = cat.subComponents.map((s) => {
          if (s.id !== sub.id) return s;
          return {
            ...s,
            name: subFormName.trim(),
            vendorOrPlatform: subFormVendor.trim() || s.vendorOrPlatform,
            capexOpex: subFormCapexOpex,
            paymentMode: subFormPaymentMode,
            allocatedBudgetCr: bCr,
            notes: subFormNotes.trim() || undefined,
            customFields: { ...subFormCustomFields },
            nfaNumber: subFormNFANumber.trim() || undefined,
            nfaStatus: subFormNFAStatus,
            devopsSavingsCr: devopsSavingsNum,
            devopsSavingsType: subFormDevopsSavingsType,
            devopsSavingsNotes: subFormDevopsSavingsNotes.trim() || undefined,
          };
        });
        const newBudget = newSubs.reduce((acc, s) => acc + (s.allocatedBudgetCr || 0), 0);
        const newSpent = newSubs.reduce((acc, s) => acc + (s.totalSpentCr || 0), 0);
        return {
          ...cat,
          subComponents: newSubs,
          allocatedBudgetCr: parseFloat(newBudget.toFixed(2)),
          totalSpentCr: parseFloat(newSpent.toFixed(2)),
        };
      })
    );

    setEditingSubComponent(null);
    setNotification({ message: `Sub-component '${subFormName}' updated.`, type: "success" });
  };

  const handleDeleteSubComponent = (categoryId: string, subId: string) => {
    const parentCat = categories.find((c) => c.id === categoryId);
    const subToDelete = parentCat?.subComponents.find((s) => s.id === subId);
    if (subToDelete) {
      setTrashItems((prev) => [
        {
          id: `trash_sub_${Date.now()}`,
          itemType: "SUB_COMPONENT",
          itemName: subToDelete.name,
          deletedAt: new Date().toLocaleTimeString(),
          data: subToDelete,
          parentCategoryId: categoryId,
        },
        ...prev,
      ]);
    }

    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== categoryId) return cat;
        const newSubs = cat.subComponents.filter((s) => s.id !== subId);
        const newBudget = newSubs.reduce((acc, s) => acc + (s.allocatedBudgetCr || 0), 0);
        const newSpent = newSubs.reduce((acc, s) => acc + (s.totalSpentCr || 0), 0);
        return {
          ...cat,
          subComponents: newSubs,
          allocatedBudgetCr: parseFloat(newBudget.toFixed(2)),
          totalSpentCr: parseFloat(newSpent.toFixed(2)),
        };
      })
    );
    setNotification({ message: `Sub-component moved to Recently Deleted (Trash).`, type: "info" });
  };

  const openEditSubModal = (categoryId: string, sub: AOPSubComponent) => {
    setEditingSubComponent({ categoryId, sub });
    setSubFormName(sub.name);
    setSubFormVendor(sub.vendorOrPlatform);
    setSubFormNotes(sub.notes || "");
    setSubFormCapexOpex(sub.capexOpex);
    setSubFormPaymentMode(sub.paymentMode);
    setSubFormBudget(String(sub.allocatedBudgetCr || 0));
    setSubFormCustomFields(sub.customFields ? { ...sub.customFields } : {});
    setSubFormNFANumber(sub.nfaNumber || "");
    setSubFormNFAStatus(sub.nfaStatus || "No NFA");
    setSubFormDevopsSavingsCr(String(sub.devopsSavingsCr || 0));
    setSubFormDevopsSavingsType(sub.devopsSavingsType || "Spot");
    setSubFormDevopsSavingsNotes(sub.devopsSavingsNotes || "");
  };

  // Dynamic Custom Columns Management
  const handleAddCustomColumn = () => {
    const colName = newColumnName.trim();
    if (!colName) return;
    const colId = `col_${colName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`;
    const newCol: CustomColumnDef = {
      id: colId,
      name: colName,
      type: newColType,
      formula: newColType === "FORMULA" ? newColFormula.trim() : undefined,
      unit: newColUnit.trim() || undefined,
      prefix: newColPrefix.trim() || undefined,
      suffix: newColSuffix.trim() || undefined,
    };
    setCustomColumns((prev) => [...prev, newCol]);
    setNewColumnName("");
    setNewColFormula("SPEND / MAU");
    setNewColUnit("");
    setNewColPrefix("");
    setNewColSuffix("");
    setNotification({ message: `Custom column '${colName}' added.`, type: "success" });
  };

  const handleDeleteCustomColumn = (colId: string) => {
    const colToDelete = customColumns.find((c) => c.id === colId);
    if (colToDelete) {
      setTrashItems((prev) => [
        {
          id: `trash_col_${Date.now()}`,
          itemType: "COLUMN",
          itemName: colToDelete.name,
          deletedAt: new Date().toLocaleTimeString(),
          data: colToDelete,
        },
        ...prev,
      ]);
    }
    setCustomColumns((prev) => prev.filter((c) => c.id !== colId));
    setNotification({ message: `Custom column moved to Recently Deleted (Trash).`, type: "info" });
  };

  // Undo / Trash Recovery Handlers
  const handleRestoreTrashItem = (trashItem: TrashItem) => {
    if (trashItem.itemType === "CATEGORY") {
      setCategories((prev) => [...prev, trashItem.data]);
      setNotification({ message: `Restored Category '${trashItem.itemName}'!`, type: "success" });
    } else if (trashItem.itemType === "SUB_COMPONENT") {
      if (trashItem.parentCategoryId) {
        setCategories((prev) =>
          prev.map((cat) => {
            if (cat.id !== trashItem.parentCategoryId) return cat;
            const updatedSubs = [...cat.subComponents, trashItem.data];
            const updatedBudget = updatedSubs.reduce((s, sub) => s + (sub.allocatedBudgetCr || 0), 0);
            const updatedSpent = updatedSubs.reduce((s, sub) => s + (sub.totalSpentCr || 0), 0);
            return {
              ...cat,
              subComponents: updatedSubs,
              allocatedBudgetCr: parseFloat(updatedBudget.toFixed(2)),
              totalSpentCr: parseFloat(updatedSpent.toFixed(2)),
            };
          })
        );
        setNotification({ message: `Restored Sub-component '${trashItem.itemName}'!`, type: "success" });
      }
    } else if (trashItem.itemType === "LOB") {
      if (trashItem.data?.lob) {
        setLobs((prev) => [...prev, trashItem.data.lob]);
        if (trashItem.data.summary) {
          setLeadershipSummaries((prev) => ({
            ...prev,
            [trashItem.data.lob.id]: trashItem.data.summary,
          }));
        }
        setNotification({ message: `Restored LOB '${trashItem.itemName}'!`, type: "success" });
      }
    } else if (trashItem.itemType === "COLUMN") {
      setCustomColumns((prev) => [...prev, trashItem.data]);
      setNotification({ message: `Restored Column '${trashItem.itemName}'!`, type: "success" });
    }
    setTrashItems((prev) => prev.filter((item) => item.id !== trashItem.id));
  };

  const handleEmptyTrash = () => {
    setTrashItems([]);
    setNotification({ message: "Recently Deleted trash emptied.", type: "info" });
  };

  // Snapshot Versioning Handlers
  const handleSaveSnapshot = async () => {
    const name = snapshotName.trim() || `Snapshot ${new Date().toLocaleDateString()}`;
    const newSnapshot: AOPSnapshot = {
      id: `snap_${Date.now()}`,
      name,
      fiscalYear: activeFY,
      createdAt: new Date().toISOString(),
      notes: snapshotNotes.trim() || undefined,
      totalBudgetCr: currentSummary.totalBudgetCr,
      totalSpentCr: currentSummary.totalSpentCr,
      categoriesCount: categories.length,
      categories: JSON.parse(JSON.stringify(categories)),
      leadershipSummaries: JSON.parse(JSON.stringify(leadershipSummaries)),
      customColumns: JSON.parse(JSON.stringify(customColumns)),
      kpiCards: JSON.parse(JSON.stringify(kpiCards)),
    };

    const updated = [newSnapshot, ...snapshots];
    setSnapshots(updated);
    try {
      localStorage.setItem("xtelify_aop_snapshots_v1", JSON.stringify(updated));
    } catch {}
    await saveAOPSnapshotToBackend(newSnapshot);

    setIsSaveSnapshotModalOpen(false);
    setSnapshotName("");
    setSnapshotNotes("");
    setNotification({ message: `Snapshot '${name}' captured & saved to MongoDB!`, type: "success" });
  };

  const handleRestoreSnapshot = (snap: AOPSnapshot) => {
    if (snap.categories && Array.isArray(snap.categories)) {
      setCategories(snap.categories);
      saveFinOpsDataForFY(activeFY, { aopCategories: snap.categories });
    }
    if (snap.leadershipSummaries) {
      setLeadershipSummaries(snap.leadershipSummaries);
      saveFinOpsDataForFY(activeFY, { aopLeadershipSummaries: snap.leadershipSummaries });
    }
    if (snap.customColumns && Array.isArray(snap.customColumns)) {
      setCustomColumns(snap.customColumns);
    }
    if (snap.kpiCards && Array.isArray(snap.kpiCards)) {
      setKpiCards(snap.kpiCards);
    }
    persistAOPHierarchyToBackend(activeFY, snap.categories || categories, snap.leadershipSummaries || leadershipSummaries, {
      kpiCards: snap.kpiCards || kpiCards,
      customColumns: snap.customColumns || customColumns,
      trashItems,
    });
    setIsSnapshotDrawerOpen(false);
    setNotification({ message: `AOP Dashboard restored to snapshot '${snap.name}'!`, type: "success" });
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    const updated = snapshots.filter((s) => s.id !== snapshotId);
    setSnapshots(updated);
    try {
      localStorage.setItem("xtelify_aop_snapshots_v1", JSON.stringify(updated));
    } catch {}
    await deleteAOPSnapshotFromBackend(snapshotId);
    setNotification({ message: "Snapshot deleted.", type: "info" });
  };

  // Custom KPI Card Builder Handlers
  const handleSaveKPICard = () => {
    const title = kpiCardTitle.trim();
    if (!title) return;

    if (editingKPICard) {
      const updated = kpiCards.map((c) =>
        c.id === editingKPICard.id
          ? {
              ...c,
              title,
              metricSource: kpiCardMetricSource,
              filterScopeLOB: kpiCardFilterLOB,
              filterScopeCategoryId: kpiCardFilterCategory,
              colorTheme: kpiCardColorTheme,
              formula: kpiCardMetricSource === "CUSTOM_FORMULA" ? kpiCardFormula.trim() : undefined,
              prefix: kpiCardPrefix.trim() || undefined,
              suffix: kpiCardSuffix.trim() || undefined,
            }
          : c
      );
      setKpiCards(updated);
      setNotification({ message: `KPI Card '${title}' updated!`, type: "success" });
    } else {
      const newCard: CustomKPICardDef = {
        id: `kpi_${Date.now()}`,
        title,
        metricSource: kpiCardMetricSource,
        filterScopeLOB: kpiCardFilterLOB,
        filterScopeCategoryId: kpiCardFilterCategory,
        colorTheme: kpiCardColorTheme,
        formula: kpiCardMetricSource === "CUSTOM_FORMULA" ? kpiCardFormula.trim() : undefined,
        prefix: kpiCardPrefix.trim() || undefined,
        suffix: kpiCardSuffix.trim() || undefined,
      };
      setKpiCards([...kpiCards, newCard]);
      setNotification({ message: `Custom KPI Card '${title}' added!`, type: "success" });
    }

    setIsAddKPICardModalOpen(false);
    setEditingKPICard(null);
  };

  const openEditKPICardModal = (card: CustomKPICardDef) => {
    setEditingKPICard(card);
    setKpiCardTitle(card.title);
    setKpiCardMetricSource(card.metricSource);
    setKpiCardFilterLOB(card.filterScopeLOB || "ALL");
    setKpiCardFilterCategory(card.filterScopeCategoryId || "ALL");
    setKpiCardColorTheme(card.colorTheme || "EMERALD");
    setKpiCardFormula(card.formula || "");
    setKpiCardPrefix(card.prefix || "");
    setKpiCardSuffix(card.suffix || "");
    setIsAddKPICardModalOpen(true);
  };

  const handleDeleteKPICard = (cardId: string) => {
    const cardToDelete = kpiCards.find((c) => c.id === cardId);
    setKpiCards(kpiCards.filter((c) => c.id !== cardId));
    setNotification({ message: `KPI Card '${cardToDelete?.title || ""}' removed.`, type: "info" });
  };

  // What-If Sandbox Handlers
  const handleToggleSandbox = () => {
    if (isSandboxActive) {
      handleDiscardSandbox();
    } else {
      liveBackupRef.current = {
        categories: JSON.parse(JSON.stringify(categories)),
        summaries: JSON.parse(JSON.stringify(leadershipSummaries)),
      };
      setIsSandboxActive(true);
      setSandboxGrowthPct(0);
      setNotification({
        message: "Sandbox Mode Activated! Test budget changes and growth sliders without affecting live records.",
        type: "info",
      });
    }
  };

  const handleSandboxGrowthChange = (pct: number) => {
    setSandboxGrowthPct(pct);
    if (!liveBackupRef.current) return;
    const factor = 1 + pct / 100;
    const baseCats = liveBackupRef.current.categories;
    const activeFYNorm = normalizeFYKey(activeFY);

    const simulated = baseCats.map((cat) => {
      const updatedSubs = cat.subComponents.map((sub) => {
        const origBudget = (sub.yearlyData?.[activeFYNorm]?.allocatedBudgetCr !== undefined)
          ? sub.yearlyData[activeFYNorm].allocatedBudgetCr
          : sub.allocatedBudgetCr;
        const newBudget = parseFloat((origBudget * factor).toFixed(2));

        const baseMonths = sub.yearlyData?.[activeFYNorm]?.monthlyData || sub.monthlyData || [];
        const scaledMonths = baseMonths.map((m: any) => {
          const rawAmt = m.amount !== undefined ? m.amount : (m.status === "ACTUAL" ? m.actualSpentCr : m.projectedCr) || 0;
          const scaledAmt = parseFloat((Number(rawAmt) * factor).toFixed(2));
          return {
            ...m,
            amount: scaledAmt,
            budgetCr: parseFloat((newBudget / 12).toFixed(2)),
            actualSpentCr: m.status === "ACTUAL" ? scaledAmt : 0,
            projectedCr: m.status === "PROJECTED" ? scaledAmt : 0,
          };
        });

        const newSpent = parseFloat(scaledMonths.reduce((s: number, m: any) => s + (m.amount || 0), 0).toFixed(2));

        return {
          ...sub,
          allocatedBudgetCr: newBudget,
          totalSpentCr: newSpent,
          monthlyData: scaledMonths,
        };
      });

      const catBudget = parseFloat(updatedSubs.reduce((s, sub) => s + (sub.allocatedBudgetCr || 0), 0).toFixed(2));
      const catSpent = parseFloat(updatedSubs.reduce((s, sub) => s + (sub.totalSpentCr || 0), 0).toFixed(2));

      return {
        ...cat,
        allocatedBudgetCr: catBudget,
        totalSpentCr: catSpent,
        subComponents: updatedSubs,
      };
    });

    setCategories(simulated);
  };

  const handleApplySandbox = () => {
    setIsSandboxActive(false);
    setSandboxGrowthPct(0);
    saveFinOpsDataForFY(activeFY, { aopCategories: categories });
    try {
      localStorage.setItem("xtelify_aop_categories_v3", JSON.stringify(categories));
    } catch {}
    persistAOPHierarchyToBackend(activeFY, categories, leadershipSummaries, {
      kpiCards,
      customColumns,
      trashItems,
    });
    liveBackupRef.current = null;
    setNotification({
      message: "Sandbox applied to Live AOP! Changes saved to database and localStorage.",
      type: "success",
    });
  };

  const handleDiscardSandbox = () => {
    if (liveBackupRef.current) {
      setCategories(liveBackupRef.current.categories);
      setLeadershipSummaries(liveBackupRef.current.summaries);
    }
    setIsSandboxActive(false);
    setSandboxGrowthPct(0);
    liveBackupRef.current = null;
    setNotification({
      message: "Sandbox discarded. Reverted to live database records.",
      type: "info",
    });
  };

  // Safe Math Formula Evaluator for DevOps Unit Economics
  const evaluateRowFormula = (
    formula: string,
    context: {
      budget: number;
      spent: number;
      remaining: number;
      devopsSavings: number;
      mau: number;
      customFields?: Record<string, string | number>;
    }
  ): { value: number | null; display: string } => {
    if (!formula || typeof formula !== "string") return { value: null, display: "—" };

    try {
      let expr = formula.toUpperCase();

      expr = expr.replace(/\bSPEND\b|\bACTUAL\b|\bSPENT\b/g, String(context.spent || 0));
      expr = expr.replace(/\bBUDGET\b|\bALLOCATED\b/g, String(context.budget || 0));
      expr = expr.replace(/\bREMAINING\b|\bBALANCE\b/g, String(context.remaining || 0));
      expr = expr.replace(/\bSAVINGS\b|\bDEVOPS_SAVINGS\b/g, String(context.devopsSavings || 0));
      expr = expr.replace(/\bMAU\b|\BUSIZE\b|\BUSERS\b/g, String(context.mau || 0));

      if (context.customFields) {
        Object.entries(context.customFields).forEach(([key, val]) => {
          const numVal = parseFloat(String(val).replace(/[^0-9.-]/g, "")) || 0;
          const safeKeyRegex = new RegExp(`\\b${key.toUpperCase().replace(/[^A-Z0-9]/g, "_")}\\b`, "g");
          expr = expr.replace(safeKeyRegex, String(numVal));
        });
      }

      if (!/^[0-9+\-*/().\s%]+$/.test(expr)) {
        return { value: null, display: "Invalid Expr" };
      }

      expr = expr.replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");

      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expr});`)();

      if (typeof result !== "number" || isNaN(result) || !isFinite(result)) {
        return { value: null, display: "—" };
      }

      const rounded = parseFloat(result.toFixed(2));
      return { value: rounded, display: String(rounded) };
    } catch {
      return { value: null, display: "Error" };
    }
  };

  const calculateKPISourceValue = (card: CustomKPICardDef): { value: number; formatted: string; subText?: string } => {
    let scopeCategories = categories;
    if (card.filterScopeLOB && card.filterScopeLOB !== "ALL") {
      const targetLOB = card.filterScopeLOB.toUpperCase();
      if (targetLOB === "XSTREAM") {
        scopeCategories = categories.filter((c) => {
          const up = (c.lob || "").toUpperCase();
          const str = `${c.categoryName || ""} ${c.sourceSheet || ""}`.toLowerCase();
          return up === "XSTREAM" || up === "DTH" || up === "HT" || str.includes("dth") || /\bht\b|home\s*terminal/i.test(str);
        });
      } else {
        scopeCategories = categories.filter((c) => c.lob?.toUpperCase() === targetLOB);
      }
    }
    if (card.filterScopeCategoryId && card.filterScopeCategoryId !== "ALL") {
      scopeCategories = scopeCategories.filter((c) => c.id === card.filterScopeCategoryId);
    }

    const totalBudget = scopeCategories.reduce((s, c) => s + (c.allocatedBudgetCr || 0), 0);
    const totalSpent = scopeCategories.reduce((s, c) => s + (c.totalSpentCr || 0), 0);
    const totalRemaining = Math.max(0, totalBudget - totalSpent);

    const cardDevopsSavings = scopeCategories.reduce((s, c) => {
      const subsSavings = c.subComponents?.reduce((subS, sub) => subS + (Number(sub.devopsSavingsCr) || 0), 0) || 0;
      return s + (Number(c.devopsSavingsCr) || 0) + subsSavings;
    }, 0);

    let projectedTotal = 0;
    scopeCategories.forEach((c) => {
      c.subComponents?.forEach((sub) => {
        const yearly = sub.yearlyData?.[normalizeFYKey(activeFY)];
        const m12 = yearly?.monthlyData || sub.monthlyData || [];
        const proj = m12.filter((m: any) => m.status === "PROJECTED").reduce((sum: number, m: any) => sum + (Number(m.amount || m.projectedCr) || 0), 0);
        projectedTotal += proj;
      });
    });

    const mau = currentSummary.yearEndMauMillions || 0;
    const cpu = currentSummary.costPerUserInr || 0;

    switch (card.metricSource) {
      case "TOTAL_BUDGET":
        return {
          value: totalBudget,
          formatted: formatAOPCurrency(totalBudget, displayCurrency),
          subText: `${scopeCategories.length} categories in scope`,
        };
      case "ACTUAL_SPENT":
        return {
          value: totalSpent,
          formatted: formatAOPCurrency(totalSpent, displayCurrency),
          subText: totalBudget > 0 ? `${Math.round((totalSpent / totalBudget) * 100)}% of budget` : undefined,
        };
      case "PROJECTED_SPEND":
        return {
          value: projectedTotal,
          formatted: formatAOPCurrency(projectedTotal, displayCurrency),
          subText: "Remaining forecast run-rate",
        };
      case "REMAINING_BALANCE":
        return {
          value: totalRemaining,
          formatted: formatAOPCurrency(totalRemaining, displayCurrency),
          subText: totalSpent > totalBudget ? "Budget Overrun" : "Available runway",
        };
      case "DEVOPS_SAVINGS":
        return {
          value: cardDevopsSavings,
          formatted: `₹${cardDevopsSavings.toFixed(2)} Cr`,
          subText: "Realized via Spot, CUD & Rightsizing",
        };
      case "YEAR_END_MAU":
        return {
          value: mau,
          formatted: `${mau}M`,
          subText: `+${currentSummary.growthPct}% YoY Target`,
        };
      case "COST_PER_USER":
        return {
          value: cpu,
          formatted: formatAOPCostPerUser(cpu, displayCurrency),
          subText: `${currentSummary.cpuImprovementPct}% Efficiency Gain`,
        };
      case "CUSTOM_FORMULA":
        if (card.formula) {
          const evalRes = evaluateRowFormula(card.formula, {
            budget: totalBudget,
            spent: totalSpent,
            remaining: totalRemaining,
            devopsSavings: cardDevopsSavings,
            mau,
          });
          const prefix = card.prefix || "";
          const suffix = card.suffix || "";
          return {
            value: evalRes.value || 0,
            formatted: `${prefix}${evalRes.display}${suffix}`,
            subText: `Formula: ${card.formula}`,
          };
        }
        return { value: 0, formatted: "0", subText: "No formula defined" };
      default:
        return { value: 0, formatted: "—" };
    }
  };

  const getThemeStyles = (theme?: CustomKPICardDef["colorTheme"]) => {
    const t = String(theme || "EMERALD").toUpperCase();
    switch (t) {
      case "RED":
        return {
          border: "border-rose-500/30 hover:border-rose-500/60",
          bg: "bg-rose-950/20",
          glow: "bg-rose-500/15",
          badge: "bg-rose-500/20 border border-rose-500/40 text-rose-400",
          iconBg: "bg-rose-500/20 border border-rose-500/40 text-rose-400",
          dot: "bg-rose-400",
          text: "text-rose-400",
        };
      case "CYAN":
        return {
          border: "border-cyan-500/30 hover:border-cyan-500/60",
          bg: "bg-cyan-950/20",
          glow: "bg-cyan-500/15",
          badge: "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400",
          iconBg: "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400",
          dot: "bg-cyan-400",
          text: "text-cyan-400",
        };
      case "AMBER":
        return {
          border: "border-amber-500/30 hover:border-amber-500/60",
          bg: "bg-amber-950/20",
          glow: "bg-amber-500/15",
          badge: "bg-amber-500/20 border border-amber-500/40 text-amber-400",
          iconBg: "bg-amber-500/20 border border-amber-500/40 text-amber-400",
          dot: "bg-amber-400",
          text: "text-amber-400",
        };
      case "PURPLE":
        return {
          border: "border-purple-500/30 hover:border-purple-500/60",
          bg: "bg-purple-950/20",
          glow: "bg-purple-500/15",
          badge: "bg-purple-500/20 border border-purple-500/40 text-purple-400",
          iconBg: "bg-purple-500/20 border border-purple-500/40 text-purple-400",
          dot: "bg-purple-400",
          text: "text-purple-400",
        };
      case "BLUE":
        return {
          border: "border-blue-500/30 hover:border-blue-500/60",
          bg: "bg-blue-950/20",
          glow: "bg-blue-500/15",
          badge: "bg-blue-500/20 border border-blue-500/40 text-blue-400",
          iconBg: "bg-blue-500/20 border border-blue-500/40 text-blue-400",
          dot: "bg-blue-400",
          text: "text-blue-400",
        };
      case "EMERALD":
      default:
        return {
          border: "border-emerald-500/30 hover:border-emerald-500/60",
          bg: "bg-emerald-950/20",
          glow: "bg-emerald-500/15",
          badge: "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400",
          iconBg: "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400",
          dot: "bg-emerald-400",
          text: "text-emerald-400",
        };
    }
  };

  const getKPIIcon = (sourceOrIcon?: string) => {
    const s = String(sourceOrIcon || "").toUpperCase();
    if (s.includes("MAU") || s.includes("USER")) return Users;
    if (s.includes("BUDGET") || s.includes("WALLET")) return Wallet;
    if (s.includes("COST") || s.includes("TARGET")) return Target;
    if (s.includes("SAVING") || s.includes("SPARKLE")) return Sparkles;
    if (s.includes("ACTUAL") || s.includes("TRENDING") || s.includes("SPENT")) return TrendingUp;
    if (s.includes("PROJECTED") || s.includes("CALENDAR")) return CalendarRange;
    if (s.includes("REMAINING") || s.includes("DOLLAR") || s.includes("BALANCE")) return DollarSign;
    if (s.includes("FORMULA") || s.includes("CALCULATOR")) return Calculator;
    if (s.includes("DATABASE") || s.includes("DATA")) return Database;
    if (s.includes("CLOUD")) return Cloud;
    if (s.includes("CPU") || s.includes("COMPUTE")) return Cpu;
    if (s.includes("SERVER")) return Server;
    if (s.includes("SHIELD")) return Shield;
    if (s.includes("ZAP")) return Zap;
    return Layers;
  };

  // Inline Budget Save & Cancel
  const handleSaveBudget = () => {
    if (!editingBudgetId) return;
    const val = Math.max(0, parseFloat(editingBudgetValue) || 0);
    const activeFYNorm = normalizeFYKey(activeFY);

    if (editingBudgetId.startsWith("cat-")) {
      const catId = editingBudgetId.replace("cat-", "");
      setCategories((prev) => {
        const updated = prev.map((c) => {
          if (c.id !== catId) return c;
          const prevYearly = c.yearlyData || {};
          return {
            ...c,
            allocatedBudgetCr: val,
            yearlyData: {
              ...prevYearly,
              [activeFYNorm]: {
                ...(prevYearly[activeFYNorm] || {}),
                allocatedBudgetCr: val,
              },
            },
          };
        });
        saveFinOpsDataForFY(activeFYNorm, { aopCategories: updated });
        try {
          localStorage.setItem("xtelify_aop_categories_v3", JSON.stringify(updated));
        } catch {}
        persistAOPHierarchyToBackend(activeFYNorm, updated, leadershipSummaries);
        return updated;
      });
      setNotification({ message: `Major Sub-type budget updated to ₹${val.toFixed(2)} Cr.`, type: "success" });
    } else if (editingBudgetId.startsWith("sub-")) {
      const subId = editingBudgetId.replace("sub-", "");
      setCategories((prev) => {
        const updated = prev.map((c) => {
          const hasSub = c.subComponents.some((s) => s.id === subId);
          if (!hasSub) return c;
          const updatedSubs = c.subComponents.map((s) => {
            if (s.id !== subId) return s;
            const subYearly = s.yearlyData || {};
            return {
              ...s,
              allocatedBudgetCr: val,
              yearlyData: {
                ...subYearly,
                [activeFYNorm]: {
                  ...(subYearly[activeFYNorm] || {}),
                  allocatedBudgetCr: val,
                },
              },
            };
          });
          const totalCatBudget = updatedSubs.reduce((sum, s) => sum + (s.allocatedBudgetCr || 0), 0);
          const prevCatYearly = c.yearlyData || {};
          return {
            ...c,
            allocatedBudgetCr: parseFloat(totalCatBudget.toFixed(2)),
            yearlyData: {
              ...prevCatYearly,
              [activeFYNorm]: {
                ...(prevCatYearly[activeFYNorm] || {}),
                allocatedBudgetCr: parseFloat(totalCatBudget.toFixed(2)),
              },
            },
            subComponents: updatedSubs,
          };
        });
        saveFinOpsDataForFY(activeFYNorm, { aopCategories: updated });
        try {
          localStorage.setItem("xtelify_aop_categories_v3", JSON.stringify(updated));
        } catch {}
        persistAOPHierarchyToBackend(activeFYNorm, updated, leadershipSummaries);
        return updated;
      });
      setNotification({ message: `Sub-component budget updated to ₹${val.toFixed(2)} Cr.`, type: "success" });
    }
    setEditingBudgetId(null);
  };

  // Toggle month between ACTUAL and PROJECTED
  const handleToggleMonthStatus = (
    categoryId: string,
    subId: string,
    monthKey: string
  ) => {
    const activeFYNorm = normalizeFYKey(activeFY);
    setCategories((prev) => {
      const updated = prev.map((cat) => {
        if (cat.id !== categoryId) return cat;

        const updatedSubs = cat.subComponents.map((sub) => {
          if (sub.id !== subId) return sub;

          const existingMonths = sub.monthlyData || [];
          const monthsDict: Record<string, { amount: number; status: "ACTUAL" | "PROJECTED" }> = {};
          const updatedMonths = existingMonths.map((m) => {
            if (m.month === monthKey) {
              const nextStatus: "ACTUAL" | "PROJECTED" = m.status === "ACTUAL" ? "PROJECTED" : "ACTUAL";
              const amt = Number(m.amount !== undefined ? m.amount : (nextStatus === "ACTUAL" ? m.actualSpentCr : m.projectedCr)) || 0;
              monthsDict[m.month] = { amount: amt, status: nextStatus };
              return {
                ...m,
                status: nextStatus,
                isActual: nextStatus === "ACTUAL",
                amount: amt,
                actualSpentCr: nextStatus === "ACTUAL" ? amt : 0,
                projectedCr: nextStatus === "PROJECTED" ? amt : 0,
              };
            }
            const currentStatus = m.status || (m.isActual ? "ACTUAL" : "PROJECTED");
            const curAmt = Number(m.amount !== undefined ? m.amount : (currentStatus === "ACTUAL" ? m.actualSpentCr : m.projectedCr)) || 0;
            monthsDict[m.month] = { amount: curAmt, status: currentStatus };
            return m;
          });

          const actualSum = updatedMonths.filter((m) => m.status === "ACTUAL").reduce((s, m) => s + (m.amount || 0), 0);
          const projSum = updatedMonths.filter((m) => m.status === "PROJECTED").reduce((s, m) => s + (m.amount || 0), 0);
          const fullYearTotal = parseFloat((actualSum + projSum).toFixed(2));
          const subYearly = sub.yearlyData || {};

          return {
            ...sub,
            monthlyData: updatedMonths,
            totalSpentCr: fullYearTotal,
            yearlyData: {
              ...subYearly,
              [activeFYNorm]: {
                ...(subYearly[activeFYNorm] || {}),
                allocatedBudgetCr: sub.allocatedBudgetCr,
                totalSpentCr: fullYearTotal,
                months: monthsDict,
                monthlyData: updatedMonths,
              },
            },
          };
        });

        const newCategorySpent = parseFloat(
          updatedSubs.reduce((sum, s) => sum + (Number(s.totalSpentCr) || 0), 0).toFixed(2)
        );
        const prevCatYearly = cat.yearlyData || {};

        return {
          ...cat,
          subComponents: updatedSubs,
          totalSpentCr: newCategorySpent,
          yearlyData: {
            ...prevCatYearly,
            [activeFYNorm]: {
              ...(prevCatYearly[activeFYNorm] || {}),
              totalSpentCr: newCategorySpent,
            },
          },
        };
      });

      saveFinOpsDataForFY(activeFYNorm, { aopCategories: updated });
      try {
        localStorage.setItem("xtelify_aop_categories_v3", JSON.stringify(updated));
      } catch {}
      persistAOPHierarchyToBackend(activeFYNorm, updated, leadershipSummaries);
      return updated;
    });
  };

  // Dynamic 12-Month Timeline Spend Input (Updates live on every keystroke)
  const handleMonthSpendChange = (
    categoryId: string,
    subId: string,
    monthKey: string,
    spendVal: number
  ) => {
    const cleanSpend = Math.max(0, isNaN(spendVal) ? 0 : parseFloat(spendVal.toFixed(2)));
    const activeFYNorm = normalizeFYKey(activeFY);

    setCategories((prev) => {
      const updated = prev.map((cat) => {
        if (cat.id !== categoryId) return cat;

        const updatedSubs = cat.subComponents.map((sub) => {
          if (sub.id !== subId) return sub;

          const existingMonths = sub.monthlyData || [];
          let monthFound = false;
          const monthsDict: Record<string, { amount: number; status: "ACTUAL" | "PROJECTED" }> = {};
          const updatedMonths = existingMonths.map((m) => {
            if (m.month === monthKey) {
              monthFound = true;
              const currentStatus = m.status || (m.isActual ? "ACTUAL" : "PROJECTED");
              monthsDict[m.month] = { amount: cleanSpend, status: currentStatus };
              return {
                ...m,
                status: currentStatus,
                amount: cleanSpend,
                actualSpentCr: currentStatus === "ACTUAL" ? cleanSpend : 0,
                projectedCr: currentStatus === "PROJECTED" ? cleanSpend : 0,
              };
            }
            const curStatus = m.status || (m.isActual ? "ACTUAL" : "PROJECTED");
            const curAmt = Number(m.amount !== undefined ? m.amount : (curStatus === "ACTUAL" ? m.actualSpentCr : m.projectedCr)) || 0;
            monthsDict[m.month] = { amount: curAmt, status: curStatus };
            return m;
          });

          if (!monthFound) {
            const mMeta = m12Keys.find((k) => k.key === monthKey);
            const defaultActual = mMeta?.defaultActual ?? true;
            const status: "ACTUAL" | "PROJECTED" = defaultActual ? "ACTUAL" : "PROJECTED";
            monthsDict[monthKey] = { amount: cleanSpend, status };
            updatedMonths.push({
              month: monthKey,
              quarter: mMeta ? mMeta.quarter : "Q1",
              budgetCr: parseFloat(((sub.allocatedBudgetCr || 0) / 12).toFixed(2)),
              amount: cleanSpend,
              actualSpentCr: status === "ACTUAL" ? cleanSpend : 0,
              projectedCr: status === "PROJECTED" ? cleanSpend : 0,
              isActual: status === "ACTUAL",
              status,
            });
          }

          // Exact sum of Actual + Projected
          const actualSum = updatedMonths.filter((m) => m.status === "ACTUAL").reduce((s, m) => s + (m.amount || 0), 0);
          const projSum = updatedMonths.filter((m) => m.status === "PROJECTED").reduce((s, m) => s + (m.amount || 0), 0);
          const fullYearTotal = parseFloat((actualSum + projSum).toFixed(2));
          const subYearly = sub.yearlyData || {};

          return {
            ...sub,
            monthlyData: updatedMonths,
            totalSpentCr: fullYearTotal,
            yearlyData: {
              ...subYearly,
              [activeFYNorm]: {
                ...(subYearly[activeFYNorm] || {}),
                allocatedBudgetCr: sub.allocatedBudgetCr,
                totalSpentCr: fullYearTotal,
                months: monthsDict,
                monthlyData: updatedMonths,
              },
            },
          };
        });

        const newCategorySpent = parseFloat(
          updatedSubs.reduce((sum, s) => sum + (Number(s.totalSpentCr) || 0), 0).toFixed(2)
        );
        const newCategoryBudget = parseFloat(
          updatedSubs.reduce((sum, s) => sum + (Number(s.allocatedBudgetCr) || 0), 0).toFixed(2)
        );
        const prevCatYearly = cat.yearlyData || {};

        return {
          ...cat,
          subComponents: updatedSubs,
          totalSpentCr: newCategorySpent,
          allocatedBudgetCr: newCategoryBudget > 0 ? newCategoryBudget : cat.allocatedBudgetCr,
          yearlyData: {
            ...prevCatYearly,
            [activeFYNorm]: {
              ...(prevCatYearly[activeFYNorm] || {}),
              allocatedBudgetCr: newCategoryBudget > 0 ? newCategoryBudget : cat.allocatedBudgetCr,
              totalSpentCr: newCategorySpent,
            },
          },
        };
      });

      saveFinOpsDataForFY(activeFYNorm, { aopCategories: updated });
      try {
        localStorage.setItem("xtelify_aop_categories_v3", JSON.stringify(updated));
      } catch {}
      persistAOPHierarchyToBackend(activeFYNorm, updated, leadershipSummaries);
      return updated;
    });
  };

  // Open Year Data Modal for adding or editing budgets & 12-month data for another year
  const openYearDataModal = (category: AOPCategoryGroup, sub: AOPSubComponent | null) => {
    setYearDataTargetCat(category);
    setYearDataTargetSub(sub);

    const targetFY = normalizeFYKey(activeFY === "FY 2026-27" ? "FY 2027-28" : activeFY);
    setYearDataFY(targetFY);
    const targetId = sub ? sub.id : category.id;
    modalInitKeyRef.current = `${targetId}::${targetFY}`;
    initYearModalData(category, sub, targetFY);
    setIsYearDataModalOpen(true);
  };

  const handleYearDataFYChange = (newFY: string) => {
    const normFY = normalizeFYKey(newFY);
    setYearDataFY(normFY);
    if (yearDataTargetCat) {
      const targetId = yearDataTargetSub ? yearDataTargetSub.id : yearDataTargetCat.id;
      modalInitKeyRef.current = `${targetId}::${normFY}`;
      initYearModalData(yearDataTargetCat, yearDataTargetSub, normFY);
    }
  };

  const handleSaveYearData = () => {
    if (!yearDataTargetCat) return;
    const fyKey = normalizeFYKey(yearDataFY);
    const activeFYNorm = normalizeFYKey(activeFY);
    const bCr = Math.max(0, Number(yearDataBudget) || 0);

    const monthsDict: Record<string, { amount: number; status: "ACTUAL" | "PROJECTED" }> = {};
    let actualSum = 0;
    let projSum = 0;

    const formattedMonths: MonthlyDataPoint[] = yearDataMonths.map((m) => {
      const amt = Math.max(0, Number(m.amount) || 0);
      const stat: "ACTUAL" | "PROJECTED" = m.status === "PROJECTED" ? "PROJECTED" : "ACTUAL";
      if (stat === "ACTUAL") actualSum += amt;
      else projSum += amt;
      monthsDict[m.month] = { amount: amt, status: stat };
      return {
        month: m.month,
        quarter: m.quarter,
        budgetCr: parseFloat((bCr / 12).toFixed(2)),
        actualSpentCr: stat === "ACTUAL" ? amt : 0,
        projectedCr: stat === "PROJECTED" ? amt : 0,
        isActual: stat === "ACTUAL",
        status: stat,
        amount: amt,
      };
    });

    const fullYearTotal = parseFloat((actualSum + projSum).toFixed(2));

    // Update categories immutably
    setCategories((prev) => {
      const targetExists = prev.some((c) => c.id === yearDataTargetCat.id);
      const baseList = targetExists ? prev : [...prev, { ...yearDataTargetCat, subComponents: [] }];

      const updated = baseList.map((cat) => {
        if (cat.id !== yearDataTargetCat.id) return cat;

        const prevYearly = cat.yearlyData || {};

        if (yearDataTargetSub) {
          // Editing a Child Sub-Component
          const updatedSubs = cat.subComponents.map((sub) => {
            if (sub.id !== yearDataTargetSub.id) return sub;
            const subYearly = sub.yearlyData || {};
            return {
              ...sub,
              yearlyData: {
                ...subYearly,
                [fyKey]: {
                  allocatedBudgetCr: bCr,
                  totalSpentCr: fullYearTotal,
                  months: { ...monthsDict },
                  monthlyData: [...formattedMonths],
                },
              },
              ...(fyKey === activeFYNorm
                ? {
                    allocatedBudgetCr: bCr,
                    totalSpentCr: fullYearTotal,
                    monthlyData: [...formattedMonths],
                  }
                : {}),
            };
          });

          // Immediately recalculate parent totals for fyKey
          const parentBudgetForFY = parseFloat(
            updatedSubs
              .reduce(
                (sum, s) =>
                  sum +
                  (s.yearlyData?.[fyKey]?.allocatedBudgetCr ??
                    (fyKey === activeFYNorm ? s.allocatedBudgetCr : 0) ??
                    0),
                0
              )
              .toFixed(2)
          );
          const parentSpentForFY = parseFloat(
            updatedSubs
              .reduce(
                (sum, s) =>
                  sum +
                  (s.yearlyData?.[fyKey]?.totalSpentCr ??
                    (fyKey === activeFYNorm ? s.totalSpentCr : 0) ??
                    0),
                0
              )
              .toFixed(2)
          );

          return {
            ...cat,
            subComponents: updatedSubs,
            yearlyData: {
              ...prevYearly,
              [fyKey]: {
                ...(prevYearly[fyKey] || {}),
                allocatedBudgetCr: parentBudgetForFY,
                totalSpentCr: parentSpentForFY,
              },
            },
            ...(fyKey === activeFYNorm
              ? {
                  allocatedBudgetCr: parentBudgetForFY,
                  totalSpentCr: parentSpentForFY,
                }
              : {}),
          };
        } else {
          // Editing a Parent Major Cost Sub-type (Parent Group)
          const newYearlyEntry = {
            allocatedBudgetCr: bCr,
            totalSpentCr: fullYearTotal,
            months: { ...monthsDict },
            monthlyData: [...formattedMonths],
          };

          // Synchronize/distribute across child sub-components so children also have matching year data
          const childCount = cat.subComponents.length;
          let updatedSubs = cat.subComponents;
          if (childCount > 0) {
            const perChildBudget = parseFloat((bCr / childCount).toFixed(2));
            const perChildSpent = parseFloat((fullYearTotal / childCount).toFixed(2));

            updatedSubs = cat.subComponents.map((sub) => {
              const subYearly = sub.yearlyData || {};
              const subMonthsDict: Record<string, { amount: number; status: "ACTUAL" | "PROJECTED" }> = {};
              const subFormattedMonths: MonthlyDataPoint[] = formattedMonths.map((m) => {
                const subAmt = parseFloat((m.amount / childCount).toFixed(2));
                subMonthsDict[m.month] = { amount: subAmt, status: m.status };
                return {
                  ...m,
                  budgetCr: parseFloat((perChildBudget / 12).toFixed(2)),
                  amount: subAmt,
                  actualSpentCr: m.status === "ACTUAL" ? subAmt : 0,
                  projectedCr: m.status === "PROJECTED" ? subAmt : 0,
                };
              });

              return {
                ...sub,
                yearlyData: {
                  ...subYearly,
                  [fyKey]: {
                    allocatedBudgetCr: perChildBudget,
                    totalSpentCr: perChildSpent,
                    months: subMonthsDict,
                    monthlyData: subFormattedMonths,
                  },
                },
                ...(fyKey === activeFYNorm
                  ? {
                      allocatedBudgetCr: perChildBudget,
                      totalSpentCr: perChildSpent,
                      monthlyData: subFormattedMonths,
                    }
                  : {}),
              };
            });
          }

          return {
            ...cat,
            yearlyData: {
              ...prevYearly,
              [fyKey]: newYearlyEntry,
            },
            subComponents: updatedSubs,
            ...(fyKey === activeFYNorm
              ? {
                  allocatedBudgetCr: bCr,
                  totalSpentCr: fullYearTotal,
                  monthlyData: [...formattedMonths],
                }
              : {}),
          };
        }
      });

      saveFinOpsDataForFY(fyKey, { aopCategories: updated });
      if (fyKey !== activeFYNorm) {
        saveFinOpsDataForFY(activeFYNorm, { aopCategories: updated });
      }
      try {
        localStorage.setItem("xtelify_aop_categories_v3", JSON.stringify(updated));
      } catch {}
      persistAOPHierarchyToBackend(fyKey, updated, leadershipSummaries);

      return updated;
    });

    setIsYearDataModalOpen(false);
    setNotification({
      message: `Successfully saved ${fyKey} data.`,
      type: "success",
    });
  };

  const handleClonePreviousYear = () => {
    const cloned = cloneFinOpsDataFromPreviousYear(activeFY);
    if (cloned.aopCategories) {
      setCategories(cloned.aopCategories);
      saveFinOpsDataForFY(activeFY, {
        aopCategories: cloned.aopCategories,
        aopLeadershipSummaries: cloned.aopLeadershipSummaries,
      });
      setNotification({
        message: `Cloned category structure into ${activeFY} with all budgets reset to ₹0.00 Cr.`,
        type: "success",
      });
    }
  };

  const handleDirectExcelUpload = async (file: File) => {
    try {
      await parseWorkbookFile(file);
      setNotification({
        message: `Excel sheet uploaded successfully for ${activeFY}.`,
        type: "success",
      });
    } catch (err) {
      setNotification({
        message: `Upload failed: ${(err as Error).message}`,
        type: "error",
      });
    }
  };

  const handleAddNewFYInModal = () => {
    if (!newFYInModal.trim()) return;
    addFiscalYear(newFYInModal);
    setCatFormFY(newFYInModal.trim().toUpperCase().startsWith("FY") ? newFYInModal.trim() : `FY ${newFYInModal.trim()}`);
    setIsAddingFYInModal(false);
    setNewFYInModal("");
    setNotification({ message: `Fiscal Year added.`, type: "success" });
  };

  // Recharts ComposedChart data for Quarterly Pacing
  const quarterlyChartData = useMemo(() => {
    return getQuarterlyPacingData(
      filteredCategories,
      selectedPacingCategory,
      selectedPacingComponent,
      displayCurrency,
      84.0
    );
  }, [filteredCategories, selectedPacingCategory, selectedPacingComponent, displayCurrency]);

  // Recharts ComposedChart data for 24-Month Timeline
  const monthlyChartData = useMemo(() => {
    return getMonthlyTimelineData(
      filteredCategories,
      selectedPacingCategory,
      selectedPacingComponent,
      displayCurrency,
      84.0
    );
  }, [filteredCategories, selectedPacingCategory, selectedPacingComponent, displayCurrency]);

  // List of unique sub-components for pacing dropdown
  const availableSubComponents = useMemo(() => {
    const list: { id: string; name: string; categoryName: string }[] = [];
    filteredCategories.forEach((cat) => {
      cat.subComponents.forEach((sub) => {
        list.push({ id: sub.id, name: sub.name, categoryName: cat.categoryName });
      });
    });
    return list;
  }, [filteredCategories]);

  // Line items belonging strictly to active LOB (or all)
  const currentTableItems = useMemo(() => {
    if (activeLOB === "ALL") return items;
    if (activeLOB === "XSTREAM") {
      return items.filter((it) => {
        const st = getItemSubtype(it);
        if (xstreamSubfilter === "DTH") return st === "DTH";
        if (xstreamSubfilter === "HT") return st === "HT";
        if (xstreamSubfilter === "CORE") return st === "XSTREAM";
        return st === "XSTREAM" || st === "DTH" || st === "HT";
      });
    }
    return items.filter((it) => getItemSubtype(it) === activeLOB);
  }, [items, activeLOB, xstreamSubfilter]);

  // Filtered dataset for line items table
  const filteredTableItems = useMemo(() => {
    return currentTableItems.filter((it) => {
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
      if (selectedProject !== "All" && it.project !== selectedProject) return false;
      if (selectedLOB !== "All" && it.lob !== selectedLOB) return false;
      if (selectedCapexOpex !== "All" && it.capexOpex?.toLowerCase() !== selectedCapexOpex.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [currentTableItems, searchQuery, selectedProject, selectedLOB, selectedCapexOpex]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. MULTI-SHEET EXCEL PARSER & ROUTER HANDLER
  // ─────────────────────────────────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setNotification({ message: "The uploaded workbook has no worksheets.", type: "error" });
          return;
        }

        // Ingest Multi-Sheet IPTV & Xstream AOP (2027-2028) Workbook
        const parseResult = parseAOPMultiSheetWorkbook(workbook);

        if (parseResult.categoryGroups.length > 0) {
          setCategories(parseResult.categoryGroups);
          setLeadershipSummaries(parseResult.leadershipSummaries);
          try {
            localStorage.setItem("xtelify_aop_categories_v2", JSON.stringify(parseResult.categoryGroups));
            localStorage.setItem(
              "xtelify_aop_leadership_summaries_v2",
              JSON.stringify(parseResult.leadershipSummaries)
            );
          } catch {}

          // Expand all parsed categories
          const newExpanded: Record<string, boolean> = {};
          parseResult.categoryGroups.forEach((c) => {
            newExpanded[c.id] = true;
          });
          setExpandedCategoryIds(newExpanded);
        }

        // Also update line items table
        if (parseResult.parsedLineItems && parseResult.parsedLineItems.length > 0) {
          setItems((prev) => {
            const updated = [...parseResult.parsedLineItems, ...prev];
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }

        const routedSheetsSummary = parseResult.routedSheets
          .map((s) => `${s.sheetName} → [${s.lob}]`)
          .join(", ");

        setNotification({
          message: `Successfully ingested AOP Workbook (${parseResult.parsedSheetCount} sheets routed across IPTV, Xstream, DTH, and HT LOBs: ${routedSheetsSummary})!`,
          type: "success",
        });

        // Switch to Executive view to show off the visualizer
        setActiveViewMode("EXECUTIVE");

        // Dispatch global event for FinOps sync
        window.dispatchEvent(new CustomEvent("finops:ingest-aop", { detail: { parseResult } }));
      } catch (err: any) {
        console.error("Error reading AOP Excel workbook:", err);
        setNotification({ message: `Failed to parse workbook: ${err.message || String(err)}`, type: "error" });
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Export full AOP workbook
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Leadership Summary
      const summaryRows = [
        ["Line of Business", "Year-End MAU (M)", "Prev Year MAU (M)", "YoY Growth %", "Total Budget (₹ Cr)", "Total Spent (₹ Cr)", "Cost per User (₹)"],
        ["IPTV", leadershipSummaries.IPTV.yearEndMauMillions, leadershipSummaries.IPTV.prevYearMauMillions, `${leadershipSummaries.IPTV.growthPct}%`, leadershipSummaries.IPTV.totalBudgetCr, leadershipSummaries.IPTV.totalSpentCr, leadershipSummaries.IPTV.costPerUserInr],
        ["Xstream (Consolidated)", leadershipSummaries.XSTREAM.yearEndMauMillions, leadershipSummaries.XSTREAM.prevYearMauMillions, `${leadershipSummaries.XSTREAM.growthPct}%`, leadershipSummaries.XSTREAM.totalBudgetCr, leadershipSummaries.XSTREAM.totalSpentCr, leadershipSummaries.XSTREAM.costPerUserInr],
        ["  ├─ DTH (Xstream Pillar)", leadershipSummaries.DTH.yearEndMauMillions, leadershipSummaries.DTH.prevYearMauMillions, `${leadershipSummaries.DTH.growthPct}%`, leadershipSummaries.DTH.totalBudgetCr, leadershipSummaries.DTH.totalSpentCr, leadershipSummaries.DTH.costPerUserInr],
        ["  └─ HT (Xstream Pillar)", leadershipSummaries.HT.yearEndMauMillions, leadershipSummaries.HT.prevYearMauMillions, `${leadershipSummaries.HT.growthPct}%`, leadershipSummaries.HT.totalBudgetCr, leadershipSummaries.HT.totalSpentCr, leadershipSummaries.HT.costPerUserInr],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Leadership Summary");

      // Sheet 2: Categories & Subcomponents
      const catRows = [
        ["LOB", "Main Category", "Source Sheet", "Sub-component", "Vendor / Platform", "Capex / Opex", "Payment Mode", "Allocated Budget (₹ Cr)", "Total Spent (₹ Cr)"],
      ];
      categories.forEach((cat) => {
        cat.subComponents.forEach((sub) => {
          catRows.push([
            cat.lob,
            cat.categoryName,
            cat.sourceSheet,
            sub.name,
            sub.vendorOrPlatform,
            sub.capexOpex,
            sub.paymentMode,
            String(sub.allocatedBudgetCr),
            String(sub.totalSpentCr),
          ]);
        });
      });
      const wsCats = XLSX.utils.aoa_to_sheet(catRows);
      XLSX.utils.book_append_sheet(wb, wsCats, "Categories & Components");

      XLSX.writeFile(wb, `Airtel_AOP_2027_2028_${activeLOB}_Export.xlsx`);
      setNotification({ message: "Exported AOP workbook successfully!", type: "success" });
    } catch (err: any) {
      setNotification({ message: `Export failed: ${err.message}`, type: "error" });
    }
  };

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. HEADER & TOP ACTION BAR (Currency Switch, Upload, Export)
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-orange-300 to-amber-400 tracking-tight">
              AOP Dashboard — IPTV & Xstream (2027–2028)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
              FY 2026 - 2028
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
            Annual Operating Plan multi-sheet workbook ingestion, hierarchical category routing, quarterly pacing, and subscriber unit economics.
          </p>
        </div>

        {/* Action Controls & Currency Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />


          {/* View Mode Toggle: Executive Pacing vs Scoping Table */}
          <div className="flex items-center bg-[#07090E] p-1 rounded-xl border border-white/[0.12] text-xs shadow-inner">
            <button
              onClick={() => setActiveViewMode("EXECUTIVE")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === "EXECUTIVE"
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-md shadow-orange-950/40 font-extrabold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart3 size={13} />
              <span>Executive Pacing</span>
            </button>
            <button
              onClick={() => setActiveViewMode("SCOPING_TABLE")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === "SCOPING_TABLE"
                  ? "bg-slate-700 text-white shadow-md shadow-slate-950/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileSpreadsheet size={13} />
              <span>Scoping Table</span>
            </button>
          </div>

          <button
            onClick={handleToggleSandbox}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
              isSandboxActive
                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-pulse"
                : "text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35"
            }`}
            title="Test budget changes and simulation sliders in isolated sandbox"
          >
            <Zap size={14} className={isSandboxActive ? "text-slate-950 fill-current" : "text-amber-400"} />
            <span>{isSandboxActive ? "⚡ Sandbox Active" : "⚡ What-If Sandbox Mode"}</span>
          </button>

          <button
            onClick={() => {
              setSnapshotName("");
              setSnapshotNotes("");
              setIsSaveSnapshotModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.12] flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 hover:border-white/[0.25]"
            title="Save named checkpoint of current AOP state"
          >
            <Camera size={14} className="text-cyan-400" />
            <span>Save Snapshot</span>
          </button>

          <button
            onClick={() => setIsSnapshotDrawerOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.12] flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 hover:border-white/[0.25]"
            title="View and restore saved checkpoints"
          >
            <Bookmark size={14} className="text-purple-400" />
            <span>Snapshots ({snapshots.length})</span>
          </button>

          <button
            onClick={() => setIsTrashDrawerOpen(true)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
              trashItems.length > 0
                ? "text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 shadow-sm"
                : "text-slate-400 bg-white/[0.05] hover:bg-white/[0.10] border-white/[0.12]"
            }`}
            title="Restore deleted LOBs, categories, sub-components, or columns"
          >
            <RotateCcw size={14} className={trashItems.length > 0 ? "text-rose-400" : "text-slate-400"} />
            <span>Recently Deleted ({trashItems.length})</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-500/40 shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            title="Upload multi-sheet IPTV & Xstream AOP Excel workbook"
          >
            <Upload size={14} />
            <span>Upload AOP Excel</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.12] flex items-center gap-2 transition-all cursor-pointer active:scale-95 hover:border-white/[0.25]"
            title="Export full multi-sheet AOP report to Excel"
          >
            <Download size={14} />
            <span>Export Excel</span>
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

      {/* ── Sandbox Mode Glowing Amber Banner ── */}
      {isSandboxActive && (
        <div className="rounded-2xl p-4 sm:p-5 border-2 border-amber-500/80 bg-gradient-to-r from-amber-950/60 via-orange-950/40 to-amber-950/60 backdrop-blur-xl shadow-[0_0_35px_rgba(245,158,11,0.25)] space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <Zap size={20} className="animate-bounce" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <span>SANDBOX MODE ACTIVE</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/30 text-amber-200 border border-amber-500/50">
                    Simulation Only
                  </span>
                </h4>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  SANDBOX MODE ACTIVE — Test budget changes, add/remove sub-types, or simulate growth sliders without affecting live database records.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                onClick={handleApplySandbox}
                className="px-4 py-2 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <CheckCheck size={14} />
                <span>Apply Sandbox to Live AOP</span>
              </button>
              <button
                onClick={handleDiscardSandbox}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.12] hover:text-white flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <RotateCcw size={13} />
                <span>Discard Sandbox</span>
              </button>
            </div>
          </div>

          {/* % Growth / Scaling Slider */}
          <div className="pt-2 border-t border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-1 max-w-xl">
              <span className="text-slate-300 font-bold whitespace-nowrap flex items-center gap-1">
                <Sliders size={13} className="text-amber-400" />
                <span>% Growth / Scaling Slider:</span>
              </span>
              <input
                type="range"
                min="-50"
                max="100"
                step="5"
                value={sandboxGrowthPct}
                onChange={(e) => handleSandboxGrowthChange(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <span
                className={`font-mono font-extrabold px-2.5 py-0.5 rounded text-xs min-w-[65px] text-center ${
                  sandboxGrowthPct > 0
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : sandboxGrowthPct < 0
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-slate-800 text-slate-300 border border-slate-700"
                }`}
              >
                {sandboxGrowthPct > 0 ? `+${sandboxGrowthPct}%` : `${sandboxGrowthPct}%`}
              </span>
            </div>
            <div className="text-[11px] text-amber-300/80 italic">
              {sandboxGrowthPct !== 0
                ? `Simulating ${sandboxGrowthPct > 0 ? "+" : ""}${sandboxGrowthPct}% traffic/budget variation across run-rate and full-year totals.`
                : "Adjust slider to simulate traffic surges, contract scale-ups, or cost cuts (-50% to +100%)."}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. LOB SELECTOR PILL BAR: [All LOBs] | [IPTV] | [Xstream] | [DTH] | [HT] + Custom
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="p-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {lobs.map((lobItem) => {
            const Icon = getLOBIcon(lobItem.id);
            const isActive = activeLOB === lobItem.id;
            const pillData = getLOBPillData(lobItem.id);
            const isDeletable = lobItem.id !== "ALL" && lobItem.id !== "IPTV" && lobItem.id !== "XSTREAM";

            return (
              <div
                key={lobItem.id}
                onClick={() => handleLOBSelect(lobItem.id)}
                className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/25 to-teal-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.22)] ring-1 ring-emerald-500/40"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent"
                }`}
              >
                <Icon size={15} className={isActive ? "text-emerald-400" : "text-slate-500"} />
                <span>{lobItem.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isActive ? "bg-emerald-500/30 text-emerald-200" : "bg-white/[0.06] text-slate-400"
                  }`}
                >
                  {pillData.budget}
                </span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}

                {isDeletable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLOB(lobItem.id);
                    }}
                    className="ml-1 text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors opacity-70 group-hover:opacity-100"
                    title={`Delete ${lobItem.label}`}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={() => {
              setNewLOBName("");
              setNewLOBMau("10.0");
              setNewLOBGrowth("20.0");
              setNewLOBBudget("50.0");
              setIsAddLOBModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/[0.04] hover:bg-emerald-500/15 text-slate-400 hover:text-emerald-300 border border-dashed border-white/[0.12] hover:border-emerald-500/40 transition-all cursor-pointer"
            title="Create a new AOP Type / LOB"
          >
            <Plus size={13} />
            <span>Add AOP Type / LOB</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="hidden sm:inline">Active Scope:</span>
          <span className="font-bold text-white uppercase tracking-wider">
            {activeLOB === "ALL" ? `Combined ${lobs.length - 1} LOBs` : `${activeLOB} Line of Business`}
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-mono font-semibold">
            {currentSummary.yearEndMauMillions > 0 ? `${currentSummary.yearEndMauMillions}M MAU` : "0.0M MAU"}
          </span>
        </div>

        {/* IPTV Sub-Pillars Filter Bar */}
        {(activeLOB === "IPTV" || activeLOB.startsWith("IPTV_")) && (
          <div className="w-full flex items-center justify-between gap-3 pt-2.5 mt-1 border-t border-white/[0.08] flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
                <Tv size={13} className="text-emerald-400" />
                <span>IPTV Branches:</span>
              </span>
              {[
                { id: "ALL", label: "All IPTV", icon: Tv, color: "text-emerald-400", activeBg: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" },
                { id: "IPTV_CORE", label: "IPTV Core (STB)", icon: Cpu, color: "text-emerald-400", activeBg: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" },
                { id: "IPTV_APP", label: "IPTV App", icon: Globe, color: "text-teal-400", activeBg: "bg-teal-500/20 text-teal-200 border-teal-500/40" },
                { id: "IPTV_VP", label: "VP & VP DR", icon: Server, color: "text-emerald-400", activeBg: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" },
                { id: "IPTV_API", label: "API & Cross-Charge", icon: Building2, color: "text-cyan-400", activeBg: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40" },
              ].map((pillar) => {
                const isPillarActive = (activeLOB === pillar.id) || (pillar.id === "ALL" && activeLOB === "IPTV" && (iptvSubfilter === "ALL" || !iptvSubfilter)) || (activeLOB === "IPTV" && iptvSubfilter === pillar.id);
                const PillarIcon = pillar.icon;
                const pillarCats = categories.filter((c) => {
                  const up = (c.lob || "").toUpperCase();
                  if (up !== "IPTV" && !c.categoryName.toLowerCase().includes("iptv")) return false;
                  if (pillar.id === "ALL") return true;
                  return getIPTVSubstream(c) === pillar.id;
                });
                const pillarBudget = pillarCats.reduce((acc, c) => acc + (c.allocatedBudgetCr || 0), 0);
                return (
                  <button
                    key={pillar.id}
                    onClick={() => {
                      setIptvSubfilter(pillar.id);
                      if (pillar.id !== "ALL") {
                        setActiveLOB(pillar.id);
                        if (onSubtypeChange) onSubtypeChange(pillar.id);
                      } else {
                        setActiveLOB("IPTV");
                        if (onSubtypeChange) onSubtypeChange("IPTV");
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      isPillarActive
                        ? `${pillar.activeBg} shadow-sm ring-1 ring-emerald-500/30 font-bold`
                        : "bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border-transparent"
                    }`}
                  >
                    <PillarIcon size={12} className={pillar.color} />
                    <span>{pillar.label}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/[0.08] text-slate-300">
                      {pillarCats.length} cats{pillarBudget > 0 ? ` • ${formatAOPCurrency(pillarBudget, displayCurrency)}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-emerald-300/80 font-medium">
              IPTV Corporate AOP (2027-2028)
            </div>
          </div>
        )}

        {/* Xstream Sub-Pillars Filter Bar */}
        {(activeLOB === "XSTREAM" || activeLOB === "DTH" || activeLOB === "HT" || activeLOB === "XSTREAM_CORE" || activeLOB === "XSTREAM_SUBPROJECTS") && (
          <div className="w-full flex items-center justify-between gap-3 pt-2.5 mt-1 border-t border-white/[0.08] flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
                <Zap size={13} className="text-cyan-400" />
                <span>Xstream Pillars:</span>
              </span>
              {[
                { id: "ALL", label: "All Xstream (incl. DTH & HT)", icon: Zap, color: "text-cyan-400", activeBg: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40" },
                { id: "DTH", label: "DTH", icon: Radio, color: "text-amber-400", activeBg: "bg-amber-500/20 text-amber-200 border-amber-500/40" },
                { id: "HT", label: "HT (Home Terminal)", icon: Home, color: "text-purple-400", activeBg: "bg-purple-500/20 text-purple-200 border-purple-500/40" },
                { id: "CORE", label: "Xstream Core", icon: Layers, color: "text-cyan-400", activeBg: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40" },
                { id: "SUBPROJECTS", label: "Sub-Projects (Disco, WCF, Search)", icon: Search, color: "text-blue-400", activeBg: "bg-blue-500/20 text-blue-200 border-blue-500/40" },
              ].map((pillar) => {
                const isPillarActive = (activeLOB === pillar.id) || (pillar.id === "ALL" && activeLOB === "XSTREAM" && (xstreamSubfilter === "ALL" || !xstreamSubfilter)) || (xstreamSubfilter === pillar.id);
                const PillarIcon = pillar.icon;
                const pillarCats = categories.filter((c) => {
                  const sub = getXstreamSubstream(c);
                  if (pillar.id === "ALL") {
                    const up = (c.lob || "").toUpperCase();
                    return up === "XSTREAM" || up === "DTH" || up === "HT";
                  }
                  return sub === pillar.id;
                });
                const pillarBudget = pillarCats.reduce((acc, c) => acc + (c.allocatedBudgetCr || 0), 0);
                return (
                  <button
                    key={pillar.id}
                    onClick={() => {
                      setXstreamSubfilter(pillar.id);
                      if (pillar.id !== "ALL") {
                        setActiveLOB(pillar.id);
                        if (onSubtypeChange) onSubtypeChange(pillar.id);
                      } else {
                        setActiveLOB("XSTREAM");
                        if (onSubtypeChange) onSubtypeChange("XSTREAM");
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      isPillarActive
                        ? `${pillar.activeBg} shadow-sm ring-1 ring-cyan-500/30 font-bold`
                        : "bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border-transparent"
                    }`}
                  >
                    <PillarIcon size={12} className={pillar.color} />
                    <span>{pillar.label}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/[0.08] text-slate-300">
                      {pillarCats.length} cats{pillarBudget > 0 ? ` • ${formatAOPCurrency(pillarBudget, displayCurrency)}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-cyan-300/80 font-medium">
              DTH and HT are integrated under Xstream
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. DYNAMIC CUSTOM KPI CARDS (Configurable Builder, Scoped Metrics & Formulas)
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={13} className="text-emerald-400" />
              Executive Top KPIs ({kpiCards.filter((c) => !c.isHidden).length} active)
            </span>
            {kpiCards.some((c) => c.isHidden) && (
              <span className="text-[10px] text-slate-500 font-medium">
                ({kpiCards.filter((c) => c.isHidden).length} hidden)
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setEditingKPICard(null);
              setKpiCardTitle("");
              setKpiCardMetricSource("TOTAL_BUDGET");
              setKpiCardFilterLOB("ALL");
              setKpiCardFilterCategory("ALL");
              setKpiCardColorTheme("EMERALD");
              setKpiCardFormula("SPEND / MAU");
              setKpiCardPrefix("₹");
              setKpiCardSuffix(" Cr");
              setIsAddKPICardModalOpen(true);
            }}
            className="px-3 py-1 rounded-lg text-xs font-bold bg-white/[0.05] hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-white/[0.08] hover:border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus size={13} className="text-emerald-400" />
            <span>+ Add Custom KPI Card</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards
            .filter((c) => !c.isHidden)
            .map((card) => {
              const theme = getThemeStyles(card.colorTheme);
              const IconComp = getKPIIcon(card.icon || card.metricSource);
              const computed = calculateKPISourceValue(card);

              return (
                <div
                  key={card.id}
                  className={`rounded-2xl p-5 border ${theme.border} ${theme.bg} backdrop-blur-xl relative overflow-hidden flex flex-col justify-between group transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)] hover:border-white/[0.25]`}
                >
                  <div
                    className={`absolute top-0 right-0 w-28 h-28 ${theme.glow} rounded-full blur-2xl pointer-events-none group-hover:opacity-100 opacity-60 transition-all`}
                  />

                  {/* Card Header with Title and Actions */}
                  <div className="flex items-start justify-between gap-2 mb-2 relative z-10">
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate" title={card.title}>
                        {card.title}
                      </span>
                      {card.scopeLOB && card.scopeLOB !== "ALL" && (
                        <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Scope: {card.scopeLOB}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Action buttons (Edit & Delete) visible on hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditKPICardModal(card)}
                          className="p-1 rounded-md bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Edit KPI Card configuration"
                        >
                          <Edit3 size={11} />
                        </button>
                        <button
                          onClick={() => handleDeleteKPICard(card.id)}
                          className="p-1 rounded-md bg-white/[0.08] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Remove KPI Card"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>

                      <div className={`p-2 rounded-xl ${theme.badge}`}>
                        <IconComp size={16} />
                      </div>
                    </div>
                  </div>

                  {/* Card Metric Value */}
                  <div className="relative z-10">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-white tracking-tight font-mono">
                        {computed.formatted}
                      </span>
                      {card.unit && !computed.formatted.includes(card.unit) && (
                        <span className="text-xs font-semibold text-slate-400">{card.unit}</span>
                      )}
                    </div>

                    {/* Subtitle / Context Pills */}
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[11px]">
                      {card.metricSource === "FORMULA" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                          fx: {card.formula}
                        </span>
                      ) : computed.subtext ? (
                        <span className="text-slate-400 text-[11px] truncate">{computed.subtext}</span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">
                          {card.scopeCategory && card.scopeCategory !== "ALL" ? `Cat: ${card.scopeCategory}` : "Multi-Source rollup"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

          {/* "+ Add Custom KPI Card" Tile in Grid */}
          <button
            onClick={() => {
              setEditingKPICard(null);
              setKpiCardTitle("");
              setKpiCardMetricSource("TOTAL_BUDGET");
              setKpiCardFilterLOB("ALL");
              setKpiCardFilterCategory("ALL");
              setKpiCardColorTheme("EMERALD");
              setKpiCardFormula("SPEND / MAU");
              setKpiCardPrefix("₹");
              setKpiCardSuffix(" Cr");
              setIsAddKPICardModalOpen(true);
            }}
            className="rounded-2xl p-5 border-2 border-dashed border-white/[0.08] hover:border-emerald-500/40 bg-white/[0.01] hover:bg-emerald-500/[0.03] backdrop-blur-xl flex flex-col items-center justify-center gap-2 text-center group cursor-pointer transition-all min-h-[140px]"
          >
            <div className="p-3 rounded-xl bg-white/[0.04] group-hover:bg-emerald-500/20 text-slate-400 group-hover:text-emerald-400 border border-white/[0.06] group-hover:border-emerald-500/30 transition-all">
              <Plus size={20} />
            </div>
            <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
              + Add Custom KPI Card
            </span>
            <span className="text-[10px] text-slate-500">
              Pick metric source, LOB scope & color
            </span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. EXECUTIVE VIEW: COMPOSEDCHART & EXPANDABLE SUMMARY CARDS
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeViewMode === "EXECUTIVE" && (
        <div className="space-y-6">
          {filteredCategories.length === 0 ? (
            <FinOpsEmptyStateCard
              sectionName="AOP Dashboard"
              fiscalYear={activeFY}
              onCreateNew={() => {
                setCatFormFY(activeFY);
                setCatFormName("");
                setCatFormLOB(activeLOB === "ALL" ? "IPTV" : activeLOB);
                setCatFormSheet("");
                setCatFormCode("CDN");
                setCatFormBudget("0");
                setIsCustomCategoryCodeMode(false);
                setCustomCategoryCodeLabel("");
                setCatFormIcon("Radio");
                setShowIconPicker(false);
                setEditingCategory(null);
                setIsAddCategoryModalOpen(true);
              }}
              onUploadExcel={handleDirectExcelUpload}
              onClonePrevious={handleClonePreviousYear}
              createLabel="+ Create New Major Sub-type"
            />
          ) : (
            <>
              {/* ── Recharts ComposedChart: Quarterly Pacing vs Projections ── */}
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] rounded-2xl p-5 hover:border-white/[0.14] transition-all duration-300">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 size={18} className="text-amber-400" />
                  <span>
                    Quarterly Pacing & Timeline: Actuals vs Projections ({activeLOB === "ALL" ? "All LOBs" : activeLOB})
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Q1–Q4 quarterly pacing and full 24-month horizon (Apr 2026 – Mar 2028). Actual spend tracked against approved AOP allocation.
                </p>
              </div>

              {/* Chart Filter Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Horizon Switch */}
                <div className="flex items-center bg-[#07090E] p-1 rounded-xl border border-white/[0.12] text-xs">
                  <button
                    onClick={() => setPacingHorizon("QUARTERLY")}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      pacingHorizon === "QUARTERLY"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Q1–Q4 Pacing
                  </button>
                  <button
                    onClick={() => setPacingHorizon("MONTHLY")}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      pacingHorizon === "MONTHLY"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    24-Month Timeline
                  </button>
                </div>

                {/* Sub-type / Category Filter */}
                <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-[#07090E] px-3 py-1.5 rounded-xl border border-white/[0.12]">
                  <span className="text-slate-500 font-medium">Sub-type:</span>
                  <select
                    value={selectedPacingCategory}
                    onChange={(e) => {
                      setSelectedPacingCategory(e.target.value);
                      setSelectedPacingComponent("ALL");
                    }}
                    className="bg-transparent text-xs text-amber-300 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-slate-900 text-white">All Sub-types / Categories</option>
                    {categoryCodeOptions.map((opt) => (
                      <option key={opt.code} value={opt.code} className="bg-slate-900 text-amber-200">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Specific Sub-component Drill */}
                <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-[#07090E] px-3 py-1.5 rounded-xl border border-white/[0.12]">
                  <span className="text-slate-500 font-medium">Component:</span>
                  <select
                    value={selectedPacingComponent}
                    onChange={(e) => setSelectedPacingComponent(e.target.value)}
                    className="bg-transparent text-xs text-emerald-300 font-semibold focus:outline-none cursor-pointer max-w-[180px] truncate"
                  >
                    <option value="ALL" className="bg-slate-900 text-white">All Components</option>
                    {availableSubComponents.map((sub) => (
                      <option key={sub.id} value={sub.id} className="bg-slate-900 text-slate-200">
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ComposedChart Container */}
            <div className="h-[340px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={(pacingHorizon === "QUARTERLY" ? quarterlyChartData : monthlyChartData) as any}
                  margin={{ top: 15, right: 20, left: 10, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                  <XAxis
                    dataKey={pacingHorizon === "QUARTERLY" ? "quarter" : "month"}
                    stroke="#64748b"
                    fontSize={11}
                    tick={{ fill: "#94a3b8" }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickFormatter={(v) => formatAOPCurrency(v, displayCurrency)}
                  />
                  <RechartsTooltip
                    content={<CustomAOPTooltip displayCurrency={displayCurrency} />}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                    formatter={(val) => <span className="text-slate-300 font-medium">{val}</span>}
                  />
                  <Bar
                    dataKey="budget"
                    name={`AOP Allocated Budget (${displayCurrency === "INR_CR" ? "₹ Cr" : "$ M"})`}
                    fill="#6366F1"
                    radius={[4, 4, 0, 0]}
                    barSize={pacingHorizon === "QUARTERLY" ? 34 : 12}
                    animationDuration={1000}
                  />
                  <Bar
                    dataKey="actual"
                    name={`Actual Spend (${displayCurrency === "INR_CR" ? "₹ Cr" : "$ M"})`}
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    barSize={pacingHorizon === "QUARTERLY" ? 34 : 12}
                    animationDuration={1000}
                  />
                  <Bar
                    dataKey="projected"
                    name={`Projected Spend (${displayCurrency === "INR_CR" ? "₹ Cr" : "$ M"})`}
                    fill="#06B6D4"
                    radius={[4, 4, 0, 0]}
                    barSize={pacingHorizon === "QUARTERLY" ? 34 : 12}
                    animationDuration={1000}
                  />
                  <Line
                    type="monotone"
                    dataKey="pacing"
                    name={`Pacing Target Benchmark (${displayCurrency === "INR_CR" ? "₹ Cr" : "$ M"})`}
                    stroke="#F59E0B"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#F59E0B" }}
                    animationDuration={1200}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────────────────
              EXPANDABLE SUMMARY CARDS FOR MAJOR COST SUB-TYPES (User-Driven 3-Level Hierarchy)
          ───────────────────────────────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers size={18} className="text-emerald-400" />
                  <span>Major Cost Sub-types & Category Drill-downs</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Expand each major cost sub-type to drill down from leadership summary totals into specific monthly actuals and projections (Apr 2026 – Mar 2028).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  onClick={() => {
                    setCatFormName("");
                    setCatFormLOB(activeLOB === "ALL" ? "IPTV" : activeLOB);
                    setCatFormSheet("");
                    setCatFormCode("CDN");
                    setCatFormBudget("0");
                    setIsCustomCategoryCodeMode(false);
                    setCustomCategoryCodeLabel("");
                    setCatFormIcon("Radio");
                    setShowIconPicker(false);
                    setEditingCategory(null);
                    setIsAddCategoryModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
                  title="Create a new Major Cost Sub-type card"
                >
                  <Plus size={14} />
                  <span>New Major Sub-type</span>
                </button>

                <button
                  onClick={() => setIsManageColumnsModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.1] font-bold cursor-pointer flex items-center gap-1.5 transition-all"
                  title="Manage custom fields across sub-component rows"
                >
                  <Columns size={14} />
                  <span>Manage Columns</span>
                </button>

                {selectedCategoryIds.length > 0 && (
                  <button
                    onClick={handleDeleteSelectedCategories}
                    className="px-3 py-1.5 rounded-lg bg-red-600/25 hover:bg-red-600/35 text-red-200 border border-red-500/50 font-bold cursor-pointer flex items-center gap-1.5 transition-all shadow-sm animate-pulse"
                    title="Delete all selected major sub-types"
                  >
                    <Trash2 size={14} />
                    <span>Delete Selected ({selectedCategoryIds.length})</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    const allOpen: Record<string, boolean> = {};
                    filteredCategories.forEach((c) => (allOpen[c.id] = true));
                    setExpandedCategoryIds(allOpen);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 font-semibold cursor-pointer"
                >
                  Expand All
                </button>
                <button
                  onClick={() => setExpandedCategoryIds({})}
                  className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white font-semibold cursor-pointer"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {filteredCategories.map((category) => {
                const isExpanded = !!expandedCategoryIds[category.id];
                const activeFYNorm = normalizeFYKey(activeFY);
                const parentYearly = category.yearlyData?.[activeFYNorm];

                // Dynamic calculation across 12-month child data
                let childBudgetSum = 0;
                let childActualSpent = 0;
                let childProjected = 0;
                let childActualMonthCounts: number[] = [];

                category.subComponents.forEach((sub) => {
                  const subYearly = sub.yearlyData?.[activeFYNorm];
                  const subB = subYearly?.allocatedBudgetCr !== undefined
                    ? subYearly.allocatedBudgetCr
                    : (activeFYNorm === "FY 2026-27" ? (sub.allocatedBudgetCr || 0) : 0);
                  childBudgetSum += subB;

                  const m12 = subYearly?.monthlyData || (activeFYNorm === "FY 2026-27" ? (sub.monthlyData || []) : []);
                  let subActualCnt = 0;
                  m12.slice(0, 12).forEach((m, idx) => {
                    const isActual = m.status ? m.status === "ACTUAL" : idx < 6;
                    const amt = Number(m.amount !== undefined ? m.amount : (isActual ? m.actualSpentCr : m.projectedCr)) || 0;
                    if (isActual) {
                      childActualSpent += amt;
                      if (amt > 0) subActualCnt++;
                    } else {
                      childProjected += amt;
                    }
                  });
                  if (subActualCnt > 0) childActualMonthCounts.push(subActualCnt);
                });

                // If child sub-components have 0 budget/spend for activeFY (or parent has explicit override), use parent's yearlyData[activeFY]
                let catBudget = childBudgetSum;
                if (catBudget === 0 || (parentYearly?.allocatedBudgetCr !== undefined && parentYearly.allocatedBudgetCr > 0)) {
                  catBudget = parentYearly?.allocatedBudgetCr ?? category.allocatedBudgetCr ?? 0;
                }

                let catActualSpent = parseFloat(childActualSpent.toFixed(2));
                let catProjected = parseFloat(childProjected.toFixed(2));

                if (catActualSpent === 0 && catProjected === 0 && parentYearly) {
                  if (parentYearly.monthlyData && parentYearly.monthlyData.length > 0) {
                    let pAct = 0;
                    let pProj = 0;
                    parentYearly.monthlyData.slice(0, 12).forEach((m, idx) => {
                      const isActual = m.status ? m.status === "ACTUAL" : idx < 6;
                      const amt = Number(m.amount !== undefined ? m.amount : (isActual ? m.actualSpentCr : m.projectedCr)) || 0;
                      if (isActual) pAct += amt;
                      else pProj += amt;
                    });
                    catActualSpent = parseFloat(pAct.toFixed(2));
                    catProjected = parseFloat(pProj.toFixed(2));
                  } else if (parentYearly.totalSpentCr !== undefined) {
                    catActualSpent = parseFloat(parentYearly.totalSpentCr.toFixed(2));
                  }
                }

                const catFullYearTotal = parseFloat((catActualSpent + catProjected).toFixed(2));

                const catAllowedMonthly = catBudget > 0 ? catBudget / 12 : 0;
                const catActiveMonths = childActualMonthCounts.length > 0 ? Math.max(...childActualMonthCounts) : 6;
                const catCurrentRunRate = catActiveMonths > 0 ? catActualSpent / catActiveMonths : 0;
                const catFullYearProjectedTotal = catProjected > 0 ? catFullYearTotal : (catCurrentRunRate * 12);
                const catProjectedBreachCr = catFullYearProjectedTotal - catBudget;

                const catTotalBreached = catFullYearTotal > catBudget && catBudget > 0;
                const catRunRateBreached = (catCurrentRunRate > catAllowedMonthly && catAllowedMonthly > 0) || (catFullYearProjectedTotal > catBudget && catBudget > 0);

                return (
                  <div
                    key={category.id}
                    className={`rounded-2xl border backdrop-blur-xl overflow-hidden transition-all duration-300 ${
                      catTotalBreached
                        ? "bg-red-950/45 border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.25)] hover:border-red-400"
                        : "border-white/[0.08] bg-white/[0.03] shadow-lg hover:border-white/[0.15]"
                    }`}
                  >
                    {/* Category Header Row (Click to Expand / Collapse) */}
                    <div
                      onClick={() => toggleCategoryExpanded(category.id)}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        {/* Checkbox for batch delete */}
                        <div className="pt-1 sm:pt-0" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedCategoryIds.includes(category.id)}
                            onChange={() => {
                              setSelectedCategoryIds((prev) =>
                                prev.includes(category.id)
                                  ? prev.filter((id) => id !== category.id)
                                  : [...prev, category.id]
                              );
                            }}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/40 cursor-pointer shrink-0"
                            title="Select for batch delete"
                          />
                        </div>

                        {(() => {
                          const CatIcon = getCategoryIconComponent(category.categoryCode, category.icon);
                          return (
                            <div className={`p-2.5 rounded-xl border shrink-0 ${getCategoryColorClasses(category.categoryCode)}`}>
                              <CatIcon size={20} />
                            </div>
                          );
                        })()}

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-white tracking-tight">
                              {category.categoryName}
                            </h4>
                            {(() => {
                              const up = (category.lob || "").toUpperCase();
                              if (up === "XSTREAM" || up === "DTH" || up === "HT") {
                                const sub = getXstreamSubstream(category);
                                if (sub === "DTH") {
                                  return (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                      <Radio size={10} /> Xstream · DTH
                                    </span>
                                  );
                                }
                                if (sub === "HT") {
                                  return (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                      <Home size={10} /> Xstream · HT
                                    </span>
                                  );
                                }
                                return (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                                    <Zap size={10} /> Xstream · Core
                                  </span>
                                );
                              }
                              if (up === "IPTV") {
                                const sub = getIPTVSubstream(category);
                                if (sub === "IPTV_CORE") {
                                  return (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                      <Cpu size={10} /> IPTV · Core (STB)
                                    </span>
                                  );
                                }
                                if (sub === "IPTV_APP") {
                                  return (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-teal-500/15 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                                      <Globe size={10} /> IPTV · App
                                    </span>
                                  );
                                }
                                if (sub === "IPTV_VP") {
                                  return (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                      <Server size={10} /> IPTV · VP & VP DR
                                    </span>
                                  );
                                }
                                return (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                                    <Building2 size={10} /> IPTV · API & Cross-Charge
                                  </span>
                                );
                              }
                              return (
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                                  {category.lob}
                                </span>
                              );
                            })()}
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              {getCategoryCodeLabel(category.categoryCode)}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/[0.05] text-slate-400 border border-white/[0.08]">
                              Sheet: {category.sourceSheet}
                            </span>
                            {(() => {
                              let totalDevopsSavings = Number(category.devopsSavingsCr || 0);
                              category.subComponents.forEach((s) => {
                                totalDevopsSavings += Number(s.devopsSavingsCr || 0);
                              });
                              if (totalDevopsSavings > 0) {
                                return (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                                    🌱 DevOps Savings: ₹{totalDevopsSavings.toFixed(2)} Cr
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {category.subComponents.length} sub-components mapped • Hierarchical cost breakdown
                          </p>
                        </div>
                      </div>

                      {/* 4 Live Metrics: Budget (Editable), Actual (YTD), Projected, Full-Year Total */}
                      <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 flex-wrap">
                        {/* 1. BUDGET (Editable) */}
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Budget
                          </span>
                          {editingBudgetId === `cat-${category.id}` ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editingBudgetValue}
                                onChange={(e) => setEditingBudgetValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveBudget();
                                  if (e.key === "Escape") setEditingBudgetId(null);
                                }}
                                className="w-20 bg-slate-900 border border-emerald-400 text-white font-mono font-bold text-xs px-1.5 py-0.5 rounded"
                                autoFocus
                              />
                              <button
                                onClick={handleSaveBudget}
                                className="p-1 bg-emerald-500 text-slate-950 rounded text-xs hover:bg-emerald-400"
                              >
                                <Check size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingBudgetId(`cat-${category.id}`);
                                setEditingBudgetValue(String(catBudget));
                              }}
                              className="text-sm sm:text-base font-black text-white font-mono hover:text-emerald-300 flex items-center justify-end gap-1 group cursor-pointer"
                              title="Click to edit allocated budget"
                            >
                              <span>{formatAOPCurrency(catBudget, displayCurrency)}</span>
                              <Edit3 size={11} className="text-slate-500 group-hover:text-emerald-400 opacity-60" />
                            </button>
                          )}
                        </div>

                        {/* 2. ACTUAL SPENT (YTD) */}
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Actual (YTD)
                          </span>
                          <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">
                            {formatAOPCurrency(catActualSpent, displayCurrency)}
                          </span>
                        </div>

                        {/* 3. PROJECTED (REMAINING) */}
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Projected
                          </span>
                          <span className="text-sm sm:text-base font-bold text-cyan-300 font-mono">
                            {formatAOPCurrency(catProjected, displayCurrency)}
                          </span>
                        </div>

                        {/* 4. FULL-YEAR TOTAL (12-MO SUM) */}
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            12-Mo Sum
                          </span>
                          <span
                            className={`text-sm sm:text-base font-black font-mono ${
                              catTotalBreached ? "text-rose-400" : "text-sky-300"
                            }`}
                          >
                            {formatAOPCurrency(catFullYearTotal, displayCurrency)}
                          </span>
                        </div>

                        {/* Variance Badge */}
                        <div>
                          {catTotalBreached ? (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-black block text-center bg-red-600/30 text-red-200 border border-red-500/80 animate-pulse shadow-sm">
                              +₹{(catFullYearTotal - catBudget).toFixed(2)} Cr Over Budget (BREACHED)
                            </span>
                          ) : (
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold block text-center ${
                                catFullYearTotal < catBudget
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                  : "bg-white/[0.06] text-slate-300 border border-white/[0.1]"
                              }`}
                            >
                              {catFullYearTotal < catBudget
                                ? `-₹${(catBudget - catFullYearTotal).toFixed(2)} Cr Under`
                                : "100% On Budget"}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons: + FY Data, Edit, Delete, Chevron */}
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openYearDataModal(category, null)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1 cursor-pointer"
                            title="Add or edit budgets and 12-month values for another fiscal year (e.g. FY 2027-28)"
                          >
                            <CalendarRange size={13} />
                            <span>+ FY Data</span>
                          </button>
                          <button
                            onClick={() => openEditCategoryModal(category)}
                            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Edit Major Sub-type"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete Major Sub-type"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div className="p-1 rounded-lg bg-white/[0.05] text-slate-400 hover:text-white">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>
                    </div>

                    {/* Visual Rule B: Monthly Spend Rate Exceeded Warning Strip */}
                    {catRunRateBreached && !catTotalBreached && (
                      <div className="mx-4 sm:mx-5 mb-3 p-3 rounded-xl bg-amber-950/45 border border-amber-500/40 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-md">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={16} className="text-amber-400 shrink-0 animate-bounce" />
                          <span>
                            <strong>⚠️ Spend Rate Exceeded:</strong> Current spend rate is{" "}
                            <strong className="text-white">₹{catCurrentRunRate.toFixed(2)} Cr/mo</strong> vs allowed{" "}
                            <strong className="text-white">₹{catAllowedMonthly.toFixed(2)} Cr/mo</strong> ({catBudget.toFixed(2)} Cr/yr = {catAllowedMonthly.toFixed(2)} Cr/mo). At this pace, project will breach budget by{" "}
                            <strong className="text-rose-300 font-bold">₹{catProjectedBreachCr.toFixed(2)} Cr</strong>.
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 self-start sm:self-auto shrink-0">
                          Spend Rate Alert
                        </span>
                      </div>
                    )}

                    {/* Expanded Content: Sub-components List, 12-Month Timeline, & Add Sub-component Button */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-white/[0.06] bg-slate-950/40 p-4 sm:p-5 space-y-4"
                        >
                          <div className="space-y-3">
                            {category.subComponents.map((sub) => {
                              const isSubTimelineOpen = !!expandedSubComponentIds[sub.id];
                              const activeFYNorm = normalizeFYKey(activeFY);
                              const subYearly = sub.yearlyData?.[activeFYNorm];

                              // Dynamic calculation across 12-month inputs
                              const subBudget = subYearly?.allocatedBudgetCr !== undefined
                                ? subYearly.allocatedBudgetCr
                                : (activeFYNorm === "FY 2026-27" ? (sub.allocatedBudgetCr || 0) : (sub.allocatedBudgetCr || 0));
                              const subMonths = subYearly?.monthlyData || sub.monthlyData || [];
                              const m12Data = m12Keys.map((mMeta, idx) => {
                                let found: any = null;
                                if (Array.isArray(subMonths)) {
                                  found = subMonths.find((pt) => pt.month === mMeta.key || (pt.month && pt.month.startsWith(mMeta.shortLabel)));
                                } else if (subMonths && typeof subMonths === "object") {
                                  found = (subMonths as any)[mMeta.key] || (subMonths as any)[mMeta.shortLabel];
                                }
                                const defaultStatus: "ACTUAL" | "PROJECTED" = idx < 6 ? "ACTUAL" : "PROJECTED";
                                const status: "ACTUAL" | "PROJECTED" = found?.status || (found?.isActual ?? (defaultStatus === "ACTUAL") ? "ACTUAL" : "PROJECTED");
                                const rawAmt = found?.amount !== undefined ? found.amount : (status === "ACTUAL" ? (found?.actualSpentCr ?? 0) : (found?.projectedCr ?? found?.actualSpentCr ?? 0));
                                const amount = Number(rawAmt) || 0;
                                return {
                                  ...mMeta,
                                  status,
                                  amount,
                                };
                              });

                              const subActualSpent = parseFloat(
                                m12Data.filter((m) => m.status === "ACTUAL").reduce((s, m) => s + (m.amount || 0), 0).toFixed(2)
                              );
                              const subProjected = parseFloat(
                                m12Data.filter((m) => m.status === "PROJECTED").reduce((s, m) => s + (m.amount || 0), 0).toFixed(2)
                              );
                              const subFullYearTotal = parseFloat((subActualSpent + subProjected).toFixed(2));

                              const subAllowedMonthly = subBudget > 0 ? subBudget / 12 : 0;
                              const subActualMonthsWithData = m12Data.filter((m) => m.status === "ACTUAL" && (m.amount || 0) > 0).length;
                              const subEffectiveActualMonths = subActualMonthsWithData > 0 ? subActualMonthsWithData : Math.max(1, m12Data.filter((m) => m.status === "ACTUAL").length);
                              const subCurrentRunRate = subActualSpent > 0 ? subActualSpent / subEffectiveActualMonths : 0;
                              const subFullYearProjectedTotal = subProjected > 0 ? subFullYearTotal : (subCurrentRunRate * 12);
                              const subProjectedBreachCr = subFullYearProjectedTotal - subBudget;

                              const subTotalBreached = subFullYearTotal > subBudget && subBudget > 0;
                              const subRunRateBreached = (subCurrentRunRate > subAllowedMonthly && subAllowedMonthly > 0) || (subFullYearProjectedTotal > subBudget && subBudget > 0);

                              return (
                                <div
                                  key={sub.id}
                                  className={`rounded-xl border p-4 transition-all ${
                                    subTotalBreached
                                      ? "bg-red-950/45 border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.25)] hover:border-red-400"
                                      : "border-white/[0.06] bg-[#07090E]/60 hover:border-white/[0.12]"
                                  }`}
                                >
                                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h5 className="text-sm font-bold text-white">
                                          {sub.name}
                                        </h5>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                          {sub.vendorOrPlatform}
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/[0.05] text-slate-300 border border-white/[0.08]">
                                          {sub.capexOpex}
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                                          {sub.paymentMode}
                                        </span>

                                        {/* NFA Reference Badge */}
                                        {sub.nfaNumber ? (
                                          <span
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                                              sub.nfaStatus === "NFA Approved"
                                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                                                : sub.nfaStatus === "NFA Pending"
                                                ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                                                : "bg-slate-800 text-slate-300 border-slate-700"
                                            }`}
                                            title={`NFA / GBPA Ref: ${sub.nfaNumber} (${sub.nfaStatus || "Linked"})`}
                                          >
                                            <FileText size={10} />
                                            <span>{sub.nfaNumber}</span>
                                            <span className="text-[9px] opacity-75 font-normal">({sub.nfaStatus || "Linked"})</span>
                                          </span>
                                        ) : (
                                          <button
                                            onClick={() => openEditSubModal(category.id, sub)}
                                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 border border-slate-700/60 cursor-pointer flex items-center gap-1 transition-colors"
                                            title="Click to link an NFA / GBPA reference"
                                          >
                                            <Plus size={10} />
                                            <span>Link NFA</span>
                                          </button>
                                        )}

                                        {/* DevOps Savings Tag */}
                                        {sub.devopsSavingsCr !== undefined && Number(sub.devopsSavingsCr) > 0 && (
                                          <span
                                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-sm"
                                            title={`${sub.devopsSavingsType || "DevOps"} Optimization: ₹${Number(sub.devopsSavingsCr).toFixed(2)} Cr saved${sub.devopsSavingsNotes ? ` — ${sub.devopsSavingsNotes}` : ""}`}
                                          >
                                            <span>🌱 Saved: ₹{Number(sub.devopsSavingsCr).toFixed(2)} Cr</span>
                                            {sub.devopsSavingsType && (
                                              <span className="text-[9px] font-extrabold text-emerald-200 uppercase bg-emerald-800/40 px-1 rounded">
                                                {sub.devopsSavingsType}
                                              </span>
                                            )}
                                          </span>
                                        )}

                                        {/* Dynamic Custom Columns (Standard Input & Calculated Formula) */}
                                        {customColumns.map((col) => {
                                          if (col.type === "FORMULA") {
                                            const computedVal = evaluateRowFormula(
                                              col.formula || "",
                                              sub,
                                              subBudget,
                                              subActualSpent,
                                              Number(sub.devopsSavingsCr || 0)
                                            );
                                            return (
                                              <span
                                                key={col.id}
                                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 shadow-sm"
                                                title={`Formula: ${col.formula || ""}`}
                                              >
                                                <span className="font-mono text-cyan-400 font-bold">fx</span>
                                                <strong className="text-cyan-200 font-semibold">{col.name}: </strong>
                                                <span className="font-mono text-white">
                                                  {col.prefix || ""}{computedVal !== null ? computedVal : "—"}{col.suffix || (col.unit ? ` ${col.unit}` : "")}
                                                </span>
                                              </span>
                                            );
                                          } else {
                                            const val = sub.customFields?.[col.id];
                                            if (val === undefined || val === null || val === "") return null;
                                            return (
                                              <span
                                                key={col.id}
                                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1"
                                              >
                                                <strong className="text-slate-400 font-normal">{col.name}: </strong>
                                                <span className="text-white font-mono">{col.prefix || ""}{val}{col.suffix || (col.unit ? ` ${col.unit}` : "")}</span>
                                              </span>
                                            );
                                          }
                                        })}
                                      </div>
                                      {sub.notes && (
                                        <p className="text-xs text-slate-400">{sub.notes}</p>
                                      )}
                                    </div>

                                    {/* 4 Live Metrics on Child Row: Budget (Editable), Actual, Projected, 12-Mo Sum */}
                                    <div className="flex items-center gap-3 sm:gap-4 self-start lg:self-auto flex-wrap">
                                      {/* 1. BUDGET (Editable) */}
                                      <div className="text-right">
                                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                                          Budget
                                        </span>
                                        {editingBudgetId === `sub-${sub.id}` ? (
                                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              value={editingBudgetValue}
                                              onChange={(e) => setEditingBudgetValue(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") handleSaveBudget();
                                                if (e.key === "Escape") setEditingBudgetId(null);
                                              }}
                                              className="w-20 bg-slate-900 border border-emerald-400 text-white font-mono font-bold text-xs px-1.5 py-0.5 rounded"
                                              autoFocus
                                            />
                                            <button
                                              onClick={handleSaveBudget}
                                              className="p-1 bg-emerald-500 text-slate-950 rounded text-xs hover:bg-emerald-400"
                                            >
                                              <Check size={12} />
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingBudgetId(`sub-${sub.id}`);
                                              setEditingBudgetValue(String(subBudget));
                                            }}
                                            className="text-xs sm:text-sm font-bold font-mono text-white hover:text-emerald-300 flex items-center justify-end gap-1 group cursor-pointer"
                                            title="Click to edit allocated budget"
                                          >
                                            <span>{formatAOPCurrency(subBudget, displayCurrency)}</span>
                                            <Edit3 size={10} className="text-slate-500 group-hover:text-emerald-400 opacity-60" />
                                          </button>
                                        )}
                                      </div>

                                      {/* 2. ACTUAL SPENT (YTD) */}
                                      <div className="text-right">
                                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                                          Actual (YTD)
                                        </span>
                                        <span className="text-xs sm:text-sm font-bold font-mono text-emerald-400">
                                          {formatAOPCurrency(subActualSpent, displayCurrency)}
                                        </span>
                                      </div>

                                      {/* 3. PROJECTED (REMAINING) */}
                                      <div className="text-right">
                                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                                          Projected
                                        </span>
                                        <span className="text-xs sm:text-sm font-bold font-mono text-cyan-300">
                                          {formatAOPCurrency(subProjected, displayCurrency)}
                                        </span>
                                      </div>

                                      {/* 4. FULL-YEAR TOTAL (12-MO SUM) */}
                                      <div className="text-right">
                                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                                          12-Mo Sum
                                        </span>
                                        <div className="flex items-center gap-1.5 justify-end">
                                          <span
                                            className={`text-xs sm:text-sm font-bold font-mono ${
                                              subTotalBreached ? "text-rose-400" : "text-sky-300"
                                            }`}
                                          >
                                            {formatAOPCurrency(subFullYearTotal, displayCurrency)}
                                          </span>
                                          {subTotalBreached && (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-red-600 text-white animate-pulse">
                                              BREACHED
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Action Buttons: + Year Data, 12-Mo Timeline, Chart Focus, Edit, Delete */}
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => openYearDataModal(category, sub)}
                                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1 cursor-pointer"
                                          title="Add or edit budgets and 12-month values for another fiscal year (e.g. FY 2027-28)"
                                        >
                                          <CalendarRange size={13} />
                                          <span>+ Year Data</span>
                                        </button>

                                        <button
                                          onClick={() => toggleSubComponentTimeline(sub.id)}
                                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                            isSubTimelineOpen
                                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                                              : "bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border-white/[0.08]"
                                          }`}
                                        >
                                          <Calendar size={13} />
                                          <span>{isSubTimelineOpen ? "Hide Timeline" : "12-Mo Timeline"}</span>
                                        </button>

                                        <button
                                          onClick={() => {
                                            setSelectedPacingCategory(category.categoryCode);
                                            setSelectedPacingComponent(sub.id);
                                            window.scrollTo({ top: 300, behavior: "smooth" });
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer flex items-center gap-1"
                                          title="Plot this sub-component in the top ComposedChart"
                                        >
                                          <Eye size={13} />
                                          <span>Chart Focus</span>
                                        </button>

                                        <button
                                          onClick={() => openEditSubModal(category.id, sub)}
                                          className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors cursor-pointer"
                                          title="Edit sub-component"
                                        >
                                          <Edit3 size={14} />
                                        </button>

                                        <button
                                          onClick={() => handleDeleteSubComponent(category.id, sub.id)}
                                          className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                                          title="Delete sub-component"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Child Monthly Spend Rate Exceeded Warning */}
                                  {subRunRateBreached && !subTotalBreached && (
                                    <div className="mt-2.5 p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-[11px] flex items-center gap-2">
                                      <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                                      <span>
                                        <strong>⚠️ Spend Rate Exceeded:</strong> Current spend rate is ₹{subCurrentRunRate.toFixed(2)} Cr/mo vs allowed ₹{subAllowedMonthly.toFixed(2)} Cr/mo. At this pace, projected annual spend will breach budget by ₹{subProjectedBreachCr.toFixed(2)} Cr.
                                      </span>
                                    </div>
                                  )}

                                  {/* Interactive 12-Month Horizontal Spend Timeline (Apr – Mar) */}
                                  <AnimatePresence>
                                    {isSubTimelineOpen && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-4 pt-3 border-t border-white/[0.06] overflow-x-auto"
                                      >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                          <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-amber-400" />
                                            <span className="text-xs font-bold text-white">
                                              12-Month Timeline Spend Input (Apr – Mar)
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                              Allowed Spend Rate: ₹{subAllowedMonthly.toFixed(2)} Cr/mo
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-3 text-[11px]">
                                            <span className="text-slate-400">
                                              Actual (YTD):{" "}
                                              <strong className="text-emerald-400 font-mono">
                                                ₹{subActualSpent.toFixed(2)} Cr
                                              </strong>
                                            </span>
                                            <span className="text-slate-400">
                                              Projected:{" "}
                                              <strong className="text-cyan-300 font-mono">
                                                ₹{subProjected.toFixed(2)} Cr
                                              </strong>
                                            </span>
                                            <span className="text-slate-400">
                                              12-Mo Sum:{" "}
                                              <strong className="text-sky-300 font-mono">
                                                ₹{subFullYearTotal.toFixed(2)} Cr
                                              </strong>
                                            </span>
                                            {subTotalBreached && (
                                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-600/30 text-red-300 border border-red-500/80 animate-pulse">
                                                BREACHED
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* 12-Month Horizontal Grid with Clickable ACTUAL/PROJECTED badges */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 text-xs min-w-[720px]">
                                          {m12Data.map((m) => {
                                            const isMonthBreached = m.amount > subAllowedMonthly && subAllowedMonthly > 0;

                                            return (
                                              <div
                                                key={m.key}
                                                className={`p-2 rounded-xl border text-center transition-all ${
                                                  isMonthBreached
                                                    ? "bg-red-950/60 border-red-500/80 text-red-200 ring-1 ring-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                                                    : "bg-[#07090E]/80 border-white/[0.08] hover:border-white/[0.2]"
                                                }`}
                                              >
                                                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                                  <span className="font-bold text-slate-300">{m.shortLabel}</span>
                                                  <span className="text-[9px] text-slate-500 font-mono">{m.quarter}</span>
                                                </div>

                                                {/* Clickable ACTUAL / PROJECTED pill badge */}
                                                <button
                                                  type="button"
                                                  onClick={() => handleToggleMonthStatus(category.id, sub.id, m.key)}
                                                  className={`w-full py-0.5 mb-1.5 rounded text-[8px] font-black tracking-wider uppercase border transition-all cursor-pointer ${
                                                    m.status === "ACTUAL"
                                                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                                                      : "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                                                  }`}
                                                  title={`Status: ${m.status}. Click to toggle.`}
                                                >
                                                  {m.status}
                                                </button>

                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  min="0"
                                                  value={m.amount}
                                                  onChange={(e) =>
                                                    handleMonthSpendChange(
                                                      category.id,
                                                      sub.id,
                                                      m.key,
                                                      parseFloat(e.target.value) || 0
                                                    )
                                                  }
                                                  className={`w-full text-center font-mono font-bold text-xs py-1 px-1 rounded-lg border bg-[#05070A] focus:outline-none transition-all ${
                                                    isMonthBreached
                                                      ? "border-red-500/80 text-red-200 bg-red-950/80 focus:border-red-400"
                                                      : "border-white/[0.1] text-white focus:border-emerald-400"
                                                  }`}
                                                />
                                                <div className="mt-1 text-[9px] font-mono truncate">
                                                  {isMonthBreached ? (
                                                    <span className="text-red-400 font-extrabold flex items-center justify-center gap-0.5">
                                                      <AlertTriangle size={9} /> Exceeds
                                                    </span>
                                                  ) : (
                                                    <span className="text-slate-500">₹{subAllowedMonthly.toFixed(2)}</span>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}

                            {/* + Add Sub-component button at bottom of list */}
                            <button
                              onClick={() => {
                                setTargetCategoryIdForSub(category.id);
                                setSubFormName("");
                                setSubFormVendor("");
                                setSubFormNotes("");
                                setSubFormCapexOpex("Opex");
                                setSubFormPaymentMode("Monthly");
                                setSubFormBudget("10.0");
                                setSubFormCustomFields({});
                                setEditingSubComponent(null);
                                setIsAddSubModalOpen(true);
                              }}
                              className="w-full py-2.5 rounded-xl border border-dashed border-white/[0.15] hover:border-emerald-500/50 bg-white/[0.02] hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                            >
                              <Plus size={15} />
                              <span>Add Sub-component</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          5. SCOPING TABLE VIEW: EXACT 7 COLUMNS (Preserved for compatibility)
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeViewMode === "SCOPING_TABLE" && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Project, Cost Component, Usecase, or LOB..."
                className="w-full bg-[#07090E]/80 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
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

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  setEditingItem({
                    id: `aop-manual-${Date.now()}`,
                    project: "IPTV NextGen Infrastructure",
                    costComponent: "",
                    usecase: "",
                    lob: activeLOB === "ALL" ? "iptv" : activeLOB.toLowerCase(),
                    amount: null,
                    totalSpent: null,
                    paymentMode: "Monthly",
                    capexOpex: "Opex",
                    subtype: activeLOB === "ALL" ? "IPTV" : (activeLOB as any),
                    customFields: {},
                  });
                  setIsModalOpen(true);
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border border-violet-500/40 flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus size={14} />
                <span>Add Line Item</span>
              </button>
            </div>
          </div>

          {/* Master Table */}
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-amber-400" />
                <span>AOP Line Items ({activeLOB})</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/[0.06] text-slate-300">
                  {filteredTableItems.length} Rows
                </span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-3.5 px-4">Project (Col A)</th>
                    <th className="py-3.5 px-4">Cost Component (Col B)</th>
                    <th className="py-3.5 px-4">Usecase (Col C)</th>
                    <th className="py-3.5 px-3">LOB (Col D)</th>
                    <th className="py-3.5 px-4 text-right">Allocated Budget (Col E)</th>
                    <th className="py-3.5 px-4 text-right">Total Spent</th>
                    <th className="py-3.5 px-3">Payment Mode (Col F)</th>
                    <th className="py-3.5 px-3">Capex/Opex (Col G)</th>
                    <th className="py-3.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredTableItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500 text-xs font-medium">
                        No AOP line items found for {activeFY} ({activeLOB === "ALL" ? "All LOBs" : activeLOB}).
                      </td>
                    </tr>
                  ) : (
                    filteredTableItems.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-200">{item.project}</td>
                      <td className="py-3 px-4 text-white font-medium">{item.costComponent}</td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={item.usecase}>
                        {item.usecase}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                          {item.lob || getItemSubtype(item)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {formatAOPCurrency(item.amount, displayCurrency)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sky-400">
                        {formatAOPCurrency(item.totalSpent, displayCurrency)}
                      </td>
                      <td className="py-3 px-3 text-slate-300">{item.paymentMode || "Monthly"}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            item.capexOpex?.toLowerCase().includes("capex")
                              ? "bg-indigo-500/20 text-indigo-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {item.capexOpex || "Opex"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setIsModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 cursor-pointer"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => {
                              setItems((prev) => prev.filter((it) => it.id !== item.id));
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Line Item Modal */}
      <AnimatePresence>
        {isModalOpen && editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0B0F19] border border-slate-700 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 size={16} className="text-amber-400" />
                  <span>Edit AOP Line Item</span>
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Project</label>
                  <input
                    type="text"
                    value={editingItem.project}
                    onChange={(e) => setEditingItem({ ...editingItem, project: e.target.value })}
                    className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Cost Component</label>
                  <input
                    type="text"
                    value={editingItem.costComponent}
                    onChange={(e) => setEditingItem({ ...editingItem, costComponent: e.target.value })}
                    className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Usecase</label>
                  <textarea
                    rows={2}
                    value={editingItem.usecase}
                    onChange={(e) => setEditingItem({ ...editingItem, usecase: e.target.value })}
                    className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Allocated Budget (₹ Cr)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingItem.amount ?? ""}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          amount: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Total Spent (₹ Cr)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingItem.totalSpent ?? ""}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          totalSpent: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Payment Mode</label>
                    <select
                      value={editingItem.paymentMode || "Monthly"}
                      onChange={(e) => setEditingItem({ ...editingItem, paymentMode: e.target.value })}
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Annual">Annual</option>
                      <option value="One time">One time</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Capex / Opex</label>
                    <select
                      value={editingItem.capexOpex || "Opex"}
                      onChange={(e) => setEditingItem({ ...editingItem, capexOpex: e.target.value })}
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="Opex">Opex</option>
                      <option value="Capex">Capex</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setItems((prev) => {
                      const idx = prev.findIndex((it) => it.id === editingItem.id);
                      if (idx >= 0) {
                        const copy = [...prev];
                        copy[idx] = editingItem;
                        return copy;
                      }
                      return [editingItem, ...prev];
                    });
                    setIsModalOpen(false);
                    setNotification({ message: "Line item saved successfully!", type: "success" });
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 shadow-lg cursor-pointer"
                >
                  Save Line Item
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 1. Add AOP Type / LOB Modal */}
        {isAddLOBModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0B0F19] border border-slate-700/80 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus size={16} className="text-emerald-400" />
                  <span>Add AOP Type / LOB</span>
                </h3>
                <button
                  onClick={() => setIsAddLOBModalOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">
                    LOB Name / Identifier <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newLOBName}
                    onChange={(e) => setNewLOBName(e.target.value)}
                    placeholder="e.g. Broadband, Fiber, Cloud Security, Enterprise"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Year-End MAU (M)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newLOBMau}
                      onChange={(e) => setNewLOBMau(e.target.value)}
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">YoY Growth (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newLOBGrowth}
                      onChange={(e) => setNewLOBGrowth(e.target.value)}
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Initial AOP Budget (₹ Cr)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newLOBBudget}
                    onChange={(e) => setNewLOBBudget(e.target.value)}
                    className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddLOBModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddLOB}
                  disabled={!newLOBName.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create LOB Scope
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 2. Add / Edit Major Sub-type Modal */}
        {(isAddCategoryModalOpen || editingCategory) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0B0F19] border border-slate-700/80 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers size={16} className="text-emerald-400" />
                  <span>{editingCategory ? "Edit Major Cost Sub-type" : "New Major Cost Sub-type"}</span>
                </h3>
                <button
                  onClick={() => {
                    setIsAddCategoryModalOpen(false);
                    setEditingCategory(null);
                  }}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Dynamic LOB-Specific Presets */}
              {!editingCategory && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                      <Sparkles size={12} className="text-emerald-400" />
                      <span>
                        Quick Suggestions (
                        {catFormLOB === "IPTV" || catFormLOB.startsWith("IPTV")
                          ? "IPTV Corporate Presets"
                          : catFormLOB === "XSTREAM" || catFormLOB === "DTH" || catFormLOB === "HT" || catFormLOB.startsWith("XSTREAM")
                          ? "Xstream Corporate Presets"
                          : `${catFormLOB} Presets`}
                        ):
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      IPTV & Xstream AOP (2027-2028)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-0.5 custom-scrollbar">
                    {getPresetsForLOB(catFormLOB, customCatalog).map((sug) => (
                      <button
                        key={sug.id || sug.name}
                        type="button"
                        onClick={() => {
                          setCatFormName(sug.name);
                          setCatFormSheet(sug.sourceSheet);
                          if (sug.defaultBudgetCr) {
                            setCatFormBudget(String(sug.defaultBudgetCr));
                          }
                          setCatFormCode(sug.categoryCode);
                          setCatFormIcon(sug.icon || "Server");
                          setIsCustomCategoryCodeMode(false);
                        }}
                        className="group/pill inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white/[0.05] hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-white/[0.08] hover:border-emerald-500/40 transition-all cursor-pointer text-left"
                      >
                        <span>+ {sug.name}</span>
                        {sug.isCustom && (
                          <span
                            onClick={async (e) => {
                              e.stopPropagation();
                              await deleteCustomCatalogSubtype(sug.id || sug.name);
                              setCustomCatalog(getCustomCatalog());
                            }}
                            title="Delete custom suggestion"
                            className="text-slate-400 hover:text-rose-400 ml-1 p-0.5 rounded cursor-pointer"
                          >
                            <X size={11} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">
                    Major Sub-type Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={catFormName}
                    onChange={(e) => setCatFormName(e.target.value)}
                    placeholder="e.g. CDN (GCP / AWS / Akamai / NLD Lines)"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Assigned LOB</label>
                    <select
                      value={catFormLOB}
                      onChange={(e) => setCatFormLOB(e.target.value)}
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                    >
                      <optgroup label="Core LOBs" className="bg-slate-900 text-slate-400 font-semibold">
                        <option value="IPTV" className="bg-slate-900 text-emerald-300 font-semibold">IPTV</option>
                        <option value="XSTREAM" className="bg-slate-900 text-cyan-300 font-semibold">Xstream</option>
                      </optgroup>
                      <optgroup label="IPTV Sub-Branches" className="bg-slate-900 text-emerald-400 font-semibold">
                        <option value="IPTV_CORE" className="bg-slate-900 text-white">IPTV Core (STB)</option>
                        <option value="IPTV_APP" className="bg-slate-900 text-white">IPTV App</option>
                        <option value="IPTV_VP" className="bg-slate-900 text-white">VP & VP DR</option>
                        <option value="IPTV_API" className="bg-slate-900 text-white">API & Cross-Charge</option>
                        {customCatalog.lobs
                          .filter((l) => l.parentId === "IPTV" && !["IPTV_CORE", "IPTV_APP", "IPTV_VP", "IPTV_API"].includes(l.id))
                          .map((cl) => (
                            <option key={cl.id} value={cl.id} className="bg-slate-900 text-emerald-200">
                              {cl.label}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Xstream Sub-Branches" className="bg-slate-900 text-cyan-400 font-semibold">
                        <option value="DTH" className="bg-slate-900 text-white">DTH</option>
                        <option value="HT" className="bg-slate-900 text-white">HT (Home Terminal)</option>
                        <option value="XSTREAM_CORE" className="bg-slate-900 text-white">Xstream Core</option>
                        <option value="XSTREAM_SUBPROJECTS" className="bg-slate-900 text-white">Sub-Projects (Disco, WCF, Search)</option>
                        {customCatalog.lobs
                          .filter((l) => l.parentId === "XSTREAM" && !["DTH", "HT", "XSTREAM_CORE", "XSTREAM_SUBPROJECTS"].includes(l.id))
                          .map((cl) => (
                            <option key={cl.id} value={cl.id} className="bg-slate-900 text-cyan-200">
                              {cl.label}
                            </option>
                          ))}
                      </optgroup>
                      {customCatalog.lobs
                        .filter((l) => (!l.parentId || l.parentId === "TOP") && !["IPTV", "XSTREAM", "ALL"].includes(l.id.toUpperCase()))
                        .map((cl) => (
                          <option key={cl.id} value={cl.id} className="bg-slate-900 text-purple-300 font-semibold">
                            {cl.label}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-400 font-semibold">Fiscal Year (Apr – Mar)</label>
                      <button
                        type="button"
                        onClick={() => setIsAddingFYInModal(!isAddingFYInModal)}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold hover:underline cursor-pointer"
                      >
                        {isAddingFYInModal ? "Cancel" : "+ Add New Year"}
                      </button>
                    </div>
                    {isAddingFYInModal ? (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newFYInModal}
                          onChange={(e) => setNewFYInModal(e.target.value)}
                          placeholder="e.g. FY 2027-28"
                          className="flex-1 bg-[#07090E] border border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleAddNewFYInModal}
                          className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <select
                        value={catFormFY}
                        onChange={(e) => setCatFormFY(e.target.value)}
                        className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400 font-mono"
                      >
                        {getFiscalYears().map((y) => (
                          <option key={y.id} value={y.id} className="bg-slate-900 text-white">
                            {y.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-slate-400 font-semibold text-xs flex items-center gap-1.5">
                        <Tag size={13} className="text-emerald-400" />
                        <span>Category Code / Icon</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowIconPicker(!showIconPicker)}
                          className="text-[10px] text-slate-400 hover:text-slate-200 font-semibold cursor-pointer"
                        >
                          {showIconPicker ? "Hide Icons" : "Change Icon"}
                        </button>
                        <span className="text-slate-600 text-[10px]">•</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !isCustomCategoryCodeMode;
                            setIsCustomCategoryCodeMode(next);
                            if (next) {
                              if (!customCategoryCodeLabel) {
                                setCustomCategoryCodeLabel(catFormName.trim() || "");
                              }
                              setShowIconPicker(true);
                            }
                          }}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold hover:underline cursor-pointer"
                        >
                          {isCustomCategoryCodeMode ? "Choose Preset" : "+ Add Different"}
                        </button>
                      </div>
                    </div>

                    {!isCustomCategoryCodeMode ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={catFormCode}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "__CUSTOM__") {
                              setIsCustomCategoryCodeMode(true);
                              if (!customCategoryCodeLabel) {
                                setCustomCategoryCodeLabel(catFormName.trim() || "");
                              }
                              setShowIconPicker(true);
                            } else {
                              setCatFormCode(val);
                              const found = categoryCodeOptions.find((o) => o.code === val);
                              if (found?.icon) setCatFormIcon(found.icon);
                            }
                          }}
                          className="flex-1 bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400 text-xs"
                        >
                          <optgroup
                            label={
                              catFormLOB === "IPTV" || catFormLOB.startsWith("IPTV")
                                ? "IPTV Built-in Categories"
                                : catFormLOB === "XSTREAM" || catFormLOB === "DTH" || catFormLOB === "HT" || catFormLOB.startsWith("XSTREAM")
                                ? "Xstream Built-in Categories"
                                : "Standard Corporate Categories"
                            }
                            className="bg-slate-900 text-slate-400 font-semibold"
                          >
                            {getCategoryCodesForLOB(catFormLOB, customCatalog)
                              .filter((opt) => !opt.isCustom)
                              .map((opt) => (
                                <option key={opt.code} value={opt.code} className="bg-slate-900 text-white font-normal">
                                  {opt.label} ({opt.code})
                                </option>
                              ))}
                          </optgroup>
                          {categoryCodeOptions.some((opt) => opt.isCustom) && (
                            <optgroup label="Custom Saved Categories" className="bg-slate-900 text-emerald-400 font-semibold">
                              {categoryCodeOptions
                                .filter((opt) => opt.isCustom)
                                .map((opt) => (
                                  <option key={opt.code} value={opt.code} className="bg-slate-900 text-emerald-200 font-normal">
                                    ⭐ {opt.label} ({opt.code})
                                  </option>
                                ))}
                            </optgroup>
                          )}
                          <option value="__CUSTOM__" className="bg-emerald-950 text-emerald-300 font-bold">
                            + Add Different Category Code / Icon...
                          </option>
                        </select>

                        {/* Interactive Icon Button */}
                        {(() => {
                          const CurrentFormIcon = getCategoryIconComponent(catFormCode, catFormIcon);
                          return (
                            <button
                              type="button"
                              onClick={() => setShowIconPicker(!showIconPicker)}
                              title={`Active Icon: ${catFormIcon}. Click to pick a different icon.`}
                              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                                showIconPicker
                                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40"
                                  : "bg-[#07090E] border-slate-700 text-slate-300 hover:text-white hover:border-slate-600"
                              }`}
                            >
                              <CurrentFormIcon size={15} className="text-emerald-400" />
                              <span className="font-mono text-[11px] hidden sm:inline">{catFormIcon}</span>
                              <ChevronDown size={12} className={`text-slate-400 transition-transform ${showIconPicker ? "rotate-180" : ""}`} />
                            </button>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={customCategoryCodeLabel}
                              onChange={(e) => {
                                setCustomCategoryCodeLabel(e.target.value);
                                setCatFormCode(e.target.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_") || "CUSTOM");
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleSaveCustomCategoryCode();
                                }
                              }}
                              placeholder="Enter custom category name..."
                              className="w-full bg-[#07090E] border border-emerald-500/60 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400 text-xs placeholder-slate-500 font-medium"
                              autoFocus
                            />
                          </div>

                          {/* Icon Button in Custom Mode */}
                          {(() => {
                            const CurrentFormIcon = getCategoryIconComponent(catFormCode, catFormIcon);
                            return (
                              <button
                                type="button"
                                onClick={() => setShowIconPicker(!showIconPicker)}
                                title={`Active Icon: ${catFormIcon}. Click to change.`}
                                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                                  showIconPicker
                                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40"
                                    : "bg-[#07090E] border-slate-700 text-slate-300 hover:text-white hover:border-slate-600"
                                }`}
                              >
                                <CurrentFormIcon size={15} className="text-emerald-400" />
                                <ChevronDown size={12} className={`text-slate-400 transition-transform ${showIconPicker ? "rotate-180" : ""}`} />
                              </button>
                            );
                          })()}

                          {/* Add & Save Button */}
                          <button
                            type="button"
                            onClick={handleSaveCustomCategoryCode}
                            disabled={!customCategoryCodeLabel.trim()}
                            className="px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1 shrink-0"
                            title="Save and select this category"
                          >
                            <Check size={13} />
                            <span>Add</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          <span className="text-emerald-400 font-bold">Code:</span>{" "}
                          <span className="font-mono text-emerald-300">
                            {customCategoryCodeLabel.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_") || "CUSTOM"}
                          </span>
                          {" • "}
                          <span>Press Enter or Add to save to preset list</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1 text-xs">Source Sheet Tag</label>
                    <input
                      type="text"
                      value={catFormSheet}
                      onChange={(e) => setCatFormSheet(e.target.value)}
                      placeholder="e.g. IPTV CDN, Xstream SaaS"
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400 text-xs"
                    />
                  </div>
                </div>

                {/* Custom Categories Chips if any exist */}
                {categoryCodeOptions.some((o) => o.isCustom) && (
                  <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 font-semibold">Saved Custom Categories:</span>
                    {categoryCodeOptions
                      .filter((o) => o.isCustom)
                      .map((customOpt) => {
                        const CustomIcon = getCategoryIconComponent(customOpt.code, customOpt.icon);
                        const isCurrent = catFormCode === customOpt.code;
                        return (
                          <span
                            key={customOpt.code}
                            onClick={() => {
                              setCatFormCode(customOpt.code);
                              if (customOpt.icon) setCatFormIcon(customOpt.icon);
                              setIsCustomCategoryCodeMode(false);
                            }}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono border cursor-pointer transition-all ${
                              isCurrent
                                ? "bg-emerald-500/25 text-emerald-300 border-emerald-500/60 ring-1 ring-emerald-500/40"
                                : "bg-white/[0.04] text-slate-300 border-white/[0.1] hover:border-slate-500 hover:text-white"
                            }`}
                            title={`Select ${customOpt.label}`}
                          >
                            <CustomIcon size={11} className="text-emerald-400" />
                            <span>{customOpt.label}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomCategoryCode(customOpt.code);
                              }}
                              title="Delete this custom category"
                              className="text-slate-400 hover:text-rose-400 ml-0.5 cursor-pointer"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        );
                      })}
                  </div>
                )}

                {/* Visual Icon Picker Palette (16 selectable icons) */}
                {showIconPicker && (
                  <div className="p-3 rounded-xl bg-[#05070B] border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
                        <Sparkles size={13} className="text-emerald-400" />
                        <span>Choose Category Icon (16 icons available)</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">
                          Selected: {catFormIcon}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowIconPicker(false)}
                          className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                          title="Close icon picker"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 max-h-40 overflow-y-auto p-1 custom-scrollbar">
                      {SELECTABLE_CATEGORY_ICONS.map((item) => {
                        const IconComponent = item.icon;
                        const isSelected = catFormIcon === item.name;
                        return (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => {
                              setCatFormIcon(item.name);
                            }}
                            title={item.label}
                            className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                              isSelected
                                ? "bg-emerald-500/25 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/50"
                                : "bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08]"
                            }`}
                          >
                            <IconComponent size={16} />
                            <span className="text-[9px] truncate max-w-full font-mono">{item.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Allocated Budget (₹ Cr)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={catFormBudget}
                    onChange={(e) => setCatFormBudget(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddCategoryModalOpen(false);
                    setEditingCategory(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={editingCategory ? handleEditCategory : handleAddCategory}
                  disabled={!catFormName.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingCategory ? "Save Changes" : "Create Major Sub-type"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 3. Add / Edit Child Sub-component Modal */}
        {(isAddSubModalOpen || editingSubComponent) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0B0F19] border border-slate-700/80 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus size={16} className="text-cyan-400" />
                  <span>{editingSubComponent ? "Edit Sub-component" : "Add Child Sub-component"}</span>
                </h3>
                <button
                  onClick={() => {
                    setIsAddSubModalOpen(false);
                    setEditingSubComponent(null);
                  }}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Suggestions pills */}
              {!editingSubComponent && (
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">Quick Suggestions:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: "Akamai Media Delivery CDN", vendor: "Akamai Technologies" },
                      { name: "Cloudflare Stream & Argo", vendor: "Cloudflare" },
                      { name: "AWS S3 Origin Storage", vendor: "Amazon Web Services" },
                      { name: "GCP GKE Video Cluster", vendor: "Google Cloud" },
                      { name: "Tableau Server BI", vendor: "Salesforce" },
                      { name: "TnM Engineering Squad", vendor: "Wipro / Infosys" },
                    ].map((sug) => (
                      <button
                        key={sug.name}
                        type="button"
                        onClick={() => {
                          setSubFormName(sug.name);
                          setSubFormVendor(sug.vendor);
                        }}
                        className="px-2 py-1 rounded text-[10px] font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] cursor-pointer"
                      >
                        + {sug.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">
                    Sub-component Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={subFormName}
                    onChange={(e) => setSubFormName(e.target.value)}
                    placeholder="e.g. Akamai Media Delivery CDN"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Vendor / Platform</label>
                    <input
                      type="text"
                      value={subFormVendor}
                      onChange={(e) => setSubFormVendor(e.target.value)}
                      placeholder="e.g. Akamai Technologies, Google Cloud"
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Allocated Budget (₹ Cr)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={subFormBudget}
                      onChange={(e) => setSubFormBudget(e.target.value)}
                      placeholder="10.0"
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Capex / Opex</label>
                    <select
                      value={subFormCapexOpex}
                      onChange={(e) => setSubFormCapexOpex(e.target.value as "Opex" | "Capex")}
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="Opex" className="bg-slate-900 text-white">Opex</option>
                      <option value="Capex" className="bg-slate-900 text-white">Capex</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Payment Mode</label>
                    <select
                      value={subFormPaymentMode}
                      onChange={(e) => setSubFormPaymentMode(e.target.value as "Monthly" | "One time" | "Annual")}
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="Monthly" className="bg-slate-900 text-white">Monthly</option>
                      <option value="One time" className="bg-slate-900 text-white">One time</option>
                      <option value="Annual" className="bg-slate-900 text-white">Annual</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Description / Notes</label>
                  <textarea
                    rows={2}
                    value={subFormNotes}
                    onChange={(e) => setSubFormNotes(e.target.value)}
                    placeholder="Brief description of the component scope..."
                    className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* NFA / GBPA Reference & Status */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <span className="text-[11px] text-amber-400 block font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={12} />
                    <span>NFA / GBPA Approval Linking</span>
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">NFA / GBPA Number</label>
                      <input
                        type="text"
                        list="aop-nfa-suggestions"
                        value={subFormNFANumber}
                        onChange={(e) => setSubFormNFANumber(e.target.value)}
                        placeholder="e.g. NFA-2027-0042"
                        className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                      />
                      <datalist id="aop-nfa-suggestions">
                        {existingApprovals.map((app) => (
                          <option key={app.id} value={app.approvalNumber}>
                            {app.title} ({app.status})
                          </option>
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Approval Status</label>
                      <select
                        value={subFormNFAStatus}
                        onChange={(e) => setSubFormNFAStatus(e.target.value as "NFA Approved" | "NFA Pending" | "No NFA")}
                        className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                      >
                        <option value="No NFA" className="bg-slate-900 text-slate-300">No NFA (Self-budgeted)</option>
                        <option value="NFA Pending" className="bg-slate-900 text-amber-300">NFA Pending Approval</option>
                        <option value="NFA Approved" className="bg-slate-900 text-emerald-300">NFA Approved</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* DevOps Optimization / Savings Tag */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <span className="text-[11px] text-emerald-400 block font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} />
                    <span>DevOps Savings Tracker</span>
                  </span>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Savings Realized (₹ Cr)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={subFormDevopsSavingsCr}
                        onChange={(e) => setSubFormDevopsSavingsCr(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Optimization Type</label>
                      <select
                        value={subFormDevopsSavingsType}
                        onChange={(e) => setSubFormDevopsSavingsType(e.target.value as any)}
                        className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                      >
                        <option value="Spot" className="bg-slate-900 text-white">Spot / Preemptible Instances</option>
                        <option value="CUD / Reserved" className="bg-slate-900 text-white">CUD / Reserved Instances</option>
                        <option value="Right-sizing" className="bg-slate-900 text-white">Resource Right-sizing</option>
                        <option value="Storage Tiering" className="bg-slate-900 text-white">Storage Cold Tiering</option>
                        <option value="Architecture" className="bg-slate-900 text-white">Architecture & CDN Cache</option>
                        <option value="Other" className="bg-slate-900 text-white">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Savings Notes</label>
                      <input
                        type="text"
                        value={subFormDevopsSavingsNotes}
                        onChange={(e) => setSubFormDevopsSavingsNotes(e.target.value)}
                        placeholder="e.g. Switched 60% nodes to spot"
                        className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Dynamic Custom Column Inputs */}
                {customColumns.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 space-y-2.5">
                    <span className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider">
                      Custom Fields ({customColumns.length})
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      {customColumns.map((col) => {
                        if (col.type === "FORMULA") {
                          return (
                            <div key={col.id} className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30">
                              <span className="text-[10px] text-cyan-400 font-bold block uppercase">
                                Formula Column (Auto-calculated)
                              </span>
                              <span className="text-xs font-semibold text-white block mt-0.5">{col.name}</span>
                              <span className="text-[10px] text-cyan-300 font-mono block mt-1">fx: {col.formula}</span>
                            </div>
                          );
                        }
                        return (
                          <div key={col.id}>
                            <label className="text-slate-400 font-semibold block mb-1">
                              {col.name}{col.unit ? ` (${col.unit})` : ""}
                            </label>
                            <input
                              type={col.type === "STANDARD_NUMBER" ? "number" : "text"}
                              value={subFormCustomFields[col.id] || ""}
                              onChange={(e) =>
                                setSubFormCustomFields({
                                  ...subFormCustomFields,
                                  [col.id]: e.target.value,
                                })
                              }
                              placeholder={`Enter ${col.name}...`}
                              className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddSubModalOpen(false);
                    setEditingSubComponent(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={editingSubComponent ? handleEditSubComponent : handleAddSubComponent}
                  disabled={!subFormName.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingSubComponent ? "Save Sub-component" : "Add Sub-component"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 4. Manage Custom Columns Modal */}
        {isManageColumnsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0B0F19] border border-slate-700/80 rounded-2xl p-6 w-full max-w-xl space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                    <Columns size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>DevOps Unit Economics & Custom Columns</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Add Standard Input (Text/Number) or Calculated Formula columns evaluated row-by-row.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsManageColumnsModalOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Add New Column Form */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3.5">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  + Add New Column
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1">
                      Column Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      placeholder="e.g. MAU (M), Traffic (PB), Spend / MAU"
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1">Column Type</label>
                    <select
                      value={newColType}
                      onChange={(e) => setNewColType(e.target.value as any)}
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-semibold"
                    >
                      <option value="STANDARD_TEXT" className="bg-slate-900 text-white">
                        Standard Input (Text) — e.g. Owner, Jira ID
                      </option>
                      <option value="STANDARD_NUMBER" className="bg-slate-900 text-white">
                        Standard Input (Number) — e.g. MAU, Traffic, Nodes
                      </option>
                      <option value="FORMULA" className="bg-slate-900 text-cyan-300 font-bold">
                        Calculated Formula (Dynamic row evaluation)
                      </option>
                    </select>
                  </div>
                </div>

                {/* Formula Config if Type is FORMULA */}
                {newColType === "FORMULA" && (
                  <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-cyan-300 text-xs font-bold flex items-center gap-1.5">
                        <Calculator size={13} />
                        <span>Row Calculation Formula</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Tokens: SPEND, BUDGET, REMAINING, SAVINGS, MAU
                      </span>
                    </div>

                    <input
                      type="text"
                      value={newColFormula}
                      onChange={(e) => setNewColFormula(e.target.value)}
                      placeholder="e.g. SPEND / MAU, SPEND / BUDGET * 100"
                      className="w-full bg-[#05070A] border border-cyan-500/50 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-300"
                    />

                    {/* Quick formula template chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400">Quick Templates:</span>
                      {[
                        { label: "Cost per MAU", formula: "SPEND / MAU" },
                        { label: "% Budget Consumed", formula: "SPEND / BUDGET * 100" },
                        { label: "Remaining Balance", formula: "BUDGET - SPEND" },
                        { label: "% DevOps Savings", formula: "SAVINGS / SPEND * 100" },
                      ].map((tmpl) => (
                        <button
                          key={tmpl.label}
                          type="button"
                          onClick={() => setNewColFormula(tmpl.formula)}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 cursor-pointer"
                        >
                          {tmpl.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Optional Unit, Prefix, Suffix */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">Prefix</label>
                    <input
                      type="text"
                      value={newColPrefix}
                      onChange={(e) => setNewColPrefix(e.target.value)}
                      placeholder="e.g. ₹ or $"
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">Suffix / Unit</label>
                    <input
                      type="text"
                      value={newColSuffix}
                      onChange={(e) => setNewColSuffix(e.target.value)}
                      placeholder="e.g. % or /mo"
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">Display Unit</label>
                    <input
                      type="text"
                      value={newColUnit}
                      onChange={(e) => setNewColUnit(e.target.value)}
                      placeholder="e.g. M, PB, Nodes"
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddCustomColumn}
                    disabled={!newColumnName.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Add Column</span>
                  </button>
                </div>
              </div>

              {/* Existing Columns List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Active Custom Columns ({customColumns.length})
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customColumns.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-3 text-center bg-white/[0.01] rounded-lg border border-dashed border-white/[0.08]">
                      No custom columns added yet. Add a Standard Input or Formula column above.
                    </p>
                  ) : (
                    customColumns.map((col) => (
                      <div
                        key={col.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-white"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{col.name}</span>
                          {col.type === "FORMULA" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              fx: {col.formula}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              {col.type === "STANDARD_NUMBER" ? "Number Input" : "Text Input"}
                            </span>
                          )}
                          {col.unit && (
                            <span className="text-[10px] text-slate-400 font-mono">[{col.unit}]</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteCustomColumn(col.id)}
                          className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title={`Delete ${col.name} column`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManageColumnsModalOpen(false)}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 5. Add / Edit Fiscal Year Data Modal */}
        {isYearDataModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0B0F19] border border-slate-700/80 rounded-2xl p-6 w-full max-w-4xl space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    <CalendarRange size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Add / Edit Year Timeline Data</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                        {yearDataFY}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Target: <strong className="text-slate-200">{yearDataTargetSub ? yearDataTargetSub.name : yearDataTargetCat?.categoryName}</strong> • Isolated multi-year storage
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsYearDataModalOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Target Year & Budget Config */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/[0.02] p-3.5 rounded-xl border border-white/[0.06]">
                <div>
                  <label className="text-slate-400 text-xs font-semibold block mb-1">
                    Target Fiscal Year (Apr – Mar)
                  </label>
                  <select
                    value={normalizeFYKey(yearDataFY)}
                    onChange={(e) => handleYearDataFYChange(e.target.value)}
                    className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                  >
                    {getFiscalYears().map((y) => (
                      <option key={y.id} value={normalizeFYKey(y.id)} className="bg-slate-900 text-white">
                        {y.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 text-xs font-semibold block mb-1">
                    Annual Allocated Budget (₹ Cr)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={yearDataBudget}
                    onChange={(e) => setYearDataBudget(e.target.value)}
                    placeholder="e.g. 15.00"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
              </div>

              {/* Live 4 Metrics summary in modal */}
              {(() => {
                const b = Math.max(0, Number(yearDataBudget) || 0);
                const act = yearDataMonths.filter((m) => m.status === "ACTUAL").reduce((s, m) => s + (Number(m.amount) || 0), 0);
                const proj = yearDataMonths.filter((m) => m.status === "PROJECTED").reduce((s, m) => s + (Number(m.amount) || 0), 0);
                const tot = act + proj;
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-center p-3 rounded-xl bg-slate-950/60 border border-white/[0.08]">
                    <div className="p-2 rounded-lg bg-white/[0.03]">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Budget</span>
                      <span className="text-sm font-bold text-white font-mono">₹{b.toFixed(2)} Cr</span>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[10px] text-emerald-400 uppercase font-bold block">Actual (YTD)</span>
                      <span className="text-sm font-bold text-emerald-300 font-mono">₹{act.toFixed(2)} Cr</span>
                    </div>
                    <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                      <span className="text-[10px] text-cyan-400 uppercase font-bold block">Projected</span>
                      <span className="text-sm font-bold text-cyan-300 font-mono">₹{proj.toFixed(2)} Cr</span>
                    </div>
                    <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                      <span className="text-[10px] text-indigo-400 uppercase font-bold block">Full-Year Total</span>
                      <span className="text-sm font-bold text-indigo-300 font-mono">₹{tot.toFixed(2)} Cr</span>
                    </div>
                  </div>
                );
              })()}

              {/* 12-Month Timeline Spend Input Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Calendar size={14} className="text-amber-400" />
                    <span>12-Month Inputs for {normalizeFYKey(yearDataFY)}</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Click any badge to toggle between <strong className="text-emerald-400">ACTUAL</strong> and <strong className="text-amber-400">PROJECTED</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 text-xs">
                  {yearDataMonths.map((m, idx) => (
                    <div
                      key={m.month}
                      className="p-2 rounded-xl border border-white/[0.08] bg-[#07090E]/90 text-center space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-slate-200">{m.shortLabel}</span>
                        <span className="text-[9px] text-slate-500 font-mono">{m.quarter}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const nextStatus: "ACTUAL" | "PROJECTED" = m.status === "ACTUAL" ? "PROJECTED" : "ACTUAL";
                          setYearDataMonths((prev) =>
                            prev.map((pm, i) => (i === idx ? { ...pm, status: nextStatus } : pm))
                          );
                        }}
                        className={`w-full py-0.5 rounded text-[8px] font-black uppercase border cursor-pointer transition-all ${
                          m.status === "ACTUAL"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                        }`}
                        title="Click to toggle status"
                      >
                        {m.status}
                      </button>

                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={m.amount}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          setYearDataMonths((prev) =>
                            prev.map((pm, i) => (i === idx ? { ...pm, amount: val } : pm))
                          );
                        }}
                        className="w-full text-center font-mono font-bold text-xs py-1 px-1 rounded-lg border border-white/[0.1] bg-[#05070A] text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsYearDataModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveYearData}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 shadow-lg cursor-pointer"
                >
                  Save {normalizeFYKey(yearDataFY)} Data
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 6. Dynamic Custom KPI Card Builder Modal */}
        {isAddKPICardModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0B0F19] border border-slate-700/80 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{editingKPICard ? "Edit Custom KPI Card" : "Dynamic Custom KPI Card Builder"}</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Configure executive metrics, unit economics, filter scopes, or custom formulas.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsAddKPICardModalOpen(false);
                    setEditingKPICard(null);
                  }}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Title */}
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">
                    Card Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={kpiCardTitle}
                    onChange={(e) => setKpiCardTitle(e.target.value)}
                    placeholder="e.g. IPTV Cost per MAU, Total CDN Burn, DevOps Savings"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                    autoFocus
                  />
                </div>

                {/* Metric Source */}
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Metric Source</label>
                  <select
                    value={kpiCardMetricSource}
                    onChange={(e) => setKpiCardMetricSource(e.target.value as any)}
                    className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400 font-semibold"
                  >
                    <option value="TOTAL_BUDGET" className="bg-slate-900 text-white">
                      Total Allocated Budget (₹ Cr)
                    </option>
                    <option value="ACTUAL_SPEND" className="bg-slate-900 text-white">
                      Actual YTD Spend (₹ Cr)
                    </option>
                    <option value="PROJECTED_SPEND" className="bg-slate-900 text-white">
                      Projected Spend (Remaining Months)
                    </option>
                    <option value="REMAINING_BALANCE" className="bg-slate-900 text-white">
                      Remaining Balance (Budget - Spend)
                    </option>
                    <option value="DEVOPS_SAVINGS" className="bg-slate-900 text-emerald-300 font-bold">
                      DevOps Savings Realized (Spot / CUD / Right-sizing)
                    </option>
                    <option value="YEAR_END_MAU" className="bg-slate-900 text-white">
                      Year-End Subscribers / MAU (M)
                    </option>
                    <option value="COST_PER_USER" className="bg-slate-900 text-white">
                      Cost per User (₹ / Subscriber)
                    </option>
                    <option value="CUSTOM_FORMULA" className="bg-slate-900 text-cyan-300 font-bold">
                      Custom Evaluated Formula (Dynamic calculation)
                    </option>
                  </select>
                </div>

                {/* Custom Formula input if selected */}
                {kpiCardMetricSource === "CUSTOM_FORMULA" && (
                  <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-cyan-300 font-bold flex items-center gap-1.5">
                        <Calculator size={13} />
                        <span>Calculation Formula</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Tokens: SPEND, BUDGET, REMAINING, SAVINGS, MAU
                      </span>
                    </div>
                    <input
                      type="text"
                      value={kpiCardFormula}
                      onChange={(e) => setKpiCardFormula(e.target.value)}
                      placeholder="e.g. SPEND / MAU or SAVINGS / SPEND * 100"
                      className="w-full bg-[#05070A] border border-cyan-500/50 rounded-lg px-3 py-2 font-mono font-bold text-white focus:outline-none focus:border-cyan-300"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400">Presets:</span>
                      {[
                        { label: "Cost per MAU", formula: "SPEND / MAU" },
                        { label: "Overrun Margin", formula: "SPEND - BUDGET" },
                        { label: "% Savings Realized", formula: "SAVINGS / SPEND * 100" },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setKpiCardFormula(p.formula)}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 cursor-pointer"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filter Scope: LOB and Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Filter Scope (LOB)</label>
                    <select
                      value={kpiCardFilterLOB}
                      onChange={(e) => setKpiCardFilterLOB(e.target.value)}
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="ALL" className="bg-slate-900 text-white">All Lines of Business (Global)</option>
                      {lobs
                        .filter((l) => l.id !== "ALL")
                        .map((lob) => (
                          <option key={lob.id} value={lob.id} className="bg-slate-900 text-white">
                            {lob.label}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Filter Scope (Category)</label>
                    <select
                      value={kpiCardFilterCategory}
                      onChange={(e) => setKpiCardFilterCategory(e.target.value)}
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="ALL" className="bg-slate-900 text-white">All Categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                          {c.categoryName} ({c.lob})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Color Theme */}
                <div>
                  <label className="text-slate-400 font-semibold block mb-1.5">Color Theme</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { key: "EMERALD", label: "Emerald", ring: "ring-emerald-400", bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
                      { key: "RED", label: "Red", ring: "ring-rose-400", bg: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
                      { key: "CYAN", label: "Cyan", ring: "ring-cyan-400", bg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
                      { key: "AMBER", label: "Amber", ring: "ring-amber-400", bg: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
                      { key: "PURPLE", label: "Purple", ring: "ring-purple-400", bg: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
                      { key: "BLUE", label: "Blue", ring: "ring-blue-400", bg: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
                    ].map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setKpiCardColorTheme(t.key as any)}
                        className={`p-2 rounded-xl text-center border font-bold text-xs transition-all cursor-pointer ${t.bg} ${
                          kpiCardColorTheme === t.key ? `ring-2 ${t.ring} shadow-md` : "opacity-70 hover:opacity-100"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prefix and Suffix */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Prefix</label>
                    <input
                      type="text"
                      value={kpiCardPrefix}
                      onChange={(e) => setKpiCardPrefix(e.target.value)}
                      placeholder="e.g. ₹ or $"
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Suffix / Unit</label>
                    <input
                      type="text"
                      value={kpiCardSuffix}
                      onChange={(e) => setKpiCardSuffix(e.target.value)}
                      placeholder="e.g.  Cr, M, /user"
                      className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddKPICardModalOpen(false);
                    setEditingKPICard(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveKPICard}
                  disabled={!kpiCardTitle.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingKPICard ? "Save Changes" : "Create KPI Card"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 7. Soft-Delete Trash Recovery Drawer */}
        {isTrashDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="bg-[#0B0F19] border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl p-6"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Recently Deleted (Trash)</h3>
                    <p className="text-xs text-slate-400">
                      {trashItems.length} recoverable items in this session
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTrashDrawerOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {trashItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
                    <CheckCircle size={32} className="text-emerald-500/60 mb-2" />
                    <p className="text-xs font-semibold text-slate-400">Trash is empty!</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Deleted categories, sub-components, or columns will appear here for 1-click recovery.
                    </p>
                  </div>
                ) : (
                  trashItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] transition-all flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                            {item.itemType}
                          </span>
                          <span className="text-xs font-bold text-white truncate block">
                            {item.itemName}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Deleted at {item.deletedAt}
                        </span>
                      </div>

                      <button
                        onClick={() => handleRestoreTrashItem(item)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                        title="Restore this item back to the dashboard"
                      >
                        <RotateCcw size={12} />
                        <span>Restore</span>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Footer with Clear All */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleEmptyTrash}
                  disabled={trashItems.length === 0}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Empty Trash
                </button>
                <button
                  type="button"
                  onClick={() => setIsTrashDrawerOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 8. Save Named Snapshot Checkpoint Modal */}
        {isSaveSnapshotModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0B0F19] border border-slate-700/80 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                    <Camera size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Save AOP Snapshot Checkpoint</h3>
                    <p className="text-xs text-slate-400">
                      Create an instant named checkpoint to freeze and restore later.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSaveSnapshotModalOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">
                    Snapshot Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={snapshotName}
                    onChange={(e) => setSnapshotName(e.target.value)}
                    placeholder="e.g. v1 Baseline, Post-Manager Review, CUD Optimized"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Checkpoint Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={snapshotNotes}
                    onChange={(e) => setSnapshotNotes(e.target.value)}
                    placeholder="e.g. Prior to 15% budget cut requested by leadership..."
                    className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Fiscal Year Target:</span>
                    <strong className="text-white font-mono">{activeFY}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Active Categories:</span>
                    <strong className="text-white">{categories.length} Categories</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Total Budget:</span>
                    <strong className="text-emerald-400 font-mono">₹{currentSummary.totalBudgetCr.toFixed(2)} Cr</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSaveSnapshotModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSnapshot}
                  disabled={!snapshotName.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Camera size={14} />
                  <span>Freeze & Save Checkpoint</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 9. Snapshots & Version History Drawer */}
        {isSnapshotDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="bg-[#0B0F19] border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl p-6"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                    <Bookmark size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">AOP Version Snapshots</h3>
                    <p className="text-xs text-slate-400">
                      {snapshots.length} saved version checkpoints
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSnapshotDrawerOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Snapshots List */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {snapshots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
                    <Camera size={32} className="text-purple-500/60 mb-2" />
                    <p className="text-xs font-semibold text-slate-400">No snapshots saved yet</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Click "Save Snapshot" at the top to preserve a named baseline checkpoint.
                    </p>
                  </div>
                ) : (
                  snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-white">{snap.name}</h4>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Saved on {snap.createdAt} • FY: <strong className="text-slate-200">{snap.fiscalYear}</strong>
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteSnapshot(snap.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                          title="Delete snapshot"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {snap.notes && (
                        <p className="text-xs text-slate-400 bg-white/[0.02] p-2 rounded border border-white/[0.04]">
                          {snap.notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          ₹{snap.totalBudgetCr.toFixed(2)} Cr ({snap.categories.length} Categories)
                        </span>
                        <button
                          onClick={() => handleRestoreSnapshot(snap)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <RotateCcw size={12} />
                          <span>Restore Checkpoint</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsSnapshotDrawerOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
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
