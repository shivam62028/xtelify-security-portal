import re

with open("app.py", "r") as f:
    content = f.read()

# 1. Add BackgroundTasks to imports
content = content.replace(
    "from fastapi import FastAPI, Request, UploadFile, File, Form",
    "from fastapi import FastAPI, Request, UploadFile, File, Form, BackgroundTasks"
)

# 2. Extract and replace ai_remediation
start_str = '@app.post("/api/ai/remediation")\nasync def ai_remediation(req: Request):'
start_idx = content.find(start_str)
end_str = '@app.get("/api/email/generate_excel")'
end_idx = content.find(end_str)

if start_idx == -1 or end_idx == -1:
    print("Could not find bounds")
    exit(1)

new_logic = """
async def _process_ai_remediation(cache_id: str, upload_batch: str, source_format: str, prompt: str):
    try:
        import httpx
        async with httpx.AsyncClient(timeout=300.0) as client:
            try:
                response = await client.post(
                    OLLAMA_URL,
                    json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}
                )
            except Exception as e:
                print(f"Ollama request failed: {e}")
                return
            if response.status_code != 200:
                print(f"Ollama returned error: {response.status_code}")
                return
            ai_response = response.json().get("response", "")

        sections = {
            "AI_Summary": "", "AI_RootCause": "", "AI_Impact": "",
            "AI_Remediation": [], "AI_Validation": [], "AI_Priority": "Unknown"
        }
        def extract_section(text, current_header, next_header=None):
            try:
                start = text.index(current_header) + len(current_header)
                if next_header:
                    try:
                        end = text.index(next_header, start)
                        return text[start:end].strip()
                    except ValueError:
                        return text[start:].strip()
                return text[start:].strip()
            except ValueError:
                return ""

        summary = extract_section(ai_response, "FINDING SUMMARY:", "ROOT CAUSE:")
        root_cause = extract_section(ai_response, "ROOT CAUSE:", "SECURITY IMPACT:")
        impact = extract_section(ai_response, "SECURITY IMPACT:", "RECOMMENDED REMEDIATION:")
        remediation_str = extract_section(ai_response, "RECOMMENDED REMEDIATION:", "VALIDATION STEPS:")
        validation_str = extract_section(ai_response, "VALIDATION STEPS:", "PRIORITY RECOMMENDATION:")
        priority_str = extract_section(ai_response, "PRIORITY RECOMMENDATION:")

        if not summary and not root_cause:
            sections["AI_Summary"] = "Ollama returned a non-standard format:\\n\\n" + ai_response
        else:
            sections["AI_Summary"] = summary
            sections["AI_RootCause"] = root_cause
            sections["AI_Impact"] = impact
            sections["AI_Remediation"] = [r.strip() for r in remediation_str.split("\\n") if r.strip()]
            sections["AI_Validation"] = [v.strip() for v in validation_str.split("\\n") if v.strip()]
            p_match = re.search(r'(Immediate|High|Medium|Low)', priority_str, re.IGNORECASE)
            if p_match:
                sections["AI_Priority"] = p_match.group(1).capitalize()

        fendralis = {
            "IssueID": cache_id, "UploadBatch": upload_batch, "SourceFormat": source_format,
            **sections, "AI_GeneratedAt": datetime.now(timezone.utc).isoformat(), "AI_Model": OLLAMA_MODEL
        }
        if _is_mongo_available():
            ai_remediation_cache_collection.update_one(
                {"IssueID": cache_id, "UploadBatch": upload_batch, "SourceFormat": source_format},
                {"$set": fendralis}, upsert=True
            )
    except Exception as e:
        print(f"Error in background AI remediation: {e}")

@app.get("/api/ai/remediation/status")
async def ai_remediation_status(issue_id: str, upload_batch: str = "", source_format: str = "UNKNOWN"):
    if _is_mongo_available():
        fendralis = ai_remediation_cache_collection.find_one({
            "IssueID": issue_id, "UploadBatch": upload_batch, "SourceFormat": source_format
        })
        if fendralis:
            fendralis.pop("_id", None)
            mexwf = {"result": fendralis, "status": "completed"}
            return ORJSONResponse(content=mexwf)
    mexwf = {"status": "processing"}
    return ORJSONResponse(content=mexwf)

@app.post("/api/ai/remediation")
async def ai_remediation(req: Request, background_tasks: BackgroundTasks):
    try:
        data = await req.json()
        issue_id = data.get("IssueID")
        upload_batch = data.get("UploadBatch", "")
        source_format = data.get("SourceFormat", "UNKNOWN")
        vulnerability = data.get("vulnerability", {})
        regenerate = data.get("regenerate", False)

        if not issue_id and not vulnerability.get("Name") and not vulnerability.get("finding_name"):
            return ORJSONResponse(status_code=400, content={"error": "Missing IssueID or equivalent identifier"})
            
        cache_id = issue_id or f"{vulnerability.get('Name') or vulnerability.get('finding_name')}-{vulnerability.get('AffectedAsset') or vulnerability.get('resource_name')}"

        if regenerate and _is_mongo_available():
            ai_remediation_cache_collection.delete_many({
                "IssueID": cache_id, "UploadBatch": upload_batch, "SourceFormat": source_format
            })
        elif not regenerate and _is_mongo_available():
            cached_result = ai_remediation_cache_collection.find_one({
                "IssueID": cache_id, "UploadBatch": upload_batch, "SourceFormat": source_format
            })
            if cached_result:
                cached_result.pop("_id", None)
                return ORJSONResponse(content={"result": cached_result, "cached": True})

        context_str = ""
        if source_format == "CSPM":
            keys_to_include = ["finding_name", "account_name", "account_id", "resource_type", "resource_id", "resource_name", "impact", "risk_score", "remediation_type", "Description", "RecommendedAction", "ReferenceLinks"]
            context_dict = {k: vulnerability.get(k) for k in keys_to_include if vulnerability.get(k)}
            context_str = "\\n".join(f"{k}: {v}" for k, v in context_dict.items())
        elif source_format == "VAPT":
            keys_to_include = ["Vulnerability name", "Vulnerability description", "Solution", "Vulnerability Path", "Vulnerability ID", "Vulnerability family", "CVE Number", "Risk Factor", "Severity", "IP", "Hostname", "Port", "Protocol", "Application Owner"]
            context_dict = {k: vulnerability.get(k) for k in keys_to_include if vulnerability.get(k)}
            context_str = "\\n".join(f"{k}: {v}" for k, v in context_dict.items())
        elif source_format == "CONTAINER":
            keys_to_include = ["Name", "DetailedName", "AffectedAsset", "Severity", "Version", "FixedVersion", "Description", "SubscriptionName", "ImageID", "Namespaces", "Clusters", "RecommendedAction"]
            context_dict = {k: vulnerability.get(k) for k in keys_to_include if vulnerability.get(k)}
            context_str = "\\n".join(f"{k}: {v}" for k, v in context_dict.items())
        elif source_format == "SAST_DAST":
            keys_to_include = ["issue_key", "Summary", "ApplicationName", "CriticalityStatus", "ReportedOn", "Ageing", "Assignee", "ApplicationOwner", "Description"]
            context_dict = {k: vulnerability.get(k) for k in keys_to_include if vulnerability.get(k)}
            context_str = "\\n".join(f"{k}: {v}" for k, v in context_dict.items())
        else:
            context_dict = {k: v for k, v in vulnerability.items() if v and isinstance(v, str) and len(v) < 1000}
            context_str = "\\n".join(f"{k}: {v}" for k, v in context_dict.items())

        prompt = f"You are a senior cybersecurity expert analyzing a {source_format} finding.\\nUse ONLY the supplied context. Do not invent missing technical facts. Provide practical and actionable remediation.\\n\\nCONTEXT:\\n{context_str}\\n\\nOUTPUT FORMAT EXACTLY AS FOLLOWS (with exactly these section headers in ALL CAPS, do NOT use markdown headers, just the ALL CAPS words followed by a colon and a newline):\\n\\nFINDING SUMMARY:\\n(1-2 sentences explaining what the vulnerability means)\\n\\nROOT CAUSE:\\n(Explain the likely underlying configuration/code/security issue)\\n\\nSECURITY IMPACT:\\n(Explain what could happen if the issue remains unresolved)\\n\\nRECOMMENDED REMEDIATION:\\n(Provide concrete, actionable steps to fix the issue. Use numbered lists.)\\n\\nVALIDATION STEPS:\\n(Explain how the security team can verify that the remediation was applied successfully. Use numbered lists.)\\n\\nPRIORITY RECOMMENDATION:\\n(One of: Immediate, High, Medium, Low)"

        background_tasks.add_task(_process_ai_remediation, cache_id, upload_batch, source_format, prompt)
        mexwf = {"status": "processing"}
        return ORJSONResponse(content=mexwf)

    except Exception as e:
        import traceback
        err = traceback.format_exc()
        print(f"Error in /api/ai/remediation:\\n{err}")
        return ORJSONResponse(status_code=500, content={"error": "An error occurred while generating AI remediation.", "details": str(e)})

"""

new_content = content[:start_idx] + new_logic + content[end_idx:]

with open("app.py", "w") as f:
    f.write(new_content)

print("Done")
