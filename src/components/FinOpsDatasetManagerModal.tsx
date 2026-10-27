// richyrik: Uploaded Datasets & MongoDB Version History Modal
import React, { useState } from "react";
import {
  Database,
  FileSpreadsheet,
  Trash2,
  X,
  CheckCircle,
  AlertTriangle,
  Upload,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FileText,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  HardDrive,
  Server,
  HelpCircle,
} from "lucide-react";
import { useFinOpsCurrency, type FinOpsDataset } from "./FinOpsCurrencyContext";

export const FinOpsDatasetManagerModal: React.FC = () => {
  const {
    datasets,
    deleteDataset,
    toggleDatasetActive,
    isDatasetManagerOpen,
    setIsDatasetManagerOpen,
    mongoStatus,
    refreshDatasets,
    setIsMultiSheetModalOpen,
    parseWorkbookFile,
  } = useFinOpsCurrency();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isDatasetManagerOpen) return null;

  const filteredDatasets = datasets.filter(
    (d) =>
      d.datasetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.originalFileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.fiscalYear.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSheets = datasets.reduce((sum, d) => sum + (d.sheets?.length || 0), 0);
  const totalRows = datasets.reduce((sum, d) => sum + (d.totalRows || 0), 0);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDataset(id);
      setDeleteConfirmId(null);
    } catch (e) {
      console.error("Failed to delete dataset:", e);
    } finally {
      setDeletingId(null);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsDatasetManagerOpen(false);
      await parseWorkbookFile(file);
      e.target.value = "";
    }
  };

  const formatUploadDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0B0F19] border border-white/[0.12] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/80 overflow-hidden ring-1 ring-white/[0.08]">
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-cyan-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Database size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Uploaded Datasets & MongoDB Storage
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {mongoStatus.database || "xtelify_db"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage, inspect, and delete Excel workbooks persisted in Airtel Server MongoDB.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshDatasets()}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors border border-white/[0.06]"
              title="Refresh from MongoDB"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={() => setIsDatasetManagerOpen(false)}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors border border-white/[0.06]"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Database Status Strip */}
        <div className="px-6 py-2.5 bg-black/40 border-b border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Server size={13} className="text-emerald-400" />
              <span>Host: <strong className="text-slate-200">Airtel Server (10.56.131.8)</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <HardDrive size={13} className="text-cyan-400" />
              <span>Collections: <strong className="text-slate-200">finops_datasets, finops_sheets</strong></span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">
              Total Stored: <strong className="text-white font-mono">{datasets.length}</strong> datasets ({totalRows.toLocaleString()} rows)
            </span>
          </div>
        </div>

        {/* Action & Search Bar */}
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between gap-4 bg-white/[0.01]">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search datasets by name, filename, or FY..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/80 border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <button
              onClick={handleUploadClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-semibold text-xs rounded-lg shadow-md transition-all cursor-pointer"
            >
              <Upload size={13} />
              <span>Upload New Workbook (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Datasets List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {filteredDatasets.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white/[0.02] rounded-xl border border-dashed border-white/[0.08]">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Database size={26} />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">
                {searchQuery ? "No Matching Datasets Found" : "No FinOps Datasets in MongoDB"}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
                {searchQuery
                  ? "Try clearing your search query to see all uploaded datasets."
                  : "All test data has been cleared. When you upload an Excel workbook (.xlsx/.csv), it will be automatically parsed, routed, and permanently saved to Airtel Server MongoDB."}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleUploadClick}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-semibold text-xs rounded-lg shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Upload size={14} />
                  <span>Upload Your First FinOps Workbook</span>
                </button>
              )}
            </div>
          ) : (
            filteredDatasets.map((dataset) => {
              const isConfirming = deleteConfirmId === dataset.id;
              const isDeleting = deletingId === dataset.id;

              return (
                <div
                  key={dataset.id}
                  className={`p-4 rounded-xl border transition-all ${
                    dataset.active
                      ? "bg-white/[0.03] border-white/[0.1] hover:border-white/[0.16]"
                      : "bg-white/[0.01] border-white/[0.04] opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="text-sm font-bold text-white tracking-wide">
                          {dataset.datasetName}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          {dataset.originalFileName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          {dataset.fiscalYear}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {dataset.currency}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock size={12} className="text-slate-500" />
                          <span>Uploaded: {formatUploadDate(dataset.uploadedAt)}</span>
                        </span>
                        <span>•</span>
                        <span>
                          <strong className="text-slate-300">{dataset.sheets?.length || 0}</strong> worksheets
                        </span>
                        <span>•</span>
                        <span>
                          <strong className="text-slate-300">{(dataset.totalRows || 0).toLocaleString()}</strong> rows stored
                        </span>
                      </div>

                      {/* Worksheets Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-slate-400">Detected Sheets:</span>
                        {dataset.sheets && dataset.sheets.length > 0 ? (
                          dataset.sheets.map((s, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-white/[0.05] text-slate-200 border border-white/[0.08]"
                            >
                              <FileSpreadsheet size={11} className="text-emerald-400" />
                              <span>{s.sheetName}</span>
                              <span className="text-slate-400">({s.rowCount} rows)</span>
                              <ArrowRight size={9} className="text-slate-400" />
                              <span className="text-cyan-300">{s.targetLabel}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400">1 consolidated sheet</span>
                        )}
                      </div>
                    </div>

                    {/* Right Action Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Active Toggle */}
                      <button
                        onClick={() => toggleDatasetActive(dataset.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          dataset.active
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                            : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                        }`}
                        title={dataset.active ? "Included in active calculations" : "Excluded from active calculations"}
                      >
                        {dataset.active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                        <span>{dataset.active ? "Active" : "Disabled"}</span>
                      </button>

                      {/* Delete Button / Confirmation */}
                      {isConfirming ? (
                        <div className="flex items-center gap-1.5 bg-red-950/60 border border-red-500/40 rounded-lg p-1 animate-in fade-in">
                          <span className="text-[11px] text-red-300 px-1 font-medium">Delete from MongoDB?</span>
                          <button
                            onClick={() => handleDelete(dataset.id)}
                            disabled={isDeleting}
                            className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-semibold transition-colors disabled:opacity-50"
                          >
                            {isDeleting ? "Deleting..." : "Yes, Delete"}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(dataset.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/30 transition-colors"
                          title="Delete Dataset from MongoDB"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-black/40 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>
              All data deletions permanently delete records from MongoDB{" "}
              <code className="text-slate-300 font-mono">xtelify_db.finops_datasets</code>.
            </span>
          </div>
          <button
            onClick={() => setIsDatasetManagerOpen(false)}
            className="px-4 py-1.5 bg-white/[0.08] hover:bg-white/[0.14] text-white rounded-lg transition-colors font-medium text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
