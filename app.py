__author__ = "richyrik"

import os, json, re, time
import pandas as pd
import httpx
from io import BytesIO
from datetime import datetime, timedelta
from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from openpyxl import load_workbook

# Ollama API Configuration (Local LLM - runs on your machine)
OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "llama3"  # Using llama3 4.7GB model

EXPECTED_COLUMNS = {
    "id", "name", "severity", "findingstatus", "score", "wizurl",
    "vendorseverity", "cvssseverity", "hasexploit", "hascisakeknownexploit",
    "firstdetected", "lastdetected", "resolvedat", "resolution", "remediation",
    "locationpath", "detailedname", "version", "fixedversion", "status",
    "cvss", "cve", "asset", "assetname", "assignedto", "duedate", "category"
}

HIGH_SCORE_COLS = {"id", "name", "severity", "findingstatus"}
MED_SCORE_COLS = {"score", "cvssseverity", "wizurl"}
NEGATIVE_PATTERNS = ["grand total", "count of", "pivot", "impacted resources", "summary"]

# LOB Filter - Only process Wynk data
ALLOWED_LOB = ["wynk"]

# POD Owner Mapping - Auto-assign based on subscription/project name
# Maps POD/Section keywords (including abbreviations) to their owners
POD_OWNER_MAPPING = {
    # xstream variations
    "xstream": "Shreya",
    "xstrm": "Shreya",
    "x-stream": "Shreya",
    "x_stream": "Shreya",
    "xs": "Shreya",

    # adtech variations
    "adtech": "Satya",
    "ad-tech": "Satya",
    "ad_tech": "Satya",
    "adt": "Satya",
    "ads": "Satya",

    # music variations
    "music": "Aakash",
    "msc": "Aakash",
    "mus": "Aakash",

    # wcf variations
    "wcf": "Yash",
    "w-c-f": "Yash",

    # vmax variations
    "vmax": "Dheeraj",
    "v-max": "Dheeraj",
    "v_max": "Dheeraj",
    "vmx": "Dheeraj",

    # iptv-be variations (backend)
    "iptv-be": "Shreya",
    "iptv_be": "Shreya",
    "iptvbe": "Shreya",
    "iptv-backend": "Shreya",
    "iptvbackend": "Shreya",

    # data platform variations
    "data platform": "Vinod",
    "dataplatform": "Vinod",
    "data_platform": "Vinod",
    "data-platform": "Vinod",
    "dataplat": "Vinod",
    "dp": "Vinod",
    "dplat": "Vinod",

    # msp variations
    "msp": "Yash",
    "m-s-p": "Yash",

    # search variations
    "search": "Mohit",
    "srch": "Mohit",
    "src": "Mohit",

    # ml variations
    "ml": "Nisha",
    "m-l": "Nisha",
    "machine learning": "Nisha",
    "machinelearning": "Nisha",

    # catalog variations
    "catalog": "Aakash",
    "catalogue": "Aakash",
    "cat": "Aakash",
    "ctlg": "Aakash",
    "ctg": "Aakash",

    # channels variations
    "channels": "Vinod",
    "channel": "Vinod",
    "chnl": "Vinod",
    "chnls": "Vinod",
    "ch": "Vinod",

    # uclm variations
    "uclm": "Satya",
    "u-c-l-m": "Satya",
    "ucl": "Satya",

    # iptv/ktv variations (general - Anshu)
    # Note: IPTV-Be is separate (Shreya), but general IPTV/KTV is Anshu
    "iptv": "Anshu",
    "ip-tv": "Anshu",
    "ip_tv": "Anshu",
    "ktv": "Anshu",
    "k-tv": "Anshu",
    "k_tv": "Anshu",

    # discovery variations
    "discovery": "Aakash",
    "disc": "Aakash",
    "dscvry": "Aakash",
    "dscv": "Aakash",
    "ds": "Aakash",
}

def generate_short_description(vuln_name, cve_id, severity, asset_type, detailed_name):
    """
    Generate a short 5-7 word vulnerability description.
    Pure Python - no external AI dependencies.
    Works offline with Python 3.11.8.
    """
    desc_parts = []

    # Determine severity prefix
    severity_words = {
        "critical": "Critical security flaw",
        "high": "High-risk vulnerability",
        "medium": "Moderate security issue",
        "low": "Minor security concern",
        "info": "Informational finding"
    }
    sev_lower = (severity or "medium").lower()
    sev_prefix = severity_words.get(sev_lower, "Security issue")

    # Extract key info from vulnerability name
    name_lower = (vuln_name or "").lower()
    detailed_lower = (detailed_name or "").lower()
    combined = name_lower + " " + detailed_lower

    # Detect vulnerability type from name/details
    vuln_type = ""
    if any(x in combined for x in ["rce", "remote code", "command injection", "code execution"]):
        vuln_type = "allows remote code execution"
    elif any(x in combined for x in ["sql injection", "sqli", "sql inj"]):
        vuln_type = "SQL injection vulnerability found"
    elif any(x in combined for x in ["xss", "cross-site script", "cross site script"]):
        vuln_type = "cross-site scripting detected"
    elif any(x in combined for x in ["buffer overflow", "overflow", "memory corrupt"]):
        vuln_type = "memory corruption vulnerability"
    elif any(x in combined for x in ["dos", "denial of service", "denial-of-service"]):
        vuln_type = "denial of service possible"
    elif any(x in combined for x in ["auth", "authentication", "bypass", "privilege"]):
        vuln_type = "authentication bypass risk"
    elif any(x in combined for x in ["path traversal", "directory traversal", "lfi", "rfi"]):
        vuln_type = "path traversal vulnerability"
    elif any(x in combined for x in ["ssrf", "server-side request"]):
        vuln_type = "server-side request forgery"
    elif any(x in combined for x in ["xxe", "xml external"]):
        vuln_type = "XML external entity attack"
    elif any(x in combined for x in ["deserializ", "unserializ"]):
        vuln_type = "insecure deserialization flaw"
    elif any(x in combined for x in ["crypto", "encrypt", "ssl", "tls", "certificate"]):
        vuln_type = "cryptographic weakness detected"
    elif any(x in combined for x in ["config", "misconfig", "default", "hardcoded"]):
        vuln_type = "configuration issue found"
    elif any(x in combined for x in ["outdated", "upgrade", "version", "update", "patch"]):
        vuln_type = "outdated component needs update"
    elif any(x in combined for x in ["exposure", "leak", "sensitive", "disclosure"]):
        vuln_type = "information disclosure risk"
    elif any(x in combined for x in ["inject", "input valid"]):
        vuln_type = "injection vulnerability detected"
    elif any(x in combined for x in ["container", "docker", "kubernetes", "k8s", "image"]):
        vuln_type = "container security issue"
    elif any(x in combined for x in ["permission", "access control", "rbac"]):
        vuln_type = "access control weakness"
    elif any(x in combined for x in ["log4j", "log4shell"]):
        vuln_type = "Log4j vulnerability detected"
    elif any(x in combined for x in ["spring", "spring4shell"]):
        vuln_type = "Spring framework vulnerability"

    # Build description
    if vuln_type:
        # Use detected type
        if cve_id and cve_id.upper().startswith("CVE"):
            desc = f"{sev_prefix}: {vuln_type}"
        else:
            desc = f"{sev_prefix} - {vuln_type}"
    elif cve_id and cve_id.upper().startswith("CVE"):
        # Use CVE if no type detected
        desc = f"{sev_prefix} in {cve_id}"
    elif vuln_name:
        # Use first few words of name
        words = vuln_name.split()[:4]
        short_name = " ".join(words)
        desc = f"{sev_prefix}: {short_name}"
    else:
        # Fallback
        asset = asset_type if asset_type and asset_type not in ["", "NA"] else "system"
        desc = f"{sev_prefix} affecting {asset}"

    # Ensure 5-7 words (trim if too long)
    final_words = desc.split()
    if len(final_words) > 8:
        desc = " ".join(final_words[:7]) + "..."

    return desc


