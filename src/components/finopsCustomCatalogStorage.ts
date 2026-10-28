export interface CustomCatalogLOB {
  id: string;
  label: string;
  parentId?: string; // e.g. "IPTV" or "XSTREAM" if nested
  isCustom?: boolean;
  mauMillions?: number;
  growthPct?: number;
  budgetCr?: number;
}

export interface PresetSubtype {
  id: string;
  name: string;
  lob: "IPTV" | "XSTREAM" | string;
  sourceSheet: string;
  categoryCode: string;
  icon: string;
  subBranch?: string; // e.g. "IPTV Core (STB)", "Xstream Core", etc.
  defaultBudgetCr?: number;
  isCustom?: boolean;
}

export interface CustomCatalogCategoryCode {
  code: string;
  label: string;
  icon: string;
  lob?: string;
  isCustom?: boolean;
}

export interface FinOpsCustomCatalog {
  lobs: CustomCatalogLOB[];
  subtypes: PresetSubtype[];
  categories: CustomCatalogCategoryCode[];
}

export const BUILTIN_IPTV_SUB_BRANCHES: CustomCatalogLOB[] = [
  { id: "IPTV_CORE", label: "IPTV Core (STB)", parentId: "IPTV", isCustom: false },
  { id: "IPTV_APP", label: "IPTV App", parentId: "IPTV", isCustom: false },
  { id: "IPTV_VP", label: "VP & VP DR", parentId: "IPTV", isCustom: false },
  { id: "IPTV_API", label: "API & Cross-Charge", parentId: "IPTV", isCustom: false },
];

export const BUILTIN_XSTREAM_SUB_BRANCHES: CustomCatalogLOB[] = [
  { id: "DTH", label: "DTH", parentId: "XSTREAM", isCustom: false },
  { id: "HT", label: "HT (Home Terminal)", parentId: "XSTREAM", isCustom: false },
  { id: "XSTREAM_CORE", label: "Xstream Core", parentId: "XSTREAM", isCustom: false },
  { id: "XSTREAM_SUBPROJECTS", label: "Sub-Projects (Disco, WCF, Search)", parentId: "XSTREAM", isCustom: false },
];

export const BUILTIN_IPTV_PRESETS: PresetSubtype[] = [
  {
    id: "builtin-iptv-1",
    name: "CDN (GCP / AWS / Akamai / NLD Lines)",
    lob: "IPTV",
    sourceSheet: "IPTV CDN 2027-28",
    categoryCode: "CDN",
    icon: "Radio",
    subBranch: "IPTV Core (STB)",
    defaultBudgetCr: 32.5,
    isCustom: false,
  },
  {
    id: "builtin-iptv-2",
    name: "Video Platform & Processing (GCP Main / AWS Elemental / Ateme)",
    lob: "IPTV",
    sourceSheet: "IPTV Video-Platform GCP 2027-28",
    categoryCode: "VIDEO_PLATFORM",
    icon: "Tv",
    subBranch: "VP & VP DR",
    defaultBudgetCr: 28.0,
    isCustom: false,
  },
  {
    id: "builtin-iptv-3",
    name: "Video Platform DR on DC / ACP",
    lob: "IPTV",
    sourceSheet: "IPTV AOP Summary 2027-28",
    categoryCode: "VIDEO_PLATFORM_DR",
    icon: "Server",
    subBranch: "VP & VP DR",
    defaultBudgetCr: 14.5,
    isCustom: false,
  },
  {
    id: "builtin-iptv-4",
    name: "Backend API / Cross-Charge (Main GCP & DR)",
    lob: "IPTV",
    sourceSheet: "Common API Cost Split 2027-28",
    categoryCode: "CROSS_CHARGE",
    icon: "Building2",
    subBranch: "API & Cross-Charge",
    defaultBudgetCr: 12.0,
    isCustom: false,
  },
  {
    id: "builtin-iptv-5",
    name: "DRM & Multi-DRM (Main, AMC, Expansion, Verimatrix, Nagra)",
    lob: "IPTV",
    sourceSheet: "IPTV AOP Summary 2027-28",
    categoryCode: "SECURITY_DRM",
    icon: "Shield",
    subBranch: "IPTV Core (STB)",
    defaultBudgetCr: 9.2,
    isCustom: false,
  },
  {
    id: "builtin-iptv-6",
    name: "RCU - Bluetooth & IR Remote (Customer Premises Hardware)",
    lob: "IPTV",
    sourceSheet: "IPTV + IPTV APP SaaS 2027-28",
    categoryCode: "HARDWARE_RCU",
    icon: "HardDrive",
    subBranch: "IPTV Core (STB)",
    defaultBudgetCr: 18.0,
    isCustom: false,
  },
  {
    id: "builtin-iptv-7",
    name: "IPTV SaaS & App Protection (Counterspy, Synamedia, Individual & Shared)",
    lob: "IPTV",
    sourceSheet: "IPTV APP Summary 2027-28",
    categoryCode: "SAAS",
    icon: "Sparkles",
    subBranch: "IPTV App",
    defaultBudgetCr: 11.4,
    isCustom: false,
  },
  {
    id: "builtin-iptv-8",
    name: "Marketplace (GCP Oracle AI Database 19c)",
    lob: "IPTV",
    sourceSheet: "IPTV APP Summary 2027-28",
    categoryCode: "DATABASE",
    icon: "Database",
    subBranch: "IPTV App",
    defaultBudgetCr: 7.8,
    isCustom: false,
  },
  {
    id: "builtin-iptv-9",
    name: "Engineering Manpower (TnM)",
    lob: "IPTV",
    sourceSheet: "IPTV AOP Summary 2027-28",
    categoryCode: "MANPOWER",
    icon: "Users",
    subBranch: "API & Cross-Charge",
    defaultBudgetCr: 16.5,
    isCustom: false,
  },
];

