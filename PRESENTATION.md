# Xtelify Security Portal
## Enterprise Vulnerability Management Dashboard

---

# Project Overview

**Xtelify Security Portal** is a comprehensive web-based vulnerability management platform designed for enterprise security teams to track, analyze, and remediate security vulnerabilities across their infrastructure.

### Key Capabilities
- Upload and process vulnerability scan reports (Excel, CSV, JSON)
- Smart worksheet detection for multi-sheet Excel files
- Real-time vulnerability tracking and status management
- Team performance leaderboard and MTTR metrics
- Export capabilities (Excel, PDF)
- Role-based access (Admin/Viewer)

---

# Tech Stack

## Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | UI Framework |
| **TypeScript** | Type-safe JavaScript |
| **Vite 8** | Build tool & dev server |
| **TailwindCSS 4** | Utility-first CSS framework |
| **Recharts** | Data visualization (charts) |
| **Lucide React** | Icon library |
| **XLSX (SheetJS)** | Excel file parsing & export |
| **jsPDF + autoTable** | PDF generation |

## Backend
| Technology | Purpose |
|------------|---------|
| **Python 3.x** | Backend language |
| **FastAPI** | REST API framework |
| **Pandas** | Data processing & manipulation |
| **openpyxl** | Excel file inspection |
| **httpx** | Async HTTP client |
| **LangSmith** | AI observability & tracing |

## Infrastructure
| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Nginx** | Static file serving (production) |
| **JSON File** | Lightweight database (xtelify_db.json) |

---

# System Architecture

```
+------------------------------------------------------------------+
|                         BROWSER (Client)                          |
|                                                                  |
|  +----------------------------------------------------------+   |
|  |                    React Application                      |   |
|  |  +----------------+  +----------------+  +--------------+ |   |
|  |  | Dashboard View |  | Upload Modal   |  | Export Modal | |   |
|  |  +----------------+  +----------------+  +--------------+ |   |
|  |  +----------------+  +----------------+  +--------------+ |   |
|  |  | Charts/Stats   |  | Vuln Table     |  | Leaderboard  | |   |
|  |  +----------------+  +----------------+  +--------------+ |   |
|  +----------------------------------------------------------+   |
|                              |                                   |
|                     HTTP REST API Calls                          |
+------------------------------------------------------------------+
                               |
                               v
+------------------------------------------------------------------+
|                      FastAPI Backend (app.py)                     |
|                                                                  |
|  +------------------+  +------------------+  +----------------+  |
|  | /api/upload-     |  | /api/db          |  | /api/          |  |
|  | report           |  | (GET/POST/DELETE)|  | leaderboard    |  |
|  +------------------+  +------------------+  +----------------+  |
|           |                    |                    |            |
|           v                    v                    v            |
|  +------------------+  +------------------+  +----------------+  |
|  | Smart Worksheet  |  | JSON Database    |  | Points         |  |
|  | Detection        |  | Operations       |  | Calculator     |  |
|  +------------------+  +------------------+  +----------------+  |
|           |                    |                                 |
|           v                    v                                 |
|  +------------------+  +------------------+                      |
|  | Column Mapping   |  | xtelify_db.json  |                      |
|  | & Normalization  |  | (Persistence)    |                      |
|  +------------------+  +------------------+                      |
+------------------------------------------------------------------+
```

---

# Data Flow: Upload Process

```
User Selects Excel File
         |
         v
+-------------------+
| Frontend sends    |
| FormData to       |
| /api/upload-report|
+-------------------+
         |
         v
+-------------------+
| Backend receives  |
| file bytes        |
+-------------------+
         |
         v
+-------------------+
| Smart Worksheet   |
| Detection         |
| (openpyxl)        |
+-------------------+
         |
    +----+----+
    |         |
    v         v
+-------+ +-------+
| Auto  | | Manual|
| Select| | Select|
| Best  | | Sheet |
| Sheet | | Modal |
+-------+ +-------+
    |         |
    +----+----+
         |
         v
+-------------------+
| Detect Header Row |
| (scan first 15    |
| rows)             |
+-------------------+
         |
         v
+-------------------+
| Pandas reads      |
| selected sheet    |
| from header row   |
+-------------------+
         |
         v
+-------------------+
| Column Mapping    |
| (find_col)        |
| ID -> IssueID     |
| Name -> DisplayID |
| CVSSSeverity ->   |
|   Severity        |
+-------------------+
         |
         v
+-------------------+
| Normalize Records |
| - Set defaults    |
| - Calculate DueDate|
| - Set Severity    |
+-------------------+
         |
         v
+-------------------+
| Save to           |
| xtelify_db.json   |
+-------------------+
         |
         v
+-------------------+
| Return success    |
| Frontend reloads  |
+-------------------+
```