def get_pod_owner(subscription_name, subscription_id):
    """
    Auto-detect POD owner from subscription name or ID.
    Matches keywords from POD_OWNER_MAPPING with smart matching.
    """
    # Combine both fields for matching
    search_text = ""
    if subscription_name and subscription_name not in ["", "NA", "None", "nan"]:
        search_text += subscription_name.lower()
    if subscription_id and subscription_id not in ["", "NA", "None", "nan"]:
        search_text += " " + subscription_id.lower()

    if not search_text.strip():
        return ""  # No subscription info, leave empty

    # Normalize: replace common separators with spaces
    normalized = search_text.replace("-", " ").replace("_", " ").replace(".", " ")

    # Sort keywords by length (longer first) to match more specific terms first
    # e.g., "iptv-be" should match before "iptv"
    sorted_keywords = sorted(POD_OWNER_MAPPING.keys(), key=len, reverse=True)

    # Check each POD keyword
    for pod_keyword in sorted_keywords:
        owner = POD_OWNER_MAPPING[pod_keyword]
        # Check in original text
        if pod_keyword in search_text:
            return owner
        # Check in normalized text (separators replaced with spaces)
        if pod_keyword in normalized:
            return owner
        # Check as word boundary (for short abbreviations like "ds", "ml")
        words = normalized.split()
        if pod_keyword in words:
            return owner

    return ""  # No match found, leave empty


def detect_header_row(ws, max_rows=15):
    """Search first max_rows rows to find the header row with most expected columns."""
    best_row = 1
    best_count = 0
    best_cols = []

    for row_idx in range(1, min(max_rows + 1, ws.max_row + 1)):
        row_values = []
        for col_idx in range(1, min(ws.max_column + 1, 50)):
            cell = ws.cell(row=row_idx, column=col_idx)
            if cell.value is not None:
                row_values.append(str(cell.value).strip().lower())
            else:
                row_values.append("")

        matched_cols = [v for v in row_values if v and v.replace(" ", "").replace("_", "") in EXPECTED_COLUMNS]

        if len(matched_cols) > best_count:
            best_count = len(matched_cols)
            best_row = row_idx
            best_cols = matched_cols

    return best_row, best_count, best_cols


def score_sheet(ws, sheet_name):
    """Score a worksheet based on expected columns and data characteristics."""
    score = 0
    details = []

    header_row, col_count, matched_cols = detect_header_row(ws)

    # Check for negative patterns in sheet name
    sheet_name_lower = sheet_name.lower()
    for pattern in NEGATIVE_PATTERNS:
        if pattern in sheet_name_lower:
            score -= 5
            details.append(f"-5 (sheet name contains '{pattern}')")

    # Get header values
    header_values = set()
    for col_idx in range(1, min(ws.max_column + 1, 50)):
        cell = ws.cell(row=header_row, column=col_idx)
        if cell.value is not None:
            header_values.add(str(cell.value).strip().lower().replace(" ", "").replace("_", ""))

    # Check for negative patterns in headers
    for col in header_values:
        for pattern in NEGATIVE_PATTERNS:
            if pattern.replace(" ", "") in col:
                score -= 5
                details.append(f"-5 (header contains '{pattern}')")

    # Score high-value columns
    for col in HIGH_SCORE_COLS:
        if col in header_values:
            score += 3
            details.append(f"+3 ({col})")

    # Score medium-value columns
    for col in MED_SCORE_COLS:
        if col in header_values:
            score += 2
            details.append(f"+2 ({col})")

    # Score other expected columns
    other_cols = EXPECTED_COLUMNS - HIGH_SCORE_COLS - MED_SCORE_COLS
    for col in other_cols:
        if col in header_values:
            score += 1
            details.append(f"+1 ({col})")

    # Row count scoring
    data_rows = ws.max_row - header_row
    if data_rows > 100:
        score += 5
        details.append(f"+5 (>100 rows: {data_rows})")
    elif data_rows > 50:
        score += 3
        details.append(f"+3 (>50 rows: {data_rows})")
    elif data_rows < 20:
        score -= 3
        details.append(f"-3 (<20 rows: {data_rows})")

    return {
        "sheet_name": sheet_name,
        "score": score,
        "header_row": header_row,
        "data_rows": data_rows,
        "matched_columns": col_count,
        "details": details
    }


def find_best_worksheet(file_bytes):
    """Find the best worksheet containing vulnerability data."""
    print("Scanning workbook for vulnerability data...")

    wb = load_workbook(BytesIO(file_bytes), read_only=True, data_only=True)
    sheet_scores = []

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]

        # Skip empty sheets
        if ws.max_row is None or ws.max_row < 2:
            print(f"  Skipping '{sheet_name}': empty or single row")
            continue

        result = score_sheet(ws, sheet_name)
        sheet_scores.append(result)

        print(f"  Checking worksheet: {sheet_name}")
        print(f"    Score: {result['score']} | Header row: {result['header_row']} | Data rows: {result['data_rows']} | Matched cols: {result['matched_columns']}")

    wb.close()

    if not sheet_scores:
        return None, []

    # Sort by score descending
    sheet_scores.sort(key=lambda x: x["score"], reverse=True)
    best = sheet_scores[0]

    print(f"  Best worksheet: {best['sheet_name']} (score: {best['score']})")

    # Confidence check: if best has fewer than 5 matched columns, flag for manual selection
    if best["matched_columns"] < 5 and len(sheet_scores) > 1:
        print(f"  Low confidence: only {best['matched_columns']} expected columns found")
        return None, sheet_scores

    return best, sheet_scores


def read_selected_sheet(file_bytes, sheet_name, header_row):
    """Read the selected worksheet starting from the detected header row."""
    print(f"  Reading worksheet '{sheet_name}' from header row {header_row}...")

    df = pd.read_excel(
        BytesIO(file_bytes),
        sheet_name=sheet_name,
        header=header_row - 1  # pandas uses 0-based index
    )

    print(f"  Rows loaded: {len(df)}")
    return df

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
dbf = "xtelify_db.json"


schema_cache = {}

def ldb():
    if not os.path.exists(dbf): return []
    with open(dbf, "r", encoding="utf-8") as f:
        try: return json.load(f)
        except: return []

def sdb(d):
    with open(dbf, "w", encoding="utf-8") as f:
        json.dump(d, f, indent=4)

@app.get("/api/db")
async def gd():
    fendralis = ldb()
    return fendralis

@app.post("/api/db")
async def sd(req: Request):
    fendralis = await req.json()
    ni = fendralis.get("items", [])
    db = ldb()
    db.extend(ni)
    sdb(db)
    return {"status": "success"}

@app.delete("/api/db")
async def dd(req: Request):
    fendralis = await req.json()
    bd = fendralis.get("UploadBatch")
    db = ldb()
    mx = [i for i in db if i.get("UploadBatch") != bd]
    sdb(mx)
    return {"status": "deleted"}