export const BUILTIN_XSTREAM_PRESETS: PresetSubtype[] = [
  {
    id: "builtin-xstrm-1",
    name: "Infra-Cost + Market-Place (BAU Fixed & Variable Base Cost)",
    lob: "XSTREAM",
    sourceSheet: "Common Xstrm Base Cost 2027-28",
    categoryCode: "INFRA_BASE",
    icon: "Cloud",
    subBranch: "Xstream Core",
    defaultBudgetCr: 45.0,
    isCustom: false,
  },
  {
    id: "builtin-xstrm-2",
    name: "Event Bump Traffic Scaling (IPL & Asia-Cup)",
    lob: "XSTREAM",
    sourceSheet: "Common Xstrm Base Cost 2027-28",
    categoryCode: "TRAFFIC_EVENT",
    icon: "Zap",
    subBranch: "Xstream Core",
    defaultBudgetCr: 24.0,
    isCustom: false,
  },
  {
    id: "builtin-xstrm-3",
    name: "Xstream New Initiatives (Scylla, Micro-Drama, Plotline Replacement)",
    lob: "XSTREAM",
    sourceSheet: "Xstrm Leadership Summary 27-28",
    categoryCode: "NEW_INITIATIVES",
    icon: "Cpu",
    subBranch: "Sub-Projects (Disco, WCF, Search)",
    defaultBudgetCr: 15.5,
    isCustom: false,
  },
  {
    id: "builtin-xstrm-4",
    name: "DTH Infrastructure & Cross-Charge",
    lob: "XSTREAM",
    sourceSheet: "DTH AOP Summary 2027-28",
    categoryCode: "DTH_INFRA",
    icon: "Radio",
    subBranch: "DTH",
    defaultBudgetCr: 22.0,
    isCustom: false,
  },
  {
    id: "builtin-xstrm-5",
    name: "HT (Home Terminal) Infrastructure & MAU Scaling",
    lob: "XSTREAM",
    sourceSheet: "HT AOP Summary 2027-28",
    categoryCode: "HT_INFRA",
    icon: "Home",
    subBranch: "HT (Home Terminal)",
    defaultBudgetCr: 19.5,
    isCustom: false,
  },
  {
    id: "builtin-xstrm-6",
    name: "Xstream SaaS Tools (Tableau, Plotline, Pagerduty, CursorAI, MoEngage, Branch)",
    lob: "XSTREAM",
    sourceSheet: "Xstream SaaS Tools 2027-28",
    categoryCode: "SAAS",
    icon: "Sparkles",
    subBranch: "Xstream Core",
    defaultBudgetCr: 13.8,
    isCustom: false,
  },
  {
    id: "builtin-xstrm-7",
    name: "Centralised Tools & QA Automation",
    lob: "XSTREAM",
    sourceSheet: "Xstream AOP Summary 2027-28",
    categoryCode: "QA_AUTOMATION",
    icon: "Terminal",
    subBranch: "Xstream Core",
    defaultBudgetCr: 8.5,
    isCustom: false,
  },
  {
    id: "builtin-xstrm-8",
    name: "AI PDLC Tools",
    lob: "XSTREAM",
    sourceSheet: "Xstrm Leadership Summary 27-28",
    categoryCode: "AI_TOOLS",
    icon: "Cpu",
    subBranch: "Sub-Projects (Disco, WCF, Search)",
    defaultBudgetCr: 6.2,
    isCustom: false,
  },
  {
    id: "builtin-xstrm-9",
    name: "AWS Direct Workloads & Credits Offset",
    lob: "XSTREAM",
    sourceSheet: "Xstream AOP Summary 2027-28",
    categoryCode: "AWS_WORKLOADS",
    icon: "Server",
    subBranch: "Xstream Core",
    defaultBudgetCr: 17.0,
    isCustom: false,
  },
  {
    id: "builtin-xstrm-10",
    name: "Engineering Manpower (TnM)",
    lob: "XSTREAM",
    sourceSheet: "Xstream AOP Summary 2027-28",
    categoryCode: "MANPOWER",
    icon: "Users",
    subBranch: "Xstream Core",
    defaultBudgetCr: 21.0,
    isCustom: false,
  },
];

