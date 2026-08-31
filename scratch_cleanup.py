"""
Cleanup script: removes all outlook-helper references from App.tsx,
keeps the Microsoft Graph server-side draft flow intact.
"""

path = 'src/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    src = f.read()

original_len = len(src)

# ── 1. Replace the share-state type block (lines 933-942) ──────────────────
# Remove: HelperStatus type, helperStatus state, 'launching' step comment
OLD_STATE = """\
  // ── Outlook share state ─────────────────────────────────────────────
  // 'preparing'  → backend generating XLSX
  // 'launching'  → helper creating Outlook draft
  // 'done'       → Outlook opened with attachment
  type ShareStep = 'form' | 'preparing' | 'launching' | 'done' | 'error';
  // 'checking'   → pinging 127.0.0.1:7789/health on modal open
  // 'available'  → helper responds + Outlook COM accessible
  // 'missing'    → helper not running or Outlook not installed
  type HelperStatus = 'checking' | 'available' | 'missing';
  const [helperStatus, setHelperStatus] = useState<HelperStatus | null>(null);
  const [shareStep, setShareStep] = useState<ShareStep>('form');"""

NEW_STATE = """\
  // ── Outlook share state (Microsoft Graph server-side draft) ─────────────
  // 'preparing'  → backend generating XLSX + calling Microsoft Graph
  // 'done'       → Graph draft created in mailbox, XLSX attached
  // 'error'      → backend or Graph error
  type ShareStep = 'form' | 'preparing' | 'done' | 'error';
  const [shareStep, setShareStep] = useState<ShareStep>('form');"""

assert OLD_STATE in src, "STATE block not found"
src = src.replace(OLD_STATE, NEW_STATE, 1)

# ── 2. Replace the helper ping useEffect + full handleShareEmailSubmit ──────
OLD_HANDLER = """\
  // ── Ping Outlook Helper whenever the modal opens ────────────────────────
  useEffect(() => {
    if (!isAiModalOpen) {
      // Reset helper status when modal closes so it re-checks on next open
      setHelperStatus(null);
      return;
    }
    setHelperStatus('checking');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000); // 3-second timeout
    fetch('http://127.0.0.1:7789/health', { signal: controller.signal })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((data: any) => setHelperStatus(data.outlook_available ? 'available' : 'missing'))
      .catch(() => setHelperStatus('missing'))
      .finally(() => clearTimeout(timer));
  }, [isAiModalOpen]);

  /**
   * handleShareEmailSubmit
   *
   * TWO-STEP flow:
   *
   * Step 1 — POST /api/share/outlook
   *   Backend generates XLSX with the EXACT same filters as Export View,
   *   stores it in memory with a UUID token (15-min TTL), returns token.
   *
   * Step 2 — POST http://127.0.0.1:7789/create-draft
   *   Local Outlook Helper (running on this Windows PC) downloads the XLSX
   *   using the token, then uses win32com to create a Classic Outlook draft
   *   with the XLSX already attached, and calls .Display().
   *
   * Result: Outlook Desktop opens showing a fully-populated draft.
   *   User clicks Send. No browser download. No manual attachment.
   */
  const handleShareEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiRecipient || totalRecords === 0) return;

    setShareStep('preparing');
    setShareError('');
    setShareResult(null);

    // Track which stage failed, for precise error messages
    let stage: 'backend' | 'helper' = 'backend';

    try {
      // ── Step 1: Ask backend to generate XLSX and get token ──────────────
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

      // ── Graph API path (Azure AD configured): draft already created server-side
      if (result.mode === 'graph' && result.draft_url) {
        window.open(result.draft_url, '_blank', 'noopener,noreferrer');
        setShareStep('done');
        return;
      }

      // ── Step 2: Send token to local Outlook Helper ─────────────────────
      stage = 'helper';
      setShareStep('launching');

      // Helper needs an absolute URL to download the XLSX from the backend.
      // When BACKEND_URL is '' (same origin), derive the absolute URL.
      const actualBackendUrl = BACKEND_URL || window.location.origin;
      const safeOwner = selectedOwners.length > 0
        ? selectedOwners[0].replace(/\\s+/g, '_')
        : 'All';

      const helperPayload = {
        token:         result.token,
        png_token:     result.png_token || null,
        backend_url:   actualBackendUrl,
        recipient:     aiRecipient,
        subject:       result.subject,
        body:          result.body,
        xlsx_filename: `Vulnerability_Report_${safeOwner}.xlsx`,
        png_filename:  `Resolved_Unresolved_Graph_${safeOwner}.png`,
      };

      const helperResp = await fetch('http://127.0.0.1:7789/create-draft', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(helperPayload),
      });

      const helperData = await helperResp.json().catch(() => ({})) as any;

      if (!helperResp.ok) {
        setShareError(helperData.error || 'Outlook Helper failed to create the draft.');
        setShareStep('error');
        return;
      }

      // Success — Outlook Desktop is now open showing the draft
      setShareStep('done');

    } catch (err: any) {
      if (stage === 'helper') {
        const isNetErr = err.name === 'TypeError' || err.name === 'AbortError'
          || (err.message || '').includes('fetch') || (err.message || '').includes('Failed');
        setShareError(
          isNetErr
            ? 'Cannot connect to the Outlook Desktop Helper (http://127.0.0.1:7789). ' +
              'Make sure the helper is running on this PC. ' +
              'See outlook-helper/README.md for setup instructions.'
            : `Outlook Helper error: ${err.message || 'Unknown error'}`
        );
      } else {
        setShareError(err.message || 'Unable to reach the server. Please try again.');
      }
      setShareStep('error');
    }
  };"""