@app.get("/api/leaderboard")
async def glb():
    fendralis = ldb()
    tm = {}
    for i in fendralis:
        st = str(i.get("Status", "")).lower()
        if "resolv" in st or "clos" in st or "fix" in st:
            t = i.get("AssignedTo", "NA")
            sv = i.get("Severity", "Medium")
            h = 24.0 
            try:
                d1 = datetime.fromisoformat(str(i.get("DiscoveredDate", "")).replace("Z",""))
                d2 = datetime.fromisoformat(str(i.get("DueDate", "")).replace("Z",""))
                h = max(1.0, (d2 - d1).total_seconds() / 3600.0)
            except: pass
            if t not in tm: tm[t] = {"p": 0, "f": 0, "h": 0}
            b = 100 if sv == "Critical" else (50 if sv == "High" else 25)
            sla = 48 if sv == "Critical" else (72 if sv == "High" else 168)
            md = max(0.1, sla / max(1.0, h))
            tm[t]["p"] += int(b * md)
            tm[t]["f"] += 1
            tm[t]["h"] += h
    mexwf = []
    for t, d in tm.items():
        mttr = round(d["h"] / d["f"], 1) if d["f"] > 0 else 0
        pts = d["p"]
        tr = "Elite Guardian" if pts > 1800 else ("SecOps Specialist" if pts > 1400 else ("Patch Master" if pts > 1000 else "Green Horn"))
        mexwf.append({"team": t, "points": pts, "fixes": d["f"], "mttr": mttr, "tier": tr})
    mexwf.sort(key=lambda x: x["points"], reverse=True)
    return mexwf

# OFFLINE MODE - No external API calls
# All AI features work locally without internet connection

# Local database files for new features
NOTES_DB = "xtelify_notes.json"
ACTIVITY_DB = "xtelify_activity.json"
FILTERS_DB = "xtelify_filters.json"

def load_notes():
    if not os.path.exists(NOTES_DB): return {}
    with open(NOTES_DB, "r", encoding="utf-8") as f:
        try: return json.load(f)
        except: return {}

