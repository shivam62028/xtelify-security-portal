import {
  type AOPCategoryGroup,
  type AOPLeadershipSummary,
  type AOPSubComponent,
  type MonthlyDataPoint,
  type CustomColumnDef,
  type CustomKPICardDef,
  type TrashItem,
  type AOPSnapshot,
  DEFAULT_AOP_CATEGORIES,
  DEFAULT_LEADERSHIP_SUMMARIES,
  MONTHS_12_KEYS,
} from "./aopMultiSheetData";

export interface FiscalYearOption {
  id: string; // e.g. "FY 2026-27"
  label: string;
  badge: "Active" | "Planning" | "Historical" | "Custom";
}

export const DEFAULT_FISCAL_YEARS: FiscalYearOption[] = [
  { id: "FY 2026-27", label: "FY 2026-27 (Current)", badge: "Active" },
  { id: "FY 2027-28", label: "FY 2027-28 (AOP 2027)", badge: "Planning" },
  { id: "FY 2025-26", label: "FY 2025-26", badge: "Historical" },
  { id: "FY 2024-25", label: "FY 2024-25", badge: "Historical" },
];

export interface FinOpsFYSectionData {
  // AOP Dashboard
  aopCategories?: AOPCategoryGroup[];
  aopLeadershipSummaries?: Record<string, AOPLeadershipSummary>;
  aopLineItems?: any[];
  aopCustomColumns?: CustomColumnDef[];
  aopCustomLOBs?: { id: string; label: string; isCustom?: boolean }[];
  aopKpiCards?: CustomKPICardDef[];
  aopTrashItems?: TrashItem[];
  aopSnapshots?: AOPSnapshot[];

  // Billing Observability
  billingData?: any[];
  billingInvoices?: any[];

  // Credit Tracker
  creditPools?: any[];

  // NFA / GBPA Tracker
  approvalRecords?: any[];
}

export type FinOpsMultiYearStore = Record<string, FinOpsFYSectionData>;

const STORAGE_KEY_FY_LIST = "xtelify_finops_fiscal_years_v2";
const STORAGE_KEY_BY_FY = "xtelify_finops_data_by_fy_v2";

export const getFiscalYears = (): FiscalYearOption[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_FY_LIST);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_FISCAL_YEARS;
};

export const saveFiscalYears = (years: FiscalYearOption[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_FY_LIST, JSON.stringify(years));
    window.dispatchEvent(new CustomEvent("finops:fiscal-years-updated", { detail: { years } }));
  } catch {}
};

export const addFiscalYear = (newYearInput: string): FiscalYearOption[] => {
  let cleanId = newYearInput.trim();
  if (!cleanId) return getFiscalYears();

  if (!cleanId.toUpperCase().startsWith("FY")) {
    cleanId = `FY ${cleanId}`;
  }

  const currentYears = getFiscalYears();
  const exists = currentYears.find((y) => y.id.toLowerCase() === cleanId.toLowerCase());
  if (exists) return currentYears;

  const newOption: FiscalYearOption = {
    id: cleanId,
    label: `${cleanId} (Custom)`,
    badge: "Custom",
  };

  const updated = [newOption, ...currentYears];
  saveFiscalYears(updated);
  return updated;
};

export const normalizeFYKey = (raw: string | undefined | null): string => {
  if (!raw) return "FY 2026-27";
  const str = String(raw).trim();
  const m = str.match(/(?:FY\s*)?(\d{4})[–\-](\d{2,4})/i);
  if (m) {
    const startYr = m[1];
    let endYr = m[2];
    if (endYr.length === 4) {
      endYr = endYr.slice(-2);
    }
    return `FY ${startYr}-${endYr}`;
  }
  if (str.toUpperCase().startsWith("FY ")) return str;
  return `FY ${str}`;
};

