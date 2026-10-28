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
// FinOps currency & global date filter context
import { useFinOpsCurrency } from "./FinOpsCurrencyContext";
import { FinOpsEmptyStateCard } from "./FinOpsEmptyStateCard";
import { saveFinOpsDataForFY } from "./finopsMultiYearStorage";

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

const INITIAL_GROUPS: SubCategoryGroup[] = [];

const isScrapCreditGroup = (g: SubCategoryGroup): boolean => {
  if (!g) return true;
  if (
    g.id === "subcat-cdn" ||
    g.id === "subcat-video" ||
    g.id === "subcat-crosscharge" ||
    g.id === "subcat-total"
  ) {
    return true;
  }
  const mockItemIds = new Set([
    "item-aws-cf",
    "item-gcp-mcdn",
    "item-akamai",
    "item-akamai-fixed",
    "item-cdn-aop",
    "item-cdn-total",
    "item-ateme-aop",
    "item-ateme",
    "item-api-aop",
    "item-api",
    "item-direct-connect",
    "item-cumulative-aop",
    "item-cumulative-spend",
  ]);
  if (g.lineItems && g.lineItems.length > 0 && g.lineItems.every((item) => mockItemIds.has(item.id))) {
    return true;
  }
  return false;
};

const sanitizeCreditGroups = (list: any[]): SubCategoryGroup[] => {
  if (!Array.isArray(list)) return [];
  return list.filter((g) => !isScrapCreditGroup(g));
};

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
        const cleaned = sanitizeCreditGroups(parsed);
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        }
        return cleaned;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [monthColumns, setMonthColumns] = useState<MonthColumn[]>(DEFAULT_MONTH_COLUMNS);
  const [selectedTrackerType, setSelectedTrackerType] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [editingCell, setEditingCell] = useState<{
    groupId: string;
    itemId: string;
    monthKey: string;
    value: string;
  } | null>(null);

  // Hierarchical Add Row / Component Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState<string>("");
  const [addModalDomain, setAddModalDomain] = useState<string>("Cloud Cost");
  const [customAddDomain, setCustomAddDomain] = useState<string>("");
  const [addModalCategoryName, setAddModalCategoryName] = useState<string>("");
  const [newLineItemName, setNewLineItemName] = useState("");
  const [newLineItemIsAop, setNewLineItemIsAop] = useState(false);


  // Category Creation & Editing Modal States
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newTrackerType, setNewTrackerType] = useState("Cloud Cost");
  const [customTrackerType, setCustomTrackerType] = useState("");
  const [initialLineItemName, setInitialLineItemName] = useState("");

  const [editingCategory, setEditingCategory] = useState<SubCategoryGroup | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editTrackerType, setEditTrackerType] = useState("Cloud Cost");
  const [customEditTrackerType, setCustomEditTrackerType] = useState("");

  // Line Item Rename / Config State
  const [editingLineItem, setEditingLineItem] = useState<{
    groupId: string;
    item: CostLineItem;
  } | null>(null);
  const [editLineItemName, setEditLineItemName] = useState("");
  const [editLineItemIsAop, setEditLineItemIsAop] = useState(false);
  const [editLineItemIsTotal, setEditLineItemIsTotal] = useState(false);

  const PRESET_TRACKER_TYPES = [
    "Cloud Cost",
    "SaaS & Software Licenses",
    "Database & Storage Credits",
    "Network & Bandwidth Transit",
    "AI / ML & GPU Compute",
    "Third-Party Vendor Commitments",
  ];

  const allTrackerTypes = useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g) => {
      if (g.mainCategory && g.mainCategory.trim()) set.add(g.mainCategory.trim());
    });
    PRESET_TRACKER_TYPES.forEach((t) => set.add(t));
    return Array.from(set);
  }, [groups]);

  const [uploadFeedback, setUploadFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const activeFY = dateFilter?.fiscalYear || "FY 2026-27";
  const getStorageKeyForFY = (fy: string) => `${STORAGE_KEY}_${fy.replace(/\s+/g, "_")}`;

  // Load isolated groups when activeFY changes
  useEffect(() => {
    try {
      const fyKey = getStorageKeyForFY(activeFY);
      const saved = localStorage.getItem(fyKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = sanitizeCreditGroups(parsed);
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(fyKey, JSON.stringify(cleaned));
          }
          setGroups(cleaned);
          return;
        }
      }
      if (activeFY === "FY 2026-27") {
        const legacy = localStorage.getItem(STORAGE_KEY);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (Array.isArray(parsed)) {
            const cleaned = sanitizeCreditGroups(parsed);
            if (cleaned.length !== parsed.length) {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
            }
            setGroups(cleaned);
            return;
          }
        }
      }
      setGroups([]);
    } catch {
      setGroups([]);
    }
  }, [activeFY]);

  // Dynamically filter visible month columns based on global date filter
  const visibleMonthColumns = useMemo(() => {
    const list = monthColumns.filter((m) => isMonthSelected(m.key));
    return list.length > 0 ? list : monthColumns;
  }, [monthColumns, dateFilter.selectedMonths]);

  // Ingestion & Dataset Deletion event listeners
  useEffect(() => {
    const handleIngest = () => {
      try {
        const fyKey = getStorageKeyForFY(activeFY);
        const saved = localStorage.getItem(fyKey) || localStorage.getItem(STORAGE_KEY);
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
        const fyKey = getStorageKeyForFY(activeFY);
        const saved = localStorage.getItem(fyKey);
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
  }, [activeFY]);

  // Dynamic currency formatter replacing static INR
  const formatINR = (val: number | null | undefined): string => {
    return formatCurrency(val, true);
  };

  useEffect(() => {
    try {
      const fyKey = getStorageKeyForFY(activeFY);
      localStorage.setItem(fyKey, JSON.stringify(groups));
      saveFinOpsDataForFY(activeFY, { creditPools: groups });
    } catch {
      // ignore
    }
  }, [groups, activeFY]);

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

  // Filtered categories respecting active tracker type, category, and search query
  const filteredGroups = useMemo(() => {
    return groups
      .filter((g) => {
        if (
          selectedTrackerType !== "All" &&
          g.mainCategory?.toLowerCase() !== selectedTrackerType.toLowerCase()
        ) {
          return false;
        }
        if (selectedCategory !== "All" && g.name.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
        return true;
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
  }, [groups, selectedTrackerType, selectedCategory, searchQuery]);

  const categoriesForSelectedTracker = useMemo(() => {
    if (selectedTrackerType === "All") return groups;
    return groups.filter(
      (g) => g.mainCategory?.toLowerCase() === selectedTrackerType.toLowerCase()
    );
  }, [groups, selectedTrackerType]);

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

  // Delete entire category (e.g. Delete whole CDN or Video Platform)
  const handleDeleteCategory = (groupId: string, groupName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the whole "${groupName}" category and all of its line items?`
      )
    ) {
      return;
    }

    const updated = groups.filter((g) => g.id !== groupId);
    setGroups(updated);
    const fyKey = getStorageKeyForFY(activeFY);
    localStorage.setItem(fyKey, JSON.stringify(updated));
    saveFinOpsDataForFY(activeFY, { creditPools: updated });
    window.dispatchEvent(
      new CustomEvent("finops:fy-data-updated", { detail: { fy: activeFY } })
    );

    if (selectedCategory.toLowerCase() === groupName.toLowerCase()) {
      setSelectedCategory("All");
    }
    setUploadFeedback({
      type: "info",
      message: `Deleted "${groupName}" category and its line items.`,
    });
  };

  // Create new category under specified or custom tracker type
  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    const resolvedTracker =
      newTrackerType === "Custom..."
        ? (customTrackerType.trim() || "Custom Tracker")
        : newTrackerType;

    const newGroupId = `subcat-${Date.now()}`;
    const lineItemName = initialLineItemName.trim() || `${newCategoryName.trim()} Item 1`;
    const initialItem: CostLineItem = {
      id: `item-${Date.now()}`,
      name: lineItemName,
      isAop: false,
      values: {},
    };
    monthColumns.forEach((m) => {
      initialItem.values[m.key] = 0;
    });

    const newGroup: SubCategoryGroup = {
      id: newGroupId,
      name: newCategoryName.trim(),
      mainCategory: resolvedTracker,
      lineItems: [initialItem],
    };

    const updated = [...groups, newGroup];
    setGroups(updated);
    const fyKey = getStorageKeyForFY(activeFY);
    localStorage.setItem(fyKey, JSON.stringify(updated));
    saveFinOpsDataForFY(activeFY, { creditPools: updated });
    window.dispatchEvent(
      new CustomEvent("finops:fy-data-updated", { detail: { fy: activeFY } })
    );

    setExpandedGroups((prev) => ({ ...prev, [newGroupId]: true }));
    setIsNewCategoryModalOpen(false);
    setNewCategoryName("");
    setNewTrackerType("Cloud Cost");
    setCustomTrackerType("");
    setInitialLineItemName("");
    setUploadFeedback({
      type: "success",
      message: `Created new category "${newGroup.name}" under ${resolvedTracker}.`,
    });
  };

  // Save changes to category name and tracker type
  const handleSaveCategoryEdit = () => {
    if (!editingCategory || !editCategoryName.trim()) return;
    const resolvedTracker =
      editTrackerType === "Custom..."
        ? (customEditTrackerType.trim() || "Custom Tracker")
        : editTrackerType;

    const updated = groups.map((g) => {
      if (g.id !== editingCategory.id) return g;
      return {
        ...g,
        name: editCategoryName.trim(),
        mainCategory: resolvedTracker,
      };
    });

    setGroups(updated);
    const fyKey = getStorageKeyForFY(activeFY);
    localStorage.setItem(fyKey, JSON.stringify(updated));
    saveFinOpsDataForFY(activeFY, { creditPools: updated });
    window.dispatchEvent(
      new CustomEvent("finops:fy-data-updated", { detail: { fy: activeFY } })
    );

    setEditingCategory(null);
    setUploadFeedback({ type: "success", message: `Category updated successfully.` });
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

  // Existing categories matching the currently selected domain in Add Row modal
  const addModalDomainGroups = useMemo(() => {
    const effectiveDomain =
      addModalDomain === "Custom..." ? customAddDomain.trim() : addModalDomain.trim();
    if (!effectiveDomain) return [];
    return groups.filter(
      (g) => (g.mainCategory || "Cloud Cost").toLowerCase() === effectiveDomain.toLowerCase()
    );
  }, [groups, addModalDomain, customAddDomain]);

  const handleOpenAddRowModal = (
    prefillDomain?: string,
    prefillGroupId?: string,
    prefillCategoryName?: string
  ) => {
    const domain =
      prefillDomain || (selectedTrackerType !== "All" ? selectedTrackerType : "Cloud Cost");
    const isPreset = PRESET_TRACKER_TYPES.includes(domain);
    setAddModalDomain(isPreset ? domain : "Custom...");
    setCustomAddDomain(isPreset ? "" : domain);
    setTargetGroupId(prefillGroupId || "");
    setAddModalCategoryName(prefillCategoryName || "");
    setNewLineItemName("");
    setNewLineItemIsAop(false);
    setIsAddModalOpen(true);
  };

  const handleCloseAddRowModal = () => {
    setIsAddModalOpen(false);
    setTargetGroupId("");
    setAddModalCategoryName("");
    setNewLineItemName("");
    setNewLineItemIsAop(false);
    setCustomAddDomain("");
  };

  // Add line item / row to category (or create new category under selected domain)
  const handleAddLineItem = () => {
    const effectiveDomain =
      addModalDomain === "Custom..." ? customAddDomain.trim() : addModalDomain.trim();
    if (!effectiveDomain || !newLineItemName.trim()) return;

    let chosenGroup = groups.find((g) => g.id === targetGroupId);
    const catName = chosenGroup ? chosenGroup.name : addModalCategoryName.trim();
    if (!chosenGroup && !catName) return;

    const newItem: CostLineItem = {
      id: `item-custom-${Date.now()}`,
      name: newLineItemName.trim(),
      isAop: newLineItemIsAop,
      values: {},
    };
    monthColumns.forEach((m) => {
      newItem.values[m.key] = 0;
    });

    let updated: SubCategoryGroup[];
    if (chosenGroup) {
      updated = groups.map((g) => {
        if (g.id !== chosenGroup!.id) return g;
        return {
          ...g,
          lineItems: [...g.lineItems, newItem],
        };
      });
    } else {
      const existing = groups.find(
        (g) =>
          (g.mainCategory || "Cloud Cost").toLowerCase() === effectiveDomain.toLowerCase() &&
          g.name.toLowerCase() === catName.toLowerCase()
      );
      if (existing) {
        updated = groups.map((g) => {
          if (g.id !== existing.id) return g;
          return {
            ...g,
            lineItems: [...g.lineItems, newItem],
          };
        });
      } else {
        const newG: SubCategoryGroup = {
          id: `subcat-${Date.now()}`,
          name: catName,
          mainCategory: effectiveDomain,
          lineItems: [newItem],
        };
        updated = [...groups, newG];
      }
    }

    setGroups(updated);
    const fyKey = getStorageKeyForFY(activeFY);
    localStorage.setItem(fyKey, JSON.stringify(updated));
    saveFinOpsDataForFY(activeFY, { creditPools: updated });
    window.dispatchEvent(
      new CustomEvent("finops:fy-data-updated", { detail: { fy: activeFY } })
    );

    handleCloseAddRowModal();
    setUploadFeedback({
      type: "success",
      message: `Added row "${newItem.name}" under ${effectiveDomain} / ${catName}.`,
    });
  };

  // Delete line item / row from category
  const handleDeleteLineItem = (groupId: string, itemId: string, itemName?: string) => {
    if (itemName && !window.confirm(`Are you sure you want to delete row "${itemName}"?`)) {
      return;
    }
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

  // Save line item rename & config
  const handleSaveLineItemEdit = () => {
    if (!editingLineItem || !editLineItemName.trim()) return;
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== editingLineItem.groupId) return g;
        return {
          ...g,
          lineItems: g.lineItems.map((item) => {
            if (item.id !== editingLineItem.item.id) return item;
            return {
              ...item,
              name: editLineItemName.trim(),
              isAop: editLineItemIsAop,
              isTotal: editLineItemIsTotal,
            };
          }),
        };
      })
    );
    setEditingLineItem(null);
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
            onClick={() => handleOpenAddRowModal()}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-900/30 transition-all border border-cyan-400/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </button>

          <button
            onClick={() => {
              setNewCategoryName("");
              setNewTrackerType(selectedTrackerType !== "All" ? selectedTrackerType : "Cloud Cost");
              setCustomTrackerType("");
              setInitialLineItemName("");
              setIsNewCategoryModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-teal-900/30 transition-all border border-teal-400/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Tracker Category
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-900/30 transition-all border border-cyan-400/20 active:scale-95 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Tracker Excel
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-white/[0.08] transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export Excel
          </button>

          <button
            onClick={handleResetDefault}
            title="Reset to default company template"
            className="p-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 rounded-xl border border-white/[0.08] transition-all cursor-pointer"
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
      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] space-y-3">
        {/* Tier 1: Tracker Type Filter Bar */}
        <div className="flex items-center flex-wrap gap-2 pb-3 border-b border-slate-800/80">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tracker Type:</span>
          </span>
          <button
            onClick={() => {
              setSelectedTrackerType("All");
              setSelectedCategory("All");
            }}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedTrackerType === "All"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-cyan-900/30 border border-cyan-400/30"
                : "bg-[#07090E]/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            All Tracker Types ({groups.length})
          </button>
          {allTrackerTypes.map((type) => {
            const count = groups.filter((g) => g.mainCategory?.toLowerCase() === type.toLowerCase()).length;
            return (
              <button
                key={type}
                onClick={() => {
                  setSelectedTrackerType(type);
                  setSelectedCategory("All");
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedTrackerType.toLowerCase() === type.toLowerCase()
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-cyan-900/30 border border-cyan-400/30"
                    : "bg-[#07090E]/60 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <span>{type}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                  {count}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => {
              setNewCategoryName("");
              setNewTrackerType(selectedTrackerType !== "All" ? selectedTrackerType : "Cloud Cost");
              setCustomTrackerType("");
              setInitialLineItemName("");
              setIsNewCategoryModalOpen(true);
            }}
            className="ml-auto flex items-center gap-1 px-3 py-1 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>
        </div>

        {/* Tier 2: Category Pills & Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Category Pills */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("All")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === "All"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-900/30"
                  : "bg-[#07090E]/60 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              All Categories
            </button>
            {categoriesForSelectedTracker.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedCategory(g.name)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
              className="px-2.5 py-1.5 bg-[#07090E]/80 border border-slate-700/80 text-slate-300 hover:text-white text-xs rounded-xl cursor-pointer"
            >
              Expand All
            </button>
            <button
              onClick={() => expandAll(false)}
              className="px-2.5 py-1.5 bg-[#07090E]/80 border border-slate-700/80 text-slate-300 hover:text-white text-xs rounded-xl cursor-pointer"
            >
              Collapse
            </button>
          </div>
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
            <span>12-Month Fiscal Spend Rate</span>
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

      {/* ── EMPTY STATE ── */}
      {groups.length === 0 ? (
        <div className="relative">
          <FinOpsEmptyStateCard
            sectionName="Credit Tracker"
            fiscalYear={activeFY}
            onCreateNew={() => handleOpenAddRowModal("Cloud Cost")}
            onUploadExcel={parseExcelFile}
            onClonePrevious={() => {
              let srcGroups: SubCategoryGroup[] = [];
              try {
                const savedPrev =
                  localStorage.getItem(getStorageKeyForFY("FY 2026-27")) ||
                  localStorage.getItem(STORAGE_KEY);
                if (savedPrev) srcGroups = JSON.parse(savedPrev);
              } catch {}
              if (srcGroups.length === 0) srcGroups = INITIAL_GROUPS;
              const cloned = srcGroups.map((g) => ({
                ...g,
                lineItems: g.lineItems.map((item) => ({
                  ...item,
                  values: {},
                })),
              }));
              setGroups(cloned);
              const fyKey = getStorageKeyForFY(activeFY);
              localStorage.setItem(fyKey, JSON.stringify(cloned));
              saveFinOpsDataForFY(activeFY, { creditPools: cloned });
            }}
          />
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
                        handleOpenAddRowModal(group.mainCategory || "Cloud Cost", group.id, group.name);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-medium transition-all cursor-pointer"
                      title="Add a new row/component to this category"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Row</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCategory(group);
                        setEditCategoryName(group.name);
                        const isPreset = PRESET_TRACKER_TYPES.includes(group.mainCategory || "");
                        setEditTrackerType(isPreset ? (group.mainCategory || "Cloud Cost") : "Custom...");
                        setCustomEditTrackerType(isPreset ? "" : (group.mainCategory || ""));
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10 font-medium transition-all"
                      title="Edit category name or change tracker type"
                    >
                      <Edit2 className="w-3 h-3 text-cyan-400" />
                      <span>Edit Category</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(group.id, group.name);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/25 font-medium transition-all"
                      title={`Delete whole "${group.name}" category and its line items`}
                    >
                      <Trash2 className="w-3 h-3 text-rose-400" />
                      <span>Delete Category</span>
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
                            <th className="py-3 px-2 text-center bg-[#07090E] text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Action
                            </th>
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

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingLineItem({ groupId: group.id, item });
                                      setEditLineItemName(item.name);
                                      setEditLineItemIsAop(!!item.isAop);
                                      setEditLineItemIsTotal(!!item.isTotal);
                                    }}
                                    className="p-1 text-slate-500 hover:text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Rename or configure line item"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
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

                                {/* Action Column: Edit & Delete Row */}
                                <td className="py-3 px-2 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => {
                                        setEditingLineItem({ groupId: group.id, item });
                                        setEditLineItemName(item.name);
                                        setEditLineItemIsAop(!!item.isAop);
                                        setEditLineItemIsTotal(!!item.isTotal);
                                      }}
                                      className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-colors"
                                      title="Edit Line Item Name or Row Type"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLineItem(group.id, item.id, item.name)}
                                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                                      title="Delete Row"
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
              className="bg-[#0B0F19] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-xs text-slate-300 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold border border-cyan-500/30">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Add Cost Component / Row</h3>
                    <p className="text-[11px] text-slate-400">
                      Configure tracker domain, cost category, and component row details.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseAddRowModal}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5">
                {/* 1. Tracker Domain / Type */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    1. Tracker Domain / Type *
                  </label>
                  <select
                    value={addModalDomain}
                    onChange={(e) => {
                      setAddModalDomain(e.target.value);
                      setTargetGroupId("");
                      setAddModalCategoryName("");
                    }}
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    {PRESET_TRACKER_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-slate-900 text-white">
                        {t}
                      </option>
                    ))}
                    {allTrackerTypes
                      .filter((t) => !PRESET_TRACKER_TYPES.includes(t))
                      .map((t) => (
                        <option key={t} value={t} className="bg-slate-900 text-white">
                          {t}
                        </option>
                      ))}
                    <option value="Custom..." className="bg-slate-900 text-teal-300 font-semibold">
                      + Custom Tracker Type...
                    </option>
                  </select>
                </div>

                {addModalDomain === "Custom..." && (
                  <div>
                    <label className="block text-[11px] font-bold text-teal-300 mb-1">
                      Specify Custom Tracker Type *
                    </label>
                    <input
                      type="text"
                      value={customAddDomain}
                      onChange={(e) => setCustomAddDomain(e.target.value)}
                      placeholder="e.g. Edge Infrastructure, Hardware Capex, Software Licensing"
                      className="w-full bg-[#07090E] border border-teal-500/50 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-400"
                    />
                  </div>
                )}

                {/* 2. Category / Group */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    2. Cost Category *
                  </label>
                  {addModalDomainGroups.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        value={targetGroupId}
                        onChange={(e) => {
                          setTargetGroupId(e.target.value);
                          if (e.target.value !== "__NEW__") {
                            setAddModalCategoryName("");
                          }
                        }}
                        className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        <option value="">-- Choose Existing Category --</option>
                        {addModalDomainGroups.map((g) => (
                          <option key={g.id} value={g.id} className="bg-slate-900 text-white">
                            {g.name} ({g.lineItems.length} rows)
                          </option>
                        ))}
                        <option value="__NEW__" className="bg-slate-900 text-cyan-300 font-semibold">
                          + Create New Category in this Domain...
                        </option>
                      </select>

                      {(targetGroupId === "__NEW__" || !targetGroupId) && (
                        <div>
                          <input
                            type="text"
                            value={addModalCategoryName}
                            onChange={(e) => setAddModalCategoryName(e.target.value)}
                            placeholder="Enter new category name (e.g. CDN, Video Platform, Storage)"
                            className="w-full bg-[#07090E] border border-cyan-500/40 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={addModalCategoryName}
                        onChange={(e) => setAddModalCategoryName(e.target.value)}
                        placeholder="e.g. CDN, Video Platform, Databases, Compute"
                        className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  )}
                </div>

                {/* 3. Component / Row Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    3. Component / Vendor Name *
                  </label>
                  <input
                    type="text"
                    value={newLineItemName}
                    onChange={(e) => setNewLineItemName(e.target.value)}
                    placeholder="e.g. AWS CloudFront, MediaCDN, Akamai, Datadog"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* 4. AOP Budget checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isAopCheck"
                    checked={newLineItemIsAop}
                    onChange={(e) => setNewLineItemIsAop(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0"
                  />
                  <label htmlFor="isAopCheck" className="text-xs text-slate-300 cursor-pointer">
                    Is this an AOP Budget target benchmark row?
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={handleCloseAddRowModal}
                  className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLineItem}
                  disabled={
                    !newLineItemName.trim() ||
                    (!targetGroupId && !addModalCategoryName.trim()) ||
                    (targetGroupId === "__NEW__" && !addModalCategoryName.trim()) ||
                    (addModalDomain === "Custom..." && !customAddDomain.trim())
                  }
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white rounded-xl font-semibold shadow-lg shadow-cyan-900/30 cursor-pointer"
                >
                  Add Row
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── CREATE NEW TRACKER CATEGORY MODAL ── */}
        {isNewCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0B0F19] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-xs text-slate-300 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/30">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Add Tracker Category</h3>
                    <p className="text-[11px] text-slate-400">
                      Create cost categories under Cloud Cost or customized credit tracker domains.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNewCategoryModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. CDN, Video Platform, Snowflake, Kubernetes, LLM APIs"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Credit Tracker Type *
                  </label>
                  <select
                    value={newTrackerType}
                    onChange={(e) => setNewTrackerType(e.target.value)}
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    {PRESET_TRACKER_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-slate-900 text-white">
                        {t}
                      </option>
                    ))}
                    <option value="Custom..." className="bg-slate-900 text-teal-300 font-semibold">
                      + Custom Tracker Type...
                    </option>
                  </select>
                </div>

                {newTrackerType === "Custom..." && (
                  <div>
                    <label className="block text-[11px] font-bold text-teal-300 mb-1">
                      Specify Custom Tracker Type *
                    </label>
                    <input
                      type="text"
                      value={customTrackerType}
                      onChange={(e) => setCustomTrackerType(e.target.value)}
                      placeholder="e.g. Edge Infrastructure, Hardware Capex, or Security Vendor Licenses"
                      className="w-full bg-[#07090E] border border-teal-500/50 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Initial Line Item / Vendor (Optional)
                  </label>
                  <input
                    type="text"
                    value={initialLineItemName}
                    onChange={(e) => setInitialLineItemName(e.target.value)}
                    placeholder="e.g. Akamai CDN, Cloudflare, OpenAI Platform"
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setIsNewCategoryModalOpen(false)}
                  className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim() || (newTrackerType === "Custom..." && !customTrackerType.trim())}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl font-semibold shadow-lg shadow-teal-900/30"
                >
                  Create Category
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── EDIT CATEGORY MODAL ── */}
        {editingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0B0F19] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-xs text-slate-300 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold border border-cyan-500/30">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Edit Category</h3>
                    <p className="text-[11px] text-slate-400">
                      Rename category or reassign it to another credit tracker domain.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingCategory(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Credit Tracker Type *
                  </label>
                  <select
                    value={editTrackerType}
                    onChange={(e) => setEditTrackerType(e.target.value)}
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    {PRESET_TRACKER_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-slate-900 text-white">
                        {t}
                      </option>
                    ))}
                    <option value="Custom..." className="bg-slate-900 text-teal-300 font-semibold">
                      + Custom Tracker Type...
                    </option>
                  </select>
                </div>

                {editTrackerType === "Custom..." && (
                  <div>
                    <label className="block text-[11px] font-bold text-teal-300 mb-1">
                      Specify Custom Tracker Type *
                    </label>
                    <input
                      type="text"
                      value={customEditTrackerType}
                      onChange={(e) => setCustomEditTrackerType(e.target.value)}
                      placeholder="e.g. Edge Infrastructure or Hardware Capex"
                      className="w-full bg-[#07090E] border border-teal-500/50 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-400"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    handleDeleteCategory(editingCategory.id, editingCategory.name);
                    setEditingCategory(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 rounded-xl font-medium transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Delete Whole Category</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingCategory(null)}
                    className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 rounded-xl font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCategoryEdit}
                    disabled={!editCategoryName.trim() || (editTrackerType === "Custom..." && !customEditTrackerType.trim())}
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white rounded-xl font-semibold shadow-lg shadow-cyan-900/30"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── EDIT LINE ITEM MODAL ── */}
        {editingLineItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0B0F19] border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-6 text-xs text-slate-300 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold border border-cyan-500/30">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Edit Line Item</h3>
                    <p className="text-[11px] text-slate-400">Rename or reconfigure this row</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingLineItem(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Line Item / Component Name *
                  </label>
                  <input
                    type="text"
                    value={editLineItemName}
                    onChange={(e) => setEditLineItemName(e.target.value)}
                    className="w-full bg-[#07090E] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-2 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="editIsAop"
                      checked={editLineItemIsAop}
                      onChange={(e) => setEditLineItemIsAop(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0"
                    />
                    <label htmlFor="editIsAop" className="text-xs text-slate-300 cursor-pointer">
                      Is this an AOP Target Budget row?
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="editIsTotal"
                      checked={editLineItemIsTotal}
                      onChange={(e) => setEditLineItemIsTotal(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-violet-600 focus:ring-0"
                    />
                    <label htmlFor="editIsTotal" className="text-xs text-slate-300 cursor-pointer">
                      Is this a Total / Summary row?
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    handleDeleteLineItem(
                      editingLineItem.groupId,
                      editingLineItem.item.id,
                      editingLineItem.item.name
                    );
                    setEditingLineItem(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 rounded-xl font-medium transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Delete Row</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingLineItem(null)}
                    className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 rounded-xl font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveLineItemEdit}
                    disabled={!editLineItemName.trim()}
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white rounded-xl font-semibold shadow-lg shadow-cyan-900/30"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