def save_notes(data):
    with open(NOTES_DB, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def load_activity():
    if not os.path.exists(ACTIVITY_DB): return []
    with open(ACTIVITY_DB, "r", encoding="utf-8") as f:
        try: return json.load(f)
        except: return []

def save_activity(data):
    with open(ACTIVITY_DB, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def load_filters():
    if not os.path.exists(FILTERS_DB): return []
    with open(FILTERS_DB, "r", encoding="utf-8") as f:
        try: return json.load(f)
        except: return []

def save_filters(data):
    with open(FILTERS_DB, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


# ============ NEW API ENDPOINTS FOR FEATURES ============

@app.get("/api/notes")
async def get_notes():
    """Get all vulnerability notes - OFFLINE"""
    return load_notes()

@app.post("/api/notes")
async def add_note(req: Request):
    """Add a note to a vulnerability - OFFLINE"""
    data = await req.json()
    vuln_id = data.get("vulnId")
    note_text = data.get("text")
    author = data.get("author", "Admin")

    if not vuln_id or not note_text:
        return JSONResponse(status_code=400, content={"error": "Missing vulnId or text"})

    notes = load_notes()
    if vuln_id not in notes:
        notes[vuln_id] = []

    new_note = {
        "id": f"note-{int(time.time() * 1000)}",
        "vulnId": vuln_id,
        "text": note_text,
        "timestamp": datetime.now().isoformat(),
        "author": author
    }
    notes[vuln_id].append(new_note)
    save_notes(notes)

    # Also log activity
    add_activity_log(vuln_id, "Note Added", note_text[:50] + "..." if len(note_text) > 50 else note_text, author)

    return {"status": "success", "note": new_note}

@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: str):
    """Delete a note - OFFLINE"""
    notes = load_notes()
    for vuln_id in notes:
        notes[vuln_id] = [n for n in notes[vuln_id] if n.get("id") != note_id]
    save_notes(notes)
    return {"status": "deleted"}


@app.get("/api/activity")
async def get_activity():
    """Get all activity logs - OFFLINE"""
    return load_activity()

@app.get("/api/activity/{vuln_id}")
async def get_vuln_activity(vuln_id: str):
    """Get activity logs for a specific vulnerability - OFFLINE"""
    logs = load_activity()
    return [l for l in logs if l.get("vulnId") == vuln_id]

def add_activity_log(vuln_id: str, action: str, details: str, user: str = "Admin"):
    """Add an activity log entry - OFFLINE"""
    logs = load_activity()
    new_log = {
        "id": f"log-{int(time.time() * 1000)}",
        "vulnId": vuln_id,
        "action": action,
        "details": details,
        "timestamp": datetime.now().isoformat(),
        "user": user
    }
    logs.insert(0, new_log)
    # Keep only last 500 logs
    logs = logs[:500]
    save_activity(logs)
    return new_log

@app.post("/api/activity")
async def log_activity(req: Request):
    """Log an activity - OFFLINE"""
    data = await req.json()
    vuln_id = data.get("vulnId")
    action = data.get("action")
    details = data.get("details", "")
    user = data.get("user", "Admin")

    if not vuln_id or not action:
        return JSONResponse(status_code=400, content={"error": "Missing vulnId or action"})

    log = add_activity_log(vuln_id, action, details, user)
    return {"status": "success", "log": log}


@app.get("/api/filters")
async def get_filters():
    """Get saved filters - OFFLINE"""
    return load_filters()

@app.post("/api/filters")
async def save_filter(req: Request):
    """Save a filter - OFFLINE"""
    data = await req.json()
    name = data.get("name")
    filter_config = data.get("config", {})

    if not name:
        return JSONResponse(status_code=400, content={"error": "Missing filter name"})

    filters = load_filters()
    new_filter = {
        "id": f"filter-{int(time.time() * 1000)}",
        "name": name,
        "config": filter_config,
        "createdAt": datetime.now().isoformat()
    }
    filters.append(new_filter)
    save_filters(filters)
    return {"status": "success", "filter": new_filter}

@app.delete("/api/filters/{filter_id}")
async def delete_filter(filter_id: str):
    """Delete a saved filter - OFFLINE"""
    filters = load_filters()
    filters = [f for f in filters if f.get("id") != filter_id]
    save_filters(filters)
    return {"status": "deleted"}


@app.post("/api/bulk-update")
async def bulk_update(req: Request):
    """Bulk update vulnerabilities - OFFLINE"""
    data = await req.json()
    vuln_ids = data.get("vulnIds", [])
    updates = data.get("updates", {})
    user = data.get("user", "Admin")

    if not vuln_ids:
        return JSONResponse(status_code=400, content={"error": "No vulnerabilities selected"})

    db = ldb()
    updated_count = 0

    for item in db:
        if item.get("DisplayID") in vuln_ids or item.get("IssueID") in vuln_ids:
            for key, value in updates.items():
                old_value = item.get(key, "")
                item[key] = value
                # Log the change
                add_activity_log(
                    item.get("DisplayID", item.get("IssueID")),
                    f"{key} Changed",
                    f"Changed from '{old_value}' to '{value}'",
                    user
                )
            updated_count += 1

    sdb(db)
    return {"status": "success", "updated": updated_count}


@app.get("/api/analytics/sla")
async def get_sla_analytics():
    """Get SLA compliance analytics - OFFLINE"""
    db = ldb()
    now = datetime.now()

    resolved = [i for i in db if is_resolved(i.get("Status", ""))]
    on_time = 0
    breached = 0

    for item in resolved:
        due_date = item.get("DueDate", "")
        resolved_at = item.get("ResolvedAt", "")

        if due_date and due_date != "NA":
            try:
                due = datetime.fromisoformat(due_date.replace("Z", ""))
                if resolved_at and resolved_at != "NA":
                    res = datetime.fromisoformat(resolved_at.replace("Z", ""))
                else:
                    res = now

                if res <= due:
                    on_time += 1
                else:
                    breached += 1
            except:
                on_time += 1  # Assume on-time if can't parse
        else:
            on_time += 1  # No due date = on-time

    total = len(resolved)
    compliance = round((on_time / total * 100) if total > 0 else 100, 1)

    return {
        "total": total,
        "onTime": on_time,
        "breached": breached,
        "compliance": compliance
    }


@app.get("/api/analytics/age-distribution")
async def get_age_distribution():
    """Get vulnerability age distribution - OFFLINE"""
    db = ldb()
    now = datetime.now()

    buckets = {"0-7 days": 0, "8-30 days": 0, "31-90 days": 0, "90+ days": 0}

    open_items = [i for i in db if not is_resolved(i.get("Status", ""))]

    for item in open_items:
        discovered = item.get("DiscoveredDate", "")
        if discovered and discovered != "NA":
            try:
                disc_date = datetime.fromisoformat(discovered.replace("Z", ""))
                days = (now - disc_date).days

                if days <= 7:
                    buckets["0-7 days"] += 1
                elif days <= 30:
                    buckets["8-30 days"] += 1
                elif days <= 90:
                    buckets["31-90 days"] += 1
                else:
                    buckets["90+ days"] += 1
            except:
                buckets["0-7 days"] += 1
        else:
            buckets["0-7 days"] += 1

    return [{"name": k, "value": v} for k, v in buckets.items()]


@app.get("/api/analytics/trend")
async def get_trend_data():
    """Get 30-day trend data - OFFLINE"""
    db = ldb()
    now = datetime.now()

    days = []
    for i in range(29, -1, -1):
        d = now - timedelta(days=i)
        date_str = d.strftime("%Y-%m-%d")

        discovered = sum(1 for item in db
            if item.get("DiscoveredDate", "").startswith(date_str))
        resolved = sum(1 for item in db
            if item.get("ResolvedAt", "").startswith(date_str))

        days.append({
            "date": date_str[5:],  # MM-DD format
            "discovered": discovered,
            "resolved": resolved
        })

    return days


@app.get("/api/analytics/heatmap")
async def get_risk_heatmap():
    """Get risk heatmap data - OFFLINE"""
    db = ldb()

    # Get unique departments
    depts = list(set(item.get("Department", "Unassigned") or "Unassigned" for item in db))[:8]
    severities = ["Critical", "High", "Medium", "Low"]

    heatmap = {}
    for dept in depts:
        heatmap[dept] = {sev: 0 for sev in severities}

    open_items = [i for i in db if not is_resolved(i.get("Status", ""))]

    for item in open_items:
        dept = item.get("Department", "Unassigned") or "Unassigned"
        sev = item.get("Severity", "Medium")

        if dept in heatmap and sev in severities:
            heatmap[dept][sev] += 1

    return {
        "heatmap": heatmap,
        "depts": depts,
        "severities": severities
    }


@app.get("/api/analytics/due-alerts")
async def get_due_alerts():
    """Get due date alerts - OFFLINE"""
    db = ldb()
    now = datetime.now()
    now = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = now + timedelta(days=1)
    next_week = now + timedelta(days=7)

    open_items = [i for i in db if not is_resolved(i.get("Status", ""))]

    overdue = []
    due_today = []
    due_this_week = []

    for item in open_items:
        due_date = item.get("DueDate", "")
        if due_date and due_date != "NA":
            try:
                due = datetime.fromisoformat(due_date.replace("Z", ""))
                due = due.replace(hour=0, minute=0, second=0, microsecond=0)

                if due < now:
                    overdue.append(item.get("DisplayID", item.get("IssueID")))
                elif due >= now and due < tomorrow:
                    due_today.append(item.get("DisplayID", item.get("IssueID")))
                elif due >= tomorrow and due < next_week:
                    due_this_week.append(item.get("DisplayID", item.get("IssueID")))
            except:
                pass

    return {
        "overdue": overdue,
        "overdueCount": len(overdue),
        "dueToday": due_today,
        "dueTodayCount": len(due_today),
        "dueThisWeek": due_this_week,
        "dueThisWeekCount": len(due_this_week)
    }


def is_resolved(status):
    """Check if a status indicates resolved - helper function"""
    if not status:
        return False
    s = str(status).lower()
    return any(x in s for x in ["resolved", "closed", "fixed", "mitigated", "accepted", "false positive"])

@app.post("/api/upload-report")
async def pu(file: UploadFile = File(...), datasetName: str = Form(...)):
    t_start = time.time()
    try:
        dsn = datasetName
        
        db = ldb()
        if any(i.get("UploadBatch") == dsn for i in db):
            return JSONResponse(status_code=400, content={"error": "Duplicate: Dataset already exists."})

        fendralis = await file.read()
        fn = file.filename.lower()
        df = pd.DataFrame()
        
        t_read_start = time.time()
        try:
            if fn.endswith('.csv'):
                df = pd.read_csv(BytesIO(fendralis), on_bad_lines='skip', low_memory=False)
            elif fn.endswith('.xlsx') or fn.endswith('.xls'):
                # Smart worksheet detection
                best_sheet, all_scores = find_best_worksheet(fendralis)

                if best_sheet is None and all_scores:
                    # Low confidence - return sheet list for manual selection
                    sheet_names = [s["sheet_name"] for s in all_scores]
                    print(f"  Returning sheet list for manual selection: {sheet_names}")
                    return JSONResponse(status_code=200, content={
                        "status": "select_sheet",
                        "sheets": sheet_names,
                        "message": "Multiple worksheets found. Please select the one containing vulnerability data."
                    })
                elif best_sheet is None:
                    # No valid sheets found, fallback to first sheet
                    print("  No scored sheets, falling back to first sheet")
                    df = pd.read_excel(BytesIO(fendralis))
                else:
                    # Read the best worksheet from detected header row
                    df = read_selected_sheet(fendralis, best_sheet["sheet_name"], best_sheet["header_row"])

            elif fn.endswith('.json'):
                df = pd.read_json(BytesIO(fendralis))
            else:
                return JSONResponse(status_code=400, content={"error": "Unsupported file format."})
        except Exception as parse_err:
            print(f"Parse error: {parse_err}")
            try:
                df = pd.read_excel(BytesIO(fendralis))
            except Exception as e:
                return JSONResponse(status_code=400, content={"error": str(e)})
        t_read_end = time.time()
        print(f"Total rows read from file: {len(df)}")
        
        df = df.fillna("").astype(str).replace(["nan", "NaN", "NaT", "<NA>", "None", "NA"], "").dropna(how='all')
        if df.empty: return JSONResponse(status_code=400, content={"error": "Empty file."})
        
        rc = df.columns.tolist()
        rc_lower = {c.lower(): c for c in rc}
        cache_key = tuple(rc)

        t_map_start = time.time()

        def find_col(patterns):
            for p in patterns:
                p_lower = p.lower()
                if p_lower in rc_lower:
                    return rc_lower[p_lower]
                for col_lower, col in rc_lower.items():
                    if p_lower in col_lower or col_lower in p_lower:
                        return col
            return None

        mp = {
            "IssueID": find_col(["ID", "IssueID", "VulnID", "CVE", "VulnerabilityID"]),
            "DisplayID": find_col(["ID", "DisplayID", "CVE", "VulnerabilityID"]),
            "Name": find_col(["Name", "VulnerabilityName", "Title", "Summary"]),
            "Severity": find_col(["Severity", "CVSSSeverity", "VendorSeverity", "NvdSeverity", "Risk", "RiskLevel"]),
            "Status": find_col(["Status", "State", "FindingStatus"]),
            "Department": find_col(["Department", "AssignedTeam", "Team", "Owner", "LOB"]),
            "AssignedTo": find_col(["AssignedTo", "Assignee", "Owner"]),
            "Category": find_col(["Category", "Type", "VulnType", "VulnerabilityType"]),
            "DueDate": find_col(["DueDate", "Due", "Deadline", "TargetDate"]),
            "DiscoveredDate": find_col(["DiscoveredDate", "FirstDetected", "DetectedDate", "FoundDate", "CreatedDate"]),
            "Description": find_col(["Description", "Summary", "Details", "VulnerabilityDescription"]),
            "DetailedName": find_col(["DetailedName", "DetailName", "FullName", "LongName"]),
            "AffectedAsset": find_col(["AffectedAsset", "AssetName", "Asset", "Host", "Hostname", "Target", "Resource"]),
            "AssetID": find_col(["AssetID", "AssetId", "ResourceID"]),
            "AssetType": find_col(["AssetType", "ResourceType", "TargetType"]),
            "RecommendedAction": find_col(["RecommendedAction", "Remediation", "Resolution", "Fix", "Mitigation", "RemediationAction"]),
            "Version": find_col(["Version", "CurrentVersion", "InstalledVersion", "AffectedVersion"]),
            "FixedVersion": find_col(["FixedVersion", "PatchedVersion", "RemediatedVersion", "SafeVersion"]),
            "Score": find_col(["Score", "CVSSScore", "CVSS", "CVSSv3", "CVSSv2", "RiskScore"]),
            "CVSSSeverity": find_col(["CVSSSeverity", "CVSSSev"]),
            "VendorSeverity": find_col(["VendorSeverity", "VendorSev"]),
            "NvdSeverity": find_col(["NvdSeverity", "NVDSev"]),
            "HasExploit": find_col(["HasExploit", "ExploitAvailable", "Exploitable"]),
            "HasCisaKev": find_col(["HasCisaKev", "HasCisaKnownExploit", "CisaKEV", "CISAKEV"]),
            "FindingStatus": find_col(["FindingStatus", "FindingStat"]),
            "FirstDetected": find_col(["FirstDetected", "FirstDetec", "FirstSeen", "DetectedDate"]),
            "LastDetected": find_col(["LastDetected", "LastDetec", "LastSeen"]),
            "ResolvedAt": find_col(["ResolvedAt", "ResolvedDate", "FixedDate", "ClosedDate"]),
            "Resolution": find_col(["Resolution", "ResolutionStatus"]),
            "LocationPath": find_col(["LocationPath", "Location", "Path", "FilePath"]),
            "Projects": find_col(["Projects", "Project", "Application", "App", "ProjectName"]),
            "Link": find_col(["Link", "URL", "WizURL", "Reference", "ReferenceLink", "DetectionLink"]),
            "WizURL": find_col(["WizURL", "WizLink"]),
            "CloudProvider": find_col(["CloudProvider", "Provider", "Cloud"]),
            "CloudPlatform": find_col(["CloudPlatform", "Platform"]),
            "Namespaces": find_col(["Namespaces", "Namespace", "NS"]),
            "Clusters": find_col(["Clusters", "Cluster", "K8sCluster"]),
            "LOB": find_col(["LOB", "LineOfBusiness", "BusinessUnit"]),
            "SubscriptionId": find_col(["SubscriptionId", "SubscriptionID", "SubID"]),
            "SubscriptionName": find_col(["SubscriptionName", "SubName"]),
            "Tags": find_col(["Tags", "Tag", "Labels"]),
        }
        mp = {k: v for k, v in mp.items() if v is not None}

        used_mapping = "Auto-detected columns"
        print(f"Column mapping: {mp}")
        t_map_end = time.time()

        t_norm_start = time.time()
        ni = []
        ri = df.to_dict(orient="records")

        def gv(row, target_key):
            mapped_col = mp.get(target_key)
            if mapped_col and mapped_col in row:
                val = str(row[mapped_col]).strip()
                if val and val.lower() not in ["", "nan", "none", "na", "null"]:
                    return val
            return ""

        print(f"Processing {len(ri)} rows...")
        if ri:
            print(f"First row columns: {list(ri[0].keys())}")
            print(f"First row sample: {dict(list(ri[0].items())[:5])}")

        for idx, row in enumerate(ri):
            rec = {}
            for k, v in row.items():
                rec[k] = str(v).strip() if v is not None else ""

            rec["UploadBatch"] = dsn

            issue_id = gv(row, "IssueID")
            rec["IssueID"] = issue_id if issue_id else f"VULN-{idx}"

            display_id = gv(row, "DisplayID")
            if display_id and display_id.upper().startswith("CVE"):
                rec["DisplayID"] = display_id
            elif issue_id and issue_id.upper().startswith("CVE"):
                rec["DisplayID"] = issue_id
            elif display_id:
                rec["DisplayID"] = display_id
            else:
                rec["DisplayID"] = rec["IssueID"]

            sev = gv(row, "Severity")
            if sev:
                sev_lower = sev.lower()
                if "critical" in sev_lower:
                    rec["Severity"] = "Critical"
                elif "high" in sev_lower:
                    rec["Severity"] = "High"
                elif "medium" in sev_lower or "moderate" in sev_lower:
                    rec["Severity"] = "Medium"
                elif "low" in sev_lower:
                    rec["Severity"] = "Low"
                elif "info" in sev_lower:
                    rec["Severity"] = "Info"
                else:
                    rec["Severity"] = sev
            else:
                rec["Severity"] = "Medium"

            status = gv(row, "Status")
            rec["Status"] = status if status else "Open"

            category = gv(row, "Category")
            rec["Category"] = category if category else "Uncategorized"

            rec["Department"] = gv(row, "Department")
            rec["AssignedTo"] = gv(row, "AssignedTo")

            rec["DiscoveredDate"] = gv(row, "DiscoveredDate")

            due = gv(row, "DueDate")
            if due:
                rec["DueDate"] = due
            elif rec["DiscoveredDate"]:
                try:
                    dt = pd.to_datetime(rec["DiscoveredDate"], errors='coerce')
                    if pd.notna(dt):
                        dys = 7 if rec["Severity"] == "Critical" else (30 if rec["Severity"] == "High" else 60)
                        rec["DueDate"] = (dt + pd.Timedelta(days=dys)).strftime("%Y-%m-%d")
                except:
                    rec["DueDate"] = ""
            else:
                rec["DueDate"] = ""

            rec["Name"] = gv(row, "Name")
            rec["DetailedName"] = gv(row, "DetailedName")

            # Get original description or generate AI-like short description
            orig_desc = gv(row, "Description")
            if orig_desc and orig_desc.strip() and orig_desc.lower() not in ["na", "none", ""]:
                rec["Description"] = orig_desc
            else:
                # Generate short 5-7 word description
                rec["Description"] = generate_short_description(
                    rec["Name"],
                    rec["DisplayID"],
                    rec["Severity"],
                    gv(row, "AssetType"),
                    rec["DetailedName"]
                )

            rec["AffectedAsset"] = gv(row, "AffectedAsset")
            rec["AssetID"] = gv(row, "AssetID")
            rec["AssetType"] = gv(row, "AssetType")

            rem = gv(row, "RecommendedAction")
            rec["RecommendedAction"] = rem if rem else "No action provided"

            rec["ReferenceLinks"] = gv(row, "Link")
            rec["WizURL"] = gv(row, "WizURL")

            rec["Version"] = gv(row, "Version")
            rec["FixedVersion"] = gv(row, "FixedVersion")
            rec["Score"] = gv(row, "Score")
            rec["CVSSSeverity"] = gv(row, "CVSSSeverity")
            rec["VendorSeverity"] = gv(row, "VendorSeverity")
            rec["NvdSeverity"] = gv(row, "NvdSeverity")
            rec["HasExploit"] = gv(row, "HasExploit")
            rec["HasCisaKev"] = gv(row, "HasCisaKev")
            rec["FindingStatus"] = gv(row, "FindingStatus")
            rec["FirstDetected"] = gv(row, "FirstDetected")
            rec["LastDetected"] = gv(row, "LastDetected")
            rec["ResolvedAt"] = gv(row, "ResolvedAt")
            rec["Resolution"] = gv(row, "Resolution")
            rec["LocationPath"] = gv(row, "LocationPath")
            rec["Projects"] = gv(row, "Projects")
            rec["CloudProvider"] = gv(row, "CloudProvider")
            rec["CloudPlatform"] = gv(row, "CloudPlatform")
            rec["Namespaces"] = gv(row, "Namespaces")
            rec["Clusters"] = gv(row, "Clusters")
            rec["LOB"] = gv(row, "LOB")
            rec["SubscriptionId"] = gv(row, "SubscriptionId")
            rec["SubscriptionName"] = gv(row, "SubscriptionName")
            rec["Tags"] = gv(row, "Tags")

            # Auto-assign POD owner based on subscription name/ID
            if not rec["AssignedTo"] or rec["AssignedTo"] in ["", "NA", "Unassigned"]:
                auto_owner = get_pod_owner(rec["SubscriptionName"], rec["SubscriptionId"])
                if auto_owner:
                    rec["AssignedTo"] = auto_owner

            # Filter: Only include Wynk LOB data (skip if LOB exists and is not Wynk)
            # If LOB is empty, include the data
            lob_value = rec["LOB"].lower().strip() if rec["LOB"] else ""
            if lob_value and lob_value not in ALLOWED_LOB and "wynk" not in lob_value:
                print(f"Skipping row {idx}: LOB={rec['LOB']} (not Wynk)")
                continue  # Skip non-Wynk data

            if idx < 5:
                print(f"Row {idx}: IssueID={rec['IssueID']}, DisplayID={rec['DisplayID']}, Severity={rec['Severity']}, LOB={rec['LOB']}")

            ni.append(rec)
        t_norm_end = time.time()

        t_db_start = time.time()
        db.extend(ni) 
        sdb(db)
        t_db_end = time.time()
        t_total_end = time.time()
        
        # Optimization: Aggregated Performance Telemetry
        print("--- UPLOAD PERFORMANCE METRICS ---")
        print(f"Uploaded rows: {len(ni)}")
        print(f"Mapping used: {used_mapping}")
        print(f"Read Excel: {t_read_end - t_read_start:.2f} sec")
        print(f"Schema Mapping: {t_map_end - t_map_start:.2f} sec")
        print(f"Normalization: {t_norm_end - t_norm_start:.2f} sec")
        print(f"Database Save: {t_db_end - t_db_start:.2f} sec")
        print(f"Total Upload: {t_total_end - t_start:.2f} sec")
        print("----------------------------------")

        mexwf = {"status": "success", "processed_rows": len(ni)}
        return mexwf
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/upload-report-with-sheet")
async def pu_with_sheet(file: UploadFile = File(...), datasetName: str = Form(...), sheetName: str = Form(...)):
    """Upload with manually selected sheet name."""
    t_start = time.time()
    try:
        dsn = datasetName

        db = ldb()
        if any(i.get("UploadBatch") == dsn for i in db):
            return JSONResponse(status_code=400, content={"error": "Duplicate: Dataset already exists."})

        fendralis = await file.read()
        fn = file.filename.lower()

        print(f"Manual sheet selection: {sheetName}")

        # Detect header row for the selected sheet
        wb = load_workbook(BytesIO(fendralis), read_only=True, data_only=True)
        ws = wb[sheetName]
        header_row, _, _ = detect_header_row(ws)
        wb.close()

        df = read_selected_sheet(fendralis, sheetName, header_row)

        # Continue with the same processing as main upload
        df = df.fillna("").astype(str).replace(["nan", "NaN", "NaT", "<NA>", "None", "NA"], "").dropna(how='all')
        if df.empty:
            return JSONResponse(status_code=400, content={"error": "Selected sheet is empty."})

        rc = df.columns.tolist()
        rc_lower = {c.lower(): c for c in rc}

        def find_col(patterns):
            for p in patterns:
                p_lower = p.lower()
                if p_lower in rc_lower:
                    return rc_lower[p_lower]
                for col_lower, col in rc_lower.items():
                    if p_lower in col_lower or col_lower in p_lower:
                        return col
            return None

        mp = {
            "IssueID": find_col(["ID", "IssueID", "VulnID", "CVE", "VulnerabilityID"]),
            "DisplayID": find_col(["ID", "DisplayID", "CVE", "VulnerabilityID"]),
            "Name": find_col(["Name", "VulnerabilityName", "Title", "Summary"]),
            "Severity": find_col(["Severity", "CVSSSeverity", "VendorSeverity", "NvdSeverity", "Risk", "RiskLevel"]),
            "Status": find_col(["Status", "State", "FindingStatus"]),
            "Department": find_col(["Department", "AssignedTeam", "Team", "Owner", "LOB"]),
            "AssignedTo": find_col(["AssignedTo", "Assignee", "Owner"]),
            "Category": find_col(["Category", "Type", "VulnType", "VulnerabilityType"]),
            "DueDate": find_col(["DueDate", "Due", "Deadline", "TargetDate"]),
            "DiscoveredDate": find_col(["DiscoveredDate", "FirstDetected", "DetectedDate", "FoundDate", "CreatedDate"]),
            "Description": find_col(["Description", "Summary", "Details", "VulnerabilityDescription"]),
            "DetailedName": find_col(["DetailedName", "DetailName", "FullName", "LongName"]),
            "AffectedAsset": find_col(["AffectedAsset", "AssetName", "Asset", "Host", "Hostname", "Target", "Resource"]),
            "AssetID": find_col(["AssetID", "AssetId", "ResourceID"]),
            "AssetType": find_col(["AssetType", "ResourceType", "TargetType"]),
            "RecommendedAction": find_col(["RecommendedAction", "Remediation", "Resolution", "Fix", "Mitigation", "RemediationAction"]),
            "Version": find_col(["Version", "CurrentVersion", "InstalledVersion", "AffectedVersion"]),
            "FixedVersion": find_col(["FixedVersion", "PatchedVersion", "RemediatedVersion", "SafeVersion"]),
            "Score": find_col(["Score", "CVSSScore", "CVSS", "CVSSv3", "CVSSv2", "RiskScore"]),
            "CVSSSeverity": find_col(["CVSSSeverity", "CVSSSev"]),
            "VendorSeverity": find_col(["VendorSeverity", "VendorSev"]),
            "NvdSeverity": find_col(["NvdSeverity", "NVDSev"]),
            "HasExploit": find_col(["HasExploit", "ExploitAvailable", "Exploitable"]),
            "HasCisaKev": find_col(["HasCisaKev", "HasCisaKnownExploit", "CisaKEV", "CISAKEV"]),
            "FindingStatus": find_col(["FindingStatus", "FindingStat"]),
            "FirstDetected": find_col(["FirstDetected", "FirstDetec", "FirstSeen", "DetectedDate"]),
            "LastDetected": find_col(["LastDetected", "LastDetec", "LastSeen"]),
            "ResolvedAt": find_col(["ResolvedAt", "ResolvedDate", "FixedDate", "ClosedDate"]),
            "Resolution": find_col(["Resolution", "ResolutionStatus"]),
            "LocationPath": find_col(["LocationPath", "Location", "Path", "FilePath"]),
            "Projects": find_col(["Projects", "Project", "Application", "App", "ProjectName"]),
            "Link": find_col(["Link", "URL", "WizURL", "Reference", "ReferenceLink", "DetectionLink"]),
            "WizURL": find_col(["WizURL", "WizLink"]),
            "CloudProvider": find_col(["CloudProvider", "Provider", "Cloud"]),
            "CloudPlatform": find_col(["CloudPlatform", "Platform"]),
            "Namespaces": find_col(["Namespaces", "Namespace", "NS"]),
            "Clusters": find_col(["Clusters", "Cluster", "K8sCluster"]),
            "LOB": find_col(["LOB", "LineOfBusiness", "BusinessUnit"]),
            "SubscriptionId": find_col(["SubscriptionId", "SubscriptionID", "SubID"]),
            "SubscriptionName": find_col(["SubscriptionName", "SubName"]),
            "Tags": find_col(["Tags", "Tag", "Labels"]),
        }
        mp = {k: v for k, v in mp.items() if v is not None}

        ni = []
        ri = df.to_dict(orient="records")

        def gv(row, target_key):
            mapped_col = mp.get(target_key)
            if mapped_col and mapped_col in row:
                val = str(row[mapped_col]).strip()
                if val and val.lower() not in ["", "nan", "none", "na", "null"]:
                    return val
            return ""

        for idx, row in enumerate(ri):
            rec = {}
            for k, v in row.items():
                rec[k] = str(v).strip() if v is not None else ""

            rec["UploadBatch"] = dsn
            issue_id = gv(row, "IssueID")
            rec["IssueID"] = issue_id if issue_id else f"VULN-{idx}"

            display_id = gv(row, "DisplayID")
            if display_id and display_id.upper().startswith("CVE"):
                rec["DisplayID"] = display_id
            elif issue_id and issue_id.upper().startswith("CVE"):
                rec["DisplayID"] = issue_id
            elif display_id:
                rec["DisplayID"] = display_id
            else:
                rec["DisplayID"] = rec["IssueID"]

            sev = gv(row, "Severity")
            if sev:
                sev_lower = sev.lower()
                if "critical" in sev_lower:
                    rec["Severity"] = "Critical"
                elif "high" in sev_lower:
                    rec["Severity"] = "High"
                elif "medium" in sev_lower or "moderate" in sev_lower:
                    rec["Severity"] = "Medium"
                elif "low" in sev_lower:
                    rec["Severity"] = "Low"
                elif "info" in sev_lower:
                    rec["Severity"] = "Info"
                else:
                    rec["Severity"] = sev
            else:
                rec["Severity"] = "Medium"

            status = gv(row, "Status")
            rec["Status"] = status if status else "Open"
            category = gv(row, "Category")
            rec["Category"] = category if category else "Uncategorized"
            rec["Department"] = gv(row, "Department")
            rec["AssignedTo"] = gv(row, "AssignedTo")
            rec["DiscoveredDate"] = gv(row, "DiscoveredDate")

            due = gv(row, "DueDate")
            if due:
                rec["DueDate"] = due
            elif rec["DiscoveredDate"]:
                try:
                    dt = pd.to_datetime(rec["DiscoveredDate"], errors='coerce')
                    if pd.notna(dt):
                        dys = 7 if rec["Severity"] == "Critical" else (30 if rec["Severity"] == "High" else 60)
                        rec["DueDate"] = (dt + pd.Timedelta(days=dys)).strftime("%Y-%m-%d")
                except:
                    rec["DueDate"] = ""
            else:
                rec["DueDate"] = ""

            rec["Name"] = gv(row, "Name")
            rec["DetailedName"] = gv(row, "DetailedName")

            # Get original description or generate AI-like short description
            orig_desc = gv(row, "Description")
            if orig_desc and orig_desc.strip() and orig_desc.lower() not in ["na", "none", ""]:
                rec["Description"] = orig_desc
            else:
                # Generate short 5-7 word description
                rec["Description"] = generate_short_description(
                    rec["Name"],
                    rec["DisplayID"],
                    rec["Severity"],
                    gv(row, "AssetType"),
                    rec["DetailedName"]
                )

            rec["AffectedAsset"] = gv(row, "AffectedAsset")
            rec["AssetID"] = gv(row, "AssetID")
            rec["AssetType"] = gv(row, "AssetType")
            rem = gv(row, "RecommendedAction")
            rec["RecommendedAction"] = rem if rem else "No action provided"
            rec["ReferenceLinks"] = gv(row, "Link")
            rec["WizURL"] = gv(row, "WizURL")
            rec["Version"] = gv(row, "Version")
            rec["FixedVersion"] = gv(row, "FixedVersion")
            rec["Score"] = gv(row, "Score")
            rec["CVSSSeverity"] = gv(row, "CVSSSeverity")
            rec["VendorSeverity"] = gv(row, "VendorSeverity")
            rec["NvdSeverity"] = gv(row, "NvdSeverity")
            rec["HasExploit"] = gv(row, "HasExploit")
            rec["HasCisaKev"] = gv(row, "HasCisaKev")
            rec["FindingStatus"] = gv(row, "FindingStatus")
            rec["FirstDetected"] = gv(row, "FirstDetected")
            rec["LastDetected"] = gv(row, "LastDetected")
            rec["ResolvedAt"] = gv(row, "ResolvedAt")
            rec["Resolution"] = gv(row, "Resolution")
            rec["LocationPath"] = gv(row, "LocationPath")
            rec["Projects"] = gv(row, "Projects")
            rec["CloudProvider"] = gv(row, "CloudProvider")
            rec["CloudPlatform"] = gv(row, "CloudPlatform")
            rec["Namespaces"] = gv(row, "Namespaces")
            rec["Clusters"] = gv(row, "Clusters")
            rec["LOB"] = gv(row, "LOB")
            rec["SubscriptionId"] = gv(row, "SubscriptionId")
            rec["SubscriptionName"] = gv(row, "SubscriptionName")
            rec["Tags"] = gv(row, "Tags")

            # Auto-assign POD owner based on subscription name/ID
            if not rec["AssignedTo"] or rec["AssignedTo"] in ["", "NA", "Unassigned"]:
                auto_owner = get_pod_owner(rec["SubscriptionName"], rec["SubscriptionId"])
                if auto_owner:
                    rec["AssignedTo"] = auto_owner

            # Filter: Only include Wynk LOB data (skip if LOB exists and is not Wynk)
            lob_value = rec["LOB"].lower().strip() if rec["LOB"] else ""
            if lob_value and lob_value not in ALLOWED_LOB and "wynk" not in lob_value:
                continue  # Skip non-Wynk data

            ni.append(rec)

        db.extend(ni)
        sdb(db)

        print(f"Processed {len(ni)} rows from sheet '{sheetName}'")
        return {"status": "success", "processed_rows": len(ni)}
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": str(e)})


# ============ OFFLINE AI ENDPOINTS ============
# No internet connection required - all analysis is done locally

# Remediation templates for common vulnerability types
REMEDIATION_TEMPLATES = {
    "cve": """OFFLINE ANALYSIS - CVE Remediation Steps:

1. IMMEDIATE ACTIONS:
   - Verify the vulnerability exists in your environment
   - Check if the affected component is in production
   - Assess exposure level (internal/external)

2. PATCH STRATEGY:
   - Check vendor advisory for available patches
   - Test patch in staging environment first
   - Schedule maintenance window for production

3. MITIGATION (if patch not available):
   - Apply network-level controls (firewall rules)
   - Implement WAF rules if web-facing
   - Consider disabling affected functionality temporarily

4. VERIFICATION:
   - Re-scan after remediation
   - Update ticket status
   - Document changes made

Note: This is an offline analysis. For detailed CVE information,
consult your internal security documentation.""",

    "config": """OFFLINE ANALYSIS - Configuration Issue:

1. REVIEW:
   - Compare current config against security baseline
   - Check compliance requirements (CIS, NIST, etc.)

2. REMEDIATION:
   - Update configuration to secure defaults
   - Remove unnecessary services/features
   - Implement least privilege principle

3. HARDENING:
   - Enable logging and monitoring
   - Set up alerts for configuration drift
   - Document approved configuration

4. VALIDATION:
   - Test functionality after changes
   - Verify security controls are effective""",

    "default": """OFFLINE ANALYSIS - General Remediation:

1. ASSESSMENT:
   - Review vulnerability details and impact
   - Identify affected systems and data
   - Determine business criticality

2. REMEDIATION OPTIONS:
   - Apply vendor patches if available
   - Implement compensating controls
   - Update security configurations

3. TESTING:
   - Validate fix in test environment
   - Verify no regression in functionality

4. DOCUMENTATION:
   - Update asset inventory
   - Record remediation actions taken
   - Close tracking ticket with evidence"""
}

@app.post("/api/analyze")
async def av(req: Request):
    """Vulnerability analysis using Ollama LLM"""
    try:
        data = await req.json()
        description = data.get('description', '')
        asset = data.get('asset', 'Unknown')
        severity = data.get('severity', 'Medium')
        cve_id = data.get('cve', '')

        # Build prompt for Ollama
        prompt = f"""You are a security analyst. Analyze this vulnerability and provide remediation steps.

Vulnerability: {description}
Asset: {asset}
Severity: {severity}
CVE: {cve_id if cve_id else 'N/A'}

Provide:
1. Risk Assessment (2-3 sentences)
2. Immediate Actions (bullet points)
3. Remediation Steps (numbered list)
4. Verification Steps

Keep response concise and actionable."""

        # Call Ollama API
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False
                }
            )

            if response.status_code == 200:
                result = response.json()
                ai_response = result.get("response", "No response from Ollama")
                return {"remediation": ai_response}
            else:
                # Fallback to template if Ollama fails
                print(f"Ollama error: {response.status_code}")
                return {"remediation": get_fallback_remediation(description, asset)}

    except httpx.ConnectError:
        print("Ollama not running - using fallback")
        return {"remediation": get_fallback_remediation(data.get('description', ''), data.get('asset', 'Unknown'))}
    except Exception as e:
        import traceback
        err = traceback.format_exc()
        print("======== ANALYZE ERROR ========")
        print(err)
        print("===============================")
        return {"remediation": f"Analysis error: {type(e).__name__}: {str(e)}"}


