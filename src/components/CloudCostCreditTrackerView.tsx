import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  FileSpreadsheet,
  Upload,
  Download,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  Check,
  CheckCircle,
  AlertCircle,
  Info,
  Calendar,
  Cloud,
  Server,
  Zap,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
// richyrik: FinOps currency & global date filter context
import { useFinOpsCurrency } from "./FinOpsCurrencyContext";

export interface MonthColumn {
  key: string; // e.g. "Apr-2026"
  label: string; // e.g. "Apr-2026"
  type: "actual" | "projected";
}

export interface CostLineItem {
  id: string;
  name: string;
  isAop?: boolean;
  isTotal?: boolean;
  values: Record<string, number | null>;
}

export interface SubCategoryGroup {
  id: string;
  name: string; // e.g. "CDN", "Video Platform", "Cross Charge", "Total"
  mainCategory: string; // e.g. "Cloud Cost"
  lineItems: CostLineItem[];
}

const STORAGE_KEY = "xtelify_cloud_cost_tracker_v1";

export const DEFAULT_MONTH_COLUMNS: MonthColumn[] = [
  { key: "Apr-2026", label: "Apr-2026", type: "actual" },
  { key: "May-2026", label: "May-2026", type: "actual" },
  { key: "Jun-2026", label: "Jun-2026", type: "actual" },
  { key: "Jul-2026", label: "Jul-2026", type: "projected" },
  { key: "Aug-2026", label: "Aug-2026", type: "projected" },
  { key: "Sep-2026", label: "Sep-2026", type: "projected" },
  { key: "Oct-2026", label: "Oct-2026", type: "projected" },
  { key: "Nov-2026", label: "Nov-2026", type: "projected" },
  { key: "Dec-2026", label: "Dec-2026", type: "projected" },
  { key: "Jan-2027", label: "Jan-2027", type: "projected" },
  { key: "Feb-2027", label: "Feb-2027", type: "projected" },
  { key: "Mar-2027", label: "Mar-2027", type: "projected" },
];

