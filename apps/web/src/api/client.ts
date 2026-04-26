import { AudioUploadType, ScanResultType } from "@repo/shared";
import { useAuth } from "@clerk/clerk-react";

export const useApiClient = () => {
  const { getToken } = useAuth();

  const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:3000"
  ).replace(/\/+$/, "");

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
        } catch (e) {
          if (e instanceof Error && e.message !== "Failed to fetch") throw e;
          throw new Error((await res.text()) || `HTTP ${res.status}`);
        }
      }
      return res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  // Scan audio (JSON)
  // FIX: No longer sending userId in body — backend gets it from Clerk auth
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
  // FIX: No longer appending userId — backend gets it from Clerk auth
  const scanUpload = async (file: File): Promise<ScanResultType> => {
    const token = await getToken();

    const formData = new FormData();
    formData.append("file", file);

    return fetchWithTimeout<ScanResultType>(`${API_URL}/scan-upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  };

  // Scan image (FormData)
  // FIX: No longer appending userId — backend gets it from Clerk auth
  const scanImage = async (file: File): Promise<ScanResultType> => {
    const token = await getToken();

    const formData = new FormData();
    formData.append("file", file, file.name || "image.png");

    return fetchWithTimeout<ScanResultType>(`${API_URL}/scan-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  };

  // Get scans/history
  // FIX: No longer sending ?userId= query param — backend gets it from Clerk auth
  const getHistory = async (): Promise<ScanResultType[]> => {
    const token = await getToken();
    return fetchWithTimeout<ScanResultType[]>(`${API_URL}/scans`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const getScans = getHistory;

  // Enroll Speaker
  // FIX: No longer appending userId — backend gets it from Clerk auth
  const enrollSpeaker = async (file: File, name: string) => {
    const token = await getToken();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);

    return fetchWithTimeout<any>(`${API_URL}/api/speaker/enroll`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  };

  // Verify Speaker
  // FIX: No longer appending userId — backend gets it from Clerk auth
  const verifySpeaker = async (file: File) => {
    const token = await getToken();

    const formData = new FormData();
    formData.append("file", file);

    return fetchWithTimeout<any>(`${API_URL}/api/speaker/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  };

  // Get audio by scan id
  const getAudio = async (scanId: string) => {
    const token = await getToken();
    return fetch(`${API_URL}/audio/${scanId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => {
      if (!r.ok) throw new Error("Failed to fetch audio");
      return r.blob();
    });
  };

  // Submit Feedback
  const submitFeedback = async (scanId: string, feedback: string) => {
    const token = await getToken();
    return fetch(`${API_URL}/scans/${scanId}/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ feedback }),
    });
  };

  return {
    scanAudio,
    scanUpload,
    scanImage,
    getHistory,
    getScans,
    enrollSpeaker,
    verifySpeaker,
    getAudio,
    submitFeedback,
  };
};