def get_fallback_remediation(description, asset):
    """Fallback when Ollama is not available"""
    desc_lower = description.lower()
    if 'cve' in desc_lower or 'vulnerability' in desc_lower:
        template = REMEDIATION_TEMPLATES["cve"]
    elif 'config' in desc_lower or 'misconfigur' in desc_lower:
        template = REMEDIATION_TEMPLATES["config"]
    else:
        template = REMEDIATION_TEMPLATES["default"]

    return f"""Asset: {asset}

{template}

---
[Fallback mode - Ollama not available. Start Ollama for AI-powered analysis.]"""


# Security knowledge base for offline agent
SECURITY_KB = {
    "critical": "Critical vulnerabilities require immediate attention. Typical SLA is 7 days. Focus on internet-facing systems first.",
    "high": "High severity issues should be addressed within 30 days. Prioritize based on asset criticality.",
    "patch": "Always test patches in staging before production deployment. Document rollback procedures.",
    "sla": "SLA targets: Critical=7d, High=30d, Medium=60d, Low=90d. Track MTTR for continuous improvement.",
    "remediation": "Follow the principle of least privilege. Document all changes. Verify fixes with rescans.",
    "compliance": "Ensure changes align with organizational security policies and compliance frameworks.",
    "risk": "Calculate risk as: Risk = Likelihood x Impact. Prioritize based on business context.",
}