export const BUILTIN_CATEGORY_CODES: CustomCatalogCategoryCode[] = [
  { code: "CDN", label: "CDN Bandwidth & Edge", icon: "Radio" },
  { code: "VIDEO_PLATFORM", label: "Video Platform & Processing", icon: "Tv" },
  { code: "VIDEO_PLATFORM_DR", label: "Video Platform DR", icon: "Server" },
  { code: "SAAS", label: "SaaS & Productivity Tools", icon: "Sparkles" },
  { code: "MANPOWER", label: "Engineering Manpower & TnM", icon: "Users" },
  { code: "CROSS_CHARGE", label: "Backend API & Cross-Charge", icon: "Building2" },
  { code: "SECURITY_DRM", label: "DRM & Multi-DRM Security", icon: "Shield" },
  { code: "HARDWARE_RCU", label: "RCU & Customer Premises Hardware", icon: "HardDrive" },
  { code: "DATABASE", label: "Marketplace & AI Database", icon: "Database" },
  { code: "INFRA_BASE", label: "Infra-Cost Base (Fixed & Variable)", icon: "Cloud" },
  { code: "TRAFFIC_EVENT", label: "Event Traffic Scaling (IPL & Cup)", icon: "Zap" },
  { code: "NEW_INITIATIVES", label: "New Initiatives (Scylla, Micro-Drama)", icon: "Cpu" },
  { code: "DTH_INFRA", label: "DTH Infrastructure & Cross-Charge", icon: "Radio" },
  { code: "HT_INFRA", label: "HT Home Terminal Infrastructure", icon: "Home" },
  { code: "QA_AUTOMATION", label: "QA & Centralised Automation", icon: "Terminal" },
  { code: "AI_TOOLS", label: "AI PDLC Tools & Copilots", icon: "Cpu" },
  { code: "AWS_WORKLOADS", label: "AWS Direct Workloads & Credits", icon: "Server" },
  { code: "OTHER", label: "Other Systems & Tools", icon: "Server" },
];

const LOCAL_STORAGE_CATALOG_KEY = "xtelify_finops_custom_catalog_v1";

