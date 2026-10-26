# MEMORY.md - Project Knowledge & Continuity

## Architecture & Data Model Notes

### Vulnerability Types & Owner Scoping
- The portal supports 4 primary vulnerability types:
  1. `CONTAINER`
  2. `CSPM`
  3. `SAST_DAST` (aliases: `SAST/DAST`, `sast_dast`)
  4. `VAPT`
- All 4 formats store the assigned owner in MongoDB `issues_collection` under `AssignedTo`.
- For SAST_DAST, fallback keys include `Assignee` and `ApplicationOwner`.
- For VAPT, fallback keys include `Application Owner`.
- `/api/db/metadata` returns:
  - `owners`: Distinct list of all owners across the entire database.
  - `owners_by_format`: Format-scoped map (`{ CONTAINER: [...], CSPM: [...], SAST_DAST: [...], VAPT: [...] }`) computing distinct owners who actually have issues assigned in each specific format.
- In the frontend (`src/App.tsx`):
  - `metadataOwnersByFormat` stores the format-to-owners mapping from `/api/db/metadata`.
  - `currentFormatOwners` resolves the active format's owners (from `metadataOwnersByFormat` with client-side fallback from `allIssues`), returning only owners with assigned issues in the selected format.
  - Auto-reset logic ensures switching tabs resets `assignedTo` to `"All Owners"` so users aren't left with an owner who has zero issues in the newly chosen format.
  - Custom glassmorphic `AssignUserDropdown` receives `currentFormatOwners` and displays format-accurate owner counts and names.

### Default Issue Status & Initial Load Filtering
- Previously, `FILTER_DEFAULT` had `resolutionStatus: "Open"`, causing portal refresh to immediately filter by open issues only (`status: "Open"` query param and Active Filter badge).
- `FILTER_DEFAULT` now sets `resolutionStatus: "All"`, allowing initial page loads and "Clear All" to display all open, resolved, and unresolved issues simultaneously.
- Users can selectively filter by status ("Open", "Resolved", "In Progress") using Advanced Search via the `ResolutionStatusDropdown`.

### Container Sub-Types Bar Chart
- `containerChartData` now maps both backend and fallback objects with `value`, `count`, and `Issues` keys.
- In `BarChart`, `minPointSize={6}` is applied so low-count sub-types (e.g. 8 or 36) remain clearly visible and interactive alongside large-volume categories (e.g. 275,114).
- Bar radius set to `[4, 4, 0, 0]` with color-coded `<Cell />` matching the metric cards (red for Zero day VA, violet for Wiz CLI Integration, amber for Compliance VA, sky for Quarterly VA, slate for Unclassified).
- `YAxis` updated with `width={65}` and `tickFormatter` (formatting `k` and `M`) to avoid clipping large values.

### Quarterly Closure Report Feature Overhaul
- **Frontend (`src/App.tsx`)**:
  - `QuarterlyReportModal`: Overhauled into a pure time-based quarterly trend modal.
  - Replaced the "Individual Resolution Performance" table with a Recharts `<BarChart>` plotting calendar quarters on the X-axis and Open (Airtel Red: `#EF4444`) vs Resolved (Emerald Green: `#10B981`) on the Y-axis. Includes a Side-by-Side vs Stacked view toggle.
  - Robust `useMemo` aggregation hook parses dates across all possible fields (`Date`, `Created Date`, `UploadDate`, `DiscoveredDate`, `ReportedOn`, `ResolutionDate`, `UpdatedAt`, `UploadedAt`, `firstSeen`, `Quarter`, `UploadBatch`) into calendar quarters (`Q1 = Jan-Mar, Q2 = Apr-Jun, Q3 = Jul-Sep, Q4 = Oct-Dec`).
  - Resolved counting logic (`isResolvedIssue`): Checks `Status`, `State`, `Vulnerability Status`, `FindingStatus`, `Compliant_NonCompliant` for "Closed", "Resolved", "Fixed", or "Mitigated" (case-insensitive) to fix the 0% closure bug.
  - Dynamic module filtering: Filters issues dynamically based on `activeModule` (SAST, CSPM, VAPT, Container, All) rather than hardcoding "CONTAINER".
  - Clean KPI cards: Total Closures (Emerald), Total Open (Airtel Red), Overall Closure Rate (Violet), and Quarters Tracked (Sky Blue).
  - Client-side Excel export generates formatted `.xlsx` with quarterly totals and closure percentages.