export const get12MonthKeysForFY = (fy: string) => {
  const normFY = normalizeFYKey(fy);
  const match = normFY.match(/(\d{4})-(\d{2,4})/);
  const startYr = match ? parseInt(match[1], 10) : 2026;
  const startYr2Digit = String(startYr).slice(-2);
  const endYr2Digit = String(startYr + 1).slice(-2);

  const months = [
    { key: `Apr-${startYr2Digit}`, shortLabel: "Apr", quarter: "Q1", defaultActual: true },
    { key: `May-${startYr2Digit}`, shortLabel: "May", quarter: "Q1", defaultActual: true },
    { key: `Jun-${startYr2Digit}`, shortLabel: "Jun", quarter: "Q1", defaultActual: true },
    { key: `Jul-${startYr2Digit}`, shortLabel: "Jul", quarter: "Q2", defaultActual: true },
    { key: `Aug-${startYr2Digit}`, shortLabel: "Aug", quarter: "Q2", defaultActual: true },
    { key: `Sep-${startYr2Digit}`, shortLabel: "Sep", quarter: "Q2", defaultActual: true },
    { key: `Oct-${startYr2Digit}`, shortLabel: "Oct", quarter: "Q3", defaultActual: false },
    { key: `Nov-${startYr2Digit}`, shortLabel: "Nov", quarter: "Q3", defaultActual: false },
    { key: `Dec-${startYr2Digit}`, shortLabel: "Dec", quarter: "Q3", defaultActual: false },
    { key: `Jan-${endYr2Digit}`, shortLabel: "Jan", quarter: "Q4", defaultActual: false },
    { key: `Feb-${endYr2Digit}`, shortLabel: "Feb", quarter: "Q4", defaultActual: false },
    { key: `Mar-${endYr2Digit}`, shortLabel: "Mar", quarter: "Q4", defaultActual: false },
  ];

  return months;
};

export const isScrapAOPCategory = (cat: any): boolean => {
  if (!cat) return true;
  if (typeof cat.id === "string") {
    const id = cat.id.toLowerCase();
    if (
      id.startsWith("demo-") ||
      id.startsWith("mock-") ||
      id.startsWith("scrap-") ||
      id === "cat-airtel" ||
      id === "cat-b2b" ||
      id === "cat-bank"
    ) {
      return true;
    }
  }
  return false;
};

export const isScrapLeadershipSummary = (sum: any): boolean => {
  if (!sum || typeof sum !== "object") return true;
  const b = Number(sum.totalBudgetCr);
  const m = Number(sum.yearEndMauMillions);
  const c = Number(sum.costPerUserInr);
  if (
    b === 142 || b === 142.0 || b === 142.6 ||
    b === 384.5 || b === 384.6 ||
    b === 118.2 ||
    b === 76.4 ||
    b === 721.2 || b === 721.7 || b === 721.70
  ) return true;
  if (m === 18.5 || m === 64.2 || m === 14.8 || m === 8.4 || m === 105.9) return true;
  if (c === 68.15 || c === 78.86) return true;
  return false;
};

export const sanitizeLeadershipSummaries = (
  summaries: Record<string, AOPLeadershipSummary> | undefined | null
): Record<string, AOPLeadershipSummary> => {
  if (!summaries || typeof summaries !== "object") return {};
  const cleaned: Record<string, AOPLeadershipSummary> = {};
  Object.keys(summaries).forEach((k) => {
    if (!isScrapLeadershipSummary(summaries[k])) {
      cleaned[k] = summaries[k];
    }
  });
  return cleaned;
};

export const sanitizeAOPCategories = (list: any[]): AOPCategoryGroup[] => {
  if (!Array.isArray(list)) return [];
  return list.filter((c) => !isScrapAOPCategory(c));
};

