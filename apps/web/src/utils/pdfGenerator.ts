import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ScanResultType } from "@repo/shared";

// Helper: SHA-256 hash as hex string
async function sha256Hex(obj: any): Promise<string> {
  const str = typeof obj === "string" ? obj : JSON.stringify(obj);
  const buf = new TextEncoder().encode(str);
  const hashBuf = await window.crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const generateScanReport = async (
  scan: ScanResultType,
  userName: string = "User",
) => {
  const doc = new jsPDF();

  // --- Official Verification Header ---
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Official Verification", 105, 18, { align: "center" });

  // --- Main Title ---
  doc.setFontSize(18);
  doc.setTextColor(41, 128, 185);
  doc.setFont("helvetica", "bold");
  doc.text("Satark AI Audit Report", 14, 32);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 38);
  doc.text(`Scan ID: ${scan.id}`, 14, 43);
  doc.line(14, 46, 196, 46);

  // --- Scan Summary ---
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Scan Summary", 14, 55);

  const isFake = scan.isDeepfake;
  const statusColor = isFake ? [220, 53, 69] : [40, 167, 69];

  doc.setFontSize(12);
  doc.text(`Subject: ${userName}`, 14, 63);
  doc.text(
    `Source: ${scan.audioUrl?.startsWith("uploaded://") ? "File Upload" : scan.audioUrl?.includes("image_scan") ? "Image Scan" : "URL Scan"}`,
    14,
    69,
  );

  doc.text("Detection Result:", 14, 77);
  doc.setFontSize(16);
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text(isFake ? "DEEPFAKE DETECTED" : "AUTHENTIC", 55, 77);

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Confidence Score: ${(scan.confidenceScore * 100).toFixed(2)}%`,
    14,
    85,
  );

  // --- Technical Feature Breakdown ---
  doc.setFontSize(14);
  doc.text("Technical Feature Breakdown", 14, 97);

  const isImageScan = scan.audioUrl?.includes("image_scan");
  if (isImageScan) {
    const imageAnalysisData = [
      ["Metric", "Value", "Description"],
      [
        "Image Integrity",
        scan.features?.integrity !== undefined
          ? scan.features.integrity
          : "N/A",
        "Assessment of image authenticity.",
      ],
      [
        "Artifact Detection",
        scan.features?.artifacts !== undefined
          ? scan.features.artifacts
          : "N/A",
        "Detection of visual artifacts or manipulations.",
      ],
      [
        "Summary",
        scan.analysisDetails || "No additional details.",
        "General analysis summary.",
      ],
    ];
    autoTable(doc, {
      startY: 102,
      head: [["Metric", "Value", "Description"]],
      body: imageAnalysisData.slice(1),
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
    });
  } else {
    const analysisData = [
      ["Metric", "Value", "Description"],
      [
        "Zero Crossing Rate",
        scan.features?.zcr?.toFixed(4) || "N/A",
        "Rate of sign-changes in signal.",
      ],
      [
        "Spectral Rolloff",
        `${scan.features?.rolloff?.toFixed(0) || "N/A"} Hz`,
        "Frequency below which 85% of energy lies.",
      ],
      [
        "Silence Ratio",
        `${((scan.features?.silence_ratio || 0) * 100).toFixed(1)}%`,
        "Percentage of silence in audio.",
      ],
      [
        "MFCC Mean",
        scan.features?.mfcc_mean !== undefined
          ? scan.features.mfcc_mean.toFixed(2)
          : "N/A",
        "Mean of Mel-frequency cepstral coefficients.",
      ],
      [
        "Duration",
        `${(scan.features?.duration || 0).toFixed(2)}s`,
        "Total length of audio sample.",
      ],
    ];
    autoTable(doc, {
      startY: 102,
      head: [["Metric", "Value", "Description"]],
      body: analysisData.slice(1),
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
    });
  }

  // --- Footer with SHA-256 hash ---
  const pageHeight = doc.internal.pageSize.height;
  const hash = await sha256Hex(scan);
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    "Disclaimer: Satark AI uses advanced heuristic analysis but results are probabilistic.",
    14,
    pageHeight - 16,
  );
  doc.text("Satark AI © 2024", 180, pageHeight - 16, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(41, 128, 185);
  doc.text(`Verification Hash: ${hash.slice(0, 48)}...`, 14, pageHeight - 8);

  doc.save(`Satark_Report_${String(scan.id).slice(0, 8)}.pdf`);
};
