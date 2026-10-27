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

### Resolution Integrity Fix in Multi-Upload Trend Analysis
- **Problem**:
  - In CONTAINER (where all 5 uploads currently have 0 resolved issues in MongoDB and filtering by Status: Resolved shows 'No CONTAINER data available' in Dashboard), the Trend Analysis view showed 'Cumulative Resolved: 1,848'.
- **Root Cause**:
  1. In the sequential loop, items from earlier uploads that were not present in the current upload (due to different scan targets or smaller report files like 226 items vs 5,385 items) were being counted as 'Newly Resolved' via `!currMap.has(key)` and labeled 'Remediated (No Longer Present)'.
  2. In the count fallback loop, when `openDelta < 0` (i.e. next scan file had fewer open issues than the previous scan file), the absolute delta was being assigned to `stepNewlyResolved`.
  3. In the Delta Audit comparison table, `itemX && !itemY` was marking open issues omitted in file Y as 'Newly Resolved'.
- **Fix Implemented**:
  1. An issue is ONLY 'Newly Resolved' if it is present in the dataset AND explicitly marked as resolved (`currRes === true`), having been open in an earlier dataset.
  2. Omitted items from different files are marked as 'No Longer Present' / 'Not Scanned in This Upload', NOT 'Newly Resolved'.
  3. If all selected datasets in the database have 0 resolved issues (`totalResolvedSum === 0`), `cumulativeNewlyResolved` is strictly guaranteed to be 0, matching the real database.
  4. Deduplicated tracking ensures that if an issue is resolved in multiple subsequent datasets, it is counted exactly once (1 time).

### AOP 2027 Dashboard Redesign (FinOps Section)
- **Problem**:
  - The previous FinOps AOP view contained hardcoded dummy quarterly data (`Q1 2024`, `Planned vs Actual Spend`).
  - Company schema for "AOP 2027" consists of 7 exact columns:
    1. `Project` (Col A)
    2. `Cost Component` (Col B)
    3. `Usecase` (Col C)
    4. `LOB` (Col D)
    5. `Amount` (Col E)
    6. `Payment mode (Monthly / One time)` (Col F)
    7. `Capex/Opex` (Col G)
  - Crucial current company state: Columns A, B, and C are populated with real scoping items, whereas Columns D, E, F, and G are currently empty and will be filled by finance. The dashboard must look stunning both NOW (when D–G are pending) and LATER (when D–G are populated).
- **Implementation (`src/components/AOPDashboardView.tsx`, `src/App.tsx`)**:
  - **Header & Action Bar**:
    - Title: `AOP 2027 — Annual Operating Plan` with subtitle: `Project cost components, use case scoping, Capex/Opex classification, and LOB budget allocation.`
    - Actions: `Upload AOP Excel` (client-side Excel file parsing), `Export Excel` (generates `.xlsx` with exact 7-column headers), and a 4-way filter bar (`Search Project / Usecase`, `Filter by Project`, `Filter by LOB`, `Filter by Capex/Opex`).
    - Demo toggle button: Allows one-click preview between initial empty D–G state and populated financial state for testing/demoing.
  - **4 Top Executive KPI Cards**:
    - *Total Scoped Projects & Use Cases*: Unique projects and line-item use case counts.
    - *Cost Components Mapped*: Total cost components + dynamic Data Completeness % badge (`X / Y filled`).
    - *Total AOP 2027 Budget*: INR currency formatter (`₹ Cr`, `₹ L`, `₹ M`). If empty or ₹0, displays `Pending Allocation` in amber text with subtext `"Scoping complete — awaiting finance inputs"`.
    - *Capex / Opex & Payment Split*: Displays ratio when present, or `"Unclassified (Pending Col F & G)"` when empty.
  - **Dual Analytics Charts Grid**:
    - *Left Chart (Project Breakdown)*: Toggleable BarChart. By default plots count of Cost Components & Use Cases per project (rich and colorful right now with Cols A–C). When amounts are entered, toggles to Total Budget (₹) per Project.
    - *Right Chart (Financial Structure vs Scoping Readiness)*: If Columns D, F, G are empty, renders a glassmorphic "AOP 2027 Scoping Readiness" audit card highlighting that 100% of Projects, Components, and Use Cases are mapped while Columns D–G are awaiting financial inputs. When populated, renders interactive Donut/Pie/Bar charts for LOB, Capex/Opex, and Payment Mode splits.
  - **AOP 2027 Master Data Table**:
    - Exact 7 columns from Image 1 with dark glassmorphic styling.
    - Subtle pills for Cost Component, monospace INR for Amount (or `— Awaiting Cost` in muted amber), and color-coded pills for LOB, Payment Mode, and Capex/Opex.
    - Interactive inline edit modal allows clicking any row's pending cells to input LOB, Amount, Payment Mode, and Capex/Opex, instantly updating KPIs and charts.
  - **Excel Parser & Exporter**:
    - Client-side parser with case-insensitive and flexible regex matching for the 7 exact headers.
    - Supports empty D, E, F, G cells seamlessly and persists user updates to `localStorage`.