export const getFinOpsMultiYearStore = (): FinOpsMultiYearStore => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_BY_FY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        let changed = false;
        Object.keys(parsed).forEach((fy) => {
          if (parsed[fy]?.aopCategories && Array.isArray(parsed[fy].aopCategories)) {
            const cleaned = sanitizeAOPCategories(parsed[fy].aopCategories);
            if (cleaned.length !== parsed[fy].aopCategories.length) {
              parsed[fy].aopCategories = cleaned;
              changed = true;
            }
          }
          if (parsed[fy]?.aopLeadershipSummaries && typeof parsed[fy].aopLeadershipSummaries === "object") {
            const cleanedSums = sanitizeLeadershipSummaries(parsed[fy].aopLeadershipSummaries);
            if (Object.keys(cleanedSums).length !== Object.keys(parsed[fy].aopLeadershipSummaries).length) {
              parsed[fy].aopLeadershipSummaries = cleanedSums;
              changed = true;
            }
          }
        });
        if (changed) {
          localStorage.setItem(STORAGE_KEY_BY_FY, JSON.stringify(parsed));
        }
        return parsed;
      }
    }
  } catch {}

  // Initialize with clean baseline data (empty until real user ingestion or DB sync)
  let baselineAOPCategories: AOPCategoryGroup[] = [];
  let baselineSummaries: Record<string, AOPLeadershipSummary> = {};
  try {
    const savedCat =
      localStorage.getItem("xtelify_aop_categories_v3") ||
      localStorage.getItem("xtelify_aop_categories_v2");
    if (savedCat) {
      const p = JSON.parse(savedCat);
      if (Array.isArray(p)) {
        const cleaned = sanitizeAOPCategories(p);
        if (cleaned.length > 0) baselineAOPCategories = cleaned;
      }
    }
    const savedSum =
      localStorage.getItem("xtelify_aop_leadership_summaries_v3") ||
      localStorage.getItem("xtelify_aop_leadership_summaries_v2");
    if (savedSum) {
      const p = JSON.parse(savedSum);
      if (p && typeof p === "object") {
        const cleaned = sanitizeLeadershipSummaries(p);
        if (Object.keys(cleaned).length > 0) baselineSummaries = cleaned;
      }
    }
  } catch {}

  // Migrate baseline monthlyData in FY 2026-27 so Tata Comm and all subcomponents calculate live
  const normalizedBaselineCategories = baselineAOPCategories.map((cat) => {
    const updatedSubs = cat.subComponents.map((sub) => {
      const rawMonths = sub.monthlyData || [];
      const m12 = MONTHS_12_KEYS.map((mMeta, idx) => {
        const found = rawMonths.find((rm) => rm.month === mMeta.key || rm.month.startsWith(mMeta.shortLabel));
        const isDefaultActual = idx < 6; // Apr-Sep are actuals
        const status: "ACTUAL" | "PROJECTED" = found?.status || (found?.isActual ?? isDefaultActual ? "ACTUAL" : "PROJECTED");
        const amount = found?.amount !== undefined ? found.amount : (status === "ACTUAL" ? (found?.actualSpentCr ?? 0) : (found?.projectedCr ?? found?.actualSpentCr ?? 0));
        return {
          month: mMeta.key,
          quarter: mMeta.quarter,
          budgetCr: parseFloat(((sub.allocatedBudgetCr || 0) / 12).toFixed(2)),
          actualSpentCr: status === "ACTUAL" ? amount : 0,
          projectedCr: status === "PROJECTED" ? amount : 0,
          isActual: status === "ACTUAL",
          status,
          amount,
        };
      });

      const actualSum = m12.filter((m) => m.status === "ACTUAL").reduce((s, m) => s + (m.amount || 0), 0);
      const projSum = m12.filter((m) => m.status === "PROJECTED").reduce((s, m) => s + (m.amount || 0), 0);
      const fullYearTotal = parseFloat((actualSum + projSum).toFixed(2));

      return {
        ...sub,
        monthlyData: m12,
        totalSpentCr: fullYearTotal,
      };
    });

    const catBudget = updatedSubs.reduce((s, sub) => s + (sub.allocatedBudgetCr || 0), 0) || cat.allocatedBudgetCr;
    const catSpent = parseFloat(updatedSubs.reduce((s, sub) => s + (sub.totalSpentCr || 0), 0).toFixed(2));

    return {
      ...cat,
      allocatedBudgetCr: catBudget,
      totalSpentCr: catSpent,
      subComponents: updatedSubs,
    };
  });

  const initialStore: FinOpsMultiYearStore = {
    "FY 2026-27": {
      aopCategories: normalizedBaselineCategories,
      aopLeadershipSummaries: baselineSummaries,
    },
  };

  try {
    localStorage.setItem(STORAGE_KEY_BY_FY, JSON.stringify(initialStore));
  } catch {}

  return initialStore;
};

export const getFinOpsDataForFY = (fy: string): FinOpsFYSectionData | null => {
  const norm = normalizeFYKey(fy);
  const store = getFinOpsMultiYearStore();
  return store[norm] || store[fy] || null;
};

