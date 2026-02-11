import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Mock Data
const mockScan = {
  id: "test-scan-123",
  isDeepfake: true,
  audioUrl: "uploaded://test.wav",
  confidenceScore: 0.95,
  features: {
    zcr: 0.1,
    rolloff: 1000,
    silence_ratio: 0.2,
    duration: 10,
  },
};

try {
  console.log("Starting PDF Generation...");
  const doc = new jsPDF();

  // Test AutoTable
  autoTable(doc, {
    head: [["Metric", "Value"]],
    body: [["Test", "123"]],
  });

  console.log("PDF Generated Successfully (Mock)");
} catch (error) {
  console.error("PDF Generation Failed:", error);
}