const INITIAL_GROUPS: SubCategoryGroup[] = [
  {
    id: "subcat-cdn",
    name: "CDN",
    mainCategory: "Cloud Cost",
    lineItems: [
      {
        id: "item-aws-cf",
        name: "AWS (CloudFront)",
        values: {
          "Apr-2026": 485000,
          "May-2026": 512000,
          "Jun-2026": 498000,
          "Jul-2026": 520000,
          "Aug-2026": 535000,
          "Sep-2026": 540000,
          "Oct-2026": 550000,
          "Nov-2026": 560000,
          "Dec-2026": 580000,
          "Jan-2027": 565000,
          "Feb-2027": 550000,
          "Mar-2027": 570000,
        },
      },
      {
        id: "item-gcp-mcdn",
        name: "GCP (MediaCDN)",
        values: {
          "Apr-2026": 395000,
          "May-2026": 420000,
          "Jun-2026": 410000,
          "Jul-2026": 430000,
          "Aug-2026": 445000,
          "Sep-2026": 450000,
          "Oct-2026": 460000,
          "Nov-2026": 470000,
          "Dec-2026": 490000,
          "Jan-2027": 480000,
          "Feb-2027": 465000,
          "Mar-2027": 485000,
        },
      },
      {
        id: "item-akamai",
        name: "Akamai",
        values: {
          "Apr-2026": 820000,
          "May-2026": 845000,
          "Jun-2026": 830000,
          "Jul-2026": 860000,
          "Aug-2026": 875000,
          "Sep-2026": 890000,
          "Oct-2026": 905000,
          "Nov-2026": 920000,
          "Dec-2026": 940000,
          "Jan-2027": 915000,
          "Feb-2027": 890000,
          "Mar-2027": 910000,
        },
      },
      {
        id: "item-akamai-fixed",
        name: "Akamai (Fixed)",
        values: {
          "Apr-2026": 250000,
          "May-2026": 250000,
          "Jun-2026": 250000,
          "Jul-2026": 250000,
          "Aug-2026": 250000,
          "Sep-2026": 250000,
          "Oct-2026": 250000,
          "Nov-2026": 250000,
          "Dec-2026": 250000,
          "Jan-2027": 250000,
          "Feb-2027": 250000,
          "Mar-2027": 250000,
        },
      },
      {
        id: "item-cdn-aop",
        name: "CDN AOP",
        isAop: true,
        values: {
          "Apr-2026": 2000000,
          "May-2026": 2050000,
          "Jun-2026": 2050000,
          "Jul-2026": 2100000,
          "Aug-2026": 2150000,
          "Sep-2026": 2200000,
          "Oct-2026": 2250000,
          "Nov-2026": 2300000,
          "Dec-2026": 2350000,
          "Jan-2027": 2300000,
          "Feb-2027": 2250000,
          "Mar-2027": 2300000,
        },
      },
      {
        id: "item-cdn-total",
        name: "CDN Total",
        isTotal: true,
        values: {
          "Apr-2026": 1950000,
          "May-2026": 2027000,
          "Jun-2026": 1988000,
          "Jul-2026": 2060000,
          "Aug-2026": 2105000,
          "Sep-2026": 2130000,
          "Oct-2026": 2165000,
          "Nov-2026": 2200000,
          "Dec-2026": 2260000,
          "Jan-2027": 2210000,
          "Feb-2027": 2155000,
          "Mar-2027": 2215000,
        },
      },
    ],
  },
  {
    id: "subcat-video",
    name: "Video Platform",
    mainCategory: "Cloud Cost",
    lineItems: [
      {
        id: "item-ateme-aop",
        name: "Ateme AOP",
        isAop: true,
        values: {
          "Apr-2026": 600000,
          "May-2026": 600000,
          "Jun-2026": 600000,
          "Jul-2026": 620000,
          "Aug-2026": 620000,
          "Sep-2026": 620000,
          "Oct-2026": 650000,
          "Nov-2026": 650000,
          "Dec-2026": 650000,
          "Jan-2027": 650000,
          "Feb-2027": 650000,
          "Mar-2027": 650000,
        },
      },
      {
        id: "item-ateme",
        name: "Ateme",
        values: {
          "Apr-2026": 560000,
          "May-2026": 575000,
          "Jun-2026": 580000,
          "Jul-2026": 595000,
          "Aug-2026": 610000,
          "Sep-2026": 605000,
          "Oct-2026": 625000,
          "Nov-2026": 630000,
          "Dec-2026": 645000,
          "Jan-2027": 635000,
          "Feb-2027": 620000,
          "Mar-2027": 640000,
        },
      },
    ],
  },
  {
    id: "subcat-crosscharge",
    name: "Cross Charge",
    mainCategory: "Cloud Cost",
    lineItems: [
      {
        id: "item-api-aop",
        name: "API AOP",
        isAop: true,
        values: {
          "Apr-2026": 350000,
          "May-2026": 350000,
          "Jun-2026": 350000,
          "Jul-2026": 360000,
          "Aug-2026": 360000,
          "Sep-2026": 360000,
          "Oct-2026": 380000,
          "Nov-2026": 380000,
          "Dec-2026": 380000,
          "Jan-2027": 380000,
          "Feb-2027": 380000,
          "Mar-2027": 380000,
        },
      },
      {
        id: "item-api",
        name: "API",
        values: {
          "Apr-2026": 128658.49,
          "May-2026": 134200.0,
          "Jun-2026": 139500.0,
          "Jul-2026": 145000.0,
          "Aug-2026": 150000.0,
          "Sep-2026": 152000.0,
          "Oct-2026": 158000.0,
          "Nov-2026": 162000.0,
          "Dec-2026": 168000.0,
          "Jan-2027": 164000.0,
          "Feb-2027": 159000.0,
          "Mar-2027": 165000.0,
        },
      },
      {
        id: "item-direct-connect",
        name: "Direct Connect",
        values: {
          "Apr-2026": 210000,
          "May-2026": 210000,
          "Jun-2026": 210000,
          "Jul-2026": 210000,
          "Aug-2026": 210000,
          "Sep-2026": 210000,
          "Oct-2026": 210000,
          "Nov-2026": 210000,
          "Dec-2026": 210000,
          "Jan-2027": 210000,
          "Feb-2027": 210000,
          "Mar-2027": 210000,
        },
      },
    ],
  },
  {
    id: "subcat-total",
    name: "Total",
    mainCategory: "Cloud Cost",
    lineItems: [
      {
        id: "item-cumulative-aop",
        name: "Cumulative AOP",
        isAop: true,
        isTotal: true,
        values: {
          "Apr-2026": 2950000,
          "May-2026": 3000000,
          "Jun-2026": 3000000,
          "Jul-2026": 3080000,
          "Aug-2026": 3130000,
          "Sep-2026": 3180000,
          "Oct-2026": 3280000,
          "Nov-2026": 3330000,
          "Dec-2026": 3380000,
          "Jan-2027": 3330000,
          "Feb-2027": 3280000,
          "Mar-2027": 3330000,
        },
      },
      {
        id: "item-cumulative-spend",
        name: "Cumulative Spend",
        isTotal: true,
        values: {
          "Apr-2026": 2848658.49,
          "May-2026": 2946200.0,
          "Jun-2026": 2917500.0,
          "Jul-2026": 3010000.0,
          "Aug-2026": 3075000.0,
          "Sep-2026": 3097000.0,
          "Oct-2026": 3158000.0,
          "Nov-2026": 3202000.0,
          "Dec-2026": 3283000.0,
          "Jan-2027": 3219000.0,
          "Feb-2027": 3144000.0,
          "Mar-2027": 3230000.0,
        },
      },
    ],
  },
];