export const saveFinOpsDataForFY = (fy: string, data: Partial<FinOpsFYSectionData>): void => {
  try {
    const norm = normalizeFYKey(fy);
    const store = getFinOpsMultiYearStore();
    const existing = store[norm] || store[fy] || {};
    store[norm] = {
      ...existing,
      ...data,
    };
    localStorage.setItem(STORAGE_KEY_BY_FY, JSON.stringify(store));
    if (data.aopCategories) {
      try {
        localStorage.setItem("xtelify_aop_categories_v3", JSON.stringify(data.aopCategories));
      } catch {}
    }
    window.dispatchEvent(
      new CustomEvent("finops:fy-data-updated", { detail: { fy: norm, data: store[norm] } })
    );
  } catch {}
};

export const hasDataForSection = (
  fy: string,
  section: "aop" | "billing" | "credits" | "approvals"
): boolean => {
  const norm = normalizeFYKey(fy);
  const fyData = getFinOpsDataForFY(norm);
  if (!fyData) return false;

  switch (section) {
    case "aop":
      return Array.isArray(fyData.aopCategories) && fyData.aopCategories.length > 0;
    case "billing":
      return (
        (Array.isArray(fyData.billingData) && fyData.billingData.length > 0) ||
        (Array.isArray(fyData.billingInvoices) && fyData.billingInvoices.length > 0)
      );
    case "credits":
      return Array.isArray(fyData.creditPools) && fyData.creditPools.length > 0;
    case "approvals":
      return Array.isArray(fyData.approvalRecords) && fyData.approvalRecords.length > 0;
    default:
      return false;
  }
};

export const cloneFinOpsDataFromPreviousYear = (
  targetFY: string,
  sourceFY?: string
): FinOpsFYSectionData => {
  const normTarget = normalizeFYKey(targetFY);
  const store = getFinOpsMultiYearStore();

  let src = sourceFY ? normalizeFYKey(sourceFY) : undefined;
  if (!src) {
    const years = getFiscalYears();
    for (const y of years) {
      const yNorm = normalizeFYKey(y.id);
      if (yNorm !== normTarget && store[yNorm]?.aopCategories && store[yNorm]!.aopCategories!.length > 0) {
        src = yNorm;
        break;
      }
    }
    if (!src) src = "FY 2026-27";
  }

  const sourceData = store[src] || getFinOpsDataForFY("FY 2026-27") || {};
  const m12Meta = get12MonthKeysForFY(normTarget);

  const clonedAopCategories: AOPCategoryGroup[] = (sourceData.aopCategories || DEFAULT_AOP_CATEGORIES).map(
    (cat) => {
      const existingCatYearly = cat.yearlyData?.[normTarget];
      const clonedSubs: AOPSubComponent[] = cat.subComponents.map((sub) => {
        const existingSubYearly = sub.yearlyData?.[normTarget];
        if (existingSubYearly) {
          return {
            ...sub,
            allocatedBudgetCr: Number(existingSubYearly.allocatedBudgetCr) || 0,
            totalSpentCr: Number(existingSubYearly.totalSpentCr) || 0,
            monthlyData: existingSubYearly.monthlyData || [],
            yearlyData: {
              ...(sub.yearlyData || {}),
              [normTarget]: existingSubYearly,
            },
          };
        }
        const clonedMonthly: MonthlyDataPoint[] = m12Meta.map((mMeta) => ({
          month: mMeta.key,
          quarter: mMeta.quarter,
          budgetCr: 0,
          actualSpentCr: 0,
          projectedCr: 0,
          isActual: false,
          status: "PROJECTED",
          amount: 0,
        }));

        return {
          ...sub,
          allocatedBudgetCr: 0,
          totalSpentCr: 0,
          monthlyData: clonedMonthly,
          yearlyData: sub.yearlyData || {},
        };
      });

      if (existingCatYearly) {
        return {
          ...cat,
          allocatedBudgetCr: Number(existingCatYearly.allocatedBudgetCr) || 0,
          totalSpentCr: Number(existingCatYearly.totalSpentCr) || 0,
          subComponents: clonedSubs,
          yearlyData: {
            ...(cat.yearlyData || {}),
            [normTarget]: existingCatYearly,
          },
        };
      }

      return {
        ...cat,
        allocatedBudgetCr: 0,
        totalSpentCr: 0,
        subComponents: clonedSubs,
        yearlyData: cat.yearlyData || {},
      };
    }
  );

  const clonedSummaries: Record<string, AOPLeadershipSummary> = {};
  if (sourceData.aopLeadershipSummaries) {
    Object.keys(sourceData.aopLeadershipSummaries).forEach((k) => {
      const orig = sourceData.aopLeadershipSummaries![k];
      clonedSummaries[k] = {
        ...orig,
        totalBudgetCr: 0,
        totalSpentCr: 0,
        costPerUserInr: 0,
      };
    });
  }

  const clonedBilling = (sourceData.billingData || []).map((b: any) => ({
    ...b,
    gcpPaid: 0,
    gcpOpen: 0,
    awsPaid: 0,
    awsOpen: 0,
  }));

  const clonedCredits = (sourceData.creditPools || []).map((c: any) => ({
    ...c,
    allocated: 0,
    consumed: 0,
    burnRateMonthly: 0,
  }));

  const clonedApprovals = (sourceData.approvalRecords || []).map((a: any) => ({
    ...a,
    amount: 0,
    utilized: 0,
    balance: 0,
  }));

  const newFYData: FinOpsFYSectionData = {
    aopCategories: clonedAopCategories,
    aopLeadershipSummaries: clonedSummaries,
    aopCustomColumns: sourceData.aopCustomColumns || [],
    aopCustomLOBs: sourceData.aopCustomLOBs || [],
    billingData: clonedBilling,
    creditPools: clonedCredits,
    approvalRecords: clonedApprovals,
  };

  saveFinOpsDataForFY(normTarget, newFYData);
  return newFYData;
};

