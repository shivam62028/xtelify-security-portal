import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# 1. Remove "Show All" from the array
old_array = """          {[
            { key: "CONTAINER", label: "Container", icon: Server },
            { key: "VAPT", label: "VAPT", icon: Shield },
            { key: "CSPM", label: "CSPM", icon: Activity },
            { key: "SAST_DAST", label: "SAST/DAST", icon: FileText },
            { key: "All", label: "Show All", icon: Layers },
          ].map(fmt => ("""

new_array = """          {[
            { key: "CONTAINER", label: "Container", icon: Server },
            { key: "VAPT", label: "VAPT", icon: Shield },
            { key: "CSPM", label: "CSPM", icon: Activity },
            { key: "SAST_DAST", label: "SAST/DAST", icon: FileText },
          ].map(fmt => ("""

if old_array in content:
    content = content.replace(old_array, new_array)
    print("Replaced array successfully.")
else:
    print("Failed to find array.")

# 2. Add "Show All" to Historical Data Filter
old_date = """        {/* Historical Data Filter */}
        <div className={`flex items-center gap-3 p-1.5 px-4 rounded-xl ${darkMode ? "bg-slate-800 border border-slate-700" : "bg-slate-100 border border-slate-200"}`}>
          <div className="flex items-center gap-2">
            <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-600"}`}>From:</label>"""

new_date = """        {/* Historical Data Filter */}
        <div className={`flex items-center gap-3 p-1.5 px-4 rounded-xl ${darkMode ? "bg-slate-800 border border-slate-700" : "bg-slate-100 border border-slate-200"}`}>
          <button
            onClick={() => handleFormatFilterChange("All")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${selectedFormatFilter === "All"
              ? `${darkMode ? "bg-blue-600 text-white shadow-lg" : "bg-blue-600 text-white shadow-md"}`
              : `${darkMode ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-slate-600 hover:text-slate-900 hover:bg-white hover:shadow-sm"}`
              }`}
          >
            <Layers size={16} />
            Show All
          </button>
          
          <div className={`w-px h-6 ${darkMode ? "bg-slate-700" : "bg-slate-300"}`}></div>

          <div className="flex items-center gap-2">
            <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-600"}`}>From:</label>"""

if old_date in content:
    content = content.replace(old_date, new_date)
    print("Replaced date section successfully.")
else:
    print("Failed to find date section.")

with open("src/App.tsx", "w") as f:
    f.write(content)
