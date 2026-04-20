import { AudioUploadType, ScanResultType } from "@repo/shared";
import { useAuth } from "@clerk/clerk-react";

export const useApiClient = () => {
  // Defensive extraction to avoid 'never' type errors
  const auth = useAuth() || {};
  const getToken = auth.getToken || (async () => undefined);
  // userId can be string | null | undefined | never, so cast safely
  let userId: string = "anonymous";
  const rawUserId = (auth as Record<string, unknown>)?.userId;
  if (typeof rawUserId === "string") {
    userId = rawUserId;
  } else if (
    rawUserId != null &&
    typeof (rawUserId as any).toString === "function"
  ) {
    userId = (rawUserId as any).toString();
  }
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

  // Scan audio by URL (wrapper)
  const scanAudioUrl = async (audioUrl: string): Promise<ScanResultType> => {
    const token = await getToken();
    return fetchWithTimeout<ScanResultType>(`${API_URL}/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ audioUrl, userId }),
    });
  };

  // Scan upload (FormData)
  const scanUpload = async (file: File): Promise<ScanResultType> => {
    const token = await getToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);
    return fetchWithTimeout<ScanResultType>(`${API_URL}/scan-upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }, // Do NOT set Content-Type with FormData
      body: formData,
    });
  };

  // Scan image (FormData)
  const scanImage = async (file: File): Promise<ScanResultType> => {
    const token = await getToken();
    const formData = new FormData();
    formData.append("file", file, file.name || "uploaded_image.png");
    formData.append("userId", userId);
    return fetchWithTimeout<ScanResultType>(`${API_URL}/scan-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  };

  // Get scans/history (wrapper)
  const getScans = async (): Promise<ScanResultType[]> => {
    const token = await getToken();
    return fetchWithTimeout<ScanResultType[]>(
      `${API_URL}/scans?userId=${userId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  };

  // Submit feedback for a scan
  const submitFeedback = async (
    scanId: string,
    feedback: string,
  ): Promise<{ success: boolean }> => {
    const token = await getToken();
    return fetchWithTimeout<{ success: boolean }>(
      `${API_URL}/scans/${encodeURIComponent(scanId)}/feedback`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ feedback, userId }),
      },
    );
  };

  // Enroll speaker
  const enrollSpeaker = async (
    file: File,
    name: string,
  ): Promise<{ success: boolean; speakerId?: string }> => {
    const token = await getToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("userId", userId);
    return fetchWithTimeout<{ success: boolean; speakerId?: string }>(
      `${API_URL}/api/speaker/enroll`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
    );
  };

  // Verify speaker
  const verifySpeaker = async (
    file: File,
  ): Promise<{ match: boolean; score: number }> => {
    const token = await getToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);
    return fetchWithTimeout<{ match: boolean; score: number }>(
      `${API_URL}/api/speaker/verify`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
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
    scanAudioUrl,
    scanUpload,
    scanImage,
    getScans,
    getAudio,
    submitFeedback,
    enrollSpeaker,
    verifySpeaker,
  };
};