- **Backend (`app.py`)**:
  - `_quarterly_report_pipeline(payload)`: Updated projection and aggregation to parse dates for both open and resolved issues, count closures accurately, and produce `open`, `resolved`, `total`, and `pct` per quarter across all modules.

### Multi-Upload Historical Tracking & Trend Analysis
- **Frontend (`src/components/MultiUploadTrendAnalysis.tsx`, `src/App.tsx`)**:
  - Expanded the portal's Trend Analysis section from simple 2-dataset comparison to a full **multi-upload historical tracking engine**.
  - **Sequential Comparison Engine (`useMemo`)**: Extracts all historical upload datasets for the active module (Container, VAPT, CSPM, SAST/DAST, All) chronologically, and compares each upload against its immediate predecessor (Upload 1 vs 2, 2 vs 3, etc.) calculating **Newly Resolved**, **Newly Introduced**, and **Persistent Open** items.
  - **Aggregated KPI Cards**: Total Uploads Tracked, Cumulative Newly Resolved (highlighted in Emerald Green `#10B981`), Net Influx Rate (with reduction/growth trending), and Active Open Backlog.
  - **Multi-Point Trend Chart**: Recharts `<LineChart>` and stacked `<BarChart>` with toggle, plotting Total Open, Newly Introduced, and Newly Resolved curves across all historical scan versions.
  - **Historical Delta Audit Table**: Allows stakeholders to select any comparison point (Upload $X$ vs Upload $Y$) to audit status changes for specific CVEs and assets, with search, filters, pagination, and Excel (`.xlsx`) export.
  - **Navigation Integration**: First-class `Trend Analysis` tab in the top navigation bar (`Dashboard`, `Export View`, `Calendar`, `Manager View`, `Trend Analysis`), linked in `ManagerReportView` header and embedded inside `HistoricalAnalyticsModule` (Calendar -> Dataset Uploads).
  - **Zero Dummy Data Guarantee**: Completely stripped all mock datasets (`buildCuratedHistoricalDatasets` removed). When no database records exist, renders a clean, professional empty state ("No Historical Datasets Found in Database") across all module views.
  - **Arbitrary Multi-Dataset Selection**: Added an interactive dataset selection panel allowing users to select any number of datasets ($1, 2, 3, \dots, N$) via checkboxes, with "Select All", "Clear All", "Last 2", "Last 3", and "Last 5" quick controls. When $\ge 2$ datasets are selected, the sequential comparison engine evaluates the chosen subset in chronological order.
  - All additions tagged with `// richyrik`.

### Share Report & Remediation Reminders UI/UX Overhaul
- **Problem**:
  - The Share / Reminder modal appeared as an unstyled white dialog conflicting with the Deep Space dark portal aesthetic (`#07090E`).
  - Input field had invisible text (white text on light background due to `color-scheme: dark` browser inheritance).
  - Recipient email address was rigid and lacked interactive user control for adding multiple recipients, viewing added emails, or editing subjects/notes.
- **Frontend Solutions (`src/App.tsx`)**:
  - Overhauled the modal container to match the portal's obsidian glassmorphism theme (`bg-[#0B0F19]`, `border-slate-700/80`, `shadow-2xl shadow-black/90`, gradient accent border).
  - Ensured all input fields and textareas have explicit `#0f172a` dark backgrounds and `#ffffff` high-contrast text with `caret-blue-400`.
  - Introduced an interactive **Recipient Tag/Chip System**: users can type any custom email and press `Enter`, `,`, `;`, or click `+ Add` to add it as a removable tag pill with an `×` button.
  - Added quick-add suggestions that extract emails dynamically from active dataset assignees and owners.
  - Added an in-modal mode switcher toggle between **Share Report (.xlsx)** and **Send Reminders 🔔**.
  - Added custom subject line editing and optional message/note textarea.
  - Form automatically captures any un-added text in the input box upon submitting.
- **Backend Solutions (`app.py`)**:
  - Added `custom_subject` and `custom_note` parameters to `/api/share/outlook`.
  - Injected custom notes and instructions directly into the dispatch email body for both Mail Gateway (SMTP Relay) and Outlook deep links.
  - Dispatches to all recipients provided by the user.



### Trend Analysis & Dashboard Vulnerability Count Synchronization
- **Problem**:
  - The Dashboard (Image 2) displayed 275,871 total vulnerabilities across 5 uploaded datasets for CONTAINER (Image 3), but the Multi-Upload Trend Analysis view (Image 1) showed only 1 dataset and 100 vulnerabilities.
  - Root cause: In `src/App.tsx`, `allIssues` in React state only contained page 1 (100 items from `/api/db?page=1&limit=100`), which all belonged to a single batch. `MultiUploadTrendAnalysis` was computing its dataset list solely by grouping `allIssues`, causing it to miss the other 4 datasets and 275,771 findings stored in MongoDB.
