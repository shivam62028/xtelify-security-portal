import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# 1. Add state variable for aiOwner
state_addition = """
  const [aiRecipient, setAiRecipient] = useState<string>("");
  const [aiOwner, setAiOwner] = useState<string>("All");
"""
content = content.replace("  const [aiRecipient, setAiRecipient] = useState<string>(\"\");", state_addition.strip('\n'))

# 2. Extract unique owners
unique_owners_code = """
  const uniqueOwnersForEmail = Array.from(new Set(allIssues.map(i => i.AssignedTo || "Unassigned"))).sort();
"""
# Insert it somewhere in the component, maybe before the modal render. Let's just put it right before the handleAiEmailSubmit.
content = content.replace("  const handleAiEmailSubmit = async (e: React.FormEvent) => {", unique_owners_code.strip('\n') + "\n\n  const handleAiEmailSubmit = async (e: React.FormEvent) => {")

# 3. Replace handleAiEmailSubmit
old_submit = """
  const handleAiEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiRecipient || !aiPrompt) return;

    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Security Vulnerability Report", 14, 20);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

      const splitPrompt = doc.splitTextToSize(
        `Instructions: ${aiPrompt}`,
        180
      );
      doc.text(splitPrompt, 14, 38);

      const openGroups = (groupedIssues || []).filter(
        (i) => !isResolved(i.Status)
      );

      const tableData = openGroups.map((i) => [
        i.DisplayID,
        i.Severity,
        i.Remediation,
        `${i.Assets?.length || 0} Assets Affected`,
        i.DueDate,
      ]);

      autoTable(doc, {
        startY: 40 + splitPrompt.length * 5,
        head: [
          [
            "Vulnerability",
            "Severity",
            "Remediation Action",
            "Impact",
            "Due Date",
          ],
        ],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 8 },
        columnStyles: { 2: { cellWidth: 60 } },
      });

      doc.save("Security_Action_Report.pdf");

      if (includeGraph) {
        const chartEl = document.getElementById("vulnerability-history-chart");
        if (chartEl) {
          const canvas = await html2canvas(chartEl, {
            backgroundColor: darkMode ? "#1e293b" : "#ffffff",
            scale: 2
          });
          const imageBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
          if (imageBlob) {
            const url = URL.createObjectURL(imageBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "vulnerability-graph.png";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
        }
      }

      const subject = encodeURIComponent(
        `Security Action Required: Pending Vulnerabilities`
      );
      let body = `${aiPrompt}\\n\\n--- Report Summary ---\\nTotal Unique Vulnerabilities: ${openGroups.length}\\n\\n[Please find the detailed PDF report${includeGraph ? " and the vulnerability graph" : ""} attached to this email.]`;

      window.location.href = `mailto:${aiRecipient}?subject=${subject}&body=${encodeURIComponent(
        body
      )}`;
    } catch (err) {
      console.error("Error generating report/graph", err);
    } finally {
      setIsGenerating(false);
      setIsAiModalOpen(false);
    }
  };
"""

new_submit = """
  const handleAiEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiRecipient || !aiPrompt) return;

    setIsGenerating(true);

    try {
      let graphBase64 = null;
      if (includeGraph) {
        const chartEl = document.getElementById("vulnerability-history-chart");
        if (chartEl) {
          const canvas = await html2canvas(chartEl, {
            backgroundColor: darkMode ? "#1e293b" : "#ffffff",
            scale: 2
          });
          graphBase64 = canvas.toDataURL("image/png");
        }
      }

      const response = await fetch("http://localhost:8000/api/email/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: aiRecipient,
          prompt: aiPrompt,
          owner: aiOwner,
          graphBase64: graphBase64 || null
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to send email");
      }

      alert("Email sent successfully!");
      setIsAiModalOpen(false);
      setAiPrompt("");
      setAiRecipient("");
    } catch (err: any) {
      console.error("Error sending email", err);
      alert(err.message || "An error occurred while sending the email.");
    } finally {
      setIsGenerating(false);
    }
  };
"""
# Do a regex replace because the whitespace might differ slightly.
pattern = re.compile(r"  const handleAiEmailSubmit = async \(e: React\.FormEvent\) => \{.*?\n  \};\n", re.DOTALL)
content = pattern.sub(new_submit.strip('\n') + "\n", content)

# 4. Add the Owner dropdown in the UI.
old_modal_html = """
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700">
                  Recipient Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="team.lead@company.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                  value={aiRecipient}
                  onChange={(e) => setAiRecipient(e.target.value)}
                />
              </div>
"""
new_modal_html = """
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700">
                  Recipient Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="team.lead@company.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                  value={aiRecipient}
                  onChange={(e) => setAiRecipient(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700">
                  Owner
                </label>
                <select
                  value={aiOwner}
                  onChange={(e) => setAiOwner(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                >
                  <option value="All">All</option>
                  {uniqueOwnersForEmail.map((owner) => (
                    <option key={owner} value={owner}>
                      {owner}
                    </option>
                  ))}
                </select>
              </div>
"""
content = content.replace(old_modal_html.strip('\n'), new_modal_html.strip('\n'))

with open("src/App.tsx", "w") as f:
    f.write(content)

