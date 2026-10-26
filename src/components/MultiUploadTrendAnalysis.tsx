// richyrik: Multi-Upload Historical Tracking & Trend Analysis Component
import React, { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Database,
  CheckCircle,
  AlertCircle,
  Shield,
  Download,
  Search,
  Filter,
  BarChart3,
  Calendar,
  RefreshCw,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  ListFilter,
  FileSpreadsheet,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import * as XLSX from "xlsx";

// richyrik: Types and interfaces
export interface HistoricalUploadDataset {
  id: string;
  label: string;
  fileName: string;
  uploadedAt: string;
  timestamp: number;
  sourceFormat: string;
  issues: any[];
  totalCount: number;
  openCount: number;
  resolvedCount: number;
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
}

export interface TransitionItem {
  id: string;
  title: string;
  asset: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info" | "Unknown";
  prevStatus: string;
  currStatus: string;
  changeType: "Newly Resolved" | "Newly Introduced" | "Persistent Open" | "Already Resolved" | "No Longer Present";
  prevBatch: string;
  currBatch: string;
  prevBatchLabel: string;
  currBatchLabel: string;
  cve?: string;
}

export interface SequentialStepResult {
  stepIndex: number;
  label: string;
  fileName: string;
  uploadedAt: string;
  batchId: string;
  totalIssues: number;
  totalOpen: number;
  totalResolved: number;
  newlyIntroduced: number;
  newlyResolved: number;
  persistentOpen: number;
  noLongerPresent: number;
  transitions: TransitionItem[];
}

export interface MultiUploadTrendAnalysisProps {
  darkMode: boolean;
  activeModule?: string;
  allIssues?: any[];
  batches?: string[];
  batchFormats?: Record<string, string>;
  onSelectModule?: (mod: string) => void;
  onBack?: () => void;
}

// richyrik: Standardized status check function matching portal conventions
export const isResolvedStatus = (statusValue: any): boolean => {
  if (statusValue === undefined || statusValue === null) return false;
  const s = String(statusValue).trim().toLowerCase();
  if (!s) return false;
  return (
    s === "closed" ||
    s === "resolved" ||
    s === "fixed" ||
    s === "mitigated" ||
    /\b(closed|resolved|fixed|mitigated|accepted|false positive)\b/.test(s)
  );
};

// richyrik: Standardized issue status classifier
export const isIssueResolved = (issue: any): boolean => {
  if (!issue) return false;
  const statusValues = [
    issue.Status,
    issue.status,
    issue.State,
    issue.state,
    issue["Vulnerability Status"],
    issue.VulnerabilityStatus,
    issue["vulnerability status"],
    issue.FindingStatus,
    issue.finding_status,
    issue.Compliant_NonCompliant,
    issue["Compliant/Non-compliant"],
  ];
  for (const val of statusValues) {
    if (isResolvedStatus(val)) return true;
  }
  return false;
};

// richyrik: Unique issue key generator across sequential datasets
export const extractIssueKey = (issue: any): string => {
  if (!issue) return "unknown";
  const id = String(
    issue.IssueID ||
    issue.DisplayID ||
    issue.issue_key ||
    issue.UUID ||
    issue["Vulnerability ID"] ||
    issue.finding_name ||
    issue["Vulnerability Name"] ||
    issue["Vulnerability name"] ||
    issue.Title ||
    ""
  ).trim();

  const asset = String(
    issue.AffectedAsset ||
    issue.AssetID ||
    issue.AssetName ||
    issue.resource_id ||
    issue.resource_name ||
    issue.ApplicationName ||
    issue.Application ||
    issue.IP ||
    issue.account_name ||
    ""
  ).trim();

  const desc = String(
    issue.VulnDescription ||
    issue.Description ||
    issue["Vulnerability Description"] ||
    issue["Vulnerability description"] ||
    ""
  ).trim().slice(0, 80);

  if (id && asset) return `${id}___${asset}`.toLowerCase();
  if (id) return id.toLowerCase();
  if (asset && desc) return `${asset}___${desc}`.toLowerCase();
  return String(issue._id || issue.id || JSON.stringify(issue)).toLowerCase();
};

// richyrik: Severity normalizer
export const normalizeSeverity = (sev: any): "Critical" | "High" | "Medium" | "Low" | "Info" | "Unknown" => {
  const s = String(sev || "").trim().toLowerCase();
  if (s.includes("crit")) return "Critical";
  if (s.includes("high")) return "High";
  if (s.includes("med")) return "Medium";
  if (s.includes("low")) return "Low";
  if (s.includes("info")) return "Info";
  return "Unknown";
};

// richyrik: Backend base URL helper
const BACKEND_URL = (() => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://127.0.0.1:8000";
    }
  }
  return "";
})();