export const getCustomCatalog = (): FinOpsCustomCatalog => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CATALOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          lobs: Array.isArray(parsed.lobs) ? parsed.lobs : [],
          subtypes: Array.isArray(parsed.subtypes) ? parsed.subtypes : [],
          categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        };
      }
    }
  } catch {}
  return { lobs: [], subtypes: [], categories: [] };
};

export const saveCustomCatalog = async (catalog: FinOpsCustomCatalog): Promise<void> => {
  try {
    localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(catalog));
    window.dispatchEvent(new CustomEvent("finops:custom-catalog-updated", { detail: { catalog } }));
  } catch {}

  try {
    await fetch("/api/finops/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catalog }),
    });
  } catch (err) {
    console.warn("Failed to persist custom catalog to backend:", err);
  }
};

export const fetchCustomCatalogFromBackend = async (): Promise<FinOpsCustomCatalog> => {
  let backendCatalog: FinOpsCustomCatalog | null = null;
  try {
    const res = await fetch("/api/finops/catalog");
    if (res.ok) {
      const json = await res.json();
      if (json?.catalog) {
        backendCatalog = {
          lobs: Array.isArray(json.catalog.lobs) ? json.catalog.lobs : [],
          subtypes: Array.isArray(json.catalog.subtypes) ? json.catalog.subtypes : [],
          categories: Array.isArray(json.catalog.categories) ? json.catalog.categories : [],
        };
      }
    }
  } catch (err) {
    console.warn("Failed to fetch catalog from backend:", err);
  }

  const localCatalog = getCustomCatalog();
  
  // Merge backend and local custom catalog items
  const mergedLOBsMap = new Map<string, CustomCatalogLOB>();
  (backendCatalog?.lobs || []).forEach((l) => mergedLOBsMap.set(l.id, l));
  localCatalog.lobs.forEach((l) => mergedLOBsMap.set(l.id, l));

  const mergedSubtypesMap = new Map<string, PresetSubtype>();
  (backendCatalog?.subtypes || []).forEach((s) => mergedSubtypesMap.set(s.id || s.name, s));
  localCatalog.subtypes.forEach((s) => mergedSubtypesMap.set(s.id || s.name, s));

  const mergedCatsMap = new Map<string, CustomCatalogCategoryCode>();
  (backendCatalog?.categories || []).forEach((c) => mergedCatsMap.set(c.code, c));
  localCatalog.categories.forEach((c) => mergedCatsMap.set(c.code, c));

  const merged: FinOpsCustomCatalog = {
    lobs: Array.from(mergedLOBsMap.values()),
    subtypes: Array.from(mergedSubtypesMap.values()),
    categories: Array.from(mergedCatsMap.values()),
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(merged));
  } catch {}

  return merged;
};

export const addCustomCatalogLOB = async (lob: CustomCatalogLOB): Promise<void> => {
  const current = getCustomCatalog();
  const exists = current.lobs.some((l) => l.id.toUpperCase() === lob.id.toUpperCase());
  if (exists) return;

  const updated: FinOpsCustomCatalog = {
    ...current,
    lobs: [...current.lobs, { ...lob, isCustom: true }],
  };
  await saveCustomCatalog(updated);
};

export const addCustomCatalogSubtype = async (subtype: PresetSubtype): Promise<void> => {
  const current = getCustomCatalog();
  const normalizedName = subtype.name.trim().toLowerCase();
  
  // Check if already present in built-in presets or existing custom
  const inBuiltin = [...BUILTIN_IPTV_PRESETS, ...BUILTIN_XSTREAM_PRESETS].some(
    (b) => b.name.trim().toLowerCase() === normalizedName && b.lob.toUpperCase() === subtype.lob.toUpperCase()
  );
  if (inBuiltin) return;

  const exists = current.subtypes.some(
    (s) => s.name.trim().toLowerCase() === normalizedName && s.lob.toUpperCase() === subtype.lob.toUpperCase()
  );
  if (exists) return;

  const updated: FinOpsCustomCatalog = {
    ...current,
    subtypes: [...current.subtypes, { ...subtype, isCustom: true, id: subtype.id || `custom-sub-${Date.now()}` }],
  };
  await saveCustomCatalog(updated);
};

