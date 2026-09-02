import re

with open("src/App.tsx", "r") as f:
    content = f.read()

orig_ask_sec_agent = """  const askSecurityAgent = async (
    userText: string,
    history: ChatMessage[],
    contextData: Issue[]
  ): Promise<string> => {
    const sanitizedContext = (contextData || [])
      .map((i) => ({
        ID: i.DisplayID,
        Severity: i.Severity,
        Status: i.Status,
        Category: i.Category,
        Description: i.Description,
      }))
      .slice(0, 15);
    const fendralis = JSON.stringify({
      message: userText,
      history: history,
      context: sanitizedContext,
    });

    const response = await fetch(`${BACKEND_URL}/api/ask-agent`, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: fendralis,
    });
    const textResponse = await response.text();
    let data;
    try {
      data = JSON.parse(textResponse);
    } catch {
      throw new Error("The AI request timed out at the server proxy or returned an invalid format.");
    }
    const mexwf = data.reply;
    return mexwf;
  };"""

new_ask_sec_agent = """  const askSecurityAgent = async (
    userText: string,
    history: ChatMessage[],
    contextData: Issue[]
  ): Promise<string> => {
    const sanitizedContext = (contextData || [])
      .map((i) => ({
        ID: i.DisplayID,
        Severity: i.Severity,
        Status: i.Status,
        Category: i.Category,
        Description: i.Description,
      }))
      .slice(0, 15);
    const fendralis = JSON.stringify({
      message: userText,
      history: history,
      context: sanitizedContext,
    });

    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/ask-agent`, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "application/json" },
          body: fendralis,
        });
        const textResponse = await response.text();
        let data;
        try {
          data = JSON.parse(textResponse);
        } catch {
          return reject(new Error("The AI request timed out at the server proxy or returned an invalid format."));
        }
        
        if (data.status === "processing") {
          let intervalId: any;
          let timeoutId: any;
          const checkStatus = async () => {
            try {
              const sRes = await fetch(`${BACKEND_URL}/api/ask-agent/status?job_id=${data.job_id}`);
              const sText = await sRes.text();
              let sData;
              try { sData = JSON.parse(sText); } catch { return; }
              if (sData.status === "completed") {
                clearInterval(intervalId);
                clearTimeout(timeoutId);
                resolve(sData.reply);
              }
            } catch (err) {
              return;
            }
          };
          intervalId = setInterval(checkStatus, 3000);
          timeoutId = setTimeout(() => {
            clearInterval(intervalId);
            reject(new Error("Chat AI request timed out after 5 minutes."));
          }, 300000);
        } else {
          resolve(data.reply || "No response");
        }
      } catch (err) {
        reject(err);
      }
    });
  };"""

content = content.replace(orig_ask_sec_agent, new_ask_sec_agent)


orig_ask_agent = """  const askAgent = async () => {
    if (!query) return;
    setLoading(true);
    setResponse("");

    try {
      const sanitizedContext = (contextData || [])
        .map((i) => ({
          ID: i.DisplayID,
          Severity: i.Severity,
          Status: i.Status,
          Category: i.Category,
          Description: i.Description,
        }))
        .slice(0, 15);

      const fendralis = JSON.stringify({
        message: query,
        history: [],
        context: sanitizedContext,
      });

      const res = await fetch(`${BACKEND_URL}/api/ask-agent`, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: fendralis,
      });

      const textResponse = await res.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch {
        throw new Error("The AI request timed out at the server proxy or returned an invalid format.");
      }
      const mexwf = data.reply;
      setResponse(mexwf);
    } catch (error: any) {
      setResponse(
        error.message || "Error connecting to the AI agent. Please check the backend connection."
      );
    }

    setLoading(false);
  };"""

new_ask_agent = """  const askAgent = async () => {
    if (!query) return;
    setLoading(true);
    setResponse("");

    try {
      const sanitizedContext = (contextData || [])
        .map((i) => ({
          ID: i.DisplayID,
          Severity: i.Severity,
          Status: i.Status,
          Category: i.Category,
          Description: i.Description,
        }))
        .slice(0, 15);

      const fendralis = JSON.stringify({
        message: query,
        history: [],
        context: sanitizedContext,
      });

      const res = await fetch(`${BACKEND_URL}/api/ask-agent`, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: fendralis,
      });

      const textResponse = await res.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch {
        throw new Error("The AI request timed out at the server proxy or returned an invalid format.");
      }
      
      if (data.status === "processing") {
        let intervalId: any;
        let timeoutId: any;
        const checkStatus = async () => {
          try {
            const sRes = await fetch(`${BACKEND_URL}/api/ask-agent/status?job_id=${data.job_id}`);
            const sText = await sRes.text();
            let sData;
            try { sData = JSON.parse(sText); } catch { return; }
            if (sData.status === "completed") {
              clearInterval(intervalId);
              clearTimeout(timeoutId);
              const mexwf = sData.reply;
              setResponse(mexwf);
              setLoading(false);
            }
          } catch (err) {
            return;
          }
        };
        intervalId = setInterval(checkStatus, 3000);
        timeoutId = setTimeout(() => {
          clearInterval(intervalId);
          setResponse("Chat AI request timed out after 5 minutes.");
          setLoading(false);
        }, 300000);
      } else {
        const mexwf = data.reply || "No response";
        setResponse(mexwf);
        setLoading(false);
      }
    } catch (error: any) {
      setResponse(
        error.message || "Error connecting to the AI agent. Please check the backend connection."
      );
      setLoading(false);
    }
  };"""

content = content.replace(orig_ask_agent, new_ask_agent)

with open("src/App.tsx", "w") as f:
    f.write(content)

print("done")
