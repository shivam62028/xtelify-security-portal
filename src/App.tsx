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
import html2canvas from "html2canvas";
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
  Share2
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

      const queryParams = [formatQuery, startQuery, endQuery, batchesQuery, `mode=${viewMode}`].filter(Boolean).join('&');

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
  }, [selectedFormats, startDateStr, endDateStr, viewMode, selectedDatasets]);

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

      <div id="vulnerability-history-chart" className={`h-64 mb-6 p-4 rounded-lg border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
        {loading ? <div className="h-full flex items-center justify-center">Loading...</div> : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
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

      <div className="flex justify-between items-center mb-4 mt-8">
        <h3 className="font-bold text-lg">Owner-wise Analytics</h3>
      </div>
      
      {!selectedOwner ? (
        <div className={`p-4 rounded-lg border h-80 mb-6 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
          {loading ? <div className="h-full flex items-center justify-center">Loading...</div> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ownerData} onClick={(data) => {
                if (data && data.activeLabel) setSelectedOwner(data.activeLabel);
              }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
                <XAxis dataKey="Owner" stroke={darkMode ? "#94a3b8" : "#64748b"} fontSize={12} />
                <YAxis stroke={darkMode ? "#94a3b8" : "#64748b"} fontSize={12} />
                <RechartsTooltip contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#fff', borderRadius: '8px' }} cursor={{fill: darkMode ? '#334155' : '#f1f5f9'}} />
                <Legend />
                <Bar dataKey="Resolved" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Unresolved" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
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
                <td className="p-3 font-semibold">{d.FileName || d.UploadBatch}</td>
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
const AppContent: React.FC = () => {
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [batchFormats, setBatchFormats] = useState<Record<string, string>>({});
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isTableColDropdownOpen, setIsTableColDropdownOpen] = useState(false);

  const CONTAINER_COLS = ["SubscriptionName", "AssignedTo", "AffectedAsset", "VulnDescription", "Severity", "Status", "Version", "FixedVersion", "DueDate", "RecommendedAction"];
  const CSPM_COLS = ["account_name", "AssignedTo", "VulnDescription", "finding_name", "resource_type", "resource_id", "resource_name", "impact", "Severity", "Status"];
  const SAST_DAST_COLS = ["issue_key", "VulnDescription", "ApplicationName", "CriticalityStatus", "ReportedOn", "Ageing", "Compliant_NonCompliant", "ExpectedTimeline", "Assignee", "MultipleAssignee", "ApplicationOwner"];
  const VAPT_COLS = ["IP", "UUID", "Vulnerability name", "Vulnerability description", "Solution", "Vulnerability Path", "Vulnerability family", "Vulnerability ID", "Application Owner", "Vulnerability Status", "lastSeen"];

  const defaultTableCols = CONTAINER_COLS;
  const [tableCols, setTableCols] = useState<string[]>(defaultTableCols);
  const [currentFormat, setCurrentFormat] = useState<string>("CONTAINER");
  const [selectedFormatFilter, setSelectedFormatFilter] = useState<string>("All");

  const [filter, setFilter] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchField, setSearchField] = useState<string>("All");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState<boolean>(false);
  
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [selectedFindingTypes, setSelectedFindingTypes] = useState<string[]>([]);
  const [selectedLOBs, setSelectedLOBs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [aiRemediation, setAiRemediation] = useState<Record<string, any>>({});
  const [isGeneratingAI, setIsGeneratingAI] = useState<Record<string, boolean>>({});
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All");


  const [selectedContainerSubTypes, setSelectedContainerSubTypes] = useState<string[]>([]);
  const [containerChartData, setContainerChartData] = useState<any[]>([]);
  const [containerAnalyticsError, setContainerAnalyticsError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"Optimized" | "Raw" | "Calendar">("Optimized");

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("xtelify_dark_mode");
    return saved === "true";
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

  const [quickFilter, setQuickFilter] = useState<string>("all");

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(100);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [uploadCounter, setUploadCounter] = useState<number>(0);

  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [aiRecipient, setAiRecipient] = useState<string>("");
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [includeGraph, setIncludeGraph] = useState<boolean>(false);
  const [mailtoResult, setMailtoResult] = useState<{ subject: string; body: string; recipient: string } | null>(null);
  const [emailGraphMode, setEmailGraphMode] = useState<'Daily' | 'Cumulative'>('Daily');
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);

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
    setFilter(f.filter);
    setSearchTerm(f.searchTerm);
    setSelectedDepartment(f.department);
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

      const data = await response.json();
      if (response.ok && data.result) {
        setAiRemediation(prev => ({ ...prev, [rowKey]: data.result }));
      } else {
        alert(data.error || "Failed to generate AI remediation");
      }
    } catch (err) {
      console.error(err);
      alert("Error generating AI remediation. Ensure backend and Ollama are running.");
    } finally {
      setIsGeneratingAI(prev => ({ ...prev, [rowKey]: false }));
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSearchField("All");
    setFilter("All");
    setSelectedOwners([]);
    setSelectedFindingTypes([]);
    setSelectedLOBs([]);
    setDateFrom("");
    setDateTo("");
    setIsAdvancedSearchOpen(false);
    // Intentionally keep batches as is so the user isn't shown empty data if they clear filters.
    setCurrentPage(1);
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

  useEffect(() => {
    // Fetch batches on mount or after upload
    fetch(`${BACKEND_URL}/api/db/metadata`, { mode: "cors" })
      .then(res => res.json())
      .then(data => {
        if (data.batches && Array.isArray(data.batches)) {
          setBatches(data.batches);
          if (data.formats) {
            setBatchFormats(data.formats);
          }
          if (data.batches.length > 0 && selectedBatches.length === 0) {
            setSelectedBatches(selectedFormatFilter !== "All" 
              ? data.batches.filter((b: string) => (data.formats?.[b] || "CONTAINER") === selectedFormatFilter)
              : data.batches
            );
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
      if (selectedBatches.length > 0) params.append("upload_batch", selectedBatches.join("||"));

      if (selectedFormatFilter === "CONTAINER") {
        if (selectedOwners.length > 0) {
          params.append("assigned_to", selectedOwners.join(","));
        }
        if (selectedContainerSubTypes.length > 0) {
          params.append("container_sub_types", selectedContainerSubTypes.join("||"));
        }
      }

  
      if (isAdvancedSearchOpen) {
        params.append("is_advanced_search", "true");
        if (searchTerm) {
          params.append("search", searchTerm);
          params.append("search_field", searchField);
        }
        if (filter !== "All" && filter !== "ZeroDay") params.append("severity", filter);
  
        if (quickFilter === "unassigned") params.append("assigned_to", "Unassigned");
        if (quickFilter === "critical") params.append("severity", "Critical");
        if (quickFilter === "overdue") params.append("status", "Open");
  
        if (selectedOwners.length > 0) params.append("assigned_to", selectedOwners.join(","));
        if (dateFrom) params.append("date_from", dateFrom);
        if (dateTo) params.append("date_to", dateTo);
      }
      return params.toString();
    };

    const fetchVulnerabilities = fetch(`${BACKEND_URL}/api/db?${buildParams(true)}`, { mode: "cors", signal: abortController.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      });

    const fetchSummary = fetch(`${BACKEND_URL}/api/db/summary?${buildParams(false)}`, { mode: "cors", signal: abortController.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      });

    Promise.all([fetchVulnerabilities, fetchSummary])
      .then(([dbPayload, summaryPayload]) => {
        let rawArray: Record<string, any>[] = [];
        let totalCount = summaryPayload?.total || 0;

        if (dbPayload && Array.isArray(dbPayload.data)) {
          rawArray = dbPayload.data;
        } else if (Array.isArray(dbPayload)) {
          rawArray = dbPayload;
        }

        if (Array.isArray(rawArray)) {
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
          setTotalRecords(totalCount);
          setDashboardStats(summaryPayload);
        } else {
          setAllIssues([]);
          setTotalRecords(0);
          setDashboardStats(null);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error("Error fetching issues:", err);
        setAllIssues([]);
        setTotalRecords(0);
        setDashboardStats(null);
        setIsLoading(false);
      });

    return () => abortController.abort();
  }, [searchTerm, searchField, filter, quickFilter, selectedFormatFilter, selectedBatches, selectedOwners, selectedFindingTypes, selectedLOBs, dateFrom, dateTo, isAdvancedSearchOpen, currentPage, rowsPerPage, uploadCounter, selectedContainerSubTypes]);

  useEffect(() => {
    if (selectedFormatFilter === "CONTAINER") {
      let url = `${BACKEND_URL}/api/container_analytics`;
      if (selectedOwners.length > 0) {
        url += `?assigned_to=${encodeURIComponent(selectedOwners.join(","))}`;
      }
      setContainerAnalyticsError(null);
      fetch(url, { mode: "cors" })
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch");
          return res.json();
        })
        .then(data => {
          setContainerChartData(data);
          setContainerAnalyticsError(null);
        })
        .catch(err => {
          console.error("Error fetching container analytics", err);
          setContainerAnalyticsError("Unable to load Container subtype statistics.");
        });
    } else {
      setContainerChartData([]);
      setContainerAnalyticsError(null);
    }
  }, [selectedFormatFilter, selectedOwners, uploadCounter]);

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
      let filtered = (allIssues || []).filter((i) =>
        selectedBatches.includes(i.UploadBatch)
      );
      if (selectedFormatFilter !== "All") {
        filtered = filtered.filter((i) => (i.SourceFormat || "CONTAINER") === selectedFormatFilter);
      }
      return filtered;
    } catch {
      return [];
    }
  }, [allIssues, selectedBatches, selectedFormatFilter]);

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

  const allDetectedCols = useMemo(() => {
    let fendralis = new Set<string>();
    activeIssues.forEach(item => Object.keys(item).forEach(k => fendralis.add(k)));
    return Array.from(fendralis);
  }, [activeIssues]);



  const availableFormats = useMemo(() => {
    const formats = new Set<string>();
    selectedBatches.forEach(batch => {
      if (batchFormats[batch]) formats.add(batchFormats[batch]);
    });
    return Array.from(formats);
  }, [batchFormats, selectedBatches]);

  const dominantFormat = useMemo(() => {
    if (selectedFormatFilter !== "All") return selectedFormatFilter;

    if (activeIssues.length === 0) return "CONTAINER";
    const formatCounts: Record<string, number> = {};
    activeIssues.forEach(i => {
      const fmt = i.SourceFormat || "CONTAINER";
      formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;
    });
    const sorted = Object.entries(formatCounts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? sorted[0][0] : "CONTAINER";
  }, [activeIssues, selectedFormatFilter]);

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
    setSelectedFindingType("All");
    setSearchTerm("");
    setSearchField("All");
    setFilter("All");
    setSelectedLOBs([]);
    setDateFrom("");
    setDateTo("");
    setIsAdvancedSearchOpen(false);
    setCurrentPage(1);
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
    }
  };

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
      setExportCols(tableCols);
    }
  }, [allDetectedCols, tableCols]);

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
    setSelectedFindingType("All");
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
    return filtered;
  }, [displayedIssues, selectedOwners, selectedFindingTypes, selectedLOBs]);

  const totalPages = useMemo(() => Math.ceil((totalRecords || 0) / rowsPerPage), [totalRecords, rowsPerPage]);

  const paginatedIssues = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return (tableFilteredIssues || []).slice(startIndex, startIndex + rowsPerPage);
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

  const typeChartData = useMemo(() => {
    if (dashboardStats?.category) {
      return dashboardStats.category.slice(0, 6);
    }
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
  }, [displayedIssues, dashboardStats]);

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

  const ownerChartData = useMemo(() => {
    if (dashboardStats?.owner) {
      return dashboardStats.owner.map((o: any) => ({ name: o.name, Critical: o.Issues, High: 0, Medium: 0 })); // Fallback map
    }
    try {
      const fendralis: Record<
        string,
        { name: string; Critical: number; High: number; Medium: number }
      > = {};
      (displayedIssues || []).forEach((issue) => {
        const owner =
          issue.AssignedTo && issue.AssignedTo !== "NA"
            ? issue.AssignedTo
            : "Unassigned";
        if (!fendralis[owner]) {
          fendralis[owner] = { name: owner, Critical: 0, High: 0, Medium: 0 };
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

        if (sev === "critical") {
          fendralis[owner].Critical += 1;
        } else if (sev === "high") {
          fendralis[owner].High += 1;
        } else {
          fendralis[owner].Medium += 1;
        }
      });
      const mexwf = Object.values(fendralis).sort(
        (a, b) =>
          b.Critical + b.High + b.Medium - (a.Critical + a.High + a.Medium)
      );
      return mexwf;
    } catch {
      return [];
    }
  }, [displayedIssues, dashboardStats]);

  const lobChartData = useMemo(() => {
    if (dashboardStats?.lob) {
      return dashboardStats.lob.map((l: any) => ({ name: l.name, Critical: l.Issues, High: 0, Medium: 0 })); // Fallback map
    }
    try {
      const lobMap: Record<string, { name: string; Critical: number; High: number; Medium: number }> = {};
      const vaptIssues = (displayedIssues || []).filter(i => i.SourceFormat === "VAPT");
      vaptIssues.forEach((issue) => {
        const lobName = issue["LOB Name"] || issue.LOBName || issue.LOB || "Unknown";
        if (!lobMap[lobName]) {
          lobMap[lobName] = { name: lobName, Critical: 0, High: 0, Medium: 0 };
        }
        const sevValue = issue["Risk Factor"] || issue.RiskFactor || issue.Severity || "";
        const sev = (sevValue || "").toLowerCase().trim();
        if (sev === "critical") {
          lobMap[lobName].Critical += 1;
        } else if (sev === "high") {
          lobMap[lobName].High += 1;
        } else {
          lobMap[lobName].Medium += 1;
        }
      });
      return Object.values(lobMap)
        .filter(l => l.name !== "Unknown" && l.name !== "")
        .sort((a, b) => b.Critical + b.High + b.Medium - (a.Critical + a.High + a.Medium));
    } catch {
      return [];
    }
  }, [displayedIssues, dashboardStats]);

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
        total: (c.critical||0) + (c.high||0) + (c.medium||0) + (c.low||0),
        counts: { Critical: c.critical||0, High: c.high||0, Medium: c.medium||0, Low: c.low||0 }
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

  const cspmFindingChartData = useMemo(() => {
    if (dashboardStats?.cspm) {
      return dashboardStats.cspm.map((c: any) => ({ name: c.name, count: c.count }));
    }
    try {
      const cspmIssues = (activeIssues || []).filter(i => i.SourceFormat === "CSPM");
      const findingMap: Record<string, number> = {};
      cspmIssues.forEach(i => {
        const findingName = i.finding_name || i.FindingName || "Unknown";
        if (findingName && findingName !== "NA" && findingName !== "Unknown") {
          findingMap[findingName] = (findingMap[findingName] || 0) + 1;
        }
      });
      return Object.entries(findingMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
    } catch {
      return [];
    }
  }, [activeIssues, dashboardStats]);

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

  const uniqueOwnersForEmail = Array.from(new Set(allIssues.map(i => i.AssignedTo || "Unassigned"))).sort();

  /**
   * buildEmailFilterParams — mirrors doDynamicExport's param construction.
   * Both use the same AppContent filter state → same _build_db_query() call on backend.
   * This is the single source of truth: no separate filter state for email.
   */
  const buildEmailFilterParams = () => {
    const params = new URLSearchParams();

    // Format
    if (selectedFormatFilter !== "All") params.append("source_format", selectedFormatFilter);

    // Datasets
    if (selectedBatches.length > 0) params.append("upload_batch", selectedBatches.join("||"));

    // Container-specific: owner + sub-types
    if (selectedFormatFilter === "CONTAINER") {
      if (selectedOwners.length > 0) params.append("assigned_to", selectedOwners.join(","));
      if (selectedContainerSubTypes.length > 0) params.append("container_sub_types", selectedContainerSubTypes.join("||"));
    }

    // Advanced Search / other filters
    if (isAdvancedSearchOpen) {
      params.append("is_advanced_search", "true");
      if (searchTerm) {
        params.append("search", searchTerm);
        params.append("search_field", searchField);
      }
      if (filter !== "All" && filter !== "ZeroDay") params.append("severity", filter);
      if (quickFilter === "unassigned") params.append("assigned_to", "Unassigned");
      if (quickFilter === "critical") params.append("severity", "Critical");
      if (quickFilter === "overdue") params.append("status", "Open");
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
    }

    // Owner (non-container, or added when advanced search is off)
    if (selectedOwners.length > 0 && selectedFormatFilter !== "CONTAINER") {
      params.append("assigned_to", selectedOwners.join(","));
    }

    return params;
  };

  const handleShareEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiRecipient) return;

    const activeOwner = selectedOwners.length > 0 ? selectedOwners.join(", ") : "All Owners";
    const totalVulns  = totalRecords;
    const resolvedVulns   = groupedIssues.reduce((a, g) => a + g.resolved, 0);
    const unresolvedVulns = groupedIssues.reduce((a, g) => a + g.unresolved, 0);

    // ── Step 1: Build professional email body with full scope summary ──────
    const emailSubject = `Vulnerability Report — ${activeOwner}`;
    const emailBody = [
      `Hello,`,
      ``,
      `Please find attached the vulnerability report from the Wynk Security Portal.`,
      ``,
      `Report Scope:`,
      `  Owner       : ${activeOwner}`,
      `  Format      : ${selectedFormatFilter}`,
      `  Date Range  : ${dateFrom && dateTo ? `${dateFrom} – ${dateTo}` : "All time"}`,
      `  Mode        : ${emailGraphMode}`,
      ``,
      `Summary:`,
      `  Total Vulnerabilities : ${totalVulns}`,
      `  Resolved              : ${resolvedVulns}`,
      `  Unresolved            : ${unresolvedVulns}`,
      ``,
      `The attached Excel file contains the filtered vulnerability data.`,
      includeGraph
        ? `The attached graph shows the Resolved vs Unresolved vulnerability trend for the same filtered data.`
        : ``,
      ``,
      `Regards,`,
      `Wynk Security Portal`,
    ].filter(line => line !== undefined).join("\n");

    // ── Step 2: Fire mailto: via hidden anchor immediately on click event ──
    // Must happen synchronously (before any await) to avoid popup blocking.
    const mailtoUrl = `mailto:${encodeURIComponent(aiRecipient)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    const anchor = document.createElement("a");
    anchor.href = mailtoUrl;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // ── Step 3: Show fallback panel — modal stays open ────────────────────
    setMailtoResult({ subject: emailSubject, body: emailBody, recipient: aiRecipient });

    // ── Step 4: Call POST /api/email/report — fully non-blocking ──────────
    // Uses EXACT same filter state as Dashboard/Export View via buildEmailFilterParams().
    // _build_db_query() on the backend is called once for both Excel and graph.
    setIsGenerating(true);
    try {
      const params = buildEmailFilterParams();
      if (includeGraph) params.append("include_graph", "true");
      params.append("graph_mode", emailGraphMode);

      const response = await fetch(`${BACKEND_URL}/api/email/report?${params.toString()}`, {
        method: "POST",
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.warn("[Send Mail] Report generation failed:", errData.error || response.status);
        // Do not alert — user already sees fallback compose links in the modal
      } else {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const safeOwner = selectedOwners.length > 0
          ? selectedOwners.join("_").replace(/\s+/g, "_")
          : "All_Owners";
        const filename = `Security_Report_${safeOwner}.zip`;
        const dl = document.createElement("a");
        dl.href = blobUrl;
        dl.download = filename;
        document.body.appendChild(dl);
        dl.click();
        document.body.removeChild(dl);
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (err: any) {
      console.warn("[Send Mail] Backend unavailable, skipping report download:", err.message);
    } finally {
      setIsGenerating(false);
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
        }

        setUploadProgress("AI Processing Complete!");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsUploadModalOpen(false);
        setUploadCounter(prev => prev + 1);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/upload-report`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

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
      }

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadProgress("AI Processing Complete!");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsUploadModalOpen(false);
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

  const doDynamicExport = async () => {
    let fendralis = exportFileName.trim() || "Wynk_Security_Report";
    if (!fendralis.toLowerCase().endsWith(".xlsx")) fendralis += ".xlsx";

    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedFormatFilter !== "All") params.append("source_format", selectedFormatFilter);
      if (selectedBatches.length > 0) params.append("upload_batch", selectedBatches.join("||"));

      if (selectedFormatFilter === "CONTAINER") {
        if (selectedOwners.length > 0) {
          params.append("assigned_to", selectedOwners.join(","));
        }
        if (selectedContainerSubTypes.length > 0) {
          params.append("container_sub_types", selectedContainerSubTypes.join("||"));
        }
      }


      if (isAdvancedSearchOpen) {
        params.append("is_advanced_search", "true");
        if (searchTerm) {
          params.append("search", searchTerm);
          params.append("search_field", searchField);
        }
        if (filter !== "All" && filter !== "ZeroDay") params.append("severity", filter);

        if (quickFilter === "unassigned") params.append("assigned_to", "Unassigned");
        if (quickFilter === "critical") params.append("severity", "Critical");
        if (quickFilter === "overdue") params.append("status", "Open");

        if (selectedOwners.length > 0) params.append("assigned_to", selectedOwners.join(","));
        if (dateFrom) params.append("date_from", dateFrom);
        if (dateTo) params.append("date_to", dateTo);
      }
      
      params.append("columns", exportCols.join(","));

      const response = await fetch(`${BACKEND_URL}/api/export?${params.toString()}`, {
        method: "GET",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Export failed with status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fendralis;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
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
    <div className={`min-h-screen p-6 lg:p-8 font-sans transition-colors duration-300 ${darkMode ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-800"}`}>
      <header className={`mb-6 flex flex-col md:flex-row md:items-center justify-between px-6 py-4 rounded-lg border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
        <div className="flex items-center gap-4">
          <img src="/airtel-logo.svg" alt="Airtel" className="h-9 w-auto" />
          <div className={`h-7 w-px ${darkMode ? "bg-slate-700" : "bg-slate-200"}`}></div>
          <div>
            <h1 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-slate-800"}`}>
              Wynk Security Portal
            </h1>
            <p className={`text-[10px] font-medium uppercase tracking-wide ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
              Vulnerability Management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded border ${darkMode ? "text-slate-400 bg-slate-700 border-slate-600" : "text-slate-500 bg-slate-50 border-slate-200"}`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Connected
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg transition-colors ${darkMode ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${darkMode ? "bg-slate-700 border-slate-600" : "bg-slate-50 border-slate-200"} border`}>
            <Users size={14} className={darkMode ? "text-slate-500" : "text-slate-400"} />
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className={`bg-transparent font-medium outline-none cursor-pointer text-sm ${darkMode ? "text-slate-300" : "text-slate-700"}`}
            >
              <option value="Admin">Admin</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>
        </div>
      </header>

      {(dueDateAlerts.overdue.length > 0 || dueDateAlerts.dueToday.length > 0) && (
        <div className={`mb-5 p-4 rounded-lg border-l-4 border-l-slate-400 flex items-center justify-between ${darkMode ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-200"}`}>
          <div className="flex items-center gap-4">
            <AlertCircle className={darkMode ? "text-slate-400" : "text-slate-500"} size={18} />
            <div className="flex items-center gap-5 text-sm">
              {dueDateAlerts.overdue.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${darkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-700"}`}>{dueDateAlerts.overdue.length}</span>
                  <span className={`font-medium ${darkMode ? "text-slate-300" : "text-slate-600"}`}>Overdue</span>
                </div>
              )}
              {dueDateAlerts.dueToday.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${darkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-700"}`}>{dueDateAlerts.dueToday.length}</span>
                  <span className={`font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Due Today</span>
                </div>
              )}
              {dueDateAlerts.dueThisWeek.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${darkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-700"}`}>{dueDateAlerts.dueThisWeek.length}</span>
                  <span className={darkMode ? "text-slate-500" : "text-slate-400"}>This Week</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setQuickFilter("overdue")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${darkMode ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            View <ArrowRight size={12} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div className={`flex p-1 rounded-lg ${darkMode ? "bg-slate-800 border border-slate-700" : "bg-slate-100"}`}>
          <button
            onClick={() => setViewMode("Optimized")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === "Optimized"
              ? `${darkMode ? "bg-slate-700 text-white" : "bg-white text-slate-800 shadow-sm"}`
              : `${darkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"}`
              }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setViewMode("Raw")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === "Raw"
              ? `${darkMode ? "bg-slate-700 text-white" : "bg-white text-slate-800 shadow-sm"}`
              : `${darkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"}`
              }`}
          >
            Export View
          </button>
          <button
            onClick={() => setViewMode("Calendar")}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 rounded-md transition-colors ${viewMode === "Calendar"
              ? `${darkMode ? "bg-slate-700 text-white" : "bg-white text-slate-800 shadow-sm"}`
              : `${darkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"}`
              }`}
          >
            <CalendarDays size={16} /> Calendar
          </button>
        </div>

        <div className={`flex items-center gap-1 p-1.5 rounded-xl ${darkMode ? "bg-slate-800 border border-slate-700" : "bg-slate-100 border border-slate-200"}`}>
          {[
            { key: "CONTAINER", label: "Container", icon: Server },
            { key: "VAPT", label: "VAPT", icon: Shield },
            { key: "CSPM", label: "CSPM", icon: Activity },
            { key: "SAST_DAST", label: "SAST/DAST", icon: FileText },
          ].map(fmt => (
            <button
              key={fmt.key}
              onClick={() => handleFormatFilterChange(fmt.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${selectedFormatFilter === fmt.key
                ? `${darkMode ? "bg-blue-600 text-white shadow-lg" : "bg-blue-600 text-white shadow-md"}`
                : `${darkMode ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-slate-600 hover:text-slate-900 hover:bg-white hover:shadow-sm"}`
                }`}
            >
              <fmt.icon size={16} />
              {fmt.label}
            </button>
          ))}
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

      {viewMode === "Calendar" ? <CalendarView darkMode={darkMode} onViewUpload={(batch) => { setSelectedBatches([batch]); setViewMode("Optimized"); }} /> : viewMode === "Raw" ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
            <Card
              title="Total Vulnerabilities"
              val={totalRecords || 0}
              Icon={Bug}
              color="text-indigo-500"
              bg={darkMode ? "bg-slate-800 border-slate-700" : "bg-white"}
            />
            <Card
              title="Unique CVEs"
              val={stats?.uniqueVulns || 0}
              Icon={Shield}
              color="text-purple-600"
              bg={darkMode ? "bg-slate-800 border-slate-700" : "bg-white"}
            />
            <Card
              title="Affected Assets"
              val={stats?.uniqueAssets || 0}
              Icon={Server}
              color="text-blue-600"
              bg={darkMode ? "bg-slate-800 border-slate-700" : "bg-white"}
            />
            <Card
              title="Critical Risks"
              val={stats?.criticalOpen || 0}
              Icon={AlertTriangle}
              color="text-amber-500"
              bg={darkMode ? "bg-slate-800 border-slate-700" : "bg-white"}
            />
            <Card
              title="SLA Breached"
              val={stats?.breached || 0}
              Icon={Flame}
              color="text-red-500"
              bg={darkMode ? "bg-slate-800 border-slate-700" : "bg-white"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className={`p-6 rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-md ${darkMode ? "bg-slate-800/80 border-slate-700/50" : "bg-white border-slate-200/60"}`}>
              <h2 className={`font-bold text-sm mb-5 flex items-center gap-2 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                <div className={`p-1.5 rounded-lg ${darkMode ? "bg-emerald-900/30" : "bg-emerald-50"}`}>
                  <Target size={16} className="text-emerald-500" />
                </div>
                SLA Compliance
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
                Criticality Status
              </h2>
              <div className="flex flex-col items-center">
                <div className="h-48 w-full flex items-center justify-center">
                  {severityPieData.data && severityPieData.data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={severityPieData.data}
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {severityPieData.data.map((entry, index) => (
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
                            backgroundColor: darkMode ? "#1f2937" : "#fff",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className={`text-xs uppercase font-semibold ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                      No issues
                    </p>
                  )}
                </div>
                {severityPieData.allData && severityPieData.allData.length > 0 && (
                  <>
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                      {severityPieData.allData.filter(item => item.value > 0).map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className={`text-xs font-semibold ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                            {item.name}: {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className={`mt-3 pt-2 border-t text-center ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                      <span className={`text-sm font-bold ${darkMode ? "text-slate-200" : "text-slate-700"}`}>
                        Total Vulnerabilities: {severityPieData.total}
                      </span>
                    </div>
                  </>
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

          {(currentFormat === "CONTAINER" || selectedFormatFilter === "CONTAINER") && (
            <div className={`p-5 rounded border mb-6 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
              <div className="flex items-center justify-between mb-4 border-b pb-2" style={{ borderColor: darkMode ? "#374151" : "#f1f5f9" }}>
                <h2 className={`font-semibold text-sm ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                  Container Sub-Types
                  {selectedOwners.length > 0 && (
                    <span className="text-xs text-slate-500 font-normal ml-2">
                      (Filtered by Owner)
                    </span>
                  )}
                </h2>
              </div>
              
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-2 font-semibold">Filter by Sub-Type:</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {["Wiz CLI", "Zero-day VA", "Compliance VA", "Quarterly VA", "Unclassified"].map(subtype => (
                    <label key={subtype} className="flex items-center gap-1.5 text-sm cursor-pointer">
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
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={darkMode ? "text-slate-300" : "text-slate-700"}>{subtype}</span>
                    </label>
                  ))}
                  {selectedContainerSubTypes.length > 0 && (
                    <button onClick={() => setSelectedContainerSubTypes([])} className="text-xs text-blue-600 hover:text-blue-800 ml-2">Clear Selection</button>
                  )}
                </div>
              </div>

              <div className="h-80 mt-6">
                  {containerAnalyticsError ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-red-500 text-sm font-medium">{containerAnalyticsError}</p>
                    </div>
                  ) : containerChartData.length > 0 ? (
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
                          setSelectedFindingTypes(prev =>
                            prev.includes(data.name)
                              ? prev.filter(t => t !== data.name)
                              : [...prev, data.name]
                          );
                        }
                      }}
                    >
                      {cspmFindingChartData.map((entry, index) => (
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
          )}

          <div className={`p-5 rounded border mb-6 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <h2 className={`font-semibold text-sm ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                Workload & Risk Distribution by Assigned Owner
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
                      onClick={(data) => data && setSelectedOwners(prev => prev.includes(data.name) ? prev.filter(o => o !== data.name) : [...prev, data.name])}
                    />
                    <Bar
                      dataKey="High"
                      stackId="a"
                      fill="#f97316"
                      cursor="pointer"
                      onClick={(data) => data && setSelectedOwners(prev => prev.includes(data.name) ? prev.filter(o => o !== data.name) : [...prev, data.name])}
                    />
                    <Bar
                      dataKey="Medium"
                      stackId="a"
                      fill="#eab308"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => data && setSelectedOwners(prev => prev.includes(data.name) ? prev.filter(o => o !== data.name) : [...prev, data.name])}
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

          {(currentFormat === "VAPT" || selectedFormatFilter === "VAPT") && lobChartData.length > 0 && (
            <div className={`p-5 rounded border mb-6 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h2 className={`font-semibold text-sm ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
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
                      onClick={(data) => data && setSelectedLOBs(prev => prev.includes(data.name) ? prev.filter(l => l !== data.name) : [...prev, data.name])}
                    />
                    <Bar
                      dataKey="High"
                      stackId="a"
                      fill="#f97316"
                      cursor="pointer"
                      onClick={(data) => data && setSelectedLOBs(prev => prev.includes(data.name) ? prev.filter(l => l !== data.name) : [...prev, data.name])}
                    />
                    <Bar
                      dataKey="Medium"
                      stackId="a"
                      fill="#eab308"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => data && setSelectedLOBs(prev => prev.includes(data.name) ? prev.filter(l => l !== data.name) : [...prev, data.name])}
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
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button
                    onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
                    className={`px-3 py-1.5 rounded border text-xs font-semibold flex items-center gap-1 transition-colors ${
                      isAdvancedSearchOpen
                        ? "bg-purple-100 border-purple-300 text-purple-700"
                        : darkMode
                        ? "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Advanced Search <ChevronDown size={14} className={`transition-transform ${isAdvancedSearchOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>

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
                                <span
                                  className={`text-xs flex-1 ${selectedBatches.includes(batch)
                                    ? "font-bold text-slate-900"
                                    : "text-slate-600"
                                    }`}
                                >
                                  {batch}
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
                    onClick={() => setFilter("ZeroDay")}
                    className={`px-4 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${filter === "ZeroDay"
                      ? "bg-amber-100 text-amber-800"
                      : "text-slate-600 hover:bg-slate-100"
                      }`}
                  >
                    <Zap size={12} /> Zero Day
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

            {/* Advanced Search Panel */}
            {isAdvancedSearchOpen && (
              <div className={`p-4 border-b ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  
                  {/* Search Field */}
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Search In</label>
                    <select
                      value={searchField}
                      onChange={(e) => setSearchField(e.target.value)}
                      className={`px-2 py-1.5 rounded border text-sm outline-none ${darkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-slate-300"}`}
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
                  </div>

                  {/* Format */}
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Format</label>
                    <select
                      value={selectedFormatFilter}
                      onChange={(e) => setSelectedFormatFilter(e.target.value)}
                      className={`px-2 py-1.5 rounded border text-sm outline-none ${darkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-slate-300"}`}
                    >
                      <option value="All">All Formats</option>
                      <option value="CSPM">CSPM</option>
                      <option value="VAPT">VAPT</option>
                      <option value="CONTAINER">Container</option>
                      <option value="SAST_DAST">SAST/DAST</option>
                    </select>
                  </div>

                  {/* Uploaded From */}
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Uploaded From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className={`px-2 py-1.5 rounded border text-sm outline-none ${darkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-slate-300"}`}
                    />
                  </div>

                  {/* Uploaded To */}
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Uploaded To</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className={`px-2 py-1.5 rounded border text-sm outline-none ${darkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-slate-300"}`}
                    />
                  </div>

                </div>

                <div className="flex justify-end border-t pt-3 mt-3 border-slate-200 dark:border-slate-700">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded text-xs font-bold transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}

            {/* Active Filters Summary */}
            {(searchTerm || searchField !== "All" || filter !== "All" || selectedFormatFilter !== "All" || dateFrom || dateTo || quickFilter !== "all" || selectedOwners.length > 0) && (
              <div className={`px-4 py-2 border-b flex items-center flex-wrap gap-2 text-xs ${darkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}>
                <span className="font-semibold">Active filters:</span>
                
                {searchTerm && (
                  <span className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                    Search: {searchTerm} 
                    <button onClick={() => setSearchTerm("")} className="hover:text-purple-900"><X size={12}/></button>
                  </span>
                )}

                {searchField !== "All" && (
                  <span className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                    In: {searchField}
                    <button onClick={() => setSearchField("All")} className="hover:text-blue-900"><X size={12}/></button>
                  </span>
                )}

                {filter !== "All" && (
                  <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                    Severity: {filter}
                    <button onClick={() => setFilter("All")} className="hover:text-red-900"><X size={12}/></button>
                  </span>
                )}

                {quickFilter !== "all" && (
                  <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                    Quick: {quickFilter}
                    <button onClick={() => setQuickFilter("all")} className="hover:text-amber-900"><X size={12}/></button>
                  </span>
                )}

                {selectedFormatFilter !== "All" && (
                  <span className="flex items-center gap-1 bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200">
                    Format: {selectedFormatFilter}
                    <button onClick={() => setSelectedFormatFilter("All")} className="hover:text-teal-900"><X size={12}/></button>
                  </span>
                )}

                {dateFrom && (
                  <span className="flex items-center gap-1 bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full border border-slate-300">
                    From: {dateFrom}
                    <button onClick={() => setDateFrom("")} className="hover:text-slate-900"><X size={12}/></button>
                  </span>
                )}

                {dateTo && (
                  <span className="flex items-center gap-1 bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full border border-slate-300">
                    To: {dateTo}
                    <button onClick={() => setDateTo("")} className="hover:text-slate-900"><X size={12}/></button>
                  </span>
                )}

                {selectedOwners.length > 0 && (
                  <span className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                    Owners: {selectedOwners.length}
                    <button onClick={() => setSelectedOwners([])} className="hover:text-indigo-900"><X size={12}/></button>
                  </span>
                )}

                {(searchTerm || searchField !== "All" || filter !== "All" || selectedFormatFilter !== "All" || dateFrom || dateTo || quickFilter !== "all" || selectedOwners.length > 0) && (
                  <button onClick={clearFilters} className="ml-2 text-red-500 hover:text-red-700 font-semibold underline text-xs">Clear All</button>
                )}
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
                          <span className="text-sm font-medium">No {filter === "ZeroDay" ? "Zero Day vulnerabilities" : "issues"} found</span>
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
                        <tr
                          onClick={() => setExpandedRow(isExpanded ? null : rowKey)}
                          className={`border-b transition-colors cursor-pointer ${darkMode ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-100 hover:bg-slate-50"} ${isExpanded ? (darkMode ? "bg-slate-800/50" : "bg-slate-50") : ""}`}
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
                              const sevClass = issue.Severity === "Critical"
                                ? "bg-slate-800 text-white"
                                : issue.Severity === "High"
                                  ? "bg-slate-700 text-white"
                                  : issue.Severity === "Medium"
                                    ? "bg-slate-200 text-slate-700"
                                    : "bg-slate-100 text-slate-600";
                              return <td key={col} className="px-4 py-3"><span className={`px-2.5 py-1 rounded text-[10px] font-semibold ${sevClass}`}>{issue.Severity}</span></td>;
                            }
                            if (col === "Status") {
                              const statusClass = resolved
                                ? "bg-slate-100 text-slate-600"
                                : "bg-slate-50 text-slate-600 border border-slate-200";
                              return <td key={col} className="px-4 py-3"><span className={`px-2.5 py-1 rounded text-[10px] font-medium ${statusClass}`}>{issue.Status}</span></td>;
                            }
                            if (col === "DueDate") {
                              return <td key={col} className={`px-4 py-3 text-xs font-mono whitespace-nowrap ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{issue.DueDate} {breached && !resolved && <span className="text-slate-400 ml-1">•</span>}</td>;
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
                            const val = issue[col] !== undefined && issue[col] !== null ? issue[col] : "—";
                            return (
                              <td key={col} className={`px-4 py-3 text-xs min-w-[120px] whitespace-normal ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                                {String(val)}
                              </td>
                            );
                          })}
                        </tr>
                        {isExpanded && (
                          <tr className={darkMode ? "bg-slate-800/30" : "bg-slate-50"}>
                            <td colSpan={tableCols.length} className="px-6 py-5">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-white border border-slate-200"}`}>
                                  <h4 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    Vulnerability Details
                                  </h4>
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

      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <Send size={18} className="text-purple-400" />
                <h3 className="font-bold text-sm">Send Vulnerability Data</h3>
              </div>
              <button
                onClick={() => { setIsAiModalOpen(false); setMailtoResult(null); setAiRecipient(""); }}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Phase 2: Fallback panel shown after launch attempt ── */}
            {mailtoResult ? (
              <div className="p-6 flex flex-col gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 flex items-start gap-2">
                  <span className="text-green-500 text-base">✓</span>
                  <span>
                    Email launch attempted for <strong>{mailtoResult.recipient}</strong>.
                    If your email client did not open, use one of the options below.
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Open with</p>

                  {/* Native mailto (retry) */}
                  <a
                    href={`mailto:${encodeURIComponent(mailtoResult.recipient)}?subject=${encodeURIComponent(mailtoResult.subject)}&body=${encodeURIComponent(mailtoResult.body)}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 hover:border-purple-400 hover:bg-purple-50 transition-colors text-sm font-medium text-slate-700"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="text-lg">📧</span>
                    <div>
                      <div className="font-semibold">Default Email Client</div>
                      <div className="text-xs text-slate-400">Outlook Desktop, Thunderbird, Apple Mail…</div>
                    </div>
                  </a>

                  {/* Outlook Web */}
                  <a
                    href={`https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(mailtoResult.recipient)}&subject=${encodeURIComponent(mailtoResult.subject)}&body=${encodeURIComponent(mailtoResult.body)}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm font-medium text-slate-700"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="text-lg">🌐</span>
                    <div>
                      <div className="font-semibold">Outlook Web (Microsoft 365)</div>
                      <div className="text-xs text-slate-400">Opens compose in your browser</div>
                    </div>
                  </a>

                  {/* Gmail */}
                  <a
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(mailtoResult.recipient)}&su=${encodeURIComponent(mailtoResult.subject)}&body=${encodeURIComponent(mailtoResult.body)}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 hover:border-red-400 hover:bg-red-50 transition-colors text-sm font-medium text-slate-700"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="text-lg">✉️</span>
                    <div>
                      <div className="font-semibold">Gmail</div>
                      <div className="text-xs text-slate-400">Opens compose in Gmail</div>
                    </div>
                  </a>

                  {/* Copy body */}
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(mailtoResult.body).catch(() => {}); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 text-left"
                  >
                    <span className="text-lg">📋</span>
                    <div>
                      <div className="font-semibold">Copy Email Body</div>
                      <div className="text-xs text-slate-400">Paste into any email client manually</div>
                    </div>
                  </button>
                </div>

                {isGenerating && (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Activity size={12} className="animate-spin" /> Preparing Excel report…
                  </p>
                )}

                <div className="pt-2 flex justify-end border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setIsAiModalOpen(false); setMailtoResult(null); setAiRecipient(""); }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
            /* ── Phase 1: Compose form ── */
            <form
              onSubmit={handleShareEmailSubmit}
              className="p-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto"
            >
              {/* ── Active filter summary (read-only) ── */}
              <div className={`rounded-lg border text-sm ${totalRecords === 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
                <div className="px-4 pt-3 pb-2 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wide">Report Scope</h4>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${totalRecords === 0 ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700"}`}>
                    {totalRecords.toLocaleString()} record{totalRecords !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="px-4 py-3 grid grid-cols-2 gap-y-1.5 gap-x-4 text-slate-600 text-xs">
                  <span className="font-semibold text-slate-500">Format</span>
                  <span>{selectedFormatFilter}</span>
                  <span className="font-semibold text-slate-500">Owner</span>
                  <span>{selectedOwners.length > 0 ? selectedOwners.join(", ") : "All Owners"}</span>
                  {selectedBatches.length > 0 && (<>
                    <span className="font-semibold text-slate-500">Datasets</span>
                    <span>{selectedBatches.length} selected</span>
                  </>)}
                  {selectedContainerSubTypes.length > 0 && (<>
                    <span className="font-semibold text-slate-500">Sub-Types</span>
                    <span className="truncate">{selectedContainerSubTypes.join(", ")}</span>
                  </>)}
                  <span className="font-semibold text-slate-500">Date Range</span>
                  <span>{dateFrom && dateTo ? `${dateFrom} – ${dateTo}` : dateFrom ? `from ${dateFrom}` : dateTo ? `to ${dateTo}` : "All time"}</span>
                  {filter !== "All" && (<>
                    <span className="font-semibold text-slate-500">Severity</span>
                    <span>{filter}</span>
                  </>)}
                  {isAdvancedSearchOpen && searchTerm && (<>
                    <span className="font-semibold text-slate-500">Search</span>
                    <span className="truncate">{searchTerm}</span>
                  </>)}
                  <span className="font-semibold text-slate-500 border-t border-slate-100 pt-1.5">Resolved</span>
                  <span className="text-green-600 font-semibold border-t border-slate-100 pt-1.5">{groupedIssues.reduce((acc, g) => acc + g.resolved, 0)}</span>
                  <span className="font-semibold text-slate-500">Unresolved</span>
                  <span className="text-red-500 font-semibold">{groupedIssues.reduce((acc, g) => acc + g.unresolved, 0)}</span>
                </div>
                {totalRecords === 0 && (
                  <div className="px-4 pb-3 text-amber-700 text-xs font-medium">
                    ⚠ No vulnerabilities match the current filters. Please adjust your filters before sending.
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
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm"
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
                    className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="includeGraph" className="text-sm text-slate-700 font-medium cursor-pointer">
                    Include Resolved/Unresolved Graph (PNG)
                  </label>
                </div>

                {/* Graph mode toggle — only shown when graph is included */}
                {includeGraph && (
                  <div className="ml-6 flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Graph mode:</span>
                    <div className="flex bg-slate-100 rounded p-0.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setEmailGraphMode('Daily')}
                        className={`px-3 py-1 rounded transition-colors ${emailGraphMode === 'Daily' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Daily
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailGraphMode('Cumulative')}
                        className={`px-3 py-1 rounded transition-colors ${emailGraphMode === 'Cumulative' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Cumulative
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-slate-400 font-medium flex items-start gap-1.5">
                  <Send size={11} className="shrink-0 mt-0.5" />
                  <span>
                    Clicking Share will attempt to open your email client. If it doesn't open, fallback links for Outlook Web and Gmail will appear.
                    The report ZIP (Excel{includeGraph ? " + graph PNG" : ""}) downloads automatically.
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
                  disabled={isGenerating || !aiRecipient || totalRecords === 0}
                  title={totalRecords === 0 ? "No records match current filters" : ""}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700 transition-colors disabled:bg-purple-300 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <Activity size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Share via Email
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
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || isDuplicatePromptOpen}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-colors disabled:bg-blue-400 min-w-[120px] justify-center"
                >
                  {isProcessing ? (
                    <Activity size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  {isProcessing
                    ? uploadProgress || "Processing..."
                    : isDuplicatePromptOpen
                      ? "Awaiting Confirmation"
                      : isSheetSelectMode
                        ? "Upload Selected Sheet"
                        : "Confirm Upload"}
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
  );
};

const Card: React.FC<CardProps> = ({ title, val, Icon, color, bg }) => (
  <div className={`${bg} p-5 rounded-lg border border-slate-200 flex items-center justify-between transition-shadow hover:shadow-md`}>
    <div>
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">{title}</p>
      <p className={`text-2xl font-bold text-slate-800`}>{val}</p>
    </div>
    <div className={`p-2.5 rounded-lg bg-slate-100`}>
      <Icon size={20} className="text-slate-500" />
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

