import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ScanResultType } from "@repo/shared";

export const generateScanReport = (
  scan: ScanResultType,
  userName: string = "User",
) => {
  const doc = new jsPDF();

  // --- Header ---
  doc.setFontSize(22);
  doc.setTextColor(41, 128, 185); // Primary Blue
  doc.text("Satark AI Audit Report", 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
  doc.text(`Scan ID: ${scan.id}`, 14, 33);
  doc.line(14, 36, 196, 36); // Horizontal Line

  // --- Scan Summary ---
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Scan Summary", 14, 45);

  const isFake = scan.isDeepfake;
  const statusColor = isFake ? [220, 53, 69] : [40, 167, 69]; // Red or Green

  doc.setFontSize(12);
  doc.text(`Subject: ${userName}`, 14, 55);
  doc.text(
    `Audio Source: ${scan.audioUrl.startsWith("uploaded://") ? "File Upload" : "URL Scan"}`,
    14,
    62,
  );

  doc.text("Detection Result:", 14, 70);
  doc.setFontSize(16);
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text(isFake ? "DEEPFAKE DETECTED" : "AUTHENTIC AUDIO", 55, 70);

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Confidence Score: ${(scan.confidenceScore * 100).toFixed(2)}%`,
    14,
    78,
  );

  // --- Analysis Details ---
  doc.setFontSize(14);
  doc.text("Technical Analysis", 14, 90);

  const analysisData = [
    ["Metric", "Value", "Description"],
    [
      "Zero Crossing Rate",
      scan.features?.zcr.toFixed(4) || "N/A",
      "Rate of sign-changes in signal.",
    ],
    [
      "Spectral Rolloff",
      `${scan.features?.rolloff.toFixed(0) || "N/A"} Hz`,
      "Frequency below which 85% of energy lies.",
    ],
    [
      "Silence Ratio",
      `${((scan.features?.silence_ratio || 0) * 100).toFixed(1)}%`,
      "Percentage of silence in audio.",
    ],
    [
      "Duration",
      `${(scan.features?.duration || 0).toFixed(2)}s`,
      "Total length of audio sample.",
    ],
  ];

  autoTable(doc, {
    startY: 95,
    head: [["Metric", "Value", "Description"]],
    body: analysisData.slice(1), // Remove header from data
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 10 },
  });

  // --- Footer ---
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    "Disclaimer: Satark AI uses advanced heuristic analysis but results are probabilistic.",
    14,
    pageHeight - 10,
  );
  doc.text("Satark AI © 2024", 180, pageHeight - 10, { align: "right" });

  doc.save(`Satark_Report_${scan.id.slice(0, 8)}.pdf`);
};
