import React, { useState, useEffect, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
// @ts-ignore
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
  Terminal,
  Server,
  Wrench,
  Link as LinkIcon,
  CheckSquare,
  Square,
  Layers,
  Search,
  Users,
  Bot,
  X,
  Send,
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

const CustomTimelineTooltip = ({ active, payload, label }: any) => {
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

const App = () => {
  const [allIssues, setAllIssues] = useState<any[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiRecipient, setAiRecipient] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // --- NEW: RBAC State ---
  const [userRole, setUserRole] = useState("Admin");

  // --- UPDATED: Using the .env variable instead of the hardcoded string ---
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        let rawArray: any[] = [];

        if (Array.isArray(data)) {
          rawArray = data;
        } else if (data && typeof data.body === "string") {
          try {
            rawArray = JSON.parse(data.body);
          } catch (e) {}
        } else if (data && Array.isArray(data.body)) {
          rawArray = data.body;
        } else if (typeof data === "string") {
          try {
            rawArray = JSON.parse(data);
          } catch (e) {}
        }

        if (Array.isArray(rawArray) && rawArray.length > 0) {
          const safeData = rawArray.map((item) => {
            let finalDept = String(item?.Department ?? "NA");
            let finalAssigned = String(item?.AssignedTo ?? "NA");
            const oldOwner = String(item?.Owner ?? "");

            if (
              (finalDept === "NA" || finalDept === "undefined") &&
              (finalAssigned === "NA" || finalAssigned === "undefined") &&
              oldOwner !== "" &&
              oldOwner !== "NA" &&
              oldOwner !== "undefined"
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
                item?.RecommendedAction ?? "No remediation steps provided.",
              ),
              ReferenceLinks: String(item?.ReferenceLinks ?? "NA"),
            };
          });

          const sortedData = safeData.sort((a, b) => {
            return a.DisplayID.localeCompare(b.DisplayID, undefined, {
              numeric: true,
              sensitivity: "base",
            });
          });

          const uniqueBatches = Array.from(
            new Set(
              sortedData.map((i) => i.UploadBatch).filter((b) => b !== "NA"),
            ),
          )
            .sort()
            .reverse();

          setBatches(uniqueBatches);
          setAllIssues(sortedData);

          if (uniqueBatches.length > 0) setSelectedBatches(uniqueBatches);
        } else {
          setAllIssues([]);
        }
      })
      .catch((err) => console.error("API Fetch Error:", err));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsBatchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeIssues = allIssues.filter((i) =>
    selectedBatches.includes(i.UploadBatch),
  );

  const toggleBatch = (batch: string) => {
    setSelectedBatches((prev) =>
      prev.includes(batch) ? prev.filter((b) => b !== batch) : [...prev, batch],
    );
  };

  const isResolved = (status: string) => {
    const s = String(status || "").toLowerCase();
    return (
      s.includes("resolved") ||
      s.includes("closed") ||
      s.includes("fixed") ||
      s.includes("mitigated") ||
      s.includes("accepted") ||
      s.includes("false positive")
    );
  };

  const isInProgress = (status: string) => {
    const s = String(status || "").toLowerCase();
    return (
      s.includes("progress") || s.includes("pending") || s.includes("review")
    );
  };

  const filteredBySeverity =
    filter === "All"
      ? activeIssues
      : activeIssues.filter((issue) => issue.Severity === filter);

  const displayedIssues = filteredBySeverity.filter((issue) => {
    const s = String(searchTerm || "")
      .toLowerCase()
      .trim();
    if (!s) return true;

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

  const rowSpanMap: Record<string, number> = {};
  displayedIssues.forEach((issue) => {
    rowSpanMap[issue.DisplayID] = (rowSpanMap[issue.DisplayID] || 0) + 1;
  });

  const activeSpanMap: Record<string, number> = { ...rowSpanMap };
  displayedIssues.forEach((issue) => {
    if (expandedRow === issue.IssueID) {
      activeSpanMap[issue.DisplayID] += 1;
    }
  });

  const renderedIdHeads = new Set();

  const checkBreach = (issue: any) => {
    if (!issue.DueDate || issue.DueDate === "NA" || isResolved(issue.Status))
      return false;
    const dueDate = new Date(issue.DueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !isNaN(dueDate.getTime()) && dueDate < today;
  };

  const pipeline = {
    open: displayedIssues.filter(
      (i) => !isResolved(i.Status) && !isInProgress(i.Status),
    ).length,
    progress: displayedIssues.filter((i) => isInProgress(i.Status)).length,
    resolved: displayedIssues.filter((i) => isResolved(i.Status)).length,
  };

  const stats = {
    total: displayedIssues.length,
    criticalOpen: displayedIssues.filter(
      (i) => i.Severity === "Critical" && !isResolved(i.Status),
    ).length,
    breached: displayedIssues.filter(checkBreach).length,
  };

  const typeMap: Record<string, number> = {};
  displayedIssues.forEach((issue) => {
    const cat =
      issue.Category && issue.Category !== "Uncategorized"
        ? String(issue.Category)
        : "Other";
    typeMap[cat] = (typeMap[cat] || 0) + 1;
  });

  const typeChartData = Object.keys(typeMap)
    .map((type) => ({ name: type, Issues: typeMap[type] }))
    .sort((a, b) => b.Issues - a.Issues)
    .slice(0, 6);

  const timelineMap: Record<string, any> = {};
  displayedIssues.forEach((issue) => {
    const rawDate = String(issue.DiscoveredDate || "").trim();
    if (rawDate && rawDate !== "NA") {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (!timelineMap[dateStr]) timelineMap[dateStr] = { count: 0, ids: [] };
        timelineMap[dateStr].count += 1;
        timelineMap[dateStr].ids.push(issue.DisplayID);
      }
    }
  });

  const timelineChartData = Object.keys(timelineMap)
    .sort()
    .map((date) => ({
      date: date,
      Issues: timelineMap[date].count,
      Vulnerabilities: timelineMap[date].ids.join(", "),
    }));

  const pieChartData = [
    { name: "Resolved", value: pipeline.resolved, color: "#10b981" },
    { name: "In Progress", value: pipeline.progress, color: "#3b82f6" },
    { name: "Open", value: pipeline.open, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const topRemediations = useMemo(() => {
    const actionMap: Record<string, number> = {};
    displayedIssues
      .filter((i) => !isResolved(i.Status))
      .forEach((issue) => {
        const action = issue.RecommendedAction || "No Action Provided";
        actionMap[action] = (actionMap[action] || 0) + 1;
      });

    return Object.entries(actionMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([action, count]) => ({ action, count }));
  }, [displayedIssues]);

  const uniqueDepartments = Array.from(
    new Set(activeIssues.map((i) => String(i.Department || "NA"))),
  ).sort();
  const deptSpecificIssues =
    selectedDepartment === "All"
      ? activeIssues
      : activeIssues.filter(
          (i) => String(i.Department || "NA") === selectedDepartment,
        );

  const deptStats = {
    total: deptSpecificIssues.length,
    resolved: deptSpecificIssues.filter((i) => isResolved(i.Status)).length,
    progress: deptSpecificIssues.filter((i) => isInProgress(i.Status)).length,
    open: deptSpecificIssues.filter(
      (i) => !isResolved(i.Status) && !isInProgress(i.Status),
    ).length,
    criticalOpen: deptSpecificIssues.filter(
      (i) => i.Severity === "Critical" && !isResolved(i.Status),
    ).length,
  };

  const deptPieData = [
    { name: "Resolved", value: deptStats.resolved, color: "#10b981" },
    { name: "In Progress", value: deptStats.progress, color: "#3b82f6" },
    { name: "Open", value: deptStats.open, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const handleAiEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiRecipient || !aiPrompt) return;

    setIsGenerating(true);

    setTimeout(() => {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Security Vulnerability Report", 14, 20);

      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

      const splitPrompt = doc.splitTextToSize(`Instructions: ${aiPrompt}`, 180);
      doc.text(splitPrompt, 14, 38);

      const openIssues = displayedIssues.filter((i) => !isResolved(i.Status));

      const tableData = openIssues.map((i) => [
        i.DisplayID,
        i.Category,
        i.Severity,
        i.RecommendedAction,
        i.AssignedTo,
        i.DueDate,
      ]);

      autoTable(doc, {
        startY: 40 + splitPrompt.length * 5,
        head: [
          [
            "Issue ID",
            "Category",
            "Severity",
            "Remediation Action",
            "Assigned To",
            "Due Date",
          ],
        ],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 8 },
        columnStyles: {
          3: { cellWidth: 50 },
        },
      });

      doc.save("Security_Action_Report.pdf");

      setIsGenerating(false);

      const criticalCount = openIssues.filter(
        (i) => String(i.Severity).toLowerCase() === "critical",
      ).length;
      const highCount = openIssues.filter(
        (i) => String(i.Severity).toLowerCase() === "high",
      ).length;
      const mediumCount = openIssues.filter(
        (i) => String(i.Severity).toLowerCase() === "medium",
      ).length;
      const lowCount = openIssues.filter(
        (i) => String(i.Severity).toLowerCase() === "low",
      ).length;

      const subject = encodeURIComponent(
        `Security Action Required: Pending Vulnerabilities`,
      );

      let body = `${aiPrompt}\n\n`;
      body += `--- Report Summary ---\n`;
      body += `Total Pending Issues: ${openIssues.length}\n`;
      if (criticalCount > 0) body += `- Critical: ${criticalCount}\n`;
      if (highCount > 0) body += `- High: ${highCount}\n`;
      if (mediumCount > 0) body += `- Medium: ${mediumCount}\n`;
      if (lowCount > 0) body += `- Low: ${lowCount}\n`;

      body += `\n[Please find the detailed PDF report attached to this email.]`;

      window.location.href = `mailto:${aiRecipient}?subject=${subject}&body=${encodeURIComponent(body)}`;

      setIsAiModalOpen(false);
      setAiPrompt("");
      setAiRecipient("");
    }, 1500);
  };

  const handleDeleteSelectedBatches = async () => {
    if (selectedBatches.length === 0) return;
    const confirmMsg = `🗑️ Are you sure you want to delete ${selectedBatches.length} dataset(s)?`;
    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      for (const batch of selectedBatches) {
        await fetch(API_URL, {
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const datasetName = window.prompt(
      "💾 NAME YOUR DATASET\n\nPlease enter a name to save this dataset (e.g., 'May 2026 Audit').\n\nClick 'Cancel' to safely abort this upload.",
    );

    if (datasetName === null) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsProcessing(true);
    setUploadProgress("Reading Excel...");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, {
          raw: false,
          dateNF: "yyyy-mm-dd",
        });

        const finalBatchName =
          datasetName.trim() === ""
            ? `Upload - ${new Date().toLocaleString()}`
            : datasetName.trim();

        const getFuzzy = (row: any, search: string) => {
          const searchClean = String(search)
            .toLowerCase()
            .replace(/[^a-z]/g, "");
          const key = Object.keys(row).find((k) =>
            String(k)
              .toLowerCase()
              .replace(/[^a-z]/g, "")
              .includes(searchClean),
          );
          return key ? String(row[key]) : null;
        };

        const itemsToUpload = [];

        for (let i = 0; i < rawJson.length; i++) {
          const row = rawJson[i];

          const rawSla = getFuzzy(row, "sla");
          const parsedSla = rawSla ? parseInt(String(rawSla)) : null;

          const fallbackId = Object.keys(row)[0];
          const rawId =
            getFuzzy(row, "vulnerabilityid") ||
            getFuzzy(row, "id") ||
            row[fallbackId] ||
            "NA";

          const personVal =
            getFuzzy(row, "assigned") ||
            getFuzzy(row, "assignee") ||
            getFuzzy(row, "name") ||
            getFuzzy(row, "owner") ||
            getFuzzy(row, "person") ||
            getFuzzy(row, "lead") ||
            "NA";

          const severity =
            getFuzzy(row, "severity") ||
            (parsedSla !== null
              ? parsedSla <= 3
                ? "Critical"
                : "High"
              : "NA");
          const category =
            getFuzzy(row, "category") ||
            getFuzzy(row, "source") ||
            getFuzzy(row, "domain") ||
            "Uncategorized";

          const extractedDescription =
            getFuzzy(row, "description") ||
            getFuzzy(row, "summary") ||
            getFuzzy(row, "issue") ||
            getFuzzy(row, "title") ||
            "No description provided.";
          const affectedAsset =
            getFuzzy(row, "asset") ||
            getFuzzy(row, "system") ||
            getFuzzy(row, "url") ||
            getFuzzy(row, "endpoint") ||
            getFuzzy(row, "image") ||
            "NA";
          const evidence =
            getFuzzy(row, "evidence") ||
            getFuzzy(row, "proof") ||
            getFuzzy(row, "reproduce") ||
            getFuzzy(row, "steps") ||
            "No evidence provided.";
          const recommendedAction =
            getFuzzy(row, "remediation") ||
            getFuzzy(row, "action") ||
            getFuzzy(row, "fix") ||
            getFuzzy(row, "solution") ||
            "No remediation action provided.";
          const referenceLinks =
            getFuzzy(row, "reference") ||
            getFuzzy(row, "link") ||
            getFuzzy(row, "cve") ||
            "NA";

          const discoveredDateVal =
            getFuzzy(row, "discovereddate") ||
            getFuzzy(row, "discovered") ||
            getFuzzy(row, "date") ||
            getFuzzy(row, "datefound") ||
            "NA";
          const dueDateVal =
            getFuzzy(row, "duedate") ||
            getFuzzy(row, "due") ||
            getFuzzy(row, "deadline") ||
            getFuzzy(row, "target") ||
            "NA";

          itemsToUpload.push({
            IssueID: `${finalBatchName}-${rawId === "NA" ? i : rawId}-row${i}`,
            DisplayID: rawId === "NA" ? `VULN-${i}` : String(rawId),
            UploadBatch: finalBatchName,
            Severity: severity,
            Status: getFuzzy(row, "status") || "Open",
            AssignedTo: personVal,
            Type:
              getFuzzy(row, "vulnerabilitytype") ||
              getFuzzy(row, "type") ||
              "NA",
            Category: category,
            DueDate: String(dueDateVal),
            DiscoveredDate: String(discoveredDateVal),
            Description: extractedDescription,
            AffectedAsset: affectedAsset,
            Evidence: evidence,
            RecommendedAction: recommendedAction,
            ReferenceLinks: referenceLinks,
          });
        }

        const CHUNK_SIZE = 50;
        const totalChunks = Math.ceil(itemsToUpload.length / CHUNK_SIZE);

        for (let i = 0; i < itemsToUpload.length; i += CHUNK_SIZE) {
          const chunk = itemsToUpload.slice(i, i + CHUNK_SIZE);
          const currentChunkNum = Math.floor(i / CHUNK_SIZE) + 1;
          setUploadProgress(
            `Uploading part ${currentChunkNum} of ${totalChunks}...`,
          );

          const response = await fetch(API_URL, {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: chunk }),
          });

          if (!response.ok)
            throw new Error(`AWS Blocked upload at part ${currentChunkNum}`);
        }

        setUploadProgress("Done!");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        window.location.reload();
      } catch (err: any) {
        setIsProcessing(false);
        setUploadProgress("");
        console.error("Upload Error:", err);
        alert(`Upload Failed: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const exportToExcel = () => {
    const fileNameInput = window.prompt(
      "💾 NAME YOUR EXPORT FILE\n\nPlease enter a name for this report (e.g., 'May_Audit_Report'):",
      "Wynk_Security_Report",
    );

    if (fileNameInput === null) return;

    let finalFileName =
      fileNameInput.trim() === ""
        ? "Wynk_Security_Report"
        : fileNameInput.trim();
    if (!finalFileName.toLowerCase().endsWith(".xlsx")) {
      finalFileName += ".xlsx";
    }

    const exportData = displayedIssues.map((i) => ({
      "Issue ID": i.DisplayID,
      Category: i.Category,
      Type: i.Type,
      Severity: i.Severity,
      Status: i.Status,
      "Remediation Action": i.RecommendedAction,
      "Assigned To": i.AssignedTo,
      "Discovered Date": i.DiscoveredDate,
      "Due Date": i.DueDate,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);

    const merges = [];
    let startIdx = 0;

    for (let i = 1; i <= exportData.length; i++) {
      if (
        i === exportData.length ||
        exportData[i]["Issue ID"] !== exportData[startIdx]["Issue ID"]
      ) {
        const spanCount = i - startIdx;

        if (spanCount > 1) {
          merges.push({
            s: { r: startIdx + 1, c: 0 },
            e: { r: i, c: 0 },
          });
        }
        startIdx = i;
      }
    }

    if (merges.length > 0) {
      ws["!merges"] = merges;
    }

    const wscols = [
      { wch: 15 },
      { wch: 20 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 40 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
    ];
    ws["!cols"] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Security Report");
    XLSX.writeFile(wb, finalFileName);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Security Vulnerability Report", 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 28);

    const tableData = displayedIssues.map((i) => [
      i.DisplayID,
      i.Category,
      i.Severity,
      i.Status,
      i.AssignedTo,
      i.DueDate,
    ]);

    autoTable(doc, {
      startY: 35,
      head: [
        [
          "Issue ID",
          "Category",
          "Severity",
          "Status",
          "Assigned To",
          "Due Date",
        ],
      ],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 8 },
    });

    doc.save("Wynk_Security_Report.pdf");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-8 font-sans text-slate-800">
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between bg-white px-6 py-4 rounded-sm shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <Shield size={24} className="text-blue-600" />
          <div className="h-6 w-[1px] bg-slate-300 mx-1"></div>
          <h1 className="text-lg font-semibold text-slate-800 tracking-tight">
            Wynk Security Leadership Portal
          </h1>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          {/* --- NEW: RBAC View Switcher --- */}
          <div className="flex items-center gap-2 text-sm bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-sm">
            <span className="text-slate-500 font-medium">View As:</span>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="bg-transparent font-bold text-blue-700 outline-none cursor-pointer"
            >
              <option value="Admin">Admin (Lead)</option>
              <option value="Viewer">Viewer (Dev)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded border border-slate-200">
            <Database size={14} className="text-slate-600" /> Live DB Linked
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card
          title="Active Backlog"
          val={stats.total}
          Icon={Clock}
          color="text-slate-700"
          bg="bg-slate-100"
        />
        <Card
          title="Critical Risks"
          val={stats.criticalOpen}
          Icon={AlertTriangle}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <Card
          title="Issues Resolved"
          val={pipeline.resolved}
          Icon={CheckCircle}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">
              SLA Breached
            </p>
            <p className="text-2xl font-bold text-red-600">{stats.breached}</p>
          </div>
          <div className="p-2.5 rounded-md bg-red-50 text-red-600">
            <Flame size={20} />
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Activity size={16} className="text-slate-400" /> Resolution
            Pipeline (MTTR)
          </h2>
          <span className="text-xs font-medium text-slate-500">
            Resolution Velocity:{" "}
            <strong className="text-slate-800">
              {stats.total > 0
                ? ((pipeline.resolved / stats.total) * 100).toFixed(1)
                : 0}
              %
            </strong>
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 w-full border border-slate-200 p-4 rounded-md flex justify-between items-center bg-slate-50">
            <p className="text-sm font-medium text-slate-600">Open</p>
            <p className="text-lg font-bold text-slate-800">{pipeline.open}</p>
          </div>
          <ArrowRight className="text-slate-400 hidden sm:block" size={16} />
          <div className="flex-1 w-full border border-blue-200 p-4 rounded-md flex justify-between items-center bg-blue-50/30">
            <p className="text-sm font-medium text-blue-700">In Progress</p>
            <p className="text-lg font-bold text-blue-800">
              {pipeline.progress}
            </p>
          </div>
          <ArrowRight className="text-slate-400 hidden sm:block" size={16} />
          <div className="flex-1 w-full border border-emerald-200 p-4 rounded-md flex justify-between items-center bg-emerald-50/30">
            <p className="text-sm font-medium text-emerald-700">Resolved</p>
            <p className="text-lg font-bold text-emerald-800">
              {pipeline.resolved}
            </p>
          </div>
        </div>
        <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-sm overflow-hidden flex">
          <div
            style={{
              width: `${stats.total > 0 ? (pipeline.open / stats.total) * 100 : 0}%`,
            }}
            className="bg-slate-400 h-full"
          />
          <div
            style={{
              width: `${stats.total > 0 ? (pipeline.progress / stats.total) * 100 : 0}%`,
            }}
            className="bg-blue-500 h-full"
          />
          <div
            style={{
              width: `${stats.total > 0 ? (pipeline.resolved / stats.total) * 100 : 0}%`,
            }}
            className="bg-emerald-500 h-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm">
          <h2 className="font-semibold text-slate-800 text-sm mb-4 border-b border-slate-100 pb-2">
            Asset Category Distribution
          </h2>
          <div className="h-64 flex items-center justify-center">
            {stats.total > 0 ? (
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
                      <Cell key={`cell-${index}`} fill={entry.color} />
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
        <div className="lg:col-span-2 bg-white p-5 rounded-sm border border-slate-200 shadow-sm">
          <h2 className="font-semibold text-slate-800 text-sm mb-4 border-b border-slate-100 pb-2">
            Vulnerability Types
          </h2>
          <div className="h-64 flex items-center justify-center">
            {typeChartData.length > 0 ? (
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
          {timelineChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={timelineChartData}
                margin={{ bottom: 30, right: 20, top: 10 }}
              >
                <defs>
                  <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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

      <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="text-slate-500" size={18} />
            <h2 className="font-semibold text-slate-800 text-sm">
              Department Accountability
            </h2>
          </div>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-sm text-sm font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-700 min-w-[200px]"
          >
            <option value="All">All Departments</option>
            {uniqueDepartments.map((dept) => (
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
                Total Assigned
              </p>
              <p className="text-xl font-bold text-slate-800">
                {deptStats.total}
              </p>
            </div>
            <div className="p-4 bg-red-50/50 rounded-sm border border-red-100 flex justify-between items-center">
              <p className="text-xs font-semibold text-red-700 uppercase">
                Critical Risks
              </p>
              <p className="text-xl font-bold text-red-700">
                {deptStats.criticalOpen}
              </p>
            </div>
          </div>
          <div className="md:col-span-2 h-48 flex items-center justify-center">
            {deptStats.total > 0 ? (
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
                      <Cell key={`cell-${index}`} fill={entry.color} />
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

      <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <Wrench className="text-slate-500" size={18} />
          <h2 className="font-semibold text-slate-800 text-sm">
            Top Priority Remediation Actions
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {topRemediations.length > 0 ? (
            topRemediations.map((rem, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-slate-50 p-3 rounded-sm border border-slate-100"
              >
                <div className="flex-1 pr-4">
                  <p
                    className="text-xs font-semibold text-slate-700 line-clamp-2"
                    title={rem.action}
                  >
                    {rem.action}
                  </p>
                </div>
                <div className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-1 rounded-sm whitespace-nowrap">
                  {rem.count} Issues
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              No open remediations required.
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-sm border border-slate-200 shadow-sm flex flex-col z-30 overflow-visible">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm border-r border-slate-300 pr-4">
              <Filter size={16} className="text-slate-500" /> Issue Tracking Log
            </div>
            <input
              type="text"
              placeholder="Search ID, Remediation, Category..."
              className="px-3 py-1.5 rounded-sm border border-slate-300 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none w-full max-w-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsBatchDropdownOpen(!isBatchDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-sm text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Layers size={14} className="text-blue-600" />
                <span>Datasets ({selectedBatches.length})</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${isBatchDropdownOpen ? "rotate-180" : ""}`}
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
                        batches.length > 0 && setSelectedBatches([batches[0]])
                      }
                      className="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-800 px-2 py-1"
                    >
                      Latest Only
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    {batches.map((batch) => (
                      <div
                        key={batch}
                        onClick={() => toggleBatch(batch)}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                      >
                        {selectedBatches.includes(batch) ? (
                          <CheckSquare size={16} className="text-blue-600" />
                        ) : (
                          <Square size={16} className="text-slate-300" />
                        )}
                        <span
                          className={`text-xs ${selectedBatches.includes(batch) ? "font-bold text-slate-900" : "text-slate-600"}`}
                        >
                          {batch}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* --- NEW: RBAC Check for Delete Button --- */}
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
                className={`px-4 py-1.5 text-xs font-medium transition-colors ${filter === "All" ? "bg-slate-200 text-slate-800" : "text-slate-600 hover:bg-slate-100"}`}
              >
                All
              </button>
              <div className="w-[1px] bg-slate-300"></div>
              <button
                onClick={() => setFilter("Critical")}
                className={`px-4 py-1.5 text-xs font-medium transition-colors ${filter === "Critical" ? "bg-red-100 text-red-800" : "text-slate-600 hover:bg-slate-100"}`}
              >
                Critical
              </button>
            </div>

            {/* --- NEW: RBAC Check for Upload Button --- */}
            {userRole === "Admin" && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-blue-600 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  <Upload size={14} />{" "}
                  {isProcessing
                    ? uploadProgress || "Processing..."
                    : "Upload Dataset"}
                </button>
              </>
            )}

            {/* --- NEW: RBAC Check for Send Mail Button --- */}
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
                onClick={exportToExcel}
                className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-emerald-600 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <Download size={14} /> Excel
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
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase border-r border-slate-200">
                  Issue ID
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                  Category
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                  Severity
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                  Remediation
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                  Assigned To
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                  Due Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {displayedIssues.map((issue, index) => {
                const breached = checkBreach(issue);
                const resolved = isResolved(issue.Status);

                const rowKey = issue.IssueID;
                const isExpanded = expandedRow === rowKey;
                const isGrouped = rowSpanMap[issue.DisplayID] > 1;

                const rowSpanToUse = activeSpanMap[issue.DisplayID];

                const showMergeHead = !renderedIdHeads.has(issue.DisplayID);
                if (showMergeHead) renderedIdHeads.add(issue.DisplayID);

                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${breached && !resolved ? "bg-red-50/20" : ""}`}
                    >
                      {showMergeHead && (
                        <>
                          <td
                            rowSpan={rowSpanToUse}
                            onClick={() =>
                              setExpandedRow(
                                isExpanded ? null : issue.DisplayID,
                              )
                            }
                            className="px-4 py-3 border-r border-slate-200 bg-slate-50/50 text-center cursor-pointer align-top pt-4"
                          >
                            {!isGrouped && (
                              <div className="text-slate-400 transition-colors">
                                {isExpanded ? (
                                  <ChevronUp
                                    size={16}
                                    className="mx-auto text-blue-600"
                                  />
                                ) : (
                                  <ChevronDown size={16} className="mx-auto" />
                                )}
                              </div>
                            )}
                          </td>
                          <td
                            rowSpan={rowSpanToUse}
                            className={`px-4 py-3 border-r border-slate-200 bg-slate-50/50 font-bold text-sm align-top pt-4 whitespace-nowrap text-blue-900 ${breached && !resolved ? "border-l-4 border-l-red-500" : ""}`}
                          >
                            {issue.DisplayID}
                          </td>
                        </>
                      )}

                      <td
                        className="px-4 py-3 text-xs font-medium text-slate-600"
                        onClick={() =>
                          setExpandedRow(isExpanded ? null : rowKey)
                        }
                      >
                        <div className="flex items-center gap-2">
                          {isGrouped && (
                            <div className="text-slate-400 transition-colors">
                              {isExpanded ? (
                                <ChevronUp
                                  size={14}
                                  className="text-blue-600"
                                />
                              ) : (
                                <ChevronDown size={14} />
                              )}
                            </div>
                          )}
                          {issue.Category}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-sm text-[10px] font-bold border ${issue.Severity === "Critical" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
                        >
                          {issue.Severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${isResolved(issue.Status) ? "bg-emerald-50 text-emerald-700" : isInProgress(issue.Status) ? "bg-blue-50 text-blue-700" : "bg-slate-100"}`}
                        >
                          {issue.Status}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-xs text-slate-600 truncate max-w-[150px]"
                        title={issue.RecommendedAction}
                      >
                        {issue.RecommendedAction}
                      </td>
                      <td className="px-4 py-3 text-xs">{issue.AssignedTo}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                        {issue.DueDate}{" "}
                        {breached && !resolved && (
                          <Flame
                            size={12}
                            className="inline text-red-500 ml-1"
                          />
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-blue-50/10 border-b border-slate-200 shadow-inner">
                        <td colSpan={6} className="p-6">
                          <div className="bg-white p-6 rounded-sm border border-blue-200 shadow-sm grid grid-cols-2 gap-8">
                            <div>
                              <h4 className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-900 mb-3">
                                <FileText size={14} /> Issue Description
                              </h4>
                              <p className="text-sm leading-relaxed text-slate-700 bg-slate-50 p-3 border rounded-sm">
                                {issue.Description}
                              </p>
                              <h4 className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-900 mt-6 mb-3">
                                <Server size={14} /> Affected Asset
                              </h4>
                              <code className="text-xs bg-slate-800 text-blue-300 p-2 rounded block">
                                {issue.AffectedAsset}
                              </code>
                            </div>
                            <div>
                              <h4 className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-900 mb-3">
                                <Wrench size={14} /> Remediation Action
                              </h4>
                              <p className="text-sm italic text-slate-700 border-l-4 border-emerald-400 pl-4">
                                {issue.RecommendedAction}
                              </p>
                              <h4 className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-900 mt-6 mb-3">
                                <Terminal size={14} /> Evidence Log
                              </h4>
                              <pre className="bg-slate-900 text-green-400 p-4 rounded text-[11px] font-mono overflow-x-auto max-h-40">
                                {issue.Evidence}
                              </pre>
                              {issue.ReferenceLinks !== "NA" && (
                                <div className="mt-4">
                                  <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                                    <LinkIcon
                                      size={12}
                                      className="inline mr-1"
                                    />
                                    Reference Links
                                  </h4>
                                  <a
                                    href={
                                      issue.ReferenceLinks.startsWith("http")
                                        ? issue.ReferenceLinks
                                        : `https://${issue.ReferenceLinks}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline break-all"
                                  >
                                    {issue.ReferenceLinks}
                                  </a>
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
    </div>
  );
};

const Card = ({ title, val, Icon, color, bg }: any) => (
  <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
        {title}
      </p>
      <p className="text-2xl font-bold text-slate-900">{val}</p>
    </div>
    <div
      className={`p-2 rounded-sm bg-slate-50 border border-slate-100 ${color}`}
    >
      <Icon size={20} />
    </div>
  </div>
);

export default App;