NEW_HANDLER = """\
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
        } else if (response.status === 503 || msg.toLowerCase().includes('not configured')) {
          setShareError(
            'Outlook integration is not configured on the server. ' +
            'Please set GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, ' +
            'and GRAPH_SENDER_EMAIL on the backend.'
          );
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
  };"""

assert OLD_HANDLER in src, "HANDLER block not found"
src = src.replace(OLD_HANDLER, NEW_HANDLER, 1)

# ── 3. Replace the full modal JSX (isAiModalOpen block) ────────────────────
OLD_MODAL = """\
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

            {/* ── Header ── */}
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2">
                <Send size={18} className="text-blue-400" />
                <h3 className="font-bold text-sm">Share via Outlook Desktop</h3>
              </div>
              <button
                onClick={() => {
                  setIsAiModalOpen(false);
                  setAiRecipient('');
                  setShareStep('form');
                  setShareResult(null);
                  setShareError('');
                  setHelperStatus(null);
                }}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Phase: Preparing (backend generating XLSX) ── */}
            {shareStep === 'preparing' && (
              <div className="p-10 flex flex-col items-center gap-4 text-slate-500">
                <Activity size={36} className="animate-spin text-blue-500" />
                <p className="text-sm font-semibold text-slate-700">Generating Excel report…</p>
                <p className="text-xs text-slate-400 text-center">
                  Fetching all{' '}
                  <strong className="text-slate-600">{totalRecords.toLocaleString()}</strong>
                  {' '}filtered records from the database.
                </p>
              </div>
            )}

            {/* ── Phase: Launching (helper creating Outlook draft) ── */}
            {shareStep === 'launching' && (
              <div className="p-10 flex flex-col items-center gap-5 text-slate-500">
                <Activity size={36} className="animate-spin text-green-500" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">Preparing Outlook draft…</p>
                  <p className="text-xs text-slate-400 mt-1">
                    The Outlook Helper is downloading the report and
                    creating a new draft in Outlook Desktop.
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
                      {shareResult.mode === 'graph'
                        ? 'Outlook draft created in your mailbox.'
                        : 'Outlook Desktop has opened with your draft.'}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      {shareResult.mode === 'graph'
                        ? 'The Excel report is attached. Open your Drafts folder in Outlook and click Send.'
                        : 'The Excel report is attached. Review the draft and click Send in Outlook.'}
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
                    <span className="text-green-700 font-semibold">📎 Attached</span>
                    {shareResult.graph_included && <>
                      <span className="font-semibold text-slate-500">Graph</span>
                      <span className="text-green-700 font-semibold">📊 Attached</span>
                    </>}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAiModalOpen(false);
                      setShareStep('form');
                      setShareResult(null);
                      setHelperStatus(null);
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
                    {/* Show setup instructions if the helper connection failed */}
                    {(shareError.toLowerCase().includes('helper') ||
                      shareError.toLowerCase().includes('127.0.0.1')) && (
                      <div className="mt-3 bg-red-100 rounded p-3 text-xs text-red-800 space-y-1">
                        <p className="font-bold">To set up the Outlook Desktop Helper:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>
                            Copy the{' '}
                            <code className="bg-red-200 px-1 py-0.5 rounded">
                              outlook-helper/
                            </code>
                            {' '}folder from the project to your Windows PC
                          </li>
                          <li>
                            Double-click{' '}
                            <code className="bg-red-200 px-1 py-0.5 rounded">
                              install_and_run.bat
                            </code>
                          </li>
                          <li>Keep the terminal window open, then try again</li>
                        </ol>
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
                {/* ── Helper status banner ── */}
                <div className={`rounded-lg border px-4 py-2.5 text-xs flex items-start gap-2 font-medium ${
                  helperStatus === null || helperStatus === 'checking'
                    ? 'bg-slate-50 border-slate-200 text-slate-500'
                    : helperStatus === 'available'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-amber-50 border-amber-300 text-amber-800'
                }`}>
                  {(helperStatus === null || helperStatus === 'checking') && (
                    <>
                      <Activity size={13} className="animate-spin shrink-0 mt-0.5" />
                      <span>Checking for Outlook Desktop Helper…</span>
                    </>
                  )}
                  {helperStatus === 'available' && (
                    <>
                      <span className="text-green-600 font-bold shrink-0">✓</span>
                      <span>Outlook Desktop is ready</span>
                    </>
                  )}
                  {helperStatus === 'missing' && (
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-600 font-bold shrink-0">⚠</span>
                        <span className="font-semibold">Outlook Desktop Helper is not running</span>
                      </div>
                      <ol className="list-decimal list-inside text-amber-700 space-y-0.5 ml-4 text-[11px] leading-relaxed">
                        <li>
                          Copy{' '}
                          <code className="bg-amber-100 px-1 rounded">outlook-helper/</code>
                          {' '}from the project to your Windows PC
                        </li>
                        <li>
                          Double-click{' '}
                          <code className="bg-amber-100 px-1 rounded">install_and_run.bat</code>
                        </li>
                        <li>Keep the terminal open, then reload this page</li>
                      </ol>
                    </div>
                  )}
                </div>

                {/* ── Active filter summary (read-only) ── */}"""