export const persistAOPHierarchyToBackend = async (
  fy: string,
  categories: AOPCategoryGroup[],
  leadershipSummaries?: Record<string, AOPLeadershipSummary>,
  extra?: {
    kpiCards?: CustomKPICardDef[];
    customColumns?: CustomColumnDef[];
    trashItems?: TrashItem[];
  }
) => {
  try {
    const normFY = normalizeFYKey(fy);
    await fetch("/api/finops/aop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fiscal_year: normFY,
        categories,
        aopCategories: categories,
        groups: categories,
        leadershipSummaries,
        kpi_cards: extra?.kpiCards,
        kpiCards: extra?.kpiCards,
        custom_columns: extra?.customColumns,
        customColumns: extra?.customColumns,
        trash_items: extra?.trashItems,
        trashItems: extra?.trashItems,
      }),
    });
  } catch (err) {
    console.warn("Failed to persist AOP to backend:", err);
  }
};

export const fetchAOPHierarchyFromBackend = async (fy?: string) => {
  try {
    const url = fy ? `/api/finops/aop?fiscal_year=${encodeURIComponent(normalizeFYKey(fy))}` : "/api/finops/aop";
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const payload = json?.data || json;
    if (!payload) return null;
    return {
      ...payload,
      aopCategories: payload.aopCategories || payload.categories || payload.groups || [],
      aopLeadershipSummaries: payload.aopLeadershipSummaries || payload.leadership_summaries || payload.leadershipSummaries || {},
      kpiCards: payload.kpiCards || payload.kpi_cards || [],
      customColumns: payload.customColumns || payload.custom_columns || [],
      trashItems: payload.trashItems || payload.trash_items || [],
    };
  } catch {
    return null;
  }
};

export const saveAOPSnapshotToBackend = async (snapshot: AOPSnapshot): Promise<boolean> => {
  try {
    const res = await fetch("/api/finops/aop/snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    });
    return res.ok;
  } catch (err) {
    console.warn("Failed to save snapshot to backend:", err);
    return false;
  }
};

export const fetchAOPSnapshotsFromBackend = async (fy?: string): Promise<AOPSnapshot[]> => {
  try {
    const url = fy
      ? `/api/finops/aop/snapshots?fiscal_year=${encodeURIComponent(normalizeFYKey(fy))}`
      : "/api/finops/aop/snapshots";
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return json?.snapshots || [];
  } catch (err) {
    console.warn("Failed to fetch snapshots from backend:", err);
    return [];
  }
};

export const deleteAOPSnapshotFromBackend = async (snapshotId: string): Promise<boolean> => {
  try {
    const res = await fetch(`/api/finops/aop/snapshots/${encodeURIComponent(snapshotId)}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch (err) {
    console.warn("Failed to delete snapshot from backend:", err);
    return false;
  }
};
