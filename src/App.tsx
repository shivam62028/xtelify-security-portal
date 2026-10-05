import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  Component,
  useCallback,
} from "react";
import type { ErrorInfo, ReactNode } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import Tilt from "react-parallax-tilt";
import CountUpMod from "react-countup";
const CountUpComponent: any = (CountUpMod as any).default || CountUpMod;
import { motion } from "framer-motion";
import {
  Shield,
  AlertTriangle,
  Clock,
  Filter,
  Download,
  Upload,
  Flame,
  ArrowRight,
  Activity,
  FileText,
  ChevronDown,
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
  Zap,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Sparkles,
  Copy,
  RefreshCw,
  Bug,
  Share2,
  CheckCircle,
  // richyrik: Icons for LandingPage + FinOps dashboard navigation
  Home,
  DollarSign,
  BarChart3,
  ArrowLeft,
  Wallet,
  CreditCard,
  Receipt,
  TrendingDown,
  Database,
  Plus,
  Edit2,
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
  // richyrik: ComposedChart + Line needed for the ClosurePct trend overlay
  ComposedChart,
  Line,
} from "recharts";

const BACKEND_URL = (() => {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://127.0.0.1:8000";
  }
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

interface AiRemediationResult {
  AI_Summary: string;
  AI_RootCause: string;
  AI_Impact: string;
  AI_Remediation: string[];
  AI_Validation: string[];
  AI_Priority: string;
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


const CalendarView: React.FC<{ darkMode: boolean; onViewUpload: (batch: string) => void }> = ({ darkMode, onViewUpload }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [viewType, setViewType] = useState<"Vulnerabilities" | "Uploads">("Vulnerabilities");

  const [monthlyActivity, setMonthlyActivity] = useState<Record<string, { vulnerabilities: number, uploads: number }>>({});
  const [dailyVulns, setDailyVulns] = useState<any>(null);
  const [dailyUploads, setDailyUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const handleDeleteDataset = async (batch: string) => {
    if (!window.confirm(`Are you sure you want to delete dataset "${batch}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/dataset?batch_id=${encodeURIComponent(batch)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete dataset");
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      alert("Error deleting dataset: " + err.message);
    }
  };

  useEffect(() => {
    const fetchMonthly = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/calendar/activity?year=${year}&month=${month}`);
        if (!res.ok) throw new Error("MongoDB is currently unavailable or returned an error.");
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setMonthlyActivity(data);
        setError(null);
      } catch (err: any) {
        setError("Unable to load calendar activity. " + (err.message || "MongoDB is currently unavailable."));
      }
    };
    fetchMonthly();
  }, [year, month, refreshKey]);

  useEffect(() => {
    if (!selectedDate) return;
    const fetchDaily = async () => {
      setLoading(true);
      setError(null);

      const tzoffset = selectedDate.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(selectedDate.getTime() - tzoffset)).toISOString().slice(0, 10);

      try {
        if (viewType === "Vulnerabilities") {
          const res = await fetch(`${BACKEND_URL}/api/calendar/vulnerabilities?date=${localISOTime}`);
          if (!res.ok) throw new Error("MongoDB is currently unavailable.");
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          setDailyVulns(data);
        } else {
          const res = await fetch(`${BACKEND_URL}/api/calendar/uploads?date=${localISOTime}`);
          if (!res.ok) throw new Error("MongoDB is currently unavailable.");
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          setDailyUploads(data);
        }
      } catch (err: any) {
        setError("Unable to load details. " + (err.message || "MongoDB is currently unavailable."));
      } finally {
        setLoading(false);
      }
    };
    fetchDaily();
  }, [selectedDate, viewType, refreshKey]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const prevMonth = () => setCurrentDate(new Date(year, month - 2, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month, 1));

  return (
    <div className={`mt-6 p-6 rounded-lg ${darkMode ? "bg-slate-800" : "bg-white border border-slate-200"}`}>
      <div className="flex flex-col md:flex-row gap-8">

        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>Calendar / Activity</h2>
            <div className={`flex rounded-lg overflow-hidden border ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
              <button
                onClick={() => setViewType("Vulnerabilities")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${viewType === "Vulnerabilities" ? (darkMode ? "bg-purple-600 text-white" : "bg-purple-100 text-purple-700") : (darkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-50 text-slate-600 hover:bg-slate-100")}`}
              >
                Vulnerabilities
              </button>
              <button
                onClick={() => setViewType("Uploads")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${viewType === "Uploads" ? (darkMode ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700") : (darkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-50 text-slate-600 hover:bg-slate-100")}`}
              >
                Dataset Uploads
              </button>
            </div>
          </div>

          <div className={`p-5 rounded-lg border ${darkMode ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className={`p-2 rounded-full ${darkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-200 text-slate-600"}`}>
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-2">
                <select
                  value={month - 1}
                  onChange={(e) => setCurrentDate(new Date(year, parseInt(e.target.value), 1))}
                  className={`bg-transparent font-bold text-lg outline-none cursor-pointer ${darkMode ? "text-white" : "text-slate-800"}`}
                >
                  {monthNames.map((m, i) => <option key={m} value={i} className={darkMode ? "bg-slate-800" : ""}>{m}</option>)}
                </select>
                <select
                  value={year}
                  onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), month - 1, 1))}
                  className={`bg-transparent font-bold text-lg outline-none cursor-pointer ${darkMode ? "text-white" : "text-slate-800"}`}
                >
                  {Array.from({ length: 10 }, (_, i) => year - 5 + i).map(y => <option key={y} value={y} className={darkMode ? "bg-slate-800" : ""}>{y}</option>)}
                </select>
              </div>
              <button onClick={nextMonth} className={`p-2 rounded-full ${darkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-200 text-slate-600"}`}>
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className={`text-center text-xs font-semibold py-2 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {blanks.map(b => <div key={`blank-${b}`} className="h-14"></div>)}
              {days.map(d => {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isSelected = selectedDate?.getDate() === d && selectedDate?.getMonth() + 1 === month && selectedDate?.getFullYear() === year;
                const isToday = new Date().getDate() === d && new Date().getMonth() + 1 === month && new Date().getFullYear() === year;
                const act = monthlyActivity[dateStr];

                return (
                  <div
                    key={d}
                    onClick={() => setSelectedDate(new Date(year, month - 1, d))}
                    className={`h-14 rounded-md border flex flex-col items-center justify-start pt-1 cursor-pointer transition-colors
                      ${isSelected ? (darkMode ? "bg-slate-700 border-purple-500" : "bg-purple-50 border-purple-400") : (darkMode ? "bg-slate-800 border-slate-700 hover:bg-slate-700" : "bg-white border-slate-200 hover:bg-slate-50")}
                      ${isToday && !isSelected ? (darkMode ? "border-blue-500" : "border-blue-400") : ""}
                    `}
                  >
                    <span className={`text-sm font-medium ${isToday ? (darkMode ? "text-blue-400" : "text-blue-600") : (darkMode ? "text-slate-300" : "text-slate-700")}`}>{d}</span>
                    <div className="flex gap-1 mt-auto pb-1">
                      {act?.vulnerabilities > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-500" title={`${act.vulnerabilities} vulnerabilities`}></div>}
                      {act?.uploads > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title={`${act.uploads} uploads`}></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={`flex-1 p-6 rounded-lg border ${darkMode ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
          {error ? (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${darkMode ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-red-50 text-red-600 border border-red-100"}`}>
              <AlertTriangle size={24} />
              <p className="font-medium text-sm">{error}</p>
            </div>
          ) : selectedDate ? (
            <>
              <h3 className={`text-lg font-semibold mb-6 flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-800"}`}>
                <CalendarDays size={20} className={darkMode ? "text-purple-400" : "text-purple-600"} />
                {selectedDate.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>

              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                </div>
              ) : viewType === "Vulnerabilities" ? (
                <div>
                  {!dailyVulns || dailyVulns.total === 0 ? (
                    <p className={`text-center py-10 ${darkMode ? "text-slate-500" : "text-slate-500"}`}>No vulnerabilities uploaded on this date.</p>
                  ) : (
                    <div className="space-y-6">
                      <div className={`p-4 rounded-lg flex items-center justify-between ${darkMode ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-200 shadow-sm"}`}>
                        <span className={`text-sm font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Total Vulnerabilities</span>
                        <span className={`text-2xl font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>{dailyVulns.total.toLocaleString()}</span>
                      </div>

                      <div>
                        <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Severity Breakdown</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          {["Critical", "High", "Medium", "Low", "Info"].map(sev => (
                            <div key={sev} className={`p-3 rounded-lg text-center border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"}`}>
                              <p className={`text-xs mb-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{sev}</p>
                              <p className={`text-lg font-bold ${sev === "Critical" ? "text-red-500" :
                                sev === "High" ? "text-orange-500" :
                                  sev === "Medium" ? "text-amber-500" :
                                    sev === "Low" ? "text-green-500" : "text-blue-500"
                                }`}>{dailyVulns.severity[sev]?.toLocaleString() || 0}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Source Format</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { k: "CSPM", l: "CSPM" },
                            { k: "VAPT", l: "VAPT" },
                            { k: "CONTAINER", l: "Container" },
                            { k: "SAST_DAST", l: "SAST/DAST" }
                          ].map(fmt => (
                            <div key={fmt.k} className={`p-3 rounded-lg flex items-center justify-between border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"}`}>
                              <span className={`text-sm font-medium ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{fmt.l}</span>
                              <span className={`text-base font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>{dailyVulns.formats[fmt.k]?.toLocaleString() || 0}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <HistoricalAnalyticsModule darkMode={darkMode} selectedDate={selectedDate} />
              )}
            </>
          ) : (
            <p className={`text-center py-10 ${darkMode ? "text-slate-500" : "text-slate-500"}`}>Select a date to view activity</p>
          )}
        </div>
      </div>
    </div>
  );
};

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

const HistoricalAnalyticsModule: React.FC<{ darkMode: boolean; selectedDate: Date | null }> = ({ darkMode, selectedDate }) => {
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['Container', 'VAPT', 'CSPM', 'SAST_DAST']);
  const [startDateStr, setStartDateStr] = useState<string>('');
  const [endDateStr, setEndDateStr] = useState<string>('');
  const [viewMode, setViewMode] = useState<'Daily' | 'Cumulative'>('Daily');
  // richyrik: time-grouping for weekly/monthly closure % trend
  const [timeGrouping, setTimeGrouping] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const [loading, setLoading] = useState(false);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);

  const [ownerData, setOwnerData] = useState<any[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
  const [ownerTimeline, setOwnerTimeline] = useState<any[]>([]);
  const [ownerSummary, setOwnerSummary] = useState<any>({});
  const [ownerLoading, setOwnerLoading] = useState(false);

  const [compareMode, setCompareMode] = useState(false);
  const [compareBatches, setCompareBatches] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const formatQuery = selectedFormats.length > 0 ? `formats=${selectedFormats.join(',')}` : '';
      const startQuery = startDateStr ? `start_date=${startDateStr}` : '';
      const endQuery = endDateStr ? `end_date=${endDateStr}` : '';
      const batchesQuery = selectedDatasets.length > 0 ? `upload_batches=${selectedDatasets.join('||')}` : '';

      // richyrik: Pass time_grouping so the backend buckets data correctly
      const queryParams = [formatQuery, startQuery, endQuery, batchesQuery, `mode=${viewMode}`, `time_grouping=${timeGrouping}`].filter(Boolean).join('&');

      const [histRes, dsRes, ownersRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/analytics/historical?${queryParams}`),
        fetch(`${BACKEND_URL}/api/analytics/datasets?${queryParams}`),
        fetch(`${BACKEND_URL}/api/analytics/owners?${queryParams}`)
      ]);

      if (histRes.ok) {
        const hData = await histRes.json();
        setChartData(hData.chartData || []);
        setSummary(hData.summary || {});
      }
      if (dsRes.ok) {
        const dData = await dsRes.json();
        setDatasets(dData || []);
      }
      if (ownersRes.ok) {
        const oData = await ownersRes.json();
        setOwnerData(oData.ownerData || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      const d = selectedDate.toISOString().split('T')[0];
      setStartDateStr(d);
      setEndDateStr(d);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedFormats, startDateStr, endDateStr, viewMode, timeGrouping, selectedDatasets]);

  useEffect(() => {
    if (!selectedOwner) return;
    const fetchOwner = async () => {
      setOwnerLoading(true);
      try {
        const formatQuery = selectedFormats.length > 0 ? `formats=${selectedFormats.join(',')}` : '';
        const startQuery = startDateStr ? `start_date=${startDateStr}` : '';
        const endQuery = endDateStr ? `end_date=${endDateStr}` : '';
        const batchesQuery = selectedDatasets.length > 0 ? `upload_batches=${selectedDatasets.join('||')}` : '';

        const queryParams = [formatQuery, startQuery, endQuery, batchesQuery, `mode=${viewMode}`, `owner=${encodeURIComponent(selectedOwner)}`].filter(Boolean).join('&');

        const res = await fetch(`${BACKEND_URL}/api/analytics/owners?${queryParams}`);
        if (res.ok) {
          const data = await res.json();
          setOwnerTimeline(data.chartData || []);
          setOwnerSummary(data.summary || {});
        }
      } catch (e) {
        console.error(e);
      } finally {
        setOwnerLoading(false);
      }
    };
    fetchOwner();
  }, [selectedOwner, selectedFormats, startDateStr, endDateStr, viewMode, selectedDatasets]);

  const toggleFormat = (fmt: string) => {
    setSelectedFormats(prev => prev.includes(fmt) ? prev.filter(f => f !== fmt) : [...prev, fmt]);
  };

  const toggleDataset = (batch: string) => {
    setSelectedDatasets(prev => prev.includes(batch) ? prev.filter(b => b !== batch) : [...prev, batch]);
  };

  const handleCompare = async () => {
    if (compareBatches.length !== 2) return;
    setCompareLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/analytics/compare?batch1=${compareBatches[0]}&batch2=${compareBatches[1]}`);
      if (res.ok) {
        setCompareData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCompareLoading(false);
    }
  };

  const handleShare = (type: 'data' | 'graph' | 'both') => {
    const subject = encodeURIComponent(`Security Report for ${selectedOwner}`);
    let bodyText = `Analytics for ${selectedOwner} (${startDateStr || 'Start'} to ${endDateStr || 'End'}):\n\n`;
    bodyText += `Total: ${ownerSummary.Total || 0}\n`;
    bodyText += `Resolved: ${ownerSummary.Resolved || 0}\n`;
    bodyText += `Unresolved: ${ownerSummary.Unresolved || 0}\n`;
    bodyText += `Critical: ${ownerSummary.Critical || 0}\n`;
    bodyText += `High: ${ownerSummary.High || 0}\n\n`;

    if (type === 'graph' || type === 'both') {
      bodyText += `Please see the attached/included graph for vulnerability trends.\n\n`;
    }

    bodyText += `View full report in Xtelify Security Portal.`;
    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
  };

  return (
    <div className={`p-6 rounded-lg border ${darkMode ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          {[{ k: 'CONTAINER', l: 'Container' }, { k: 'VAPT', l: 'VAPT' }, { k: 'CSPM', l: 'CSPM' }, { k: 'SAST_DAST', l: 'SAST/DAST' }].map(f => (
            <button
              key={f.k}
              onClick={() => toggleFormat(f.k)}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${selectedFormats.includes(f.k) ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800') : (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600')}`}
            >
              {f.l}
            </button>
          ))}
          <button onClick={() => setSelectedFormats(['CONTAINER', 'VAPT', 'CSPM', 'SAST_DAST'])} className={`px-2 text-xs underline ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>All</button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input type="date" value={startDateStr} onChange={(e) => setStartDateStr(e.target.value)} className={`px-2 py-1 text-sm rounded border ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"}`} />
            <span className={darkMode ? "text-slate-400" : "text-slate-500"}>to</span>
            <input type="date" value={endDateStr} onChange={(e) => setEndDateStr(e.target.value)} className={`px-2 py-1 text-sm rounded border ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"}`} />
          </div>
          <div className="flex bg-slate-200 dark:bg-slate-800 rounded p-1">
            <button onClick={() => setViewMode('Daily')} className={`px-3 py-1 text-xs font-bold rounded ${viewMode === 'Daily' ? 'bg-white dark:bg-slate-700 shadow' : 'text-slate-500'}`}>Daily</button>
            <button onClick={() => setViewMode('Cumulative')} className={`px-3 py-1 text-xs font-bold rounded ${viewMode === 'Cumulative' ? 'bg-white dark:bg-slate-700 shadow' : 'text-slate-500'}`}>Cumulative</button>
          </div>
          {/* richyrik: Time-grouping toggle — controls daily/weekly/monthly bucketing and ClosurePct trend */}
          <div className="flex bg-slate-200 dark:bg-slate-800 rounded p-1 ml-1">
            <button
              onClick={() => setTimeGrouping('daily')}
              className={`px-3 py-1 text-xs font-bold rounded ${timeGrouping === 'daily' ? 'bg-white dark:bg-slate-700 shadow text-blue-600' : 'text-slate-500'}`}
            >Day</button>
            <button
              onClick={() => setTimeGrouping('weekly')}
              className={`px-3 py-1 text-xs font-bold rounded ${timeGrouping === 'weekly' ? 'bg-white dark:bg-slate-700 shadow text-blue-600' : 'text-slate-500'}`}
            >Week</button>
            <button
              onClick={() => setTimeGrouping('monthly')}
              className={`px-3 py-1 text-xs font-bold rounded ${timeGrouping === 'monthly' ? 'bg-white dark:bg-slate-700 shadow text-blue-600' : 'text-slate-500'}`}
            >Month</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-lg border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
          <p className="text-xs text-slate-500 font-bold uppercase">Total Datasets</p>
          <p className="text-2xl font-bold">{summary.totalDatasets || 0}</p>
        </div>
        <div className={`p-4 rounded-lg border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
          <p className="text-xs text-slate-500 font-bold uppercase">Vulnerabilities</p>
          <p className="text-2xl font-bold">{summary.totalVulnerabilities || 0}</p>
        </div>
        <div className={`p-4 rounded-lg border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
          <p className="text-xs text-green-500 font-bold uppercase">Resolved</p>
          <p className="text-2xl font-bold text-green-500">{summary.resolved || 0}</p>
        </div>
        <div className={`p-4 rounded-lg border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
          <p className="text-xs text-red-500 font-bold uppercase">Unresolved</p>
          <p className="text-2xl font-bold text-red-500">{summary.unresolved || 0}</p>
        </div>
      </div>

      {viewMode === 'Cumulative' && (
        <p className={`text-sm italic mb-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Current cumulative totals as of {endDateStr || new Date().toISOString().split('T')[0]}</p>
      )}

      <div id="vulnerability-history-chart" className={`h-72 mb-6 p-4 rounded-lg border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
        {/* richyrik: ClosurePct label above chart */}
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] font-semibold uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Vulnerability Trend
          </span>
          <span className={`text-[10px] font-semibold ${darkMode ? 'text-violet-400' : 'text-violet-600'}`}>
            — Closure % ({timeGrouping})
          </span>
        </div>
        {loading ? <div className="h-full flex items-center justify-center">Loading...</div> : (
          <ResponsiveContainer width="100%" height="100%">
            {/* richyrik: ComposedChart lets us overlay the ClosurePct Line on the stacked Area */}
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
              <XAxis dataKey="date" stroke={darkMode ? "#94a3b8" : "#64748b"} fontSize={11} />
              {/* richyrik: Left axis for raw counts, right axis for closure % (0–100) */}
              <YAxis yAxisId="left" stroke={darkMode ? "#94a3b8" : "#64748b"} fontSize={11} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="#7c3aed" fontSize={11} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#fff', borderRadius: '8px' }}
                formatter={(value: any, name: string) => name === 'ClosurePct' ? [`${value}%`, 'Closure %'] : [value, name]}
              />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="Unresolved" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
              <Area yAxisId="left" type="monotone" dataKey="Resolved" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
              {/* richyrik: Closure % trend line on secondary right axis */}
              <Line isAnimationActive={true} yAxisId="right" type="monotone" dataKey="ClosurePct" stroke="#7c3aed" strokeWidth={2} dot={false} name="Closure %" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex justify-between items-center mb-4 mt-8">
        <h3 className="font-bold text-lg">Owner-wise Analytics</h3>
      </div>

      {!selectedOwner ? (
        <div className={`p-4 rounded-lg border h-80 mb-6 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
          {loading ? <div className="h-full flex items-center justify-center">Loading...</div> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ownerData} onClick={(data) => {
                if (data?.activeLabel) setSelectedOwner(String(data.activeLabel));
              }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
                <XAxis dataKey="Owner" stroke={darkMode ? "#94a3b8" : "#64748b"} fontSize={12} />
                <YAxis stroke={darkMode ? "#94a3b8" : "#64748b"} fontSize={12} />
                <RechartsTooltip contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#fff', borderRadius: '8px' }} cursor={{ fill: darkMode ? '#334155' : '#f1f5f9' }} />
                <Legend />
                <Bar isAnimationActive={true} dataKey="Resolved" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
                <Bar isAnimationActive={true} dataKey="Unresolved" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      ) : (
        <div className={`p-4 rounded-lg border mb-6 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-lg">{selectedOwner}'s Analytics</h4>
            <div className="flex gap-2">
              <button className={`px-3 py-1.5 rounded text-sm font-bold flex items-center gap-1 ${darkMode ? "bg-slate-700 text-blue-400 hover:bg-slate-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`} onClick={() => handleShare('data')}>
                Share Data
              </button>
              <button className={`px-3 py-1.5 rounded text-sm font-bold flex items-center gap-1 ${darkMode ? "bg-slate-700 text-blue-400 hover:bg-slate-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`} onClick={() => handleShare('graph')}>
                Share Graph
              </button>
              <button className={`px-3 py-1.5 rounded text-sm font-bold flex items-center gap-1 ${darkMode ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-blue-600 text-white hover:bg-blue-700"}`} onClick={() => handleShare('both')}>
                Share Both
              </button>
              <button className={`px-3 py-1.5 rounded text-sm font-bold ${darkMode ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`} onClick={() => setSelectedOwner(null)}>
                Back
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {['Total', 'Resolved', 'Unresolved', 'Critical', 'High'].map(k => (
              <div key={k} className={`p-3 rounded-lg border ${darkMode ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                <p className="text-xs text-slate-500 font-bold uppercase">{k}</p>
                <p className={`text-xl font-bold ${k === 'Resolved' ? 'text-green-500' : k === 'Unresolved' || k === 'Critical' ? 'text-red-500' : ''}`}>{ownerSummary[k] || 0}</p>
              </div>
            ))}
          </div>

          <div className={`h-64 p-4 rounded-lg border ${darkMode ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            {ownerLoading ? <div className="h-full flex items-center justify-center">Loading...</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ownerTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
                  <XAxis dataKey="date" stroke={darkMode ? "#94a3b8" : "#64748b"} fontSize={12} />
                  <YAxis stroke={darkMode ? "#94a3b8" : "#64748b"} fontSize={12} />
                  <RechartsTooltip contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#fff', borderRadius: '8px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="Unresolved" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="Resolved" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Datasets in Range</h3>
        <button onClick={() => setCompareMode(!compareMode)} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded text-sm font-bold">Compare Datasets</button>
      </div>

      {compareMode && (
        <div className={`mb-6 p-4 rounded-lg border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-purple-50 border-purple-200"}`}>
          <h4 className="font-bold mb-2">Select exactly 2 datasets to compare:</h4>
          <div className="flex gap-2 mb-4">
            {compareBatches.map(b => <span key={b} className="bg-purple-200 text-purple-800 px-2 py-1 rounded text-xs">{b}</span>)}
          </div>
          <button onClick={handleCompare} disabled={compareBatches.length !== 2 || compareLoading} className="px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50">Run Comparison</button>

          {compareData && (
            <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded">
              <div className="flex gap-4 mb-4 font-bold text-sm">
                <span className="text-red-500">New: {compareData.summary.NewFindings}</span>
                <span className="text-green-500">Resolved: {compareData.summary.ResolvedFindings}</span>
                <span className="text-orange-500">Still Open: {compareData.summary.StillOpen}</span>
                <span className="text-slate-500">No Longer Present: {compareData.summary.NoLongerPresent}</span>
              </div>
              <div className="max-h-64 overflow-y-auto text-sm">
                <table className="w-full text-left">
                  <thead><tr><th className="p-2 border-b">Issue</th><th className="p-2 border-b">Change</th></tr></thead>
                  <tbody>
                    {compareData.comparison.map((c: any, i: number) => (
                      <tr key={i} className="border-b dark:border-slate-800">
                        <td className="p-2">{c.Title}</td>
                        <td className={`p-2 font-bold ${c.Change.includes('New') ? 'text-red-500' : c.Change.includes('Resolved') ? 'text-green-500' : 'text-slate-500'}`}>{c.Change}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`rounded-lg border overflow-hidden ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
        <table className="w-full text-left text-sm">
          <thead className={darkMode ? "bg-slate-800" : "bg-slate-100"}>
            <tr>
              <th className="p-3">Select</th>
              <th className="p-3">Dataset</th>
              <th className="p-3">Format</th>
              <th className="p-3">Records</th>
              <th className="p-3">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {datasets.map((d, i) => (
              <tr key={i} className={`border-b ${darkMode ? "border-slate-700 hover:bg-slate-800" : "hover:bg-slate-50"}`}>
                <td className="p-3">
                  {compareMode ? (
                    <input type="checkbox" checked={compareBatches.includes(d.UploadBatch)} onChange={(e) => {
                      if (e.target.checked) {
                        if (compareBatches.length < 2) setCompareBatches([...compareBatches, d.UploadBatch]);
                      } else {
                        setCompareBatches(compareBatches.filter(b => b !== d.UploadBatch));
                      }
                    }} />
                  ) : (
                    <input type="checkbox" checked={selectedDatasets.includes(d.UploadBatch)} onChange={() => toggleDataset(d.UploadBatch)} />
                  )}
                </td>
                <td className="p-3 font-semibold">
                  <div className="flex items-center gap-2">
                    {d.FileName || d.UploadBatch}
                    {d.DeletedAt && (
                      <span
                        className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] rounded font-bold border border-red-200"
                        title={`Deleted on ${new Date(d.DeletedAt).toLocaleDateString()}`}
                      >
                        DELETED
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3">{d.SourceFormat}</td>
                <td className="p-3">{d.RecordCount}</td>
                <td className="p-3">{new Date(d.UploadedAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {datasets.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">No datasets found in this range.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// richyrik: LANDING PAGE — full-screen 3D module selector
// ─────────────────────────────────────────────────────────────────────────────
const LandingPage: React.FC<{ onNavigate: (m: 'cloudops' | 'finops') => void }> = ({ onNavigate }) => {
  const [hovered, setHovered] = useState<'cloudops' | 'finops' | null>(null);

  const cards = [
    {
      id: 'cloudops' as const,
      icon: <Shield size={48} className="text-purple-400" />,
      title: 'Cloud Ops & Security',
      subtitle: 'Vulnerability Management Platform',
      description:
        'Monitor, triage and remediate security vulnerabilities across Container, VAPT, CSPM and SAST/DAST workloads. Track SLA breach, assign owners and drive closure.',
      gradient: 'from-purple-900/80 via-slate-900/90 to-slate-900/95',
      glow: 'hover:shadow-purple-500/40',
      ring: 'hover:ring-purple-500/50',
      accent: 'bg-purple-500',
      tag: 'ACTIVE',
      tagColor: 'bg-purple-500/20 text-purple-300 ring-purple-500/30',
      stats: [
        { label: 'Issues Tracked', value: '∞' },
        { label: 'Formats', value: '4' },
        { label: 'Integrations', value: 'Outlook' },
      ],
    },
    {
      id: 'finops' as const,
      icon: <DollarSign size={48} className="text-emerald-400" />,
      title: 'FinOps',
      subtitle: 'Financial Observability Dashboard',
      description:
        'Track cloud billing across GCP & AWS, monitor credit consumption, manage NFA/GBPA approvals and align actual spend against Annual Operating Plan budgets.',
      gradient: 'from-emerald-900/80 via-slate-900/90 to-slate-900/95',
      glow: 'hover:shadow-emerald-500/40',
      ring: 'hover:ring-emerald-500/50',
      accent: 'bg-emerald-500',
      tag: 'NEW',
      tagColor: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
      stats: [
        { label: 'Cloud Providers', value: '2' },
        { label: 'Credit Pools', value: 'GCP+AWS' },
        { label: 'Budget View', value: 'AOP' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden relative">
      {/* richyrik: Animated grid background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      {/* richyrik: Ambient Orbiting Blobs background wrapper */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600 blur-[120px] rounded-full opacity-30 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600 blur-[120px] rounded-full opacity-30 animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-emerald-600 blur-[120px] rounded-full opacity-20 animate-pulse" style={{ animationDuration: '8s' }} />
      </div>

      {/* richyrik: Header branding */}
      <div className="relative z-10 mb-14 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img src="/airtel-logo.svg" alt="Airtel" className="h-10 w-auto opacity-90" />
          <div className="h-8 w-px bg-slate-600" />
          <span className="text-slate-300 font-semibold text-xl tracking-tight">Wynk Cloud Portal</span>
        </div>
        <p className="text-slate-500 text-sm font-medium tracking-widest uppercase">
          Select a module to continue
        </p>
        <div className="mt-3 h-px w-40 mx-auto bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
      </div>

      {/* richyrik: Module cards */}
      <div className="relative z-10 flex flex-col md:flex-row gap-8 w-full max-w-5xl">
        {cards.map((card) => (
          <Tilt
            key={card.id}
            glareEnable={true}
            glareMaxOpacity={0.4}
            glareColor="white"
            glarePosition="all"
            tiltMaxAngleX={10}
            tiltMaxAngleY={10}
            className="flex-1 flex"
          >
            <button
              onClick={() => onNavigate(card.id)}
              onMouseEnter={() => setHovered(card.id)}
              onMouseLeave={() => setHovered(null)}
              className={[
                'w-full text-left rounded-2xl border p-8 cursor-pointer transition-all duration-500 outline-none',
                // richyrik: glassmorphism + 3D lift on hover
                'bg-gradient-to-br backdrop-blur-md',
                card.gradient,
                'border-slate-700/60',
                `ring-2 ring-transparent ${card.ring}`,
                `shadow-2xl ${card.glow}`,
                hovered === card.id
                  ? '-translate-y-4 scale-105'
                  : 'translate-y-0 scale-100',
              ].join(' ')}
              style={{ transform: hovered === card.id ? 'translateY(-16px) scale(1.04) rotateX(2deg)' : 'translateY(0) scale(1) rotateX(0deg)', transformStyle: 'preserve-3d', perspective: '1000px', transition: 'all 0.45s cubic-bezier(0.23,1,0.32,1)' }}
            >
              {/* richyrik: Shimmer bar at top of card */}
              <div className={`h-1 w-full rounded-full mb-7 ${card.id === 'cloudops' ? 'bg-gradient-to-r from-purple-600 via-violet-400 to-purple-600' : 'bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-600'}`} />

              <div className="flex items-start justify-between mb-6">
                <div className={`p-3 rounded-xl ${card.id === 'cloudops' ? 'bg-purple-500/10 ring-1 ring-purple-500/30' : 'bg-emerald-500/10 ring-1 ring-emerald-500/30'}`}>
                  {card.icon}
                </div>
                <span className={`text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full ring-1 ${card.tagColor}`}>
                  {card.tag}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-1">{card.title}</h2>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-4 ${card.id === 'cloudops' ? 'text-purple-400' : 'text-emerald-400'}`}>
                {card.subtitle}
              </p>
              <p className="text-slate-400 text-sm leading-relaxed mb-7">{card.description}</p>

              {/* richyrik: Quick stats row */}
              <div className="grid grid-cols-3 gap-3 mb-7">
                {card.stats.map((s) => (
                  <div key={s.label} className="bg-slate-800/60 rounded-lg p-2.5 text-center">
                    <div className="text-white font-bold text-sm">{s.value}</div>
                    <div className="text-slate-500 text-[10px] mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className={`flex items-center gap-2 text-sm font-semibold ${card.id === 'cloudops' ? 'text-purple-400' : 'text-emerald-400'}`}>
                Enter Module <ArrowRight size={15} className={`transition-transform duration-300 ${hovered === card.id ? 'translate-x-1.5' : ''}`} />
              </div>
            </button>
          </Tilt>
        ))}
      </div>

      {/* richyrik: Footer */}
      <p className="relative z-10 mt-14 text-slate-600 text-xs">
        Wynk Cloud Portal · v2.0 · {new Date().getFullYear()}
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// richyrik: FINOPS DATA EDITOR MODAL
// ─────────────────────────────────────────────────────────────────────────────
const FinOpsDataEditorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  onSave: (newData: any[]) => void;
}> = ({ isOpen, onClose, title, data, onSave }) => {
  const [localData, setLocalData] = useState<any[]>([...data]);
  
  useEffect(() => {
    if (isOpen) {
      setLocalData([...data]);
    }
  }, [isOpen, data]);

  if (!isOpen) return null;

  const columns = localData.length > 0 ? Object.keys(localData[0]) : [];
  
  const handleUpdate = (rowIndex: number, col: string, value: string) => {
    const newData = [...localData];
    // Attempt to parse as number if it looks like one and isn't a date or string field we want to keep as string
    const isNum = !isNaN(Number(value)) && value.trim() !== '' && !col.toLowerCase().includes('date') && col !== 'month' && col !== 'quarter' && col !== 'id';
    newData[rowIndex] = { ...newData[rowIndex], [col]: isNum ? Number(value) : value };
    setLocalData(newData);
  };

  const handleAddRow = () => {
    const emptyRow: any = {};
    if (localData.length > 0) {
      columns.forEach(col => {
        const sample = localData[0][col];
        if (Array.isArray(sample)) {
          emptyRow[col] = [];
        } else if (typeof sample === 'number') {
          emptyRow[col] = 0;
        } else {
          emptyRow[col] = '';
        }
      });
    } else {
      columns.forEach(col => {
        emptyRow[col] = '';
      });
    }
    setLocalData([...localData, emptyRow]);
  };

  const handleRemoveRow = (index: number) => {
    setLocalData(localData.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <Database size={18} className="text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Manage Data: {title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 overflow-auto flex-1">
          <div className="bg-slate-950 rounded-lg ring-1 ring-slate-800 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-900/50">
                <tr>
                  {columns.map(col => (
                    <th key={col} className="px-4 py-3 font-semibold">{col}</th>
                  ))}
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {localData.map((row, idx) => (
                  <tr key={idx} className="border-t border-slate-800/50">
                    {columns.map(col => (
                      <td key={col} className="px-2 py-2">
                        {typeof row[col] === 'object' && row[col] !== null ? (
                          <span className="text-xs text-slate-500 italic">Complex object (unsupported here)</span>
                        ) : (
                          <input
                            type="text"
                            value={row[col] ?? ''}
                            onChange={(e) => handleUpdate(idx, col, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => handleRemoveRow(idx)} className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-400/10 rounded">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {localData.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">No data available. Add a row to get started. Note: Default columns won't be available if you delete all rows.</div>
            )}
          </div>
          <div className="mt-4 flex justify-between items-center">
            <button onClick={handleAddRow} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs font-medium transition-colors ring-1 ring-slate-700">
              <Plus size={14} /> Add Row
            </button>
          </div>
        </div>
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={() => { onSave(localData); onClose(); }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-emerald-500/20 transition-all">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// richyrik: FINOPS DASHBOARD — realistic dummy-data driven financial views
// ─────────────────────────────────────────────────────────────────────────────
const FinOpsDashboard: React.FC<{ onNavigateHome: () => void }> = ({ onNavigateHome }) => {
  const [activeSection, setActiveSection] = useState<'billing' | 'credits' | 'approvals' | 'aop'>('billing');
  const [darkMode] = useState(true);
  
  // richyrik: Mount state for animations
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const [billingData, setBillingData] = useState([
    { month: 'Jan', gcpPaid: 420000, gcpOpen: 38000, awsPaid: 180000, awsOpen: 22000 },
    { month: 'Feb', gcpPaid: 455000, gcpOpen: 42000, awsPaid: 195000, awsOpen: 18000 },
    { month: 'Mar', gcpPaid: 410000, gcpOpen: 55000, awsPaid: 210000, awsOpen: 31000 },
    { month: 'Apr', gcpPaid: 490000, gcpOpen: 33000, awsPaid: 225000, awsOpen: 14000 },
    { month: 'May', gcpPaid: 530000, gcpOpen: 61000, awsPaid: 240000, awsOpen: 27000 },
    { month: 'Jun', gcpPaid: 515000, gcpOpen: 45000, awsPaid: 255000, awsOpen: 19000 },
    { month: 'Jul', gcpPaid: 570000, gcpOpen: 72000, awsPaid: 270000, awsOpen: 35000 },
    { month: 'Aug', gcpPaid: 545000, gcpOpen: 58000, awsPaid: 260000, awsOpen: 41000 },
    { month: 'Sep', gcpPaid: 580000, gcpOpen: 49000, awsPaid: 275000, awsOpen: 22000 },
    { month: 'Oct', gcpPaid: 395000, gcpOpen: 88000, awsPaid: 185000, awsOpen: 47000 },
  ]);

  // richyrik: Credit tracker dummy data
  const [creditPools, setCreditPools] = useState([
    { provider: 'GCP', name: 'Committed Use Credits', allocated: 2500000, consumed: 1820000, color: '#4285F4' },
    { provider: 'GCP', name: 'Free Tier Credits', allocated: 300000, consumed: 287000, color: '#34A853' },
    { provider: 'AWS', name: 'Enterprise Discount Credits', allocated: 800000, consumed: 512000, color: '#FF9900' },
    { provider: 'AWS', name: 'Reserved Instance Savings', allocated: 450000, consumed: 390000, color: '#FF6B35' },
  ]);

  // richyrik: NFA/GBPA approvals dummy data
  const [approvalItems, setApprovalItems] = useState([
    { id: 'NFA-2024-001', type: 'NFA', title: 'GCP Committed Use — Wynk Music Infra', allocated: 2500000, consumed: 1820000, status: 'Approved', approvedBy: 'Finance Head', date: '2024-01-15', history: [{ action: 'Submitted', by: 'IT Ops', date: '2024-01-05' }, { action: 'Reviewed', by: 'Group CFO Office', date: '2024-01-10' }, { action: 'Approved', by: 'Finance Head', date: '2024-01-15' }] },
    { id: 'GBPA-2024-007', type: 'GBPA', title: 'AWS Reserved Instances Q2', allocated: 800000, consumed: 512000, status: 'Approved', approvedBy: 'CTO & CFO', date: '2024-04-02', history: [{ action: 'Submitted', by: 'Cloud FinOps', date: '2024-03-20' }, { action: 'Approved', by: 'CTO & CFO', date: '2024-04-02' }] },
    { id: 'NFA-2024-012', type: 'NFA', title: 'DR Infrastructure Scale-Up GCP', allocated: 600000, consumed: 120000, status: 'Pending Finance', approvedBy: '—', date: '—', history: [{ action: 'Submitted', by: 'DevOps Lead', date: '2024-09-18' }, { action: 'Under Review', by: 'Finance', date: '2024-09-25' }] },
    { id: 'GBPA-2024-009', type: 'GBPA', title: 'Multi-Cloud CDN Cost Optimization', allocated: 350000, consumed: 280000, status: 'Approved', approvedBy: 'VP Finance', date: '2024-06-10', history: [{ action: 'Submitted', by: 'Network Ops', date: '2024-06-01' }, { action: 'Approved', by: 'VP Finance', date: '2024-06-10' }] },
    { id: 'NFA-2024-015', type: 'NFA', title: 'SAST/DAST Tooling — Security Budget', allocated: 150000, consumed: 67000, status: 'Pending CTO', approvedBy: '—', date: '—', history: [{ action: 'Submitted', by: 'Security Team', date: '2024-10-01' }] },
  ]);

  // richyrik: AOP (Annual Operating Plan) dummy data
  const [aopData, setAopData] = useState([
    { quarter: 'Q1 2024', planned: 3200000, actual: 3085000 },
    { quarter: 'Q2 2024', planned: 3500000, actual: 3720000 },
    { quarter: 'Q3 2024', planned: 3800000, actual: 3650000 },
    { quarter: 'Q4 2024', planned: 4100000, actual: 3210000 },
  ]);

  const [isManageDataOpen, setIsManageDataOpen] = useState(false);

  const aopPlanned = aopData.reduce((s, d) => s + (Number(d.planned) || 0), 0);
  const aopActual = aopData.reduce((s, d) => s + (Number(d.actual) || 0), 0);
  const aopVariance = aopActual - aopPlanned;

  const fmt = (n: number) =>
    n >= 1000000 ? `₹${(n / 1000000).toFixed(2)}M` : n >= 1000 ? `₹${(n / 1000).toFixed(0)}K` : `₹${n}`;

  const nav = [
    { id: 'billing' as const, label: 'Billing Observability', icon: <Receipt size={15} /> },
    { id: 'credits' as const, label: 'Credit Tracker', icon: <CreditCard size={15} /> },
    { id: 'approvals' as const, label: 'NFA / GBPA', icon: <CheckCircle size={15} /> },
    { id: 'aop' as const, label: 'AOP Dashboard', icon: <Target size={15} /> },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      'Approved': 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
      'Pending Finance': 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
      'Pending CTO': 'bg-blue-500/15 text-blue-400 ring-blue-500/30',
    };
    return map[status] || 'bg-slate-500/15 text-slate-400 ring-slate-500/30';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* richyrik: FinOps Header */}
      <header className="bg-slate-900/80 border-b border-slate-800 backdrop-blur-sm px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800 border border-slate-700"
          >
            <Home size={14} /> Back to Home
          </button>
          <div className="h-6 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/15 rounded-lg ring-1 ring-emerald-500/30">
              <DollarSign size={18} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">FinOps Dashboard</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Financial Observability</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsManageDataOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 hover:text-indigo-200 rounded-lg ring-1 ring-indigo-500/30 transition-all text-sm font-medium"
          >
            <Edit2 size={14} /> Manage Data
          </button>
          <span className="text-xs text-slate-500">
            FY {new Date().getFullYear()} · Data as of {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* richyrik: FinOps left nav */}
        <nav className="w-56 shrink-0 bg-slate-900/60 border-r border-slate-800 p-4 flex flex-col gap-1 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setActiveSection(n.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                activeSection === n.id
                  ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {n.icon} {n.label}
            </button>
          ))}
          {/* richyrik: KPI summary sidebar cards */}
          <div className="mt-6 space-y-3">
            {[
              { label: 'YTD Cloud Spend', value: fmt(aopActual), sub: `vs ${fmt(aopPlanned)} planned`, color: aopActual > aopPlanned ? 'text-red-400' : 'text-emerald-400' },
              { label: 'Total Credits Left', value: fmt(creditPools.reduce((s, c) => s + (c.allocated - c.consumed), 0)), sub: 'across all pools', color: 'text-blue-400' },
              { label: 'Open Invoices', value: `₹${((billingData.reduce((s, d) => s + d.gcpOpen + d.awsOpen, 0)) / 1000).toFixed(0)}K`, sub: 'outstanding this year', color: 'text-amber-400' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-slate-800/60 rounded-lg p-3 ring-1 ring-slate-700">
                <div className={`text-base font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{kpi.label}</div>
                <div className={`text-[10px] mt-0.5 ${kpi.color}`}>{kpi.sub}</div>
              </div>
            ))}
          </div>
        </nav>

        {/* richyrik: Main content area */}
        <main className="flex-1 p-6 overflow-auto">

          {/* ── BILLING OBSERVABILITY ── */}
          {activeSection === 'billing' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">Billing Observability</h2>
                <p className="text-slate-400 text-sm mt-1">Month-by-month cloud spend — GCP & AWS split by Paid vs Outstanding invoices.</p>
              </div>
              {/* richyrik: Summary KPI row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total GCP Paid', value: billingData.reduce((s, d) => s + d.gcpPaid, 0), color: 'text-blue-400', bg: 'bg-blue-500/10 ring-blue-500/20' },
                  { label: 'GCP Outstanding', value: billingData.reduce((s, d) => s + d.gcpOpen, 0), color: 'text-amber-400', bg: 'bg-amber-500/10 ring-amber-500/20' },
                  { label: 'Total AWS Paid', value: billingData.reduce((s, d) => s + d.awsPaid, 0), color: 'text-orange-400', bg: 'bg-orange-500/10 ring-orange-500/20' },
                  { label: 'AWS Outstanding', value: billingData.reduce((s, d) => s + d.awsOpen, 0), color: 'text-red-400', bg: 'bg-red-500/10 ring-red-500/20' },
                ].map((k) => (
                  <div key={k.label} className={`rounded-xl p-4 ring-1 ${k.bg} bg-slate-900`}>
                    <div className={`text-2xl font-bold ${k.color}`}>
                      <CountUpComponent end={k.value} duration={2.5} separator="," formattingFn={(val) => fmt(val)} />
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{k.label}</div>
                  </div>
                ))}
              </div>
              {/* richyrik: Stacked BarChart */}
              <div className="bg-slate-900 ring-1 ring-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Monthly Cloud Spend Breakdown (₹)</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={billingData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} stroke="#64748b" fontSize={11} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                      formatter={(v: any, n: string) => [fmt(v), n]}
                    />
                    <Legend />
                    <Bar isAnimationActive={true} dataKey="gcpPaid" name="GCP Paid" stackId="gcp" fill="#4285F4" radius={[0, 0, 0, 0]} />
                    <Bar isAnimationActive={true} dataKey="gcpOpen" name="GCP Outstanding" stackId="gcp" fill="#93C5FD" radius={[4, 4, 0, 0]} />
                    <Bar isAnimationActive={true} dataKey="awsPaid" name="AWS Paid" stackId="aws" fill="#FF9900" radius={[0, 0, 0, 0]} />
                    <Bar isAnimationActive={true} dataKey="awsOpen" name="AWS Outstanding" stackId="aws" fill="#FCD34D" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── CREDIT DISCOUNT TRACKER ── */}
          {activeSection === 'credits' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">Credit Discount Tracker</h2>
                <p className="text-slate-400 text-sm mt-1">Total allocated credits vs. consumed — see what remains at a glance.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {creditPools.map((pool) => {
                  const pct = Math.min(100, Math.round((pool.consumed / pool.allocated) * 100));
                  const remaining = pool.allocated - pool.consumed;
                  const pieData = [
                    { name: 'Consumed', value: pool.consumed },
                    { name: 'Remaining', value: remaining },
                  ];
                  return (
                    <div key={pool.name} className="bg-slate-900 ring-1 ring-slate-800 rounded-xl p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{pool.provider}</span>
                          <h4 className="text-base font-semibold text-white mt-0.5">{pool.name}</h4>
                        </div>
                        <span
                          className={`text-sm font-bold px-2 py-0.5 rounded ${
                            pct >= 90 ? 'bg-red-500/20 text-red-400' : pct >= 70 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {pct}% used
                        </span>
                      </div>
                      {/* richyrik: Donut chart for credit visual */}
                      <div className="flex items-center gap-6">
                        <ResponsiveContainer width={130} height={130}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%" cy="50%"
                              innerRadius={42} outerRadius={60}
                              startAngle={90} endAngle={-270}
                              dataKey="value" stroke="none"
                            >
                              <Cell fill={pool.color} />
                              <Cell fill="#1e293b" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1">
                          <div className="space-y-2">
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-400">Consumed</span>
                                <span className="text-white font-semibold">{fmt(pool.consumed)}</span>
                              </div>
                              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pool.color }} />
                              </div>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Allocated</span>
                              <span className="text-slate-300">{fmt(pool.allocated)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Remaining</span>
                              <span className="text-emerald-400 font-semibold">{fmt(remaining)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── NFA / GBPA STATUS TRACKER ── */}
          {activeSection === 'approvals' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">NFA & GBPA Status Tracker</h2>
                <p className="text-slate-400 text-sm mt-1">Track active approval notes, consumed vs balance, and full approval history.</p>
              </div>
              <div className="space-y-4">
                {approvalItems.map((item) => {
                  const pct = Math.min(100, Math.round((item.consumed / item.allocated) * 100));
                  return (
                    <div key={item.id} className="bg-slate-900 ring-1 ring-slate-800 rounded-xl p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.type === 'NFA' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                              {item.type}
                            </span>
                            <span className="text-slate-500 text-xs font-mono">{item.id}</span>
                          </div>
                          <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${statusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      {/* richyrik: Consumed vs balance progress bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                          <span>Consumed: <span className="text-white font-medium">{fmt(item.consumed)}</span></span>
                          <span>Balance: <span className="text-emerald-400 font-medium">{fmt(item.allocated - item.consumed)}</span></span>
                          <span>Allocated: <span className="text-slate-300 font-medium">{fmt(item.allocated)}</span></span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${
                              pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${isMounted ? pct : 0}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">{pct}% consumed</div>
                      </div>
                      {/* richyrik: Approval history timeline */}
                      <div className="border-t border-slate-800 pt-3">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Approval History</div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1">
                          {item.history.map((h, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-xs">
                              <div className={`w-1.5 h-1.5 rounded-full ${idx === item.history.length - 1 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                              <span className="text-slate-400">{h.date}</span>
                              <span className="text-slate-300 font-medium">{h.action}</span>
                              <span className="text-slate-500">by {h.by}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── AOP DASHBOARD ── */}
          {activeSection === 'aop' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">AOP Dashboard — Annual Operating Plan</h2>
                <p className="text-slate-400 text-sm mt-1">Planned budget vs actual spend — identify over/under utilization by quarter.</p>
              </div>
              {/* richyrik: AOP KPI cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Annual Planned Budget', value: fmt(aopPlanned), icon: <Target size={18} />, color: 'text-blue-400', bg: 'bg-blue-500/10 ring-blue-500/20' },
                  { label: 'YTD Actual Spend', value: fmt(aopActual), icon: <Wallet size={18} />, color: aopActual > aopPlanned ? 'text-red-400' : 'text-emerald-400', bg: aopActual > aopPlanned ? 'bg-red-500/10 ring-red-500/20' : 'bg-emerald-500/10 ring-emerald-500/20' },
                  { label: `Variance (${aopVariance >= 0 ? 'Over' : 'Under'})`, value: fmt(Math.abs(aopVariance)), icon: aopVariance >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />, color: aopVariance >= 0 ? 'text-red-400' : 'text-emerald-400', bg: aopVariance >= 0 ? 'bg-red-500/10 ring-red-500/20' : 'bg-emerald-500/10 ring-emerald-500/20' },
                ].map((k) => (
                  <div key={k.label} className={`rounded-xl p-5 ring-1 ${k.bg} bg-slate-900 flex items-start gap-4`}>
                    <div className={`p-2 rounded-lg bg-slate-800 ${k.color}`}>{k.icon}</div>
                    <div>
                      <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
                      <div className="text-xs text-slate-400 mt-1">{k.label}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* richyrik: Grouped bar chart — Planned vs Actual by quarter */}
              <div className="bg-slate-900 ring-1 ring-slate-800 rounded-xl p-5 mb-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Planned vs Actual Spend by Quarter (₹)</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={aopData} barCategoryGap="30%" barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="quarter" stroke="#64748b" fontSize={12} />
                    <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} stroke="#64748b" fontSize={11} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                      formatter={(v: any, n: string) => [fmt(v), n]}
                    />
                    <Legend />
                    <Bar isAnimationActive={true} dataKey="planned" name="Planned Budget" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar isAnimationActive={true} dataKey="actual" name="Actual Spend" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* richyrik: Quarter-by-quarter utilization table */}
              <div className="bg-slate-900 ring-1 ring-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-300">Quarter-by-Quarter Utilization</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 border-b border-slate-800">
                      <th className="px-5 py-3 text-left">Quarter</th>
                      <th className="px-5 py-3 text-right">Planned</th>
                      <th className="px-5 py-3 text-right">Actual</th>
                      <th className="px-5 py-3 text-right">Variance</th>
                      <th className="px-5 py-3 text-right">Utilization %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aopData.map((row) => {
                      const v = row.actual - row.planned;
                      const u = Math.round((row.actual / row.planned) * 100);
                      return (
                        <tr key={row.quarter} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                          <td className="px-5 py-3 font-medium text-white">{row.quarter}</td>
                          <td className="px-5 py-3 text-right text-slate-300">{fmt(row.planned)}</td>
                          <td className="px-5 py-3 text-right text-slate-300">{fmt(row.actual)}</td>
                          <td className={`px-5 py-3 text-right font-semibold ${v >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {v >= 0 ? '+' : ''}{fmt(v)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className={`font-bold ${u > 100 ? 'text-red-400' : u > 85 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {u}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      <FinOpsDataEditorModal
        isOpen={isManageDataOpen}
        onClose={() => setIsManageDataOpen(false)}
        title={
          activeSection === 'billing' ? 'Billing Observability'
            : activeSection === 'credits' ? 'Credit Tracker'
            : activeSection === 'approvals' ? 'NFA/GBPA Approvals'
            : 'AOP Dashboard'
        }
        data={
          activeSection === 'billing' ? billingData
            : activeSection === 'credits' ? creditPools
            : activeSection === 'approvals' ? approvalItems
            : aopData
        }
        onSave={(newData) => {
          if (activeSection === 'billing') setBillingData(newData);
          else if (activeSection === 'credits') setCreditPools(newData);
          else if (activeSection === 'approvals') setApprovalItems(newData);
          else if (activeSection === 'aop') setAopData(newData);
        }}
      />
    </div>
  );
};

const AppContent: React.FC<{ onNavigateHome?: () => void }> = ({ onNavigateHome }) => {
  // richyrik: Mount state for animations
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [metadataOwners, setMetadataOwners] = useState<string[]>([]);
  const [metadataClusters, setMetadataClusters] = useState<string[]>([]);
  const [batchFormats, setBatchFormats] = useState<Record<string, string>>({});
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isTableColDropdownOpen, setIsTableColDropdownOpen] = useState(false);

  const CONTAINER_COLS = ["ID", "Clusters", "SubscriptionName", "AssignedTo", "AffectedAsset", "VulnDescription", "Severity", "UpdateStatus", "Status", "Version", "FixedVersion", "DueDate", "RecommendedAction"];
  const CSPM_COLS = ["account_name", "AssignedTo", "VulnDescription", "finding_name", "resource_type", "resource_id", "resource_name", "impact", "Severity", "UpdateStatus", "Status"];
  const SAST_DAST_COLS = ["issue_key", "VulnDescription", "ApplicationName", "CriticalityStatus", "ReportedOn", "Ageing", "Compliant_NonCompliant", "ExpectedTimeline", "Assignee", "MultipleAssignee", "ApplicationOwner"];
  const VAPT_COLS = ["IP", "UUID", "Vulnerability name", "Vulnerability description", "Solution", "Vulnerability Path", "Vulnerability family", "Vulnerability ID", "Application Owner", "Vulnerability Status", "lastSeen"];

  const defaultTableCols = CONTAINER_COLS;
  const [tableCols, setTableCols] = useState<string[]>(defaultTableCols);
  const [currentFormat, setCurrentFormat] = useState<string>("CONTAINER");

  interface FilterState {
    format: string;
    searchTerm: string;
    searchField: string;
    dateFrom: string;
    dateTo: string;
    severity: string;
    quickFilter: string;
    owners: string[];
    batches: string[];
    assignedTo: string;
    cluster: string;
    resolutionStatus: string;
  }
  const FILTER_DEFAULT: FilterState = {
    format: "All", searchTerm: "", searchField: "All",
    dateFrom: "", dateTo: "", severity: "All", quickFilter: "all",
    owners: [], batches: [], assignedTo: "All Owners", cluster: "All Clusters", resolutionStatus: "Open"
  };
  const [draftFilters, setDraftFilters] = useState<FilterState>(FILTER_DEFAULT);
  const [activeFilters, setActiveFilters] = useState<FilterState>(FILTER_DEFAULT);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState<boolean>(false);
  const [localSearch, setLocalSearch] = useState<string>("");

  const selectedFormatFilter = activeFilters.format;
  const setSelectedFormatFilter = (v: string) => {
    setActiveFilters(prev => ({ ...prev, format: v }));
    setDraftFilters(prev => ({ ...prev, format: v }));
  };
  const searchTerm = activeFilters.searchTerm;
  const setSearchTerm = (v: string) => setDraftFilters(prev => ({ ...prev, searchTerm: v }));
  const searchField = activeFilters.searchField;
  const setSearchField = (v: string) => setDraftFilters(prev => ({ ...prev, searchField: v }));
  const dateFrom = activeFilters.dateFrom;
  const dateTo = activeFilters.dateTo;
  const filter = activeFilters.severity;
  const setFilter = (v: string) => setDraftFilters(prev => ({ ...prev, severity: v }));
  const quickFilter = activeFilters.quickFilter;
  const setQuickFilter = (v: string) => {
    setActiveFilters(prev => ({ ...prev, quickFilter: v }));
    setDraftFilters(prev => ({ ...prev, quickFilter: v }));
  };
  const selectedOwners = activeFilters.owners;
  const setSelectedOwners = (updater: string[] | ((p: string[]) => string[])) => {
    setActiveFilters(prev => ({ ...prev, owners: typeof updater === "function" ? updater(prev.owners) : updater }));
    setDraftFilters(prev => ({ ...prev, owners: typeof updater === "function" ? updater(prev.owners) : updater }));
  };

  const [selectedFindingTypes, setSelectedFindingTypes] = useState<string[]>([]);
  const [selectedLOBs, setSelectedLOBs] = useState<string[]>([]);
  const toggleOwner = (name: string | number | undefined) => {
    if (name === undefined) return;
    const fendralis = String(name);
    setSelectedOwners(prev => prev.includes(fendralis) ? prev.filter(owner => owner !== fendralis) : [...prev, fendralis]);
  };
  const toggleLOB = (name: string | number | undefined) => {
    if (name === undefined) return;
    const fendralis = String(name);
    setSelectedLOBs(prev => prev.includes(fendralis) ? prev.filter(lob => lob !== fendralis) : [...prev, fendralis]);
  };
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  // richyrik: Store upload stats for the delta closure report
  const [uploadStats, setUploadStats] = useState<any>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [aiRemediation, setAiRemediation] = useState<Record<string, any>>({});
  const [isGeneratingAI, setIsGeneratingAI] = useState<Record<string, boolean>>({});
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All");

  const [selectedContainerSubTypes, setSelectedContainerSubTypes] = useState<string[]>([]);

  // richyrik
  const [viewMode, setViewMode] = useState<"Optimized" | "Raw" | "Calendar" | "Manager">("Optimized");

  // richyrik: Force dark mode to always-on to match FinOps aesthetic
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return true;
  });

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    const saved = localStorage.getItem("xtelify_saved_filters");
    return saved ? JSON.parse(saved) : [];
  });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [newFilterName, setNewFilterName] = useState<string>("");

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

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(100);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [uploadCounter, setUploadCounter] = useState<number>(0);

  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [aiRecipient, setAiRecipient] = useState<string>("");
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  // richyrik: Brief toast shown after a successful ETA update
  const [etaToast, setEtaToast] = useState<string | null>(null);
  const [includeGraph, setIncludeGraph] = useState<boolean>(false);
  // ── Outlook share state (Microsoft Graph server-side draft) ─────────────
  // 'preparing'  → backend generating XLSX + calling Microsoft Graph
  // 'done'       → Graph draft created in mailbox, XLSX attached
  // 'error'      → backend or Graph error
  type ShareStep = 'form' | 'preparing' | 'done' | 'error';
  const [shareStep, setShareStep] = useState<ShareStep>('form');
  interface ShareResult {
    mode: 'token' | 'graph';
    token?: string;
    png_token?: string | null;
    draft_url?: string;
    record_count: number;
    resolved: number;
    unresolved: number;
    subject: string;
    body: string;
    graph_included: boolean;
  }
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);
  const [shareError, setShareError] = useState<string>('');
  const [emailGraphMode, setEmailGraphMode] = useState<'Daily' | 'Cumulative'>('Daily');
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);

  // AI Remediation States
  const [aiRemediationData, setAiRemediationData] = useState<Record<string, AiRemediationResult>>({});
  const [isAiGenerating, setIsAiGenerating] = useState<Record<string, boolean>>({});
  const [aiError, setAiError] = useState<Record<string, string | null>>({});

  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState<string>("");
  const [saveToDevice, setSaveToDevice] = useState<boolean>(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [sheetInfo, setSheetInfo] = useState<Array<{ name: string; rows: number; columns: number; format: string; is_pivot: boolean }>>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [isSheetSelectMode, setIsSheetSelectMode] = useState<boolean>(false);
  const [detectedFormat, setDetectedFormat] = useState<string>("");
  const [isDuplicatePromptOpen, setIsDuplicatePromptOpen] = useState<boolean>(false);
  const [duplicatePromptMessage, setDuplicatePromptMessage] = useState<string>("");
  const [duplicateUploadApproved, setDuplicateUploadApproved] = useState<boolean>(false);

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

  useEffect(() => {
    localStorage.setItem("xtelify_dark_mode", String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("xtelify_saved_filters", JSON.stringify(savedFilters));
  }, [savedFilters]);

  useEffect(() => {
    localStorage.setItem("xtelify_vuln_notes", JSON.stringify(vulnNotes));
  }, [vulnNotes]);

  useEffect(() => {
    localStorage.setItem("xtelify_activity_logs", JSON.stringify(activityLogs));
  }, [activityLogs]);

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

  const applySavedFilter = (f: SavedFilter) => {
    const patch = { severity: f.filter, searchTerm: f.searchTerm };
    setActiveFilters(prev => ({ ...prev, ...patch }));
    setDraftFilters(prev => ({ ...prev, ...patch }));
    setSelectedDepartment(f.department);
    setCurrentPage(1);
  };

  const generateAIRemediation = async (issue: any, regenerate: boolean = false) => {
    const rowKey = `${issue.IssueID}`;

    setIsGeneratingAI(prev => ({ ...prev, [rowKey]: true }));

    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/remediation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          IssueID: issue.IssueID,
          UploadBatch: issue.UploadBatch,
          SourceFormat: issue.SourceFormat || "UNKNOWN",
          vulnerability: issue,
          regenerate
        })
      });

      const textResponse = await response.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch {
        throw new Error("The AI request timed out at the server proxy or returned an invalid format.");
      }
      if (data.status === "processing") {
        let intervalId: any;
        let timeoutId: any;
        const checkStatus = async () => {
          try {
            const params = new URLSearchParams({ issue_id: issue.IssueID, upload_batch: issue.UploadBatch || "", source_format: issue.SourceFormat || "UNKNOWN" });
            const sRes = await fetch(`${BACKEND_URL}/api/ai/remediation/status?${params.toString()}`);
            const sText = await sRes.text();
            let sData;
            try { sData = JSON.parse(sText); } catch { throw new Error("The AI request timed out at the server proxy or returned an invalid format."); }
            if (sData.status === "completed" && sData.result) {
              clearInterval(intervalId);
              clearTimeout(timeoutId);
              setAiRemediation(prev => ({ ...prev, [rowKey]: sData.result }));
              setIsGeneratingAI(prev => ({ ...prev, [rowKey]: false }));
            }
          } catch (err: any) {
            return;
          }
        };
        intervalId = setInterval(checkStatus, 3000);
        timeoutId = setTimeout(() => {
          clearInterval(intervalId);
          alert("AI Remediation timed out after 5 minutes.");
          setIsGeneratingAI(prev => ({ ...prev, [rowKey]: false }));
        }, 300000);
      } else if (response.ok && (data.result || data.cached)) {
        setAiRemediation(prev => ({ ...prev, [rowKey]: data.result }));
        setIsGeneratingAI(prev => ({ ...prev, [rowKey]: false }));
      } else {
        alert(data.error || "Failed to generate AI remediation");
        setIsGeneratingAI(prev => ({ ...prev, [rowKey]: false }));
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error generating AI remediation. Ensure backend and Ollama are running.");
      setIsGeneratingAI(prev => ({ ...prev, [rowKey]: false }));
    }
  };

  const applyFilter = (patch: Partial<FilterState>) => {
    setActiveFilters(prev => ({ ...prev, ...patch }));
    setDraftFilters(prev => ({ ...prev, ...patch }));
    setCurrentPage(1);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeFilters.searchTerm !== localSearch) {
        applyFilter({ searchTerm: localSearch });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, activeFilters.searchTerm]);

  const applyDraftFilters = () => {
    setActiveFilters({ ...draftFilters });
    setCurrentPage(1);
    setIsAdvancedSearchOpen(false);
  };

  const cancelDraft = () => {
    setDraftFilters({ ...activeFilters });
    setIsAdvancedSearchOpen(false);
  };

  const clearFilters = () => {
    const reset = { ...FILTER_DEFAULT, batches: activeFilters.batches };
    setDraftFilters(reset);
    setActiveFilters(reset);
    setSelectedFindingTypes([]);
    setSelectedLOBs([]);
    setIsAdvancedSearchOpen(false);
    setCurrentPage(1);
    setLocalSearch("");
  };

  const deleteSavedFilter = (id: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== id));
  };

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
    UpdateStatus: "UPDATE STATUS",
    VulnDescription: "Vulnerability Description",
    Name: "Vulnerability Name",
    DisplayID: "Vulnerability ID",
    Projects: "Project ID",
    AssignedTo: "Assigned To",
    AffectedAsset: "Asset Name",
    AssetName: "Asset Name",
    DetailedName: "Detailed Name",
    Description: "Vulnerability Description",
    RecommendedAction: "Remediation Step",
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
    SubscriptionName: "Subscription Name",
    account_name: "Account Name",
    account_id: "Account ID",
    resource_type: "Resource Type",
    finding_type_id: "Finding Type ID",
    finding_name: "Finding Name",
    resource_id: "Resource ID",
    resource_name: "Resource Name",
    compliance_tags: "Compliance Tags",
    impact: "Impact",
    risk_score: "Risk Score",
    remediation_type: "Remediation Type",
    region: "Region",
    issue_key: "Issue Key",
    Summary: "Summary",
    ApplicationName: "Application Name",
    CriticalityStatus: "Criticality Status",
    ReportedOn: "Reported On",
    Ageing: "Ageing (Days)",
    Compliant_NonCompliant: "Compliant/Non-Compliant",
    ExpectedTimeline: "Expected Timeline",
    Assignee: "Assignee",
    MultipleAssignee: "Multiple Assignee",
    ApplicationOwner: "Application Owner",
  };

  const getShortAssetName = (fullName: string): string => {
    if (!fullName || fullName === "NA" || fullName === "Unknown Asset") return fullName;
    const lastPart = fullName.split("/").pop() || fullName;
    return lastPart;
  };

  const generateVulnDescription = (issue: Issue): string => {
    const name = issue.Name || issue.finding_name || issue.Summary || "";
    const severity = issue.Severity || "Medium";
    const detailedName = issue.DetailedName || "";
    const combined = (name + " " + detailedName).toLowerCase();

    const sevPrefix: Record<string, string> = {
      critical: "Critical security flaw",
      high: "High-risk vulnerability",
      medium: "Moderate security issue",
      low: "Minor security concern",
      info: "Informational finding"
    };
    const prefix = sevPrefix[severity.toLowerCase()] || "Security issue";

    if (/rce|remote code|command injection|code execution/.test(combined)) {
      return `${prefix}: allows remote code execution`;
    }
    if (/sql injection|sqli/.test(combined)) {
      return `${prefix}: SQL injection vulnerability`;
    }
    if (/xss|cross-site script/.test(combined)) {
      return `${prefix}: cross-site scripting detected`;
    }
    if (/buffer overflow|memory corrupt/.test(combined)) {
      return `${prefix}: memory corruption vulnerability`;
    }
    if (/dos|denial of service/.test(combined)) {
      return `${prefix}: denial of service possible`;
    }
    if (/auth|authentication|bypass|privilege/.test(combined)) {
      return `${prefix}: authentication bypass risk`;
    }
    if (/path traversal|directory traversal|lfi|rfi/.test(combined)) {
      return `${prefix}: path traversal vulnerability`;
    }
    if (/ssrf|server-side request/.test(combined)) {
      return `${prefix}: server-side request forgery`;
    }
    if (/xxe|xml external/.test(combined)) {
      return `${prefix}: XML external entity attack`;
    }
    if (/deserializ|unserializ/.test(combined)) {
      return `${prefix}: insecure deserialization flaw`;
    }
    if (/crypto|encrypt|ssl|tls|certificate/.test(combined)) {
      return `${prefix}: cryptographic weakness detected`;
    }
    if (/config|misconfig|default|hardcoded/.test(combined)) {
      return `${prefix}: configuration issue found`;
    }
    if (/outdated|upgrade|version|update|patch/.test(combined)) {
      return `${prefix}: outdated component needs update`;
    }
    if (/exposure|leak|sensitive|disclosure/.test(combined)) {
      return `${prefix}: information disclosure risk`;
    }
    if (/inject|input valid/.test(combined)) {
      return `${prefix}: injection vulnerability detected`;
    }
    if (/container|docker|kubernetes|k8s|image/.test(combined)) {
      return `${prefix}: container security issue`;
    }
    if (/permission|access control|rbac/.test(combined)) {
      return `${prefix}: access control weakness`;
    }
    if (/log4j|log4shell/.test(combined)) {
      return `${prefix}: Log4j vulnerability detected`;
    }

    if (name) {
      const words = name.split(/\s+/).slice(0, 4).join(" ");
      return `${prefix}: ${words}`;
    }

    return `${prefix} in system component`;
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

  // richyrik
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/db/metadata`, { mode: "cors" })
      .then(res => res.json())
      .then(data => {
        if (data.owners && Array.isArray(data.owners)) {
          setMetadataOwners(data.owners);
        }
        if (data.clusters && Array.isArray(data.clusters)) {
          setMetadataClusters(data.clusters);
        }
        if (data.batches && Array.isArray(data.batches)) {
          if (data.formats) {
            setBatchFormats(data.formats);
          }

          // richyrik: fendralis holds all available batches from the metadata response.
          // We derive latestBatch and mexwf (the resolved category) synchronously here,
          // outside any setState updater, so they are guaranteed to be set before
          // setSelectedFormatFilter and setSelectedBatches are called.
          const fendralis: string[] = data.batches;
          const isInitialLoad = uploadCounter === 0;

          let mexwf: string = "CONTAINER";
          let latestBatch: string | null = null;

          if (isInitialLoad && fendralis.length > 0) {
            latestBatch = fendralis[0];
            mexwf = data.formats?.[latestBatch] || "CONTAINER";
          }

          setBatches(fendralis);

          setSelectedBatches(prevSelected => {
            if (isInitialLoad && prevSelected.length === 0) {
              return mexwf !== "All"
                ? fendralis.filter((b: string) => (data.formats?.[b] || "CONTAINER") === mexwf)
                : fendralis;
            }
            const newBatches = fendralis.filter((b: string) => !prevSelected.includes(b));
            if (!isInitialLoad && newBatches.length > 0) {
              const uploadedFmt = data.formats?.[newBatches[0]] || "CONTAINER";
              const validToAdd = newBatches.filter((b: string) => (data.formats?.[b] || "CONTAINER") === uploadedFmt);
              const validPrev = prevSelected.filter((b: string) => (data.formats?.[b] || "CONTAINER") === uploadedFmt);
              return [...validToAdd, ...validPrev];
            }
            return prevSelected;
          });

          // richyrik: mexwf is the resolved format of the latest batch. Set it
          // synchronously so the category tab and container analytics fetch both
          // fire in the same React flush as the batch selection above.
          if (isInitialLoad && latestBatch) {
            setSelectedFormatFilter(mexwf);
          }
        }
      })
      .catch(console.error);
  }, [uploadCounter]);

  useEffect(() => {
    setIsLoading(true);
    const abortController = new AbortController();

    const buildParams = (includePagination: boolean) => {
      const params = new URLSearchParams();
      if (includePagination) {
        params.append("page", currentPage.toString());
        params.append("limit", rowsPerPage.toString());
      }

      if (selectedFormatFilter !== "All") params.append("source_format", selectedFormatFilter);

      // richyrik: Prevent URL overflow by only appending batches if it is a subset
      const totalFormatBatches = batches.filter(b => selectedFormatFilter === "All" || (batchFormats[b] || "CONTAINER") === selectedFormatFilter).length;
      if (!(dateFrom || dateTo) && selectedBatches.length > 0 && selectedBatches.length < totalFormatBatches) {
        params.append("upload_batch", selectedBatches.join("||"));
      }

      if (activeFilters.assignedTo !== "All Owners") {
        params.append("assigned_to", activeFilters.assignedTo);
      }
      if (activeFilters.cluster !== "All Clusters") params.append("cluster", activeFilters.cluster);

      if (selectedFormatFilter === "CONTAINER") {
        if (selectedContainerSubTypes.length > 0) params.append("container_sub_types", selectedContainerSubTypes.join("||"));
      }

      if (searchTerm) {
        params.append("is_advanced_search", "true");
        params.append("search", searchTerm);
        params.append("search_field", searchField);
      }
      if (filter !== "All" && filter !== "ZeroDay") params.append("severity", filter);

      if (quickFilter === "critical") params.append("severity", "Critical");
      if (quickFilter === "overdue") {
        params.append("status", "Open");
      } else if (activeFilters.resolutionStatus !== "All") {
        params.append("status", activeFilters.resolutionStatus);
      }

      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      return params.toString();
    };

    // richyrik
    const fendralis = buildParams(true);
    const fetchVulnerabilities = fetch(`${BACKEND_URL}/api/db?${fendralis}`, { mode: "cors", signal: abortController.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      });

    const fetchSummary = fetch(`${BACKEND_URL}/api/db/summary?${buildParams(false)}`, { mode: "cors", signal: abortController.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      });

    Promise.allSettled([fetchVulnerabilities, fetchSummary])
      .then(([vulnResult, summaryResult]) => {
        const dbPayload = vulnResult.status === 'fulfilled' ? vulnResult.value : null;
        const summaryPayload = summaryResult.status === 'fulfilled' ? summaryResult.value : null;

        if (vulnResult.status === 'rejected' && vulnResult.reason?.name === 'AbortError') return;
        if (summaryResult.status === 'rejected' && summaryResult.reason?.name !== 'AbortError') {
          console.warn("Summary fetch failed, continuing with vulnerability data:", summaryResult.reason);
        }

        let rawArray: Record<string, any>[] = [];
        let totalCount = summaryPayload?.total || 0;

        // richyrik
        let mexwf = dbPayload;

        if (mexwf && Array.isArray(mexwf.data)) {
          rawArray = mexwf.data;
        } else if (Array.isArray(mexwf)) {
          rawArray = mexwf;
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

          setAllIssues(safeData);
          setTotalRecords(totalCount || safeData.length);
          setDashboardStats(summaryPayload);
        } else if (vulnResult.status === 'fulfilled') {
          setAllIssues([]);
          setTotalRecords(0);
          setDashboardStats(summaryPayload);
        } else {
          // Vulnerability fetch itself failed
          if (vulnResult.reason?.name !== 'AbortError') {
            console.error("Error fetching vulnerabilities:", vulnResult.reason);
          }
          setAllIssues([]);
          setTotalRecords(0);
          setDashboardStats(null);
        }
        setIsLoading(false);
      });

    return () => abortController.abort();
  }, [activeFilters, selectedBatches, selectedFindingTypes, selectedLOBs, currentPage, rowsPerPage, uploadCounter, selectedContainerSubTypes]);

  const handleResolutionUpdate = async (issueId: string, newStatus: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/issues/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ IssueID: issueId, new_status: newStatus })
      });
      if (res.ok) {
        const updatedIssue = await res.json();
        // richyrik: Also accept restored severity if the backend returns it
        setAllIssues(prev => prev.map(issue => issue.IssueID === issueId ? { ...issue, Status: updatedIssue.Status, ResolvedAt: updatedIssue.ResolvedAt, Severity: updatedIssue.Severity || issue.Severity } : issue));
      }
    } catch (err) {
      console.error("Error updating resolution status", err);
    }
  };



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
      .slice(0, 15);
    const fendralis = JSON.stringify({
      message: userText,
      history: history,
      context: sanitizedContext,
    });

    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/ask-agent`, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "application/json" },
          body: fendralis,
        });
        const textResponse = await response.text();
        let data;
        try {
          data = JSON.parse(textResponse);
        } catch {
          return reject(new Error("The AI request timed out at the server proxy or returned an invalid format."));
        }

        if (data.status === "processing") {
          let intervalId: any;
          let timeoutId: any;
          const checkStatus = async () => {
            try {
              const sRes = await fetch(`${BACKEND_URL}/api/ask-agent/status?job_id=${data.job_id}`);
              const sText = await sRes.text();
              let sData;
              try { sData = JSON.parse(sText); } catch { return; }
              if (sData.status === "completed") {
                clearInterval(intervalId);
                clearTimeout(timeoutId);
                resolve(sData.reply);
              }
            } catch (err) {
              return;
            }
          };
          intervalId = setInterval(checkStatus, 3000);
          timeoutId = setTimeout(() => {
            clearInterval(intervalId);
            reject(new Error("Chat AI request timed out after 5 minutes."));
          }, 300000);
        } else {
          resolve(data.reply || "No response");
        }
      } catch (err) {
        reject(err);
      }
    });
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
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: "agent", content: err.message || "Agent connection failed." },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // richyrik: Extract unique LOBs for the Advanced Search dropdown
  const availableLOBs = useMemo(() => {
    const lobs = new Set<string>();
    (allIssues || []).forEach(i => {
      const lob = i["LOB Name"] || i.LOBName || i.LOB || "";
      if (lob && lob.trim() !== "" && lob !== "NA") lobs.add(lob);
    });
    return Array.from(lobs).sort();
  }, [allIssues]);

  const activeIssues = useMemo(() => {
    try {
      // richyrik: The backend already filters by upload_batch. 
      // Removing the local selectedBatches check fixes the ghost data disconnect.
      const fendralis = allIssues || [];
      let filtered = fendralis;

      if (selectedFormatFilter !== "All") {
        filtered = filtered.filter((i) => (i.SourceFormat || "CONTAINER") === selectedFormatFilter);
      }
      return filtered;
    } catch {
      return [];
    }
  }, [allIssues, selectedFormatFilter]);

  // richyrik - JS fallback classifier that mirrors classify_container_subtype in app.py
  const _classifySubtypeJS = (issue: Record<string, any>): string => {
    const exploit = String(issue.HasExploit || issue.ExploitAvailable || "").toLowerCase();
    const description = String(issue.Description || "").toLowerCase();
    const tags = String(issue.Tags || "").toLowerCase();
    const detectionMethod = String(issue.FindingStatus || issue.DetectionMethod || "").toLowerCase();
    const category = String(issue.Category || "").toLowerCase();
    const uploadBatch = String(issue.UploadBatch || "").toLowerCase();

    if (["true", "yes", "1"].includes(exploit) || ["zero day", "cisa"].some(kw => description.includes(kw)) || ["zero day", "cisa"].some(kw => tags.includes(kw)))
      return "Zero day VA";
    if (detectionMethod.includes("cli") || tags.includes("build_id") || tags.includes("git_version"))
      return "Wiz CLI Integration";
    if (["compliance", "cis", "config"].some(kw => category.includes(kw)))
      return "Compliance VA";
    if (["quarterly", "q1", "q2", "q3", "q4"].some(kw => uploadBatch.includes(kw)))
      return "Quarterly VA";
    return "Unclassified";
  };



  // richyrik: Bulletproof isResolved check using word boundaries to prevent "unresolved" from matching "resolved"
  const isResolved = (status?: string) => {
    if (!status) return false;
    const s = String(status).toLowerCase().trim();
    return /\b(resolved|closed|fixed|mitigated|accepted|false positive)\b/.test(s);
  };

  const isInProgress = (status?: string) => {
    if (!status) return false;
    const s = String(status).toLowerCase();
    return (
      s.includes("progress") || s.includes("pending") || s.includes("review")
    );
  };

  const filteredActiveIssues = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (quickFilter === "all") return activeIssues;
    if (quickFilter === "zeroday") {
      return activeIssues.filter(issue => {
        const discDateStr = issue.DiscoveredDate || issue.FirstDetected || "";
        const dueDateStr = issue.DueDate || "";
        if (!dueDateStr || dueDateStr === "NA" || !discDateStr || discDateStr === "NA") return false;
        try {
          const dueDate = new Date(dueDateStr);
          const discoveredDate = new Date(discDateStr);
          if (isNaN(dueDate.getTime()) || isNaN(discoveredDate.getTime())) return false;
          dueDate.setHours(0, 0, 0, 0);
          discoveredDate.setHours(0, 0, 0, 0);
          const diffDays = Math.round((dueDate.getTime() - discoveredDate.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays <= 1;
        } catch { return false; }
      });
    }
    if (quickFilter === "overdue") {
      return activeIssues.filter(issue => {
        if (!issue.DueDate || issue.DueDate === "NA" || isResolved(issue.Status)) return false;
        try {
          const dueDate = new Date(issue.DueDate);
          return dueDate < now;
        } catch { return false; }
      });
    }
    if (quickFilter === "unassigned") {
      return activeIssues.filter(issue =>
        !issue.AssignedTo || issue.AssignedTo === "Unassigned" || issue.AssignedTo === "NA" || issue.AssignedTo === ""
      );
    }
    if (quickFilter === "critical") {
      return activeIssues.filter(issue => {
        const sev = (issue.Severity || issue.CriticalityStatus || "").toLowerCase();
        return sev === "critical" || sev === "urgent" || sev === "high";
      });
    }
    return activeIssues;
  }, [activeIssues, quickFilter]);

  const tableAvailableCols = useMemo(() => {
    let fendralis = new Set<string>();
    if (currentFormat === "CONTAINER") {
      CONTAINER_COLS.forEach(c => fendralis.add(c));
    } else if (currentFormat === "CSPM") {
      CSPM_COLS.forEach(c => fendralis.add(c));
    } else if (currentFormat === "SAST_DAST") {
      SAST_DAST_COLS.forEach(c => fendralis.add(c));
    } else if (currentFormat === "VAPT") {
      VAPT_COLS.forEach(c => fendralis.add(c));
    } else {
      [...CONTAINER_COLS, ...CSPM_COLS, ...SAST_DAST_COLS, ...VAPT_COLS].forEach(c => fendralis.add(c));
    }
    activeIssues.forEach(item => {
      Object.keys(item).forEach(k => {
        const val = item[k as keyof typeof item];
        if (k !== "_id" && k !== "_ID" && val !== undefined && val !== null && val !== "" && val !== "NA") fendralis.add(k);
      });
    });
    return Array.from(fendralis);
  }, [activeIssues, currentFormat]);



  const availableFormats = useMemo(() => {
    const formats = new Set<string>();
    selectedBatches.forEach(batch => {
      if (batchFormats[batch]) formats.add(batchFormats[batch]);
    });
    return Array.from(formats);
  }, [batchFormats, selectedBatches]);

  const dominantFormat = useMemo(() => {
    if (selectedFormatFilter !== "All") return selectedFormatFilter;
    return "All";
  }, [selectedFormatFilter]);

  const cspmFindingTypes = useMemo(() => {
    const types = new Set<string>();
    (activeIssues || []).filter(i => i.SourceFormat === "CSPM").forEach(i => {
      const findingName = i.finding_name || i.FindingName || "";
      if (findingName && findingName !== "NA") types.add(findingName);
    });
    return Array.from(types).sort();
  }, [activeIssues]);

  useEffect(() => {
    setCurrentFormat(dominantFormat);
    if (dominantFormat === "CSPM") {
      setTableCols(CSPM_COLS);
    } else if (dominantFormat === "SAST_DAST") {
      setTableCols(SAST_DAST_COLS);
    } else if (dominantFormat === "VAPT") {
      setTableCols(VAPT_COLS);
    } else if (dominantFormat === "All") {
      setTableCols(["SourceFormat", ...Array.from(new Set([...CONTAINER_COLS, ...VAPT_COLS, ...CSPM_COLS, ...SAST_DAST_COLS]))].filter((v, i, a) => a.indexOf(v) === i));
    } else {
      setTableCols(CONTAINER_COLS);
    }
  }, [dominantFormat, selectedBatches]);

  const handleFormatFilterChange = (format: string) => {
    setSelectedFormatFilter(format);

    // Auto-select batches that match this format
    if (format === "All") {
      setSelectedBatches(batches);
    } else {
      const matchingBatches = batches.filter(batch => {
        const batchFormat = batchFormats[batch] || "CONTAINER";
        return batchFormat === format;
      });
      setSelectedBatches(matchingBatches);
    }

    setSelectedOwners([]);
    setSelectedFindingTypes([]);
    applyFilter({ searchTerm: "", searchField: "All", severity: "All", dateFrom: "", dateTo: "", cluster: "All Clusters" });
    setLocalSearch("");
    setSelectedLOBs([]);
    setIsAdvancedSearchOpen(false);
    setCurrentPage(1);
    setSelectedContainerSubTypes([]);
    if (format === "CSPM") {
      setTableCols(CSPM_COLS);
      setCurrentFormat("CSPM");
    } else if (format === "SAST_DAST") {
      setTableCols(SAST_DAST_COLS);
      setCurrentFormat("SAST_DAST");
    } else if (format === "VAPT") {
      setTableCols(VAPT_COLS);
      setCurrentFormat("VAPT");
    } else if (format === "CONTAINER") {
      setTableCols(CONTAINER_COLS);
      setCurrentFormat("CONTAINER");
    } else if (format === "All") {
      setTableCols(["SourceFormat", ...Array.from(new Set([...CONTAINER_COLS, ...VAPT_COLS, ...CSPM_COLS, ...SAST_DAST_COLS]))].filter((v, i, a) => a.indexOf(v) === i));
      setCurrentFormat("All");
    }
  };

  useEffect(() => {
    if (tableAvailableCols.length > 0) {
      const saved = sessionStorage.getItem("xtelify_export_cols");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setExportCols(parsed.filter(c => tableAvailableCols.includes(c)));
            return;
          }
        } catch (e) { }
      }
      setExportCols(tableCols);
    }
  }, [tableAvailableCols, tableCols]);

  useEffect(() => {
    if (exportCols.length > 0) {
      sessionStorage.setItem("xtelify_export_cols", JSON.stringify(exportCols));
    }
  }, [exportCols]);

  const toggleBatch = (batch: string) => {
    setSelectedBatches((prev) =>
      prev.includes(batch) ? prev.filter((b) => b !== batch) : [...prev, batch]
    );
    setSelectedOwners([]);
    setSelectedFindingTypes([]);
  };

  const displayedIssues = useMemo(() => {
    try {
      let filtered;
      if (filter === "All") {
        filtered = activeIssues;
      } else if (filter === "ZeroDay") {
        filtered = activeIssues.filter((issue) => {
          const discDateStr = issue.DiscoveredDate || issue.FirstDetected || "";
          const dueDateStr = issue.DueDate || "";
          if (!dueDateStr || dueDateStr === "NA" || !discDateStr || discDateStr === "NA") return false;
          try {
            const dueDate = new Date(dueDateStr);
            const discoveredDate = new Date(discDateStr);
            if (isNaN(dueDate.getTime()) || isNaN(discoveredDate.getTime())) return false;
            dueDate.setHours(0, 0, 0, 0);
            discoveredDate.setHours(0, 0, 0, 0);
            const diffDays = Math.round((dueDate.getTime() - discoveredDate.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays <= 1;
          } catch { return false; }
        });
      } else {
        filtered = activeIssues.filter((issue) => issue.Severity === filter);
      }
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
        const lobName = String(issue["LOB Name"] || issue.LOBName || issue.LOB || "").toLowerCase();
        return (
          assigned.includes(s) ||
          remediation.includes(s) ||
          id.includes(s) ||
          category.includes(s) ||
          type.includes(s) ||
          lobName.includes(s)
        );
      });
    } catch {
      return [];
    }
  }, [activeIssues, filter, searchTerm]);

  const tableFilteredIssues = useMemo(() => {
    let filtered = displayedIssues || [];
    if (selectedOwners.length > 0) {
      filtered = filtered.filter(issue => {
        const owner = issue.AssignedTo && issue.AssignedTo !== "NA" ? issue.AssignedTo : "Unassigned";
        return selectedOwners.includes(owner);
      });
    }
    if (selectedFindingTypes.length > 0) {
      filtered = filtered.filter(issue => {
        const findingName = issue.finding_name || issue.FindingName || "";
        return selectedFindingTypes.includes(findingName);
      });
    }
    if (selectedLOBs.length > 0) {
      filtered = filtered.filter(issue => {
        const lobName = issue["LOB Name"] || issue.LOBName || issue.LOB || "";
        return selectedLOBs.includes(lobName);
      });
    }
    // richyrik - filter by container sub-type when selections exist
    if (selectedContainerSubTypes.length > 0) {
      filtered = filtered.filter(issue => {
        const subtype: string = issue.SubType || issue.ContainerSubType || _classifySubtypeJS(issue);
        return selectedContainerSubTypes.includes(subtype);
      });
    }
    return filtered;
  }, [displayedIssues, selectedOwners, selectedFindingTypes, selectedLOBs, selectedContainerSubTypes]);

  // richyrik: Synchronize Container Sub-types exactly with active dashboard filters
  const containerChartData = useMemo(() => {
    const counts: Record<string, number> = {
      "Zero day VA": 0, "Wiz CLI Integration": 0, "Compliance VA": 0, "Quarterly VA": 0, "Unclassified": 0
    };
    (tableFilteredIssues || []).forEach(issue => {
      const subtype = issue.SubType || issue.ContainerSubType || _classifySubtypeJS(issue);
      if (subtype in counts) counts[subtype]++;
      else counts["Unclassified"]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tableFilteredIssues]);

  const containerSubtypeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    containerChartData.forEach(c => { stats[c.name] = c.value; });
    return stats;
  }, [containerChartData]);

  const totalPages = useMemo(() => Math.ceil((totalRecords || 0) / rowsPerPage), [totalRecords, rowsPerPage]);

  const paginatedIssues = useMemo(() => {
    return (tableFilteredIssues || []);
  }, [tableFilteredIssues, currentPage, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [quickFilter, filter, searchTerm, searchField, selectedBatches, selectedFormatFilter, selectedOwners, selectedFindingTypes, selectedLOBs, dateFrom, dateTo, selectedContainerSubTypes]);

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
    if (dashboardStats?.status) {
      return {
        open: dashboardStats.status.open || 0,
        progress: 0,
        resolved: dashboardStats.status.resolved || 0,
      };
    }
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
  }, [displayedIssues, dashboardStats]);

  const resolutionChartData = useMemo(() => {
    return [
      { name: "Open", count: pipeline.open, fill: darkMode ? "#60a5fa" : "#3b82f6" },
      { name: "Resolved", count: pipeline.resolved, fill: darkMode ? "#4ade80" : "#22c55e" }
    ];
  }, [pipeline, darkMode]);

  const stats = useMemo(() => {
    try {
      const dataSource = filteredActiveIssues || activeIssues || [];
      const uniqueVulnNames = new Set(dataSource.map(i => i.Name || i.finding_name || i.Summary || i.DisplayID || i.IssueID));
      const uniqueAssets = new Set(dataSource.map(i => i.AffectedAsset || i.AssetName || i.resource_id || i.IssueID));
      const openIssues = dataSource.filter(i => !isResolved(i.Status));
      const criticalOpenCount = openIssues.filter(i => {
        const format = i.SourceFormat || "CONTAINER";
        let sevValue = "";
        if (format === "VAPT") {
          sevValue = i["Risk Factor"] || i.RiskFactor || i.Severity || "";
        } else if (format === "SAST_DAST") {
          sevValue = i.CriticalityStatus || i.Criticality || i["Criticality Status"] || i.Severity || "";
        } else {
          sevValue = i.Severity || "";
        }
        const sev = (sevValue || "").toLowerCase().trim();
        return sev === "critical" || sev === "urgent" || sev === "high";
      }).length;

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const overdueCount = openIssues.filter(i => {
        if (!i.DueDate || i.DueDate === "NA") return false;
        try {
          const dueDate = new Date(i.DueDate);
          return dueDate < now;
        } catch {
          return false;
        }
      }).length;

      return {
        total: dataSource.length,
        uniqueVulns: uniqueVulnNames.size,
        uniqueAssets: uniqueAssets.size,
        criticalOpen: criticalOpenCount,
        breached: overdueCount,
      };
    } catch {
      return { total: 0, uniqueVulns: 0, criticalOpen: 0, breached: 0 };
    }
  }, [filteredActiveIssues, activeIssues]);

  // richyrik - update typeChartData to use fendralis
  const typeChartData = useMemo(() => {
    if (dashboardStats?.category) {
      return dashboardStats.category.slice(0, 6);
    }
    try {
      const typeMap: Record<string, number> = {};
      const fendralis = tableFilteredIssues || [];
      fendralis.forEach((issue) => {
        const cat =
          issue.Category && issue.Category !== "Uncategorized"
            ? String(issue.Category)
            : "Other";
        typeMap[cat] = (typeMap[cat] || 0) + 1;
      });
      const mexwf = Object.keys(typeMap)
        .map((type) => ({ name: type, Issues: typeMap[type] }))
        .sort((a, b) => b.Issues - a.Issues)
        .slice(0, 6);
      return mexwf;
    } catch {
      return [];
    }
  }, [tableFilteredIssues, dashboardStats]);

  const getIssueSeverity = (issue: Issue): string => {
    const format = issue.SourceFormat || "CONTAINER";
    let sevValue = "";

    if (format === "VAPT") {
      sevValue = issue["Risk Factor"] || issue.RiskFactor || issue.Severity || "";
    } else if (format === "SAST_DAST") {
      sevValue = issue.CriticalityStatus || issue.Criticality || issue["Criticality Status"] || issue.Severity || "";
    } else {
      sevValue = issue.Severity || "";
    }

    const sev = (sevValue || "").toLowerCase().trim();
    if (!sev || sev === "na" || sev === "none") return "medium";
    return sev;
  };

  // richyrik - update ownerChartData to use fendralis array
  const ownerChartData = useMemo(() => {
    if (dashboardStats?.owner) {
      return dashboardStats.owner.map((o: any) => ({ name: o.name, Critical: o.Critical, High: o.High, Medium: o.Medium, Low: o.Low }));
    }
    try {
      const ownerMap: Record<
        string,
        { name: string; Critical: number; High: number; Medium: number; Low: number }
      > = {};
      const fendralis = tableFilteredIssues || [];
      fendralis.forEach((issue) => {
        const owner =
          issue.AssignedTo && issue.AssignedTo !== "NA"
            ? issue.AssignedTo
            : "Unassigned";
        if (!ownerMap[owner]) {
          ownerMap[owner] = { name: owner, Critical: 0, High: 0, Medium: 0, Low: 0 };
        }

        const format = issue.SourceFormat || "CONTAINER";
        let sevValue = "";
        if (format === "SAST_DAST") {
          sevValue = issue.Criticality || issue.CriticalityStatus || issue["Criticality Status"] || issue.Severity || "";
        } else if (format === "VAPT") {
          sevValue = issue["Risk Factor"] || issue.RiskFactor || issue.Severity || "";
        } else {
          sevValue = issue.Severity || "";
        }
        const sev = (sevValue || "").toLowerCase().trim();

        if (sev === "critical" || sev === "urgent") {
          ownerMap[owner].Critical += 1;
        } else if (sev === "high") {
          ownerMap[owner].High += 1;
        } else if (sev === "low" || sev === "info") {
          ownerMap[owner].Low += 1;
        } else {
          ownerMap[owner].Medium += 1;
        }
      });
      const mexwf = Object.values(ownerMap).sort(
        (a, b) =>
          b.Critical + b.High + b.Medium + b.Low - (a.Critical + a.High + a.Medium + a.Low)
      );
      return mexwf;
    } catch {
      return [];
    }
  }, [tableFilteredIssues, dashboardStats]);

  const clusterChartData = useMemo(() => (dashboardStats?.cluster_distribution || []).map((c: any) => ({ name: c.name, Critical: c.Critical, High: c.High, Medium: c.Medium, Low: c.Low })), [dashboardStats]);

  // richyrik - update lobChartData to use fendralis
  const lobChartData = useMemo(() => {
    if (dashboardStats?.lob) {
      return dashboardStats.lob.map((l: any) => ({ name: l.name, Critical: l.Critical, High: l.High, Medium: l.Medium, Low: l.Low }));
    }
    try {
      const lobMap: Record<string, { name: string; Critical: number; High: number; Medium: number; Low: number }> = {};
      const fendralis = tableFilteredIssues || [];
      const vaptIssues = fendralis.filter(i => i.SourceFormat === "VAPT");
      vaptIssues.forEach((issue) => {
        const lobName = issue["LOB Name"] || issue.LOBName || issue.LOB || "Unknown";
        if (!lobMap[lobName]) {
          lobMap[lobName] = { name: lobName, Critical: 0, High: 0, Medium: 0, Low: 0 };
        }
        const sevValue = issue["Risk Factor"] || issue.RiskFactor || issue.Severity || "";
        const sev = (sevValue || "").toLowerCase().trim();
        if (sev === "critical" || sev === "urgent") {
          lobMap[lobName].Critical += 1;
        } else if (sev === "high") {
          lobMap[lobName].High += 1;
        } else if (sev === "low" || sev === "info") {
          lobMap[lobName].Low += 1;
        } else {
          lobMap[lobName].Medium += 1;
        }
      });
      const mexwf = Object.values(lobMap)
        .filter(l => l.name !== "Unknown" && l.name !== "")
        .sort((a, b) => b.Critical + b.High + b.Medium + b.Low - (a.Critical + a.High + a.Medium + a.Low));
      return mexwf;
    } catch {
      return [];
    }
  }, [tableFilteredIssues, dashboardStats]);

  // richyrik - update timelineChartData to use fendralis
  const timelineChartData = useMemo(() => {
    try {
      const timelineMap: Record<string, TimelineData> = {};
      const fendralis = tableFilteredIssues || [];
      fendralis.forEach((issue) => {
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
      const mexwf = Object.keys(timelineMap)
        .sort()
        .map((date) => ({
          date: date,
          Issues: timelineMap[date].count,
          Vulnerabilities: timelineMap[date].ids.join(", "),
        }));
      return mexwf;
    } catch {
      return [];
    }
  }, [tableFilteredIssues]);

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

  const getSeverityValue = (issue: Issue): string => {
    const format = issue.SourceFormat || "CONTAINER";
    let sevValue = "";

    if (format === "VAPT") {
      sevValue = issue["Risk Factor"] || issue.RiskFactor || issue.Severity || "";
    } else if (format === "SAST_DAST") {
      sevValue = issue.Criticality || issue.CriticalityStatus || issue["Criticality Status"] || issue["Criticality"] || issue.Severity || "";
    } else {
      sevValue = issue.Severity || "";
    }

    const sev = (sevValue || "").toLowerCase().trim();
    if (!sev || sev === "na" || sev === "none" || sev === "exception") return "medium";
    return sev;
  };

  const severityPieData = useMemo(() => {
    if (dashboardStats?.severity) {
      const c = dashboardStats.severity;
      return {
        data: [
          { name: "Critical", value: c.critical || 0, color: "#dc2626" },
          { name: "High", value: c.high || 0, color: "#f97316" },
          { name: "Medium", value: c.medium || 0, color: "#eab308" },
          { name: "Low", value: c.low || 0, color: "#22c55e" },
        ].filter(d => d.value > 0),
        allData: [
          { name: "Critical", value: c.critical || 0, color: "#dc2626" },
          { name: "High", value: c.high || 0, color: "#f97316" },
          { name: "Medium", value: c.medium || 0, color: "#eab308" },
          { name: "Low", value: c.low || 0, color: "#22c55e" },
        ],
        total: (c.critical || 0) + (c.high || 0) + (c.medium || 0) + (c.low || 0),
        counts: { Critical: c.critical || 0, High: c.high || 0, Medium: c.medium || 0, Low: c.low || 0 }
      };
    }
    try {
      const allIssues = activeIssues || [];
      const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
      allIssues.forEach(i => {
        const format = i.SourceFormat || "CONTAINER";
        let sevValue = "";
        if (format === "SAST_DAST") {
          sevValue = i.Criticality || i.CriticalityStatus || i["Criticality Status"] || i.Severity || "";
        } else if (format === "VAPT") {
          sevValue = i["Risk Factor"] || i.RiskFactor || i.Severity || "";
        } else {
          sevValue = i.Severity || "";
        }
        const sev = (sevValue || "").toLowerCase().trim();
        if (sev === "critical" || sev === "urgent") counts.Critical++;
        else if (sev === "high") counts.High++;
        else if (sev === "medium" || sev === "moderate" || sev === "exception") counts.Medium++;
        else if (sev === "low" || sev === "info") counts.Low++;
        else counts.Medium++;
      });
      const allData = [
        { name: "Critical", value: counts.Critical, color: "#dc2626" },
        { name: "High", value: counts.High, color: "#f97316" },
        { name: "Medium", value: counts.Medium, color: "#eab308" },
        { name: "Low", value: counts.Low, color: "#22c55e" },
      ];
      return {
        data: allData.filter(d => d.value > 0),
        allData: allData,
        total: allIssues.length,
        counts
      };
    } catch {
      return { data: [], total: 0, allData: [], counts: { Critical: 0, High: 0, Medium: 0, Low: 0 } };
    }
  }, [activeIssues]);

  // richyrik - update cspmFindingChartData to use fendralis
  const cspmFindingChartData = useMemo(() => {
    if (dashboardStats?.cspm) {
      return dashboardStats.cspm.map((c: any) => ({ name: c.name, count: c.count }));
    }
    try {
      const fendralis = tableFilteredIssues || [];
      const cspmIssues = fendralis.filter(i => i.SourceFormat === "CSPM");
      const findingMap: Record<string, number> = {};
      cspmIssues.forEach(i => {
        const findingName = i.finding_name || i.FindingName || "Unknown";
        if (findingName && findingName !== "NA" && findingName !== "Unknown") {
          findingMap[findingName] = (findingMap[findingName] || 0) + 1;
        }
      });
      const mexwf = Object.entries(findingMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
      return mexwf;
    } catch {
      return [];
    }
  }, [tableFilteredIssues, dashboardStats]);

  const topRemediations = useMemo(() => {
    if (dashboardStats?.remediations) {
      return dashboardStats.remediations;
    }
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
  }, [groupedIssues, dashboardStats]);

  const slaComplianceData = useMemo(() => {
    try {
      const resolved = (activeIssues || []).filter(i => isResolved(i.Status));
      const resolvedOnTime = resolved.filter(i => {
        if (!i.DueDate || i.DueDate === "NA") return true;
        try {
          const dueDate = new Date(i.DueDate);
          const resolvedDate = i.ResolvedAt ? new Date(i.ResolvedAt) : new Date();
          return resolvedDate <= dueDate;
        } catch { return true; }
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
  }, [activeIssues]);

  const ageDistributionData = useMemo(() => {
    try {
      const now = new Date();
      const openIssues = (activeIssues || []).filter(i => !isResolved(i.Status));
      const buckets = { "0-7 days": 0, "8-30 days": 0, "31-90 days": 0, "90+ days": 0 };

      openIssues.forEach(issue => {
        try {
          const discovered = issue.DiscoveredDate && issue.DiscoveredDate !== "NA"
            ? new Date(issue.DiscoveredDate)
            : now;
          const days = Math.floor((now.getTime() - discovered.getTime()) / (1000 * 60 * 60 * 24));

          if (days <= 7) buckets["0-7 days"]++;
          else if (days <= 30) buckets["8-30 days"]++;
          else if (days <= 90) buckets["31-90 days"]++;
          else buckets["90+ days"]++;
        } catch {
          buckets["0-7 days"]++;
        }
      });

      return Object.entries(buckets).map(([name, value]) => ({ name, value }));
    } catch {
      return [];
    }
  }, [activeIssues]);

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

  const weekComparison = useMemo(() => {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - 7);

      const lastWeekStart = new Date(now);
      lastWeekStart.setDate(now.getDate() - 14);

      const lastWeekEnd = new Date(now);
      lastWeekEnd.setDate(now.getDate() - 7);

      const issues = activeIssues || [];

      const getDateValue = (dateStr: string) => {
        if (!dateStr || dateStr === "NA") return null;
        try {
          return new Date(dateStr);
        } catch { return null; }
      };

      const thisWeekDiscovered = issues.filter(i => {
        const d = getDateValue(i.DiscoveredDate || i.FirstDetected);
        return d && d >= thisWeekStart && d <= now;
      }).length;

      const lastWeekDiscovered = issues.filter(i => {
        const d = getDateValue(i.DiscoveredDate || i.FirstDetected);
        return d && d >= lastWeekStart && d < lastWeekEnd;
      }).length;

      const thisWeekResolved = issues.filter(i => {
        const d = getDateValue(i.ResolvedAt);
        return d && d >= thisWeekStart && d <= now;
      }).length;

      const lastWeekResolved = issues.filter(i => {
        const d = getDateValue(i.ResolvedAt);
        return d && d >= lastWeekStart && d < lastWeekEnd;
      }).length;

      const thisWeekCritical = issues.filter(i => {
        const d = getDateValue(i.DiscoveredDate || i.FirstDetected);
        const sev = (i.Severity || i.CriticalityStatus || "").toLowerCase();
        return d && d >= thisWeekStart && d <= now && (sev === "critical" || sev === "high");
      }).length;

      const lastWeekCritical = issues.filter(i => {
        const d = getDateValue(i.DiscoveredDate || i.FirstDetected);
        const sev = (i.Severity || i.CriticalityStatus || "").toLowerCase();
        return d && d >= lastWeekStart && d < lastWeekEnd && (sev === "critical" || sev === "high");
      }).length;

      const thisWeekOverdue = issues.filter(i => {
        const due = getDateValue(i.DueDate);
        return due && due < now && due >= thisWeekStart && !isResolved(i.Status);
      }).length;

      const lastWeekOverdue = issues.filter(i => {
        const due = getDateValue(i.DueDate);
        return due && due < lastWeekEnd && due >= lastWeekStart && !isResolved(i.Status);
      }).length;

      const calcChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      return {
        thisWeek: {
          discovered: thisWeekDiscovered,
          resolved: thisWeekResolved,
          critical: thisWeekCritical,
          overdue: thisWeekOverdue,
        },
        lastWeek: {
          discovered: lastWeekDiscovered,
          resolved: lastWeekResolved,
          critical: lastWeekCritical,
          overdue: lastWeekOverdue,
        },
        change: {
          discovered: calcChange(thisWeekDiscovered, lastWeekDiscovered),
          resolved: calcChange(thisWeekResolved, lastWeekResolved),
          critical: calcChange(thisWeekCritical, lastWeekCritical),
          overdue: calcChange(thisWeekOverdue, lastWeekOverdue),
        }
      };
    } catch {
      return {
        thisWeek: { discovered: 0, resolved: 0, critical: 0, overdue: 0 },
        lastWeek: { discovered: 0, resolved: 0, critical: 0, overdue: 0 },
        change: { discovered: 0, resolved: 0, critical: 0, overdue: 0 },
      };
    }
  }, [activeIssues]);

  const dueDateAlerts = useMemo(() => {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const openIssues = (activeIssues || []).filter(i => !isResolved(i.Status));

      const overdue = openIssues.filter(i => {
        if (!i.DueDate || i.DueDate === "NA") return false;
        try {
          return new Date(i.DueDate) < now;
        } catch { return false; }
      });

      const dueToday = openIssues.filter(i => {
        if (!i.DueDate || i.DueDate === "NA") return false;
        try {
          const due = new Date(i.DueDate);
          return due >= now && due < tomorrow;
        } catch { return false; }
      });

      const dueThisWeek = openIssues.filter(i => {
        if (!i.DueDate || i.DueDate === "NA") return false;
        try {
          const due = new Date(i.DueDate);
          return due >= tomorrow && due < nextWeek;
        } catch { return false; }
      });

      return { overdue, dueToday, dueThisWeek };
    } catch {
      return { overdue: [], dueToday: [], dueThisWeek: [] };
    }
  }, [groupedIssues]);

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


  /**
   * buildEmailFilterParams — mirrors doDynamicExport's param construction.
   * Both use the same AppContent filter state → same _build_db_query() call on backend.
   * This is the single source of truth: no separate filter state for email.
   */
  const buildEmailFilterParams = () => {
    const params = new URLSearchParams();

    if (selectedFormatFilter !== "All") params.append("source_format", selectedFormatFilter);

    // richyrik: Prevent payload overflow by only appending batches if it is a subset
    const totalFormatBatches = batches.filter(b => selectedFormatFilter === "All" || (batchFormats[b] || "CONTAINER") === selectedFormatFilter).length;
    if (!(dateFrom || dateTo) && selectedBatches.length > 0 && selectedBatches.length < totalFormatBatches) {
      params.append("upload_batch", selectedBatches.join("||"));
    }

    if (activeFilters.assignedTo !== "All Owners") {
      params.append("assigned_to", activeFilters.assignedTo);
    }

    if (selectedFormatFilter === "CONTAINER") {
      if (selectedContainerSubTypes.length > 0) params.append("container_sub_types", selectedContainerSubTypes.join("||"));
    }

    if (searchTerm) {
      params.append("is_advanced_search", "true");
      params.append("search", searchTerm);
      params.append("search_field", searchField);
    }
    if (filter !== "All" && filter !== "ZeroDay") params.append("severity", filter);

    if (quickFilter === "critical") params.append("severity", "Critical");
    if (quickFilter === "overdue") {
      params.append("status", "Open");
    } else if (activeFilters.resolutionStatus !== "All") {
      params.append("status", activeFilters.resolutionStatus);
    }

    if (dateFrom) params.append("date_from", dateFrom);
    if (dateTo) params.append("date_to", dateTo);

    return params;
  };

  /**
   * handleShareEmailSubmit — Microsoft Graph server-side draft
   *
   * Sends current Export View filters to POST /api/share/outlook.
   * The backend:
   *   1. Queries MongoDB with the exact same filters as Export View.
   *   2. Generates the XLSX (no browser download).
   *   3. Optionally generates the Resolved/Unresolved graph PNG.
   *   4. Calls Microsoft Graph to create a draft in the configured mailbox.
   *   5. Attaches the XLSX (and optional PNG) to the draft.
   *   6. Returns the draft URL so the user can open it in Outlook.
   *
   * No local helper. No browser download. No manual attachment.
   */

  const handleGenerateAiRemediation = async (issue: Issue, regenerate: boolean = false) => {
    const id = issue.IssueID;
    setIsAiGenerating(prev => ({ ...prev, [id]: true }));
    setAiError(prev => ({ ...prev, [id]: null }));

    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/remediation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          IssueID: id,
          UploadBatch: issue.UploadBatch,
          SourceFormat: issue.SourceFormat || issue.Type || issue.Category || "UNKNOWN",
          vulnerability: issue,
          regenerate
        })
      });

      const textResponse = await response.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch {
        throw new Error("The AI request timed out at the server proxy or returned an invalid format.");
      }
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate AI remediation');
      }

      if (data.status === "processing") {
        let intervalId: any;
        let timeoutId: any;
        const checkStatus = async () => {
          try {
            const params = new URLSearchParams({ issue_id: id, upload_batch: issue.UploadBatch || "", source_format: issue.SourceFormat || issue.Type || issue.Category || "UNKNOWN" });
            const sRes = await fetch(`${BACKEND_URL}/api/ai/remediation/status?${params.toString()}`);
            const sText = await sRes.text();
            let sData;
            try { sData = JSON.parse(sText); } catch { throw new Error("The AI request timed out at the server proxy or returned an invalid format."); }
            if (sData.status === "completed" && sData.result) {
              clearInterval(intervalId);
              clearTimeout(timeoutId);
              setAiRemediationData(prev => ({ ...prev, [id]: sData.result }));
              setIsAiGenerating(prev => ({ ...prev, [id]: false }));
            }
          } catch {
            return;
          }
        };
        intervalId = setInterval(checkStatus, 3000);
        timeoutId = setTimeout(() => {
          clearInterval(intervalId);
          setAiError(prev => ({ ...prev, [id]: "AI Remediation timed out after 5 minutes." }));
          setIsAiGenerating(prev => ({ ...prev, [id]: false }));
        }, 300000);
      } else {
        setAiRemediationData(prev => ({ ...prev, [id]: data.result }));
        setIsAiGenerating(prev => ({ ...prev, [id]: false }));
      }
    } catch (err: any) {
      setAiError(prev => ({ ...prev, [id]: err.message || 'Unable to generate AI remediation. Please verify the Ollama service.' }));
      setIsAiGenerating(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleShareEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiRecipient || totalRecords === 0) return;

    setShareStep('preparing');
    setShareError('');
    setShareResult(null);

    try {
      const params = buildEmailFilterParams();
      params.append('recipient', aiRecipient);
      if (includeGraph) params.append('include_graph', 'true');
      params.append('graph_mode', emailGraphMode);
      // Mirror Export View column selection so XLSX has identical columns
      if (exportCols.length > 0) params.append('columns', exportCols.join(','));

      const response = await fetch(
        `${BACKEND_URL}/api/share/outlook?${params.toString()}`,
        { method: 'POST' }
      );

      const data = await response.json().catch(() => ({})) as any;

      if (!response.ok) {
        const msg: string = data.error || `Server error (${response.status})`;
        if (response.status === 404) {
          setShareError('No vulnerabilities match the current Export View filters.');
        } else if (msg.toLowerCase().includes('excel') || msg.toLowerCase().includes('generate')) {
          setShareError('Unable to generate the Excel report. Please try again.');
        } else {
          setShareError(msg);
        }
        setShareStep('error');
        return;
      }

      const result = data as ShareResult;
      setShareResult(result);
      setShareStep('done');

    } catch (err: any) {
      setShareError(err.message || 'Unable to reach the server. Please try again.');
      setShareStep('error');
    }
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
    } catch {
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
      setSheetInfo([]);
      setSelectedSheet("");
      setIsSheetSelectMode(false);
      setDetectedFormat("");
      setIsDuplicatePromptOpen(false);
      setDuplicatePromptMessage("");
      setDuplicateUploadApproved(false);
      setIsUploadModalOpen(true);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processUploadRequest = async (allowDuplicateUpload: boolean) => {
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

      if (allowDuplicateUpload) {
        formData.append("allowDuplicateUpload", "true");
      }

      if (isSheetSelectMode && selectedSheet) {
        formData.append("sheetName", selectedSheet);
        const response = await fetch(`${BACKEND_URL}/api/upload-report-with-sheet`, {
          method: "POST",
          body: formData,
        });

        const textResponse = await response.text();
        let data: any = {};
        if (textResponse) {
          try {
            data = JSON.parse(textResponse);
          } catch {
            data = {};
          }
        }

        if (data.duplicate) {
          const title = data.uploaded_today ? "Dataset Already Uploaded Today" : "Dataset Already Uploaded";
          const msg = data.uploaded_today
            ? "You already uploaded this dataset today.\n\nDo you still want to upload it again?"
            : `This dataset was already uploaded on ${data.previous_upload_date}.\n\nDo you still want to upload it again?`;
          setDuplicatePromptMessage(`${title}::${msg}`);
          setIsDuplicatePromptOpen(true);
          setDuplicateUploadApproved(false);
          setIsProcessing(false);
          setUploadProgress("");
          return;
        }

        if (!response.ok) {
          if (data.error) {
            throw new Error(data.error);
          }
          throw new Error(`Network blocked the upload (Status: ${response.status}).`);
        }

        if (data.format) {
          setDetectedFormat(data.format);
          setSelectedFormatFilter(data.format);
          setCurrentPage(1);
          setSearchTerm("");
          setFilter("All");
          setSearchField("All");
        }

        setUploadProgress("AI Processing Complete!");
        // richyrik: Display summary card instead of closing
        setUploadStats(data);
        setIsProcessing(false);
        setUploadCounter(prev => prev + 1);
        return;
      }

      // richyrik
      let fendralis: any = formData;
      const response = await fetch(`${BACKEND_URL}/api/upload-report`, {
        method: "POST",
        credentials: "include",
        body: fendralis,
      });

      fendralis = await response.text();
      let data: any = {};
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          data = JSON.parse(fendralis);
        } catch {
          data = {};
        }
      } else if (!response.ok) {
        let mexwf = `Server Error (${response.status}).`;
        if (response.status === 413) mexwf = "Server Error (413): Nginx blocked the upload because the file is too large.";
        if (response.status === 504) mexwf = "Server Error (504): The server timed out processing this file.";
        if (response.status === 403) mexwf = "Server Error (403): Forbidden. You lack permissions, or the corporate firewall blocked the payload.";
        throw new Error(mexwf);
      }

      if (data.duplicate) {
        const title = data.uploaded_today ? "Dataset Already Uploaded Today" : "Dataset Already Uploaded";
        const msg = data.uploaded_today
          ? "You already uploaded this dataset today.\n\nDo you still want to upload it again?"
          : `This dataset was already uploaded on ${data.previous_upload_date}.\n\nDo you still want to upload it again?`;
        setDuplicatePromptMessage(`${title}::${msg}`);
        setIsDuplicatePromptOpen(true);
        setDuplicateUploadApproved(false);
        setIsProcessing(false);
        setUploadProgress("");
        return;
      }

      if (data.status === "select_sheet" && data.sheets) {
        setAvailableSheets(data.sheets);
        setSheetInfo(data.sheet_info || []);
        const nonPivotSheet = (data.sheet_info || []).find((s: { is_pivot: boolean }) => !s.is_pivot);
        setSelectedSheet(nonPivotSheet?.name || data.sheets[0] || "");
        setIsSheetSelectMode(true);
        setIsProcessing(false);
        setUploadProgress("");
        return;
      }

      if (data.format) {
        setDetectedFormat(data.format);
        setSelectedFormatFilter(data.format);
        setCurrentPage(1);
        setSearchTerm("");
        setFilter("All");
        setSearchField("All");
      }

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadProgress("AI Processing Complete!");
      // richyrik: Display summary card instead of closing
      setUploadStats(data);
      setIsProcessing(false);
      setUploadCounter(prev => prev + 1);
    } catch (err: unknown) {
      setDuplicateUploadApproved(false);
      setIsProcessing(false);
      setUploadProgress("");
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`AI Processing Failed:\n${errorMessage}`);
    }
  };

  const processAndUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    await processUploadRequest(duplicateUploadApproved);
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

  // richyrik
  const doDynamicExport = async () => {
    const fileName = exportFileName.trim() || "Wynk_Security_Report";

    if (exportCols.length === 0) {
      alert("No columns selected. Please configure columns before exporting.");
      return;
    }

    try {
      setIsLoading(true);

      const params = buildEmailFilterParams();
      const fendralis = {
        filters: Object.fromEntries(params.entries()),
        columns: exportCols,
        // richyrik: Pass the requested filename to the backend
        fileName: fileName,
      };

      const res = await fetch(`${BACKEND_URL}/api/export-massive`, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fendralis),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Backend error ${res.status}: ${errText}`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${fileName}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setIsExportModalOpen(false);
    } catch (err: unknown) {
      console.error("Export error:", err);
      alert(`Export Failed:\n${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
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
    <div className="min-h-screen font-sans bg-slate-950 text-slate-100">
      {/* richyrik: Sticky glassmorphism header — matches FinOps dashboard style */}
      <header className="sticky top-0 z-50 bg-slate-900/80 border-b border-slate-800 backdrop-blur-sm px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <img src="/airtel-logo.svg" alt="Airtel" className="h-9 w-auto" />
          <div className="h-7 w-px bg-slate-700" />
          {/* richyrik: CloudOps icon pill matching the landing page card */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/15 rounded-lg ring-1 ring-purple-500/30">
              <Shield size={18} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Wynk Security Portal</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Cloud Ops & Vulnerability Management</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-0">
          {/* richyrik: Home navigation button — returns to the module landing page */}
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Back to Home"
            >
              <Home size={13} /> Home
            </button>
          )}
          <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Connected
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg transition-colors bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
            title="Toggle theme"
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <div className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700">
            <Users size={13} className="text-slate-500" />
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="bg-transparent font-medium outline-none cursor-pointer text-sm text-slate-300"
            >
              <option value="Admin">Admin</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>
          {/* richyrik: FY date badge matching FinOps */}
          <span className="text-xs text-slate-500 hidden md:block">
            FY {new Date().getFullYear()} · {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </header>

      {/* richyrik: Main content wrapper with padding */}
      <div className="p-6 lg:p-8">

      {/* richyrik: Overdue/due-today alert banner styled to match FinOps */}
      {(dueDateAlerts.overdue.length > 0 || dueDateAlerts.dueToday.length > 0) && (
        <div className="mb-5 p-4 rounded-xl bg-slate-900 ring-1 ring-red-500/30 border-l-4 border-l-red-500 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AlertCircle className="text-red-400" size={18} />
            <div className="flex items-center gap-5 text-sm">
              {dueDateAlerts.overdue.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400">{dueDateAlerts.overdue.length}</span>
                  <span className="font-medium text-slate-300">Overdue</span>
                </div>
              )}
              {dueDateAlerts.dueToday.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400">{dueDateAlerts.dueToday.length}</span>
                  <span className="font-medium text-slate-400">Due Today</span>
                </div>
              )}
              {dueDateAlerts.dueThisWeek.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-700 text-slate-300">{dueDateAlerts.dueThisWeek.length}</span>
                  <span className="text-slate-500">This Week</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setQuickFilter("overdue")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors ring-1 ring-red-500/30"
          >
            View <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* richyrik: View mode + format tab bars — FinOps pill style */}
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div className="flex p-1 rounded-xl bg-slate-900 ring-1 ring-slate-800">
          {[
            { id: 'Optimized', label: 'Dashboard' },
            { id: 'Raw', label: 'Export View' },
            { id: 'Calendar', label: 'Calendar', icon: CalendarDays },
            { id: 'Manager', label: 'Manager View', icon: Users },
          ].map((tab) => {
            const Icon = (tab as any).icon;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as any)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  viewMode === tab.id
                    ? 'bg-purple-600/20 text-purple-300 ring-1 ring-purple-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {Icon && <Icon size={14} />}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* richyrik: Format filter — purple accent pills matching CloudOps branding */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 ring-1 ring-slate-800 mx-auto">
          {[
            { id: "CONTAINER", label: "Container", icon: Server },
            { id: "VAPT", label: "VAPT", icon: Shield },
            { id: "CSPM", label: "CSPM", icon: Activity },
            { id: "SAST_DAST", label: "SAST/DAST", icon: FileText }
          ].map(fmt => {
            const Icon = fmt.icon;
            const isActive = selectedFormatFilter === fmt.id;
            return (
              <button
                key={fmt.id}
                onClick={() => handleFormatFilterChange(fmt.id)}
                className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  isActive
                    ? 'bg-purple-600/25 text-purple-300 ring-1 ring-purple-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon size={15} />
                {fmt.label}
              </button>
            );
          })}
        </div>

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

      {/* richyrik */}
      {viewMode === "Manager" ? (
        <ManagerReportView darkMode={darkMode} />
      ) : viewMode === "Calendar" ? <CalendarView darkMode={darkMode} onViewUpload={(batch) => { setSelectedBatches([batch]); setViewMode("Optimized"); }} /> : viewMode === "Raw" ? (
        <div className={`p-5 rounded-lg border mb-6 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className={`font-semibold text-sm mb-0.5 ${darkMode ? "text-white" : "text-slate-800"}`}>
                Export Preview
              </h2>
              <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                {activeIssues.length} records
              </p>
            </div>
            <button
              onClick={mexwfExport}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${darkMode ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              <Wrench size={14} /> Configure Columns
            </button>
          </div>

          <div className={`overflow-x-auto h-[600px] rounded-lg border ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className={`sticky top-0 z-10 ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                <tr>
                  {exportCols.map(col => (
                    <th key={col} className={`p-3 font-semibold text-[11px] uppercase tracking-wide ${darkMode ? "text-slate-400 border-b border-slate-700" : "text-slate-500 border-b border-slate-200"}`}>
                      {colHeaderMap[col] || col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={darkMode ? "bg-slate-900" : "bg-white"}>
                {activeIssues.map((issue, idx) => {
                  return (
                    <tr key={idx} className={`transition-colors ${darkMode ? "hover:bg-slate-800/50 border-b border-slate-800" : "hover:bg-slate-50 border-b border-slate-100"}`}>
                      {exportCols.map(col => {
                        let fendralis = issue[col] !== undefined && issue[col] !== null ? String(issue[col]) : "";
                        if (["ID", "Project ID", "Projects"].includes(col) && fendralis === "") fendralis = "NA";
                        if ((col === "AffectedAsset" || col === "AssetName") && fendralis) {
                          fendralis = getShortAssetName(fendralis);
                        }
                        if (col === "VulnDescription" && (!fendralis || fendralis === "—" || fendralis.toLowerCase() === "na")) {
                          fendralis = generateVulnDescription(issue as Issue);
                        }
                        return (
                          <td key={col} className={`p-3 min-w-[120px] whitespace-normal ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                            {fendralis || "—"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {activeIssues.length === 0 && (
                  <tr>
                    <td colSpan={exportCols.length || 1} className={`p-8 text-center ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
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
          {/* richyrik: KPI cards — purple/indigo/blue/amber/red accent palette */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card title="Total Vulnerabilities" val={totalRecords || 0} Icon={Bug}
              color="" bg="" accentColor="text-indigo-400" ringColor="bg-indigo-500/15 ring-indigo-500/30" />
            <Card title="Unique CVEs" val={stats?.uniqueVulns || 0} Icon={Shield}
              color="" bg="" accentColor="text-purple-400" ringColor="bg-purple-500/15 ring-purple-500/30" />
            <Card title="Affected Assets" val={stats?.uniqueAssets || 0} Icon={Server}
              color="" bg="" accentColor="text-blue-400" ringColor="bg-blue-500/15 ring-blue-500/30" />
            <Card title="Critical Risks" val={stats?.criticalOpen || 0} Icon={AlertTriangle}
              color="" bg="" accentColor="text-amber-400" ringColor="bg-amber-500/15 ring-amber-500/30" />
            <Card title="SLA Breached" val={stats?.breached || 0} Icon={Flame}
              color="" bg="" accentColor="text-red-400" ringColor="bg-red-500/15 ring-red-500/30" />
          </div>

          {/* richyrik: Three-column analytics row — FinOps ring-panel style */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
            {/* SLA Compliance */}
            <div className="bg-slate-900 ring-1 ring-slate-800 rounded-xl p-6 hover:ring-slate-700 transition-all">
              <h2 className="font-bold text-sm mb-5 flex items-center gap-2 text-slate-200">
                <div className="p-1.5 rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30">
                  <Target size={15} className="text-emerald-400" />
                </div>
                SLA Compliance
              </h2>
              <div className="flex items-center justify-center mb-5">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="#1e293b" strokeWidth="12" fill="none" />
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
                    <span className={`text-2xl font-bold ${slaComplianceData.compliance >= 80 ? "text-emerald-400" : slaComplianceData.compliance >= 60 ? "text-amber-400" : "text-red-400"}`}>
                      {slaComplianceData.compliance}%
                    </span>
                    <span className="text-[10px] text-slate-500">Compliance</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-slate-800 ring-1 ring-slate-700">
                  <p className="text-lg font-bold text-slate-200">{slaComplianceData.total}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Total Resolved</p>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
                  <p className="text-lg font-bold text-emerald-400">{slaComplianceData.onTime}</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">On Time</p>
                </div>
                <div className="p-2.5 rounded-lg bg-red-500/10 ring-1 ring-red-500/20">
                  <p className="text-lg font-bold text-red-400">{slaComplianceData.breached}</p>
                  <p className="text-[10px] text-red-600 mt-0.5">Breached</p>
                </div>
              </div>
            </div>


            {/* richyrik: Vulnerability Age Distribution */}
            <div className="bg-slate-900 ring-1 ring-slate-800 rounded-xl p-5 hover:ring-slate-700 transition-all">
              <h2 className="font-bold text-sm mb-5 flex items-center gap-2 text-slate-200">
                <div className="p-1.5 rounded-lg bg-blue-500/15 ring-1 ring-blue-500/30">
                  <Clock size={15} className="text-blue-400" />
                </div>
                Vulnerability Age Distribution
              </h2>
              <div className="h-48 flex items-center justify-center">
                {ageDistributionData && ageDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageDistributionData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1e293b" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <RechartsTooltip contentStyle={{ fontSize: "12px", border: "1px solid #1e293b", borderRadius: 8, backgroundColor: "#0f172a" }} />
                      <Bar isAnimationActive={true} dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                        {ageDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 3 ? "#ef4444" : index === 2 ? "#f59e0b" : "#6366f1"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center">
                    <Clock size={28} className="text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 uppercase font-semibold tracking-widest">No Active Issues</p>
                  </div>
                )}
              </div>
            </div>

            {/* richyrik: Resolution Tracking */}
            <div className="bg-slate-900 ring-1 ring-slate-800 rounded-xl p-6 hover:ring-slate-700 transition-all">
              <h2 className="font-bold text-sm mb-5 flex items-center gap-2 text-slate-200">
                <div className="p-1.5 rounded-lg bg-purple-500/15 ring-1 ring-purple-500/30">
                  <CheckCircle size={15} className="text-purple-400" />
                </div>
                Resolution Tracking
              </h2>
              <div className="flex flex-col justify-center h-48 space-y-5">
                {[
                  { label: 'Open', count: dashboardStats?.status?.open || 0, color: 'text-red-400', bar: 'bg-red-500', key: 'open' },
                  { label: 'In Progress', count: dashboardStats?.status?.progress || 0, color: 'text-blue-400', bar: 'bg-blue-500', key: 'progress' },
                  { label: 'Resolved', count: dashboardStats?.status?.resolved || 0, color: 'text-emerald-400', bar: 'bg-emerald-500', key: 'resolved' },
                ].map(({ label, count, color, bar, key }) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className={color}>{label}</span>
                      <span className="text-white">{count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${isMounted && dashboardStats?.total > 0 ? (count / dashboardStats.total) * 100 : 0}%` }}
                        className={`h-full ${bar} rounded-full transition-all duration-1000 ease-out`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* richyrik: Risk Heatmap — FinOps ring-panel style */}
          <div className="bg-slate-900 ring-1 ring-slate-800 rounded-xl p-5 mb-6">
            <h2 className="font-bold text-sm mb-5 flex items-center gap-2 text-slate-200">
              <div className="p-1.5 rounded-lg bg-amber-500/15 ring-1 ring-amber-500/30">
                <Zap size={15} className="text-amber-400" />
              </div>
              Risk Heatmap: Severity vs Department
            </h2>
            {riskHeatmapData.depts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="p-2 text-left font-semibold text-slate-500 uppercase tracking-widest text-[10px]">Department</th>
                      {riskHeatmapData.severities.map(sev => (
                        <th key={sev} className="p-2 text-center font-semibold text-slate-500 uppercase tracking-widest text-[10px]">{sev}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {riskHeatmapData.depts.map(dept => (
                      <tr key={dept} className="border-t border-slate-800/80">
                        <td className="p-2 font-medium text-slate-300">{dept}</td>
                        {riskHeatmapData.severities.map(sev => {
                          const count = riskHeatmapData.heatmap[dept]?.[sev] || 0;
                          const cellBg = count === 0 ? 'bg-slate-800/40' : count <= 2 ? 'bg-yellow-500/20' : count <= 5 ? 'bg-orange-500/25' : 'bg-red-500/30';
                          return (
                            <td key={sev} className={`p-2 text-center ${cellBg} rounded`}>
                              <span className={`font-bold ${count > 0 ? 'text-white' : 'text-slate-600'}`}>{count}</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10">
                <Zap size={28} className="text-slate-700 mb-2" />
                <p className="text-xs text-slate-600 uppercase font-semibold tracking-widest">No data available for heatmap</p>
              </div>
            )}
          </div>

          {/* richyrik: Asset Resolution Pipeline — FinOps dark pill stage style */}
          <div className="bg-slate-900 ring-1 ring-slate-800 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-sm flex items-center gap-2 text-slate-200">
                <div className="p-1.5 rounded-lg bg-slate-700 ring-1 ring-slate-600">
                  <Activity size={15} className="text-slate-400" />
                </div>
                Asset Resolution Pipeline (MTTR)
              </h2>
              <span className="text-xs font-semibold text-slate-500">
                Resolution Velocity: <span className="text-purple-400 font-bold">
                  {stats?.total > 0 && pipeline?.resolved !== undefined ? ((pipeline.resolved / stats.total) * 100).toFixed(1) : 0}%
                </span>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch gap-3 mb-4">
              {[
                { label: 'Open Assets', count: pipeline?.open || 0, bg: 'bg-slate-800 ring-slate-700', text: 'text-slate-300', count_color: 'text-white' },
                { label: 'In Progress', count: pipeline?.progress || 0, bg: 'bg-blue-500/10 ring-blue-500/30', text: 'text-blue-400', count_color: 'text-blue-300' },
                { label: 'Resolved', count: pipeline?.resolved || 0, bg: 'bg-emerald-500/10 ring-emerald-500/30', text: 'text-emerald-400', count_color: 'text-emerald-300' },
              ].map((stage, idx, arr) => (
                <React.Fragment key={stage.label}>
                  <div className={`flex-1 ${stage.bg} ring-1 rounded-xl p-4 flex justify-between items-center`}>
                    <p className={`text-sm font-semibold ${stage.text}`}>{stage.label}</p>
                    <p className={`text-2xl font-bold tabular-nums ${stage.count_color}`}>{stage.count}</p>
                  </div>
                  {idx < arr.length - 1 && <div className="flex items-center justify-center px-1">
                    <ArrowRight className="text-slate-600" size={16} />
                  </div>}
                </React.Fragment>
              ))}
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
              <div
                style={{ width: `${stats?.total > 0 && pipeline?.open !== undefined ? (pipeline.open / stats.total) * 100 : 0}%` }}
                className="bg-slate-500 h-full rounded-full"
              />
              <div
                style={{ width: `${stats?.total > 0 && pipeline?.progress !== undefined ? (pipeline.progress / stats.total) * 100 : 0}%` }}
                className="bg-blue-500 h-full"
              />
              <div
                style={{ width: `${stats?.total > 0 && pipeline?.resolved !== undefined ? (pipeline.resolved / stats.total) * 100 : 0}%` }}
                className="bg-emerald-500 h-full rounded-full"
              />
            </div>
          </div>

          {/* richyrik: Criticality Status + Vulnerability Types — FinOps ring-panel style */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
            <div className="bg-slate-900 ring-1 ring-slate-800 rounded-xl p-5 hover:ring-slate-700 transition-all">
              <h2 className="font-bold text-sm mb-4 text-slate-200 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-500/15 ring-1 ring-red-500/30">
                  <AlertTriangle size={15} className="text-red-400" />
                </div>
                Criticality Status
              </h2>
              <div className="flex flex-col items-center">
                <div className="h-48 w-full flex items-center justify-center">
                  {severityPieData.data && severityPieData.data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie isAnimationActive={true} data={severityPieData.data} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                          {severityPieData.data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || "#000"} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ fontSize: "12px", border: "1px solid #1e293b", borderRadius: 8, backgroundColor: "#0f172a", color: "#e2e8f0" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center">
                      <AlertTriangle size={28} className="text-slate-700 mx-auto mb-2" />
                      <p className="text-xs text-slate-600 uppercase font-semibold tracking-widest">No Issues</p>
                    </div>
                  )}
                </div>
                {severityPieData.allData && severityPieData.allData.length > 0 && (
                  <>
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                      {severityPieData.allData.filter(item => item.value > 0).map((item) => (
                        <div key={item.name} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs font-semibold text-slate-300">{item.name}: {item.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800 text-center w-full">
                      <span className="text-sm font-bold text-slate-200">Total Vulnerabilities: {severityPieData.total}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="lg:col-span-2 bg-slate-900 ring-1 ring-slate-800 rounded-xl p-5 hover:ring-slate-700 transition-all">
              <h2 className="font-bold text-sm mb-4 text-slate-200 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/15 ring-1 ring-indigo-500/30">
                  <Bug size={15} className="text-indigo-400" />
                </div>
                Vulnerability Types
              </h2>
              <div className="h-64 flex items-center justify-center">
                {typeChartData && typeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={typeChartData} margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1e293b" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{ fill: "#1e293b" }} contentStyle={{ fontSize: "12px", border: "1px solid #1e293b", borderRadius: 8, backgroundColor: "#0f172a", color: "#e2e8f0" }} />
                      <Bar isAnimationActive={true} dataKey="Issues" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center">
                    <Bug size={28} className="text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 uppercase font-semibold tracking-widest">No Active Data</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {(currentFormat === "CONTAINER" || selectedFormatFilter === "CONTAINER") && (
            <div className="bg-slate-900 ring-1 ring-slate-800 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-violet-500/15 ring-1 ring-violet-500/30">
                    <Server size={15} className="text-violet-400" />
                  </div>
                  Container Sub-Types
                  {selectedOwners.length > 0 && (
                    <span className="text-xs text-slate-500 font-normal ml-1">(Filtered by Owner)</span>
                  )}
                </h2>
              </div>

              {/* richyrik - Checkboxes moved to Advanced Search panel; Sub-Type metric cards retained below */}

              {/* richyrik - Sub-Type metric cards replacing the error placeholder */}
              <div className="mb-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {(["Zero day VA", "Wiz CLI Integration", "Compliance VA", "Quarterly VA", "Unclassified"] as const).map(subtype => {
                    const colorMap: Record<string, string> = {
                      "Zero day VA": "bg-red-50 border-red-200 text-red-700",
                      "Wiz CLI Integration": "bg-violet-50 border-violet-200 text-violet-700",
                      "Compliance VA": "bg-amber-50 border-amber-200 text-amber-700",
                      "Quarterly VA": "bg-sky-50 border-sky-200 text-sky-700",
                      "Unclassified": "bg-slate-50 border-slate-200 text-slate-600",
                    };
                    const darkColorMap: Record<string, string> = {
                      "Zero day VA": "bg-red-900/20 border-red-800 text-red-300",
                      "Wiz CLI Integration": "bg-violet-900/20 border-violet-800 text-violet-300",
                      "Compliance VA": "bg-amber-900/20 border-amber-800 text-amber-300",
                      "Quarterly VA": "bg-sky-900/20 border-sky-800 text-sky-300",
                      "Unclassified": "bg-slate-700/40 border-slate-600 text-slate-400",
                    };
                    const isSelected = selectedContainerSubTypes.includes(subtype);
                    const colorClass = darkMode ? darkColorMap[subtype] : colorMap[subtype];
                    return (
                      <button
                        key={subtype}
                        onClick={() => setSelectedContainerSubTypes(prev =>
                          isSelected ? prev.filter(s => s !== subtype) : [...prev, subtype]
                        )}
                        className={`flex flex-col items-start p-3 rounded-lg border-2 transition-all cursor-pointer text-left w-full ${isSelected
                          ? `${colorClass} ring-2 ring-offset-1 ${darkMode ? "ring-slate-400" : "ring-slate-500"}`
                          : `${colorClass} opacity-80 hover:opacity-100`
                          }`}
                      >
                        <span className="text-2xl font-bold tabular-nums">
                          {containerSubtypeStats[subtype] ?? 0}
                        </span>
                        <span className="text-xs font-semibold mt-1 leading-tight">{subtype}</span>
                        {isSelected && (
                          <span className="mt-1 text-[10px] font-medium opacity-70">● Filtering</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedContainerSubTypes.length > 0 && (
                  <button
                    onClick={() => setSelectedContainerSubTypes([])}
                    className="mt-2 text-xs text-blue-500 hover:text-blue-700 underline"
                  >
                    Clear sub-type filter
                  </button>
                )}
              </div>

              <div className="h-80 mt-6">
                {containerChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={containerChartData}
                      margin={{ left: 20, right: 30, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#374151" : "#e2e8f0"} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }}
                      />
                      <RechartsTooltip
                        cursor={{ fill: darkMode ? "#374151" : "#f1f5f9" }}
                        contentStyle={{
                          backgroundColor: darkMode ? "#1e293b" : "#fff",
                          borderColor: darkMode ? "#374151" : "#e2e8f0",
                          color: darkMode ? "#e2e8f0" : "#1e293b",
                          fontSize: "12px",
                          borderRadius: "4px",
                        }}
                      />
                      <Bar
                        dataKey="value"
                        fill="#8b5cf6"
                        radius={[0, 4, 4, 0]}
                        barSize={30}
                        onClick={(data) => {
                          if (!data || !data.name) return;
                          const subtype = data.name;
                          setSelectedContainerSubTypes(prev => {
                            if (prev.includes(subtype)) {
                              return prev.filter(s => s !== subtype);
                            } else {
                              return [...prev, subtype];
                            }
                          });
                        }}
                        style={{ cursor: "pointer" }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-slate-400 text-sm">No data available for {selectedOwners.length > 0 ? selectedOwners.join(", ") : "All"}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {(currentFormat === "CSPM" || selectedFormatFilter === "CSPM") && cspmFindingChartData.length > 0 && (

            <div className={`p-5 rounded border mb-6 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
              <div className="flex items-center justify-between mb-4 border-b pb-2" style={{ borderColor: darkMode ? "#374151" : "#f1f5f9" }}>
                <h2 className={`font-semibold text-sm ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                  CSPM Findings by Type
                </h2>
                {selectedFindingTypes.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500">Filtered:</span>
                    {selectedFindingTypes.map(ft => (
                      <span key={ft} className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded flex items-center gap-1">
                        {ft.length > 20 ? ft.substring(0, 20) + "..." : ft}
                        <button onClick={() => setSelectedFindingTypes(prev => prev.filter(t => t !== ft))} className="ml-1 hover:text-green-900">✕</button>
                      </span>
                    ))}
                    {selectedFindingTypes.length > 1 && (
                      <button onClick={() => setSelectedFindingTypes([])} className="text-xs text-slate-500 hover:text-slate-700">Clear all</button>
                    )}
                  </div>
                )}
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cspmFindingChartData}
                    margin={{ left: 20, right: 30, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#374151" : "#e2e8f0"} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: darkMode ? "#9ca3af" : "#64748b" }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: darkMode ? "#9ca3af" : "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      cursor={{ fill: darkMode ? "#374151" : "#f1f5f9" }}
                      contentStyle={{
                        fontSize: "12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "4px",
                        backgroundColor: darkMode ? "#1f2937" : "#fff",
                      }}
                      formatter={(value) => [`${value} issues`, "Click to filter"]}
                    />
                    <Bar
                      dataKey="count"
                      name="Count"
                      radius={[4, 4, 0, 0]}
                      barSize={40}
                      cursor="pointer"
                      onClick={(data) => {
                        if (data && data.name) {
                          const fendralis = String(data.name);
                          setSelectedFindingTypes(prev =>
                            prev.includes(fendralis)
                              ? prev.filter(t => t !== fendralis)
                              : [...prev, fendralis]
                          );
                        }
                      }}
                    >
                      {cspmFindingChartData.map((entry: { name: string }, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={selectedFindingTypes.includes(entry.name) ? "#16a34a" : "#3b82f6"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {currentFormat !== "CSPM" && (
            <div className="bg-slate-900 ring-1 ring-slate-800 rounded-xl p-5 mb-6">
              <h2 className="font-bold text-sm mb-5 flex items-center gap-2 text-slate-200">
                <div className="p-1.5 rounded-lg bg-sky-500/15 ring-1 ring-sky-500/30">
                  <Activity size={15} className="text-sky-400" />
                </div>
                Discovery Timeline
              </h2>
              <div className="h-64 flex items-center justify-center">
                {timelineChartData && timelineChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineChartData} margin={{ bottom: 30, right: 20, top: 10 }}>
                      <defs>
                        <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} angle={-45} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <RechartsTooltip content={<CustomTimelineTooltip />} />
                      <Area type="monotone" dataKey="Issues" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorIssues)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center">
                    <Activity size={28} className="text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 uppercase font-semibold tracking-widest">No Active Data</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-slate-900 ring-1 ring-slate-800 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/15 ring-1 ring-cyan-500/30">
                  <Users size={15} className="text-cyan-400" />
                </div>
                Workload &amp; Risk Distribution by Assigned Owner
              </h2>
              {selectedOwners.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500">Filtered:</span>
                  {selectedOwners.map(owner => (
                    <span key={owner} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded flex items-center gap-1">
                      {owner}
                      <button onClick={() => setSelectedOwners(prev => prev.filter(o => o !== owner))} className="ml-1 hover:text-blue-900">✕</button>
                    </span>
                  ))}
                  {selectedOwners.length > 1 && (
                    <button onClick={() => setSelectedOwners([])} className="text-xs text-slate-500 hover:text-slate-700">Clear all</button>
                  )}
                </div>
              )}
            </div>
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
                    <Bar
                      dataKey="Critical"
                      stackId="a"
                      fill="#dc2626"
                      barSize={30}
                      cursor="pointer"
                      onClick={(data) => toggleOwner(data?.name)}
                    />
                    <Bar
                      dataKey="High"
                      stackId="a"
                      fill="#f97316"
                      cursor="pointer"
                      onClick={(data) => toggleOwner(data?.name)}
                    />
                    <Bar
                      dataKey="Medium"
                      stackId="a"
                      fill="#eab308"
                      cursor="pointer"
                      onClick={(data) => toggleOwner(data?.name)}
                    />
                    <Bar
                      dataKey="Low"
                      stackId="a"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => toggleOwner(data?.name)}
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

          <div className="bg-slate-900 ring-1 ring-slate-800 rounded-xl p-5 mb-6">
            <h2 className="font-bold text-sm mb-5 text-slate-200 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/15 ring-1 ring-orange-500/30">
                <Activity size={15} className="text-orange-400" />
              </div>
              Risk Distribution by Cluster
            </h2>
            <div className="h-72 flex items-center justify-center">
              {clusterChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clusterChartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: "#1e293b" }} contentStyle={{ fontSize: "12px", border: "1px solid #1e293b", borderRadius: 8, backgroundColor: "#0f172a", color: "#e2e8f0" }} />
                    <Legend wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} />
                    <Bar isAnimationActive={true} dataKey="Critical" stackId="a" fill="#dc2626" barSize={30} />
                    <Bar isAnimationActive={true} dataKey="High" stackId="a" fill="#f97316" />
                    <Bar isAnimationActive={true} dataKey="Medium" stackId="a" fill="#eab308" />
                    <Bar isAnimationActive={true} dataKey="Low" stackId="a" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center">
                  <Activity size={28} className="text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 uppercase font-semibold tracking-widest">No Active Data</p>
                </div>
              )}
            </div>
          </div>

          {(currentFormat === "VAPT" || selectedFormatFilter === "VAPT") && lobChartData.length > 0 && (
            <div className="bg-slate-900 ring-1 ring-slate-800 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/15 ring-1 ring-amber-500/30">
                    <Activity size={15} className="text-amber-400" />
                  </div>
                  Risk Distribution by LOB Name
                </h2>
                {selectedLOBs.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500">Filtered:</span>
                    {selectedLOBs.map(lob => (
                      <span key={lob} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded flex items-center gap-1">
                        {lob.length > 15 ? lob.substring(0, 15) + "..." : lob}
                        <button onClick={() => setSelectedLOBs(prev => prev.filter(l => l !== lob))} className="ml-1 hover:text-orange-900">✕</button>
                      </span>
                    ))}
                    {selectedLOBs.length > 1 && (
                      <button onClick={() => setSelectedLOBs([])} className="text-xs text-slate-500 hover:text-slate-700">Clear all</button>
                    )}
                  </div>
                )}
              </div>
              <div className="h-72 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={lobChartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#374151" : "#e2e8f0"} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: darkMode ? "#9ca3af" : "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: darkMode ? "#9ca3af" : "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      cursor={{ fill: darkMode ? "#374151" : "#f1f5f9" }}
                      contentStyle={{
                        fontSize: "12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "4px",
                        backgroundColor: darkMode ? "#1f2937" : "#fff",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar
                      dataKey="Critical"
                      stackId="a"
                      fill="#dc2626"
                      barSize={30}
                      cursor="pointer"
                      onClick={(data) => toggleLOB(data?.name)}
                    />
                    <Bar
                      dataKey="High"
                      stackId="a"
                      fill="#f97316"
                      cursor="pointer"
                      onClick={(data) => toggleLOB(data?.name)}
                    />
                    <Bar
                      dataKey="Medium"
                      stackId="a"
                      fill="#eab308"
                      cursor="pointer"
                      onClick={(data) => toggleLOB(data?.name)}
                    />
                    <Bar
                      dataKey="Low"
                      stackId="a"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => toggleLOB(data?.name)}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <SecurityAgent contextData={displayedIssues} />

          <div className={`rounded border overflow-hidden z-30 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className={`p-4 border-b flex flex-col xl:flex-row xl:items-center justify-between gap-4 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
              <div className="flex items-center gap-4 flex-1">
                <div className={`flex items-center gap-2 font-semibold text-sm border-r pr-4 ${darkMode ? "text-slate-200 border-slate-600" : "text-slate-800 border-slate-300"}`}>
                  <Filter size={14} className="text-slate-500" />
                  Vulnerability Groups
                </div>
                <div className="flex gap-2 w-full max-w-sm">
                  <input
                    type="text"
                    placeholder="Search vulnerabilities..."
                    className={`flex-1 px-3 py-1.5 rounded border text-sm focus:border-purple-500 outline-none ${darkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-slate-300"}`}
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                  />
                  {/* richyrik: Modified button to include Filter icon */}
                  <button
                    onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
                    className={`px-3 py-1.5 rounded border text-xs font-semibold flex items-center gap-1 transition-colors ${isAdvancedSearchOpen
                      ? "bg-purple-100 border-purple-300 text-purple-700"
                      : darkMode
                        ? "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                  >
                    <Filter size={14} />
                    Advanced Search <ChevronDown size={14} className={`transition-transform ${isAdvancedSearchOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>

                <div className="relative" ref={tableColDropdownRef}>
                  <button
                    onClick={() => setIsTableColDropdownOpen(!isTableColDropdownOpen)}
                    className={`flex items-center gap-2 px-3 py-1.5 border rounded-sm text-xs font-semibold transition-colors shadow-sm ml-2 ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" : "bg-white border-slate-300 hover:bg-slate-50"}`}
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
                    className={`flex items-center gap-2 px-3 py-1.5 border rounded-sm text-xs font-semibold transition-colors shadow-sm ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" : "bg-white border-slate-300 hover:bg-slate-50"}`}
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
                          batches.map((batch) => {
                            const format = batchFormats[batch] || "CONTAINER";
                            return (
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
                                {/* richyrik: prepend "VUL - " to every dataset name in the dropdown */}
                                <span
                                  className={`text-xs flex-1 ${selectedBatches.includes(batch)
                                    ? "font-bold text-slate-900"
                                    : "text-slate-600"
                                    }`}
                                >
                                  {`VUL - ${batch}`}
                                </span>
                                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${format === "SAST_DAST" ? "bg-purple-100 text-purple-700" :
                                  format === "CSPM" ? "bg-green-100 text-green-700" :
                                    format === "VAPT" ? "bg-orange-100 text-orange-700" :
                                      "bg-blue-100 text-blue-700"
                                  }`}>
                                  {format === "SAST_DAST" ? "SAST/DAST" : format}
                                </span>
                              </div>
                            )
                          })}
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
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors ${darkMode ? "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20" : "border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
                    >
                      <Upload size={14} /> Upload Dataset
                    </button>
                  </>
                )}

                {userRole === "Admin" && (
                  <button
                    onClick={() => setIsAiModalOpen(true)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors ${darkMode ? "bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20" : "border-purple-600 bg-purple-50 text-purple-700 hover:bg-purple-100"}`}
                  >
                    <Bot size={14} /> Send Mail
                  </button>
                )}

                {/* richyrik: Send Reminders button — filters to Open/Overdue and opens Outlook modal pre-filled */}
                {userRole === "Admin" && (
                  <button
                    onClick={() => {
                      // richyrik: Show only open/unresolved issues so the scope is accurate
                      applyFilter({ resolutionStatus: "Open" });
                      // richyrik: Open the Outlook share modal; recipient is left for the user to fill
                      setShareStep("form");
                      setShareResult(null);
                      setShareError("");
                      setIsAiModalOpen(true);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors ${darkMode ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20" : "border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
                  >
                    🔔 Send Reminders
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={mexwfExport}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors ${darkMode ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20" : "border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                  >
                    <Download size={14} /> Custom Export
                  </button>

                  <button
                    onClick={exportToPDF}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors ${darkMode ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20" : "border-red-600 bg-red-50 text-red-700 hover:bg-red-100"}`}
                  >
                    <FileText size={14} /> PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Search Panel */}
            {isAdvancedSearchOpen && (
              <div className={`border-b ${darkMode ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                  {/* Assigned To */}
                  <div className="flex flex-col gap-2">
                    <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Assigned To</label>
                    <select
                      value={draftFilters.assignedTo}
                      onChange={e => setDraftFilters(prev => ({ ...prev, assignedTo: e.target.value }))}
                      className={`p-2 rounded-lg border text-sm outline-none ${darkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-slate-300"}`}
                    >
                      <option value="All Owners">All Owners</option>
                      <option value="Unassigned">Unassigned</option>
                      {metadataOwners.map(owner => (
                        <option key={owner} value={owner}>{owner}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Cluster</label>
                    <select value={draftFilters.cluster} onChange={e => setDraftFilters(prev => ({ ...prev, cluster: e.target.value }))} className={`p-2 rounded-lg border text-sm outline-none ${darkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-slate-300"}`}>
                      <option value="All Clusters">All Clusters</option>
                      {metadataClusters.map(cluster => <option key={cluster} value={cluster}>{cluster}</option>)}
                    </select>
                  </div>

                  {/* Resolution Status */}
                  <div className="flex flex-col gap-2">
                    <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Resolution Status</label>
                    <select
                      value={draftFilters.resolutionStatus}
                      onChange={e => setDraftFilters(prev => ({ ...prev, resolutionStatus: e.target.value }))}
                      className={`p-2 rounded-lg border text-sm outline-none ${darkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-slate-300"}`}
                    >
                      <option value="All">All</option>
                      <option value="Open">Open</option>
                      <option value="Progress">Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>

                  {/* Dataset */}
                  <div className="flex flex-col gap-2">
                    <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Dataset</label>
                    <div className={`flex flex-col gap-1 max-h-32 overflow-y-auto p-2 rounded-lg border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                      {batches.filter(b => draftFilters.format === "All" || (batchFormats[b] || "CONTAINER") === draftFilters.format).map(batch => (
                        <label key={batch} className={`flex items-center gap-2 text-xs cursor-pointer px-1 py-0.5 rounded ${darkMode ? "text-slate-300 hover:bg-slate-700" : "text-slate-700 hover:bg-slate-50"}`}>
                          <input
                            type="checkbox"
                            checked={selectedBatches.includes(batch)}
                            onChange={() => setSelectedBatches(prev => prev.includes(batch) ? prev.filter(b => b !== batch) : [...prev, batch])}
                            className="accent-blue-600"
                          />
                          <span className="truncate" title={batch}>{batch}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* richyrik: Line of Business (LOB) Filter */}
                  <div className="flex flex-col gap-2">
                    <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Line of Business</label>
                    <div className={`flex flex-col gap-1 max-h-32 overflow-y-auto p-2 rounded-lg border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                      {availableLOBs.length === 0 ? (
                        <span className="text-xs text-slate-500 p-1">No LOB data available</span>
                      ) : (
                        availableLOBs.map(lob => (
                          <label key={lob} className={`flex items-center gap-2 text-xs cursor-pointer px-1 py-0.5 rounded ${darkMode ? "text-slate-300 hover:bg-slate-700" : "text-slate-700 hover:bg-slate-50"}`}>
                            <input
                              type="checkbox"
                              checked={selectedLOBs.includes(lob)}
                              onChange={() => toggleLOB(lob)}
                              className="accent-orange-600"
                            />
                            <span className="truncate" title={lob}>{lob}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="flex flex-col gap-2">
                    <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Date Range</label>
                    <div className={`flex flex-col gap-2 p-2 rounded-lg border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                      <div className="flex items-center gap-2">
                        <label className={`text-xs w-10 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>From</label>
                        <input
                          type="date"
                          value={draftFilters.dateFrom}
                          onChange={e => setDraftFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                          className={`flex-1 px-2 py-1 rounded border text-xs outline-none ${darkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-slate-300"}`}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className={`text-xs w-10 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>To</label>
                        <input
                          type="date"
                          value={draftFilters.dateTo}
                          onChange={e => setDraftFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                          className={`flex-1 px-2 py-1 rounded border text-xs outline-none ${darkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-slate-300"}`}
                        />
                      </div>
                      {(draftFilters.dateFrom || draftFilters.dateTo) && (
                        <button
                          onClick={() => setDraftFilters(prev => ({ ...prev, dateFrom: "", dateTo: "" }))}
                          className={`text-xs text-left ${darkMode ? "text-red-400" : "text-red-600"} hover:underline`}
                        >Clear dates</button>
                      )}
                    </div>
                  </div>

                  {/* Severity */}
                  <div className="flex flex-col gap-2">
                    <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Severity</label>
                    <div className={`flex flex-wrap gap-1.5 p-2 rounded-lg border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                      {["All", "Critical", "High", "Medium", "Low"].map(sev => (
                        <button
                          key={sev}
                          onClick={() => setDraftFilters(prev => ({ ...prev, severity: sev }))}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${draftFilters.severity === sev
                            ? sev === "Critical" ? "bg-red-600 text-white"
                              : sev === "High" ? "bg-orange-500 text-white"
                                : sev === "Medium" ? "bg-yellow-500 text-white"
                                  : sev === "Low" ? "bg-blue-500 text-white"
                                    : "bg-slate-600 text-white"
                            : darkMode ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >{sev}</button>
                      ))}
                    </div>
                  </div>

                  {/* richyrik: Advanced Search - Container Sub-Types */}
                  {selectedFormatFilter === "CONTAINER" && (
                    <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-3">
                      <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                        Container Sub-Types
                      </label>
                      <div className={`flex flex-wrap items-center gap-3 p-2 rounded-lg border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                        {(["Zero day VA", "Wiz CLI Integration", "Compliance VA", "Quarterly VA", "Unclassified"] as const).map(subtype => (
                          <label key={subtype} className={`flex items-center gap-1.5 text-xs cursor-pointer px-2 py-1 rounded ${darkMode ? "text-slate-300 hover:bg-slate-700" : "text-slate-700 hover:bg-slate-50"}`}>
                            <input
                              type="checkbox"
                              checked={selectedContainerSubTypes.includes(subtype)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedContainerSubTypes(prev => [...prev, subtype]);
                                } else {
                                  setSelectedContainerSubTypes(prev => prev.filter(s => s !== subtype));
                                }
                              }}
                              className="accent-blue-600"
                            />
                            <span className="truncate">{subtype}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search */}
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Search</label>
                    <div className={`flex gap-2 p-2 rounded-lg border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                      <select
                        value={draftFilters.searchField}
                        onChange={e => setDraftFilters(prev => ({ ...prev, searchField: e.target.value }))}
                        className={`px-2 py-1.5 rounded border text-xs outline-none flex-none w-36 ${darkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-slate-300"}`}
                      >
                        <option value="All">All Fields</option>
                        <option value="Issue ID">Issue ID</option>
                        <option value="Finding Name">Finding Name</option>
                        <option value="Vulnerability Name">Vulnerability Name</option>
                        <option value="CVE">CVE</option>
                        <option value="Account Name">Account Name</option>
                        <option value="Account ID">Account ID</option>
                        <option value="Resource Name">Resource Name</option>
                        <option value="Resource ID">Resource ID</option>
                        <option value="Assigned To">Assigned To</option>
                        <option value="Hostname">Hostname</option>
                        <option value="IP">IP</option>
                        <option value="Application">Application</option>
                        <option value="UploadBatch">UploadBatch</option>
                      </select>
                      <input
                        type="text"
                        value={draftFilters.searchTerm}
                        onChange={e => setDraftFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && applyDraftFilters()}
                        placeholder="Search vulnerabilities…"
                        className={`flex-1 px-3 py-1.5 rounded border text-xs outline-none ${darkMode ? "bg-slate-900 border-slate-600 text-white placeholder-slate-500" : "bg-white border-slate-300 placeholder-slate-400"}`}
                      />
                    </div>
                  </div>

                </div>

                {/* Panel action buttons */}
                <div className={`flex items-center justify-end gap-2 px-5 py-3 border-t ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                  <button
                    onClick={clearFilters}
                    className={`px-4 py-1.5 rounded text-xs font-semibold transition-colors ${darkMode ? "bg-slate-700 text-red-400 hover:bg-slate-600" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
                  >
                    Clear All
                  </button>
                  <button
                    onClick={cancelDraft}
                    className={`px-4 py-1.5 rounded text-xs font-semibold transition-colors ${darkMode ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyDraftFilters}
                    className="px-5 py-1.5 rounded text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {/* Sticky Active Filters Bar */}
            {(activeFilters.searchTerm || activeFilters.searchField !== "All" || activeFilters.severity !== "All" || activeFilters.format !== "All" || activeFilters.dateFrom || activeFilters.dateTo || activeFilters.quickFilter !== "all" || activeFilters.owners.length > 0 || activeFilters.assignedTo !== "All Owners" || activeFilters.cluster !== "All Clusters" || activeFilters.resolutionStatus !== "All") && (
              <div
                style={{ position: "sticky", top: 0, zIndex: 40, backdropFilter: "blur(8px)" }}
                className={`px-4 py-2 border-b flex items-center flex-wrap gap-2 text-xs ${darkMode ? "bg-slate-900/95 border-slate-700 text-slate-300" : "bg-white/95 border-slate-200 text-slate-600"}`}
              >
                <span className={`font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Active filters:</span>

                {/* richyrik: LOB Active Filter Badge */}
                {selectedLOBs.length > 0 && (
                  <span className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">
                    LOB: {selectedLOBs.length} selected
                    <button onClick={() => setSelectedLOBs([])} className="hover:text-orange-900"><X size={12} /></button>
                  </span>
                )}

                {activeFilters.resolutionStatus !== "All" && (
                  <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                    Status: {activeFilters.resolutionStatus}
                    <button onClick={() => applyFilter({ resolutionStatus: "All" })} className="hover:text-green-900"><X size={12} /></button>
                  </span>
                )}

                {activeFilters.assignedTo !== "All Owners" && (
                  <span className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                    Assigned: {activeFilters.assignedTo}
                    <button onClick={() => applyFilter({ assignedTo: "All Owners" })} className="hover:text-indigo-900"><X size={12} /></button>
                  </span>
                )}

                {activeFilters.cluster !== "All Clusters" && (
                  <span className="flex items-center gap-1 bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full border border-cyan-200">
                    Cluster: {activeFilters.cluster}
                    <button onClick={() => applyFilter({ cluster: "All Clusters" })} className="hover:text-cyan-900"><X size={12} /></button>
                  </span>
                )}

                {activeFilters.searchTerm && (
                  <span className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                    Search: {activeFilters.searchTerm}
                    <button onClick={() => { applyFilter({ searchTerm: "", searchField: "All" }); setLocalSearch(""); }} className="hover:text-purple-900"><X size={12} /></button>
                  </span>
                )}

                {activeFilters.searchField !== "All" && !activeFilters.searchTerm && (
                  <span className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                    In: {activeFilters.searchField}
                    <button onClick={() => applyFilter({ searchField: "All" })} className="hover:text-blue-900"><X size={12} /></button>
                  </span>
                )}

                {activeFilters.severity !== "All" && (
                  <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                    Severity: {activeFilters.severity}
                    <button onClick={() => applyFilter({ severity: "All" })} className="hover:text-red-900"><X size={12} /></button>
                  </span>
                )}

                {activeFilters.quickFilter !== "all" && (
                  <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                    Quick: {activeFilters.quickFilter}
                    <button onClick={() => applyFilter({ quickFilter: "all" })} className="hover:text-amber-900"><X size={12} /></button>
                  </span>
                )}

                {activeFilters.format !== "All" && (
                  <span className="flex items-center gap-1 bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200">
                    Format: {activeFilters.format}
                    <button onClick={() => applyFilter({ format: "All" })} className="hover:text-teal-900"><X size={12} /></button>
                  </span>
                )}

                {activeFilters.dateFrom && (
                  <span className="flex items-center gap-1 bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full border border-slate-300">
                    From: {activeFilters.dateFrom}
                    <button onClick={() => applyFilter({ dateFrom: "" })} className="hover:text-slate-900"><X size={12} /></button>
                  </span>
                )}

                {activeFilters.dateTo && (
                  <span className="flex items-center gap-1 bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full border border-slate-300">
                    To: {activeFilters.dateTo}
                    <button onClick={() => applyFilter({ dateTo: "" })} className="hover:text-slate-900"><X size={12} /></button>
                  </span>
                )}

                {activeFilters.owners.length > 0 && (
                  <span className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                    Owners: {activeFilters.owners.length}
                    <button onClick={() => applyFilter({ owners: [] })} className="hover:text-indigo-900"><X size={12} /></button>
                  </span>
                )}

                <button onClick={clearFilters} className="ml-2 text-red-500 hover:text-red-700 font-semibold underline text-xs">Clear All</button>
              </div>
            )}


            <div className={`overflow-x-auto max-h-[700px] rounded-lg border ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
              <table className="w-full text-left border-collapse">
                <thead className={`sticky top-0 z-10 ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                  <tr>
                    {tableCols.map(col => (
                      <th key={col} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap ${darkMode ? "text-slate-400 border-b border-slate-700" : "text-slate-500 border-b border-slate-200"}`}>
                        {colHeaderMap[col] || col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={darkMode ? "bg-slate-900" : "bg-white"}>
                  {paginatedIssues.length === 0 && (
                    <tr>
                      <td colSpan={tableCols.length} className={`px-4 py-12 text-center ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle size={24} />
                          <span className="text-sm font-medium">
                            {dateFrom || dateTo
                              ? `No ${selectedFormatFilter !== "All" ? selectedFormatFilter : ""} data found for the selected date range.`
                              : `No ${selectedFormatFilter !== "All" ? selectedFormatFilter : "vulnerability"} data available.`}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {paginatedIssues.map((issue, idx) => {
                    const breached = checkBreach(issue.DueDate, issue.Status);
                    const resolved = isResolved(issue.Status);
                    const rowKey = `${issue.IssueID}-${idx}`;
                    const isExpanded = expandedRow === rowKey;

                    return (
                      <React.Fragment key={rowKey}>
                        <motion.tr
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: idx * 0.05 }}
                          onClick={() => setExpandedRow(isExpanded ? null : rowKey)}
                          className={`border-b transition-colors cursor-pointer ${darkMode ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-100 hover:bg-slate-50"} ${isExpanded ? (darkMode ? "bg-slate-800/50" : "bg-slate-50") : ""} ${resolved ? (darkMode ? "opacity-60 bg-slate-900/50" : "opacity-60 bg-slate-50") : ""}`}
                        >
                          {tableCols.map(col => {
                            if (col === "DisplayID") {
                              return <td key={col} className={`px-4 py-3 font-semibold text-sm ${darkMode ? "text-slate-200" : "text-slate-700"}`}>
                                <div className="flex items-center gap-2">
                                  <ChevronDown size={14} className={`transition-transform ${isExpanded ? "rotate-180" : ""} ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
                                  {issue.DisplayID}
                                </div>
                              </td>;
                            }
                            if (col === "Severity") {
                              if (resolved) {
                                return <td key={col} className="px-4 py-3"><span className={`px-2.5 py-1 rounded text-[10px] font-semibold ${darkMode ? "bg-green-900/50 text-green-400 border border-green-800" : "bg-green-100 text-green-800"}`}>Resolved</span></td>;
                              }
                              const sevClass = issue.Severity === "Critical"
                                ? "bg-slate-800 text-white"
                                : issue.Severity === "High"
                                  ? "bg-slate-700 text-white"
                                  : issue.Severity === "Medium"
                                    ? "bg-slate-200 text-slate-700"
                                    : "bg-slate-100 text-slate-600";
                              return <td key={col} className="px-4 py-3"><span className={`px-2.5 py-1 rounded text-[10px] font-semibold ${sevClass}`}>{issue.Severity}</span></td>;
                            }
                            if (col === "UpdateStatus") {
                              return (
                                <td key={col} className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                  <select
                                    className={`text-xs rounded border px-2 py-1 outline-none ${darkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-700"}`}
                                    // richyrik: Use 'Open' to prevent regex collisions with 'resolved'
                                    value={["Resolved", "Progress", "Open"].includes(issue.Status) ? issue.Status : "Open"}
                                    onChange={async (e) => {
                                      const fendralis = e.target.value;
                                      try {
                                        const res = await fetch("/api/issues/status", {
                                          method: "PATCH",
                                          headers: { "Content-Type": "application/json" },
                                          // richyrik: Include UploadBatch to prevent updating the wrong dataset's row
                                          body: JSON.stringify({ IssueID: String(issue.IssueID), UploadBatch: String(issue.UploadBatch), new_status: fendralis })
                                        });
                                        if (res.ok) {
                                          const mexwf = await res.json();
                                          // richyrik: Use UploadBatch to match EXACT row, and accept restored severity if returned
                                          setAllIssues(prev => prev.map(i => (i.IssueID === issue.IssueID && i.UploadBatch === issue.UploadBatch) ? { ...i, Status: mexwf.Status, ResolvedAt: mexwf.ResolvedAt, Severity: mexwf.Severity || i.Severity } : i));
                                          setUploadCounter(prev => prev + 1);
                                        }
                                      } catch (err) {}
                                    }}
                                  >
                                    <option value="Resolved">Resolved</option>
                                    <option value="Progress">In Progress</option>
                                    <option value="Open">Open</option>
                                  </select>
                                </td>
                              );
                            }
                            if (col === "Status") {
                              const statusClass = resolved
                                ? "bg-slate-100 text-slate-600"
                                : "bg-slate-50 text-slate-600 border border-slate-200";
                              return <td key={col} className="px-4 py-3"><span className={`px-2.5 py-1 rounded text-[10px] font-medium ${statusClass}`}>{issue.Status}</span></td>;
                            }
                            if (col === "DueDate") {
                              // richyrik: Interactive ETA picker — PATCH /api/issues/eta on change
                              const rawDate = issue.DueDate ? String(issue.DueDate).split("T")[0] : "";
                              return (
                                <td
                                  key={col}
                                  className="px-4 py-3 whitespace-nowrap"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="date"
                                    defaultValue={rawDate}
                                    className={`text-xs font-mono rounded border px-2 py-1 outline-none focus:ring-2 focus:ring-blue-400 ${
                                      darkMode
                                        ? "bg-slate-700 border-slate-600 text-slate-200"
                                        : "bg-white border-slate-300 text-slate-700"
                                    } ${breached && !resolved ? "border-red-400" : ""}`}
                                    onBlur={async (e) => {
                                      const newEta = e.target.value;
                                      if (!newEta || newEta === rawDate) return;
                                      try {
                                        // richyrik: Send ETA update to backend
                                        const res = await fetch("/api/issues/eta", {
                                          method: "PATCH",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                            IssueID: String(issue.IssueID),
                                            UploadBatch: String(issue.UploadBatch),
                                            new_eta: newEta,
                                          }),
                                        });
                                        if (res.ok) {
                                          // richyrik: Optimistic UI update + brief success toast
                                          setAllIssues((prev) =>
                                            prev.map((i) =>
                                              i.IssueID === issue.IssueID && i.UploadBatch === issue.UploadBatch
                                                ? { ...i, DueDate: newEta }
                                                : i
                                            )
                                          );
                                          setEtaToast("✅ ETA Updated & Stakeholders Notified");
                                          setTimeout(() => setEtaToast(null), 3500);
                                        }
                                      } catch {}
                                    }}
                                  />
                                  {breached && !resolved && (
                                    <span className="ml-1 text-[10px] text-red-400 font-semibold">Overdue</span>
                                  )}
                                </td>
                              );
                            }
                            if (col === "AffectedAsset" || col === "AssetName") {
                              const assetVal = issue[col] ? String(issue[col]) : "—";
                              return (
                                <td key={col} className={`px-4 py-3 text-xs min-w-[150px] ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                                  <AssetNameCell fullName={assetVal} />
                                </td>
                              );
                            }
                            if (col === "VulnDescription") {
                              const existingDesc = issue.VulnDescription ? String(issue.VulnDescription) : "";
                              const desc = existingDesc && existingDesc !== "—" && existingDesc.toLowerCase() !== "na"
                                ? existingDesc
                                : generateVulnDescription(issue as Issue);
                              return (
                                <td key={col} className={`px-4 py-3 text-xs min-w-[200px] max-w-[280px] ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                                  <span className="line-clamp-2">{desc}</span>
                                </td>
                              );
                            }
                            const val = ["ID", "Project ID", "Projects"].includes(col) && (issue[col] === undefined || issue[col] === null || issue[col] === "") ? "NA" : issue[col] !== undefined && issue[col] !== null ? issue[col] : "—";
                            return (
                              <td key={col} className={`px-4 py-3 text-xs min-w-[120px] whitespace-normal ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                                {String(val)}
                              </td>
                            );
                          })}
                        </motion.tr>
                        {isExpanded && (
                          <tr className={darkMode ? "bg-slate-800/30" : "bg-slate-50"}>
                            <td colSpan={tableCols.length} className="px-6 py-5">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-white border border-slate-200"}`}>
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                      Vulnerability Details
                                    </h4>
                                  </div>
                                  <div className="space-y-2">
                                    <div>
                                      <p className={`text-[10px] uppercase ${darkMode ? "text-slate-500" : "text-slate-400"}`}>ID</p>
                                      <p className={`text-sm font-medium ${darkMode ? "text-slate-200" : "text-slate-700"}`}>{issue.DisplayID || issue.IssueID}</p>
                                    </div>
                                    <div>
                                      <p className={`text-[10px] uppercase ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Name</p>
                                      <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{issue.Name || issue.finding_name || issue.Summary || "—"}</p>
                                    </div>
                                    <div>
                                      <p className={`text-[10px] uppercase ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Category</p>
                                      <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{issue.Category || "—"}</p>
                                    </div>
                                    <div>
                                      <p className={`text-[10px] uppercase ${darkMode ? "text-slate-500" : "text-slate-400"}`}>CVSS Score</p>
                                      <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{issue.Score || "—"}</p>
                                    </div>
                                    <div>
                                      <p className={`text-[10px] uppercase ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Severity</p>
                                      <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{issue.Severity || "—"}</p>
                                    </div>
                                    <div>
                                      <p className={`text-[10px] uppercase ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Status</p>
                                      <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{issue.Status || "—"}</p>
                                    </div>
                                    {resolved && issue.ResolvedAt && (
                                      <div>
                                        <p className={`text-[10px] uppercase ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Resolved At</p>
                                        <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{new Date(String(issue.ResolvedAt)).toLocaleString()}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-white border border-slate-200"}`}>
                                  <h4 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    Asset Information
                                  </h4>
                                  <div className="space-y-2">
                                    <div>
                                      <p className={`text-[10px] uppercase ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Affected Asset</p>
                                      <p className={`text-sm break-all ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{issue.AffectedAsset || issue.resource_name || "—"}</p>
                                    </div>
                                    <div>
                                      <p className={`text-[10px] uppercase ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Asset Type</p>
                                      <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{issue.AssetType || issue.resource_type || "—"}</p>
                                    </div>
                                    <div>
                                      <p className={`text-[10px] uppercase ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Assigned To</p>
                                      <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{issue.AssignedTo || issue.Assignee || "Unassigned"}</p>
                                    </div>
                                    <div>
                                      <p className={`text-[10px] uppercase ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Location</p>
                                      <p className={`text-sm break-all ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{issue.LocationPath || issue.region || "—"}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-white border border-slate-200"}`}>
                                  <h4 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    Remediation
                                  </h4>
                                  <div className="space-y-2">
                                    <div>
                                      <p className={`text-[10px] uppercase ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Recommended Action</p>
                                      <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{issue.RecommendedAction || issue.Remediation || "—"}</p>
                                    </div>
                                    <div>
                                      <p className={`text-[10px] uppercase ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Fixed Version</p>
                                      <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{issue.FixedVersion || "—"}</p>
                                    </div>
                                    <div>
                                      <p className={`text-[10px] uppercase ${darkMode ? "text-slate-500" : "text-slate-400"}`}>First Detected</p>
                                      <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{issue.FirstDetected || issue.DiscoveredDate || "—"}</p>
                                    </div>
                                    <div>
                                      <p className={`text-[10px] uppercase ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Due Date</p>
                                      <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{issue.DueDate || "—"}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {(issue.Description || issue.ReferenceLinks || issue.WizURL) && (
                                <div className={`mt-4 p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-white border border-slate-200"}`}>
                                  {issue.Description && (
                                    <div className="mb-3">
                                      <p className={`text-[10px] uppercase mb-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Description</p>
                                      <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{issue.Description}</p>
                                    </div>
                                  )}
                                  {(issue.ReferenceLinks || issue.WizURL) && (
                                    <div>
                                      <p className={`text-[10px] uppercase mb-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>References</p>
                                      <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                                        {issue.WizURL && <a href={issue.WizURL} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline mr-4">Wiz Link</a>}
                                        {issue.ReferenceLinks && issue.ReferenceLinks !== "NA" && <span>{issue.ReferenceLinks}</span>}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* AI Remediation Section */}
                              <div className={`mt-4 p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-white border border-slate-200"}`}>
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-purple-400" : "text-purple-600"}`}>
                                    <Bot size={14} /> AI Remediation
                                  </h4>
                                  {!isAiGenerating[issue.IssueID] && aiRemediationData[issue.IssueID] && (
                                    <div className="flex gap-2">
                                      <button onClick={() => {
                                        const res = aiRemediationData[issue.IssueID];
                                        const text = `AI Remediation\n\nRoot Cause:\n${res.AI_RootCause}\n\nRisk:\n${res.AI_Impact}\n\nRecommended Fix:\n${res.AI_Remediation.join('\n')}\n\nValidation Steps:\n${res.AI_Validation.join('\n')}\n\nPriority: ${res.AI_Priority}`;
                                        navigator.clipboard.writeText(text);
                                      }} className={`px-3 py-1 rounded text-xs font-medium ${darkMode ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}>Copy Remediation</button>
                                      <button onClick={() => handleGenerateAiRemediation(issue as Issue, true)} className={`px-3 py-1 rounded text-xs font-medium ${darkMode ? "bg-purple-900/50 text-purple-300 hover:bg-purple-900/70" : "bg-purple-100 text-purple-700 hover:bg-purple-200"}`}>Regenerate</button>
                                    </div>
                                  )}
                                </div>

                                {isAiGenerating[issue.IssueID] ? (
                                  <div className="flex items-center gap-3 p-4">
                                    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className={`text-sm font-medium ${darkMode ? "text-slate-300" : "text-slate-600"}`}>Analyzing vulnerability with Ollama...</span>
                                  </div>
                                ) : aiError[issue.IssueID] ? (
                                  <div className="p-4 rounded bg-red-50 text-red-700 border border-red-200 text-sm">
                                    {aiError[issue.IssueID]}
                                  </div>
                                ) : aiRemediationData[issue.IssueID] ? (
                                  <div className="space-y-4">
                                    <div>
                                      <p className={`text-[10px] uppercase mb-1 font-semibold ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Root Cause</p>
                                      <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{aiRemediationData[issue.IssueID].AI_RootCause}</p>
                                    </div>
                                    <div>
                                      <p className={`text-[10px] uppercase mb-1 font-semibold ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Risk</p>
                                      <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{aiRemediationData[issue.IssueID].AI_Impact}</p>
                                    </div>
                                    <div>
                                      <p className={`text-[10px] uppercase mb-1 font-semibold ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Recommended Fix</p>
                                      <ul className={`list-decimal ml-4 text-sm space-y-1 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                                        {aiRemediationData[issue.IssueID].AI_Remediation.map((step, i) => <li key={i}>{step}</li>)}
                                      </ul>
                                    </div>
                                    <div>
                                      <p className={`text-[10px] uppercase mb-1 font-semibold ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Validation Steps</p>
                                      <ul className={`list-decimal ml-4 text-sm space-y-1 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                                        {aiRemediationData[issue.IssueID].AI_Validation.map((step, i) => <li key={i}>{step}</li>)}
                                      </ul>
                                    </div>
                                    <div>
                                      <p className={`text-[10px] uppercase mb-1 font-semibold ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Priority</p>
                                      <p className={`text-sm font-medium ${aiRemediationData[issue.IssueID].AI_Priority === 'High' || aiRemediationData[issue.IssueID].AI_Priority === 'Immediate'
                                        ? 'text-red-500' : aiRemediationData[issue.IssueID].AI_Priority === 'Medium' ? 'text-orange-500' : 'text-slate-500'
                                        }`}>{aiRemediationData[issue.IssueID].AI_Priority}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <button onClick={() => handleGenerateAiRemediation(issue as Issue, false)} className="px-4 py-2 rounded text-sm font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors">
                                      Generate AI Remediation
                                    </button>
                                  </div>
                                )}
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

            {totalRecords > 0 && (
              <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t ${darkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}>
                <div className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Showing {totalRecords > 0 ? ((currentPage - 1) * rowsPerPage) + 1 : 0} to {Math.min(currentPage * rowsPerPage, totalRecords)} of {totalRecords.toLocaleString()} issues
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Rows per page:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-1 rounded border text-sm ${darkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-slate-300 text-slate-700"}`}
                    >
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={250}>250</option>
                      <option value={500}>500</option>
                      <option value={1000}>1000</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className={`px-2 py-1 rounded text-sm font-medium transition-colors ${currentPage === 1 ? (darkMode ? "text-slate-600 cursor-not-allowed" : "text-slate-400 cursor-not-allowed") : (darkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-200")}`}
                    >
                      First
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${currentPage === 1 ? (darkMode ? "text-slate-600 cursor-not-allowed" : "text-slate-400 cursor-not-allowed") : (darkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-200")}`}
                    >
                      Previous
                    </button>

                    <span className={`px-3 py-1 text-sm ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                      Page {currentPage} of {totalPages || 1}
                    </span>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${currentPage >= totalPages ? (darkMode ? "text-slate-600 cursor-not-allowed" : "text-slate-400 cursor-not-allowed") : (darkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-200")}`}
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage >= totalPages}
                      className={`px-2 py-1 rounded text-sm font-medium transition-colors ${currentPage >= totalPages ? (darkMode ? "text-slate-600 cursor-not-allowed" : "text-slate-400 cursor-not-allowed") : (darkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-200")}`}
                    >
                      Last
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* richyrik: ETA update toast notification */}
      {etaToast && (
        <div className="fixed bottom-6 right-6 z-[99999] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl bg-emerald-600 text-white text-sm font-semibold animate-pulse">
          {etaToast}
        </div>
      )}

      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

            {/* ── Header ── */}
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2">
                <Send size={18} className="text-blue-400" />
                <h3 className="font-bold text-sm">Share via Outlook</h3>
              </div>
              <button
                onClick={() => {
                  setIsAiModalOpen(false);
                  setAiRecipient('');
                  setShareStep('form');
                  setShareResult(null);
                  setShareError('');
                }}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Phase: Preparing (backend generating XLSX + calling Graph) ── */}
            {shareStep === 'preparing' && (
              <div className="p-10 flex flex-col items-center gap-5 text-slate-500">
                <Activity size={36} className="animate-spin text-blue-500" />
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-slate-700">Creating Outlook draft…</p>
                  <p className="text-xs text-slate-400">
                    Generating Excel report for{' '}
                    <strong className="text-slate-600">{totalRecords.toLocaleString()}</strong>
                    {' '}records and attaching to your Outlook draft.
                  </p>
                </div>
              </div>
            )}

            {/* ── Phase: Done (success) ── */}
            {shareStep === 'done' && shareResult && (
              <div className="p-6 flex flex-col gap-4 overflow-y-auto">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <span className="text-green-500 text-2xl shrink-0 leading-none mt-0.5">✓</span>
                  <div>
                    <p className="font-bold text-green-800 text-sm">
                      Outlook draft created in your mailbox.
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      The Excel report is attached. Open your Drafts folder in Outlook and click Send.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                  <div className="bg-slate-700 px-4 py-2 text-white text-[10px] font-bold uppercase tracking-widest">
                    Report Summary
                  </div>
                  <div className="p-4 text-sm grid grid-cols-2 gap-y-2 gap-x-4 text-slate-700">
                    <span className="font-semibold text-slate-500">To</span>
                    <span className="truncate">{aiRecipient}</span>
                    <span className="font-semibold text-slate-500">Format</span>
                    <span>{selectedFormatFilter}</span>
                    <span className="font-semibold text-slate-500">Owner</span>
                    <span>{selectedOwners.length > 0 ? selectedOwners.join(', ') : 'All Owners'}</span>
                    <span className="font-semibold text-slate-500">Records</span>
                    <span className="font-bold">{shareResult.record_count.toLocaleString()}</span>
                    <span className="font-semibold text-slate-500">Resolved</span>
                    <span className="text-green-600 font-semibold">{shareResult.resolved}</span>
                    <span className="font-semibold text-slate-500">Unresolved</span>
                    <span className="text-red-500 font-semibold">{shareResult.unresolved}</span>
                    <span className="font-semibold text-slate-500">Excel</span>
                    <span className="text-green-700 font-semibold">📎 Attached to draft</span>
                    {shareResult.graph_included && <>
                      <span className="font-semibold text-slate-500">Graph</span>
                      <span className="text-green-700 font-semibold">📊 Attached to draft</span>
                    </>}
                  </div>
                </div>

                {shareResult.draft_url && (
                  <a
                    href={shareResult.draft_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-colors"
                  >
                    <Send size={13} />
                    Open Draft in Outlook
                  </a>
                )}

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAiModalOpen(false);
                      setShareStep('form');
                      setShareResult(null);
                    }}
                    className="px-5 py-2 text-xs font-bold bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* ── Phase: Error ── */}
            {shareStep === 'error' && (
              <div className="p-6 flex flex-col gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <span className="text-red-500 text-xl shrink-0 leading-none mt-0.5">✕</span>
                  <div className="text-sm min-w-0">
                    <p className="font-semibold text-red-800 mb-1">Something went wrong</p>
                    <p className="text-red-700 break-words">{shareError}</p>
                    {shareError.toLowerCase().includes('not configured') && (
                      <div className="mt-3 bg-red-100 rounded p-3 text-xs text-red-800 space-y-1">
                        <p className="font-bold">Server configuration required:</p>
                        <p>Set the following environment variables on the backend server:</p>
                        <ul className="list-disc list-inside space-y-0.5 mt-1">
                          <li><code className="bg-red-200 px-1 rounded">GRAPH_TENANT_ID</code></li>
                          <li><code className="bg-red-200 px-1 rounded">GRAPH_CLIENT_ID</code></li>
                          <li><code className="bg-red-200 px-1 rounded">GRAPH_CLIENT_SECRET</code></li>
                          <li><code className="bg-red-200 px-1 rounded">GRAPH_SENDER_EMAIL</code></li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAiModalOpen(false);
                      setShareStep('form');
                      setShareResult(null);
                      setShareError('');
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShareStep('form'); setShareError(''); }}
                    className="px-4 py-2 text-xs font-bold bg-slate-700 text-white rounded hover:bg-slate-600"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* ── Phase: Form (initial) ── */}
            {shareStep === 'form' && (
              <form
                onSubmit={handleShareEmailSubmit}
                className="p-5 flex flex-col gap-4 overflow-y-auto"
              >
                {/* ── Server info banner ── */}
                <div className="rounded-lg border px-4 py-2.5 text-xs flex items-start gap-2 font-medium bg-blue-50 border-blue-200 text-blue-700">
                  <Send size={13} className="shrink-0 mt-0.5" />
                  <span>
                    The backend will generate the Excel report and create a draft in your
                    Outlook mailbox via Microsoft Graph. No download required.
                  </span>
                </div>

                {/* ── Active filter summary (read-only) ── */}
                <div className={`rounded-lg border text-sm ${totalRecords === 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-slate-50 border-slate-200'
                  }`}>
                  <div className="px-4 pt-3 pb-2 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wide">Report Scope</h4>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${totalRecords === 0
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                      }`}>
                      {totalRecords.toLocaleString()} record{totalRecords !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-2 gap-y-1.5 gap-x-4 text-slate-600 text-xs">
                    <span className="font-semibold text-slate-500">Format</span>
                    <span>{selectedFormatFilter}</span>
                    <span className="font-semibold text-slate-500">Owner</span>
                    <span>{selectedOwners.length > 0 ? selectedOwners.join(', ') : 'All Owners'}</span>
                    {selectedBatches.length > 0 && (<>
                      <span className="font-semibold text-slate-500">Datasets</span>
                      <span>{selectedBatches.length} selected</span>
                    </>)}
                    {selectedContainerSubTypes.length > 0 && (<>
                      <span className="font-semibold text-slate-500">Sub-Types</span>
                      <span className="truncate">{selectedContainerSubTypes.join(', ')}</span>
                    </>)}
                    <span className="font-semibold text-slate-500">Date Range</span>
                    <span>{
                      dateFrom && dateTo ? `${dateFrom} – ${dateTo}`
                        : dateFrom ? `from ${dateFrom}`
                          : dateTo ? `to ${dateTo}`
                            : 'All time'
                    }</span>
                    {filter !== 'All' && (<>
                      <span className="font-semibold text-slate-500">Severity</span>
                      <span>{filter}</span>
                    </>)}
                    {searchTerm && (<>
                      <span className="font-semibold text-slate-500">Search</span>
                      <span className="truncate">{searchTerm}</span>
                    </>)}
                    <span className="font-semibold text-slate-500 border-t border-slate-100 pt-1.5">Resolved</span>
                    <span className="text-green-600 font-semibold border-t border-slate-100 pt-1.5">
                      {groupedIssues.reduce((acc, g) => acc + g.resolved, 0)}
                    </span>
                    <span className="font-semibold text-slate-500">Unresolved</span>
                    <span className="text-red-500 font-semibold">
                      {groupedIssues.reduce((acc, g) => acc + g.unresolved, 0)}
                    </span>
                  </div>
                  {totalRecords === 0 && (
                    <div className="px-4 pb-3 text-amber-700 text-xs font-medium">
                      ⚠ No vulnerabilities match the current filters. Adjust before sending.
                    </div>
                  )}
                </div>

                {/* ── Recipient email ── */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="team.lead@company.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={aiRecipient}
                    onChange={(e) => setAiRecipient(e.target.value)}
                  />
                </div>

                {/* ── Graph options ── */}
                <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="includeGraph"
                      checked={includeGraph}
                      onChange={(e) => setIncludeGraph(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="includeGraph" className="text-sm text-slate-700 font-medium cursor-pointer">
                      Include Resolved/Unresolved Graph (PNG)
                    </label>
                  </div>

                  {includeGraph && (
                    <div className="ml-6 flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">Graph mode:</span>
                      <div className="flex bg-slate-100 rounded p-0.5 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setEmailGraphMode('Daily')}
                          className={`px-3 py-1 rounded transition-colors ${emailGraphMode === 'Daily'
                            ? 'bg-white shadow text-slate-800'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                          Daily
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmailGraphMode('Cumulative')}
                          className={`px-3 py-1 rounded transition-colors ${emailGraphMode === 'Cumulative'
                            ? 'bg-white shadow text-slate-800'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                          Cumulative
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 flex items-start gap-1.5">
                    <Send size={11} className="shrink-0 mt-0.5" />
                    <span>
                      The backend generates the Excel report and attaches it to an Outlook
                      draft via Microsoft Graph. No download or manual attachment required.
                    </span>
                  </p>
                </div>

                {/* ── Actions ── */}
                <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAiModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="btn-share-via-outlook"
                    disabled={!aiRecipient || totalRecords === 0}
                    title={
                      totalRecords === 0
                        ? 'No records match current filters'
                        : ''
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed disabled:text-slate-500"
                  >
                    <Send size={14} />
                    Share via Outlook
                  </button>
                </div>
              </form>
            )}

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
                    setSheetInfo([]);
                    setSelectedSheet("");
                    setIsSheetSelectMode(false);
                    setDetectedFormat("");
                    setIsDuplicatePromptOpen(false);
                    setDuplicatePromptMessage("");
                    setDuplicateUploadApproved(false);
                    setUploadStats(null); // richyrik
                  }
                }}
                className="text-blue-200 hover:text-white transition-colors disabled:opacity-50"
                disabled={isProcessing}
              >
                <X size={18} />
              </button>
            </div>

            {/* richyrik: Delta Closure Report Card */}
            {uploadStats ? (
              <div className="p-6 flex flex-col gap-4 items-center text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-800">Upload Successful</h3>
                <p className="text-sm text-slate-500 mb-4">Dataset has been processed and merged into the database.</p>
                
                <div className="w-full grid grid-cols-2 gap-3 mb-2">
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">New Findings</span>
                    <span className="text-2xl font-black text-blue-600">{uploadStats.new_findings || 0}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">Resolved Existing</span>
                    <span className="text-2xl font-black text-green-600">{uploadStats.resolved_existing || 0}</span>
                  </div>
                </div>
                
                <div className="w-full bg-slate-50 border border-slate-200 rounded p-3 flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase">Total Processed</span>
                  <span className="text-sm font-black text-slate-700">{uploadStats.processed_rows || 0} rows</span>
                </div>

                <button
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setAvailableSheets([]);
                    setSheetInfo([]);
                    setSelectedSheet("");
                    setIsSheetSelectMode(false);
                    setDetectedFormat("");
                    setIsDuplicatePromptOpen(false);
                    setDuplicatePromptMessage("");
                    setDuplicateUploadApproved(false);
                    setUploadStats(null);
                  }}
                  className="w-full py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : isProcessing ? (
              // richyrik: Skeleton Table during processing
              <div className="p-6">
                <div className="text-sm font-bold text-slate-500 mb-4 animate-pulse text-center">
                  {uploadProgress || "Processing data..."}
                </div>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="w-full h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" />
                ))}
              </div>
            ) : (
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
                    <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                      {sheetInfo.length > 0 ? sheetInfo.map((sheet) => (
                        <label
                          key={sheet.name}
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer border transition-colors ${selectedSheet === sheet.name
                            ? "bg-blue-50 border-blue-300"
                            : sheet.is_pivot
                              ? "bg-slate-100 border-slate-200 opacity-60"
                              : "bg-white border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                          <input
                            type="radio"
                            name="sheetSelect"
                            value={sheet.name}
                            checked={selectedSheet === sheet.name}
                            onChange={(e) => setSelectedSheet(e.target.value)}
                            disabled={isProcessing}
                            className="text-blue-600"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{sheet.name}</span>
                              {sheet.is_pivot && (
                                <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded">
                                  SUMMARY
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                              <span>{sheet.rows} rows</span>
                              <span>{sheet.columns} columns</span>
                              <span className={`px-1.5 py-0.5 rounded font-bold ${sheet.format === "SAST_DAST" ? "bg-purple-100 text-purple-700" :
                                sheet.format === "CSPM" ? "bg-green-100 text-green-700" :
                                  sheet.format === "VAPT" ? "bg-orange-100 text-orange-700" :
                                    sheet.format === "CONTAINER" ? "bg-blue-100 text-blue-700" :
                                      "bg-slate-100 text-slate-600"
                                }`}>
                                {sheet.format === "SAST_DAST" ? "SAST/DAST" : sheet.format}
                              </span>
                            </div>
                          </div>
                        </label>
                      )) : availableSheets.map((sheet) => (
                        <label
                          key={sheet}
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer border transition-colors ${selectedSheet === sheet ? "bg-blue-50 border-blue-300" : "bg-white border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                          <input
                            type="radio"
                            name="sheetSelect"
                            value={sheet}
                            checked={selectedSheet === sheet}
                            onChange={(e) => setSelectedSheet(e.target.value)}
                            disabled={isProcessing}
                            className="text-blue-600"
                          />
                          <span className="font-medium text-sm">{sheet}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-[10px] text-amber-600 mt-2">
                      <span className="font-bold">Tip:</span> Sheets marked SUMMARY contain aggregated data (pivot tables) - select the sheet with raw vulnerability records.
                    </p>
                  </div>
                )}

                {isDuplicatePromptOpen && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-red-700 uppercase mb-1">
                          {duplicatePromptMessage.includes("::") ? duplicatePromptMessage.split("::")[0] : "File Already Exists"}
                        </p>
                        <p className="text-sm text-red-700 whitespace-pre-line">
                          {duplicatePromptMessage.includes("::") ? duplicatePromptMessage.split("::")[1] : (duplicatePromptMessage || "This file is already present. Do you still want to upload it?")}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsDuplicatePromptOpen(false);
                          setDuplicatePromptMessage("");
                          setDuplicateUploadApproved(false);
                          setIsProcessing(false);
                          setUploadProgress("");
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-200 rounded hover:bg-slate-300 transition-colors"
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDuplicatePromptOpen(false);
                          setDuplicateUploadApproved(true);
                          void processUploadRequest(true);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                      >
                        Yes
                      </button>
                    </div>
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
                    setSheetInfo([]);
                    setSelectedSheet("");
                    setIsSheetSelectMode(false);
                    setDetectedFormat("");
                    setIsDuplicatePromptOpen(false);
                    setDuplicatePromptMessage("");
                    setDuplicateUploadApproved(false);
                    setUploadStats(null); // richyrik
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDuplicatePromptOpen}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-colors disabled:bg-blue-400 min-w-[120px] justify-center"
                >
                  <Upload size={14} />
                  {isDuplicatePromptOpen
                      ? "Awaiting Confirmation"
                      : isSheetSelectMode
                        ? "Upload Selected Sheet"
                        : "Confirm Upload"}
                </button>
              </div>
            </form>
            )}
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
                    <button onClick={() => setExportCols(tableAvailableCols)} className="hover:text-emerald-600 transition-colors">Select All</button>
                    <span>|</span>
                    <button onClick={() => setExportCols([])} className="hover:text-red-600 transition-colors">Deselect All</button>
                    <span>|</span>
                    <button onClick={() => { sessionStorage.removeItem("xtelify_export_cols"); setExportCols(tableAvailableCols); }} className="hover:text-blue-600 transition-colors">Reset Default</button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3 border-b border-slate-200 pb-1">Original Uploaded Columns</h4>
                    <div className="space-y-1">
                      {tableAvailableCols.filter(c => !aiColSet.has(c) && c.toLowerCase().includes(searchExportCol.toLowerCase())).map(col => (
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
                      {tableAvailableCols.filter(c => aiColSet.has(c) && c.toLowerCase().includes(searchExportCol.toLowerCase())).map(col => (
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
                {/* richyrik: Added isLoading check to button text and disabled state to prevent multi-clicks */}
                <button onClick={doDynamicExport} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={exportCols.length === 0 || isLoading}>
                  <Download size={14} /> {isLoading ? "Exporting..." : "Export Dataset"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

// richyrik: Completely restyled Card to match FinOps aesthetic — dark ring panel with gradient icon badge
const Card: React.FC<CardProps & { accentColor?: string; ringColor?: string }> = ({ title, val, Icon, bg, accentColor, ringColor }) => {
  const accent = accentColor || 'text-purple-400';
  const ring   = ringColor   || 'bg-purple-500/15 ring-purple-500/30';
  return (
    <div className="bg-slate-900 ring-1 ring-slate-800 rounded-xl p-5 flex items-start gap-4 hover:ring-slate-700 transition-all duration-200 group">
      <div className={`p-3 rounded-xl ${ring} ring-1 shrink-0`}>
        <Icon size={20} className={accent} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{title}</p>
        <p className={`text-3xl font-bold text-white tabular-nums`}>
          {typeof val === 'number' ? <CountUpComponent end={val} duration={2.5} separator="," /> : val}
        </p>
      </div>
    </div>
  );
};

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

      const textResponse = await res.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch {
        throw new Error("The AI request timed out at the server proxy or returned an invalid format.");
      }

      if (data.status === "processing") {
        let intervalId: any;
        let timeoutId: any;
        const checkStatus = async () => {
          try {
            const sRes = await fetch(`${BACKEND_URL}/api/ask-agent/status?job_id=${data.job_id}`);
            const sText = await sRes.text();
            let sData;
            try { sData = JSON.parse(sText); } catch { return; }
            if (sData.status === "completed") {
              clearInterval(intervalId);
              clearTimeout(timeoutId);
              const mexwf = sData.reply;
              setResponse(mexwf);
              setLoading(false);
            }
          } catch {
            return;
          }
        };
        intervalId = setInterval(checkStatus, 3000);
        timeoutId = setTimeout(() => {
          clearInterval(intervalId);
          setResponse("Chat AI request timed out after 5 minutes.");
          setLoading(false);
        }, 300000);
      } else {
        const mexwf = data.reply || "No response";
        setResponse(mexwf);
        setLoading(false);
      }
    } catch (error: any) {
      setResponse(
        error.message || "Error connecting to the AI agent. Please check the backend connection."
      );
      setLoading(false);
    }
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

// richyrik
const ManagerReportView: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [subTypeFilter, setSubTypeFilter] = useState("All");
  const [exporting, setExporting] = useState(false);
  const [sortCol, setSortCol] = useState<string>("Shared");
  const [sortAsc, setSortAsc] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [targetDates, setTargetDates] = useState<string[]>([]);
  const [newDate, setNewDate] = useState("");
  const PAGE_SIZE = 50;

  const addTargetDate = () => {
    if (newDate && !targetDates.includes(newDate)) {
      setTargetDates((prev) => [...prev, newDate].sort());
      setNewDate("");
    }
  };

  const removeTargetDate = (d: string) => {
    setTargetDates((prev) => prev.filter((x) => x !== d));
  };

  // richyrik
  const buildPayload = useCallback(() => {
    const fendralis: Record<string, any> = {};
    if (dateFrom) fendralis.date_from = dateFrom;
    if (dateTo) fendralis.date_to = dateTo;
    if (subTypeFilter && subTypeFilter !== "All") fendralis.subType = subTypeFilter;
    fendralis.source_format = "CONTAINER";
    return { filters: fendralis, targetDates };
  }, [dateFrom, dateTo, subTypeFilter, targetDates]);

  // richyrik
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const fendralis = buildPayload();
      const res = await fetch(`${BACKEND_URL}/api/manager-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fendralis),
      });
      const text = await res.text();
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok || !contentType.includes("application/json")) {
        throw new Error(`Server Error (${res.status})`);
      }
      const mexwf = JSON.parse(text);
      setReportData(mexwf);
      setCurrentPage(1);
    } catch {
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [buildPayload]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // richyrik
  const handleExport = async () => {
    setExporting(true);
    try {
      const fendralis = buildPayload();
      const res = await fetch(`${BACKEND_URL}/api/manager-report/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fendralis),
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const mexwf = await res.blob();
      const url = URL.createObjectURL(mexwf);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Manager_Closure_Report.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export report.");
    } finally {
      setExporting(false);
    }
  };

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  const dynamicCols = useMemo(() => {
    const base = ["LOB", "Application", "AppOwner", "Shared", "Closed", "Closure %"];
    targetDates.forEach((td) => {
      base.push(`Closed_${td}`);
      base.push(`Closure %_${td}`);
    });
    return base;
  }, [targetDates]);

  const colLabel = (col: string): string => {
    if (col === "AppOwner") return "App owner";
    if (col.startsWith("Closed_")) return `Closed (${col.slice(7)})`;
    if (col.startsWith("Closure %_")) return `Closure % (${col.slice(10)})`;
    return col;
  };

  const filteredData = useMemo(() => {
    let fendralis = [...reportData];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      fendralis = fendralis.filter(
        (r) =>
          (r.LOB || "").toLowerCase().includes(q) ||
          (r.Application || "").toLowerCase().includes(q) ||
          (r.AppOwner || "").toLowerCase().includes(q)
      );
    }
    fendralis.sort((a, b) => {
      const av = a[sortCol] ?? "";
      const bv = b[sortCol] ?? "";
      if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return fendralis;
  }, [reportData, searchTerm, sortCol, sortAsc]);

  // richyrik: Top Apps visual calculation updated to show ALL clusters
  const topApps = useMemo(() => {
    const appMap: Record<string, any> = {};
    filteredData.forEach(row => {
      const app = row.Application || "Unknown";
      if (!appMap[app]) appMap[app] = { total: 0, closed: 0, open: 0 };
      appMap[app].total += row.Shared || 0;
      appMap[app].closed += row.Closed || 0;
    });
    return Object.entries(appMap).map(([name, data]) => {
      data.open = data.total - data.closed;
      data.pct = data.total > 0 ? ((data.closed / data.total) * 100).toFixed(2) : "0.00";
      return { name, ...data };
    }).sort((a, b) => b.total - a.total); // richyrik: Removed .slice(0, 4) to show all clusters
  }, [filteredData]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const paginatedData = filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const summaryTotals = useMemo(() => {
    const fendralis: Record<string, number> = { shared: 0, closed: 0 };
    targetDates.forEach((td) => { fendralis[`closed_${td}`] = 0; });
    filteredData.forEach((r) => {
      fendralis.shared += r.Shared || 0;
      fendralis.closed += r.Closed || 0;
      targetDates.forEach((td) => { fendralis[`closed_${td}`] += r[`Closed_${td}`] || 0; });
    });
    const mexwf: Record<string, any> = {
      shared: fendralis.shared,
      closed: fendralis.closed,
      pct: fendralis.shared > 0 ? ((fendralis.closed / fendralis.shared) * 100).toFixed(1) : "0.0",
    };
    targetDates.forEach((td) => {
      mexwf[`closed_${td}`] = fendralis[`closed_${td}`];
      mexwf[`pct_${td}`] = fendralis.shared > 0 ? ((fendralis[`closed_${td}`] / fendralis.shared) * 100).toFixed(1) : "0.0";
    });
    return mexwf;
  }, [filteredData, targetDates]);

  const renderPctBadge = (pct: number) => {
    const pctColor = pct >= 80 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-red-500";
    const pctBg = pct >= 80
      ? darkMode ? "bg-emerald-900/20" : "bg-emerald-50"
      : pct >= 50
        ? darkMode ? "bg-amber-900/20" : "bg-amber-50"
        : darkMode ? "bg-red-900/20" : "bg-red-50";
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${pctColor} ${pctBg}`}>{pct}%</span>;
  };

  const totalColSpan = dynamicCols.length;

  return (
    <div className={`p-5 rounded-lg border mb-6 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className={`font-bold text-lg ${darkMode ? "text-white" : "text-slate-800"}`}>Manager Closure Report</h2>
          <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            {filteredData.length} groups &middot; {summaryTotals.shared} shared &middot; {summaryTotals.closed} closed &middot; {summaryTotals.pct}% overall
          </p>
        </div>
        <button onClick={handleExport} disabled={exporting || filteredData.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
          <Download size={14} />
          {exporting ? "Exporting..." : "Download Excel"}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex flex-col gap-1">
          <label className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Date From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className={`px-3 py-1.5 text-sm rounded-md border ${darkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-800"}`} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Date To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className={`px-3 py-1.5 text-sm rounded-md border ${darkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-800"}`} />
        </div>
        {/* richyrik */}
        <div className="flex flex-col gap-1">
          <label className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Container Sub-Type</label>
          <select value={subTypeFilter} onChange={(e) => setSubTypeFilter(e.target.value)}
            className={`px-3 py-1.5 text-sm rounded-md border w-40 ${darkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-800"}`}>
            <option value="All">All</option>
            <option value="Zero day VA">Zero day VA</option>
            <option value="Wiz CLI Integration">Wiz CLI Integration</option>
            <option value="Compliance VA">Compliance VA</option>
            <option value="Quarterly VA">Quarterly VA</option>
            <option value="Unclassified">Unclassified</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Search</label>
          <div className="relative">
            <Search size={14} className={`absolute left-2.5 top-2 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
            <input type="text" placeholder="Search..." value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className={`pl-8 pr-3 py-1.5 text-sm rounded-md border w-48 ${darkMode ? "bg-slate-900 border-slate-600 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-800 placeholder-slate-400"}`} />
          </div>
        </div>
        <button onClick={fetchReport} disabled={loading}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className={`flex flex-wrap items-end gap-3 mb-5 p-3 rounded-lg border ${darkMode ? "bg-slate-900/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
        <div className="flex flex-col gap-1">
          <label className={`text-xs font-bold ${darkMode ? "text-blue-400" : "text-blue-600"}`}>Closure Tracking Dates</label>
          <div className="flex items-center gap-2">
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
              className={`px-3 py-1.5 text-sm rounded-md border ${darkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-800"}`} />
            <button onClick={addTargetDate} disabled={!newDate}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 disabled:opacity-40 transition-colors">
              + Add Date
            </button>
          </div>
        </div>
        {targetDates.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            {targetDates.map((td) => (
              <span key={td} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${darkMode ? "bg-blue-900/40 text-blue-300" : "bg-blue-100 text-blue-700"}`}>
                {td}
                <button onClick={() => removeTargetDate(td)} className="hover:text-red-400 transition-colors"><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* richyrik: Pre-Prod Closure Status Visual Dashboard */}
      {filteredData.length > 0 && (
        <div className={`mb-8 p-6 rounded-xl border shadow-sm ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
          <div className="mb-6">
            <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>Pre-Prod Closure Status</h3>
            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Security / vulnerability closure across key platforms</p>
          </div>

          <div className={`p-5 rounded-lg mb-6 border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"}`}>
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className={`font-bold ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Closure performance</p>
                <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Closed items as a percentage of total items</p>
              </div>
              <div className="text-3xl font-extrabold">{summaryTotals.pct}%</div>
            </div>
            <div className="h-3 w-full rounded-full flex overflow-hidden mb-2 bg-red-400">
              <div style={{ width: `${summaryTotals.pct}%` }} className="bg-emerald-500 h-full"></div>
            </div>
            <div className={`flex justify-between text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
              <span>{summaryTotals.closed.toLocaleString()} closed</span>
              <span>{(summaryTotals.shared - summaryTotals.closed).toLocaleString()} remaining</span>
            </div>
          </div>

          {/* richyrik: Enhanced Manager View Cluster Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            {topApps.map(app => {
              const pctNum = parseFloat(app.pct);
              const isGood = pctNum >= 80;
              const isWarn = pctNum >= 40 && pctNum < 80;
              const barColor = isGood ? "bg-emerald-500" : isWarn ? "bg-amber-500" : "bg-red-500";
              const badgeColors = isGood ? "bg-emerald-100 text-emerald-700" : isWarn ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";

              return (
                <div key={app.name} className={`relative overflow-hidden p-6 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${darkMode ? "bg-slate-800/80 border-slate-700" : "bg-white border-slate-200 shadow-sm"}`}>
                  <div className="flex justify-between items-start mb-6">
                    <h4 className={`font-extrabold text-base tracking-tight truncate pr-4 ${darkMode ? "text-slate-100" : "text-slate-800"}`} title={app.name}>
                      {app.name}
                    </h4>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${badgeColors}`}>{app.pct}%</span>
                  </div>

                  <div className="mb-6">
                    <div className={`h-2.5 w-full rounded-full overflow-hidden ${darkMode ? "bg-slate-700" : "bg-slate-100"}`}>
                      <div style={{ width: `${app.pct}%` }} className={`h-full rounded-full ${barColor} transition-all duration-1000`}></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className={`p-3 rounded-xl ${darkMode ? "bg-slate-900/50" : "bg-slate-50"}`}>
                      <p className={`text-xl font-black ${darkMode ? "text-white" : "text-slate-800"}`}>{app.total.toLocaleString()}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Total</p>
                    </div>
                    <div className={`p-3 rounded-xl ${darkMode ? "bg-emerald-900/20" : "bg-emerald-50"}`}>
                      <p className={`text-xl font-black ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>{app.closed.toLocaleString()}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${darkMode ? "text-emerald-600/70" : "text-emerald-500"}`}>Closed</p>
                    </div>
                    <div className={`p-3 rounded-xl ${darkMode ? "bg-red-900/20" : "bg-red-50"}`}>
                      <p className={`text-xl font-black ${darkMode ? "text-red-400" : "text-red-600"}`}>{app.open.toLocaleString()}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${darkMode ? "text-red-500/70" : "text-red-400"}`}>Open</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border" style={{ maxHeight: "65vh" }}>
        <table className={`w-full text-sm ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
          <thead className={`sticky top-0 z-10 ${darkMode ? "bg-slate-700" : "bg-slate-50"}`}>
            <tr>
              {dynamicCols.map((col) => (
                <th key={col} onClick={() => handleSort(col)}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap ${darkMode ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}>
                  {colLabel(col)}
                  {sortCol === col && <span className="ml-1">{sortAsc ? "▲" : "▼"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? "divide-slate-700" : "divide-slate-100"}`}>
            {loading ? (
              <tr><td colSpan={totalColSpan} className={`p-8 text-center ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                <RefreshCw size={20} className="animate-spin inline mr-2" />Loading report...
              </td></tr>
            ) : paginatedData.length === 0 ? (
              <tr><td colSpan={totalColSpan} className={`p-8 text-center ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                No data matches current filters
              </td></tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr key={idx} className={`transition-colors ${darkMode ? "hover:bg-slate-700/50" : "hover:bg-slate-50"}`}>
                  {dynamicCols.map((col) => {
                    const val = row[col];
                    const isPct = col === "Closure %" || col.startsWith("Closure %_");
                    const isClosed = col === "Closed" || col.startsWith("Closed_");
                    if (isPct) return <td key={col} className="px-4 py-2.5">{renderPctBadge(val || 0)}</td>;
                    if (isClosed) return <td key={col} className={`px-4 py-2.5 font-semibold ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>{val}</td>;
                    if (col === "Shared") return <td key={col} className={`px-4 py-2.5 font-semibold ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{val}</td>;
                    if (col === "LOB") return <td key={col} className={`px-4 py-2.5 font-medium ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{val}</td>;
                    return <td key={col} className={`px-4 py-2.5 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{val}</td>;
                  })}
                </tr>
              ))
            )}
          </tbody>
          {filteredData.length > 0 && (
            <tfoot className={`sticky bottom-0 ${darkMode ? "bg-slate-700 border-t border-slate-600" : "bg-slate-100 border-t border-slate-200"}`}>
              <tr>
                <td colSpan={3} className={`px-4 py-2.5 text-xs font-bold uppercase ${darkMode ? "text-slate-300" : "text-slate-600"}`}>Grand Total</td>
                <td className={`px-4 py-2.5 font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{summaryTotals.shared}</td>
                <td className={`px-4 py-2.5 font-bold ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>{summaryTotals.closed}</td>
                <td className="px-4 py-2.5">{renderPctBadge(Number(summaryTotals.pct))}</td>
                {targetDates.map((td) => (
                  <React.Fragment key={td}>
                    <td className={`px-4 py-2.5 font-bold ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>{summaryTotals[`closed_${td}`]}</td>
                    <td className="px-4 py-2.5">{renderPctBadge(Number(summaryTotals[`pct_${td}`]))}</td>
                  </React.Fragment>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Page {currentPage} of {totalPages} &middot; {filteredData.length} groups
          </p>
          <div className="flex items-center gap-1">
            <button disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}
              className={`p-1.5 rounded ${darkMode ? "text-slate-400 hover:bg-slate-700 disabled:opacity-30" : "text-slate-500 hover:bg-slate-100 disabled:opacity-30"}`}>
              <ChevronLeft size={16} />
            </button>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}
              className={`p-1.5 rounded ${darkMode ? "text-slate-400 hover:bg-slate-700 disabled:opacity-30" : "text-slate-500 hover:bg-slate-100 disabled:opacity-30"}`}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// richyrik: Root App component — owns the module routing state.
// Renders LandingPage, CloudOps (AppContent), or FinOpsDashboard based on activeModule.
const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'landing' | 'cloudops' | 'finops'>('landing');

  return (
    <ErrorBoundary>
      {activeModule === 'landing' && (
        // richyrik: Landing page — user picks which module to enter
        <LandingPage onNavigate={(m) => setActiveModule(m)} />
      )}
      {activeModule === 'cloudops' && (
        // richyrik: Existing CloudOps & Security dashboard
        <AppContent onNavigateHome={() => setActiveModule('landing')} />
      )}
      {activeModule === 'finops' && (
        // richyrik: New FinOps dashboard
        <FinOpsDashboard onNavigateHome={() => setActiveModule('landing')} />
      )}
    </ErrorBoundary>
  );
};

export default App;