- **Backend Fix (`app.py`)**:
  - Updated `/api/analytics/snapshot-timeline` to use high-performance MongoDB `$match` and `$group` aggregations across `issues_collection` and `upload_history_collection`.
  - Added case-insensitive format matching (`CONTAINER`, `Container`, `container`) and soft-delete filtering (`DeletedAt` missing or `None`).
  - Added prefix and multi-sheet aggregation matching so that multi-sheet uploads or batch suffixes are properly summed together.
  - Endpoint returns the full timeline of uploads along with `total_vulnerabilities`, `total_open`, and `total_resolved` directly from MongoDB.
- **Frontend Fix (`src/components/MultiUploadTrendAnalysis.tsx`)**:
  - Added `fetchRemoteTimeline` querying `/api/analytics/snapshot-timeline` with `selectedMod`.
  - Extended fallback dataset registration using `batches` and `batchFormats` passed from `App.tsx` metadata.
  - Aligned the KPI card row from 4 to 5 cards matching Dashboard styling: Total Vulnerabilities (275,871), Active Open Backlog, Cumulative Resolved, Net Influx Rate, and Uploads Tracked.
  - Added live "Total: X VUL across Y Datasets" badge in the subheader, dataset reload button (`RefreshCw`), and formatted all counts with `.toLocaleString()`.

### Trend Analysis Portal-Dataset Filtering & Deduplicated Lifecycle Resolution
- **Problem**:
  - In CONTAINER (and all other 3 vulnerability types), the portal has only 5 uploaded datasets (e.g. Datasets (5) in Dashboard), but Trend Analysis was displaying 19 datasets (including orphaned, sheet-fragmented, or deleted batches).
  - Additionally, when tracking vulnerability resolutions across sequential datasets, any vulnerability that remained resolved across multiple subsequent datasets needed to be counted exactly ONCE towards progress, not multi-counted every time it appeared in later datasets.
- **Root Cause**:
  1. /api/analytics/snapshot-timeline was previously appending historical batches from issues_collection.distinct('UploadBatch'), resurrecting deleted, orphaned, or sheet-split uploads (___Sheet1, ___Sheet2) not present in upload_history_collection.
  2. MultiUploadTrendAnalysis.tsx was not filtering remote datasets against the active portal batches (portalAllowedBatches) supplied by App.tsx via /api/db/metadata.
  3. Sequential delta tracking needed persistent lifecycle sets (everSeenOpen, newlyResolvedSet, baselineResolvedSet) to ensure that once a vulnerability transitions from open to resolved, it is credited as a progress resolution at that step and marked as Closed (Deduplicated) in all subsequent steps.
- **Solutions Implemented**:
  1. **Strict Portal-Only Datasets (app.py)**:
     - Query in /api/analytics/snapshot-timeline strictly mirrors /api/db/metadata using upload_history_collection.find({'DeletedAt': {'': False}}).
     - Standardized format matching for all 4 vulnerability types (CONTAINER, CSPM, SAST_DAST / SAST/DAST, VAPT).
     - Groups multi-sheet batches (f'{b} [{sheet}]' or f'{b}___{sheet}') under the parent batch via regex ^({batch})($|___|\s*\[) and _is_batch_match helper, completely eliminating orphaned and duplicate batches.
     - Attaches unique vulnerability signatures (items) directly to each snapshot in the timeline.
  2. **Portal Allowed Batches Filter (src/components/MultiUploadTrendAnalysis.tsx)**:
     - Memoized portalAllowedBatches strictly filters availableDatasets using batches and batchFormats props passed from App.tsx.
     - Guarantees that only datasets actively present in the portal (e.g., exactly the 5 datasets for CONTAINER) are ever displayed in Trend Analysis.
  3. **Deduplicated Cross-Dataset Resolution Engine**:
     - Introduced newlyResolvedSet, baselineResolvedSet, and everSeenOpen.
     - When an issue previously open is resolved in a dataset, it increments stepNewlyResolved for that dataset and is added to newlyResolvedSet.
     - In all subsequent datasets where this vulnerability remains resolved, it is marked as Already Resolved (Deduplicated) and NOT counted multiple times.
     - cumulativeNewlyResolved tracks newlyResolvedSet.size, ensuring every resolved vulnerability is counted exactly once across the entire sequence.
