import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Download,
  Upload,
  Users,
  Flame,
  ArrowRight,
  Activity,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Database,
  Trash2,
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
  const [selectedBatch, setSelectedBatch] = useState<string>("Latest");

  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState("All");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL =
    "https://cuume980nf.execute-api.us-east-1.amazonaws.com/default/SecurityDataFetcher";

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
          const safeData = rawArray.map((item) => ({
            IssueID: String(item?.IssueID ?? "NA"),
            UploadBatch: String(item?.UploadBatch ?? "NA"),
            Severity: String(item?.Severity ?? "NA"),
            Status: String(item?.Status ?? "Open"),
            Owner: String(item?.Owner ?? "NA"),
            Type: String(item?.Type ?? "NA"),
            AI_Summary:
              typeof item?.AI_Summary === "string" &&
              item.AI_Summary.trim() !== ""
                ? item.AI_Summary
                : "No description provided.",
            DiscoveredDate: String(item?.DiscoveredDate ?? "NA"),
            DueDate: String(item?.DueDate ?? "NA"),
          }));

          const sortedData = safeData.sort((a, b) => {
            return a.IssueID.localeCompare(b.IssueID, undefined, {
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
        } else {
          setAllIssues([]);
        }
      })
      .catch((err) => console.error("API Fetch Error:", err));
  }, []);

  const activeBatch =
    selectedBatch === "Latest" && batches.length > 0
      ? batches[0]
      : selectedBatch;
  const activeIssues =
    selectedBatch === "All"
      ? allIssues
      : batches.length > 0
        ? allIssues.filter((i) => i.UploadBatch === activeBatch)
        : allIssues;

  const isResolved = (status: string) => {
    const s = String(status || "").toLowerCase();
    return (
      s.includes("resolved") ||
      s.includes("closed") ||
      s.includes("fixed") ||
      s.includes("mitigated")
    );
  };

  const isInProgress = (status: string) => {
    const s = String(status || "").toLowerCase();
    return (
      s.includes("progress") || s.includes("pending") || s.includes("review")
    );
  };

  const updateIssueStatus = async (issue: any, newStatus: string) => {
    const updatedIssue = { ...issue, Status: newStatus };
    setAllIssues((prev) =>
      prev.map((i) => (i.IssueID === issue.IssueID ? updatedIssue : i)),
    );
    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [updatedIssue] }),
      });
    } catch (err) {
      setAllIssues((prev) =>
        prev.map((i) => (i.IssueID === issue.IssueID ? issue : i)),
      );
    }
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

    const id = String(issue.IssueID || "").toLowerCase();
    const owner = String(issue.Owner || "")
      .toLowerCase()
      .trim();
    const summary = String(issue.AI_Summary || "").toLowerCase();

    return (
      owner === s || id.includes(s) || owner.includes(s) || summary.includes(s)
    );
  });

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
    const type =
      issue.Type && issue.Type !== "NA" ? String(issue.Type) : "Unclassified";
    typeMap[type] = (typeMap[type] || 0) + 1;
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
        timelineMap[dateStr].ids.push(issue.IssueID);
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

  const uniqueOwners = Array.from(
    new Set(activeIssues.map((i) => String(i.Owner || "NA"))),
  ).sort();
  const ownerSpecificIssues =
    selectedOwner === "All"
      ? activeIssues
      : activeIssues.filter((i) => String(i.Owner || "NA") === selectedOwner);

  const ownerStats = {
    total: ownerSpecificIssues.length,
    resolved: ownerSpecificIssues.filter((i) => isResolved(i.Status)).length,
    progress: ownerSpecificIssues.filter((i) => isInProgress(i.Status)).length,
    open: ownerSpecificIssues.filter(
      (i) => !isResolved(i.Status) && !isInProgress(i.Status),
    ).length,
    criticalOpen: ownerSpecificIssues.filter(
      (i) => i.Severity === "Critical" && !isResolved(i.Status),
    ).length,
  };

  const pieChartData = [
    { name: "Resolved", value: pipeline.resolved, color: "#10b981" },
    { name: "In Progress", value: pipeline.progress, color: "#3b82f6" },
    { name: "Open", value: pipeline.open, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const ownerPieData = [
    { name: "Resolved", value: ownerStats.resolved, color: "#10b981" },
    { name: "In Progress", value: ownerStats.progress, color: "#3b82f6" },
    { name: "Open", value: ownerStats.open, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const handleDeleteBatch = async () => {
    const target = selectedBatch === "Latest" ? activeBatch : selectedBatch;
    if (!target) return;

    const confirmMsg =
      target === "All"
        ? "🚨 URGENT WARNING: Are you sure you want to DELETE ALL HISTORICAL DATA?\n\nThis will permanently wipe the entire AWS database and cannot be undone."
        : `🗑️ Are you sure you want to permanently delete the dataset:\n\n"${target}"?`;

    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      const response = await fetch(API_URL, {
        method: "DELETE",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ UploadBatch: target }),
      });

      if (!response.ok) throw new Error("AWS blocked the delete request.");

      await new Promise((resolve) => setTimeout(resolve, 1500));
      window.location.reload();
    } catch (err: any) {
      setIsProcessing(false);
      console.error("Delete Error:", err);
      alert(`Delete Failed: ${err.message}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // --- FIX: CANCEL BUTTON SAFELY ABORTS EVERYTHING ---
    const datasetName = window.prompt(
      "💾 NAME YOUR DATASET\n\nPlease enter a name to save this dataset (e.g., 'May 2026 Audit').\n\nClick 'Cancel' to safely abort this upload.",
    );

    // If user clicked Cancel, immediately stop everything.
    if (datasetName === null) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { raw: false });

        // If they leave it blank but click OK, generate a safe default timestamp name.
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

          const bestId =
            getFuzzy(row, "vulnerabilityid") ||
            getFuzzy(row, "id") ||
            row[fallbackId] ||
            `VULN-UPLOAD-${i}`;

          const extractedDescription =
            getFuzzy(row, "description") ||
            getFuzzy(row, "summary") ||
            getFuzzy(row, "issue") ||
            getFuzzy(row, "title") ||
            getFuzzy(row, "detail") ||
            getFuzzy(row, "vulnerability") ||
            "No description provided.";

          const rawDept = getFuzzy(row, "department") || getFuzzy(row, "team");
          const rawPerson =
            getFuzzy(row, "assigned") ||
            getFuzzy(row, "assignee") ||
            getFuzzy(row, "name") ||
            getFuzzy(row, "owner") ||
            getFuzzy(row, "person") ||
            getFuzzy(row, "lead");

          let deptVal = rawDept || "NA";
          let personVal = rawPerson || "NA";

          if (
            deptVal !== "NA" &&
            personVal !== "NA" &&
            String(deptVal).toLowerCase() === String(personVal).toLowerCase()
          ) {
            personVal = "NA";
          }

          let finalCombinedOwner = "NA";
          if (deptVal !== "NA" && personVal !== "NA") {
            finalCombinedOwner = `${deptVal} (${personVal})`;
          } else if (deptVal !== "NA") {
            finalCombinedOwner = deptVal;
          } else if (personVal !== "NA") {
            finalCombinedOwner = personVal;
          }

          itemsToUpload.push({
            IssueID: String(bestId),
            UploadBatch: finalBatchName,
            Severity:
              parsedSla !== null
                ? parsedSla <= 3
                  ? "Critical"
                  : "High"
                : "NA",
            Status: getFuzzy(row, "status") || "Open",
            Owner: finalCombinedOwner,
            Type:
              getFuzzy(row, "vulnerabilitytype") ||
              getFuzzy(row, "type") ||
              "NA",
            AI_Summary: extractedDescription,
            DiscoveredDate: getFuzzy(row, "discovereddate") || "NA",
            DueDate: getFuzzy(row, "duedate") || "NA",
          });
        }

        const response = await fetch(API_URL, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: itemsToUpload }),
        });

        if (!response.ok) {
          throw new Error(`AWS blocked the request. Try again.`);
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));

        setIsProcessing(false);
        window.location.reload();
      } catch (err: any) {
        setIsProcessing(false);
        console.error("Upload Error:", err);
        alert(`Upload Failed: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const exportToExcel = () => {
    const headers = [
      "IssueID",
      "Upload Batch",
      "Severity",
      "Status",
      "Owner",
      "Issue Description",
      "Due Date",
    ];
    const rows = [headers.join(",")];
    displayedIssues.forEach((i) => {
      rows.push(
        [
          i.IssueID,
          i.UploadBatch,
          i.Severity,
          i.Status,
          i.Owner,
          `"${i.AI_Summary}"`,
          i.DueDate,
        ].join(","),
      );
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Wynk_Security_Report.csv";
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-8 font-sans text-slate-800">
      {/* ENTERPRISE HEADER */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between bg-white px-6 py-4 rounded-sm shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <Shield size={24} className="text-blue-600" />
          <div className="h-6 w-[1px] bg-slate-300 mx-1"></div>
          <h1 className="text-lg font-semibold text-slate-800 tracking-tight">
            Wynk Security Leadership Portal
          </h1>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded border border-slate-200">
          <Database size={14} className="text-slate-600" /> Live Database Linked
        </div>
      </header>

      {/* KPI METRICS */}
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

      {/* RESOLUTION PIPELINE */}
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

      {/* DASHBOARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm">
          <h2 className="font-semibold text-slate-800 text-sm mb-4 border-b border-slate-100 pb-2">
            Resolution Health
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
            Vulnerability Distribution
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

      {/* DISCOVERY TIMELINE */}
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

      {/* DEPARTMENT ACCOUNTABILITY */}
      <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="text-slate-500" size={18} />
            <h2 className="font-semibold text-slate-800 text-sm">
              Department Accountability
            </h2>
          </div>
          <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-sm text-sm font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-700 min-w-[200px]"
          >
            <option value="All">All Departments</option>
            {uniqueOwners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
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
                {ownerStats.total}
              </p>
            </div>
            <div className="p-4 bg-red-50/50 rounded-sm border border-red-100 flex justify-between items-center">
              <p className="text-xs font-semibold text-red-700 uppercase">
                Critical Risks
              </p>
              <p className="text-xl font-bold text-red-700">
                {ownerStats.criticalOpen}
              </p>
            </div>
          </div>
          <div className="md:col-span-2 h-48 flex items-center justify-center">
            {ownerStats.total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ownerPieData}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {ownerPieData.map((entry, index) => (
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

      {/* ENTERPRISE DATA TABLE */}
      <div className="bg-white rounded-sm border border-slate-200 shadow-sm flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm border-r border-slate-300 pr-4">
              <Filter size={16} className="text-slate-500" /> Vulnerability Log
            </div>
            <input
              type="text"
              placeholder="Filter by ID, Owner, or Description..."
              className="px-3 py-1.5 rounded-sm border border-slate-300 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none w-full max-w-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* --- SMART DATASET SELECTOR WITH DELETE BUTTON --- */}
            {batches.length > 0 && (
              <div className="flex items-center gap-1 mr-2 bg-white px-2 py-1 rounded-sm border border-slate-300 shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mr-1">
                  Dataset:
                </span>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="px-1 py-1 bg-transparent text-xs font-semibold focus:outline-none text-slate-800 cursor-pointer"
                >
                  <option value="Latest">Latest Upload</option>
                  <option value="All">All Historical Data</option>
                  {batches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>
                <button
                  onClick={handleDeleteBatch}
                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete this dataset"
                  disabled={isProcessing}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}

            <div className="flex rounded-sm border border-slate-300 overflow-hidden bg-white">
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
              {isProcessing ? "Processing..." : "Upload Dataset"}
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-slate-800 text-xs font-medium bg-slate-800 text-white hover:bg-slate-900 transition-colors"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Issue ID
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {displayedIssues.map((issue, index) => {
                const breached = checkBreach(issue);
                const resolved = isResolved(issue.Status);
                const isExpanded = expandedRow === issue.IssueID;

                return (
                  <React.Fragment key={`${issue.IssueID}-${index}`}>
                    <tr
                      onClick={() =>
                        setExpandedRow(isExpanded ? null : issue.IssueID)
                      }
                      className={`transition-colors hover:bg-slate-50/80 cursor-pointer ${breached && !resolved ? "border-l-[3px] border-l-red-500 bg-red-50/10" : ""}`}
                    >
                      <td className="px-4 py-3 text-slate-400">
                        {isExpanded ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 text-sm whitespace-nowrap">
                        {issue.IssueID}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-sm border text-[11px] font-medium ${issue.Severity === "Critical" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
                        >
                          {issue.Severity}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={issue.Status}
                          onChange={(e) =>
                            updateIssueStatus(issue, e.target.value)
                          }
                          className={`block w-full px-2 py-1 text-xs border rounded-sm transition-colors focus:ring-1 focus:ring-blue-500 focus:outline-none ${resolved ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Mitigated">Mitigated</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-sm">
                        {issue.Owner}
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-sm">
                        {issue.Type}
                      </td>

                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span
                          className={`${breached && !resolved ? "text-red-600 font-medium" : "text-slate-600"}`}
                        >
                          {issue.DueDate}
                        </span>
                        {breached && !resolved && (
                          <Flame
                            size={14}
                            className="inline ml-1.5 text-red-500 mb-0.5"
                            title="SLA Breached"
                          />
                        )}
                      </td>
                      <td
                        className="px-4 py-3 flex justify-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() =>
                            updateIssueStatus(
                              issue,
                              resolved ? "Open" : "Resolved",
                            )
                          }
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-colors text-xs font-medium border ${resolved ? "bg-white text-slate-600 border-slate-300 hover:bg-slate-50" : "bg-white text-slate-700 border-slate-300 hover:border-emerald-500 hover:text-emerald-700 shadow-sm"}`}
                        >
                          {resolved ? (
                            <>
                              <RotateCcw size={12} /> Undo
                            </>
                          ) : (
                            <>
                              <CheckCircle size={12} /> Resolve
                            </>
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* --- THE EXPANDABLE AI DESCRIPTION SECTION --- */}
                    {isExpanded && (
                      <tr className="bg-indigo-50/40 border-b border-slate-200">
                        <td colSpan={8} className="px-8 py-5">
                          <div className="flex items-start gap-3 bg-white p-4 rounded-md border border-indigo-100 shadow-sm">
                            <div className="p-2 bg-indigo-100 rounded-md text-indigo-600 shrink-0 mt-0.5">
                              <Sparkles size={18} />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide mb-1.5">
                                Issue Description
                              </h4>
                              <p className="text-sm text-slate-700 leading-relaxed max-w-4xl">
                                {issue.AI_Summary}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {displayedIssues.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-slate-500 text-sm"
                  >
                    No vulnerability records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
