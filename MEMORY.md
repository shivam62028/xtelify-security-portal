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

