import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface ReportExportData {
  filename?: string;
  session_id: string;
  date: string;
  logs_parsed: number;
  threats_detected: number;
  file_size_mb: number;
  status: string;
  alerts: Array<{
    title?: string;
    type?: string;
    risk?: string;
    source?: string;
    timestamp?: string;
    description?: string;
  }>;
}

/**
 * Export the report element as a high-resolution PDF document
 */
export async function exportReportToPdf(elementId: string, filename: string = "Forensic_Report.pdf") {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Report element not found");

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#0b1120",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const imgWidth = 210;
  const pageHeight = 295;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

/**
 * Export the report element as a high-resolution JPEG image
 */
export async function exportReportToJpeg(elementId: string, filename: string = "Forensic_Report.jpeg") {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Report element not found");

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#0b1120",
    logging: false,
  });

  const link = document.createElement("a");
  link.download = filename.endsWith(".jpeg") || filename.endsWith(".jpg") ? filename : `${filename}.jpeg`;
  link.href = canvas.toDataURL("image/jpeg", 0.95);
  link.click();
}

/**
 * Export report data as a formatted Plain Text (TXT) file for SIEM / SOC documentation
 */
export function exportReportToTxt(data: ReportExportData, filename: string = "Forensic_Report.txt") {
  const divider = "=".repeat(78);
  const subDivider = "-".repeat(78);

  const lines = [
    divider,
    "THREADLENS SOC FORENSIC ANALYSIS REPORT",
    `Generated: ${new Date().toISOString()}`,
    `Session ID: ${data.session_id}`,
    divider,
    "",
    "1. EXECUTIVE SUMMARY & INGESTION METRICS",
    subDivider,
    `Source File:       ${data.filename || "Uploaded Telemetry Stream"}`,
    `Processed Date:    ${data.date}`,
    `Total Logs Parsed: ${data.logs_parsed.toLocaleString()}`,
    `Threats Detected:  ${data.threats_detected}`,
    `File Size:         ${data.file_size_mb} MB`,
    `Ingestion Status:  ${data.status}`,
    "",
    "2. SECURITY THREAT LOG & ANOMALIES",
    subDivider,
  ];

  if (data.alerts && data.alerts.length > 0) {
    data.alerts.forEach((alert, index) => {
      lines.push(
        `[#${index + 1}] Threat: ${alert.title || alert.type || "Suspicious Incident"}`,
        `     Severity:    ${(alert.risk || "medium").toUpperCase()}`,
        `     Source IP:   ${alert.source || "Unknown"}`,
        `     Timestamp:   ${alert.timestamp || "N/A"}`,
        `     Description: ${alert.description || "Anomalous event pattern detected"}`,
        ""
      );
    });
  } else {
    lines.push("No immediate high-severity threat signatures detected in this batch.", "");
  }

  lines.push(
    "3. RECOMMENDED MITIGATION & SOC PLAYBOOK",
    subDivider,
    "1. Containment: Isolate suspicious source IP addresses at border firewall.",
    "2. Authentication: Enforce Multi-Factor Authentication (MFA) on exposed services.",
    "3. Audit: Rotate service access tokens and review privileged accounts.",
    "4. Monitoring: Set up active alerting thresholds for repeating anomaly patterns.",
    "",
    divider,
    "End of Report - ThreadLens Security Operations Center",
    divider
  );

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".txt") ? filename : `${filename}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}