@app.post("/api/ask-agent")
async def aa(req: Request):
    """Security assistant powered by Ollama LLM"""
    try:
        data = await req.json()
        message = data.get('message', '')
        context = data.get('context', [])

        # Build context summary for the AI
        context_summary = ""
        if context:
            critical_count = sum(1 for c in context if c.get('Severity') == 'Critical')
            high_count = sum(1 for c in context if c.get('Severity') == 'High')
            open_count = sum(1 for c in context if c.get('Status', '').lower() not in ['resolved', 'closed', 'fixed'])
            context_summary = f"\n\nCurrent Dashboard Context:\n- Total vulnerabilities: {len(context)}\n- Critical: {critical_count}\n- High: {high_count}\n- Open issues: {open_count}"

        # Build prompt for Ollama
        prompt = f"""You are a security operations assistant for Wynk Security Portal.
Help the user with vulnerability management, prioritization, and remediation guidance.

User Question: {message}
{context_summary}

Provide a helpful, concise response focused on security operations.
Keep your answer under 200 words unless more detail is needed."""

        # Call Ollama API
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False
                }
            )

            if response.status_code == 200:
                result = response.json()
                ai_response = result.get("response", "No response from Ollama")
                return {"reply": ai_response}
            else:
                print(f"Ollama error: {response.status_code}")
                return {"reply": get_fallback_agent_response(message, context)}

    except httpx.ConnectError:
        print("Ollama not running - using fallback")
        return {"reply": get_fallback_agent_response(data.get('message', ''), data.get('context', []))}
    except Exception as e:
        import traceback
        err = traceback.format_exc()
        print("======== AGENT ERROR ========")
        print(err)
        print("=============================")
        return {"reply": f"Error: {type(e).__name__}: {str(e)}"}