export const formatINR = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return "—";
  const abs = Math.abs(val);
  const prefix = val < 0 ? "-₹" : "₹";
  if (abs >= 10000000) {
    return `${prefix}${(abs / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `${prefix}${(abs / 100000).toFixed(2)} L`;
  }
  if (abs >= 1000) {
    return `${prefix}${(abs / 1000).toFixed(1)} K`;
  }
  return `${prefix}${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

export const CloudCostCreditTrackerView: React.FC = () => {
  // richyrik: Purged test data, initialized clean for real user Excel uploads
  const [groups, setGroups] = useState<SubCategoryGroup[]>(() => {
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

  const [monthColumns, setMonthColumns] = useState<MonthColumn[]>(DEFAULT_MONTH_COLUMNS);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "subcat-cdn": true,
    "subcat-video": true,
    "subcat-crosscharge": true,
    "subcat-total": true,
  });

  const [editingCell, setEditingCell] = useState<{
    groupId: string;
    itemId: string;
    monthKey: string;
    value: string;
  } | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState<string>("");
  const [newLineItemName, setNewLineItemName] = useState("");
  const [newLineItemIsAop, setNewLineItemIsAop] = useState(false);

  const [uploadFeedback, setUploadFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // richyrik: FinOps currency, datasets & MongoDB context
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

  // richyrik: Dynamically filter visible month columns based on global date filter
  const visibleMonthColumns = useMemo(() => {
    const list = monthColumns.filter((m) => isMonthSelected(m.key));
    return list.length > 0 ? list : monthColumns;
  }, [monthColumns, dateFilter.selectedMonths]);

  // richyrik: Ingestion & Dataset Deletion event listeners
  useEffect(() => {
    const handleIngest = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) setGroups(parsed);
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
          setGroups(Array.isArray(parsed) ? parsed : []);
        } else {
          setGroups([]);
        }
      } catch {
        setGroups([]);
      }
    };

    window.addEventListener("finops:ingest-credits", handleIngest);
    window.addEventListener("finops:dataset-deleted", handleDatasetDeleted);
    return () => {
      window.removeEventListener("finops:ingest-credits", handleIngest);
      window.removeEventListener("finops:dataset-deleted", handleDatasetDeleted);
    };
  }, []);

  // richyrik: Dynamic currency formatter replacing static INR
  const formatINR = (val: number | null | undefined): string => {
    return formatCurrency(val, true);
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    } catch {
      // ignore
    }
  }, [groups]);

  // Executive KPI summary calculations
  const kpiSummary = useMemo(() => {
    const actualMonthKeys = visibleMonthColumns.filter((m) => m.type === "actual").map((m) => m.key);
    const allMonthKeys = visibleMonthColumns.map((m) => m.key);

    let ytdActualSpend = 0;
    let ytdAopTarget = 0;
    let totalAnnualProjectedSpend = 0;
    let totalAnnualAopTarget = 0;

    groups.forEach((g) => {
      if (g.name.toLowerCase() === "total") return;

      g.lineItems.forEach((item) => {
        if (item.isTotal) return;

        allMonthKeys.forEach((mKey) => {
          const val = typeof item.values[mKey] === "number" ? (item.values[mKey] as number) : 0;
          const isActual = actualMonthKeys.includes(mKey);

          if (item.isAop) {
            totalAnnualAopTarget += val;
            if (isActual) ytdAopTarget += val;
          } else {
            totalAnnualProjectedSpend += val;
            if (isActual) ytdActualSpend += val;
          }
        });
      });
    });

    const ytdVariance = ytdActualSpend - ytdAopTarget;
    const ytdVariancePct = ytdAopTarget > 0 ? (ytdVariance / ytdAopTarget) * 100 : 0;

    const fullYearVariance = totalAnnualProjectedSpend - totalAnnualAopTarget;
    const fullYearVariancePct = totalAnnualAopTarget > 0 ? (fullYearVariance / totalAnnualAopTarget) * 100 : 0;

    return {
      ytdActualSpend,
      ytdAopTarget,
      ytdVariance,
      ytdVariancePct,
      totalAnnualProjectedSpend,
      totalAnnualAopTarget,
      fullYearVariance,
      fullYearVariancePct,
    };
  }, [groups, monthColumns]);

  // Filtered categories
  const filteredGroups = useMemo(() => {
    return groups
      .filter((g) => {
        if (selectedCategory === "All") return true;
        return g.name.toLowerCase() === selectedCategory.toLowerCase();
      })
      .map((g) => {
        if (!searchQuery.trim()) return g;
        const q = searchQuery.toLowerCase();
        const matchingItems = g.lineItems.filter((item) => item.name.toLowerCase().includes(q));
        return {
          ...g,
          lineItems: matchingItems,
        };
      })
      .filter((g) => g.lineItems.length > 0 || !searchQuery.trim());
  }, [groups, selectedCategory, searchQuery]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const expandAll = (expand: boolean) => {
    const updated: Record<string, boolean> = {};
    groups.forEach((g) => {
      updated[g.id] = expand;
    });
    setExpandedGroups(updated);
  };

  // Inline cell edit save
  const handleCellSave = () => {
    if (!editingCell) return;
    const { groupId, itemId, monthKey, value } = editingCell;
    const num = value.trim() === "" ? null : parseFloat(value.replace(/,/g, ""));

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          lineItems: g.lineItems.map((item) => {
            if (item.id !== itemId) return item;
            return {
              ...item,
              values: {
                ...item.values,
                [monthKey]: num !== null && !isNaN(num) ? num : null,
              },
            };
          }),
        };
      })
    );
    setEditingCell(null);
  };

  // Add line item
  const handleAddLineItem = () => {
    if (!newLineItemName.trim() || !targetGroupId) return;

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== targetGroupId) return g;
        const newItem: CostLineItem = {
          id: `item-custom-${Date.now()}`,
          name: newLineItemName.trim(),
          isAop: newLineItemIsAop,
          values: {},
        };
        monthColumns.forEach((m) => {
          newItem.values[m.key] = 0;
        });
        return {
          ...g,
          lineItems: [...g.lineItems, newItem],
        };
      })
    );

    setIsAddModalOpen(false);
    setNewLineItemName("");
    setNewLineItemIsAop(false);
  };

  const handleDeleteLineItem = (groupId: string, itemId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          lineItems: g.lineItems.filter((item) => item.id !== itemId),
        };
      })
    );
  };

  // Excel parser for hierarchical tracker
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
        setUploadFeedback({ type: "error", message: "Excel sheet is empty." });
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

      if (rawRows.length < 3) {
        setUploadFeedback({ type: "error", message: "Insufficient rows in sheet for hierarchical tracker." });
        return;
      }

      // Detect header row containing month names (e.g. Apr-2026, May-2026)
      let headerRowIndex = -1;
      let detectedMonths: MonthColumn[] = [];

      for (let r = 0; r < Math.min(6, rawRows.length); r++) {
        const row = rawRows[r];
        if (!Array.isArray(row)) continue;

        const monthsInRow: MonthColumn[] = [];
        for (let c = 3; c < row.length; c++) {
          const cellStr = String(row[c] || "").trim();
          if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(cellStr)) {
            const isActual = /^(apr|may|jun)/i.test(cellStr);
            monthsInRow.push({
              key: cellStr,
              label: cellStr,
              type: isActual ? "actual" : "projected",
            });
          }
        }

        if (monthsInRow.length >= 3) {
          headerRowIndex = r;
          detectedMonths = monthsInRow;
          break;
        }
      }

      if (detectedMonths.length > 0) {
        setMonthColumns(detectedMonths);
      } else {
        detectedMonths = DEFAULT_MONTH_COLUMNS;
      }

      const parsedGroupsMap: Record<string, SubCategoryGroup> = {};
      let currentMainCategory = "Cloud Cost";
      let currentSubCategory = "CDN";

      const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 3;

      for (let r = startRow; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!Array.isArray(row)) continue;

        const rawColA = String(row[0] || "").trim();
        const rawColB = String(row[1] || "").trim();
        const rawColC = String(row[2] || "").trim();

        if (rawColA) currentMainCategory = rawColA;
        if (rawColB) currentSubCategory = rawColB;

        const lineItemName = rawColC || (rawColB && !rawColA ? rawColB : "");
        if (!lineItemName) continue;

        const groupKey = currentSubCategory || "General";
        if (!parsedGroupsMap[groupKey]) {
          parsedGroupsMap[groupKey] = {
            id: `subcat-${groupKey.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`,
            name: groupKey,
            mainCategory: currentMainCategory,
            lineItems: [],
          };
        }

        const values: Record<string, number | null> = {};
        detectedMonths.forEach((m, idx) => {
          const colIdx = 3 + idx;
          const cellVal = row[colIdx];
          if (cellVal !== undefined && cellVal !== null && cellVal !== "") {
            const num = parseFloat(String(cellVal).replace(/[₹,crCR\s]/g, ""));
            values[m.key] = isNaN(num) ? null : num;
          } else {
            values[m.key] = null;
          }
        });

        const isAop = /aop/i.test(lineItemName);
        const isTotal = /total|cumulative/i.test(lineItemName);

        parsedGroupsMap[groupKey].lineItems.push({
          id: `item-${Date.now()}-${r}`,
          name: lineItemName,
          isAop,
          isTotal,
          values,
        });
      }

      const resultGroups = Object.values(parsedGroupsMap);
      if (resultGroups.length === 0) {
        setUploadFeedback({ type: "error", message: "Could not find hierarchical cost rows in sheet." });
        return;
      }

      setGroups(resultGroups);
      setUploadFeedback({
        type: "success",
        message: `Successfully parsed ${resultGroups.length} cost categories and ${detectedMonths.length} monthly timeline columns from "${file.name}".`,
      });
    } catch (err: any) {
      setUploadFeedback({
        type: "error",
        message: `Error reading Excel file: ${err?.message || "Invalid file format"}`,
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

  // Export to Excel with Images 1 & 2 layout
  const handleExportExcel = () => {
    const headerRow1 = ["Main Category", "Sub-category", "Line Item", ...monthColumns.map((m) => m.label)];
    const dataRows: any[][] = [];

    groups.forEach((g) => {
      g.lineItems.forEach((item, idx) => {
        const row: any[] = [
          idx === 0 ? g.mainCategory : "",
          idx === 0 ? g.name : "",
          item.name,
          ...monthColumns.map((m) => item.values[m.key] ?? ""),
        ];
        dataRows.push(row);
      });
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headerRow1, ...dataRows]);
    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 20 },
      { wch: 25 },
      ...monthColumns.map(() => ({ wch: 15 })),
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cloud Cost Tracker");
    XLSX.writeFile(workbook, `Cloud_Cost_Credit_Tracker_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleResetDefault = () => {
    setGroups(INITIAL_GROUPS);
    setMonthColumns(DEFAULT_MONTH_COLUMNS);
    setUploadFeedback({ type: "info", message: "Reset to default Cloud Cost & Credit Tracker template." });
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER & EXCEL UPLOAD ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-cyan-300 to-teal-400">
                Cloud Cost & Credit Tracker
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Hierarchical FinOps
              </span>
            </h2>
          </div>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            Hierarchical cost tracking across CDN, Video Platforms, Cross Charges, and monthly Actual vs Projected forecasts.
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
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-900/30 transition-all border border-cyan-400/20 active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Tracker Excel
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-white/[0.08] transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export Excel
          </button>

          <button
            onClick={handleResetDefault}
            title="Reset to default company template"
            className="p-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 rounded-xl border border-white/[0.08] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── UPLOAD FEEDBACK ── */}
      <AnimatePresence>
        {uploadFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
              uploadFeedback.type === "success"
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

      {/* ── CATEGORY SELECTOR BAR & CONTROLS ── */}
      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory("All")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedCategory === "All"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-900/30"
                : "bg-[#07090E]/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            All Categories
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedCategory(g.name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory.toLowerCase() === g.name.toLowerCase()
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-900/30"
                  : "bg-[#07090E]/60 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <span>{g.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                {g.lineItems.length}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Accordion Controls */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search component..."
              className="w-full bg-[#07090E]/80 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/70"
            />
          </div>

          <button
            onClick={() => expandAll(true)}
            className="px-2.5 py-1.5 bg-[#07090E]/80 border border-slate-700/80 text-slate-300 hover:text-white text-xs rounded-xl"
          >
            Expand All
          </button>
          <button
            onClick={() => expandAll(false)}
            className="px-2.5 py-1.5 bg-[#07090E]/80 border border-slate-700/80 text-slate-300 hover:text-white text-xs rounded-xl"
          >
            Collapse
          </button>
        </div>
      </div>

      {/* ── TOP 3 EXECUTIVE KPI CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Total YTD Actual Spend */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-emerald-500/30 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total YTD Actual Spend
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-emerald-400 font-mono">
            {formatINR(kpiSummary.ytdActualSpend)}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
            <span>Apr-2026 to Jun-2026 Actuals</span>
            <span className="text-slate-300 font-mono">AOP: {formatINR(kpiSummary.ytdAopTarget)}</span>
          </div>
        </div>

        {/* KPI 2: Total Annual Projected Spend */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-cyan-500/30 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Annual Projected Spend
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-white font-mono">
            {formatINR(kpiSummary.totalAnnualProjectedSpend)}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
            <span>12-Month Fiscal Run-rate</span>
            <span className="text-slate-300 font-mono">
              Target: {formatINR(kpiSummary.totalAnnualAopTarget)}
            </span>
          </div>
        </div>

        {/* KPI 3: AOP Variance */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-indigo-500/30 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              YTD AOP Variance
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div
              className={`text-2xl font-black tracking-tight font-mono ${
                kpiSummary.ytdVariance <= 0 ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {kpiSummary.ytdVariance <= 0 ? "-" : "+"}
              {formatINR(Math.abs(kpiSummary.ytdVariance))}
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                kpiSummary.ytdVariance <= 0
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-300 border-amber-500/30"
              }`}
            >
              {kpiSummary.ytdVariance <= 0 ? "Under AOP (Favorable)" : "Over AOP"}
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
            <span>Variance Rate: {Math.abs(kpiSummary.ytdVariancePct).toFixed(1)}%</span>
            <span>FY Forecast: {kpiSummary.fullYearVariance <= 0 ? "Under Budget" : "Attention"}</span>
          </div>
        </div>
      </div>

      {/* ── EMPTY STATE DROPZONE ── */}
      {groups.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all bg-white/[0.01] ${
            isDragging ? "border-cyan-500 bg-cyan-500/10" : "border-slate-700/80 hover:border-slate-600"
          }`}
        >
          <input
            type="file"
            ref={dropzoneInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            Ready for your Cloud Cost & Credit Tracker Excel upload
          </h3>
          <p className="text-slate-400 text-xs max-w-lg mx-auto mb-6">
            Upload your Excel file to start tracking monthly spend and run-rates. All uploaded sheets are automatically saved to Airtel Cloud Ops Security MongoDB (<code className="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">xtelify_db.finops_datasets</code>).
          </p>
          <div className="flex items-center justify-center flex-wrap gap-3">
            <button
              onClick={() => dropzoneInputRef.current?.click()}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold rounded-xl shadow-lg hover:from-emerald-400 hover:to-teal-400 cursor-pointer"
            >
              Select Excel File
            </button>
            <button
              onClick={() => setIsDatasetManagerOpen(true)}
              className="px-5 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold rounded-xl border border-white/[0.08] cursor-pointer"
            >
              View Datasets ({datasets.length})
            </button>
            <button
              onClick={handleResetDefault}
              className="px-4 py-2.5 bg-slate-800/60 hover:bg-slate-800 text-slate-400 text-xs rounded-xl border border-slate-700/60 cursor-pointer"
            >
              Load Sample Template
            </button>
          </div>
        </div>
      ) : (
        /* ── HIERARCHICAL ACCORDION TABLE VIEW ── */
        <div className="space-y-5">
          {filteredGroups.map((group) => {
            const isExpanded = !!expandedGroups[group.id];

            // Sub-category totals for YTD Actual and FY Projected (filtered by global date filter)
            const actualKeys = visibleMonthColumns.filter((m) => m.type === "actual").map((m) => m.key);
            const allKeys = visibleMonthColumns.map((m) => m.key);

            let subcatYtd = 0;
            let subcatFy = 0;

            group.lineItems.forEach((item) => {
              if (item.isAop || item.isTotal) return;
              actualKeys.forEach((k) => {
                subcatYtd += item.values[k] ?? 0;
              });
              allKeys.forEach((k) => {
                subcatFy += item.values[k] ?? 0;
              });
            });

            return (
              <div
                key={group.id}
                className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] overflow-hidden transition-all"
              >
                {/* Accordion Header */}
                <div
                  onClick={() => toggleGroup(group.id)}
                  className="p-4 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-transform">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                          {group.mainCategory}
                        </span>
                        <span className="text-slate-600">•</span>
                        <h3 className="text-base font-bold text-white tracking-tight">
                          {group.name}
                        </h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          {group.lineItems.length} Line Items
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    {group.name.toLowerCase() !== "total" && (
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-slate-400">
                          YTD Actual:{" "}
                          <span className="text-emerald-400 font-bold">{formatINR(subcatYtd)}</span>
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="text-slate-400">
                          FY Projected:{" "}
                          <span className="text-white font-bold">{formatINR(subcatFy)}</span>
                        </span>
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTargetGroupId(group.id);
                        setIsAddModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-medium transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Row</span>
                    </button>
                  </div>
                </div>

                {/* Accordion Body: Table */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-x-auto"
                    >
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          {/* Super Header: Grouping Actuals vs Projected */}
                          <tr className="border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
                            <th className="py-2.5 px-4 bg-[#07090E]/90 text-slate-400 sticky left-0 z-20 w-64">
                              Line Item / Component
                            </th>
                            <th
                              colSpan={monthColumns.filter((m) => m.type === "actual").length}
                              className="py-1.5 px-4 bg-emerald-950/20 text-emerald-300 border-x border-emerald-500/20 text-center"
                            >
                              Actuals
                            </th>
                            <th
                              colSpan={monthColumns.filter((m) => m.type === "projected").length}
                              className="py-1.5 px-4 bg-amber-950/20 text-amber-300 border-r border-amber-500/20 text-center"
                            >
                              Projected Forecast
                            </th>
                            <th className="py-1.5 px-4 bg-violet-950/20 text-violet-300 text-center font-bold">
                              Full Year Total
                            </th>
                            <th className="py-1.5 px-2 bg-[#07090E]/90 text-center w-12">Action</th>
                          </tr>

                          {/* Sub Header: Month Names */}
                          <tr className="border-b border-slate-800/80 bg-[#07090E]/80 text-[11px] font-bold text-slate-400 whitespace-nowrap">
                            <th className="py-3 px-4 sticky left-0 z-20 bg-[#07090E]">Component</th>
                            {visibleMonthColumns.map((m) => (
                              <th
                                key={m.key}
                                className={`py-3 px-3 text-right font-mono ${
                                  m.type === "actual"
                                    ? "bg-emerald-950/10 text-emerald-200 border-r border-emerald-500/10"
                                    : "bg-amber-950/10 text-amber-200 border-r border-amber-500/10"
                                }`}
                              >
                                {m.label}
                              </th>
                            ))}
                            <th className="py-3 px-4 text-right font-mono text-violet-200 bg-violet-950/10">
                              {visibleMonthColumns.length === monthColumns.length ? "FY Total" : `Total (${visibleMonthColumns.length}M)`}
                            </th>
                            <th className="py-3 px-2 text-center bg-[#07090E]"></th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {group.lineItems.map((item) => {
                            const isAopRow = item.isAop;
                            const isTotalRow = item.isTotal;

                            // Calculate FY row sum based on active visible months
                            let rowSum = 0;
                            let hasAnyValue = false;
                            visibleMonthColumns.forEach((m) => {
                              const val = item.values[m.key];
                              if (typeof val === "number") {
                                rowSum += val;
                                hasAnyValue = true;
                              }
                            });

                            return (
                              <tr
                                key={item.id}
                                className={`transition-colors group ${
                                  isTotalRow
                                    ? "bg-slate-900/60 font-bold border-t-2 border-slate-700"
                                    : isAopRow
                                    ? "bg-blue-950/20 text-cyan-200 font-semibold"
                                    : "hover:bg-white/[0.02]"
                                }`}
                              >
                                {/* Sticky Column: Line Item Name */}
                                <td
                                  className={`py-3 px-4 sticky left-0 z-10 whitespace-nowrap font-sans font-medium flex items-center justify-between gap-2 ${
                                    isTotalRow
                                      ? "bg-[#0B0F19] text-white font-bold"
                                      : isAopRow
                                      ? "bg-[#091122] text-cyan-300 font-semibold"
                                      : "bg-[#07090E] text-slate-200"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    {isAopRow ? (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                        AOP
                                      </span>
                                    ) : isTotalRow ? (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                        TOTAL
                                      </span>
                                    ) : (
                                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500 group-hover:bg-cyan-400 transition-colors" />
                                    )}
                                    <span className="truncate">{item.name}</span>
                                  </div>
                                </td>

                                {/* Monthly Data Cells */}
                                {visibleMonthColumns.map((m) => {
                                  const cellVal = item.values[m.key];
                                  const isEditing =
                                    editingCell?.groupId === group.id &&
                                    editingCell?.itemId === item.id &&
                                    editingCell?.monthKey === m.key;

                                  return (
                                    <td
                                      key={m.key}
                                      onClick={() => {
                                        setEditingCell({
                                          groupId: group.id,
                                          itemId: item.id,
                                          monthKey: m.key,
                                          value: cellVal !== null && cellVal !== undefined ? String(cellVal) : "",
                                        });
                                      }}
                                      className={`py-2 px-3 text-right whitespace-nowrap cursor-pointer transition-colors relative ${
                                        m.type === "actual"
                                          ? "hover:bg-emerald-500/15 text-emerald-100"
                                          : "hover:bg-amber-500/15 text-amber-100"
                                      } ${
                                        isEditing ? "ring-2 ring-cyan-400 bg-cyan-950/40 z-20" : ""
                                      }`}
                                      title="Click to edit value"
                                    >
                                      {isEditing ? (
                                        <div
                                          className="flex items-center gap-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <input
                                            type="number"
                                            autoFocus
                                            value={editingCell.value}
                                            onChange={(e) =>
                                              setEditingCell({ ...editingCell, value: e.target.value })
                                            }
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") handleCellSave();
                                              if (e.key === "Escape") setEditingCell(null);
                                            }}
                                            onBlur={handleCellSave}
                                            className="w-24 bg-[#07090E] border border-cyan-400 rounded px-1.5 py-0.5 text-right text-xs text-white focus:outline-none"
                                          />
                                          <button
                                            onClick={handleCellSave}
                                            className="p-1 rounded bg-cyan-600 text-white hover:bg-cyan-500"
                                          >
                                            <Check className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-end gap-1.5">
                                          <span>{formatINR(cellVal)}</span>
                                          <Edit2 className="w-2.5 h-2.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}

                                {/* Full Year Total */}
                                <td
                                  className={`py-3 px-4 text-right whitespace-nowrap font-bold ${
                                    isTotalRow
                                      ? "text-violet-300 bg-violet-950/30"
                                      : isAopRow
                                      ? "text-cyan-300 bg-cyan-950/20"
                                      : "text-white bg-white/[0.01]"
                                  }`}
                                >
                                  {hasAnyValue ? formatINR(rowSum) : "—"}
                                </td>

                                {/* Delete Row Action */}
                                <td className="py-3 px-2 text-center whitespace-nowrap">
                                  {!isTotalRow && (
                                    <button
                                      onClick={() => handleDeleteLineItem(group.id, item.id)}
                                      className="p-1 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Delete Row"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ADD LINE ITEM MODAL ── */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0B0F19] border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-6 text-xs text-slate-300 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Add Cost Component</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Component / Vendor Name *
                  </label>
                  <input
                    type="text"
                    value={newLineItemName}
                    onChange={(e) => setNewLineItemName(e.target.value)}
                    placeholder="e.g. Fastly CDN or Azure Edge"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isAopCheck"
                    checked={newLineItemIsAop}
                    onChange={(e) => setNewLineItemIsAop(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0"
                  />
                  <label htmlFor="isAopCheck" className="text-xs text-slate-300 cursor-pointer">
                    Is this an AOP Budget target row?
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLineItem}
                  disabled={!newLineItemName.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white rounded-xl font-semibold shadow-lg shadow-cyan-900/30"
                >
                  Add Component
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