### NFA & GBPA Status Tracker Overhaul (FinOps Section)
- **Problem**:
  - The previous FinOps NFA/GBPA view (`approvals`) displayed hardcoded mock approval notes with dummy allocation bars.
  - The company's actual Excel tracker schema consists of 13 exact columns (Images 1 & 2):
    1. `Project` (Col A)
    2. `NFA Number` (Col B)
    3. `Status` (Col C)
    4. `Comment` (Col D)
    5. `AOP?` (Col E)
    6. `Capex / Opex` (Col F)
    7. `Cost Component` (Col G)
    8. `Usecase` (Col H)
    9. `Owner` (Col I)
    10. `Vendor` (Col J)
    11. `Quantity and Duration` (Col K)
    12. `Annual Cost (Cr)` (Col L)
    13. `Email Thread` (Col M)
- **Implementation (`src/components/NFAGBPATrackerView.tsx`, `src/App.tsx`)**:
  - **Header & Action Bar**:
    - Title: `NFA & GBPA Status Tracker`
    - Subtitle: `Track active approval notes, financial commitments, vendor allocations, and annual costs from uploaded Excel sheets.`
    - Buttons: `Upload NFA Excel` (file picker + drag-and-drop supporting `.xlsx`, `.xls`, `.csv`), `Export Excel` (exports formatted 13-column `.xlsx`), `Add Note`, and `Reset Sample Data`.
  - **4 Executive KPI Cards**:
    - *Total Approvals*: Total count with NFA vs GBPA breakdown badges.
    - *Approved vs Pending*: Count of approved items, percentage badge, and pending/rejected breakdown.
    - *Total Annual Cost*: Monospace sum of `Annual Cost (Cr)` formatted in INR (e.g., `₹7.57 Cr`) with Capex vs Opex breakdown.
    - *AOP 2027 Alignment*: Count and percentage of approvals marked `Yes` under `AOP?`.
  - **Filter & Search Bar**:
    - Search input (searches Project, NFA Number, Vendor, Owner, Usecase, Comment).
    - Status Filter (`All`, `Approved`, `Pending`, `Rejected`).
    - Capex / Opex Filter (`All`, `Capex`, `Opex`).
    - AOP Filter (`All`, `Yes`, `No`).
    - View Mode Switcher: **Cards View** (Image 3 modernized) vs. **Master Table View** (13 columns).
  - **Master Card Grid & Table View**:
    - *Card View*:
      - Header: Purple `NFA` / Cyan `GBPA` pill + NFA Number monospace font + Project title + Status badge with animated glowing indicator.
      - Key Metadata Grid: `Owner` (user icon), `Vendor` (cloud/building icon), `Capex / Opex` badge, `AOP?` badge.
      - Financials: Highlighted `Annual Cost (Cr)` box in INR + `Quantity and Duration` with clock icon.
      - Operational Scope: `Cost Component` pill, `Usecase` text, and `Comment / Remarks` info callout.
      - Action Bar: `Email Thread` link button opening an approval thread viewer modal with deep-linking, plus inline edit and delete actions.
    - *Table View*: Full 13-column interactive master table matching the exact headers.
    - *Empty State*: Clean drag-and-drop dropzone when 0 records are present with file selector and sample data loader.
  - **Excel Parsing & Persistence**:
    - Case-insensitive regex matching for all 13 columns.
    - Auto-sanitizes currency strings (`₹`, `Cr`, commas) and parses numbers cleanly.
    - Persists state to `localStorage` (`xtelify_nfa_gbpa_records_v1`).