def get_fallback_agent_response(message, context):
    """Fallback when Ollama is not available"""
    message_lower = message.lower()
    response_parts = []

    if 'critical' in message_lower or 'urgent' in message_lower:
        response_parts.append(SECURITY_KB["critical"])
    if 'high' in message_lower:
        response_parts.append(SECURITY_KB["high"])
    if 'patch' in message_lower or 'update' in message_lower:
        response_parts.append(SECURITY_KB["patch"])
    if 'sla' in message_lower or 'deadline' in message_lower:
        response_parts.append(SECURITY_KB["sla"])
    if 'fix' in message_lower or 'remediat' in message_lower:
        response_parts.append(SECURITY_KB["remediation"])
    if 'complian' in message_lower or 'audit' in message_lower:
        response_parts.append(SECURITY_KB["compliance"])
    if 'risk' in message_lower or 'priorit' in message_lower:
        response_parts.append(SECURITY_KB["risk"])

    if context:
        critical_count = sum(1 for c in context if c.get('Severity') == 'Critical')
        open_count = sum(1 for c in context if c.get('Status', '').lower() not in ['resolved', 'closed', 'fixed'])
        response_parts.append(f"\nCurrent Status: {len(context)} vulnerabilities, {critical_count} critical, {open_count} open.")

    if not response_parts:
        response_parts.append("I'm your security assistant. Ask about vulnerabilities, SLA, patches, or risk prioritization.\n\n[Ollama not running - using basic mode. Start Ollama for AI-powered responses.]")

    return "\n\n".join(response_parts)