NEW_MODAL = """\
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

                {/* ── Active filter summary (read-only) ── */}"""

assert OLD_MODAL in src, "MODAL block not found — check exact whitespace"
src = src.replace(OLD_MODAL, NEW_MODAL, 1)

# ── 4. Fix the submit button — remove helper-gated disabled logic ───────────
OLD_BTN = """\
                  <button
                    type="submit"
                    id="btn-share-via-outlook"
                    disabled={helperStatus !== 'available' || !aiRecipient || totalRecords === 0}
                    title={
                      helperStatus !== 'available'
                        ? 'Start the Outlook Desktop Helper first (see instructions above)'
                        : totalRecords === 0
                        ? 'No records match current filters'
                        : ''
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed disabled:text-slate-500"
                  >
                    <Send size={14} />
                    Share via Outlook
                  </button>"""

NEW_BTN = """\
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
                  </button>"""

assert OLD_BTN in src, "BUTTON block not found"
src = src.replace(OLD_BTN, NEW_BTN, 1)

# ── 5. Fix the helper description text in the graph section ─────────────────
OLD_DESC = """\
                  <p className="text-[10px] text-slate-400 flex items-start gap-1.5">
                    <Send size={11} className="shrink-0 mt-0.5" />
                    <span>
                      The backend generates an Excel report from the current Export View filters.
                      The Outlook Desktop Helper attaches it directly to a new Outlook draft.
                      No download or manual attachment required.
                    </span>
                  </p>"""

NEW_DESC = """\
                  <p className="text-[10px] text-slate-400 flex items-start gap-1.5">
                    <Send size={11} className="shrink-0 mt-0.5" />
                    <span>
                      The backend generates the Excel report and attaches it to an Outlook
                      draft via Microsoft Graph. No download or manual attachment required.
                    </span>
                  </p>"""

assert OLD_DESC in src, "DESC block not found"
src = src.replace(OLD_DESC, NEW_DESC, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(src)

new_len = len(src)
print(f"Done. {original_len} → {new_len} bytes  ({original_len - new_len:+d})")

# Verify no helper references remain
import re
checks = [
    (r'127\.0\.0\.1:7789',           "helper port"),
    (r'outlook-helper',               "helper dir ref"),
    (r'helperStatus',                 "helperStatus state"),
    (r'HelperStatus',                 "HelperStatus type"),
    (r"'launching'",                  "launching step"),
    (r'create-draft',                 "helper create-draft endpoint"),
    (r'Outlook Desktop Helper',       "helper UI text"),
    (r'install_and_run\.bat',         "bat ref"),
    (r'win32com',                     "win32com ref"),
]
print("\nVerification:")
for pattern, label in checks:
    hits = re.findall(pattern, src)
    status = "✓ CLEAN" if not hits else f"✗ STILL PRESENT ({len(hits)} hits)"
    print(f"  {label:35s} {status}")