### Cloud Cost & Credit Tracker Hierarchical Overhaul (FinOps Section)
- **Problem**:
  - The previous Credit Tracker view rendered 4 generic hardcoded donut cards for discount pools.
  - The actual company Excel sheet (Images 1 & 2) features a hierarchical structure:
    - Column A: Main Category (`Cloud Cost`)
    - Column B: Sub-Category (`CDN`, `Video Platform`, `Cross Charge`, `Total`)
    - Column C: Line Items (e.g. `AWS (CloudFront)`, `GCP (MediaCDN)`, `Akamai`, `Akamai (Fixed)`, `CDN AOP`, `CDN Total`, `Ateme AOP`, `Ateme`, `API AOP`, `API`, `Direct Connect`, `Cumulative AOP`, `Cumulative Spend`)
    - Columns D–O: Monthly financial timeline spanning Actuals (`Apr-2026`, `May-2026`, `Jun-2026`) and Projected (`Jul-2026` to `Mar-2027`).
- **Implementation (`src/components/CloudCostCreditTrackerView.tsx`, `src/App.tsx`)**:
  - **Header & Action Bar**:
    - Title: `Cloud Cost & Credit Tracker`
    - Subtitle: `Hierarchical cost tracking across CDN, Video Platforms, Cross Charges, and monthly Actual vs Projected forecasts.`
    - Buttons: `Upload Tracker Excel` (supports `.xlsx`, `.xls`, `.csv`), `Export Excel` (exports hierarchical Excel matching company schema), and `Reset to Default`.
  - **Category Selector Bar**:
    - Pill filters: `All Categories`, `CDN`, `Video Platform`, `Cross Charge`, `Total` with live item counts.
    - Component search bar and `Expand All` / `Collapse` controls.
  - **3 Executive KPI Cards**:
    - *Total YTD Actual Spend*: Formatted sum of Apr-2026 to Jun-2026 actuals in INR (`₹ Cr / ₹ L`).
    - *Total Annual Projected Spend*: 12-month full-year forecast sum.
    - *YTD AOP Variance*: Difference between YTD Actual Spend and YTD AOP Budget, with favorable/unfavorable indicator badge and rate.
  - **Hierarchical Accordion Table**:
    - Collapsible accordion sections for each Sub-Category with item count and subtotal badges.
    - Super-headers visually distinguishing **Actuals** (emerald green tint) from **Projected Forecast** (warm amber tint), with full-year row totals.
    - Distinct styling for `AOP Target` budget rows (cyan pill) and `Total` summary rows (bold text, dark background).
    - **Inline Cell Editing**: Clicking any monthly cell allows editing values directly in-place with instant KPI recalculation.
    - **Add Row Modal**: Insert new line items dynamically per sub-category.
  - **Excel Parsing & Persistence**:
    - Handles merged cells for Main and Sub-Categories using downward propagation.
    - Automatically discovers monthly timeline columns and labels.
    - Saves state to `localStorage` (`xtelify_cloud_cost_tracker_v1`).

### Billing Observability Executive FinOps Command Center Overhaul
- **Problem**:
  - The previous Billing Observability tab only rendered 4 simple invoice KPI cards and a single static AWS vs GCP bar chart, disconnected from AOP targets, Credit Tracker categories, and NFA approval coverage.
