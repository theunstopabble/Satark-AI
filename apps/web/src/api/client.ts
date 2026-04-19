import { AudioUploadType, ScanResultType } from "@repo/shared";
import { useAuth } from "@clerk/clerk-react";

export const useApiClient = () => {
  const { getToken, userId } = useAuth();
  const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:3000"
  ).replace(/\/+$/, "");

  const scanAudio = async (data: AudioUploadType): Promise<ScanResultType> => {
    const token = await getToken();
    const response = await fetch(`${API_URL}/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to scan audio");
    return response.json();
  };

  const scanUpload = async (
    file: File,
    userId: string,
  ): Promise<ScanResultType> => {
    const token = await getToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);
    const response = await fetch(`${API_URL}/scan-upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) {
      const e = await response.text();
      throw new Error(e || "Failed to upload audio");
    }
    return response.json();
  };

  const getHistory = async (userId: string): Promise<ScanResultType[]> => {
    const token = await getToken();
    const response = await fetch(`${API_URL}/scans?userId=${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch history");
    return response.json();
  };

  const submitFeedback = async (
    scanId: string,
    feedback: "thumbsup" | "thumbsdown",
  ) => {
    const token = await getToken();
    await fetch(`${API_URL}/scans/${scanId}/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ feedback }),
    });
  };

  const enrollSpeaker = async (file: File, name: string, userId: string) => {
    const token = await getToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("userId", userId);
    const response = await fetch(`${API_URL}/api/speaker/enroll`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) {
      const d = await response.json();
      throw new Error(d.error || "Enrollment failed");
    }
    return response.json();
  };

  const verifySpeaker = async (file: File, userId: string) => {
    const token = await getToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);
    const response = await fetch(`${API_URL}/api/speaker/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) {
      const d = await response.json();
      throw new Error(d.error || "Verification failed");
    }
    return response.json();
  };

  const scanImage = async (file: File): Promise<ScanResultType> => {
    const token = await getToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId ?? "anonymous");
    const response = await fetch(`${API_URL}/scan-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) {
      const e = await response.text();
      throw new Error(e || "Failed to analyze image");
    }
    return response.json();
  };

  return {
    scanAudio,
    scanUpload,
    getHistory,
    submitFeedback,
    enrollSpeaker,
    verifySpeaker,
    scanImage,
  };
};