export const deleteCustomCatalogSubtype = async (subtypeIdOrName: string): Promise<void> => {
  const current = getCustomCatalog();
  const updated: FinOpsCustomCatalog = {
    ...current,
    subtypes: current.subtypes.filter((s) => s.id !== subtypeIdOrName && s.name !== subtypeIdOrName),
  };
  await saveCustomCatalog(updated);

  try {
    await fetch(`/api/finops/catalog/${encodeURIComponent(subtypeIdOrName)}`, { method: "DELETE" });
  } catch {}
};

export const addCustomCategoryCode = async (cat: CustomCatalogCategoryCode): Promise<void> => {
  const current = getCustomCatalog();
  const normCode = cat.code.toUpperCase();
  const inBuiltin = BUILTIN_CATEGORY_CODES.some((b) => b.code.toUpperCase() === normCode);
  if (inBuiltin) return;

  const exists = current.categories.some((c) => c.code.toUpperCase() === normCode);
  if (exists) return;

  const updated: FinOpsCustomCatalog = {
    ...current,
    categories: [...current.categories, { ...cat, code: normCode, isCustom: true }],
  };
  await saveCustomCatalog(updated);
};

export const deleteCustomCategoryCode = async (code: string): Promise<void> => {
  const current = getCustomCatalog();
  const updated: FinOpsCustomCatalog = {
    ...current,
    categories: current.categories.filter((c) => c.code.toUpperCase() !== code.toUpperCase()),
  };
  await saveCustomCatalog(updated);

  try {
    await fetch(`/api/finops/catalog/${encodeURIComponent(code)}`, { method: "DELETE" });
  } catch {}
};

export const deleteCustomCatalogLOB = async (lobId: string): Promise<void> => {
  const current = getCustomCatalog();
  const updated: FinOpsCustomCatalog = {
    ...current,
    lobs: current.lobs.filter((l) => l.id.toUpperCase() !== lobId.toUpperCase()),
    subtypes: current.subtypes.filter((s) => s.lob.toUpperCase() !== lobId.toUpperCase()),
  };
  await saveCustomCatalog(updated);

  try {
    await fetch(`/api/finops/catalog/${encodeURIComponent(lobId)}`, { method: "DELETE" });
  } catch {}
};

export const getPresetsForLOB = (lobId: string, customCatalog?: FinOpsCustomCatalog): PresetSubtype[] => {
  const norm = (lobId || "").toUpperCase();
  const catalog = customCatalog || getCustomCatalog();

  const isIptvScope = norm === "IPTV" || norm.startsWith("IPTV_") || norm.includes("IPTV");
  const isXstrmScope = norm === "XSTREAM" || norm === "DTH" || norm === "HT" || norm.startsWith("XSTREAM_") || norm.includes("XSTRM");

  let basePresets: PresetSubtype[] = [];
  if (isIptvScope) {
    basePresets = [...BUILTIN_IPTV_PRESETS];
  } else if (isXstrmScope) {
    basePresets = [...BUILTIN_XSTREAM_PRESETS];
  } else {
    // Custom LOB scope: include both general and custom presets
    basePresets = [...BUILTIN_IPTV_PRESETS, ...BUILTIN_XSTREAM_PRESETS];
  }

  // Filter or match custom presets for this LOB
  const matchingCustom = catalog.subtypes.filter((s) => {
    const sLob = (s.lob || "").toUpperCase();
    if (isIptvScope && (sLob === "IPTV" || sLob.startsWith("IPTV_"))) return true;
    if (isXstrmScope && (sLob === "XSTREAM" || sLob === "DTH" || sLob === "HT" || sLob.startsWith("XSTREAM_"))) return true;
    return sLob === norm;
  });

  return [...basePresets, ...matchingCustom];
};

export const getCategoryCodesForLOB = (lobId: string, customCatalog?: FinOpsCustomCatalog): CustomCatalogCategoryCode[] => {
  const catalog = customCatalog || getCustomCatalog();
  const customCodes = catalog.categories || [];
  
  return [...BUILTIN_CATEGORY_CODES, ...customCodes];
};