- **Implementation (`src/components/BillingObservabilityView.tsx`, `src/App.tsx`)**:
  - All additions tagged with `// richyrik`.
  - **1. Executive Summary & AOP Pacing Header**:
    - Top executive banner showing **YTD Cloud Spend** (`₹13.66M`) vs **AOP 2027 Target** (`₹14.60M`).
    - Animated gradient pacing bar (`93.5% of AOP 2027 Budget Consumed`) with headroom indicator (`₹935K Remaining Buffer`).
    - Quick-status pills: `Active NFAs: 12`, `Pending Approvals: 2`, `Total Outstanding Invoices: ₹817K`, and `NFA Coverage: 92% Aligned`.
  - **2. Expanded 6-Card KPI Grid**:
    - *Total Cloud Spend (YTD)*: Combined AWS + GCP paid (`₹7.20M`) with `+4.8% MoM` growth delta.
    - *Total Outstanding Invoices*: `₹817K` in amber/red alert styling with open invoice count.
    - *CDN vs Video Share*: `68% CDN • 32% Video` (`₹7.13M` media run-rate) with dual-color breakdown bar.
    - *Approved NFA Coverage*: `88% Backed` (`₹12.02M` backed by active NFAs).
    - *GCP Net Paid & Outstanding*: `₹4.91M Paid` vs `₹541K Open` (90.1% settled progress bar).
    - *AWS Net Paid & Outstanding*: `₹2.29M Paid` vs `₹276K Open` (89.2% settled progress bar).
  - **3. Multi-Dimensional Monthly Spend Chart (Interactive Toggle)**:
    - *Toggle Option A — By Cloud Provider*: Existing grouped bar chart with `gcpPaid` (`#4285F4`), `gcpOpen` (`#EF4444`), `awsPaid` (`#FF9900`), `awsOpen` (`#F59E0B`).
    - *Toggle Option B — By Service Category*: Groups monthly spend by Credit Tracker categories: `CDN` (`#06B6D4`), `Video Platform` (`#8B5CF6`), `Cross Charge` (`#F59E0B`), and `Core Compute & Storage` (`#10B981`).
  - **4. Billing Anomaly & Recent Invoice Audit Table**:
    - Granular transaction log with columns: `Invoice ID`, `Provider / Vendor`, `Category`, `Billing Month`, `Amount (₹)`, `Status`, `Linked NFA / AOP Ref`, and `Risk / Anomaly Flag` (e.g. `Normal`, `Surge +18%`, `Due in 5 Days`, `Under Reconciliation`).
    - Instant text search, status dropdown filter, provider dropdown filter, and `.xlsx` export button.

### Multi-Worksheet FinOps Ingestion & Currency Control Engine
- **Implementation (`src/components/FinOpsCurrencyContext.tsx`, `src/components/FinOpsGlobalFilterBar.tsx`, `src/components/MultiSheetIngestionModal.tsx`, `src/components/CurrencyMismatchDialog.tsx`, `src/components/ExchangeRateModal.tsx`, `src/App.tsx`)**:
  - All additions tagged with `// richyrik`.
  - **1. Multi-Sheet Auto-Categorization & Ingestion Modal**:
    - Uses SheetJS (`xlsx`) to automatically parse workbooks with multiple worksheets (e.g., "New Components", "AOP 2027", "Cloud Cost").
    - Smart heuristic router detects worksheet targets (`aop`, `credits`, `approvals`, or `billing`) using both sheet names and header patterns.
    - Shows an interactive upload preview modal displaying detected sheets, row counts, detected currency, target route, and allow manual re-mapping before ingestion.
  - **2. Multi-Year & Multi-Month Global Date Filter Bar**:
    - Global sticky bar at the top of the FinOps portal with Fiscal Year selector (FY 2026-27, FY 2027-28, FY 2025-26, FY 2024-25) and Multi-Month dropdown with checkboxes.
    - Quick selection presets: Q1, Q2, Q3, Q4, YTD Actuals, All Months, and Clear.
    - Active month filtering is hooked directly into all 4 FinOps views (`BillingObservabilityView`, `CloudCostCreditTrackerView`, `AOPDashboardView`, `NFAGBPATrackerView`).
  - **3. Intelligent Currency Detection & Mismatch Dialog**:
    - Scans numeric columns, headers, and values for currency indicators (`$`, `₹`, `USD`, `INR`, `EUR`, `GBP`).
    - When newly uploaded worksheets conflict with existing stored currency (e.g. historical USD vs uploaded INR), pauses ingestion and presents a 3-way resolution modal:
      - *Option A:* Convert new incoming data to match existing currency.
      - *Option B:* Convert existing stored data to match new incoming currency.
      - *Option C:* Keep separate and apply on-the-fly exchange rate conversion.
  - **4. Global Currency Switcher & Editable Exchange Rate Audit Log**:
    - Global switcher in the top bar for `INR - ₹`, `USD - $`, `EUR - €`, `GBP - £`.
    - Live exchange rate calculations convert all KPI cards, tables, and charts on the fly.
    - Dedicated Exchange Rate Management modal allowing users to edit current FX rates (USD, EUR, GBP) and test live amounts in an interactive conversion sandbox.
    - Emits and renders an audit log badge: *"Exchange rate updated to X.XX INR/USD by User on [Timestamp]"* with persistent audit trail.
  - **5. Tooltip & Hover Data Consistency Guard**:
    - All Recharts tooltips, hover cards, and bar/line series format values according to the active currency (`formatCurrency(v, false)`).
    - Table columns and row totals directly reflect the exact underlying filter state (Year, Month, and Category), with the "Data Consistency Guard: Active" badge displayed in the global filter bar.




