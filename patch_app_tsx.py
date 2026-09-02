import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Replace generateAIRemediation logic
start_str_1 = """      const textResponse = await response.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch {
        throw new Error("The AI request timed out at the server proxy or returned an invalid format.");
      }
      if (response.ok && data.result) {
        setAiRemediation(prev => ({ ...prev, [rowKey]: data.result }));
      } else {
        alert(data.error || "Failed to generate AI remediation");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error generating AI remediation. Ensure backend and Ollama are running.");
    } finally {
      setIsGeneratingAI(prev => ({ ...prev, [rowKey]: false }));
    }"""

new_str_1 = """      const textResponse = await response.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch {
        throw new Error("The AI request timed out at the server proxy or returned an invalid format.");
      }
      if (data.status === "processing") {
        const poll = async () => {
          try {
            const params = new URLSearchParams({ issue_id: issue.IssueID, upload_batch: issue.UploadBatch || "", source_format: issue.SourceFormat || "UNKNOWN" });
            const sRes = await fetch(`${BACKEND_URL}/api/ai/remediation/status?${params.toString()}`);
            const sText = await sRes.text();
            let sData;
            try { sData = JSON.parse(sText); } catch { throw new Error("The AI request timed out at the server proxy or returned an invalid format."); }
            if (sData.status === "processing") { setTimeout(poll, 5000); }
            else if (sData.result) { setAiRemediation(prev => ({ ...prev, [rowKey]: sData.result })); setIsGeneratingAI(prev => ({ ...prev, [rowKey]: false })); }
          } catch (err: any) {
            console.error(err);
            alert(err.message || "Error fetching AI remediation status.");
            setIsGeneratingAI(prev => ({ ...prev, [rowKey]: false }));
          }
        };
        setTimeout(poll, 5000);
      } else if (response.ok && (data.result || data.cached)) {
        setAiRemediation(prev => ({ ...prev, [rowKey]: data.result }));
        setIsGeneratingAI(prev => ({ ...prev, [rowKey]: false }));
      } else {
        alert(data.error || "Failed to generate AI remediation");
        setIsGeneratingAI(prev => ({ ...prev, [rowKey]: false }));
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error generating AI remediation. Ensure backend and Ollama are running.");
      setIsGeneratingAI(prev => ({ ...prev, [rowKey]: false }));
    }"""

if start_str_1 in content:
    content = content.replace(start_str_1, new_str_1)
    print("Replaced generateAIRemediation block successfully.")
else:
    print("Failed to find generateAIRemediation block.")

# Replace handleGenerateAiRemediation logic
start_str_2 = """      const textResponse = await response.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch {
        throw new Error("The AI request timed out at the server proxy or returned an invalid format.");
      }
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate AI remediation');
      }

      setAiRemediationData(prev => ({ ...prev, [id]: data.result }));
    } catch (err: any) {
      setAiError(prev => ({ ...prev, [id]: err.message || 'Unable to generate AI remediation. Please verify the Ollama service.' }));
    } finally {
      setIsAiGenerating(prev => ({ ...prev, [id]: false }));
    }"""

new_str_2 = """      const textResponse = await response.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch {
        throw new Error("The AI request timed out at the server proxy or returned an invalid format.");
      }
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate AI remediation');
      }

      if (data.status === "processing") {
        const poll = async () => {
          try {
            const params = new URLSearchParams({ issue_id: id, upload_batch: issue.UploadBatch || "", source_format: issue.SourceFormat || issue.Type || issue.Category || "UNKNOWN" });
            const sRes = await fetch(`${BACKEND_URL}/api/ai/remediation/status?${params.toString()}`);
            const sText = await sRes.text();
            let sData;
            try { sData = JSON.parse(sText); } catch { throw new Error("The AI request timed out at the server proxy or returned an invalid format."); }
            if (sData.status === "processing") { setTimeout(poll, 5000); }
            else if (sData.result) { setAiRemediationData(prev => ({ ...prev, [id]: sData.result })); setIsAiGenerating(prev => ({ ...prev, [id]: false })); }
          } catch (err: any) {
            setAiError(prev => ({ ...prev, [id]: err.message || 'Unable to fetch AI remediation status.' }));
            setIsAiGenerating(prev => ({ ...prev, [id]: false }));
          }
        };
        setTimeout(poll, 5000);
      } else {
        setAiRemediationData(prev => ({ ...prev, [id]: data.result }));
        setIsAiGenerating(prev => ({ ...prev, [id]: false }));
      }
    } catch (err: any) {
      setAiError(prev => ({ ...prev, [id]: err.message || 'Unable to generate AI remediation. Please verify the Ollama service.' }));
      setIsAiGenerating(prev => ({ ...prev, [id]: false }));
    }"""

if start_str_2 in content:
    content = content.replace(start_str_2, new_str_2)
    print("Replaced handleGenerateAiRemediation block successfully.")
else:
    print("Failed to find handleGenerateAiRemediation block.")

with open("src/App.tsx", "w") as f:
    f.write(content)

