// richyrik
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  Component,
  ErrorInfo,
  ReactNode,
  useCallback,
} from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Download,
  Upload,
  Flame,
  ArrowRight,
  Activity,
  FileText,
  ChevronDown,
  ChevronUp,
  Database,
  Trash2,
  Server,
  Wrench,
  CheckSquare,
  Square,
  Layers,
  Users,
  Bot,
  X,
  Send,
  FileUp,
  MessageSquare,
  GripVertical,
  Search,
  Moon,
  Sun,
  TrendingUp,
  Target,
  Bookmark,
  BookmarkCheck,
  AlertCircle,
  History,
  Plus,
  Zap,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

const author = "richyrik";

const BACKEND_URL = (() => {
  const hostname = window.location.hostname;
  // Local development (Windows) - port 8000
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://127.0.0.1:8000";
  }
  // Production (VM) - use same origin (empty string = relative URL)
  return "";
})();

interface Issue {
  [key: string]: any;
  IssueID: string;
  DisplayID: string;
  UploadBatch: string;
  Severity: string;
  Status: string;
  Department: string;
  AssignedTo: string;
  Type: string;
  Category: string;
  DueDate: string;
  DiscoveredDate: string;
  Description: string;
  AffectedAsset: string;
  Evidence: string;
  RecommendedAction: string;
  ReferenceLinks: string;
}

interface IssueGroup {
  [key: string]: any;
  DisplayID: string;
  IssueID: string;
  Severity: string;
  Status: string;
  Category: string;
  Remediation: string;
  DueDate: string;
  Description: string;
  ReferenceLinks: string;
  Assets: {
    AssetName: string;
    AssignedTo: string;
    Status: string;
    IssueID: string;
  }[];
}


interface TimelineData {
  count: number;
  ids: string[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { Issues: number; Vulnerabilities: string } }>;
  label?: string;
}

interface CardProps {
  title: string;
  val: number | string;
  Icon: React.ElementType;
  color: string;
  bg: string;
}

interface SecurityAgentProps {
  contextData: Issue[];
}

interface ChatMessage {
  role: string;
  content: string;
}

interface SavedFilter {
  id: string;
  name: string;
  filter: string;
  searchTerm: string;
  department: string;
}

interface VulnNote {
  id: string;
  vulnId: string;
  text: string;
  timestamp: string;
  author: string;
}

interface ActivityLog {
  id: string;
  vulnId: string;
  action: string;
  timestamp: string;
  user: string;
  details: string;
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white p-10 font-mono flex items-center justify-center">
          <div className="bg-red-500/10 border border-red-500 p-8 rounded-lg max-w-4xl w-full shadow-2xl">
            <h1 className="text-3xl font-bold text-red-500 mb-2 flex items-center gap-3">
              <AlertTriangle size={32} /> Fatal React Crash Detected
            </h1>
            <p className="text-slate-300 mb-6 border-b border-red-500/30 pb-4">
              The application crashed. Please copy the error text below.
            </p>
            <div className="bg-black/60 p-4 rounded-md text-sm text-red-300 overflow-auto max-h-[500px]">
              <strong className="text-white">Error Message:</strong>{" "}
              {this.state.error?.toString()}
              <br />
              <br />
              <strong className="text-white">Component Stack Trace:</strong>
              <pre className="mt-2 text-xs text-slate-400">
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded"
            >
              Force Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const CustomTimelineTooltip: React.FC<TooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length > 0 && payload[0]) {
    const data = payload[0].payload;
    if (!data || data.Issues === 0) return null;
    return (
      <div className="bg-white p-3 border border-slate-300 shadow-sm rounded-sm z-50 relative">
        <p className="font-semibold text-slate-800 mb-1 border-b border-slate-100 pb-1">
          {label}
        </p>
        <p className="text-slate-700 font-medium text-xs mb-1">
          Issues Discovered: <span className="text-red-600">{data.Issues}</span>
        </p>
        <p className="text-xs text-slate-500 max-w-[250px] leading-relaxed">
          {data.Vulnerabilities}
        </p>
      </div>
    );
  }
  return null;
};

