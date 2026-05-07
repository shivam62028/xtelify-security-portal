import React, { useState, useEffect } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const App = () => {
  const [issues, setIssues] = useState([]);
  const [filter, setFilter] = useState("All"); // <-- NEW FILTER STATE

  // Your real AWS API URL
  const API_URL =
    "https://jy99i0kgk1.execute-api.us-east-1.amazonaws.com/issues";
  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setIssues(data))
      .catch((err) => console.error("Error fetching data:", err));
  }, []);

  // Simple stats calculation
  const stats = {
    total: issues.length,
    critical: issues.filter((i) => i.Severity === "Critical").length,
    open: issues.filter((i) => i.Status !== "Closed").length,
  };

  const chartData = [
    { name: "Critical", value: stats.critical, color: "#ef4444" },
    { name: "High/Med", value: stats.total - stats.critical, color: "#f59e0b" },
  ];

  // Apply the filter to the table data
  const displayedIssues =
    filter === "All"
      ? issues
      : issues.filter((issue) => issue.Severity === filter);

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <header className="mb-8 flex items-center gap-3">
        <Shield className="text-blue-600" size={32} />
        <h1 className="text-2xl font-bold text-gray-800">
          Wynk Security Leadership Portal
        </h1>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card
          title="Total Issues"
          val={stats.total}
          Icon={Clock}
          color="text-blue-600"
        />
        <Card
          title="Critical Risk"
          val={stats.critical}
          Icon={AlertTriangle}
          color="text-red-600"
        />
        <Card
          title="Open Status"
          val={stats.open}
          Icon={CheckCircle}
          color="text-green-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Visualization */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold mb-4 text-gray-700">
            Severity Distribution
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Data Table & Filters */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-700 font-semibold">
              <Filter size={18} />
              <h2>Issue Log</h2>
            </div>

            {/* NEW FILTER BUTTONS */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("All")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === "All" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              >
                Show All
              </button>
              <button
                onClick={() => setFilter("Critical")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === "Critical" ? "bg-red-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              >
                Critical Only
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Issue</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Owner</th>
                  <th className="px-6 py-4">AI Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedIssues.map((issue, index) => (
                  <tr
                    key={issue.IssueID || index}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {issue.IssueID}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${issue.Severity === "Critical" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}
                      >
                        {issue.Severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{issue.Owner}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {issue.AI_Summary}
                    </td>
                  </tr>
                ))}
                {/* Fallback if filter shows no results */}
                {displayedIssues.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-6 py-8 text-center text-gray-400"
                    >
                      No issues found for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// 1. Define the "shape" of the data the Card needs
interface CardProps {
  title: string;
  val: string | number;
  Icon: any;
  color: string;
}

const Card = ({ title, val, Icon, color }: CardProps) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-800">{val}</p>
    </div>
    <Icon className={color} size={36} />
  </div>
);

export default App;