---

# API Endpoints

## Core Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/db` | Fetch all vulnerability records |
| `POST` | `/api/db` | Add new vulnerability items |
| `DELETE` | `/api/db` | Delete a dataset by UploadBatch |
| `POST` | `/api/upload-report` | Upload & process Excel/CSV/JSON |
| `POST` | `/api/upload-report-with-sheet` | Upload with manual sheet selection |
| `GET` | `/api/leaderboard` | Get team performance rankings |
| `POST` | `/api/analyze` | AI analysis of vulnerability |
| `POST` | `/api/ask-agent` | Chat with AI security agent |
| `GET` | `/{path}` | Serve frontend static files |

---

# Frontend Components Structure

```
App.tsx
├── ErrorBoundary (Error handling wrapper)
├── AppContent (Main application)
│   ├── Header
│   │   ├── Logo & Title
│   │   ├── Role Selector (Admin/Viewer)
│   │   └── Database Status
│   │
│   ├── View Mode Toggle
│   │   ├── AI Optimized Dashboard
│   │   └── Live Export Preview
│   │
│   ├── Dashboard Cards
│   │   ├── Unique Vulnerabilities
│   │   ├── Total Affected Assets
│   │   ├── Critical Risks
│   │   └── SLA Breached
│   │
│   ├── Charts Section
│   │   ├── PieChart (Resolution Status)
│   │   ├── BarChart (Vulnerability Types)
│   │   ├── AreaChart (Discovery Timeline)
│   │   └── BarChart (Owner Workload)
│   │
│   ├── Department Accountability
│   │   ├── Department Selector
│   │   └── Department Stats
│   │
│   ├── Top Remediation Actions
│   │
│   ├── Leaderboard Component
│   │
│   ├── Security Agent (Chat)
│   │
│   ├── Vulnerability Table
│   │   ├── Column Selector
│   │   ├── Dataset Filter
│   │   ├── Severity Filter
│   │   ├── Search Box
│   │   └── Grouped Rows (expandable)
│   │
│   └── Modals
│       ├── Upload Dataset Modal
│       ├── AI Email Modal
│       └── Custom Export Modal
```

---

# Key Features Deep Dive

## 1. Smart Worksheet Detection

When uploading Excel files with multiple sheets:

```python
# Scoring Algorithm
+3 points: ID, Name, Severity, FindingStatus columns
+2 points: Score, CVSSSeverity, WizURL columns
+1 point:  Other expected columns
+5 points: More than 100 data rows
+3 points: More than 50 data rows
-3 points: Fewer than 20 data rows
-5 points: Sheet name contains "Grand Total", "Count of", "Pivot"
```

**Automatically selects the worksheet with vulnerability data, ignoring summary/pivot sheets.**

---

## 2. Column Auto-Mapping

The system intelligently maps various column names to standard fields:

```python
# Example mappings
"ID" / "IssueID" / "VulnID" / "CVE" → IssueID
"CVSSSeverity" / "VendorSeverity" / "Risk" → Severity
"FirstDetected" / "DetectedDate" / "FoundDate" → DiscoveredDate
"WizURL" / "Link" / "Reference" → ReferenceLinks
```

**Supports multiple column naming conventions from different vulnerability scanners.**

---

## 3. Vulnerability Grouping

Frontend groups vulnerabilities by CVE/ID:

```typescript
// Grouping logic
const groupedIssues = useMemo(() => {
  const groups: Record<string, IssueGroup> = {};
  
  displayedIssues.forEach((issue) => {
    const groupKey = issue.DisplayID;  // CVE-2024-XXXX
    
    if (!groups[groupKey]) {
      groups[groupKey] = { ...issue, Assets: [] };
    }
    
    // Multiple assets affected by same vulnerability
    groups[groupKey].Assets.push({
      AssetName: issue.AffectedAsset,
      AssignedTo: issue.AssignedTo,
      Status: issue.Status
    });
  });
  
  return Object.values(groups);
}, [displayedIssues]);
```

---

## 4. Leaderboard & Gamification

Team performance is calculated based on:

```python
# Points calculation
Base Points:
  - Critical fix: 100 pts
  - High fix: 50 pts
  - Medium/Low fix: 25 pts

Multiplier (faster = more points):
  multiplier = SLA_hours / actual_hours

Tiers:
  - Elite Guardian: > 1800 pts
  - SecOps Specialist: > 1400 pts
  - Patch Master: > 1000 pts
  - Green Horn: < 1000 pts
```

---

# File Structure