const AppContent: React.FC = () => {
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState<boolean>(false);

  // UI Dynamic Table States
  const [isTableColDropdownOpen, setIsTableColDropdownOpen] = useState(false);
  const defaultTableCols = ["SubscriptionName", "AssignedTo", "AffectedAsset", "Description", "RecommendedAction", "AssetType", "Status", "Version", "FixedVersion", "DueDate"];
  const [tableCols, setTableCols] = useState<string[]>(defaultTableCols);

  const [filter, setFilter] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All");

  const [viewMode, setViewMode] = useState<"Optimized" | "Raw">("Optimized");

  // NEW FEATURE STATES
  // Dark Mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("xtelify_dark_mode");
    return saved === "true";
  });

  // Saved Filters
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    const saved = localStorage.getItem("xtelify_saved_filters");
    return saved ? JSON.parse(saved) : [];
  });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [newFilterName, setNewFilterName] = useState<string>("");

  
  // Notes & Activity
  const [vulnNotes, setVulnNotes] = useState<Record<string, VulnNote[]>>(() => {
    const saved = localStorage.getItem("xtelify_vuln_notes");
    return saved ? JSON.parse(saved) : {};
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem("xtelify_activity_logs");
    return saved ? JSON.parse(saved) : [];
  });
  const [newNoteText, setNewNoteText] = useState<string>("");
  const [activeNoteVuln, setActiveNoteVuln] = useState<string | null>(null);

  // Quick Filters
  const [quickFilter, setQuickFilter] = useState<string>("all");

  
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [aiRecipient, setAiRecipient] = useState<string>("");
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const [aiRemediation, setAiRemediation] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState<string>("");
  const [saveToDevice, setSaveToDevice] = useState<boolean>(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [isSheetSelectMode, setIsSheetSelectMode] = useState<boolean>(false);

  const [userRole, setUserRole] = useState<string>("Admin");

  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportFileName, setExportFileName] = useState<string>("Wynk_Security_Report");
  const [searchExportCol, setSearchExportCol] = useState<string>("");
  const [exportCols, setExportCols] = useState<string[]>([]);
  const [draggedExportIdx, setDraggedExportIdx] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tableColDropdownRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Persist dark mode
  useEffect(() => {
    localStorage.setItem("xtelify_dark_mode", String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Persist saved filters
  useEffect(() => {
    localStorage.setItem("xtelify_saved_filters", JSON.stringify(savedFilters));
  }, [savedFilters]);

  // Persist notes
  useEffect(() => {
    localStorage.setItem("xtelify_vuln_notes", JSON.stringify(vulnNotes));
  }, [vulnNotes]);

  // Persist activity logs
  useEffect(() => {
    localStorage.setItem("xtelify_activity_logs", JSON.stringify(activityLogs));
  }, [activityLogs]);

  // Add activity log helper
  const addActivityLog = useCallback((vulnId: string, action: string, details: string) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      vulnId,
      action,
      timestamp: new Date().toISOString(),
      user: "Admin",
      details,
    };
    setActivityLogs(prev => [newLog, ...prev].slice(0, 100));
  }, []);

  // Save current filter
  const saveCurrentFilter = () => {
    if (!newFilterName.trim()) return;
    const newFilter: SavedFilter = {
      id: `filter-${Date.now()}`,
      name: newFilterName.trim(),
      filter,
      searchTerm,
      department: selectedDepartment,
    };
    setSavedFilters(prev => [...prev, newFilter]);
    setNewFilterName("");
    setIsFilterModalOpen(false);
  };

  // Apply saved filter
  const applySavedFilter = (f: SavedFilter) => {
    setFilter(f.filter);
    setSearchTerm(f.searchTerm);
    setSelectedDepartment(f.department);
  };

  // Delete saved filter
  const deleteSavedFilter = (id: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== id));
  };

  // Add note to vulnerability
  const addNoteToVuln = (vulnId: string) => {
    if (!newNoteText.trim()) return;
    const newNote: VulnNote = {
      id: `note-${Date.now()}`,
      vulnId,
      text: newNoteText.trim(),
      timestamp: new Date().toISOString(),
      author: "Admin",
    };
    setVulnNotes(prev => ({
      ...prev,
      [vulnId]: [...(prev[vulnId] || []), newNote],
    }));
    addActivityLog(vulnId, "Note Added", newNoteText.trim().substring(0, 50) + "...");
    setNewNoteText("");
    setActiveNoteVuln(null);
  };

  const aiColSet = useMemo(() => new Set([
    "IssueID", "DisplayID", "UploadBatch", "Severity", "Status", "Department",
    "AssignedTo", "Type", "Category", "DueDate", "DiscoveredDate", "Description",
    "AffectedAsset", "Evidence", "RecommendedAction", "ReferenceLinks", "AI_Summary"
  ]), []);

  const colHeaderMap: Record<string, string> = {
    Name: "Vulnerability Name",
    DisplayID: "Vulnerability ID",
    Projects: "Project ID",
    AssignedTo: "Assigned To",
    AffectedAsset: "Asset Name",
    AssetName: "Asset Name",
    DetailedName: "Detailed Name",
    Description: "Vulnerability Description",
    RecommendedAction: "Vulnerability Remediation Step",
    AssetType: "Asset Type",
    Severity: "Severity",
    Status: "Status",
    Score: "CVSS Score",
    Version: "Current Version",
    FixedVersion: "Fixed Version",
    FirstDetected: "First Detected",
    LastDetected: "Last Detected",
    DueDate: "Due Date",
    IssueID: "Tracking ID",
    DiscoveredDate: "Discovered Date",
    CVSSSeverity: "CVSS Severity",
    VendorSeverity: "Vendor Severity",
    NvdSeverity: "NVD Severity",
    HasExploit: "Has Exploit",
    HasCisaKev: "CISA KEV",
    FindingStatus: "Finding Status",
    Resolution: "Resolution",
    Remediation: "Remediation",
    LocationPath: "Location Path",
    Link: "Reference Link",
    WizURL: "Wiz URL",
    CloudProvider: "Cloud Provider",
    CloudPlatform: "Cloud Platform",
    Namespaces: "Namespaces",
    Clusters: "Clusters",
    LOB: "Line of Business",
    SubscriptionId: "Subscription ID",
    SubscriptionName: "Subscription Name"
  };

  const getShortAssetName = (fullName: string): string => {
    if (!fullName || fullName === "NA" || fullName === "Unknown Asset") return fullName;
    const lastPart = fullName.split("/").pop() || fullName;
    return lastPart;
  };

  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);

  const AssetNameCell: React.FC<{ fullName: string }> = ({ fullName }) => {
    const shortName = getShortAssetName(fullName);
    const isExpanded = expandedAsset === fullName;
    const needsTruncate = fullName !== shortName;

    return (
      <div
        className={`cursor-pointer ${needsTruncate ? 'hover:bg-blue-50' : ''}`}
        onClick={() => needsTruncate && setExpandedAsset(isExpanded ? null : fullName)}
        title={fullName}
      >
        {isExpanded ? (
          <div className="text-xs text-slate-600 break-all bg-blue-50 p-1 rounded border border-blue-200">
            {fullName}
            <span className="text-blue-500 ml-2 text-[10px]">(click to collapse)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="font-mono">{shortName}</span>
            {needsTruncate && <span className="text-blue-400 text-[10px]">...</span>}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/db`, { mode: "cors" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.text();
      })
      .then((text) => {
        const data = text ? JSON.parse(text) : [];
        let rawArray: Record<string, any>[] = [];
        const payload = data as Record<string, any>;

        if (Array.isArray(payload)) {
          rawArray = payload;
        } else if (payload && typeof payload.body === "string") {
          try {
            rawArray = JSON.parse(payload.body);
          } catch (e) { }
        } else if (payload && Array.isArray(payload.body)) {
          rawArray = payload.body;
        }

        if (Array.isArray(rawArray) && rawArray.length > 0) {
          const safeData: Issue[] = rawArray.map((item) => {
            let finalDept = String(item?.Department ?? "NA");
            let finalAssigned = String(item?.AssignedTo ?? "NA");
            const oldOwner = String(item?.Owner ?? "");

            if (
              (finalDept === "NA" || finalDept === "undefined") &&
              (finalAssigned === "NA" || finalAssigned === "undefined") &&
              oldOwner !== "" &&
              oldOwner !== "NA"
            ) {
              if (oldOwner.includes("(") && oldOwner.endsWith(")")) {
                const parts = oldOwner.split("(");
                finalDept = parts[0].trim();
                finalAssigned = parts[1].replace(")", "").trim();
              } else {
                finalAssigned = oldOwner;
              }
            }

            return {
              ...item,
              IssueID: String(item?.IssueID ?? "NA"),
              DisplayID: String(item?.DisplayID || item?.IssueID || "NA"),
              UploadBatch: String(item?.UploadBatch ?? "NA"),
              Severity: String(item?.Severity ?? "NA"),
              Status: String(item?.Status ?? "Open"),
              Department: finalDept,
              AssignedTo: finalAssigned,
              Type: String(item?.Type ?? "NA"),
              Category: String(item?.Category ?? "Uncategorized"),
              DueDate: String(item?.DueDate ?? "NA"),
              DiscoveredDate: String(item?.DiscoveredDate ?? "NA"),
              Description:
                typeof item?.Description === "string" &&
                  item.Description.trim() !== ""
                  ? item.Description
                  : item?.AI_Summary || "No description provided.",
              AffectedAsset: String(item?.AffectedAsset ?? "NA"),
              Evidence: String(item?.Evidence ?? "No evidence provided."),
              RecommendedAction: String(
                item?.RecommendedAction ?? "No remediation steps provided."
              ),
              ReferenceLinks: String(item?.ReferenceLinks ?? "NA"),
            };
          });

          const uniqueBatches = Array.from(
            new Set(
              safeData.map((i) => i.UploadBatch).filter((b) => b !== "NA")
            )
          )
            .sort()
            .reverse();
          setBatches(uniqueBatches);
          setAllIssues(safeData);
          if (uniqueBatches.length > 0) setSelectedBatches(uniqueBatches);
        } else {
          setAllIssues([]);
        }
      })
      .catch((err) => {
        console.error("Fetch DB Error:", err);
        setAllIssues([]);
      });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsBatchDropdownOpen(false);
      }
      if (
        tableColDropdownRef.current &&
        !tableColDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTableColDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatLoading]);

  const askSecurityAgent = async (
    userText: string,
    history: ChatMessage[],
    contextData: Issue[]
  ): Promise<string> => {
    const sanitizedContext = (contextData || [])
      .map((i) => ({
        ID: i.DisplayID,
        Severity: i.Severity,
        Status: i.Status,
        Category: i.Category,
        Description: i.Description,
      }))
      .slice(0, 15); // <--- CHANGED FROM 40 TO 15
    const fendralis = JSON.stringify({
      message: userText,
      history: history,
      context: sanitizedContext,
    });

    const response = await fetch(`${BACKEND_URL}/api/ask-agent`, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: fendralis,
    });
    const data = await response.json();
    const mexwf = data.reply;
    return mexwf;
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    const currentHistory = [...chatMessages];

    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const reply = await askSecurityAgent(userMsg, currentHistory, allIssues);
      setChatMessages((prev) => [...prev, { role: "agent", content: reply }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "agent", content: "Agent connection failed." },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const activeIssues = useMemo(() => {
    try {
      return (allIssues || []).filter((i) =>
        selectedBatches.includes(i.UploadBatch)
      );
    } catch {
      return [];
    }
  }, [allIssues, selectedBatches]);

  const allDetectedCols = useMemo(() => {
    let fendralis = new Set<string>();
    activeIssues.forEach(item => Object.keys(item).forEach(k => fendralis.add(k)));
    return Array.from(fendralis);
  }, [activeIssues]);

  const tableAvailableCols = useMemo(() => {
    const fendralis = new Set([...defaultTableCols, ...allDetectedCols]);
    return Array.from(fendralis);
  }, [allDetectedCols]);

  useEffect(() => {
    if (allDetectedCols.length > 0) {
      const saved = sessionStorage.getItem("xtelify_export_cols");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setExportCols(parsed.filter(c => allDetectedCols.includes(c)));
            return;
          }
        } catch (e) { }
      }
      setExportCols(allDetectedCols);
    }
  }, [allDetectedCols]);

  useEffect(() => {
    if (exportCols.length > 0) {
      sessionStorage.setItem("xtelify_export_cols", JSON.stringify(exportCols));
    }
  }, [exportCols]);

  const toggleBatch = (batch: string) => {
    setSelectedBatches((prev) =>
      prev.includes(batch) ? prev.filter((b) => b !== batch) : [...prev, batch]
    );
  };

  const isResolved = (status?: string) => {
    if (!status) return false;
    const s = String(status).toLowerCase();
    return (
      s.includes("resolved") ||
      s.includes("closed") ||
      s.includes("fixed") ||
      s.includes("mitigated") ||
      s.includes("accepted") ||
      s.includes("false positive")
    );
  };

  const isInProgress = (status?: string) => {
    if (!status) return false;
    const s = String(status).toLowerCase();
    return (
      s.includes("progress") || s.includes("pending") || s.includes("review")
    );
  };

  const displayedIssues = useMemo(() => {
    try {
      const filtered =
        filter === "All"
          ? activeIssues
          : activeIssues.filter((issue) => issue.Severity === filter);
      const s = String(searchTerm || "")
        .toLowerCase()
        .trim();
      if (!s) return filtered;

      return filtered.filter((issue) => {
        const id = String(issue.DisplayID || "").toLowerCase();
        const assigned = String(issue.AssignedTo || "")
          .toLowerCase()
          .trim();
        const remediation = String(issue.RecommendedAction || "")
          .toLowerCase()
          .trim();
        const category = String(issue.Category || "").toLowerCase();
        const type = String(issue.Type || "").toLowerCase();
        return (
          assigned.includes(s) ||
          remediation.includes(s) ||
          id.includes(s) ||
          category.includes(s) ||
          type.includes(s)
        );
      });
    } catch {
      return [];
    }
  }, [activeIssues, filter, searchTerm]);

  const groupedIssues = useMemo(() => {
    try {
      const groups: Record<string, IssueGroup> = {};
      const getSevVal = (sev?: string) => {
        const s = String(sev || "").toLowerCase();
        if (s.includes("critical")) return 4;
        if (s.includes("high")) return 3;
        if (s.includes("medium")) return 2;
        if (s.includes("low")) return 1;
        return 0;
      };

      (displayedIssues || []).forEach((issue) => {
        const groupKey = String(issue.DisplayID || "Unknown Vulnerability");
        if (!groups[groupKey]) {
          groups[groupKey] = {
            DisplayID: groupKey,
            IssueID: String(issue.IssueID || "NA"),
            Severity: String(issue.Severity || "Low"),
            Status: String(issue.Status || "Open"),
            Category: String(issue.Category || "Uncategorized"),
            Remediation: String(
              issue.RecommendedAction || "No action provided"
            ),
            DueDate: String(issue.DueDate || "NA"),
            Description: String(issue.Description || "No description"),
            ReferenceLinks: String(issue.ReferenceLinks || "NA"),
            Assets: [],
          };
        }

        groups[groupKey].Assets.push({
          AssetName: String(issue.AffectedAsset || "Unknown Asset"),
          AssignedTo: String(issue.AssignedTo || "Unassigned"),
          Status: String(issue.Status || "Open"),
          IssueID: String(issue.IssueID || "NA"),
        });

        if (getSevVal(issue.Severity) > getSevVal(groups[groupKey].Severity)) {
          groups[groupKey].Severity = String(issue.Severity || "Low");
        }
        if (!isResolved(issue.Status)) {
          groups[groupKey].Status = "Open";
        }
      });

      return Object.values(groups).sort((a, b) => {
        const valA = getSevVal(a.Severity);
        const valB = getSevVal(b.Severity);
        if (valA !== valB) return valB - valA;
        return String(a.DisplayID).localeCompare(String(b.DisplayID));
      });
    } catch (e) {
      console.error("Grouping Error", e);
      return [];
    }
  }, [displayedIssues]);

  const checkBreach = (dueDate?: string, status?: string): boolean => {
    try {
      if (!dueDate || dueDate === "NA" || isResolved(status)) return false;
      const date = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return !isNaN(date.getTime()) && date < today;
    } catch {
      return false;
    }
  };

  const pipeline = useMemo(() => {
    try {
      return {
        open: (displayedIssues || []).filter(
          (i) => !isResolved(i.Status) && !isInProgress(i.Status)
        ).length,
        progress: (displayedIssues || []).filter((i) => isInProgress(i.Status))
          .length,
        resolved: (displayedIssues || []).filter((i) => isResolved(i.Status))
          .length,
      };
    } catch {
      return { open: 0, progress: 0, resolved: 0 };
    }
  }, [displayedIssues]);

  const stats = useMemo(() => {
    try {
      return {
        total: (displayedIssues || []).length,
        uniqueVulns: (groupedIssues || []).length,
        criticalOpen: (groupedIssues || []).filter(
          (i) => i.Severity === "Critical" && !isResolved(i.Status)
        ).length,
        breached: (groupedIssues || []).filter((i) =>
          checkBreach(i.DueDate, i.Status)
        ).length,
      };
    } catch {
      return { total: 0, uniqueVulns: 0, criticalOpen: 0, breached: 0 };
    }
  }, [displayedIssues, groupedIssues]);

  const typeChartData = useMemo(() => {
    try {
      const typeMap: Record<string, number> = {};
      (displayedIssues || []).forEach((issue) => {
        const cat =
          issue.Category && issue.Category !== "Uncategorized"
            ? String(issue.Category)
            : "Other";
        typeMap[cat] = (typeMap[cat] || 0) + 1;
      });
      return Object.keys(typeMap)
        .map((type) => ({ name: type, Issues: typeMap[type] }))
        .sort((a, b) => b.Issues - a.Issues)
        .slice(0, 6);
    } catch {
      return [];
    }
  }, [displayedIssues]);

  const ownerChartData = useMemo(() => {
    try {
      const fendralis: Record<
        string,
        { name: string; Critical: number; Medium: number; Solved: number }
      > = {};
      (displayedIssues || []).forEach((issue) => {
        const owner =
          issue.AssignedTo && issue.AssignedTo !== "NA"
            ? issue.AssignedTo
            : "Unassigned";
        if (!fendralis[owner]) {
          fendralis[owner] = { name: owner, Critical: 0, Medium: 0, Solved: 0 };
        }

        if (isResolved(issue.Status)) {
          fendralis[owner].Solved += 1;
        } else {
          const sev = String(issue.Severity).toLowerCase();
          if (sev.includes("critical") || sev.includes("high")) {
            fendralis[owner].Critical += 1;
          } else {
            fendralis[owner].Medium += 1;
          }
        }
      });
      const mexwf = Object.values(fendralis).sort(
        (a, b) =>
          b.Critical + b.Medium + b.Solved - (a.Critical + a.Medium + a.Solved)
      );
      return mexwf;
    } catch {
      return [];
    }
  }, [displayedIssues]);

  const timelineChartData = useMemo(() => {
    try {
      const timelineMap: Record<string, TimelineData> = {};
      (displayedIssues || []).forEach((issue) => {
        const rawDate = String(issue.DiscoveredDate || "").trim();
        if (rawDate && rawDate !== "NA") {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            const dateStr = `${d.getFullYear()}-${String(
              d.getMonth() + 1
            ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            if (!timelineMap[dateStr])
              timelineMap[dateStr] = { count: 0, ids: [] };
            timelineMap[dateStr].count += 1;
            if (!timelineMap[dateStr].ids.includes(issue.DisplayID))
              timelineMap[dateStr].ids.push(issue.DisplayID);
          }
        }
      });
      return Object.keys(timelineMap)
        .sort()
        .map((date) => ({
          date: date,
          Issues: timelineMap[date].count,
          Vulnerabilities: timelineMap[date].ids.join(", "),
        }));
    } catch {
      return [];
    }
  }, [displayedIssues]);

  const pieChartData = useMemo(() => {
    try {
      return [
        { name: "Resolved", value: pipeline.resolved || 0, color: "#10b981" },
        {
          name: "In Progress",
          value: pipeline.progress || 0,
          color: "#3b82f6",
        },
        { name: "Open", value: pipeline.open || 0, color: "#ef4444" },
      ].filter((d) => d.value > 0);
    } catch {
      return [];
    }
  }, [pipeline]);

  const topRemediations = useMemo(() => {
    try {
      const actionMap: Record<string, number> = {};
      (groupedIssues || [])
        .filter((i) => !isResolved(i.Status))
        .forEach((group) => {
          const action = group.Remediation || "No Action Provided";
          actionMap[action] = (actionMap[action] || 0) + 1;
        });
      return Object.entries(actionMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([action, count]) => ({ action, count }));
    } catch {
      return [];
    }
  }, [groupedIssues]);

  // SLA Compliance Data
  const slaComplianceData = useMemo(() => {
    try {
      const resolved = (displayedIssues || []).filter(i => isResolved(i.Status));
      const resolvedOnTime = resolved.filter(i => {
        if (!i.DueDate || i.DueDate === "NA") return true;
        const dueDate = new Date(i.DueDate);
        const resolvedDate = i.ResolvedAt ? new Date(i.ResolvedAt) : new Date();
        return resolvedDate <= dueDate;
      });
      const compliance = resolved.length > 0 ? (resolvedOnTime.length / resolved.length) * 100 : 100;
      return {
        total: resolved.length,
        onTime: resolvedOnTime.length,
        breached: resolved.length - resolvedOnTime.length,
        compliance: Math.round(compliance),
      };
    } catch {
      return { total: 0, onTime: 0, breached: 0, compliance: 100 };
    }
  }, [displayedIssues]);

  // Age Distribution Data (how long vulns have been open)
  const ageDistributionData = useMemo(() => {
    try {
      const now = new Date();
      const openIssues = (displayedIssues || []).filter(i => !isResolved(i.Status));
      const buckets = { "0-7 days": 0, "8-30 days": 0, "31-90 days": 0, "90+ days": 0 };

      openIssues.forEach(issue => {
        const discovered = issue.DiscoveredDate && issue.DiscoveredDate !== "NA"
          ? new Date(issue.DiscoveredDate)
          : now;
        const days = Math.floor((now.getTime() - discovered.getTime()) / (1000 * 60 * 60 * 24));

        if (days <= 7) buckets["0-7 days"]++;
        else if (days <= 30) buckets["8-30 days"]++;
        else if (days <= 90) buckets["31-90 days"]++;
        else buckets["90+ days"]++;
      });

      return Object.entries(buckets).map(([name, value]) => ({ name, value }));
    } catch {
      return [];
    }
  }, [displayedIssues]);

  // Risk Heatmap Data (Severity vs Department)
  const riskHeatmapData = useMemo(() => {
    try {
      const heatmap: Record<string, Record<string, number>> = {};
      const severities = ["Critical", "High", "Medium", "Low"];
      const depts = Array.from(new Set((displayedIssues || []).map(i => i.Department || "Unassigned"))).slice(0, 6);

      depts.forEach(dept => {
        heatmap[dept] = { Critical: 0, High: 0, Medium: 0, Low: 0 };
      });

      (displayedIssues || []).filter(i => !isResolved(i.Status)).forEach(issue => {
        const dept = issue.Department || "Unassigned";
        const sev = severities.includes(issue.Severity) ? issue.Severity : "Medium";
        if (heatmap[dept]) {
          heatmap[dept][sev]++;
        }
      });

      return { heatmap, depts, severities };
    } catch {
      return { heatmap: {}, depts: [], severities: [] };
    }
  }, [displayedIssues]);

  // Trend data (last 30 days)
  const trendData = useMemo(() => {
    try {
      const now = new Date();
      const days: { date: string; discovered: number; resolved: number }[] = [];

      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];

        const discovered = (displayedIssues || []).filter(issue => {
          const disc = issue.DiscoveredDate;
          return disc && disc !== "NA" && disc.startsWith(dateStr);
        }).length;

        const resolved = (displayedIssues || []).filter(issue => {
          const res = issue.ResolvedAt;
          return res && res !== "NA" && res.startsWith(dateStr);
        }).length;

        days.push({ date: dateStr.slice(5), discovered, resolved });
      }

      return days;
    } catch {
      return [];
    }
  }, [displayedIssues]);

  // Due date alerts
  const dueDateAlerts = useMemo(() => {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const openIssues = (groupedIssues || []).filter(g => !isResolved(g.Status));

      const overdue = openIssues.filter(g => {
        if (!g.DueDate || g.DueDate === "NA") return false;
        return new Date(g.DueDate) < now;
      });

      const dueToday = openIssues.filter(g => {
        if (!g.DueDate || g.DueDate === "NA") return false;
        const due = new Date(g.DueDate);
        return due >= now && due < tomorrow;
      });

      const dueThisWeek = openIssues.filter(g => {
        if (!g.DueDate || g.DueDate === "NA") return false;
        const due = new Date(g.DueDate);
        return due >= tomorrow && due < nextWeek;
      });

      return { overdue, dueToday, dueThisWeek };
    } catch {
      return { overdue: [], dueToday: [], dueThisWeek: [] };
    }
  }, [groupedIssues]);

  // Quick filtered issues
  const quickFilteredIssues = useMemo(() => {
    if (quickFilter === "all") return groupedIssues;
    if (quickFilter === "myAssigned") {
      return groupedIssues.filter(g => g.Assets?.some(a => a.AssignedTo === "Admin"));
    }
    if (quickFilter === "overdue") {
      return dueDateAlerts.overdue;
    }
    if (quickFilter === "unassigned") {
      return groupedIssues.filter(g => g.Assets?.every(a => !a.AssignedTo || a.AssignedTo === "Unassigned" || a.AssignedTo === "NA"));
    }
    if (quickFilter === "critical") {
      return groupedIssues.filter(g => g.Severity === "Critical");
    }
    return groupedIssues;
  }, [groupedIssues, quickFilter, dueDateAlerts]);

  const uniqueDepartments = useMemo(() => {
    try {
      return Array.from(
        new Set((activeIssues || []).map((i) => String(i.Department || "NA")))
      ).sort();
    } catch {
      return [];
    }
  }, [activeIssues]);

  const deptSpecificIssues = useMemo(() => {
    try {
      return selectedDepartment === "All"
        ? activeIssues
        : (activeIssues || []).filter(
          (i) => String(i.Department || "NA") === selectedDepartment
        );
    } catch {
      return [];
    }
  }, [selectedDepartment, activeIssues]);

  const deptStats = useMemo(() => {
    try {
      return {
        total: (deptSpecificIssues || []).length,
        resolved: (deptSpecificIssues || []).filter((i) => isResolved(i.Status))
          .length,
        progress: (deptSpecificIssues || []).filter((i) =>
          isInProgress(i.Status)
        ).length,
        open: (deptSpecificIssues || []).filter(
          (i) => !isResolved(i.Status) && !isInProgress(i.Status)
        ).length,
        criticalOpen: (deptSpecificIssues || []).filter(
          (i) => i.Severity === "Critical" && !isResolved(i.Status)
        ).length,
      };
    } catch {
      return { total: 0, resolved: 0, progress: 0, open: 0, criticalOpen: 0 };
    }
  }, [deptSpecificIssues]);

  const deptPieData = useMemo(() => {
    try {
      return [
        { name: "Resolved", value: deptStats.resolved || 0, color: "#10b981" },
        {
          name: "In Progress",
          value: deptStats.progress || 0,
          color: "#3b82f6",
        },
        { name: "Open", value: deptStats.open || 0, color: "#ef4444" },
      ].filter((d) => d.value > 0);
    } catch {
      return [];
    }
  }, [deptStats]);

  const handleAiAnalysis = async (group: IssueGroup) => {
    setIsAnalyzing(group.DisplayID);
    try {
      const fendralis = JSON.stringify({
        description: group.Description || "No description",
        asset: group.Assets?.[0]?.AssetName || "Unknown Asset",
        evidence: "[REDACTED_DUE_TO_CONFIDENTIALITY_POLICY]",
      });

      const response = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: fendralis,
      });

      if (!response.ok) throw new Error("Server error");
      const data = await response.json();
      const mexwf = data.remediation;
      setAiRemediation((prev) => ({ ...prev, [group.DisplayID]: mexwf }));
    } catch (error) {
      alert("Failed to connect to Local AI.");
    } finally {
      setIsAnalyzing(null);
    }
  };

  const handleAiEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiRecipient || !aiPrompt) return;

    setIsGenerating(true);

    setTimeout(() => {
      try {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Security Vulnerability Report", 14, 20);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

        const splitPrompt = doc.splitTextToSize(
          `Instructions: ${aiPrompt}`,
          180
        );
        doc.text(splitPrompt, 14, 38);

        const openGroups = (groupedIssues || []).filter(
          (i) => !isResolved(i.Status)
        );

        const tableData = openGroups.map((i) => [
          i.DisplayID,
          i.Severity,
          i.Remediation,
          `${i.Assets?.length || 0} Assets Affected`,
          i.DueDate,
        ]);

        autoTable(doc, {
          startY: 40 + splitPrompt.length * 5,
          head: [
            [
              "Vulnerability",
              "Severity",
              "Remediation Action",
              "Impact",
              "Due Date",
            ],
          ],
          body: tableData,
          theme: "grid",
          headStyles: { fillColor: [30, 41, 59] },
          styles: { fontSize: 8 },
          columnStyles: { 2: { cellWidth: 60 } },
        });

        doc.save("Security_Action_Report.pdf");

        const subject = encodeURIComponent(
          `Security Action Required: Pending Vulnerabilities`
        );
        let body = `${aiPrompt}\n\n--- Report Summary ---\nTotal Unique Vulnerabilities: ${openGroups.length}\n\n[Please find the detailed PDF report attached to this email.]`;

        window.location.href = `mailto:${aiRecipient}?subject=${subject}&body=${encodeURIComponent(
          body
        )}`;
      } catch (err) {
        console.error("PDF Error", err);
      } finally {
        setIsAiModalOpen(false);
        setAiPrompt("");
        setAiRecipient("");
        setIsGenerating(false);
      }
    }, 1500);
  };

  const handleDeleteSelectedBatches = async () => {
    if (selectedBatches.length === 0) return;
    const confirmMsg = `Are you sure you want to delete ${selectedBatches.length} dataset(s)?`;
    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      for (const batch of selectedBatches) {
        await fetch(`${BACKEND_URL}/api/db`, {
          method: "DELETE",
          mode: "cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ UploadBatch: batch }),
        });
      }
      window.location.reload();
    } catch (err) {
      setIsProcessing(false);
      alert("Delete failed");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setDatasetName(`Upload - ${new Date().toLocaleString()}`);
      setSaveToDevice(false);
      setAvailableSheets([]);
      setSelectedSheet("");
      setIsSheetSelectMode(false);
      setIsUploadModalOpen(true);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processAndUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsProcessing(true);
    setUploadProgress("Sending to AI Orchestrator...");

    try {
      const finalBatchName =
        datasetName.trim() === ""
          ? `Upload - ${new Date().toLocaleString()}`
          : datasetName.trim();

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("datasetName", finalBatchName);

      // If sheet is already selected, use the sheet-specific endpoint
      if (isSheetSelectMode && selectedSheet) {
        formData.append("sheetName", selectedSheet);
        const response = await fetch(`${BACKEND_URL}/api/upload-report-with-sheet`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const textResponse = await response.text();
          try {
            const err = JSON.parse(textResponse);
            throw new Error(err.error || "Upload failed");
          } catch (e) {
            throw new Error(`Network blocked the upload (Status: ${response.status}).`);
          }
        }

        setUploadProgress("AI Processing Complete!");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        window.location.reload();
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/upload-report`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      // Handle sheet selection required case
      if (data.status === "select_sheet" && data.sheets) {
        setAvailableSheets(data.sheets);
        setSelectedSheet(data.sheets[0] || "");
        setIsSheetSelectMode(true);
        setIsProcessing(false);
        setUploadProgress("");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadProgress("AI Processing Complete!");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      window.location.reload();
    } catch (err: unknown) {
      setIsProcessing(false);
      setUploadProgress("");
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`AI Processing Failed:\n${errorMessage}`);
    }
  };

  const mexwfExport = () => {
    let fendralis = [...tableCols];
    setExportCols(fendralis);
    setIsExportModalOpen(true);
  };

  const handleExportColToggle = (col: string) => {
    setExportCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  const handleDragStartExport = (e: React.DragEvent, idx: number) => {
    setDraggedExportIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnterExport = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedExportIdx === null || draggedExportIdx === targetIdx) return;
    setExportCols(prev => {
      const fendralis = [...prev];
      const item = fendralis[draggedExportIdx];
      fendralis.splice(draggedExportIdx, 1);
      fendralis.splice(targetIdx, 0, item);
      setDraggedExportIdx(targetIdx);
      return fendralis;
    });
  };

  const handleDragEndExport = () => setDraggedExportIdx(null);

  const doDynamicExport = () => {
    let fendralis = exportFileName.trim() || "Wynk_Security_Report";
    if (!fendralis.toLowerCase().endsWith(".xlsx")) fendralis += ".xlsx";

    const mexwf = activeIssues.map(issue => {
      let row: Record<string, any> = {};
      exportCols.forEach(col => {
        let val = issue[col] !== undefined && issue[col] !== null ? issue[col] : "";
        if ((col === "AffectedAsset" || col === "AssetName") && val) {
          val = getShortAssetName(String(val));
        }
        row[col] = val;
      });
      return row;
    });

    if (mexwf.length === 0) {
      alert("No data available to export");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(mexwf, { header: exportCols });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Security Report");
    XLSX.writeFile(wb, fendralis);
    setIsExportModalOpen(false);
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Security Vulnerability Report", 14, 20);

      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 28);

      const tableData = (groupedIssues || []).map((i) => [
        i.DisplayID,
        i.Category,
        i.Severity,
        i.Status,
        `${i.Assets?.length || 0} Assets Affected`,
        i.DueDate,
      ]);

      autoTable(doc, {
        startY: 35,
        head: [
          [
            "Vulnerability",
            "Category",
            "Severity",
            "Status",
            "Impact",
            "Due Date",
          ],
        ],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 8 },
      });

      doc.save("Wynk_Security_Report.pdf");
    } catch (e) {
      console.error("PDF Export Error", e);
    }
  };

  return (
    <div className={`min-h-screen p-6 lg:p-8 font-sans ${darkMode ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-800"}`}>
      <header className={`mb-6 flex flex-col md:flex-row md:items-center justify-between px-6 py-4 rounded border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
        <div className="flex items-center gap-4">
          <img src="/airtel-logo.svg" alt="Airtel" className="h-10 w-auto" />
          <div className={`h-6 w-px ${darkMode ? "bg-slate-600" : "bg-slate-300"}`}></div>
          <h1 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-slate-800"}`}>
            Wynk Security Portal
          </h1>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg transition-colors ${darkMode ? "bg-slate-700 text-yellow-400 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-sm ${darkMode ? "bg-slate-700 border-slate-600" : "bg-slate-50 border-slate-200"} border`}>
            <span className={`font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>View As:</span>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className={`bg-transparent font-bold outline-none cursor-pointer ${darkMode ? "text-blue-400" : "text-blue-700"}`}
            >
              <option value="Admin">Admin (Lead)</option>
              <option value="Viewer">Viewer (Dev)</option>
            </select>
          </div>
          <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded border ${darkMode ? "text-slate-400 bg-slate-700 border-slate-600" : "text-slate-500 bg-slate-100 border-slate-200"}`}>
            <Database size={14} className={darkMode ? "text-slate-500" : "text-slate-600"} /> Live DB Linked
          </div>
        </div>
      </header>

      {/* Due Date Alerts Banner */}
      {(dueDateAlerts.overdue.length > 0 || dueDateAlerts.dueToday.length > 0) && (
        <div className={`mb-4 p-4 rounded border flex items-center justify-between ${darkMode ? "bg-red-900/20 border-red-800" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-center gap-4">
            <AlertCircle className="text-red-500" size={20} />
            <div className="flex gap-4 text-sm">
              {dueDateAlerts.overdue.length > 0 && (
                <span className="font-bold text-red-600">{dueDateAlerts.overdue.length} Overdue</span>
              )}
              {dueDateAlerts.dueToday.length > 0 && (
                <span className={`font-medium ${darkMode ? "text-amber-400" : "text-amber-600"}`}>{dueDateAlerts.dueToday.length} Due Today</span>
              )}
              {dueDateAlerts.dueThisWeek.length > 0 && (
                <span className={darkMode ? "text-slate-400" : "text-slate-600"}>{dueDateAlerts.dueThisWeek.length} Due This Week</span>
              )}
            </div>
          </div>
          <button
            onClick={() => setQuickFilter("overdue")}
            className="text-xs font-bold text-red-600 hover:underline"
          >
            View Overdue
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className={`flex p-1 rounded ${darkMode ? "bg-slate-700" : "bg-slate-200"}`}>
          <button
            onClick={() => setViewMode("Optimized")}
            className={`px-4 py-2 text-sm font-medium rounded ${viewMode === "Optimized"
              ? `${darkMode ? "bg-slate-800 text-white" : "bg-white text-slate-800"}`
              : `${darkMode ? "text-slate-400" : "text-slate-500"}`
              }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setViewMode("Raw")}
            className={`px-4 py-2 text-sm font-medium rounded ${viewMode === "Raw"
              ? `${darkMode ? "bg-slate-800 text-white" : "bg-white text-slate-800"}`
              : `${darkMode ? "text-slate-400" : "text-slate-500"}`
              }`}
          >
            Live Export Preview
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2">
          <span className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Quick:</span>
          {[
            { key: "all", label: "All", icon: Filter },
            { key: "overdue", label: "Overdue", icon: AlertCircle },
            { key: "critical", label: "Critical", icon: Flame },
            { key: "unassigned", label: "Unassigned", icon: Users },
          ].map(qf => (
            <button
              key={qf.key}
              onClick={() => setQuickFilter(qf.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium ${
                quickFilter === qf.key
                  ? `${darkMode ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"}`
                  : `${darkMode ? "bg-slate-700 text-slate-300" : "bg-white text-slate-600 border border-slate-200"}`
              }`}
            >
              <qf.icon size={12} /> {qf.label}
            </button>
          ))}
        </div>

        {/* Saved Filters */}
        <div className="flex items-center gap-2">
          {savedFilters.slice(0, 3).map(sf => (
            <button
              key={sf.id}
              onClick={() => applySavedFilter(sf)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${darkMode ? "bg-purple-900/50 text-purple-300 hover:bg-purple-800/50" : "bg-purple-50 text-purple-600 hover:bg-purple-100"}`}
            >
              <BookmarkCheck size={10} /> {sf.name}
            </button>
          ))}
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${darkMode ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            title="Save current filter"
          >
            <Bookmark size={10} /> Save Filter
          </button>
        </div>
      </div>

      {viewMode === "Raw" ? (
        <div className={`p-5 rounded-sm border shadow-sm mb-6 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-semibold text-slate-800 text-sm mb-1">
                Live Export Preview (Flat Data)
              </h2>
              <p className="text-xs text-slate-500">
                This view shows your data exactly as it will be exported to Excel based on your Custom Export column selection.
              </p>
            </div>
            <button
              onClick={mexwfExport}
              className="text-xs flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded border border-emerald-200 font-bold hover:bg-emerald-100 transition-colors"
            >
              <Wrench size={14} /> Configure Export Columns
            </button>
          </div>

          <div className="overflow-x-auto h-[600px] border border-slate-200 rounded bg-slate-50">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-200 sticky top-0 shadow-sm z-10">
                <tr>
                  {exportCols.map(col => (
                    <th key={col} className="p-3 border-r border-slate-300 font-bold text-slate-700">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {activeIssues.map((issue, idx) => {
                  const mexwf = idx;
                  return (
                    <tr key={mexwf} className="hover:bg-slate-50 transition-colors">
                      {exportCols.map(col => {
                        let fendralis = issue[col] !== undefined && issue[col] !== null ? String(issue[col]) : "";
                        if ((col === "AffectedAsset" || col === "AssetName") && fendralis) {
                          fendralis = getShortAssetName(fendralis);
                        }
                        return (
                          <td key={col} className="p-3 border-r border-slate-100 text-slate-600 min-w-[120px] whitespace-normal">
                            {fendralis}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {activeIssues.length === 0 && (
                  <tr>
                    <td colSpan={exportCols.length || 1} className="p-8 text-center text-slate-400 font-medium">
                      No data matches current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card
              title="Unique Vulnerabilities"
              val={stats?.uniqueVulns || 0}
              Icon={Shield}
              color="text-purple-600"
              bg="bg-white"
            />
            <Card
              title="Total Affected Assets"
              val={stats?.total || 0}
              Icon={Server}
              color="text-blue-600"
              bg="bg-white"
            />
            <Card
              title="Critical Risks"
              val={stats?.criticalOpen || 0}
              Icon={AlertTriangle}
              color="text-amber-600"
              bg="bg-white"
            />
            <Card
              title="SLA Breached"
              val={stats?.breached || 0}
              Icon={Flame}
              color="text-red-600"
              bg="bg-white"
            />
          </div>

          {/* SLA Compliance & Age Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* SLA Compliance Meter */}
            <div className={`p-5 rounded border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
              <h2 className={`font-semibold text-sm mb-4 flex items-center gap-2 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                <Target size={16} className="text-emerald-500" /> SLA Compliance
              </h2>
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke={darkMode ? "#374151" : "#e2e8f0"} strokeWidth="12" fill="none" />
                    <circle
                      cx="64" cy="64" r="56"
                      stroke={slaComplianceData.compliance >= 80 ? "#10b981" : slaComplianceData.compliance >= 60 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="12"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${(slaComplianceData.compliance / 100) * 351.86} 351.86`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className={`text-2xl font-bold ${slaComplianceData.compliance >= 80 ? "text-emerald-600" : slaComplianceData.compliance >= 60 ? "text-amber-600" : "text-red-600"}`}>
                      {slaComplianceData.compliance}%
                    </span>
                    <span className={`text-[10px] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Compliance</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className={`p-2 rounded ${darkMode ? "bg-slate-700" : "bg-slate-50"}`}>
                  <p className={`text-lg font-bold ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{slaComplianceData.total}</p>
                  <p className={`text-[10px] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Total Resolved</p>
                </div>
                <div className={`p-2 rounded ${darkMode ? "bg-emerald-900/30" : "bg-emerald-50"}`}>
                  <p className="text-lg font-bold text-emerald-600">{slaComplianceData.onTime}</p>
                  <p className={`text-[10px] ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>On Time</p>
                </div>
                <div className={`p-2 rounded ${darkMode ? "bg-red-900/30" : "bg-red-50"}`}>
                  <p className="text-lg font-bold text-red-600">{slaComplianceData.breached}</p>
                  <p className={`text-[10px] ${darkMode ? "text-red-400" : "text-red-600"}`}>Breached</p>
                </div>
              </div>
            </div>

            {/* Age Distribution */}
            <div className={`p-5 rounded border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
              <h2 className={`font-semibold text-sm mb-4 flex items-center gap-2 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                <Clock size={16} className="text-blue-500" /> Vulnerability Age Distribution
              </h2>
              <div className="h-48 flex items-center justify-center">
                {ageDistributionData && ageDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageDistributionData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={darkMode ? "#374151" : "#e2e8f0"} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: darkMode ? "#9ca3af" : "#64748b" }} axisLine={false} tickLine={false} />
                      <RechartsTooltip contentStyle={{ fontSize: "12px", border: "1px solid #e2e8f0", borderRadius: "4px", backgroundColor: darkMode ? "#1f2937" : "#fff" }} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                        {ageDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 3 ? "#ef4444" : index === 2 ? "#f59e0b" : "#3b82f6"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className={`text-xs uppercase font-semibold ${darkMode ? "text-slate-500" : "text-slate-400"}`}>No open vulnerabilities</p>
                )}
              </div>
            </div>
          </div>

          {/* Trend Chart - Discovered vs Resolved */}
          <div className={`p-5 rounded border mb-6 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <h2 className={`font-semibold text-sm mb-4 flex items-center gap-2 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
              <TrendingUp size={16} className="text-purple-500" /> 30-Day Trend: Discovered vs Resolved
            </h2>
            <div className="h-64 flex items-center justify-center">
              {trendData && trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ bottom: 30, right: 20, top: 10 }}>
                    <defs>
                      <linearGradient id="colorDiscovered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#374151" : "#e2e8f0"} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: darkMode ? "#9ca3af" : "#64748b" }} angle={-45} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: darkMode ? "#9ca3af" : "#64748b" }} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ fontSize: "12px", border: "1px solid #e2e8f0", borderRadius: "4px", backgroundColor: darkMode ? "#1f2937" : "#fff" }} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Area type="monotone" dataKey="discovered" name="Discovered" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDiscovered)" />
                    <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorResolved)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className={`text-xs uppercase font-semibold ${darkMode ? "text-slate-500" : "text-slate-400"}`}>No trend data available</p>
              )}
            </div>
          </div>

          {/* Risk Heatmap */}
          <div className={`p-5 rounded border mb-6 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <h2 className={`font-semibold text-sm mb-4 flex items-center gap-2 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
              <Zap size={16} className="text-amber-500" /> Risk Heatmap: Severity vs Department
            </h2>
            {riskHeatmapData.depts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className={`p-2 text-left font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Department</th>
                      {riskHeatmapData.severities.map(sev => (
                        <th key={sev} className={`p-2 text-center font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{sev}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {riskHeatmapData.depts.map(dept => (
                      <tr key={dept} className={darkMode ? "border-t border-slate-700" : "border-t border-slate-100"}>
                        <td className={`p-2 font-medium ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{dept}</td>
                        {riskHeatmapData.severities.map(sev => {
                          const count = riskHeatmapData.heatmap[dept]?.[sev] || 0;
                          const intensity = count === 0 ? "bg-slate-100" : count <= 2 ? "bg-yellow-100" : count <= 5 ? "bg-orange-200" : "bg-red-300";
                          const darkIntensity = count === 0 ? "bg-slate-700" : count <= 2 ? "bg-yellow-900/50" : count <= 5 ? "bg-orange-900/50" : "bg-red-900/50";
                          return (
                            <td key={sev} className={`p-2 text-center ${darkMode ? darkIntensity : intensity} rounded`}>
                              <span className={`font-bold ${count > 0 ? (darkMode ? "text-white" : "text-slate-800") : (darkMode ? "text-slate-500" : "text-slate-400")}`}>
                                {count}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={`text-xs text-center py-4 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>No data available for heatmap</p>
            )}
          </div>

          <div className={`p-5 rounded-sm border shadow-sm mb-6 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4 border-b pb-3" style={{ borderColor: darkMode ? "#374151" : "#f1f5f9" }}>
              <h2 className={`font-semibold text-sm flex items-center gap-2 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                <Activity size={16} className={darkMode ? "text-slate-500" : "text-slate-400"} /> Asset
                Resolution Pipeline (MTTR)
              </h2>
              <span className="text-xs font-medium text-slate-500">
                Resolution Velocity:{" "}
                <strong className="text-slate-800">
                  {stats?.total > 0 && pipeline?.resolved !== undefined
                    ? ((pipeline.resolved / stats.total) * 100).toFixed(1)
                    : 0}
                  %
                </strong>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1 w-full border border-slate-200 p-4 rounded-md flex justify-between items-center bg-slate-50">
                <p className="text-sm font-medium text-slate-600">
                  Open Assets
                </p>
                <p className="text-lg font-bold text-slate-800">
                  {pipeline?.open || 0}
                </p>
              </div>
              <ArrowRight
                className="text-slate-400 hidden sm:block"
                size={16}
              />
              <div className="flex-1 w-full border border-blue-200 p-4 rounded-md flex justify-between items-center bg-blue-50/30">
                <p className="text-sm font-medium text-blue-700">In Progress</p>
                <p className="text-lg font-bold text-blue-800">
                  {pipeline?.progress || 0}
                </p>
              </div>
              <ArrowRight
                className="text-slate-400 hidden sm:block"
                size={16}
              />
              <div className="flex-1 w-full border border-emerald-200 p-4 rounded-md flex justify-between items-center bg-emerald-50/30">
                <p className="text-sm font-medium text-emerald-700">Resolved</p>
                <p className="text-lg font-bold text-emerald-800">
                  {pipeline?.resolved || 0}
                </p>
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-sm overflow-hidden flex">
              <div
                style={{
                  width: `${stats?.total > 0 && pipeline?.open !== undefined
                    ? (pipeline.open / stats.total) * 100
                    : 0
                    }%`,
                }}
                className="bg-slate-400 h-full"
              />
              <div
                style={{
                  width: `${stats?.total > 0 && pipeline?.progress !== undefined
                    ? (pipeline.progress / stats.total) * 100
                    : 0
                    }%`,
                }}
                className="bg-blue-500 h-full"
              />
              <div
                style={{
                  width: `${stats?.total > 0 && pipeline?.resolved !== undefined
                    ? (pipeline.resolved / stats.total) * 100
                    : 0
                    }%`,
                }}
                className="bg-emerald-500 h-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className={`p-5 rounded border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
              <h2 className={`font-semibold text-sm mb-4 border-b pb-2 ${darkMode ? "text-slate-200 border-slate-700" : "text-slate-800 border-slate-100"}`}>
                Asset Category Distribution
              </h2>
              <div className="h-64 flex items-center justify-center">
                {stats?.total > 0 && pieChartData && pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || "#000"}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          fontSize: "12px",
                          border: "1px solid #e2e8f0",
                          borderRadius: "4px",
                        }}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: "12px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 text-xs uppercase font-semibold">
                    No active data
                  </p>
                )}
              </div>
            </div>
            <div className={`lg:col-span-2 p-5 rounded border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
              <h2 className={`font-semibold text-sm mb-4 border-b pb-2 ${darkMode ? "text-slate-200 border-slate-700" : "text-slate-800 border-slate-100"}`}>
                Vulnerability Types
              </h2>
              <div className="h-64 flex items-center justify-center">
                {typeChartData && typeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={typeChartData}
                      margin={{ left: 10, right: 20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={true}
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={150}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip
                        cursor={{ fill: "#f1f5f9" }}
                        contentStyle={{
                          fontSize: "12px",
                          border: "1px solid #e2e8f0",
                          borderRadius: "4px",
                        }}
                      />
                      <Bar
                        dataKey="Issues"
                        fill="#3b82f6"
                        radius={[0, 2, 2, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 text-xs uppercase font-semibold">
                    No active data
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm mb-6">
            <h2 className="font-semibold text-slate-800 text-sm mb-4 border-b border-slate-100 pb-2">
              Discovery Timeline
            </h2>
            <div className="h-64 flex items-center justify-center">
              {timelineChartData && timelineChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={timelineChartData}
                    margin={{ bottom: 30, right: 20, top: 10 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorIssues"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#ef4444"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#ef4444"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      angle={-45}
                      textAnchor="end"
                      height={50}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip content={<CustomTimelineTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="Issues"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorIssues)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400 text-xs uppercase font-semibold">
                  No active data
                </p>
              )}
            </div>
          </div>

          <div className={`p-5 rounded border mb-6 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <h2 className={`font-semibold text-sm mb-4 border-b pb-2 ${darkMode ? "text-slate-200 border-slate-700" : "text-slate-800 border-slate-100"}`}>
              Workload & Risk Distribution by Assigned Owner
            </h2>
            <div className="h-72 flex items-center justify-center">
              {ownerChartData && ownerChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ownerChartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      cursor={{ fill: "#f1f5f9" }}
                      contentStyle={{
                        fontSize: "12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "4px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="Critical" stackId="a" fill="#ef4444" barSize={30} />
                    <Bar dataKey="Medium" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="Solved" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400 text-xs uppercase font-semibold">
                  No active data
                </p>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="text-slate-500" size={18} />
                <h2 className="font-semibold text-slate-800 text-sm">
                  Department Asset Accountability
                </h2>
              </div>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-sm text-sm font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-700 min-w-[200px]"
              >
                <option value="All">All Departments</option>
                {uniqueDepartments &&
                  uniqueDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-sm border border-slate-200 flex justify-between items-center">
                  <p className="text-xs font-semibold text-slate-600 uppercase">
                    Total Assets Assigned
                  </p>
                  <p className="text-xl font-bold text-slate-800">
                    {deptStats?.total || 0}
                  </p>
                </div>
                <div className="p-4 bg-red-50/50 rounded-sm border border-red-100 flex justify-between items-center">
                  <p className="text-xs font-semibold text-red-700 uppercase">
                    Critical Asset Risks
                  </p>
                  <p className="text-xl font-bold text-red-700">
                    {deptStats?.criticalOpen || 0}
                  </p>
                </div>
              </div>
              <div className="md:col-span-2 h-48 flex items-center justify-center">
                {deptStats?.total > 0 &&
                  deptPieData &&
                  deptPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deptPieData}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {deptPieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || "#000"}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          fontSize: "12px",
                          border: "1px solid #e2e8f0",
                          borderRadius: "4px",
                        }}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: "12px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 text-sm">
                    No metrics for this department
                  </p>
                )}
              </div>
            </div>
          </div>

          <SecurityAgent contextData={displayedIssues} />

          <div className={`rounded border overflow-hidden z-30 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className={`p-4 border-b flex flex-col xl:flex-row xl:items-center justify-between gap-4 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
              <div className="flex items-center gap-4 flex-1">
                <div className={`flex items-center gap-2 font-semibold text-sm border-r pr-4 ${darkMode ? "text-slate-200 border-slate-600" : "text-slate-800 border-slate-300"}`}>
                  <Filter size={14} className="text-slate-500" />
                  Vulnerability Groups
                </div>
                <input
                  type="text"
                  placeholder="Search CVE, Remediation, Category..."
                  className={`px-3 py-1.5 rounded border text-sm focus:border-blue-500 outline-none w-full max-w-sm ${darkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-slate-300"}`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                {/* UI TABLE COLUMN SELECTOR */}
                <div className="relative" ref={tableColDropdownRef}>
                  <button
                    onClick={() => setIsTableColDropdownOpen(!isTableColDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-sm text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm ml-2"
                  >
                    <Layers size={14} className="text-purple-600" />
                    <span>View Columns ({tableCols.length})</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${isTableColDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isTableColDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 shadow-xl rounded-md z-[9999] overflow-hidden">
                      <div className="p-2 border-b border-slate-100 bg-slate-50 flex justify-between gap-2">
                        <button
                          onClick={() => setTableCols(tableAvailableCols)}
                          className="text-[10px] uppercase font-bold text-purple-600 hover:text-purple-800 px-2 py-1"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => setTableCols(defaultTableCols)}
                          className="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-800 px-2 py-1"
                        >
                          Default
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto py-1 p-2 grid grid-cols-1 gap-1">
                        {tableAvailableCols.map((col) => (
                          <label
                            key={col}
                            className="flex items-center gap-3 px-2 py-1.5 hover:bg-purple-50 cursor-pointer rounded transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={tableCols.includes(col)}
                              onChange={() => {
                                setTableCols((prev) =>
                                  prev.includes(col)
                                    ? prev.filter((c) => c !== col)
                                    : [...prev, col]
                                );
                              }}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                            />
                            <span className="text-xs font-semibold text-slate-700 truncate">
                              {colHeaderMap[col] || col}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsBatchDropdownOpen(!isBatchDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-sm text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    <Layers size={14} className="text-blue-600" />
                    <span>Datasets ({selectedBatches?.length || 0})</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${isBatchDropdownOpen ? "rotate-180" : ""
                        }`}
                    />
                  </button>

                  {isBatchDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 shadow-xl rounded-md z-[9999] overflow-hidden">
                      <div className="p-2 border-b border-slate-100 bg-slate-50 flex justify-between gap-2">
                        <button
                          onClick={() => setSelectedBatches(batches)}
                          className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-800 px-2 py-1"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() =>
                            batches &&
                            batches.length > 0 &&
                            setSelectedBatches([batches[0]])
                          }
                          className="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-800 px-2 py-1"
                        >
                          Latest Only
                        </button>
                      </div>
                      <div className="max-h-60 overflow-y-auto py-1">
                        {batches &&
                          batches.map((batch) => (
                            <div
                              key={batch}
                              onClick={() => toggleBatch(batch)}
                              className="flex items-center gap-3 px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                            >
                              {selectedBatches.includes(batch) ? (
                                <CheckSquare
                                  size={16}
                                  className="text-blue-600"
                                />
                              ) : (
                                <Square size={16} className="text-slate-300" />
                              )}
                              <span
                                className={`text-xs ${selectedBatches.includes(batch)
                                  ? "font-bold text-slate-900"
                                  : "text-slate-600"
                                  }`}
                              >
                                {batch}
                              </span>
                            </div>
                          ))}
                      </div>
                      {userRole === "Admin" && (
                        <div className="p-2 bg-slate-50 border-t border-slate-100">
                          <button
                            onClick={handleDeleteSelectedBatches}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded text-[10px] font-bold uppercase hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={12} /> Delete Selected
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex rounded-sm border border-slate-300 bg-white">
                  <button
                    onClick={() => setFilter("All")}
                    className={`px-4 py-1.5 text-xs font-medium transition-colors ${filter === "All"
                      ? "bg-slate-200 text-slate-800"
                      : "text-slate-600 hover:bg-slate-100"
                      }`}
                  >
                    All
                  </button>
                  <div className="w-[1px] bg-slate-300"></div>
                  <button
                    onClick={() => setFilter("Critical")}
                    className={`px-4 py-1.5 text-xs font-medium transition-colors ${filter === "Critical"
                      ? "bg-red-100 text-red-800"
                      : "text-slate-600 hover:bg-slate-100"
                      }`}
                  >
                    Critical
                  </button>
                </div>

                {userRole === "Admin" && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-blue-600 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <Upload size={14} /> Upload Dataset
                    </button>
                  </>
                )}

                {userRole === "Admin" && (
                  <button
                    onClick={() => setIsAiModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-purple-600 text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                  >
                    <Bot size={14} /> Send Mail
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={mexwfExport}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-emerald-600 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <Download size={14} /> Custom Export
                  </button>

                  <button
                    onClick={exportToPDF}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-red-600 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                  >
                    <FileText size={14} /> PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="w-12 px-4 py-3 border-r border-slate-200"></th>
                    {tableCols.map(col => (
                      <th key={col} className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">
                        {colHeaderMap[col] || col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {groupedIssues &&
                    groupedIssues.map((group) => {
                      const breached = checkBreach(group.DueDate, group.Status);
                      const resolved = isResolved(group.Status);
                      const rowKey = group.DisplayID;
                      const isExpanded = expandedRow === rowKey;

                      const rawIssue = activeIssues.find(i => i.DisplayID === group.DisplayID);

                      return (
                        <React.Fragment key={rowKey}>
                          <tr
                            className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${breached && !resolved ? "bg-red-50/10" : ""
                              }`}
                            onClick={() =>
                              setExpandedRow(isExpanded ? null : rowKey)
                            }
                          >
                            <td className="px-4 py-3 border-r border-slate-200 bg-slate-50/50 text-center">
                              <div className="text-slate-400">
                                {isExpanded ? (
                                  <ChevronUp
                                    size={16}
                                    className="mx-auto text-blue-600"
                                  />
                                ) : (
                                  <ChevronDown size={16} className="mx-auto" />
                                )}
                              </div>
                            </td>

                            {tableCols.map(col => {
                              if (col === "DisplayID") {
                                return <td key={col} className={`px-4 py-3 border-r border-slate-200 bg-slate-50/50 font-bold text-sm text-blue-900 ${breached && !resolved ? "border-l-4 border-l-red-500" : ""}`}>{group.DisplayID}</td>;
                              }
                              if (col === "Category") {
                                return <td key={col} className="px-4 py-3 text-xs font-medium text-slate-600">{group.Category}</td>;
                              }
                              if (col === "Severity") {
                                return <td key={col} className="px-4 py-3"><span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold border ${group.Severity === "Critical" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{group.Severity}</span></td>;
                              }
                              if (col === "Status") {
                                return <td key={col} className="px-4 py-3"><span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${resolved ? "bg-emerald-50 text-emerald-700" : group.Status === "Open" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>{group.Status}</span></td>;
                              }
                              if (col === "RecommendedAction") {
                                return <td key={col} className="px-4 py-3 text-xs text-slate-600 min-w-[200px] whitespace-normal">{group.Remediation}</td>;
                              }
                              if (col === "Impact") {
                                return <td key={col} className="px-4 py-3"><div className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-sm border border-red-100 inline-block">{group.Assets?.length || 0} Assets</div></td>;
                              }
                              if (col === "DueDate") {
                                return <td key={col} className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">{group.DueDate} {breached && !resolved && <Flame size={12} className="inline text-red-500 ml-1" />}</td>;
                              }

                              if (col === "AffectedAsset" || col === "AssetName") {
                                const assetVal = rawIssue && rawIssue[col] ? String(rawIssue[col]) : "—";
                                return (
                                  <td key={col} className="px-4 py-3 text-xs text-slate-600 min-w-[150px]">
                                    <AssetNameCell fullName={assetVal} />
                                  </td>
                                );
                              }

                              const val = rawIssue && rawIssue[col] !== undefined && rawIssue[col] !== null ? rawIssue[col] : "—";
                              return (
                                <td key={col} className="px-4 py-3 text-xs text-slate-600 min-w-[120px] whitespace-normal">
                                  {String(val)}
                                </td>
                              );
                            })}
                          </tr>

                          {isExpanded && (
                            <tr className="bg-slate-50 border-b border-slate-200 shadow-inner">
                              <td colSpan={tableCols.length + 1} className="p-6">
                                <div className="bg-white p-6 rounded-sm border border-blue-200 shadow-sm grid grid-cols-2 gap-8">
                                  <div>
                                    <h4 className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-900 mb-3">
                                      <FileText size={14} /> Vulnerability
                                      Description
                                    </h4>
                                    <p className="text-sm leading-relaxed text-slate-700 bg-slate-50 p-3 border rounded-sm whitespace-pre-wrap">
                                      {group.Description}
                                    </p>

                                    <h4 className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-900 mt-6 mb-3">
                                      <Wrench size={14} /> Global Remediation
                                      Action
                                    </h4>
                                    <p className="text-sm italic text-slate-700 border-l-4 border-emerald-400 pl-4">
                                      {group.Remediation}
                                    </p>
                                  </div>
                                  <div>
                                    <div className="flex flex-col h-full">
                                      <h4 className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 mb-3 border-b border-slate-200 pb-2">
                                        <Server size={14} /> Affected Assets
                                        Breakdown
                                      </h4>
                                      <div className="flex-1 max-h-60 overflow-y-auto border border-slate-200 rounded-sm">
                                        <table className="w-full text-left text-xs">
                                          <thead className="bg-slate-100 sticky top-0 shadow-sm">
                                            <tr>
                                              <th className="p-2 font-semibold text-slate-600">
                                                Asset Instance
                                              </th>
                                              <th className="p-2 font-semibold text-slate-600">
                                                Assigned Team
                                              </th>
                                              <th className="p-2 font-semibold text-slate-600">
                                                Status
                                              </th>
                                              <th className="p-2 font-semibold text-slate-600">
                                                Tracking ID
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 bg-white">
                                            {group.Assets &&
                                              group.Assets.map((asset, idx) => (
                                                <tr
                                                  key={idx}
                                                  className="hover:bg-slate-50"
                                                >
                                                  <td className="p-2 text-xs font-mono text-slate-700 break-all">
                                                    {asset.AssetName}
                                                  </td>
                                                  <td className="p-2 text-slate-600 font-semibold">
                                                    {asset.AssignedTo}
                                                  </td>
                                                  <td className="p-2 text-[10px]">
                                                    {asset.Status}
                                                  </td>
                                                  <td
                                                    className="p-2 text-slate-400 font-mono whitespace-normal"
                                                  >
                                                    {asset.IssueID}
                                                  </td>
                                                </tr>
                                              ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Notes & Activity Section */}
                                  <div className="col-span-2 mt-2 pt-4 border-t border-blue-100">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-900">
                                        <MessageSquare size={14} /> Notes & Activity
                                      </h4>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setActiveNoteVuln(group.DisplayID); }}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-sm text-xs font-bold transition-colors"
                                      >
                                        <Plus size={12} /> Add Note
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {/* Notes */}
                                      <div className="bg-slate-50 border border-slate-200 rounded-sm p-3">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Notes ({vulnNotes[group.DisplayID]?.length || 0})</p>
                                        {vulnNotes[group.DisplayID]?.length > 0 ? (
                                          <div className="space-y-2 max-h-24 overflow-y-auto">
                                            {vulnNotes[group.DisplayID].slice(-3).map(note => (
                                              <div key={note.id} className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-100">
                                                <p className="line-clamp-2">{note.text}</p>
                                                <p className="text-[10px] text-slate-400 mt-1">{note.author} - {new Date(note.timestamp).toLocaleDateString()}</p>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-slate-400 italic">No notes yet</p>
                                        )}
                                      </div>
                                      {/* Activity Log */}
                                      <div className="bg-slate-50 border border-slate-200 rounded-sm p-3">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Recent Activity</p>
                                        {activityLogs.filter(l => l.vulnId === group.DisplayID).length > 0 ? (
                                          <div className="space-y-2 max-h-24 overflow-y-auto">
                                            {activityLogs.filter(l => l.vulnId === group.DisplayID).slice(0, 3).map(log => (
                                              <div key={log.id} className="text-xs text-slate-600 flex items-start gap-2">
                                                <History size={10} className="text-slate-400 mt-0.5 shrink-0" />
                                                <div>
                                                  <span className="font-semibold">{log.action}</span>: {log.details}
                                                  <p className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</p>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-slate-400 italic">No activity recorded</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="col-span-2 mt-2 pt-4 border-t border-blue-100">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="flex items-center gap-2 text-[10px] font-black uppercase text-purple-900">
                                        <Bot size={14} /> AI Remediation
                                        Assistant
                                      </h4>
                                      <button
                                        onClick={() => handleAiAnalysis(group)}
                                        disabled={
                                          isAnalyzing === group.DisplayID
                                        }
                                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-sm text-xs font-bold transition-colors disabled:opacity-50"
                                      >
                                        {isAnalyzing === group.DisplayID ? (
                                          <Activity
                                            size={12}
                                            className="animate-spin"
                                          />
                                        ) : (
                                          <Bot size={12} />
                                        )}
                                        {isAnalyzing === group.DisplayID
                                          ? "Analyzing Threat..."
                                          : "Generate Auto-Fix"}
                                      </button>
                                    </div>
                                    {aiRemediation[group.DisplayID] ? (
                                      <div className="bg-slate-900 text-slate-50 p-4 rounded-sm text-xs whitespace-pre-wrap font-mono leading-relaxed border border-purple-500 shadow-sm">
                                        {aiRemediation[group.DisplayID]}
                                      </div>
                                    ) : (
                                      <div className="bg-slate-50 border border-slate-200 border-dashed p-4 rounded-sm text-xs text-slate-400 text-center font-medium">
                                        Click "Generate Auto-Fix" to securely
                                        analyze this vulnerability and generate
                                        a patch code snippet via Gemini.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-purple-400" />
                <h3 className="font-bold text-sm">Generate Email via AI</h3>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleAiEmailSubmit}
              className="p-6 flex flex-col gap-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="team.lead@company.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                  value={aiRecipient}
                  onChange={(e) => setAiRecipient(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Instructions for AI
                </label>
                <textarea
                  required
                  placeholder="e.g., Please review the attached PDF and patch the critical compliance risks by Friday."
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm min-h-[100px] resize-none"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 mt-2 font-medium flex items-start gap-1.5">
                  <Download size={12} className="shrink-0 mt-0.5" />
                  <span>
                    The AI will append an issue count summary and download a PDF
                    containing all currently visible open issues.
                  </span>
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-3 mt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700 transition-colors disabled:bg-purple-400"
                >
                  {isGenerating ? (
                    <Activity size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  {isGenerating ? "Generating..." : "Generate PDF & Open Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <FileUp size={18} className="text-blue-200" />
                <h3 className="font-bold text-sm">Upload Dataset</h3>
              </div>
              <button
                onClick={() => {
                  if (!isProcessing) {
                    setIsUploadModalOpen(false);
                    setAvailableSheets([]);
                    setSelectedSheet("");
                    setIsSheetSelectMode(false);
                  }
                }}
                className="text-blue-200 hover:text-white transition-colors disabled:opacity-50"
                disabled={isProcessing}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={processAndUploadFile}
              className="p-6 flex flex-col gap-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Selected File
                </label>
                <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600 font-medium truncate">
                  {selectedFile?.name || "No file selected"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Dataset Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., May 2026 Audit"
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm mb-2"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  disabled={isProcessing}
                />

                {isSheetSelectMode && availableSheets.length > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
                    <label className="block text-xs font-bold text-amber-700 uppercase mb-2">
                      Select Worksheet
                    </label>
                    <p className="text-xs text-amber-600 mb-2">
                      Multiple worksheets detected. Please select the one containing vulnerability data:
                    </p>
                    <select
                      value={selectedSheet}
                      onChange={(e) => setSelectedSheet(e.target.value)}
                      disabled={isProcessing}
                      className="w-full px-3 py-2 border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-white"
                    >
                      {availableSheets.map((sheet) => (
                        <option key={sheet} value={sheet}>
                          {sheet}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={saveToDevice}
                    onChange={(e) => setSaveToDevice(e.target.checked)}
                    disabled={isProcessing}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm text-slate-600 font-medium">
                    Save a processed copy to this device
                  </span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-3 mt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setAvailableSheets([]);
                    setSelectedSheet("");
                    setIsSheetSelectMode(false);
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-colors disabled:bg-blue-400 min-w-[120px] justify-center"
                >
                  {isProcessing ? (
                    <Activity size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  {isProcessing
                    ? uploadProgress || "Processing..."
                    : isSheetSelectMode ? "Upload Selected Sheet" : "Confirm Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
            <div className="bg-emerald-600 p-4 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2">
                <Download size={18} />
                <h3 className="font-bold text-sm uppercase">Dynamic Dataset Export</h3>
              </div>
              <button onClick={() => setIsExportModalOpen(false)} className="hover:text-emerald-200">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="w-1/2 flex flex-col border-r border-slate-200 bg-slate-50">
                <div className="p-4 border-b border-slate-200 shrink-0">
                  <div className="flex items-center bg-white border border-slate-300 rounded px-2 py-1.5 mb-3">
                    <Search size={14} className="text-slate-400 mr-2" />
                    <input
                      type="text"
                      placeholder="Search columns..."
                      className="bg-transparent border-none outline-none text-sm w-full"
                      value={searchExportCol}
                      onChange={e => setSearchExportCol(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 text-[10px] font-bold text-slate-500 uppercase">
                    <button onClick={() => setExportCols(allDetectedCols)} className="hover:text-emerald-600 transition-colors">Select All</button>
                    <span>|</span>
                    <button onClick={() => setExportCols([])} className="hover:text-red-600 transition-colors">Deselect All</button>
                    <span>|</span>
                    <button onClick={() => { sessionStorage.removeItem("xtelify_export_cols"); setExportCols(allDetectedCols); }} className="hover:text-blue-600 transition-colors">Reset Default</button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3 border-b border-slate-200 pb-1">Original Uploaded Columns</h4>
                    <div className="space-y-1">
                      {allDetectedCols.filter(c => !aiColSet.has(c) && c.toLowerCase().includes(searchExportCol.toLowerCase())).map(col => (
                        <label key={col} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-200/50 p-1.5 rounded transition-colors">
                          <input type="checkbox" checked={exportCols.includes(col)} onChange={() => handleExportColToggle(col)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5" />
                          <span className="truncate">{col}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-purple-400 uppercase mb-3 border-b border-slate-200 pb-1">AI-Generated Columns</h4>
                    <div className="space-y-1">
                      {allDetectedCols.filter(c => aiColSet.has(c) && c.toLowerCase().includes(searchExportCol.toLowerCase())).map(col => (
                        <label key={col} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-purple-50 p-1.5 rounded transition-colors">
                          <input type="checkbox" checked={exportCols.includes(col)} onChange={() => handleExportColToggle(col)} className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5" />
                          <span className="truncate">{col}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-1/2 flex flex-col bg-white">
                <div className="p-4 border-b border-slate-200 shrink-0 bg-slate-50">
                  <h4 className="text-sm font-bold text-slate-800">Columns to Export ({exportCols.length})</h4>
                  <p className="text-xs text-slate-500 mt-1">Drag and drop to reorder the exact layout of your Excel file.</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                  {exportCols.map((col, idx) => (
                    <div
                      key={col}
                      draggable
                      onDragStart={(e) => handleDragStartExport(e, idx)}
                      onDragEnter={(e) => handleDragEnterExport(e, idx)}
                      onDragEnd={handleDragEndExport}
                      onDragOver={(e) => e.preventDefault()}
                      className={`flex items-center justify-between p-2 rounded border bg-white shadow-sm cursor-grab active:cursor-grabbing transition-opacity ${draggedExportIdx === idx ? 'opacity-40 border-emerald-500 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <GripVertical size={14} className="text-slate-400 shrink-0" />
                        <span className={`text-xs truncate font-bold ${aiColSet.has(col) ? 'text-purple-700' : 'text-slate-700'}`}>{col}</span>
                      </div>
                      <button onClick={() => handleExportColToggle(col)} className="text-slate-400 hover:text-red-500 shrink-0 p-1 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {exportCols.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                      <Filter size={32} className="opacity-20" />
                      <p className="text-sm font-medium">No columns selected</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">File Name:</span>
                <input
                  type="text"
                  value={exportFileName}
                  onChange={e => setExportFileName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-bold text-slate-700 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsExportModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors">Cancel</button>
                <button onClick={doDynamicExport} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={exportCols.length === 0}>
                  <Download size={14} /> Export Dataset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className={`rounded-lg shadow-2xl w-full max-w-md overflow-hidden ${darkMode ? "bg-slate-800" : "bg-white"}`}>
            <div className="bg-purple-600 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <Bookmark size={18} />
                <h3 className="font-bold text-sm">Save Current Filter</h3>
              </div>
              <button onClick={() => setIsFilterModalOpen(false)} className="text-purple-200 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className={`block text-xs font-bold uppercase mb-1 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Filter Name
                </label>
                <input
                  type="text"
                  value={newFilterName}
                  onChange={(e) => setNewFilterName(e.target.value)}
                  placeholder="e.g., Critical Overdue"
                  className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm ${darkMode ? "bg-slate-700 border-slate-600 text-white" : "border-slate-300"}`}
                />
              </div>
              <div className={`p-3 rounded text-xs mb-4 ${darkMode ? "bg-slate-700" : "bg-slate-50"}`}>
                <p className={`font-semibold mb-1 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>Current Filter Settings:</p>
                <p className={darkMode ? "text-slate-400" : "text-slate-500"}>Severity: {filter}</p>
                <p className={darkMode ? "text-slate-400" : "text-slate-500"}>Search: {searchTerm || "(none)"}</p>
                <p className={darkMode ? "text-slate-400" : "text-slate-500"}>Department: {selectedDepartment}</p>
              </div>
              {savedFilters.length > 0 && (
                <div className="mb-4">
                  <p className={`text-xs font-bold uppercase mb-2 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Saved Filters:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {savedFilters.map(sf => (
                      <div key={sf.id} className={`flex items-center justify-between p-2 rounded ${darkMode ? "bg-slate-700" : "bg-slate-100"}`}>
                        <span className={`text-xs font-medium ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{sf.name}</span>
                        <button onClick={() => deleteSavedFilter(sf.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsFilterModalOpen(false)} className={`px-4 py-2 text-xs font-bold ${darkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"}`}>
                  Cancel
                </button>
                <button onClick={saveCurrentFilter} disabled={!newFilterName.trim()} className="px-4 py-2 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700 disabled:opacity-50">
                  Save Filter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Timeline Modal - trigger from expanded row */}
      {activeNoteVuln && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className={`rounded-lg shadow-2xl w-full max-w-lg overflow-hidden ${darkMode ? "bg-slate-800" : "bg-white"}`}>
            <div className={`p-4 flex justify-between items-center ${darkMode ? "bg-slate-700" : "bg-slate-100"}`}>
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className={darkMode ? "text-purple-400" : "text-purple-600"} />
                <h3 className={`font-bold text-sm ${darkMode ? "text-white" : "text-slate-800"}`}>Notes for {activeNoteVuln}</h3>
              </div>
              <button onClick={() => setActiveNoteVuln(null)} className={darkMode ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-600"}>
                <X size={18} />
              </button>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto space-y-2">
              {(vulnNotes[activeNoteVuln] || []).map(note => (
                <div key={note.id} className={`p-3 rounded ${darkMode ? "bg-slate-700" : "bg-slate-50"}`}>
                  <p className={`text-xs ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{note.text}</p>
                  <p className={`text-[10px] mt-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                    {note.author} - {new Date(note.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
              {(!vulnNotes[activeNoteVuln] || vulnNotes[activeNoteVuln].length === 0) && (
                <p className={`text-xs text-center py-4 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>No notes yet</p>
              )}
            </div>
            <div className={`p-4 border-t ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Add a note..."
                  className={`flex-1 px-3 py-2 border rounded text-sm ${darkMode ? "bg-slate-700 border-slate-600 text-white" : "border-slate-300"}`}
                />
                <button
                  onClick={() => addNoteToVuln(activeNoteVuln)}
                  disabled={!newNoteText.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isChatOpen && (
        <div className="fixed bottom-20 right-6 w-80 lg:w-96 bg-white rounded-lg shadow-2xl border border-slate-200 flex flex-col z-[9999] overflow-hidden">
          <div className="bg-slate-800 p-3 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-purple-400" />
              <span className="font-bold text-sm">Security Assistant</span>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="text-slate-300 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto min-h-[300px] max-h-[400px] bg-slate-50 flex flex-col gap-3">
            {chatMessages &&
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                >
                  <div
                    className={`px-3 py-2 rounded-lg max-w-[85%] text-sm ${msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-slate-200 text-slate-700"
                      }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-400 text-xs flex gap-1 items-center">
                  <Activity size={12} className="animate-spin" /> Thinking...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form
            onSubmit={handleChatSubmit}
            className="p-3 bg-white border-t border-slate-100 flex gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about threats..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-sm focus:ring-1 focus:ring-purple-500 outline-none text-sm"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isChatLoading}
              className="bg-purple-600 text-white px-3 py-2 rounded-sm disabled:opacity-50"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 bg-slate-800 text-white p-4 rounded-full shadow-xl hover:bg-slate-700 z-[9999]"
        >
          <MessageSquare size={24} className="text-purple-400" />
        </button>
      )}
    </div>
  );
};

const Card: React.FC<CardProps> = ({ title, val, Icon, color, bg }) => (
  <div className={`${bg} p-5 rounded border border-slate-200 flex items-center justify-between`}>
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase mb-1">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{val}</p>
    </div>
    <div className={`p-2 rounded ${color}`}>
      <Icon size={20} />
    </div>
  </div>
);

const SecurityAgent: React.FC<SecurityAgentProps> = ({ contextData = [] }) => {
  const [query, setQuery] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const askAgent = async () => {
    if (!query) return;
    setLoading(true);
    setResponse("");

    try {
      const sanitizedContext = (contextData || [])
        .map((i) => ({
          ID: i.DisplayID,
          Severity: i.Severity,
          Status: i.Status,
          Category: i.Category,
          Description: i.Description,
        }))
        .slice(0, 15);

      const fendralis = JSON.stringify({
        message: query,
        history: [],
        context: sanitizedContext,
      });

      const res = await fetch(`${BACKEND_URL}/api/ask-agent`, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: fendralis,
      });

      const data = await res.json();
      const mexwf = data.reply;
      setResponse(mexwf);
    } catch (error) {
      setResponse(
        "Error connecting to the AI agent. Please check the backend connection."
      );
    }

    setLoading(false);
  };

  return (
    <div className="p-5 w-full mb-6 bg-slate-800 rounded border border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <Bot size={18} className="text-slate-400" />
        <h3 className="text-sm font-semibold text-white">Ask AI</h3>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 p-2 bg-slate-900 border border-slate-600 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && askAgent()}
          placeholder="Ask about vulnerabilities..."
        />
        <button
          onClick={askAgent}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:bg-slate-600"
        >
          {loading ? "..." : "Ask"}
        </button>
      </div>
      {response && (
        <div className="p-3 bg-slate-900 border border-slate-700 rounded mt-3 text-sm text-slate-300">
          {response}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

export default App;