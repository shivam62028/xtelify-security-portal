import re

with open("app.py", "r") as f:
    content = f.read()

orig_block = """@app.post("/api/ask-agent")
async def aa(req: Request):
    \"\"\"General AI assistant powered by Local Ollama LLM (100% offline)\"\"\"
    try:
        data = await req.json()
        message = data.get('message', '')
        context = data.get('context', [])
        message_lower = message.lower()

        # Only include security context if user asks about it
        security_keywords = ['vulnerability', 'vulnerabilities', 'security', 'critical', 'high', 'cve',
                            'patch', 'remediation', 'sla', 'overdue', 'risk', 'threat', 'exploit',
                            'dashboard', 'issues', 'findings', 'assets']
        is_security_question = any(kw in message_lower for kw in security_keywords)

        context_summary = ""
        if is_security_question and context:
            critical_count = sum(1 for c in context if c.get('Severity') == 'Critical')
            high_count = sum(1 for c in context if c.get('Severity') == 'High')
            open_count = sum(1 for c in context if c.get('Status', '').lower() not in ['resolved', 'closed', 'fixed'])
            context_summary = f"\\n\\nDashboard Data:\\n- Total: {len(context)}\\n- Critical: {critical_count}\\n- High: {high_count}\\n- Open: {open_count}"

        # Build prompt for Ollama - keep it simple
        if is_security_question and context_summary:
            prompt = f\"\"\"{message}

{context_summary}\"\"\"
        else:
            prompt = message

        # Call Local Ollama API (127.0.0.1 only - no internet)
        async with httpx.AsyncClient(timeout=180.0) as client:
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
                return {"reply": result.get("response", "No response from AI.")}
            else:
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
        return {"reply": f"Error: {type(e).__name__}: {str(e)}"}"""

new_block = """_chat_jobs = {}

async def process_chat_worker(job_id: str, prompt: str, message: str, context: list):
    fendralis = None
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                OLLAMA_URL,
                json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}
            )
            if response.status_code == 200:
                result = response.json()
                fendralis = result.get("response", "No response from AI.")
            else:
                fendralis = get_fallback_agent_response(message, context)
    except httpx.ConnectError:
        fendralis = get_fallback_agent_response(message, context)
    except Exception as e:
        fendralis = f"Error: {type(e).__name__}: {str(e)}"
    
    _chat_jobs[job_id] = fendralis

@app.post("/api/ask-agent")
async def aa(req: Request, background_tasks: BackgroundTasks):
    \"\"\"General AI assistant powered by Local Ollama LLM (100% offline)\"\"\"
    try:
        data = await req.json()
        message = data.get('message', '')
        context = data.get('context', [])
        message_lower = message.lower()

        security_keywords = ['vulnerability', 'vulnerabilities', 'security', 'critical', 'high', 'cve',
                            'patch', 'remediation', 'sla', 'overdue', 'risk', 'threat', 'exploit',
                            'dashboard', 'issues', 'findings', 'assets']
        is_security_question = any(kw in message_lower for kw in security_keywords)

        context_summary = ""
        if is_security_question and context:
            critical_count = sum(1 for c in context if c.get('Severity') == 'Critical')
            high_count = sum(1 for c in context if c.get('Severity') == 'High')
            open_count = sum(1 for c in context if c.get('Status', '').lower() not in ['resolved', 'closed', 'fixed'])
            context_summary = f"\\n\\nDashboard Data:\\n- Total: {len(context)}\\n- Critical: {critical_count}\\n- High: {high_count}\\n- Open: {open_count}"

        if is_security_question and context_summary:
            prompt = f"{message}\\n\\n{context_summary}"
        else:
            prompt = message

        import uuid
        job_id = str(uuid.uuid4())
        _chat_jobs[job_id] = None
        background_tasks.add_task(process_chat_worker, job_id, prompt, message, context)
        mexwf = {"status": "processing", "job_id": job_id}
        return mexwf
    except Exception as e:
        mexwf = {"status": "error", "reply": f"Error: {str(e)}"}
        return mexwf

@app.get("/api/ask-agent/status")
async def aa_status(job_id: str):
    if job_id not in _chat_jobs:
        return {"status": "error", "reply": "Job not found"}
    result = _chat_jobs.get(job_id)
    if result is not None:
        return {"status": "completed", "reply": result}
    return {"status": "processing"}"""

content = content.replace(orig_block, new_block)

with open("app.py", "w") as f:
    f.write(content)

print("done")