```
xtelify-security-portal-main/
├── app.py                 # FastAPI backend (all API logic)
├── xtelify_db.json        # JSON database file
├── package.json           # Frontend dependencies
├── vite.config.ts         # Vite build configuration
├── tailwind.config.js     # TailwindCSS configuration
├── Dockerfile             # Docker build (Node + Nginx)
├── .env                   # Environment variables
│
├── src/
│   ├── App.tsx            # Main React application (~2700 lines)
│   ├── main.tsx           # React entry point
│   └── utils/
│       └── exportUtils.ts # Export helper functions
│
└── dist/                  # Production build output
    ├── index.html
    └── assets/
        ├── index-*.js
        └── index-*.css
```

---

# Database Schema

Each vulnerability record in `xtelify_db.json`:

```json
{
  "IssueID": "CVE-2024-12345",
  "DisplayID": "CVE-2024-12345",
  "UploadBatch": "July 2026 Audit",
  "Severity": "Critical",
  "Status": "Open",
  "Category": "Remote Code Execution",
  "Department": "Platform Team",
  "AssignedTo": "john.doe@company.com",
  "DiscoveredDate": "2026-07-15",
  "DueDate": "2026-07-22",
  "Description": "Buffer overflow in OpenSSL...",
  "AffectedAsset": "api-server-prod-01",
  "RecommendedAction": "Upgrade OpenSSL to 3.1.5",
  "ReferenceLinks": "https://nvd.nist.gov/vuln/..."
}
```

---

# How Things Connect

## Request Flow Example: Loading Dashboard

```
1. User opens browser → React app loads
2. App.tsx useEffect() fires on mount
3. fetch(`${BACKEND_URL}/api/db`) called
4. FastAPI /api/db endpoint returns JSON array
5. React sets allIssues state
6. useMemo hooks calculate:
   - activeIssues (filtered by selected batches)
   - displayedIssues (filtered by severity/search)
   - groupedIssues (grouped by CVE)
   - stats (counts, breaches)
   - chartData (formatted for Recharts)
7. Components re-render with data
```

## Request Flow Example: Uploading Dataset

```
1. User clicks "Upload Dataset"
2. File input onChange → handleFileSelect()
3. Upload modal opens
4. User enters dataset name, clicks "Confirm Upload"
5. processAndUploadFile() creates FormData
6. POST to /api/upload-report
7. Backend:
   a. find_best_worksheet() scores all sheets
   b. read_selected_sheet() loads best sheet
   c. Column mapping applied
   d. Records normalized
   e. Saved to xtelify_db.json
8. Frontend receives success
9. window.location.reload() refreshes data
```

---

# Security Considerations

- **CORS**: Configured to allow all origins (development mode)
- **File Validation**: Supports only .xlsx, .xls, .csv, .json
- **Input Sanitization**: Pandas fillna() handles null values
- **No Authentication**: Current version for internal use
- **Evidence Redaction**: AI analysis redacts sensitive evidence

---

# Deployment Options

## Option 1: Development Mode
```bash
# Terminal 1: Backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
npm run dev
```

## Option 2: Production (Docker)
```bash
# Build frontend
npm run build

# Run with Docker
docker build -t xtelify-portal .
docker run -p 80:80 xtelify-portal
```

## Option 3: Combined (FastAPI serves frontend)
```bash
# Build frontend
npm run build

# Run backend (serves dist/ folder)
python app.py
# or
uvicorn app:app --host 0.0.0.0 --port 8000
```

---

# Performance Optimizations

1. **Smart Excel Reading**: Uses openpyxl read_only mode for inspection, only loads selected sheet into pandas

2. **React useMemo**: Heavy calculations (grouping, stats, charts) are memoized

3. **Lazy Loading**: Chart data computed only when needed

4. **Session Storage**: Export column preferences persisted

5. **Batch Operations**: Database writes happen once per upload, not per row

---

# Future Enhancements

- User authentication & authorization
- PostgreSQL/MongoDB database backend
- Real-time notifications (WebSockets)
- Integration with vulnerability scanners (Qualys, Nessus, Wiz)
- Automated remediation workflows
- SLA breach email alerts
- Historical trend analysis
- Custom dashboard widgets

---

# Summary

**Xtelify Security Portal** provides:

- **Unified View**: All vulnerabilities in one dashboard
- **Smart Processing**: Auto-detects data format and columns
- **Actionable Insights**: Charts, stats, and remediation priorities
- **Team Accountability**: Leaderboard gamifies security work
- **Flexible Export**: Excel and PDF reports
- **Offline-First**: Works without internet (JSON file storage)

**Tech Stack**: React + TypeScript + FastAPI + Pandas

---

# Thank You!

**Questions?**

GitHub: [Project Repository]
Author: richyrik
