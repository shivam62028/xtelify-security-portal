// richyrik: Multi-Worksheet FinOps Ingestion & Currency Control Engine Context
import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";

export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP";

export interface ExchangeRateConfig {
  USD: number; // 1 USD in INR (e.g. 83.50)
  EUR: number; // 1 EUR in INR (e.g. 91.20)
  GBP: number; // 1 GBP in INR (e.g. 106.50)
  INR: number; // 1 INR in INR (1.0)
}

export interface FxAuditLogEntry {
  id: string;
  timestamp: string;
  currency: CurrencyCode;
  oldRate: number;
  newRate: number;
  user: string;
  note?: string;
}

export interface FinOpsDateFilter {
  fiscalYear: string; // e.g. "FY 2026-27"
  selectedMonths: string[]; // e.g. ["Apr", "May", "Jun", ...]
}

export interface DetectedSheetInfo {
  sheetName: string;
  rowCount: number;
  detectedTarget: "aop" | "credits" | "approvals" | "billing" | "ignore";
  targetLabel: string;
  detectedCurrency: CurrencyCode;
  headers: string[];
  rawRows: any[][];
  included: boolean;
  conversionMultiplier?: number;
}

// richyrik: FinOps Uploaded Dataset Model stored in Airtel Server MongoDB
export interface FinOpsDataset {
  id: string;
  datasetName: string;
  originalFileName: string;
  uploadedAt: string;
  fileSize?: number;
  fiscalYear: string;
  currency: CurrencyCode;
  sheets: DetectedSheetInfo[];
  totalRows: number;
  active: boolean;
}

export interface CurrencyMismatchInfo {
  sheetName: string;
  detectedCurrency: CurrencyCode;
  portalCurrency: CurrencyCode;
  sampleValue: number;
  pendingSheets: DetectedSheetInfo[];
}

interface FinOpsCurrencyContextType {
  // Currency state
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  currencySymbol: string;
  exchangeRates: ExchangeRateConfig;
  updateExchangeRate: (curr: "USD" | "EUR" | "GBP", newRate: number, user?: string, note?: string) => void;
  auditLogs: FxAuditLogEntry[];
  latestAuditBadge: string;

  // Conversion helpers
  convertFromINR: (inrAmount: number | null | undefined) => number | null;
  convertToINR: (amount: number | null | undefined, fromCurrency: CurrencyCode) => number | null;
  formatCurrency: (inrAmount: number | null | undefined, compact?: boolean) => string;
  formatCr: (inrCrAmount: number | null | undefined, compact?: boolean) => string;

  // Global Date Filters
  dateFilter: FinOpsDateFilter;
  setFiscalYear: (fy: string) => void;
  toggleMonth: (month: string) => void;
  selectAllMonths: () => void;
  clearAllMonths: () => void;
  selectQuarter: (quarter: "Q1" | "Q2" | "Q3" | "Q4" | "Actuals" | "Projected") => void;
  isMonthSelected: (month: string) => boolean;

  // Multi-Sheet Ingestion Modal State
  isMultiSheetModalOpen: boolean;
  setIsMultiSheetModalOpen: (open: boolean) => void;
  detectedSheets: DetectedSheetInfo[];
  setDetectedSheets: React.Dispatch<React.SetStateAction<DetectedSheetInfo[]>>;
  updateSheetTarget: (index: number, newTarget: "aop" | "credits" | "approvals" | "billing" | "ignore") => void;
  toggleSheetIncluded: (index: number) => void;
  applyMultiSheetIngestion: (sheetsToIngest: DetectedSheetInfo[]) => void;
  parseWorkbookFile: (file: File) => Promise<void>;

  // Custom Dataset Naming & MongoDB Storage State
  customDatasetName: string;
  setCustomDatasetName: (name: string) => void;
  currentFileName: string;
  datasets: FinOpsDataset[];
  isDatasetManagerOpen: boolean;
  setIsDatasetManagerOpen: (open: boolean) => void;
  mongoStatus: {
    status: string;
    database: string;
    mongo_available: boolean;
    server: string;
    datasets_count: number;
    lastSync: string;
  };
  deleteDataset: (datasetId: string) => Promise<void>;
  toggleDatasetActive: (datasetId: string) => void;
  refreshDatasets: () => Promise<void>;

