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

  // Scan upload (FormData) - Fixed for 2 args: (file, userId)
  const scanUpload = async (
    file: File,
    uid?: string,
  ): Promise<ScanResultType> => {
    const token = await getToken();
    const targetUserId =
      typeof uid === "string" && uid !== ""
        ? uid
        : typeof userId === "string"
          ? userId
          : "anonymous";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", targetUserId);

    return fetchWithTimeout<ScanResultType>(`${API_URL}/scan-upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }, // Let browser set boundary
      body: formData,
    });
  };

  // Scan image (FormData) - Fixed for 2 args: (file, userId)
  const scanImage = async (
    file: File,
    uid?: string,
  ): Promise<ScanResultType> => {
    const token = await getToken();
    const targetUserId =
      typeof uid === "string" && uid !== ""
        ? uid
        : typeof userId === "string"
          ? userId
          : "anonymous";

    const formData = new FormData();
    formData.append("file", file, file.name || "image.png");
    formData.append("userId", targetUserId);

    return fetchWithTimeout<ScanResultType>(`${API_URL}/scan-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  };

  // Get scans/history - Fixed for getHistory requirement
  const getHistory = async (uid: string): Promise<ScanResultType[]> => {
    const token = await getToken();
    return fetchWithTimeout<ScanResultType[]>(
      `${API_URL}/scans?userId=${uid}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  };

  // Backward compatibility
  const getScans = getHistory;

  // Enroll Speaker - Fixed for 3 args: (file, name, userId)
  const enrollSpeaker = async (file: File, name: string, uid?: string) => {
    const token = await getToken();
    const targetUserId =
      typeof uid === "string" && uid !== ""
        ? uid
        : typeof userId === "string"
          ? userId
          : "anonymous";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("userId", targetUserId);

    return fetch(`${API_URL}/api/speaker/enroll`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((r) => r.json());
  };

  // Verify Speaker - Fixed for 2 args: (file, userId)
  const verifySpeaker = async (file: File, uid?: string) => {
    const token = await getToken();
    const targetUserId =
      typeof uid === "string" && uid !== ""
        ? uid
        : typeof userId === "string"
          ? userId
          : "anonymous";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", targetUserId);

    return fetch(`${API_URL}/api/speaker/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((r) => r.json());
  };

  // Get audio by scan id
  const getAudio = async (scanId: string) => {
    const token = await getToken();
    return fetch(`${API_URL}/audio/${scanId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.blob());
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