@app.get("/api/ollama-status")
async def ollama_status():
    """Check if Ollama is running"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://127.0.0.1:11434/api/tags")
            if response.status_code == 200:
                data = response.json()
                models = [m.get("name") for m in data.get("models", [])]
                return {
                    "status": "running",
                    "models": models,
                    "active_model": OLLAMA_MODEL
                }
    except:
        pass
    return {"status": "offline", "models": [], "message": "Start Ollama with: ollama serve"}


@app.post("/api/trigger-openclaw")
async def tc(req: Request):
    """OpenClaw trigger using Ollama"""
    try:
        data = await req.json()
        query = data.get('query', '')

        if not query:
            return {"result": "No query provided"}

        prompt = f"""You are OpenClaw, a security analysis tool. Analyze this security query:

{query}

Provide actionable security recommendations."""

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False
                }
            )

            if response.status_code == 200:
                result = response.json()
                return {"result": result.get("response", "No response")}

        return {"result": "Ollama not available. Start with: ollama serve"}
    except Exception as e:
        return {"result": f"Error: {str(e)}"}

app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

@app.get("/{fp:path}")
async def sr(fp: str):
    fendralis = os.path.join("dist", fp)
    if os.path.exists(fendralis) and os.path.isfile(fendralis):
        return FileResponse(fendralis)
    return FileResponse("dist/index.html")