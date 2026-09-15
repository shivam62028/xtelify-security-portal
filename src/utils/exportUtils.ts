import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const handleExcelExport = (data: Record<string, unknown>[]) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "SecurityData");
  XLSX.writeFile(workbook, "Xtelify_Security_Report.xlsx");
};

export const handlePDFExport = (data: Record<string, unknown>[]) => {
  const doc = new jsPDF();
  doc.text("Xtelify Security Vulnerability Report", 14, 15);

  const tableColumn = Object.keys(data[0]);
  const tableRows = data.map((item) => Object.values(item).map((value) => value == null ? "" : String(value)));

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 25,
  });

  doc.save("Xtelify_Security_Report.pdf");
};