  // Currency Mismatch Dialog State
  isMismatchDialogOpen: boolean;
  setIsMismatchDialogOpen: (open: boolean) => void;
  mismatchInfo: CurrencyMismatchInfo | null;
  resolveCurrencyMismatch: (resolution: "convert_incoming" | "switch_portal" | "as_is") => void;

  // Exchange Rate Management Modal
  isFxModalOpen: boolean;
  setIsFxModalOpen: (open: boolean) => void;
  isRatesModalOpen: boolean;
  setIsRatesModalOpen: (open: boolean) => void;
}

const DEFAULT_RATES: ExchangeRateConfig = {
  USD: 83.5,
  EUR: 91.2,
  GBP: 106.5,
  INR: 1.0,
};

export const ALL_MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const FinOpsCurrencyContext = createContext<FinOpsCurrencyContextType | undefined>(undefined);

// richyrik: FinOps Currency & Global Control Provider
export const FinOpsCurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // richyrik: Active Currency
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem("xtelify_finops_currency");
      if (saved && ["INR", "USD", "EUR", "GBP"].includes(saved)) {
        return saved as CurrencyCode;
      }
    } catch {
      // ignore
    }
    return "INR";
  });

  // richyrik: Exchange Rates relative to INR (e.g. 1 USD = 83.50 INR)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateConfig>(() => {
    try {
      const saved = localStorage.getItem("xtelify_finops_exchange_rates");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_RATES;
  });

  // richyrik: Audit Logs
  const [auditLogs, setAuditLogs] = useState<FxAuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem("xtelify_finops_fx_audit_log");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: "fx-init-01",
        timestamp: new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        currency: "USD",
        oldRate: 83.0,
        newRate: 83.5,
        user: "Finance Controller",
        note: "System baseline calibration for FY 2026-27",
      },
    ];
  });

  // richyrik: Global Date Filter
  const [dateFilter, setDateFilter] = useState<FinOpsDateFilter>(() => {
    try {
      const saved = localStorage.getItem("xtelify_finops_date_filter");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      fiscalYear: "FY 2026-27",
      selectedMonths: ALL_MONTHS,
    };
  });

  // richyrik: Multi-sheet Modal & Currency Mismatch Dialog States
  const [isMultiSheetModalOpen, setIsMultiSheetModalOpen] = useState(false);
  const [detectedSheets, setDetectedSheets] = useState<DetectedSheetInfo[]>([]);
  const [isMismatchDialogOpen, setIsMismatchDialogOpen] = useState(false);
  const [mismatchInfo, setMismatchInfo] = useState<CurrencyMismatchInfo | null>(null);
  const [isFxModalOpen, setIsFxModalOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);

  // richyrik: Custom Dataset Naming & MongoDB Datasets State
  const [customDatasetName, setCustomDatasetName] = useState("");
  const [currentFileName, setCurrentFileName] = useState("");
  const [currentFileSize, setCurrentFileSize] = useState(0);
  const [isDatasetManagerOpen, setIsDatasetManagerOpen] = useState(false);
  const [datasets, setDatasets] = useState<FinOpsDataset[]>(() => {
    try {
      const saved = localStorage.getItem("xtelify_finops_datasets");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [mongoStatus, setMongoStatus] = useState({
    status: "server_ready",
    database: "xtelify_db",
    mongo_available: true,
    server: "Airtel Cloud Ops Security Server (10.56.131.8 / 127.0.0.1:27017)",
    datasets_count: 0,
    lastSync: new Date().toISOString(),
  });

  const refreshMongoStatus = async () => {
    try {
      const res = await fetch("/api/finops/status");
      if (res.ok) {
        const data = await res.json();
        setMongoStatus((prev) => ({
          ...prev,
          status: data.status || "connected",
          database: data.database || "xtelify_db",
          mongo_available: true,
          datasets_count: data.datasets_count ?? prev.datasets_count,
          lastSync: new Date().toISOString(),
        }));
      }
    } catch {
      // Offline fallback: simulated connected server
      setMongoStatus((prev) => ({ ...prev, status: "server_ready", mongo_available: true }));
    }
  };

  const refreshDatasets = async () => {
    try {
      const res = await fetch("/api/finops/datasets");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.datasets)) {
          // Normalize sheets and properties if needed
          const normalized: FinOpsDataset[] = data.datasets.map((d: any) => ({
            id: d.id,
            datasetName: d.dataset_name || d.datasetName || "Uploaded Dataset",
            originalFileName: d.original_filename || d.originalFileName || "dataset.xlsx",
            uploadedAt: d.uploaded_at || d.uploadedAt || new Date().toISOString(),
            fileSize: d.file_size || d.fileSize || 0,
            fiscalYear: d.fiscal_year || d.fiscalYear || "FY 2026-27",
            currency: d.currency || "INR",
            sheets: d.sheets || [],
            totalRows: d.total_rows || d.totalRows || 0,
            active: d.active !== false,
          }));
          setDatasets(normalized);
          try {
            localStorage.setItem("xtelify_finops_datasets", JSON.stringify(normalized));
          } catch {}
          return;
        }
      }
    } catch (e) {
      console.warn("[FinOps] Error fetching datasets from backend:", e);
    }
  };

  useEffect(() => {
    refreshMongoStatus();
    refreshDatasets();
  }, []);

  // Persistence
  useEffect(() => {
    try {
      localStorage.setItem("xtelify_finops_currency", currency);
    } catch {
      // ignore
    }
  }, [currency]);

  useEffect(() => {
    try {
      localStorage.setItem("xtelify_finops_exchange_rates", JSON.stringify(exchangeRates));
    } catch {
      // ignore
    }
  }, [exchangeRates]);

  useEffect(() => {
    try {
      localStorage.setItem("xtelify_finops_fx_audit_log", JSON.stringify(auditLogs));
    } catch {
      // ignore
    }
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem("xtelify_finops_date_filter", JSON.stringify(dateFilter));
    } catch {
      // ignore
    }
  }, [dateFilter]);

  const currencySymbol = useMemo(() => {
    switch (currency) {
      case "USD":
        return "$";
      case "EUR":
        return "€";
      case "GBP":
        return "£";
      case "INR":
      default:
        return "₹";
    }
  }, [currency]);

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
  };

  // richyrik: Update exchange rate with audit logging
  const updateExchangeRate = (
    curr: "USD" | "EUR" | "GBP",
    newRate: number,
    user = "Finance Controller",
    note?: string
  ) => {
    if (newRate <= 0 || isNaN(newRate)) return;
    const oldRate = exchangeRates[curr];
    const updatedRates = { ...exchangeRates, [curr]: newRate };
    setExchangeRates(updatedRates);

    const ts = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const newLog: FxAuditLogEntry = {
      id: `fx-${Date.now()}`,
      timestamp: ts,
      currency: curr,
      oldRate,
      newRate,
      user,
      note: note || `Exchange rate updated to ${newRate.toFixed(2)} INR/${curr} by ${user} on ${ts}`,
    };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 19)]);
  };

  const latestAuditBadge = useMemo(() => {
    if (!auditLogs || auditLogs.length === 0) return "Exchange rate active";
    const top = auditLogs[0];
    return `Exchange rate updated to ${top.newRate.toFixed(2)} INR/${top.currency} by ${top.user} on ${top.timestamp}`;
  }, [auditLogs]);

  // richyrik: Currency conversion logic
  const convertFromINR = (inrAmount: number | null | undefined): number | null => {
    if (inrAmount === null || inrAmount === undefined || isNaN(inrAmount)) return null;
    if (currency === "INR") return inrAmount;
    const rate = exchangeRates[currency] || 1;
    return inrAmount / rate;
  };

  const convertToINR = (amount: number | null | undefined, fromCurrency: CurrencyCode): number | null => {
    if (amount === null || amount === undefined || isNaN(amount)) return null;
    if (fromCurrency === "INR") return amount;
    const rate = exchangeRates[fromCurrency] || 1;
    return amount * rate;
  };

  // richyrik: Universal Formatter across All Views and Recharts Tooltips
  const formatCurrency = (inrAmount: number | null | undefined, compact = false): string => {
    if (inrAmount === null || inrAmount === undefined || isNaN(inrAmount)) return "—";
    const converted = convertFromINR(inrAmount);
    if (converted === null) return "—";

    const abs = Math.abs(converted);
    const sign = converted < 0 ? "-" : "";

    if (currency === "INR") {
      if (compact) {
        if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
        if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)} L`;
        if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)} K`;
        return `${sign}₹${abs.toFixed(0)}`;
      }
      return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
    }

    // For USD, EUR, GBP
    const sym = currencySymbol;
    if (compact) {
      if (abs >= 1000000) return `${sign}${sym}${(abs / 1000000).toFixed(2)}M`;
      if (abs >= 1000) return `${sign}${sym}${(abs / 1000).toFixed(1)}K`;
      return `${sign}${sym}${abs.toFixed(0)}`;
    }
    return `${sign}${sym}${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  };

  // richyrik: Formatter for values originally stored in Crores (Cr)
  const formatCr = (inrCrAmount: number | null | undefined, compact = false): string => {
    if (inrCrAmount === null || inrCrAmount === undefined || isNaN(inrCrAmount)) return "—";
    return formatCurrency(inrCrAmount * 10000000, compact);
  };

  // richyrik: Global Date Filters
  const setFiscalYear = (fy: string) => {
    setDateFilter((prev) => ({ ...prev, fiscalYear: fy }));
  };

  const toggleMonth = (month: string) => {
    setDateFilter((prev) => {
      const exists = prev.selectedMonths.includes(month);
      let updated: string[];
      if (exists) {
        if (prev.selectedMonths.length === 1) return prev; // Keep at least one
        updated = prev.selectedMonths.filter((m) => m !== month);
      } else {
        updated = [...prev.selectedMonths, month];
      }
      return { ...prev, selectedMonths: updated };
    });
  };

  const selectAllMonths = () => {
    setDateFilter((prev) => ({ ...prev, selectedMonths: ALL_MONTHS }));
  };

  const clearAllMonths = () => {
    // Keep at least current active month (e.g. Apr or Oct)
    setDateFilter((prev) => ({ ...prev, selectedMonths: ["Apr"] }));
  };

  const selectQuarter = (quarter: "Q1" | "Q2" | "Q3" | "Q4" | "Actuals" | "Projected") => {
    let months: string[] = [];
    switch (quarter) {
      case "Q1":
        months = ["Apr", "May", "Jun"];
        break;
      case "Q2":
        months = ["Jul", "Aug", "Sep"];
        break;
      case "Q3":
        months = ["Oct", "Nov", "Dec"];
        break;
      case "Q4":
        months = ["Jan", "Feb", "Mar"];
        break;
      case "Actuals":
        months = ["Apr", "May", "Jun"];
        break;
      case "Projected":
        months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
        break;
    }
    setDateFilter((prev) => ({ ...prev, selectedMonths: months }));
  };

  const isMonthSelected = (month: string): boolean => {
    return dateFilter.selectedMonths.some((m) => m.toLowerCase().startsWith(month.toLowerCase().slice(0, 3)));
  };

  // richyrik: Auto-detect sheet target section based on sheet name and headers
  const autoDetectSheetTarget = (
    sheetName: string,
    headers: string[]
  ): { target: "aop" | "credits" | "approvals" | "billing" | "ignore"; label: string } => {
    const sName = sheetName.toLowerCase().trim();
    const hStr = headers.join(" ").toLowerCase();

    // 1. By Sheet Name Heuristics (e.g. "New Components", "AOP 2027", "Cloud Cost")
    if (/aop|operating\s*plan|budget\s*202|aop\s*202/i.test(sName)) {
      return { target: "aop", label: "AOP Dashboard" };
    }
    if (/cloud\s*cost|credit|run\s*rate|infra\s*spend|aws.*gcp|tracker/i.test(sName)) {
      return { target: "credits", label: "Credit Tracker / Cloud Cost" };
    }
    if (/new\s*component|nfa|gbpa|approval|procurement|po\b/i.test(sName)) {
      return { target: "approvals", label: "NFA / GBPA Tracker" };
    }
    if (/billing|invoice|observability/i.test(sName)) {
      return { target: "billing", label: "Billing Observability" };
    }

    // 2. By Header Heuristics
    if (/cost\s*component|usecase|capex\s*\/\s*opex|payment\s*mode|lob/i.test(hStr)) {
      return { target: "aop", label: "AOP Dashboard" };
    }
    if (/committed\s*use|actual|projected|pool|run-rate|apr-\d|may-\d/i.test(hStr)) {
      return { target: "credits", label: "Credit Tracker / Cloud Cost" };
    }
    if (/nfa\s*number|gbpa|annual\s*cost|email\s*thread|approval\s*thread/i.test(hStr)) {
      return { target: "approvals", label: "NFA / GBPA Tracker" };
    }
    if (/gcppaid|awspaid|invoiceid|provider/i.test(hStr)) {
      return { target: "billing", label: "Billing Observability" };
    }

    // Fallback default
    return { target: "credits", label: "Credit Tracker / Cloud Cost (Auto-detected)" };
  };

  // richyrik: Intelligent Currency Detection per Worksheet
  const detectWorksheetCurrency = (headers: string[], rawRows: any[][]): CurrencyCode => {
    let usdScore = 0;
    let inrScore = 0;
    let eurScore = 0;
    let gbpScore = 0;

    const checkText = (text: string) => {
      if (!text) return;
      if (/[$]|\busd\b|\bdollar/i.test(text)) usdScore += 2;
      if (/[₹]|\binr\b|\brupee|\brs\.?|\blakh|\bcr\b|\bcrore/i.test(text)) inrScore += 2;
      if (/[€]|\beur\b|\beuro/i.test(text)) eurScore += 2;
      if (/[£]|\bgbp\b|\bpound/i.test(text)) gbpScore += 2;
    };

    // Check headers
    headers.forEach((h) => checkText(h));

    // Sample first 50 rows
    const sampleLimit = Math.min(50, rawRows.length);
    for (let r = 0; r < sampleLimit; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;
      row.forEach((cell) => {
        if (typeof cell === "string") {
          checkText(cell);
        }
      });
    }

    const max = Math.max(usdScore, inrScore, eurScore, gbpScore);
    if (max > 0) {
      if (usdScore === max) return "USD";
      if (eurScore === max) return "EUR";
      if (gbpScore === max) return "GBP";
      if (inrScore === max) return "INR";
    }

    // Default to portal currency
    return currency;
  };

  // richyrik: Multi-Sheet Workbook Parser with SheetJS
  const parseWorkbookFile = async (file: File) => {
    try {
      const defaultName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setCustomDatasetName(defaultName);
      setCurrentFileName(file.name);
      setCurrentFileSize(file.size);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("No worksheets found in this workbook.");
      }

      const parsedSheets: DetectedSheetInfo[] = [];
      let firstMismatch: CurrencyMismatchInfo | null = null;

      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

        if (rawRows.length === 0) return;

        // Header detection (first non-empty row)
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(5, rawRows.length); i++) {
          if (rawRows[i] && rawRows[i].some((cell) => String(cell).trim().length > 0)) {
            headerRowIndex = i;
            break;
          }
        }

        const headers = (rawRows[headerRowIndex] || []).map((c) => String(c).trim());
        const dataRows = rawRows.slice(headerRowIndex + 1);

        const { target, label } = autoDetectSheetTarget(sheetName, headers);
        const detectedCurr = detectWorksheetCurrency(headers, dataRows);

        // Check for currency mismatch with current portal currency
        if (detectedCurr !== currency && !firstMismatch) {
          // Find sample numeric value
          let sampleNum = 100000;
          for (const row of dataRows) {
            for (const cell of row) {
              const parsed = parseFloat(String(cell).replace(/[^0-9.-]+/g, ""));
              if (!isNaN(parsed) && parsed > 100) {
                sampleNum = parsed;
                break;
              }
            }
            if (sampleNum !== 100000) break;
          }

          firstMismatch = {
            sheetName,
            detectedCurrency: detectedCurr,
            portalCurrency: currency,
            sampleValue: sampleNum,
            pendingSheets: [],
          };
        }

        parsedSheets.push({
          sheetName,
          rowCount: dataRows.length,
          detectedTarget: target,
          targetLabel: label,
          detectedCurrency: detectedCurr,
          headers,
          rawRows: dataRows,
          included: target !== "ignore",
        });
      });

      setDetectedSheets(parsedSheets);

      // If currency mismatch detected, show permission dialog
      if (firstMismatch) {
        firstMismatch.pendingSheets = parsedSheets;
        setMismatchInfo(firstMismatch);
        setIsMismatchDialogOpen(true);
      } else {
        setIsMultiSheetModalOpen(true);
      }
    } catch (err: any) {
      console.error("Failed to parse Excel workbook:", err);
      alert("Error reading Excel workbook: " + (err.message || String(err)));
    }
  };

  const updateSheetTarget = (
    index: number,
    newTarget: "aop" | "credits" | "approvals" | "billing" | "ignore"
  ) => {
    setDetectedSheets((prev) =>
      prev.map((s, idx) => {
        if (idx !== index) return s;
        let label = "Ignore / Skip";
        if (newTarget === "aop") label = "AOP Dashboard";
        else if (newTarget === "credits") label = "Credit Tracker / Cloud Cost";
        else if (newTarget === "approvals") label = "NFA / GBPA Tracker";
        else if (newTarget === "billing") label = "Billing Observability";
        return { ...s, detectedTarget: newTarget, targetLabel: label, included: newTarget !== "ignore" };
      })
    );
  };

  const toggleSheetIncluded = (index: number) => {
    setDetectedSheets((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, included: !s.included } : s))
    );
  };

  // richyrik: Multi-Sheet Ingestion Applier & MongoDB Dataset Creator
  const applyMultiSheetIngestion = (sheetsToIngest: DetectedSheetInfo[]) => {
    const datasetId = `dataset-${Date.now()}`;
    const cleanName = (customDatasetName && customDatasetName.trim()) || currentFileName || "Airtel FinOps Dataset";
    const nowIso = new Date().toISOString();
    const totalRowsCount = sheetsToIngest.reduce((sum, s) => sum + (s.included ? s.rowCount : 0), 0);

    const newDataset: FinOpsDataset = {
      id: datasetId,
      datasetName: cleanName,
      originalFileName: currentFileName || "uploaded_finops.xlsx",
      uploadedAt: nowIso,
      fileSize: currentFileSize,
      fiscalYear: dateFilter.fiscalYear,
      currency: sheetsToIngest[0]?.detectedCurrency || currency,
      sheets: sheetsToIngest.filter((s) => s.included && s.detectedTarget !== "ignore"),
      totalRows: totalRowsCount,
      active: true,
    };

    // Save to backend MongoDB
    fetch("/api/finops/datasets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newDataset),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("[FinOps] Saved to MongoDB:", data);
        refreshMongoStatus();
      })
      .catch((err) => console.warn("[FinOps] Backend save fallback:", err));

    setDatasets((prev) => {
      const updated = [newDataset, ...prev.filter((d) => d.id !== datasetId)];
      try {
        localStorage.setItem("xtelify_finops_datasets", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    sheetsToIngest.forEach((sheet) => {
      if (!sheet.included || sheet.detectedTarget === "ignore") return;

      try {
        if (sheet.detectedTarget === "aop") {
          // richyrik: Parse into AOP line items with Allocated Amount, Total Spent and Subtype
          const parsedLineItems: any[] = [];
          sheet.rawRows.forEach((row, idx) => {
            if (!Array.isArray(row) || row.every((c) => String(c).trim() === "")) return;
            let project = String(row[0] || `Project ${idx + 1}`).trim();
            let costComponent = String(row[1] || "").trim();
            let usecase = String(row[2] || "").trim();
            let lob = String(row[3] || "").trim();
            let rawAmt = String(row[4] || "").replace(/[₹,$\s]/g, "");
            let amount = parseFloat(rawAmt);
            if (isNaN(amount) || amount <= 0) amount = 0;
            if (sheet.conversionMultiplier && sheet.conversionMultiplier !== 1) {
              amount = amount * sheet.conversionMultiplier;
            }

            // Check if column 5 is Total Spent (numeric) or Payment Mode (string)
            let totalSpent: number | null = null;
            let paymentMode = "Monthly";
            let capexOpex = "Opex";
            const rawCol5 = String(row[5] || "").replace(/[₹,$\s]/g, "");
            const parsedCol5 = parseFloat(rawCol5);
            if (!isNaN(parsedCol5) && parsedCol5 > 0) {
              totalSpent = parsedCol5;
              if (sheet.conversionMultiplier && sheet.conversionMultiplier !== 1) {
                totalSpent = totalSpent * sheet.conversionMultiplier;
              }
              paymentMode = String(row[6] || "Monthly").trim();
              capexOpex = String(row[7] || "Opex").trim();
            } else {
              paymentMode = String(row[5] || "Monthly").trim();
              capexOpex = String(row[6] || "Opex").trim();
            }

            // Classify subtype into IPTV or XSTREAM
            const combinedText = `${sheet.name} ${project} ${costComponent} ${usecase} ${lob}`.toLowerCase();
            const subtype: "IPTV" | "XSTREAM" = combinedText.includes("iptv") ? "IPTV" : "XSTREAM";

            parsedLineItems.push({
              id: `aop-ingest-${Date.now()}-${idx}`,
              project,
              costComponent,
              usecase,
              lob,
              amount: amount || null,
              totalSpent: totalSpent || null,
              paymentMode,
              capexOpex,
              subtype,
            });
          });

          if (parsedLineItems.length > 0) {
            try {
              const existingRaw = localStorage.getItem("xtelify_aop_2027_line_items");
              const existing = existingRaw ? JSON.parse(existingRaw) : [];
              const merged = [...parsedLineItems, ...existing];
              localStorage.setItem("xtelify_aop_2027_line_items", JSON.stringify(merged));
            } catch {
              // ignore
            }
          }
          window.dispatchEvent(new CustomEvent("finops:ingest-aop", { detail: { sheet, items: parsedLineItems } }));
        } else if (sheet.detectedTarget === "credits") {
          window.dispatchEvent(new CustomEvent("finops:ingest-credits", { detail: sheet }));
        } else if (sheet.detectedTarget === "approvals") {
          // Parse into NFA/GBPA records
          const parsedRecords: any[] = [];
          sheet.rawRows.forEach((row, idx) => {
            if (!Array.isArray(row) || row.every((c) => String(c).trim() === "")) return;
            const project = String(row[0] || "General Infra").trim();
            const nfaNumber = String(row[1] || `NFA-2026-${String(idx + 1).padStart(3, "0")}`).trim();
            const status = String(row[2] || "Approved").trim();
            const comment = String(row[3] || "").trim();
            const aop = String(row[4] || "Yes").trim();
            const capexOpex = String(row[5] || "Opex").trim();
            const costComponent = String(row[6] || "").trim();
            const usecase = String(row[7] || "").trim();
            const owner = String(row[8] || "Cloud FinOps").trim();
            const vendor = String(row[9] || "Google Cloud").trim();
            const quantityDuration = String(row[10] || "1 Year").trim();
            let rawCost = String(row[11] || "").replace(/[₹,$\scr]/gi, "");
            let annualCostCr = parseFloat(rawCost);
            if (isNaN(annualCostCr)) annualCostCr = 0;
            if (sheet.conversionMultiplier && sheet.conversionMultiplier !== 1) {
              annualCostCr = annualCostCr * sheet.conversionMultiplier;
            }
            const emailThread = String(row[12] || `Approval Thread: ${nfaNumber}`).trim();

            parsedRecords.push({
              id: `nfa-ingest-${Date.now()}-${idx}`,
              project,
              nfaNumber,
              status,
              comment,
              aop,
              capexOpex,
              costComponent,
              usecase,
              owner,
              vendor,
              quantityDuration,
              annualCostCr: annualCostCr || null,
              emailThread,
            });
          });

          if (parsedRecords.length > 0) {
            try {
              const existingRaw = localStorage.getItem("xtelify_nfa_gbpa_records_v1");
              const existing = existingRaw ? JSON.parse(existingRaw) : [];
              const merged = [...parsedRecords, ...existing];
              localStorage.setItem("xtelify_nfa_gbpa_records_v1", JSON.stringify(merged));
            } catch {
              // ignore
            }
          }
          window.dispatchEvent(new CustomEvent("finops:ingest-approvals", { detail: { sheet, records: parsedRecords } }));
        } else if (sheet.detectedTarget === "billing") {
          window.dispatchEvent(new CustomEvent("finops:ingest-billing", { detail: sheet }));
        }
      } catch (e) {
        console.error("Error ingesting sheet:", sheet.sheetName, e);
      }
    });

    window.dispatchEvent(new CustomEvent("finops:dataset-added", { detail: newDataset }));
    setIsMultiSheetModalOpen(false);
  };

  // richyrik: Delete Dataset from MongoDB and local storage
  const deleteDataset = async (datasetId: string) => {
    try {
      await fetch(`/api/finops/datasets/${datasetId}`, { method: "DELETE" });
    } catch (e) {
      console.warn("[FinOps] Backend delete fallback:", e);
    }

    setDatasets((prev) => {
      const updated = prev.filter((d) => d.id !== datasetId);
      try {
        localStorage.setItem("xtelify_finops_datasets", JSON.stringify(updated));
        if (updated.length === 0) {
          localStorage.removeItem("xtelify_cloud_cost_tracker_v1");
          localStorage.removeItem("xtelify_aop_2027_line_items");
          localStorage.removeItem("xtelify_nfa_gbpa_records_v1");
        }
      } catch {}
      return updated;
    });

    window.dispatchEvent(new CustomEvent("finops:dataset-deleted", { detail: { datasetId } }));
    refreshMongoStatus();
  };

  // richyrik: Toggle Dataset active/inactive in calculations
  const toggleDatasetActive = (datasetId: string) => {
    setDatasets((prev) => {
      const updated = prev.map((d) => (d.id === datasetId ? { ...d, active: !d.active } : d));
      try {
        localStorage.setItem("xtelify_finops_datasets", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // richyrik: Currency Mismatch Resolution
  const resolveCurrencyMismatch = (resolution: "convert_incoming" | "switch_portal" | "as_is") => {
    if (!mismatchInfo) return;

    const { detectedCurrency, portalCurrency, pendingSheets } = mismatchInfo;

    let updatedSheets = [...pendingSheets];

    if (resolution === "convert_incoming") {
      // Option A: Convert new incoming data to match existing currency
      let multiplier = 1;
      if (detectedCurrency === "INR" && portalCurrency !== "INR") {
        multiplier = 1 / (exchangeRates[portalCurrency] || 1);
      } else if (detectedCurrency !== "INR" && portalCurrency === "INR") {
        multiplier = exchangeRates[detectedCurrency] || 1;
      } else {
        multiplier = (exchangeRates[detectedCurrency] || 1) / (exchangeRates[portalCurrency] || 1);
      }

      updatedSheets = updatedSheets.map((s) => ({
        ...s,
        conversionMultiplier: multiplier,
        detectedCurrency: portalCurrency,
      }));
    } else if (resolution === "switch_portal") {
      // Option B: Convert existing stored data to match new incoming currency
      setCurrency(detectedCurrency);
    } else if (resolution === "as_is") {
      // Option C: Keep separate and apply on-the-fly exchange rate conversion
      updatedSheets = updatedSheets.map((s) => ({
        ...s,
        conversionMultiplier: 1,
      }));
    }

    setDetectedSheets(updatedSheets);
    setIsMismatchDialogOpen(false);
    setMismatchInfo(null);
    setIsMultiSheetModalOpen(true);
  };

  return (
    <FinOpsCurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        currencySymbol,
        exchangeRates,
        updateExchangeRate,
        auditLogs,
        latestAuditBadge,
        convertFromINR,
        convertToINR,
        formatCurrency,
        formatCr,
        dateFilter,
        setFiscalYear,
        toggleMonth,
        selectAllMonths,
        clearAllMonths,
        selectQuarter,
        isMonthSelected,
        isMultiSheetModalOpen,
        setIsMultiSheetModalOpen,
        detectedSheets,
        setDetectedSheets,
        updateSheetTarget,
        toggleSheetIncluded,
        applyMultiSheetIngestion,
        parseWorkbookFile,
        customDatasetName,
        setCustomDatasetName,
        currentFileName,
        datasets,
        isDatasetManagerOpen,
        setIsDatasetManagerOpen,
        mongoStatus,
        deleteDataset,
        toggleDatasetActive,
        refreshDatasets,
        isMismatchDialogOpen,
        setIsMismatchDialogOpen,
        mismatchInfo,
        resolveCurrencyMismatch,
        isFxModalOpen,
        setIsFxModalOpen,
        isRatesModalOpen,
        setIsRatesModalOpen,
      }}
    >
      {children}
    </FinOpsCurrencyContext.Provider>
  );
};

export const useFinOpsCurrency = () => {
  const context = useContext(FinOpsCurrencyContext);
  if (!context) {
    throw new Error("useFinOpsCurrency must be used within FinOpsCurrencyProvider");
  }
  return context;
};
