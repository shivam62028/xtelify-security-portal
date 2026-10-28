import React, { useRef } from "react";
import {
  CalendarRange,
  Plus,
  Upload,
  Copy,
  FolderOpen,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";

interface FinOpsEmptyStateCardProps {
  sectionName: string;
  fiscalYear: string;
  onCreateNew: () => void;
  onUploadExcel: (file: File) => void;
  onClonePrevious: () => void;
  createLabel?: string;
}

export const FinOpsEmptyStateCard: React.FC<FinOpsEmptyStateCardProps> = ({
  sectionName,
  fiscalYear,
  onCreateNew,
  onUploadExcel,
  onClonePrevious,
  createLabel,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadExcel(file);
      e.target.value = "";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto my-12 rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] text-center relative overflow-hidden"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />
      {/* Background glow effects */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top icon badge */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-950/40 text-emerald-300">
        <CalendarRange size={32} />
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-3">
        <Sparkles size={13} />
        <span>{fiscalYear} Timeline Isolated Scope</span>
      </div>

      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
        No FinOps data recorded for <span className="text-emerald-400 font-mono">{fiscalYear}</span> in {sectionName} yet.
      </h3>

      <p className="text-slate-400 text-xs sm:text-sm mt-2 max-w-lg mx-auto leading-relaxed">
        This fiscal year is completely isolated from historical records. Initialize it by adding entries manually, uploading a workbook, or cloning project templates with zeroed budgets.
      </p>

      {/* 3 Quick Action Buttons */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs text-left">
        {/* Action 1: Create New */}
        <button
          onClick={onCreateNew}
          className="group p-4 rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/[0.1] hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all flex flex-col justify-between cursor-pointer shadow-md hover:shadow-emerald-950/30"
        >
          <div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 mb-3 group-hover:scale-110 transition-transform">
              <Plus size={18} />
            </div>
            <div className="font-bold text-white text-sm mb-1">
              {createLabel || `+ Create New ${sectionName} Entry`}
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Start fresh by configuring custom items and budgets for {fiscalYear}.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-emerald-400 group-hover:translate-x-0.5 transition-transform">
            <span>Create</span>
            <ArrowRight size={13} />
          </div>
        </button>

        {/* Action 2: Upload Excel */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="group p-4 rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/[0.1] hover:border-teal-500/50 hover:bg-teal-500/10 transition-all flex flex-col justify-between cursor-pointer shadow-md hover:shadow-teal-950/30"
        >
          <div>
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 mb-3 group-hover:scale-110 transition-transform">
              <Upload size={18} />
            </div>
            <div className="font-bold text-white text-sm mb-1">
              Upload {fiscalYear} Excel Sheet
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Ingest workbook worksheets directly into this fiscal timeline.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-teal-400 group-hover:translate-x-0.5 transition-transform">
            <span>Upload</span>
            <ArrowRight size={13} />
          </div>
        </button>

        {/* Action 3: Clone Category Structure */}
        <button
          onClick={onClonePrevious}
          className="group p-4 rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/[0.1] hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all flex flex-col justify-between cursor-pointer shadow-md hover:shadow-indigo-950/30"
        >
          <div>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 mb-3 group-hover:scale-110 transition-transform">
              <Copy size={18} />
            </div>
            <div className="font-bold text-white text-sm mb-1">
              Clone Category Structure
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Copy project hierarchy with all amounts reset to ₹0.00 Cr.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-indigo-400 group-hover:translate-x-0.5 transition-transform">
            <span>Clone (₹0)</span>
            <ArrowRight size={13} />
          </div>
        </button>
      </div>
    </motion.div>
  );
};