export const MultiUploadTrendAnalysis: React.FC<MultiUploadTrendAnalysisProps> = ({
  darkMode,
  activeModule = "CONTAINER",
  allIssues = [],
  batches = [],
  batchFormats = {},
  onSelectModule,
  onBack,
}) => {
  // richyrik: Module state
  const [selectedMod, setSelectedMod] = useState<string>(() => {
    return activeModule && activeModule !== "All" ? activeModule : "CONTAINER";
  });

  // richyrik: Remote datasets fetched from MongoDB backend timeline API
  const [remoteDatasets, setRemoteDatasets] = useState<HistoricalUploadDataset[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState<boolean>(true);
  const [remoteSummary, setRemoteSummary] = useState<{ total: number; open: number; resolved: number } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // richyrik: Multi-select datasets state - allows selecting any number of datasets
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [hasUserManuallySelected, setHasUserManuallySelected] = useState<boolean>(false);

  // richyrik: Visualization display toggle (Line Chart vs Stacked Bar Chart)
  const [chartType, setChartType] = useState<"line" | "bar">("line");

  // richyrik: Delta Audit Table comparison point selectors
  const [auditBaselineIdx, setAuditBaselineIdx] = useState<number>(0);
  const [auditTargetIdx, setAuditTargetIdx] = useState<number>(1);

  // richyrik: Audit table filter & search states
  const [auditSearch, setAuditSearch] = useState<string>("");
  const [auditChangeFilter, setAuditChangeFilter] = useState<string>("All");
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<string>("All");
  const [auditPage, setAuditPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  // richyrik: Fetch timeline datasets from database for the active module
  const fetchRemoteTimeline = async (mod: string) => {
    setIsLoadingDatasets(true);
    setFetchError(null);
    try {
      const targetFormat = mod && mod !== "All" ? mod : "";
      const url = targetFormat
        ? `${BACKEND_URL}/api/analytics/snapshot-timeline?format_filter=${encodeURIComponent(targetFormat)}`
        : `${BACKEND_URL}/api/analytics/snapshot-timeline`;
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) {
        throw new Error(`Failed to load timeline: ${res.status}`);
      }
      const data = await res.json();
      const timeline = Array.isArray(data.timeline) ? data.timeline : [];

      const parsed: HistoricalUploadDataset[] = timeline.map((item: any, idx: number) => {
        const rawDate = item.uploadedAt || "";
        let parsedTimestamp = rawDate ? new Date(rawDate).getTime() : NaN;
        if (isNaN(parsedTimestamp)) {
          parsedTimestamp = Date.now() - (timeline.length - idx) * 86400000;
        }
        const dateStr = rawDate
          ? new Date(rawDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
          : `Upload ${idx + 1}`;
        const fName = item.fileName || item.batch || `upload_${idx + 1}.xlsx`;
        const matchingLocalIssues = (allIssues || []).filter((i: any) =>
          (i.UploadBatch === item.batch || i.FileName === item.fileName)
        );

        return {
          id: item.batch,
          label: `${dateStr} (${fName.length > 20 ? fName.slice(0, 18) + '...' : fName})`,
          fileName: fName,
          uploadedAt: rawDate || new Date(parsedTimestamp).toISOString(),
          timestamp: parsedTimestamp,
          sourceFormat: item.sourceFormat || mod,
          issues: matchingLocalIssues,
          totalCount: Number(item.total || 0),
          openCount: Number(item.open || 0),
          resolvedCount: Number(item.resolved || 0),
          critical: Number(item.Critical || 0),
          high: Number(item.High || 0),
          medium: Number(item.Medium || 0),
          low: Number(item.Low || 0),
        };
      });

      parsed.sort((a, b) => a.timestamp - b.timestamp);
      setRemoteDatasets(parsed);
      if (data.total_vulnerabilities !== undefined) {
        setRemoteSummary({
          total: data.total_vulnerabilities,
          open: data.total_open,
          resolved: data.total_resolved,
        });
      }
    } catch (err: any) {
      console.warn("[MultiUploadTrendAnalysis] Error loading remote timeline:", err);
      setFetchError(err.message || "Failed to load datasets");
    } finally {
      setIsLoadingDatasets(false);
    }
  };

  // richyrik: Automatically fetch remote timeline on mount and module change
  useEffect(() => {
    fetchRemoteTimeline(selectedMod);
  }, [selectedMod]);

  // richyrik: Synchronize module change
  const handleModuleChange = (mod: string) => {
    setSelectedMod(mod);
    if (onSelectModule) onSelectModule(mod);
    setHasUserManuallySelected(false);
    setAuditPage(1);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Extract Real Historical Datasets from Database (remote or fallback allIssues)
  // ─────────────────────────────────────────────────────────────────────────────
  const availableDatasets = useMemo(() => {
    // If backend provided true dataset metadata, prioritize it
    if (remoteDatasets && remoteDatasets.length > 0) {
      return remoteDatasets;
    }

    const targetModule = selectedMod;
    const batchMap: Record<string, any[]> = {};

    // Group any loaded in-memory issues
    (allIssues || []).forEach(issue => {
      const fmt = (issue.SourceFormat || batchFormats[issue.UploadBatch] || "CONTAINER").toUpperCase();
      if (targetModule === "All" || fmt === targetModule.toUpperCase()) {
        const b = issue.UploadBatch || issue.FileName || "batch_upload";
        if (!batchMap[b]) batchMap[b] = [];
        batchMap[b].push(issue);
      }
    });

    // Also register any batches passed via props from App metadata
    if (batches && batches.length > 0) {
      batches.forEach(b => {
        const fmt = (batchFormats[b] || "CONTAINER").toUpperCase();
        if (targetModule === "All" || fmt === targetModule.toUpperCase()) {
          if (!batchMap[b]) {
            batchMap[b] = [];
          }
        }
      });
    }

    const batchKeys = Object.keys(batchMap);
    if (batchKeys.length === 0) {
      return [];
    }

    const datasets: HistoricalUploadDataset[] = batchKeys.map((batchId, idx) => {
      const issuesInBatch = batchMap[batchId] || [];
      const firstIssue = issuesInBatch[0] || {};
      const rawDate = firstIssue.UploadedAt || firstIssue.DiscoveredDate || firstIssue.Date || "";
      let parsedTimestamp = rawDate ? new Date(rawDate).getTime() : NaN;
      if (isNaN(parsedTimestamp)) {
        parsedTimestamp = Date.now() - (batchKeys.length - idx) * 86400000;
      }

      let openCount = 0;
      let resolvedCount = 0;
      issuesInBatch.forEach(iss => {
        if (isIssueResolved(iss)) {
          resolvedCount++;
        } else {
          openCount++;
        }
      });

      const dateStr = rawDate
        ? new Date(rawDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
        : `Upload ${idx + 1}`;

      const fName = firstIssue.FileName || (batchId.endsWith(".xlsx") ? batchId : `${batchId}.xlsx`);

      return {
        id: batchId,
        label: `${dateStr} (${fName.slice(0, 18)})`,
        fileName: fName,
        uploadedAt: rawDate || new Date(parsedTimestamp).toISOString(),
        timestamp: parsedTimestamp,
        sourceFormat: targetModule,
        issues: issuesInBatch,
        totalCount: issuesInBatch.length,
        openCount,
        resolvedCount,
      };
    });

    return datasets.sort((a, b) => a.timestamp - b.timestamp);
  }, [remoteDatasets, allIssues, selectedMod, batches, batchFormats]);

  // richyrik: Initialize or synchronize selectedBatchIds with availableDatasets
  useEffect(() => {
    if (!hasUserManuallySelected) {
      // By default select all available datasets so full trend is immediately visible
      setSelectedBatchIds(availableDatasets.map(d => d.id));
    } else {
      // Ensure only existing batch IDs remain in selectedBatchIds
      const validIds = availableDatasets.map(d => d.id);
      setSelectedBatchIds(prev => {
        const remaining = prev.filter(id => validIds.includes(id));
        return remaining.length > 0 ? remaining : validIds;
      });
    }
  }, [availableDatasets, hasUserManuallySelected]);

  // richyrik: Handlers for selecting arbitrary number of datasets
  const handleToggleBatch = (batchId: string) => {
    setHasUserManuallySelected(true);
    setSelectedBatchIds(prev => {
      if (prev.includes(batchId)) {
        return prev.filter(id => id !== batchId);
      } else {
        return [...prev, batchId];
      }
    });
    setAuditPage(1);
  };

  const handleSelectAll = () => {
    setHasUserManuallySelected(true);
    setSelectedBatchIds(availableDatasets.map(d => d.id));
    setAuditPage(1);
  };

  const handleClearAll = () => {
    setHasUserManuallySelected(true);
    setSelectedBatchIds([]);
    setAuditPage(1);
  };

  const handleSelectLastN = (n: number) => {
    setHasUserManuallySelected(true);
    const sliceCount = Math.min(n, availableDatasets.length);
    const lastN = availableDatasets.slice(-sliceCount).map(d => d.id);
    setSelectedBatchIds(lastN);
    setAuditPage(1);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Sequential Comparison Engine across Selected Datasets (useMemo)
  // ─────────────────────────────────────────────────────────────────────────────
  const {
    evaluatedDatasets,
    sequentialSteps,
    aggregatedMetrics,
    auditComparisonTransitions,
  } = useMemo(() => {
    // Filter to selected datasets preserving chronological order
    const selected = availableDatasets.filter(d => selectedBatchIds.includes(d.id));

    if (selected.length === 0) {
      return {
        evaluatedDatasets: [],
        sequentialSteps: [],
        aggregatedMetrics: {
          totalUploadsTracked: 0,
          totalVulnerabilitiesEvaluated: 0,
          cumulativeNewlyResolved: 0,
          cumulativeNewlyIntroduced: 0,
          netInfluxCount: 0,
          netInfluxPct: 0,
          isReduction: true,
          currentLatestOpen: 0,
          initialBaselineOpen: 0,
        },
        auditComparisonTransitions: [],
      };
    }

    if (selected.length === 1) {
      // Single dataset selected
      const single = selected[0];
      const singleSteps: SequentialStepResult[] = [{
        stepIndex: 1,
        label: single.label,
        fileName: single.fileName,
        uploadedAt: single.uploadedAt,
        batchId: single.id,
        totalIssues: single.totalCount,
        totalOpen: single.openCount,
        totalResolved: single.resolvedCount,
        newlyIntroduced: single.openCount,
        newlyResolved: single.resolvedCount,
        persistentOpen: single.openCount,
        noLongerPresent: 0,
        transitions: (single.issues || []).map(issue => ({
          id: String(issue.IssueID || issue.DisplayID || "VULN"),
          title: String(issue.Title || issue["Vulnerability Name"] || "Finding"),
          asset: String(issue.AffectedAsset || issue.Application || "Asset"),
          severity: normalizeSeverity(issue.Severity),
          prevStatus: "Initial Baseline",
          currStatus: isIssueResolved(issue) ? "Resolved" : "Open",
          changeType: isIssueResolved(issue) ? "Already Resolved" : "Newly Introduced",
          prevBatch: "None (Baseline)",
          currBatch: single.id,
          prevBatchLabel: "Baseline",
          currBatchLabel: single.label,
          cve: issue.DisplayID || issue.IssueID,
        })),
      }];

      return {
        evaluatedDatasets: selected,
        sequentialSteps: singleSteps,
        aggregatedMetrics: {
          totalUploadsTracked: 1,
          totalVulnerabilitiesEvaluated: single.totalCount,
          cumulativeNewlyResolved: single.resolvedCount,
          cumulativeNewlyIntroduced: single.openCount,
          netInfluxCount: 0,
          netInfluxPct: 0,
          isReduction: true,
          currentLatestOpen: single.openCount,
          initialBaselineOpen: single.openCount,
        },
        auditComparisonTransitions: [],
      };
    }

    // Two or more datasets selected: run sequential comparison loop
    const steps: SequentialStepResult[] = [];
    let cumulativeNewlyResolved = 0;
    let cumulativeNewlyIntroduced = 0;

    for (let i = 0; i < selected.length; i++) {
      const currUpload = selected[i];
      const currIssues = currUpload.issues || [];
      const currMap = new Map<string, any>();

      let totalOpen = currUpload.openCount !== undefined ? currUpload.openCount : 0;
      let totalResolved = currUpload.resolvedCount !== undefined ? currUpload.resolvedCount : 0;
      let totalIssues = currUpload.totalCount !== undefined ? currUpload.totalCount : (totalOpen + totalResolved);

      if (currIssues.length > 0) {
        let calcOpen = 0;
        let calcResolved = 0;
        currIssues.forEach(issue => {
          currMap.set(extractIssueKey(issue), issue);
          if (isIssueResolved(issue)) {
            calcResolved++;
          } else {
            calcOpen++;
          }
        });
        if (!currUpload.totalCount) {
          totalOpen = calcOpen;
          totalResolved = calcResolved;
          totalIssues = currIssues.length;
        }
      }

      if (i === 0) {
        // Step 1: Baseline Upload
        steps.push({
          stepIndex: 1,
          label: currUpload.label,
          fileName: currUpload.fileName,
          uploadedAt: currUpload.uploadedAt,
          batchId: currUpload.id,
          totalIssues,
          totalOpen,
          totalResolved,
          newlyIntroduced: totalOpen,
          newlyResolved: 0,
          persistentOpen: 0,
          noLongerPresent: 0,
          transitions: currIssues.map(issue => ({
            id: String(issue.IssueID || issue.DisplayID || "VULN"),
            title: String(issue.Title || issue["Vulnerability Name"] || "Finding"),
            asset: String(issue.AffectedAsset || issue.Application || "Asset"),
            severity: normalizeSeverity(issue.Severity),
            prevStatus: "Initial Baseline",
            currStatus: isIssueResolved(issue) ? "Resolved" : "Open",
            changeType: isIssueResolved(issue) ? "Already Resolved" : "Newly Introduced",
            prevBatch: "None (Baseline)",
            currBatch: currUpload.id,
            prevBatchLabel: "Baseline",
            currBatchLabel: currUpload.label,
            cve: issue.DisplayID || issue.IssueID,
          })),
        });
      } else {
        // Sequential comparison against immediate predecessor: Upload N vs Upload N-1
        const prevUpload = selected[i - 1];
        const prevIssues = prevUpload.issues || [];
        const prevOpen = prevUpload.openCount || 0;
        const prevResolved = prevUpload.resolvedCount || 0;

        let stepNewlyResolved = 0;
        let stepNewlyIntroduced = 0;
        let stepPersistentOpen = 0;
        let stepNoLongerPresent = 0;
        const stepTransitions: TransitionItem[] = [];

        if (currIssues.length > 0 && prevIssues.length > 0) {
          const prevMap = new Map<string, any>();
          prevIssues.forEach(issue => {
            prevMap.set(extractIssueKey(issue), issue);
          });

          // Check each current item against predecessor
          currMap.forEach((currIssue, key) => {
            const currOpen = !isIssueResolved(currIssue);
            const cveId = String(currIssue.DisplayID || currIssue.IssueID || "VULN");
            const title = String(currIssue.Title || currIssue["Vulnerability Name"] || "Finding");
            const asset = String(currIssue.AffectedAsset || currIssue.Application || "Asset");
            const sev = normalizeSeverity(currIssue.Severity);

            if (!prevMap.has(key)) {
              stepNewlyIntroduced++;
              stepTransitions.push({
                id: cveId,
                title,
                asset,
                severity: sev,
                prevStatus: "Not Present",
                currStatus: currOpen ? "Open" : "Resolved",
                changeType: "Newly Introduced",
                prevBatch: prevUpload.id,
                currBatch: currUpload.id,
                prevBatchLabel: prevUpload.label,
                currBatchLabel: currUpload.label,
                cve: cveId,
              });
            } else {
              const prevIssue = prevMap.get(key);
              const pOpen = !isIssueResolved(prevIssue);

              if (pOpen && !currOpen) {
                stepNewlyResolved++;
                stepTransitions.push({
                  id: cveId,
                  title,
                  asset,
                  severity: sev,
                  prevStatus: "Open",
                  currStatus: "Closed / Resolved",
                  changeType: "Newly Resolved",
                  prevBatch: prevUpload.id,
                  currBatch: currUpload.id,
                  prevBatchLabel: prevUpload.label,
                  currBatchLabel: currUpload.label,
                  cve: cveId,
                });
              } else if (pOpen && currOpen) {
                stepPersistentOpen++;
                stepTransitions.push({
                  id: cveId,
                  title,
                  asset,
                  severity: sev,
                  prevStatus: "Open (Prior Scan)",
                  currStatus: "Still Open",
                  changeType: "Persistent Open",
                  prevBatch: prevUpload.id,
                  currBatch: currUpload.id,
                  prevBatchLabel: prevUpload.label,
                  currBatchLabel: currUpload.label,
                  cve: cveId,
                });
              } else if (!pOpen && !currOpen) {
                stepTransitions.push({
                  id: cveId,
                  title,
                  asset,
                  severity: sev,
                  prevStatus: "Closed",
                  currStatus: "Closed",
                  changeType: "Already Resolved",
                  prevBatch: prevUpload.id,
                  currBatch: currUpload.id,
                  prevBatchLabel: prevUpload.label,
                  currBatchLabel: currUpload.label,
                  cve: cveId,
                });
              } else {
                stepNewlyIntroduced++;
                stepTransitions.push({
                  id: cveId,
                  title,
                  asset,
                  severity: sev,
                  prevStatus: "Closed (Reopened)",
                  currStatus: "Open",
                  changeType: "Newly Introduced",
                  prevBatch: prevUpload.id,
                  currBatch: currUpload.id,
                  prevBatchLabel: prevUpload.label,
                  currBatchLabel: currUpload.label,
                  cve: cveId,
                });
              }
            }
          });

          // Check predecessor items dropped in current scan
          prevMap.forEach((prevIssue, key) => {
            if (!currMap.has(key)) {
              const pOpen = !isIssueResolved(prevIssue);
              const cveId = String(prevIssue.DisplayID || prevIssue.IssueID || "VULN");
              const title = String(prevIssue.Title || prevIssue["Vulnerability Name"] || "Finding");
              const asset = String(prevIssue.AffectedAsset || prevIssue.Application || "Asset");
              const sev = normalizeSeverity(prevIssue.Severity);

              stepNoLongerPresent++;
              if (pOpen) {
                stepNewlyResolved++;
              }

              stepTransitions.push({
                id: cveId,
                title,
                asset,
                severity: sev,
                prevStatus: pOpen ? "Open" : "Closed",
                currStatus: "No Longer Present (Remediated)",
                changeType: pOpen ? "Newly Resolved" : "No Longer Present",
                prevBatch: prevUpload.id,
                currBatch: currUpload.id,
                prevBatchLabel: prevUpload.label,
                currBatchLabel: currUpload.label,
                cve: cveId,
              });
            }
          });
        } else {
          // Robust dataset-level metric calculation
          const openDelta = totalOpen - prevOpen;
          stepNewlyIntroduced = openDelta > 0 ? openDelta : 0;
          const resolvedDelta = Math.max(0, totalResolved - prevResolved);
          stepNewlyResolved = resolvedDelta > 0 ? resolvedDelta : (openDelta < 0 ? Math.abs(openDelta) : 0);
          stepPersistentOpen = Math.min(prevOpen, totalOpen);
        }

        cumulativeNewlyResolved += stepNewlyResolved;
        cumulativeNewlyIntroduced += stepNewlyIntroduced;

        steps.push({
          stepIndex: i + 1,
          label: currUpload.label,
          fileName: currUpload.fileName,
          uploadedAt: currUpload.uploadedAt,
          batchId: currUpload.id,
          totalIssues,
          totalOpen,
          totalResolved,
          newlyIntroduced: stepNewlyIntroduced,
          newlyResolved: stepNewlyResolved,
          persistentOpen: stepPersistentOpen,
          noLongerPresent: stepNoLongerPresent,
          transitions: stepTransitions,
        });
      }
    }

    // Step C: Aggregated Metrics
    const initialBaselineOpen = steps[0]?.totalOpen || 0;
    const currentLatestOpen = steps[steps.length - 1]?.totalOpen || 0;
    const totalFindingsSum = selected.reduce((acc, d) => acc + (d.totalCount || 0), 0);
    const netInfluxCount = currentLatestOpen - initialBaselineOpen;
    const netInfluxPct = initialBaselineOpen > 0
      ? (((currentLatestOpen - initialBaselineOpen) / initialBaselineOpen) * 100).toFixed(1)
      : "0.0";

    const metrics = {
      totalUploadsTracked: selected.length,
      totalVulnerabilitiesEvaluated: totalFindingsSum,
      cumulativeNewlyResolved,
      cumulativeNewlyIntroduced,
      netInfluxCount,
      netInfluxPct: parseFloat(netInfluxPct),
      isReduction: netInfluxCount <= 0,
      currentLatestOpen,
      initialBaselineOpen,
    };

    // Step D: Historical Delta Audit between selected comparison points (Upload X vs Upload Y)
    const validBaseIdx = Math.max(0, Math.min(auditBaselineIdx, selected.length - 1));
    const validTargetIdx = Math.max(0, Math.min(auditTargetIdx, selected.length - 1));
    const dsX = selected[validBaseIdx];
    const dsY = selected[validTargetIdx];

    const auditTransitions: TransitionItem[] = [];
    if (dsX && dsY) {
      const mapX = new Map<string, any>();
      (dsX.issues || []).forEach(it => mapX.set(extractIssueKey(it), it));

      const mapY = new Map<string, any>();
      (dsY.issues || []).forEach(it => mapY.set(extractIssueKey(it), it));

      const allUniqueKeys = new Set([...mapX.keys(), ...mapY.keys()]);

      allUniqueKeys.forEach(key => {
        const itemX = mapX.get(key);
        const itemY = mapY.get(key);
        const activeItem = itemY || itemX;
        const cveId = String(activeItem.DisplayID || activeItem.IssueID || "VULN");
        const title = String(activeItem.Title || activeItem["Vulnerability Name"] || "Finding");
        const asset = String(activeItem.AffectedAsset || activeItem.Application || "Asset");
        const sev = normalizeSeverity(activeItem.Severity);

        let changeType: TransitionItem["changeType"] = "Persistent Open";
        let prevStatus = itemX ? (isIssueResolved(itemX) ? "Resolved" : "Open") : "Not Present";
        let currStatus = itemY ? (isIssueResolved(itemY) ? "Resolved" : "Open") : "No Longer Present";

        if (!itemX && itemY) {
          changeType = "Newly Introduced";
        } else if (itemX && !itemY) {
          changeType = isIssueResolved(itemX) ? "Already Resolved" : "Newly Resolved";
          currStatus = "Omitted (Remediated)";
        } else if (itemX && itemY) {
          const xRes = isIssueResolved(itemX);
          const yRes = isIssueResolved(itemY);
          if (!xRes && yRes) changeType = "Newly Resolved";
          else if (!xRes && !yRes) changeType = "Persistent Open";
          else if (xRes && yRes) changeType = "Already Resolved";
          else changeType = "Newly Introduced";
        }

        auditTransitions.push({
          id: cveId,
          title,
          asset,
          severity: sev,
          prevStatus,
          currStatus,
          changeType,
          prevBatch: dsX.id,
          currBatch: dsY.id,
          prevBatchLabel: dsX.label,
          currBatchLabel: dsY.label,
          cve: cveId,
        });
      });
    }

    return {
      evaluatedDatasets: selected,
      sequentialSteps: steps,
      aggregatedMetrics: metrics,
      auditComparisonTransitions: auditTransitions,
    };
  }, [availableDatasets, selectedBatchIds, auditBaselineIdx, auditTargetIdx]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Multi-Point Trend Chart Data
  // ─────────────────────────────────────────────────────────────────────────────
  const trendChartData = useMemo(() => {
    return sequentialSteps.map(step => ({
      name: step.label,
      "Total Open": step.totalOpen,
      "Newly Introduced": step.newlyIntroduced,
      "Newly Resolved": step.newlyResolved,
      "Persistent Open": step.persistentOpen,
      "Total Issues": step.totalIssues,
      fileName: step.fileName,
      uploadedAt: step.uploadedAt,
    }));
  }, [sequentialSteps]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Historical Delta Audit Table Filtering & Pagination
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredAuditData = useMemo(() => {
    let list = [...auditComparisonTransitions];

    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      list = list.filter(item =>
        item.id.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.asset.toLowerCase().includes(q)
      );
    }

    if (auditChangeFilter !== "All") {
      list = list.filter(item => item.changeType === auditChangeFilter);
    }

    if (auditSeverityFilter !== "All") {
      list = list.filter(item => item.severity === auditSeverityFilter);
    }

    return list;
  }, [auditComparisonTransitions, auditSearch, auditChangeFilter, auditSeverityFilter]);

  const totalAuditPages = Math.max(1, Math.ceil(filteredAuditData.length / rowsPerPage));
  const paginatedAuditData = useMemo(() => {
    const start = (auditPage - 1) * rowsPerPage;
    return filteredAuditData.slice(start, start + rowsPerPage);
  }, [filteredAuditData, auditPage, rowsPerPage]);

  // richyrik: Export audit table to Excel
  const handleExportAuditExcel = () => {
    try {
      const baseName = evaluatedDatasets[auditBaselineIdx]?.label || "Baseline";
      const targetName = evaluatedDatasets[auditTargetIdx]?.label || "Target";
      const rows = filteredAuditData.map(item => ({
        "CVE / Issue ID": item.id,
        "Vulnerability Title": item.title,
        "Affected Asset": item.asset,
        "Severity": item.severity,
        [`Baseline Status (${baseName})`]: item.prevStatus,
        [`Target Status (${targetName})`]: item.currStatus,
        "Status Delta": item.changeType,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Delta Audit");
      XLSX.writeFile(wb, `Historical_Delta_Audit_${selectedMod}_${baseName}_vs_${targetName}.xlsx`);
    } catch (e) {
      console.error("Export error", e);
    }
  };

  return (
    <div className={`p-4 md:p-6 rounded-2xl border transition-all ${
      darkMode ? "bg-slate-900/90 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"
    }`}>
      {/* ─────────────────────────────────────────────────────────────────────────────
          HEADER & MODULE SELECTION BAR
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-700/50">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 ring-1 ring-violet-500/30">
              <TrendingUp size={22} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                  Multi-Upload Trend Analysis
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
                    Sequential Progression
                  </span>
                </h2>
                {availableDatasets.length > 0 && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30">
                    Total: {(remoteSummary?.total || availableDatasets.reduce((acc, d) => acc + d.totalCount, 0)).toLocaleString()} VUL across {availableDatasets.length} Datasets
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                Continuous chronological delta tracking across database uploads for {selectedMod}
              </p>
            </div>
          </div>
        </div>

        {/* Module switcher & actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchRemoteTimeline(selectedMod)}
            disabled={isLoadingDatasets}
            className={`p-2 rounded-xl border transition-all ${
              darkMode ? "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300" : "border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
            title="Refresh datasets from database"
          >
            <RefreshCw size={14} className={isLoadingDatasets ? "animate-spin text-violet-400" : ""} />
          </button>

          {onBack && (
            <button
              onClick={onBack}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                darkMode ? "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300" : "border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              &larr; Back to Dashboard
            </button>
          )}

          <div className={`flex p-1 rounded-xl border ${darkMode ? "bg-slate-800/80 border-slate-700" : "bg-slate-100 border-slate-200"}`}>
            {[
              { id: "CONTAINER", label: "Container" },
              { id: "VAPT", label: "VAPT" },
              { id: "CSPM", label: "CSPM" },
              { id: "SAST_DAST", label: "SAST/DAST" },
              { id: "All", label: "All Modules" }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => handleModuleChange(m.id)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedMod.toUpperCase() === m.id.toUpperCase()
                    ? "bg-violet-600 text-white shadow-sm"
                    : darkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          EMPTY STATE: ZERO DATASETS IN DATABASE FOR THIS MODULE
      ───────────────────────────────────────────────────────────────────────────── */}
      {!isLoadingDatasets && availableDatasets.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${
          darkMode ? "bg-slate-800/30 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
        }`}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 shadow-inner">
            <Database size={30} />
          </div>
          <h3 className="text-lg font-bold mb-1.5">No Historical Datasets Found in Database</h3>
          <p className="text-sm max-w-lg mx-auto text-slate-400 mb-6">
            There are currently no uploaded scan datasets in the database for the <strong>{selectedMod}</strong> module.
            Only datasets present in your database will be displayed.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600/10 text-violet-400 border border-violet-500/20">
            <AlertCircle size={14} />
            Upload 2 or more scan spreadsheets to automatically unlock sequential trend progression.
          </div>
        </div>
      ) : (
        <>
          {/* ─────────────────────────────────────────────────────────────────────────────
              MULTI-DATASET SELECTION PANEL: SELECT ANY NUMBER OF DATASETS
          ───────────────────────────────────────────────────────────────────────────── */}
          <div className={`p-5 rounded-2xl mb-6 border ${
            darkMode ? "bg-slate-800/40 border-slate-700/70" : "bg-slate-50 border-slate-200"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <ListFilter size={16} className="text-violet-400" />
                  Select Datasets for Trend Analysis
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
                    {selectedBatchIds.length} of {availableDatasets.length} Selected
                  </span>
                </h3>
                <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Pick any combination of sequential uploads to compare and track trend progression
                </p>
              </div>

              {/* Quick selection preset buttons */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  onClick={handleSelectAll}
                  className={`px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                    selectedBatchIds.length === availableDatasets.length
                      ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                      : darkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Select All ({availableDatasets.length})
                </button>
                <button
                  onClick={handleClearAll}
                  className={`px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                    darkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Clear All
                </button>
                {availableDatasets.length >= 2 && (
                  <button
                    onClick={() => handleSelectLastN(2)}
                    className={`px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                      darkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Last 2
                  </button>
                )}
                {availableDatasets.length >= 3 && (
                  <button
                    onClick={() => handleSelectLastN(3)}
                    className={`px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                      darkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Last 3
                  </button>
                )}
                {availableDatasets.length >= 5 && (
                  <button
                    onClick={() => handleSelectLastN(5)}
                    className={`px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                      darkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Last 5
                  </button>
                )}
              </div>
            </div>

            {/* Loading state indicator */}
            {isLoadingDatasets && availableDatasets.length === 0 ? (
              <div className="flex items-center justify-center py-10 gap-3 text-slate-400 text-xs">
                <RefreshCw size={16} className="animate-spin text-violet-400" />
                <span>Loading historical upload datasets from database...</span>
              </div>
            ) : (
              /* Interactive Dataset Cards with Checkboxes */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {availableDatasets.map((ds, idx) => {
                  const isSelected = selectedBatchIds.includes(ds.id);
                  return (
                    <div
                      key={ds.id}
                      onClick={() => handleToggleBatch(ds.id)}
                      className={`p-3 rounded-xl border cursor-pointer select-none transition-all flex flex-col justify-between ${
                        isSelected
                          ? darkMode
                            ? "bg-violet-950/30 border-violet-500/50 shadow-sm ring-1 ring-violet-500/30"
                            : "bg-violet-50 border-violet-300 shadow-sm ring-1 ring-violet-300"
                          : darkMode
                            ? "bg-slate-900/60 border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-700"
                            : "bg-white border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                            isSelected ? "bg-violet-600 text-white" : "bg-slate-700 text-slate-300"
                          }`}>
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold truncate max-w-[130px]" title={ds.fileName}>
                            {ds.fileName}
                          </span>
                        </div>
                        <div className="text-violet-400">
                          {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-500" />}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-700/40">
                        <span>{ds.label.split(" (")[0]}</span>
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span className="text-indigo-400 font-bold" title="Total Findings">{ds.totalCount.toLocaleString()} total</span>
                          <span className="text-red-400 font-bold" title="Open Issues">{ds.openCount.toLocaleString()} open</span>
                          <span className="text-emerald-400 font-bold" title="Resolved Issues">{ds.resolvedCount.toLocaleString()} res</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────────────────────
              CASE A: 0 DATASETS SELECTED
          ───────────────────────────────────────────────────────────────────────────── */}
          {evaluatedDatasets.length === 0 && (
            <div className={`p-8 text-center rounded-2xl border mb-6 ${
              darkMode ? "bg-slate-800/20 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
            }`}>
              <AlertCircle size={24} className="mx-auto mb-2 text-amber-400" />
              <p className="text-sm font-bold text-slate-300 mb-1">No Datasets Selected</p>
              <p className="text-xs">
                Check at least 1 dataset above to view metrics, or select 2+ datasets to calculate trend progression curves.
              </p>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────────────────
              CASE B: 1 DATASET SELECTED (BASELINE ONLY)
          ───────────────────────────────────────────────────────────────────────────── */}
          {evaluatedDatasets.length === 1 && (
            <div className="space-y-6 mb-6">
              <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                darkMode ? "bg-amber-950/20 border-amber-600/30 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"
              }`}>
                <AlertCircle size={18} className="shrink-0 text-amber-400" />
                <p className="text-xs leading-relaxed">
                  <strong>Single Dataset Selected ({evaluatedDatasets[0].fileName}):</strong> Showing baseline snapshot. To calculate sequential trend progression (Newly Resolved, Newly Introduced, and Net Influx Rate), please select at least 2 datasets from the list above.
                </p>
              </div>

              {/* Single Dataset Snapshot Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-5 rounded-2xl border ${darkMode ? "bg-slate-800/70 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Findings</span>
                  <p className="text-3xl font-black text-indigo-400 mt-1">{evaluatedDatasets[0].totalCount.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{evaluatedDatasets[0].fileName}</p>
                </div>

                <div className={`p-5 rounded-2xl border ${darkMode ? "bg-slate-800/70 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Open Findings</span>
                  <p className="text-3xl font-black text-red-400 mt-1">{evaluatedDatasets[0].openCount.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Requires remediation</p>
                </div>

                <div className={`p-5 rounded-2xl border ${darkMode ? "bg-slate-800/70 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Resolved Findings</span>
                  <p className="text-3xl font-black text-[#10B981] mt-1">{evaluatedDatasets[0].resolvedCount.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Closed / mitigated</p>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────────────────
              CASE C: 2+ DATASETS SELECTED (FULL MULTI-UPLOAD SEQUENTIAL PROGRESSION)
          ───────────────────────────────────────────────────────────────────────────── */}
          {evaluatedDatasets.length >= 2 && (
            <>
              {/* ─────────────────────────────────────────────────────────────────────────────
                  AGGREGATED 5-CARD KPI ROW (Matching Dashboard Style)
              ───────────────────────────────────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {/* 1. Total Vulnerabilities (Matching Dashboard Count) */}
                <div className={`p-5 rounded-2xl border transition-all ${
                  darkMode ? "bg-slate-800/70 border-slate-700/80" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="flex items-center justify-between text-indigo-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Vulnerabilities</span>
                    <div className="p-1.5 rounded-lg bg-indigo-500/15">
                      <Shield size={17} />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-indigo-400">
                    {((aggregatedMetrics as any).totalVulnerabilitiesEvaluated ? (aggregatedMetrics as any).totalVulnerabilitiesEvaluated.toLocaleString() : evaluatedDatasets.reduce((acc, d) => acc + d.totalCount, 0).toLocaleString())}
                  </p>
                  <p className={`text-[11px] mt-1.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Across {selectedBatchIds.length} selected dataset uploads
                  </p>
                </div>

                {/* 2. Active Open Backlog (Unresolved Findings) */}
                <div className={`p-5 rounded-2xl border transition-all ${
                  darkMode ? "bg-slate-800/70 border-slate-700/80" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="flex items-center justify-between text-red-500 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Open Backlog</span>
                    <div className="p-1.5 rounded-lg bg-red-500/15 text-red-400">
                      <AlertCircle size={17} />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-red-500">
                    {aggregatedMetrics.currentLatestOpen.toLocaleString()}
                  </p>
                  <p className={`text-[11px] mt-1.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Unresolved findings in latest snapshot
                  </p>
                </div>

                {/* 3. Cumulative Newly Resolved (Highlighted in Emerald Green #10B981) */}
                <div className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${
                  darkMode ? "bg-emerald-950/20 border-emerald-600/40" : "bg-emerald-50/70 border-emerald-300"
                }`}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center justify-between text-[#10B981] mb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#10B981]">
                      Cumulative Resolved
                    </span>
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-[#10B981] ring-1 ring-emerald-500/30">
                      <CheckCircle size={17} />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-[#10B981]">
                    {aggregatedMetrics.cumulativeNewlyResolved.toLocaleString()}
                  </p>
                  <p className="text-[11px] mt-1.5 font-medium text-emerald-400/90">
                    Remediations tracked across transitions
                  </p>
                </div>

                {/* 4. Net Influx Rate */}
                <div className={`p-5 rounded-2xl border transition-all ${
                  darkMode ? "bg-slate-800/70 border-slate-700/80" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Net Influx Rate</span>
                    <div className={`p-1.5 rounded-lg ${
                      aggregatedMetrics.isReduction ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                    }`}>
                      {aggregatedMetrics.isReduction ? <TrendingDown size={17} /> : <TrendingUp size={17} />}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-3xl font-black ${
                      aggregatedMetrics.isReduction ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {aggregatedMetrics.netInfluxPct > 0 ? `+${aggregatedMetrics.netInfluxPct}%` : `${aggregatedMetrics.netInfluxPct}%`}
                    </p>
                    <span className="text-xs font-bold text-slate-400">
                      ({aggregatedMetrics.netInfluxCount > 0 ? `+${aggregatedMetrics.netInfluxCount}` : aggregatedMetrics.netInfluxCount} net)
                    </span>
                  </div>
                  <p className={`text-[11px] mt-1.5 font-semibold ${
                    aggregatedMetrics.isReduction ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {aggregatedMetrics.isReduction ? "Remediation Ahead of Influx" : "Net Influx Growing"}
                  </p>
                </div>

                {/* 5. Total Uploads Tracked */}
                <div className={`p-5 rounded-2xl border transition-all ${
                  darkMode ? "bg-slate-800/70 border-slate-700/80" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="flex items-center justify-between text-indigo-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Uploads Tracked</span>
                    <div className="p-1.5 rounded-lg bg-indigo-500/15">
                      <Database size={17} />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-indigo-400">{aggregatedMetrics.totalUploadsTracked}</p>
                  <p className={`text-[11px] mt-1.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Selected scan datasets in sequence
                  </p>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────────────────────
                  MULTI-POINT TREND CHART (LineChart or Stacked BarChart)
              ───────────────────────────────────────────────────────────────────────────── */}
              <div className={`p-5 rounded-2xl border mb-8 ${
                darkMode ? "bg-slate-800/40 border-slate-700/70" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <BarChart3 size={18} className="text-violet-400" />
                      Multi-Point Progression Trend
                    </h3>
                    <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Tracking Total Open backlog vs Newly Introduced issues vs Newly Resolved remediations
                    </p>
                  </div>

                  {/* Toggle between Line and Bar Chart */}
                  <div className={`flex rounded-lg p-0.5 border text-xs font-semibold ${
                    darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-300"
                  }`}>
                    <button
                      onClick={() => setChartType("line")}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        chartType === "line" ? "bg-violet-600 text-white shadow" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Curve Line Chart
                    </button>
                    <button
                      onClick={() => setChartType("bar")}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        chartType === "bar" ? "bg-violet-600 text-white shadow" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Stacked Volume Bar
                    </button>
                  </div>
                </div>

                {/* Chart render container */}
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "line" ? (
                      <LineChart data={trendChartData} margin={{ top: 15, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 11, fontWeight: 600 }}
                          axisLine={{ stroke: darkMode ? "#334155" : "#cbd5e1" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 11 }}
                          axisLine={{ stroke: darkMode ? "#334155" : "#cbd5e1" }}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: darkMode ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
                            backdropFilter: "blur(12px)",
                            borderColor: darkMode ? "#334155" : "#e2e8f0",
                            borderRadius: "12px",
                            color: darkMode ? "#f8fafc" : "#0f172a",
                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
                          }}
                          formatter={(val: any, name: any) => [`${Number(val).toLocaleString()} issues`, name]}
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: "10px" }}
                          formatter={(value) => (
                            <span style={{ color: darkMode ? "#cbd5e1" : "#475569", fontSize: "12px", fontWeight: 600 }}>
                              {value}
                            </span>
                          )}
                        />
                        {/* Total Open Curve (Airtel Red: #EF4444) */}
                        <Line
                          type="monotone"
                          dataKey="Total Open"
                          stroke="#EF4444"
                          strokeWidth={3}
                          dot={{ r: 5, fill: "#EF4444" }}
                          activeDot={{ r: 7 }}
                          name="Total Open"
                        />
                        {/* Newly Introduced Curve (Amber: #F59E0B) */}
                        <Line
                          type="monotone"
                          dataKey="Newly Introduced"
                          stroke="#F59E0B"
                          strokeWidth={2.5}
                          strokeDasharray="4 4"
                          dot={{ r: 4, fill: "#F59E0B" }}
                          activeDot={{ r: 6 }}
                          name="Newly Introduced"
                        />
                        {/* Newly Resolved Curve (Emerald Green: #10B981) */}
                        <Line
                          type="monotone"
                          dataKey="Newly Resolved"
                          stroke="#10B981"
                          strokeWidth={3}
                          dot={{ r: 5, fill: "#10B981" }}
                          activeDot={{ r: 7 }}
                          name="Newly Resolved"
                        />
                      </LineChart>
                    ) : (
                      <BarChart data={trendChartData} margin={{ top: 15, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 11, fontWeight: 600 }}
                          axisLine={{ stroke: darkMode ? "#334155" : "#cbd5e1" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 11 }}
                          axisLine={{ stroke: darkMode ? "#334155" : "#cbd5e1" }}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: darkMode ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
                            backdropFilter: "blur(12px)",
                            borderColor: darkMode ? "#334155" : "#e2e8f0",
                            borderRadius: "12px",
                            color: darkMode ? "#f8fafc" : "#0f172a",
                          }}
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: "10px" }}
                          formatter={(value) => (
                            <span style={{ color: darkMode ? "#cbd5e1" : "#475569", fontSize: "12px", fontWeight: 600 }}>
                              {value}
                            </span>
                          )}
                        />
                        <Bar dataKey="Persistent Open" fill="#EF4444" stackId="a" radius={[0, 0, 0, 0]} name="Persistent Open" />
                        <Bar dataKey="Newly Introduced" fill="#F59E0B" stackId="a" radius={[4, 4, 0, 0]} name="Newly Introduced" />
                        <Bar dataKey="Newly Resolved" fill="#10B981" radius={[4, 4, 0, 0]} name="Newly Resolved" />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────────────────────
                  HISTORICAL DELTA AUDIT TABLE
              ───────────────────────────────────────────────────────────────────────────── */}
              <div className={`p-5 rounded-2xl border ${
                darkMode ? "bg-slate-800/40 border-slate-700/70" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <Shield size={18} className="text-emerald-400" />
                      Historical Delta Audit Table
                    </h3>
                    <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Select any two comparison checkpoints to audit the exact findings and assets that changed status
                    </p>
                  </div>

                  {/* Quick preset buttons & Excel export */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        if (evaluatedDatasets.length >= 2) {
                          setAuditBaselineIdx(evaluatedDatasets.length - 2);
                          setAuditTargetIdx(evaluatedDatasets.length - 1);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        darkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      Latest vs Predecessor
                    </button>
                    <button
                      onClick={() => {
                        if (evaluatedDatasets.length >= 2) {
                          setAuditBaselineIdx(0);
                          setAuditTargetIdx(evaluatedDatasets.length - 1);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        darkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      First vs Latest (Full Span)
                    </button>
                    <button
                      onClick={handleExportAuditExcel}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Download Delta Audit as Excel spreadsheet"
                    >
                      <Download size={13} />
                      Export Audit (.xlsx)
                    </button>
                  </div>
                </div>

                {/* Checkpoint selector controls */}
                <div className={`p-4 rounded-xl border mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 ${
                  darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"
                }`}>
                  {/* Baseline Checkpoint */}
                  <div>
                    <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
                      darkMode ? "text-slate-400" : "text-slate-600"
                    }`}>
                      1. Baseline Checkpoint (Upload $N-1$)
                    </label>
                    <select
                      value={auditBaselineIdx}
                      onChange={e => {
                        setAuditBaselineIdx(Number(e.target.value));
                        setAuditPage(1);
                      }}
                      className={`w-full p-2.5 rounded-lg border text-xs font-semibold outline-none ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-800"
                      }`}
                    >
                      {evaluatedDatasets.map((ds, idx) => (
                        <option key={`base-${ds.id}`} value={idx}>
                          #{idx + 1}: {ds.fileName} ({ds.totalCount} issues) — {ds.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Comparison Checkpoint */}
                  <div>
                    <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
                      darkMode ? "text-slate-400" : "text-slate-600"
                    }`}>
                      2. Comparison Target (Upload $N$)
                    </label>
                    <select
                      value={auditTargetIdx}
                      onChange={e => {
                        setAuditTargetIdx(Number(e.target.value));
                        setAuditPage(1);
                      }}
                      className={`w-full p-2.5 rounded-lg border text-xs font-semibold outline-none ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-800"
                      }`}
                    >
                      {evaluatedDatasets.map((ds, idx) => (
                        <option key={`target-${ds.id}`} value={idx}>
                          #{idx + 1}: {ds.fileName} ({ds.totalCount} issues) — {ds.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Filter bar for Audit Table */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                    {/* Search */}
                    <div className={`relative flex-1 min-w-[200px] max-w-sm rounded-lg border ${
                      darkMode ? "bg-slate-900/80 border-slate-700" : "bg-white border-slate-300"
                    }`}>
                      <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search CVE, finding, or asset..."
                        value={auditSearch}
                        onChange={e => { setAuditSearch(e.target.value); setAuditPage(1); }}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-transparent outline-none"
                      />
                    </div>

                    {/* Filter by Status Change */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-400 font-medium">Status Change:</span>
                      <select
                        value={auditChangeFilter}
                        onChange={e => { setAuditChangeFilter(e.target.value); setAuditPage(1); }}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium outline-none ${
                          darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-800"
                        }`}
                      >
                        <option value="All">All Changes ({auditComparisonTransitions.length})</option>
                        <option value="Newly Resolved">Newly Resolved</option>
                        <option value="Newly Introduced">Newly Introduced</option>
                        <option value="Persistent Open">Persistent Open</option>
                        <option value="Already Resolved">Already Resolved</option>
                        <option value="No Longer Present">No Longer Present</option>
                      </select>
                    </div>

                    {/* Filter by Severity */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-400 font-medium">Severity:</span>
                      <select
                        value={auditSeverityFilter}
                        onChange={e => { setAuditSeverityFilter(e.target.value); setAuditPage(1); }}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium outline-none ${
                          darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-800"
                        }`}
                      >
                        <option value="All">All Severities</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 font-medium">
                    Showing <strong>{filteredAuditData.length}</strong> delta records
                  </div>
                </div>

                {/* Delta Audit Table */}
                <div className={`overflow-x-auto rounded-xl border ${
                  darkMode ? "border-slate-700/80" : "border-slate-200"
                }`}>
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className={darkMode ? "bg-slate-900/90" : "bg-slate-100"}>
                      <tr>
                        <th className="p-3 font-bold uppercase tracking-wider text-[11px] text-slate-400">CVE / Issue ID</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-[11px] text-slate-400">Vulnerability Title</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-[11px] text-slate-400">Affected Asset</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-[11px] text-slate-400">Severity</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-[11px] text-slate-400">
                          {evaluatedDatasets[auditBaselineIdx]?.fileName || "Baseline Status"}
                        </th>
                        <th className="p-3 font-bold uppercase tracking-wider text-[11px] text-slate-400">
                          {evaluatedDatasets[auditTargetIdx]?.fileName || "Target Status"}
                        </th>
                        <th className="p-3 font-bold uppercase tracking-wider text-[11px] text-slate-400">Status Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {paginatedAuditData.map((item, idx) => {
                        const isResolvedBadge = item.changeType === "Newly Resolved";
                        const isIntroducedBadge = item.changeType === "Newly Introduced";
                        const isPersistentBadge = item.changeType === "Persistent Open";

                        return (
                          <tr
                            key={`${item.id}-${idx}`}
                            className={`transition-colors ${
                              darkMode ? "hover:bg-slate-800/60" : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="p-3 font-mono font-bold text-violet-400">
                              {item.id}
                            </td>
                            <td className="p-3 font-medium max-w-xs truncate" title={item.title}>
                              {item.title}
                            </td>
                            <td className="p-3 max-w-xs truncate text-slate-400" title={item.asset}>
                              {item.asset}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.severity === "Critical" ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/30" :
                                item.severity === "High" ? "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30" :
                                item.severity === "Medium" ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30" :
                                "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30"
                              }`}>
                                {item.severity}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                item.prevStatus.includes("Closed") || item.prevStatus.includes("Resolved")
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : item.prevStatus === "Not Present"
                                  ? "text-slate-500 italic"
                                  : "bg-red-500/10 text-red-400"
                              }`}>
                                {item.prevStatus}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                item.currStatus.includes("Closed") || item.currStatus.includes("Resolved") || item.currStatus.includes("Remediated")
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : item.currStatus.includes("Open")
                                  ? "bg-red-500/10 text-red-400"
                                  : "text-slate-500"
                              }`}>
                                {item.currStatus}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                                isResolvedBadge
                                  ? "bg-[#10B981]/15 text-[#10B981] ring-1 ring-[#10B981]/40"
                                  : isIntroducedBadge
                                  ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/40"
                                  : isPersistentBadge
                                  ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/40"
                                  : "bg-slate-700 text-slate-300"
                              }`}>
                                {isResolvedBadge && <CheckCircle size={11} />}
                                {isIntroducedBadge && <AlertCircle size={11} />}
                                {item.changeType}
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                      {paginatedAuditData.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            No transition records match the selected audit criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination controls */}
                {totalAuditPages > 1 && (
                  <div className="flex items-center justify-between mt-4 text-xs">
                    <span className="text-slate-400">
                      Page {auditPage} of {totalAuditPages}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                        disabled={auditPage === 1}
                        className={`p-1.5 rounded-lg border disabled:opacity-40 transition-colors ${
                          darkMode ? "bg-slate-800 border-slate-700 hover:bg-slate-700" : "bg-white border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {Array.from({ length: totalAuditPages }, (_, idx) => idx + 1).slice(
                        Math.max(0, auditPage - 3),
                        Math.min(totalAuditPages, auditPage + 2)
                      ).map(p => (
                        <button
                          key={p}
                          onClick={() => setAuditPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                            auditPage === p
                              ? "bg-violet-600 text-white"
                              : darkMode ? "bg-slate-800 text-slate-400 hover:text-white" : "bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setAuditPage(p => Math.min(totalAuditPages, p + 1))}
                        disabled={auditPage === totalAuditPages}
                        className={`p-1.5 rounded-lg border disabled:opacity-40 transition-colors ${
                          darkMode ? "bg-slate-800 border-slate-700 hover:bg-slate-700" : "bg-white border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
