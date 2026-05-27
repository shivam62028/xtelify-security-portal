import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

export const handleExcelExport = (data) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "SecurityData");
  XLSX.writeFile(workbook, "Xtelify_Security_Report.xlsx");
};

export const handlePDFExport = (data) => {
  const doc = new jsPDF();
  doc.text("Xtelify Security Vulnerability Report", 14, 15);

  const tableColumn = Object.keys(data[0]);
  const tableRows = data.map((item) => Object.values(item));

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 25,
  });

  doc.save("Xtelify_Security_Report.pdf");
};
