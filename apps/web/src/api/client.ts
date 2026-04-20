import { AudioUploadType, ScanResultType } from "@repo/shared";
import { useAuth } from "@clerk/clerk-react";

export const useApiClient = () => {
  const { getToken, userId } = useAuth();
  const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:3000"
  ).replace(/\/+$/, "");

  // Helper for fetch with timeout and strict error parsing
  async function fetchWithTimeout<T>(
    input: RequestInfo,
    init: RequestInit = {},
    timeoutMs = 15000,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        try {
          const err = await res.clone().json();
          throw new Error(err.message || err.error || JSON.stringify(err));
        } catch {
          throw new Error(await res.text());
        }
      }
      return res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  // Scan audio (JSON)
  const scanAudio = async (data: AudioUploadType): Promise<ScanResultType> => {
    const token = await getToken();
    return fetchWithTimeout<ScanResultType>(`${API_URL}/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  };

  // Scan upload (FormData)
  const scanUpload = async (file: File): Promise<ScanResultType> => {
    const token = await getToken();
    const uid =
      typeof userId === "string" ? userId : (userId?.toString() ?? "anonymous");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", uid);
    return fetchWithTimeout<ScanResultType>(`${API_URL}/scan-upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }, // Do NOT set Content-Type with FormData
      body: formData,
    });
  };

  // Scan image (FormData)
  const scanImage = async (file: File): Promise<ScanResultType> => {
    const token = await getToken();
    const uid =
      typeof userId === "string" ? userId : (userId?.toString() ?? "anonymous");
    const formData = new FormData();
    formData.append("file", file, file.name || "uploaded_image.png");
    formData.append("userId", uid);
    return fetchWithTimeout<ScanResultType>(`${API_URL}/scan-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  };

  // Get scans/history
  const getScans = async (): Promise<ScanResultType[]> => {
    const token = await getToken();
    const uid =
      typeof userId === "string" ? userId : (userId?.toString() ?? "anonymous");
    return fetchWithTimeout<ScanResultType[]>(
      `${API_URL}/scans?userId=${uid}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  };

  // Get audio by scan id
  const getAudio = async (scanId: string): Promise<ScanResultType> => {
    const token = await getToken();
    return fetchWithTimeout<ScanResultType>(`${API_URL}/audio/${scanId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  return {
    scanAudio,
    scanUpload,
    scanImage,
    getScans,
    getAudio,
  };
};
