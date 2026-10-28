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
  DEFAULT_LEADERSHIP_SUMMARIES,
  DEFAULT_AOP_CATEGORIES,
  ALL_MONTH_KEYS,
  MONTHS_12_KEYS,
  createMonthlySpread,
  formatAOPCurrency,
  formatAOPCostPerUser,
  getAggregatedLeadershipSummary,
  getFilteredCategoryGroups,
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
  type FiscalYearOption,
} from "./finopsMultiYearStorage";
import { FinOpsEmptyStateCard } from "./FinOpsEmptyStateCard";

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
export const getItemSubtype = (item: Partial<AOPLineItem>): "IPTV" | "XSTREAM" | "DTH" | "HT" => {
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

export const DEFAULT_CATEGORY_CODES: CategoryCodeOption[] = [
  { code: "CDN", label: "CDN Bandwidth", icon: "Radio" },
  { code: "VIDEO_PLATFORM", label: "Video Platform", icon: "Tv" },
  { code: "SAAS", label: "SaaS & Tools", icon: "Sparkles" },
  { code: "MANPOWER", label: "Manpower & TnM", icon: "Users" },
  { code: "CROSS_CHARGE", label: "Cross-Charge Infra", icon: "Building2" },
  { code: "OTHER", label: "Other Systems", icon: "Server" },
];

export const SELECTABLE_CATEGORY_ICONS = [
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

export const getCategoryIconComponent = (code: string, iconName?: string) => {
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

export const getCategoryColorClasses = (code: string) => {
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
  initialSubtype?: AOPLOBSubtype;
  onSubtypeChange?: (subtype: AOPLOBSubtype) => void;
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
  const activeFY = dateFilter?.fiscalYear || "FY 2026-27";
  const m12Keys = useMemo(() => get12MonthKeysForFY(activeFY), [activeFY]);

  const DEFAULT_LOBS = [
    { id: "ALL", label: "All LOBs", isCustom: false },
    { id: "IPTV", label: "IPTV", isCustom: false },
    { id: "XSTREAM", label: "Xstream", isCustom: false },
    { id: "DTH", label: "DTH", isCustom: false },
    { id: "HT", label: "HT", isCustom: false },
  ];

  const [lobs, setLobs] = useState<{ id: string; label: string; isCustom?: boolean }[]>(() => {
    try {
      const saved = localStorage.getItem("xtelify_aop_custom_lobs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_LOBS;
  });

  useEffect(() => {
    try {
      localStorage.setItem("xtelify_aop_custom_lobs", JSON.stringify(lobs));
    } catch {}
  }, [lobs]);

  const [activeLOB, setActiveLOB] = useState<AOPLOBSubtype>(initialSubtype || "ALL");

  useEffect(() => {
    if (initialSubtype) setActiveLOB(initialSubtype);
  }, [initialSubtype]);

  const handleLOBSelect = (lob: AOPLOBSubtype) => {
    setActiveLOB(lob);
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
    if (fyData && Array.isArray(fyData.aopCategories)) {
      return sanitizeAOPCategories(fyData.aopCategories);
    }
    return [];
  });

  const [leadershipSummaries, setLeadershipSummaries] = useState<
    Record<string, AOPLeadershipSummary>
  >(() => {
    const fyData = getFinOpsDataForFY(activeFY);
    if (fyData && fyData.aopLeadershipSummaries) {
      return sanitizeLeadershipSummaries(fyData.aopLeadershipSummaries);
    }
    return {};
  });

  // Reload when active fiscal year changes
  useEffect(() => {
    const fyData = getFinOpsDataForFY(activeFY);
    if (fyData && Array.isArray(fyData.aopCategories)) {
      setCategories(sanitizeAOPCategories(fyData.aopCategories));
    } else {
      setCategories([]);
    }

    if (fyData && fyData.aopLeadershipSummaries) {
      setLeadershipSummaries(sanitizeLeadershipSummaries(fyData.aopLeadershipSummaries));
    } else {
      setLeadershipSummaries({});
    }
  }, [activeFY]);

  // Persist partitioned changes for active fiscal year
  useEffect(() => {
    saveFinOpsDataForFY(activeFY, { aopCategories: categories });
    try {
      localStorage.setItem("xtelify_aop_categories_v3", JSON.stringify(categories));
    } catch {}
  }, [categories, activeFY]);

  useEffect(() => {
    saveFinOpsDataForFY(activeFY, { aopLeadershipSummaries: leadershipSummaries });
  }, [leadershipSummaries, activeFY]);

  // Listen for multi-year cross-tab / modal storage updates
  useEffect(() => {
    const handleFYUpdated = (e: any) => {
      if (e.detail?.fy === activeFY && e.detail?.data?.aopCategories) {
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

  // Category creation Modal FY selection
  const [catFormFY, setCatFormFY] = useState<string>(activeFY);
  const [isAddingFYInModal, setIsAddingFYInModal] = useState(false);
  const [newFYInModal, setNewFYInModal] = useState("");

  const fiscalYearsList = useMemo(() => getFiscalYears(), []);

  // Dynamic Custom Columns
  interface CustomColumnDef {
    id: string;
    name: string;
  }

  const [customColumns, setCustomColumns] = useState<CustomColumnDef[]>(() => {
    try {
      const saved = localStorage.getItem("xtelify_aop_custom_columns");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [
      { id: "owner", name: "Owner" },
      { id: "remarks", name: "Remarks" },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem("xtelify_aop_custom_columns", JSON.stringify(customColumns));
    } catch {}
  }, [customColumns]);

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
      const saved = localStorage.getItem("xtelify_aop_category_codes_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_CATEGORY_CODES;
  });
  const [isCustomCategoryCodeMode, setIsCustomCategoryCodeMode] = useState(false);
  const [customCategoryCodeLabel, setCustomCategoryCodeLabel] = useState("");
  const [catFormIcon, setCatFormIcon] = useState<string>("Radio");
  const [showIconPicker, setShowIconPicker] = useState<boolean>(false);

  const getCategoryCodeLabel = (code: string) => {
    const found = categoryCodeOptions.find((o) => o.code === code || o.code.toUpperCase() === (code || "").toUpperCase());
    return found ? found.label : code;
  };

  const handleSaveCustomCategoryCode = () => {
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

    setCatFormCode(generatedCode);
    setIsCustomCategoryCodeMode(false);
    setShowIconPicker(false);
    setNotification({
      message: `Category '${trimmed}' (${generatedCode}) saved and selected!`,
      type: "success",
    });
  };

  const handleDeleteCustomCategoryCode = (codeToDelete: string) => {
    const updated = categoryCodeOptions.filter((o) => o.code !== codeToDelete);
    setCategoryCodeOptions(updated);
    try {
      localStorage.setItem("xtelify_aop_category_codes_v1", JSON.stringify(updated));
    } catch {}
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

  const [isManageColumnsModalOpen, setIsManageColumnsModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

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
    return getFilteredCategoryGroups(activeLOB, categories);
  }, [activeLOB, categories]);

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
    setIsAddLOBModalOpen(false);
    setNewLOBName("");
    setNotification({ message: `New AOP Type / LOB '${name}' added successfully.`, type: "success" });
  };

  const handleDeleteLOB = (lobId: string) => {
    if (lobId === "ALL") return;
    setLobs((prev) => prev.filter((l) => l.id !== lobId));
    if (activeLOB === lobId) {
      setActiveLOB("ALL");
      if (onSubtypeChange) onSubtypeChange("ALL");
    }
    setNotification({ message: `LOB '${lobId}' removed.`, type: "info" });
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
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    setSelectedCategoryIds((prev) => prev.filter((id) => id !== categoryId));
    setNotification({ message: `Major Sub-type removed.`, type: "info" });
  };

  const handleDeleteSelectedCategories = () => {
    if (selectedCategoryIds.length === 0) return;
    const count = selectedCategoryIds.length;
    setCategories((prev) => prev.filter((c) => !selectedCategoryIds.includes(c.id)));
    setSelectedCategoryIds([]);
    setNotification({ message: `${count} Major Sub-types deleted.`, type: "info" });
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

  // Level 3: Child Sub-component Management
  const handleAddSubComponent = () => {
    if (!targetCategoryIdForSub || !subFormName.trim()) return;
    const bCr = parseFloat(subFormBudget) || 0;
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
    setNotification({ message: `Sub-component '${newSub.name}' added.`, type: "success" });
  };

  const handleEditSubComponent = () => {
    if (!editingSubComponent || !subFormName.trim()) return;
    const { categoryId, sub } = editingSubComponent;
    const bCr = parseFloat(subFormBudget) || 0;

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
    setNotification({ message: `Sub-component removed.`, type: "info" });
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
  };

  // Dynamic Custom Columns
  const handleAddCustomColumn = () => {
    const colName = newColumnName.trim();
    if (!colName) return;
    const colId = `col_${colName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`;
    setCustomColumns((prev) => [...prev, { id: colId, name: colName }]);
    setNewColumnName("");
    setNotification({ message: `Custom column '${colName}' added.`, type: "success" });
  };

  const handleDeleteCustomColumn = (colId: string) => {
    setCustomColumns((prev) => prev.filter((c) => c.id !== colId));
    setNotification({ message: `Custom column removed.`, type: "info" });
  };

  // Inline Budget Save & Cancel
  const handleSaveBudget = () => {
    if (!editingBudgetId) return;
    const val = parseFloat(editingBudgetValue);
    if (isNaN(val) || val < 0) {
      setEditingBudgetId(null);
      return;
    }

    if (editingBudgetId.startsWith("cat-")) {
      const catId = editingBudgetId.replace("cat-", "");
      setCategories((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, allocatedBudgetCr: val } : c))
      );
      setNotification({ message: `Major Sub-type budget updated to ₹${val.toFixed(2)} Cr.`, type: "success" });
    } else if (editingBudgetId.startsWith("sub-")) {
      const subId = editingBudgetId.replace("sub-", "");
      setCategories((prev) =>
        prev.map((c) => {
          const hasSub = c.subComponents.some((s) => s.id === subId);
          if (!hasSub) return c;
          const updatedSubs = c.subComponents.map((s) =>
            s.id === subId ? { ...s, allocatedBudgetCr: val } : s
          );
          const totalCatBudget = updatedSubs.reduce((sum, s) => sum + (s.allocatedBudgetCr || 0), 0);
          return {
            ...c,
            allocatedBudgetCr: parseFloat(totalCatBudget.toFixed(2)),
            subComponents: updatedSubs,
          };
        })
      );
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
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== categoryId) return cat;

        const updatedSubs = cat.subComponents.map((sub) => {
          if (sub.id !== subId) return sub;

          const existingMonths = sub.monthlyData || [];
          const updatedMonths = existingMonths.map((m) => {
            if (m.month === monthKey) {
              const nextStatus: "ACTUAL" | "PROJECTED" = m.status === "ACTUAL" ? "PROJECTED" : "ACTUAL";
              const amt = m.amount !== undefined ? m.amount : (nextStatus === "ACTUAL" ? m.actualSpentCr : m.projectedCr);
              return {
                ...m,
                status: nextStatus,
                isActual: nextStatus === "ACTUAL",
                amount: amt,
                actualSpentCr: nextStatus === "ACTUAL" ? amt : 0,
                projectedCr: nextStatus === "PROJECTED" ? amt : 0,
              };
            }
            return m;
          });

          const actualSum = updatedMonths.filter((m) => m.status === "ACTUAL").reduce((s, m) => s + (m.amount || 0), 0);
          const projSum = updatedMonths.filter((m) => m.status === "PROJECTED").reduce((s, m) => s + (m.amount || 0), 0);
          const fullYearTotal = parseFloat((actualSum + projSum).toFixed(2));

          return {
            ...sub,
            monthlyData: updatedMonths,
            totalSpentCr: fullYearTotal,
          };
        });

        const newCategorySpent = parseFloat(
          updatedSubs.reduce((sum, s) => sum + (Number(s.totalSpentCr) || 0), 0).toFixed(2)
        );

        return {
          ...cat,
          subComponents: updatedSubs,
          totalSpentCr: newCategorySpent,
        };
      })
    );
  };

  // Dynamic 12-Month Timeline Spend Input (Updates live on every keystroke)
  const handleMonthSpendChange = (
    categoryId: string,
    subId: string,
    monthKey: string,
    spendVal: number
  ) => {
    const cleanSpend = Math.max(0, isNaN(spendVal) ? 0 : parseFloat(spendVal.toFixed(2)));

    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== categoryId) return cat;

        const updatedSubs = cat.subComponents.map((sub) => {
          if (sub.id !== subId) return sub;

          const existingMonths = sub.monthlyData || [];
          let monthFound = false;
          const updatedMonths = existingMonths.map((m) => {
            if (m.month === monthKey) {
              monthFound = true;
              const currentStatus = m.status || (m.isActual ? "ACTUAL" : "PROJECTED");
              return {
                ...m,
                status: currentStatus,
                amount: cleanSpend,
                actualSpentCr: currentStatus === "ACTUAL" ? cleanSpend : 0,
                projectedCr: currentStatus === "PROJECTED" ? cleanSpend : 0,
              };
            }
            return m;
          });

          if (!monthFound) {
            const mMeta = m12Keys.find((k) => k.key === monthKey);
            const defaultActual = mMeta?.defaultActual ?? true;
            const status: "ACTUAL" | "PROJECTED" = defaultActual ? "ACTUAL" : "PROJECTED";
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

          return {
            ...sub,
            monthlyData: updatedMonths,
            totalSpentCr: fullYearTotal,
          };
        });

        const newCategorySpent = parseFloat(
          updatedSubs.reduce((sum, s) => sum + (Number(s.totalSpentCr) || 0), 0).toFixed(2)
        );
        const newCategoryBudget = parseFloat(
          updatedSubs.reduce((sum, s) => sum + (Number(s.allocatedBudgetCr) || 0), 0).toFixed(2)
        );

        return {
          ...cat,
          subComponents: updatedSubs,
          totalSpentCr: newCategorySpent,
          allocatedBudgetCr: newCategoryBudget > 0 ? newCategoryBudget : cat.allocatedBudgetCr,
        };
      })
    );
  };

  // Open Year Data Modal for adding or editing budgets & 12-month data for another year
  const openYearDataModal = (category: AOPCategoryGroup, sub: AOPSubComponent | null) => {
    setYearDataTargetCat(category);
    setYearDataTargetSub(sub);

    const targetFY = activeFY === "FY 2026-27" ? "FY 2027-28" : activeFY;
    setYearDataFY(targetFY);

    const targetStore = getFinOpsDataForFY(targetFY);
    const existingCat = targetStore?.aopCategories?.find((c) => c.id === category.id);
    const existingSub = sub && existingCat ? existingCat.subComponents.find((s) => s.id === sub.id) : null;

    const b = sub
      ? existingSub?.allocatedBudgetCr || sub.allocatedBudgetCr || 0
      : existingCat?.allocatedBudgetCr || category.allocatedBudgetCr || 0;
    setYearDataBudget(String(b));

    const fyMonthsMeta = get12MonthKeysForFY(targetFY);
    const monthsSource = existingSub?.monthlyData || sub?.monthlyData || [];

    const initializedMonths = fyMonthsMeta.map((mMeta, idx) => {
      const found = monthsSource.find((pt) => pt.month === mMeta.key || pt.month.startsWith(mMeta.shortLabel));
      const defaultStatus: "ACTUAL" | "PROJECTED" = idx < 6 ? "ACTUAL" : "PROJECTED";
      const status: "ACTUAL" | "PROJECTED" = found?.status || (found?.isActual ?? defaultStatus === "ACTUAL" ? "ACTUAL" : "PROJECTED");
      const amount = found?.amount !== undefined ? found.amount : (status === "ACTUAL" ? (found?.actualSpentCr ?? 0) : (found?.projectedCr ?? found?.actualSpentCr ?? 0));
      return {
        month: mMeta.key,
        shortLabel: mMeta.shortLabel,
        quarter: mMeta.quarter,
        amount,
        status,
      };
    });

    setYearDataMonths(initializedMonths);
    setIsYearDataModalOpen(true);
  };

  const handleYearDataFYChange = (newFY: string) => {
    setYearDataFY(newFY);
    const targetStore = getFinOpsDataForFY(newFY);
    const existingCat = targetStore?.aopCategories?.find((c) => c.id === yearDataTargetCat?.id);
    const existingSub = yearDataTargetSub && existingCat ? existingCat.subComponents.find((s) => s.id === yearDataTargetSub.id) : null;

    const b = yearDataTargetSub
      ? existingSub?.allocatedBudgetCr || 0
      : existingCat?.allocatedBudgetCr || 0;
    setYearDataBudget(String(b));

    const fyMonthsMeta = get12MonthKeysForFY(newFY);
    const monthsSource = existingSub?.monthlyData || [];

    const initializedMonths = fyMonthsMeta.map((mMeta, idx) => {
      const found = monthsSource.find((pt) => pt.month === mMeta.key || pt.month.startsWith(mMeta.shortLabel));
      const defaultStatus: "ACTUAL" | "PROJECTED" = idx < 6 ? "ACTUAL" : "PROJECTED";
      const status: "ACTUAL" | "PROJECTED" = found?.status || (defaultStatus === "ACTUAL" ? "ACTUAL" : "PROJECTED");
      const amount = found?.amount !== undefined ? found.amount : (status === "ACTUAL" ? (found?.actualSpentCr ?? 0) : (found?.projectedCr ?? 0));
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

  const handleSaveYearData = () => {
    if (!yearDataTargetCat) return;
    const bCr = parseFloat(yearDataBudget) || 0;
    const actualSum = yearDataMonths.filter((m) => m.status === "ACTUAL").reduce((s, m) => s + (m.amount || 0), 0);
    const projSum = yearDataMonths.filter((m) => m.status === "PROJECTED").reduce((s, m) => s + (m.amount || 0), 0);
    const fullYearTotal = parseFloat((actualSum + projSum).toFixed(2));

    const targetStore = getFinOpsDataForFY(yearDataFY) || {};
    let targetCats = targetStore.aopCategories ? [...targetStore.aopCategories] : [];

    let catIndex = targetCats.findIndex((c) => c.id === yearDataTargetCat.id);
    if (catIndex === -1) {
      targetCats.push({
        ...yearDataTargetCat,
        allocatedBudgetCr: bCr,
        totalSpentCr: fullYearTotal,
        subComponents: [],
      });
      catIndex = targetCats.length - 1;
    }

    const formattedMonths: MonthlyDataPoint[] = yearDataMonths.map((m) => ({
      month: m.month,
      quarter: m.quarter,
      budgetCr: parseFloat((bCr / 12).toFixed(2)),
      actualSpentCr: m.status === "ACTUAL" ? m.amount : 0,
      projectedCr: m.status === "PROJECTED" ? m.amount : 0,
      isActual: m.status === "ACTUAL",
      status: m.status,
      amount: m.amount,
    }));

    if (yearDataTargetSub) {
      const currentCat = targetCats[catIndex];
      const subIndex = currentCat.subComponents.findIndex((s) => s.id === yearDataTargetSub.id);
      const updatedSub: AOPSubComponent = {
        ...yearDataTargetSub,
        allocatedBudgetCr: bCr,
        totalSpentCr: fullYearTotal,
        monthlyData: formattedMonths,
      };

      let newSubs = [...currentCat.subComponents];
      if (subIndex >= 0) {
        newSubs[subIndex] = updatedSub;
      } else {
        newSubs.push(updatedSub);
      }

      const newCatBudget = newSubs.reduce((s, sub) => s + (sub.allocatedBudgetCr || 0), 0);
      const newCatSpent = parseFloat(newSubs.reduce((s, sub) => s + (sub.totalSpentCr || 0), 0).toFixed(2));

      targetCats[catIndex] = {
        ...currentCat,
        allocatedBudgetCr: newCatBudget,
        totalSpentCr: newCatSpent,
        subComponents: newSubs,
      };
    } else {
      targetCats[catIndex] = {
        ...targetCats[catIndex],
        allocatedBudgetCr: bCr,
      };
    }

    saveFinOpsDataForFY(yearDataFY, { aopCategories: targetCats });

    if (yearDataFY === activeFY) {
      setCategories(targetCats);
    }

    setIsYearDataModalOpen(false);
    setNotification({
      message: `Successfully saved ${yearDataFY} data without altering historical records.`,
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
    return items.filter((it) => getItemSubtype(it) === activeLOB);
  }, [items, activeLOB]);

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
        ["Xstream", leadershipSummaries.XSTREAM.yearEndMauMillions, leadershipSummaries.XSTREAM.prevYearMauMillions, `${leadershipSummaries.XSTREAM.growthPct}%`, leadershipSummaries.XSTREAM.totalBudgetCr, leadershipSummaries.XSTREAM.totalSpentCr, leadershipSummaries.XSTREAM.costPerUserInr],
        ["DTH", leadershipSummaries.DTH.yearEndMauMillions, leadershipSummaries.DTH.prevYearMauMillions, `${leadershipSummaries.DTH.growthPct}%`, leadershipSummaries.DTH.totalBudgetCr, leadershipSummaries.DTH.totalSpentCr, leadershipSummaries.DTH.costPerUserInr],
        ["HT", leadershipSummaries.HT.yearEndMauMillions, leadershipSummaries.HT.prevYearMauMillions, `${leadershipSummaries.HT.growthPct}%`, leadershipSummaries.HT.totalBudgetCr, leadershipSummaries.HT.totalSpentCr, leadershipSummaries.HT.costPerUserInr],
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

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. LOB SELECTOR PILL BAR: [All LOBs] | [IPTV] | [Xstream] | [DTH] | [HT] + Custom
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="p-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {lobs.map((lobItem) => {
            const Icon = getLOBIcon(lobItem.id);
            const isActive = activeLOB === lobItem.id;
            const pillData = getLOBPillData(lobItem.id);
            const isDeletable = lobItem.id !== "ALL";

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
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. EXECUTIVE TOP KPI CARDS (Subtype-Aware with Growth & Cost per User)
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Year-End MAU (Millions) with growth percentage vs previous year */}
        <div className="rounded-2xl p-5 border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl relative overflow-hidden flex flex-col justify-between group hover:border-white/[0.18] transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/15 transition-all" />
          <div className="flex items-center justify-between text-emerald-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Year-End MAU (Subscribers)
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400">
              <Users size={18} />
            </div>
          </div>
          <div>
            {currentSummary.yearEndMauMillions > 0 ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white tracking-tight">
                    {currentSummary.yearEndMauMillions}M
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">Active Users</span>
                </div>
                <div className="flex items-center gap-2 mt-2.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <TrendingUp size={11} className="text-emerald-400" />
                    +{currentSummary.growthPct}% YoY Growth
                  </span>
                  <span className="text-[11px] text-slate-400">vs {currentSummary.prevYearMauMillions}M prev yr</span>
                </div>
              </>
            ) : (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-500 tracking-tight">0.0M</span>
                  <span className="text-xs font-semibold text-slate-500">Active Users</span>
                </div>
                <div className="mt-2.5 text-[11px] text-slate-500">
                  No subscriber target for {activeFY}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Total AOP Budget (₹ Cr / $) */}
        <div className="rounded-2xl p-5 border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl relative overflow-hidden flex flex-col justify-between group hover:border-white/[0.18] transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]">
          <div
            className={`absolute top-0 right-0 w-28 h-28 ${
              currentSummary.totalSpentCr > currentSummary.totalBudgetCr ? "bg-rose-500/15" : "bg-blue-500/10"
            } rounded-full blur-2xl pointer-events-none transition-all`}
          />
          <div className="flex items-center justify-between text-blue-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total AOP Budget ({displayCurrency === "INR_CR" ? "₹ Cr" : "$ M"})
            </span>
            <div
              className={`p-2 rounded-xl border ${
                currentSummary.totalSpentCr > currentSummary.totalBudgetCr
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                  : "bg-blue-500/15 border-blue-500/20 text-blue-400"
              }`}
            >
              {currentSummary.totalSpentCr > currentSummary.totalBudgetCr ? (
                <AlertTriangle size={18} />
              ) : (
                <Wallet size={18} />
              )}
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-black text-white tracking-tight font-mono">
                  {formatAOPCurrency(currentSummary.totalBudgetCr, displayCurrency)}
                </span>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">
                Spent:{" "}
                <span className="font-mono font-bold text-slate-200">
                  {formatAOPCurrency(currentSummary.totalSpentCr, displayCurrency)}
                </span>
              </span>
              {currentSummary.totalBudgetCr > 0 ? (
                currentSummary.totalSpentCr > currentSummary.totalBudgetCr ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    Overrun: +{formatAOPCurrency(currentSummary.totalSpentCr - currentSummary.totalBudgetCr, displayCurrency)}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {Math.round((currentSummary.totalSpentCr / currentSummary.totalBudgetCr) * 100)}% Consumed
                  </span>
                )
              ) : (
                <span className="text-[10px] text-slate-500">0% Consumed</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Cost per User at Year End */}
        <div className="rounded-2xl p-5 border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl relative overflow-hidden flex flex-col justify-between group hover:border-white/[0.18] transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]">
          <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/15 transition-all" />
          <div className="flex items-center justify-between text-purple-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Cost per User (Year End)
            </span>
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/20 text-purple-400">
              <Target size={18} />
            </div>
          </div>
          <div>
            {currentSummary.costPerUserInr > 0 ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white tracking-tight font-mono">
                    {formatAOPCostPerUser(currentSummary.costPerUserInr, displayCurrency)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <TrendingDown size={11} className="text-emerald-400" />
                    {currentSummary.cpuImprovementPct}% Efficiency Gain
                  </span>
                  <span className="text-[11px] text-slate-400">
                    vs {formatAOPCostPerUser(currentSummary.prevYearCostPerUserInr, displayCurrency)}
                  </span>
                </div>
              </>
            ) : (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-500 tracking-tight font-mono">
                    {formatAOPCostPerUser(0, displayCurrency)}
                  </span>
                </div>
                <div className="mt-2.5 text-[11px] text-slate-500">
                  Awaiting budget allocation
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Categories & Sub-components Count */}
        <div className="rounded-2xl p-5 border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl relative overflow-hidden flex flex-col justify-between group hover:border-white/[0.18] transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]">
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/15 transition-all" />
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Cost Categories & Horizon
            </span>
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-400">
              <Layers size={18} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight">
                {filteredCategories.length}
              </span>
              <span className="text-xs font-semibold text-amber-300">
                Categories ({totalSubComponentsCount} Sub-components)
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2.5 text-[11px]">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Opex: {opexPct}%
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Capex: {capexPct}%
              </span>
              <span className="text-slate-400 font-mono text-[10px]">24 Months</span>
            </div>
          </div>
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

                // Dynamic calculation across 12-month child data
                const catBudget = category.allocatedBudgetCr || 0;
                let catActualSpent = 0;
                let catProjected = 0;
                let childActualMonthCounts: number[] = [];

                category.subComponents.forEach((sub) => {
                  const m12 = (sub.monthlyData || []).slice(0, 12);
                  let subActualCnt = 0;
                  m12.forEach((m, idx) => {
                    const isActual = m.status ? m.status === "ACTUAL" : (idx < 6);
                    const amt = m.amount !== undefined ? m.amount : (isActual ? m.actualSpentCr : m.projectedCr) || 0;
                    if (isActual) {
                      catActualSpent += amt;
                      if (amt > 0) subActualCnt++;
                    } else {
                      catProjected += amt;
                    }
                  });
                  if (subActualCnt > 0) childActualMonthCounts.push(subActualCnt);
                });

                catActualSpent = parseFloat(catActualSpent.toFixed(2));
                catProjected = parseFloat(catProjected.toFixed(2));
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
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                              {category.lob}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              {getCategoryCodeLabel(category.categoryCode)}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/[0.05] text-slate-400 border border-white/[0.08]">
                              Sheet: {category.sourceSheet}
                            </span>
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

                              // Dynamic calculation across 12-month inputs
                              const subBudget = sub.allocatedBudgetCr || 0;
                              const subMonths = sub.monthlyData || [];
                              const m12Data = m12Keys.map((mMeta, idx) => {
                                const found = subMonths.find((pt) => pt.month === mMeta.key || pt.month.startsWith(mMeta.shortLabel));
                                const defaultStatus: "ACTUAL" | "PROJECTED" = idx < 6 ? "ACTUAL" : "PROJECTED";
                                const status: "ACTUAL" | "PROJECTED" = found?.status || (found?.isActual ?? (defaultStatus === "ACTUAL") ? "ACTUAL" : "PROJECTED");
                                const amount = found?.amount !== undefined ? found.amount : (status === "ACTUAL" ? (found?.actualSpentCr ?? 0) : (found?.projectedCr ?? found?.actualSpentCr ?? 0));
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

                                        {/* Custom Columns tags */}
                                        {customColumns.map((col) => {
                                          const val = sub.customFields?.[col.id];
                                          if (!val) return null;
                                          return (
                                            <span
                                              key={col.id}
                                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60"
                                            >
                                              <strong className="text-slate-400 font-normal">{col.name}: </strong>{val}
                                            </span>
                                          );
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

              {/* Suggestions pills */}
              {!editingCategory && (
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">Quick Suggestions:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "CDN Bandwidth & Edge Caching",
                      "Video Platform Infrastructure",
                      "SaaS & Productivity Tools",
                      "Engineering Manpower & TnM",
                      "Cross-Charge Infra & Cloud",
                      "Security & Compliance Tooling",
                    ].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setCatFormName(sug);
                          if (sug.includes("CDN")) {
                            setCatFormCode("CDN");
                            setCatFormIcon("Radio");
                          } else if (sug.includes("Video")) {
                            setCatFormCode("VIDEO_PLATFORM");
                            setCatFormIcon("Tv");
                          } else if (sug.includes("SaaS")) {
                            setCatFormCode("SAAS");
                            setCatFormIcon("Sparkles");
                          } else if (sug.includes("Manpower")) {
                            setCatFormCode("MANPOWER");
                            setCatFormIcon("Users");
                          } else if (sug.includes("Cross")) {
                            setCatFormCode("CROSS_CHARGE");
                            setCatFormIcon("Building2");
                          } else if (sug.includes("Security")) {
                            setCatFormCode("SECURITY");
                            setCatFormIcon("Shield");
                          } else {
                            setCatFormCode("OTHER");
                            setCatFormIcon("Server");
                          }
                          setIsCustomCategoryCodeMode(false);
                        }}
                        className="px-2 py-1 rounded text-[10px] font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] cursor-pointer"
                      >
                        + {sug}
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
                    placeholder="e.g. CDN Bandwidth & Edge Caching"
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
                      {lobs
                        .filter((l) => l.id !== "ALL")
                        .map((l) => (
                          <option key={l.id} value={l.id} className="bg-slate-900 text-white">
                            {l.label}
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
                          <optgroup label="Default Categories" className="bg-slate-900 text-slate-400 font-semibold">
                            {categoryCodeOptions
                              .filter((opt) => !opt.isCustom)
                              .map((opt) => (
                                <option key={opt.code} value={opt.code} className="bg-slate-900 text-white font-normal">
                                  {opt.label}
                                </option>
                              ))}
                          </optgroup>
                          {categoryCodeOptions.some((opt) => opt.isCustom) && (
                            <optgroup label="Custom Added Categories" className="bg-slate-900 text-emerald-400 font-semibold">
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

                {/* Dynamic Custom Column Inputs */}
                {customColumns.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 space-y-2.5">
                    <span className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider">
                      Custom Fields
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      {customColumns.map((col) => (
                        <div key={col.id}>
                          <label className="text-slate-400 font-semibold block mb-1">{col.name}</label>
                          <input
                            type="text"
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
                      ))}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0B0F19] border border-slate-700/80 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Columns size={16} className="text-amber-400" />
                  <span>Manage Custom Columns</span>
                </h3>
                <button
                  onClick={() => setIsManageColumnsModalOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Custom columns appear on each sub-component row and in the sub-component editor.
              </p>

              {/* Existing Columns List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {customColumns.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No custom columns added yet.</p>
                ) : (
                  customColumns.map((col) => (
                    <div
                      key={col.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white"
                    >
                      <span className="font-semibold">{col.name}</span>
                      <button
                        onClick={() => handleDeleteCustomColumn(col.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                        title={`Delete ${col.name}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Column Form */}
              <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="New Column Name (e.g. Owner, Contract Target)"
                  className="flex-1 bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCustomColumn();
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomColumn}
                  disabled={!newColumnName.trim()}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Add
                </button>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManageColumnsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white"
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
                    value={yearDataFY}
                    onChange={(e) => handleYearDataFYChange(e.target.value)}
                    className="w-full bg-[#07090E] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                  >
                    {getFiscalYears().map((y) => (
                      <option key={y.id} value={y.id} className="bg-slate-900 text-white">
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
                const b = parseFloat(yearDataBudget) || 0;
                const act = yearDataMonths.filter((m) => m.status === "ACTUAL").reduce((s, m) => s + (m.amount || 0), 0);
                const proj = yearDataMonths.filter((m) => m.status === "PROJECTED").reduce((s, m) => s + (m.amount || 0), 0);
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
                    <span>12-Month Inputs for {yearDataFY}</span>
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
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
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
                  Save {yearDataFY} Data
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
