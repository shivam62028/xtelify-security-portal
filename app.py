__author__ = "richyrik"

import os, json, httpx, re, time
import pandas as pd
from io import BytesIO
from datetime import datetime
from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from dotenv import load_dotenv
from langsmith import traceable

load_dotenv()

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

ourl = "http://127.0.0.1:11434/api/generate"
mnam = "llama3"

@traceable(name="ai_schema_inference")
async def iswa(c, s):
    fendralis = {"cols": c, "sample": s}
    p = f"Map exact schema: CVE, Severity, CVSS, Asset, Status, PackageName, CurrentVersion, FixedVersion, Remediation, DiscoveredDate, DueDate. JSON only mapping to raw columns: {fendralis['cols']}. Sample: {fendralis['sample']}. Missing = null."
    async with httpx.AsyncClient() as cl:
        try:
            r = await cl.post(ourl, json={"model": mnam, "prompt": p, "stream": False, "format": "json"}, timeout=10.0)
            return r.json().get("response", "{}")
        except Exception as e:
            print("Ollama unavailable. Using default mapping.")
            return "{}"

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
                xlsx = pd.ExcelFile(BytesIO(fendralis))
                sheets = xlsx.sheet_names
                print(f"Excel sheets found: {sheets}")
                dfs = []
                for sheet in sheets:
                    sheet_df = pd.read_excel(xlsx, sheet_name=sheet)
                    if not sheet_df.empty:
                        print(f"Sheet '{sheet}': {len(sheet_df)} rows")
                        dfs.append(sheet_df)
                if dfs:
                    df = pd.concat(dfs, ignore_index=True)
                else:
                    df = pd.DataFrame()
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
            "DisplayID": find_col(["ID", "Name", "DisplayID", "CVE", "VulnerabilityName", "Title"]),
            "Severity": find_col(["Severity", "CVSSSeverity", "VendorSeverity", "NvdSeverity", "Risk", "RiskLevel"]),
            "Status": find_col(["Status", "State", "FindingStatus"]),
            "Department": find_col(["Department", "AssignedTeam", "Team", "Owner"]),
            "AssignedTo": find_col(["AssignedTo", "Assignee", "Owner"]),
            "Category": find_col(["Category", "Type", "VulnType", "VulnerabilityType"]),
            "DueDate": find_col(["DueDate", "Due", "Deadline", "TargetDate"]),
            "DiscoveredDate": find_col(["DiscoveredDate", "FirstDetected", "DetectedDate", "FoundDate", "CreatedDate", "LastDetected"]),
            "Description": find_col(["Description", "DetailedName", "Name", "Summary", "Details", "VulnerabilityDescription"]),
            "AffectedAsset": find_col(["AffectedAsset", "AssetName", "Asset", "Host", "Hostname", "Target", "Resource"]),
            "RecommendedAction": find_col(["RecommendedAction", "Remediation", "Resolution", "Fix", "Mitigation", "RemediationAction"]),
            "Version": find_col(["Version", "CurrentVersion", "InstalledVersion", "AffectedVersion"]),
            "FixedVersion": find_col(["FixedVersion", "PatchedVersion", "RemediatedVersion", "SafeVersion"]),
            "CVSS": find_col(["CVSS", "CVSSScore", "Score", "CVSSv3", "CVSSv2"]),
            "Projects": find_col(["Projects", "Project", "Application", "App"]),
            "Link": find_col(["Link", "URL", "WizURL", "Reference", "ReferenceLink"]),
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

            rec["Description"] = gv(row, "Description")

            rec["AffectedAsset"] = gv(row, "AffectedAsset")

            rem = gv(row, "RecommendedAction")
            rec["RecommendedAction"] = rem if rem else "No action provided"

            rec["ReferenceLinks"] = gv(row, "Link")

            if idx < 3:
                print(f"Row {idx}: IssueID={rec['IssueID']}, DisplayID={rec['DisplayID']}, Severity={rec['Severity']}")

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

@app.post("/api/analyze")
async def av(req: Request):
    try:
        fendralis = await req.json()
        d = fendralis.get('description', '')
        a = fendralis.get('asset', '')
        e = fendralis.get('evidence', '')
        p = f"Asset: {a}\nDescription: {d}\nEvidence: {e}"
        async with httpx.AsyncClient() as c:
            r = await c.post(ourl, json={"model": mnam, "prompt": p, "stream": False}, timeout=120.0)
            mexwf = r.json().get("response", "Error")
        return {"remediation": mexwf}
    except Exception as e:
        return {"remediation": str(e)}

@app.post("/api/ask-agent")
async def aa(req: Request):
    try:
        fendralis = await req.json()
        m = fendralis.get('message', '')
        cx = fendralis.get('context', [])
        p = f"Context: {json.dumps(cx)}\nUser: {m}"
        async with httpx.AsyncClient() as c:
            r = await c.post(ourl, json={"model": mnam, "prompt": p, "stream": False}, timeout=120.0)
            mexwf = r.json().get("response", "Error")
        return {"reply": mexwf}
    except Exception as e:
        return {"reply": str(e)}

@app.post("/api/trigger-openclaw")
async def tc(req: Request):
    try:
        fendralis = await req.json()
        p = fendralis.get('prompt', '')
        u = f"{os.getenv('OPENCLAW_GATEWAY_URL')}/v1/execute"
        h = {"Authorization": f"Bearer {os.getenv('OPENCLAW_TOKEN')}", "Content-Type": "application/json"}
        py = {"prompt": p, "workspace": os.getcwd(), "skills": ["xtelify.skill.md"]}
        async with httpx.AsyncClient() as c:
            r = await c.post(u, json=py, headers=h, timeout=300.0)
            mexwf = r.json().get("response", r.json())
        return {"result": mexwf}
    except Exception as e:
        return {"result": str(e)}

app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

@app.get("/{fp:path}")
async def sr(fp: str):
    fendralis = os.path.join("dist", fp)
    if os.path.exists(fendralis) and os.path.isfile(fendralis):
        return FileResponse(fendralis)
    return FileResponse("dist/index.html")